/**
 * Base IPC Handler
 *
 * Provides standardized error handling and database connection management
 * for all IPC handlers. Eliminates ~500 lines of duplicate error handling code.
 */

const { getPool } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Wraps an IPC handler function with standardized error handling and database connection
 *
 * @param {Function} handlerFn - The actual handler logic (receives pool and params)
 * @param {Object} options - Configuration options
 * @param {string} options.context - Context name for logging (e.g., 'catalogue')
 * @param {string} options.operation - Operation name for logging (e.g., 'getItems')
 * @param {string} options.errorMessage - Custom error message
 * @param {boolean} options.requiresDb - Whether this handler requires database connection (default: true)
 * @returns {Function} Wrapped IPC handler function
 *
 * @example
 * const getCatalogueItems = createHandler(
 *   async (pool, params) => {
 *     const result = await pool.request().query('SELECT * FROM PriceList');
 *     return { data: result.recordset };
 *   },
 *   {
 *     context: 'catalogue',
 *     operation: 'getItems',
 *     errorMessage: 'Failed to fetch catalogue items'
 *   }
 * );
 */
function createHandler(handlerFn, options = {}) {
  const {
    context = 'handler',
    operation = 'execute',
    errorMessage = 'Operation failed',
    requiresDb = true
  } = options;

  return async (event, params = {}) => {
    try {
      // Log incoming IPC call
      logger.ipc(`${context}:${operation}`, 'in', params);

      // Check database connection if required
      if (requiresDb) {
        const pool = getPool();
        if (!pool) {
          const error = 'Database connection not available';
          logger.error(context, error);
          return {
            success: false,
            error,
            message: 'Please check your database connection settings'
          };
        }

        // Execute handler with pool
        const result = await handlerFn(pool, params, event);

        // Log successful completion
        logger.debug(context, `${operation} completed successfully`);

        // Return success response
        return {
          success: true,
          ...(typeof result === 'object' ? result : { data: result })
        };
      } else {
        // Execute handler without pool
        const result = await handlerFn(null, params, event);

        logger.debug(context, `${operation} completed successfully`);

        return {
          success: true,
          ...(typeof result === 'object' ? result : { data: result })
        };
      }
    } catch (err) {
      // Log error with full context
      logger.error(context, `${operation} failed: ${errorMessage}`, err);

      // Return standardized error response
      return {
        success: false,
        error: errorMessage,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      };
    }
  };
}

/**
 * Wraps a synchronous handler (for electron-store operations, etc.)
 *
 * @param {Function} handlerFn - Synchronous handler function
 * @param {Object} options - Configuration options
 * @returns {Function} Wrapped handler
 *
 * @example
 * const getPreferences = createSyncHandler(
 *   (params) => {
 *     return { data: preferencesStore.get('preferences') };
 *   },
 *   { context: 'preferences', operation: 'get' }
 * );
 */
function createSyncHandler(handlerFn, options = {}) {
  const {
    context = 'handler',
    operation = 'execute',
    errorMessage = 'Operation failed'
  } = options;

  return (event, params = {}) => {
    try {
      logger.ipc(`${context}:${operation}`, 'in', params);

      const result = handlerFn(params, event);

      logger.debug(context, `${operation} completed successfully`);

      return {
        success: true,
        ...(typeof result === 'object' ? result : { data: result })
      };
    } catch (err) {
      logger.error(context, `${operation} failed: ${errorMessage}`, err);

      return {
        success: false,
        error: errorMessage,
        message: err.message
      };
    }
  };
}

/**
 * Validates required parameters
 *
 * @param {Object} params - Parameters to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing
 *
 * @example
 * validateParams(params, ['priceCode', 'description']);
 */
function validateParams(params, requiredFields) {
  for (const field of requiredFields) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      throw new Error(`Missing required parameter: ${field}`);
    }
  }
}

/**
 * Sanitizes user input to prevent SQL injection (additional layer beyond parameterized queries)
 *
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove potentially dangerous characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .trim()
    .substring(0, 500); // Limit length
}

module.exports = {
  createHandler,
  createSyncHandler,
  validateParams,
  sanitizeInput
};
