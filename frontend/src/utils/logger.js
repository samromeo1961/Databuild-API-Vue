/**
 * Frontend Logger Utility
 *
 * Centralized logging for Vue components
 * Provides conditional logging based on environment
 */

const isDevelopment = import.meta.env.DEV;

class Logger {
  /**
   * Log debug message (development only)
   */
  debug(component, message, data = null) {
    if (isDevelopment) {
      if (data !== null && data !== undefined) {
        console.log(`[${component}] ${message}`, data);
      } else {
        console.log(`[${component}] ${message}`);
      }
    }
  }

  /**
   * Log info message
   */
  info(component, message, data = null) {
    if (data !== null && data !== undefined) {
      console.log(`✓ [${component}] ${message}`, data);
    } else {
      console.log(`✓ [${component}] ${message}`);
    }
  }

  /**
   * Log warning message
   */
  warn(component, message, data = null) {
    if (data !== null && data !== undefined) {
      console.warn(`⚠ [${component}] ${message}`, data);
    } else {
      console.warn(`⚠ [${component}] ${message}`);
    }
  }

  /**
   * Log error message
   */
  error(component, message, error = null) {
    if (error !== null && error !== undefined) {
      console.error(`✗ [${component}] ${message}`, error);
    } else {
      console.error(`✗ [${component}] ${message}`);
    }
  }

  /**
   * Log API call (development only)
   */
  api(endpoint, method, data = null) {
    if (isDevelopment) {
      console.log(`[API] ${method} ${endpoint}`, data || '');
    }
  }

  /**
   * Log grid event (development only)
   */
  grid(component, event, data = null) {
    if (isDevelopment) {
      console.log(`[${component}] Grid Event: ${event}`, data || '');
    }
  }
}

// Export singleton instance
export default new Logger();
