/**
 * Backend Logger Utility
 *
 * Centralized logging for Electron main process and IPC handlers
 * Provides conditional logging based on environment and log levels
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  }

  /**
   * Format log message with context
   * @private
   */
  _format(level, context, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${context}]`;

    if (data !== null && data !== undefined) {
      return `${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  /**
   * Log debug message (development only)
   */
  debug(context, message, data = null) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      const formatted = this._format('DEBUG', context, message, data);
      if (data !== null && data !== undefined) {
        console.log(formatted, data);
      } else {
        console.log(formatted);
      }
    }
  }

  /**
   * Log info message
   */
  info(context, message, data = null) {
    if (this.minLevel <= LOG_LEVELS.INFO) {
      const formatted = this._format('INFO', context, message, data);
      if (data !== null && data !== undefined) {
        console.log(`✓ ${formatted}`, data);
      } else {
        console.log(`✓ ${formatted}`);
      }
    }
  }

  /**
   * Log warning message
   */
  warn(context, message, data = null) {
    if (this.minLevel <= LOG_LEVELS.WARN) {
      const formatted = this._format('WARN', context, message, data);
      if (data !== null && data !== undefined) {
        console.warn(`⚠ ${formatted}`, data);
      } else {
        console.warn(`⚠ ${formatted}`);
      }
    }
  }

  /**
   * Log error message (always logged)
   */
  error(context, message, error = null) {
    const formatted = this._format('ERROR', context, message, error);
    if (error !== null && error !== undefined) {
      console.error(`✗ ${formatted}`, error);
    } else {
      console.error(`✗ ${formatted}`);
    }
  }

  /**
   * Log SQL query (development only)
   */
  sql(context, query, params = null) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      console.log(`[${context}] SQL Query:`, query);
      if (params) {
        console.log(`[${context}] Parameters:`, params);
      }
    }
  }

  /**
   * Log IPC call (development only)
   */
  ipc(channel, direction, data = null) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      const arrow = direction === 'in' ? '→' : '←';
      console.log(`[IPC] ${arrow} ${channel}`, data || '');
    }
  }
}

// Export singleton instance
module.exports = new Logger();
