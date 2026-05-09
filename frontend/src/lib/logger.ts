/**
 * Production-safe logging utility
 * Replaces console.log/error/warn with proper logging
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warning messages
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
    // In production, could send to error tracking service
  },

  /**
   * Log error messages
   */
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
    // In production, send to error tracking service (Sentry, etc.)
    if (isProduction) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(args[0]);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log API errors with context
   */
  apiError: (endpoint: string, error: unknown) => {
    const errorMessage = (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail || (error as { message?: string })?.message || 'Unknown error';
    logger.error(`API Error [${endpoint}]:`, errorMessage, error);
  },
};

export default logger;
