/**
 * Error Logger Utility
 *
 * Provides centralized error logging with context information.
 * Ready to integrate with error monitoring services (Sentry, LogRocket, etc.)
 *
 * Usage:
 * ```tsx
 * import { logError, logWarning, logInfo } from '@/utils/errorLogger';
 *
 * try {
 *   // Some operation
 * } catch (error) {
 *   logError(error, {
 *     context: 'User Profile Update',
 *     userId: '123',
 *     operation: 'updateProfile'
 *   });
 * }
 * ```
 */

export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

export interface LogContext {
  /** User ID if available */
  userId?: string;
  /** Operation being performed */
  operation?: string;
  /** Additional context information */
  context?: string;
  /** Custom metadata */
  metadata?: Record<string, any>;
  /** Component name where error occurred */
  component?: string;
  /** GraphQL operation name */
  graphqlOperation?: string;
}

export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Error message or Error object */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Additional context */
  context: LogContext;
  /** Timestamp */
  timestamp: string;
  /** Environment */
  environment: string;
  /** Browser/user agent info */
  userAgent?: string;
  /** Current URL */
  url?: string;
}

/**
 * Check if we're in browser context
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get current environment
 */
const getEnvironment = (): string => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Get user agent if in browser
 */
const getUserAgent = (): string | undefined => {
  return isBrowser ? window.navigator.userAgent : undefined;
};

/**
 * Get current URL if in browser
 */
const getCurrentUrl = (): string | undefined => {
  return isBrowser ? window.location.href : undefined;
};

/**
 * Format error for logging
 */
const formatError = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: JSON.stringify(error),
  };
};

/**
 * Create a log entry
 */
const createLogEntry = (
  level: LogLevel,
  error: unknown,
  context: LogContext = {}
): LogEntry => {
  const { message, stack } = formatError(error);

  return {
    level,
    message,
    stack,
    context,
    timestamp: new Date().toISOString(),
    environment: getEnvironment(),
    userAgent: getUserAgent(),
    url: getCurrentUrl(),
  };
};

/**
 * Send log to monitoring service
 * TODO: Integrate with Sentry, LogRocket, or other services
 */
const sendToMonitoringService = (logEntry: LogEntry): void => {
  // TODO: Implement integration with monitoring service
  // Example for Sentry:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(new Error(logEntry.message), {
  //     level: logEntry.level === 'error' ? 'error' : 'warning',
  //     extra: logEntry.context,
  //   });
  // }

  // Example for LogRocket:
  // if (typeof LogRocket !== 'undefined') {
  //   LogRocket.error(logEntry.message, logEntry.context);
  // }

  // For now, just log to console in development
  if (process.env.NODE_ENV === 'development') {
    const emoji = {
      error: 'L',
      warning: ' ',
      info: '9',
      debug: '=',
    }[logEntry.level];

    console.group(`${emoji} [${logEntry.level.toUpperCase()}] ${logEntry.message}`);
    if (logEntry.context) {
      console.log('Context:', logEntry.context);
    }
    if (logEntry.stack) {
      console.log('Stack:', logEntry.stack);
    }
    console.log('Timestamp:', logEntry.timestamp);
    console.groupEnd();
  }
};

/**
 * Log an error
 */
export const logError = (error: unknown, context: LogContext = {}): void => {
  const logEntry = createLogEntry('error', error, context);
  sendToMonitoringService(logEntry);

  // Also log to console.error in all environments
  console.error('[Error Logger]', logEntry.message, context);
};

/**
 * Log a warning
 */
export const logWarning = (message: string, context: LogContext = {}): void => {
  const logEntry = createLogEntry('warning', message, context);
  sendToMonitoringService(logEntry);

  if (process.env.NODE_ENV === 'development') {
    console.warn('[Warning Logger]', message, context);
  }
};

/**
 * Log informational message
 */
export const logInfo = (message: string, context: LogContext = {}): void => {
  const logEntry = createLogEntry('info', message, context);

  if (process.env.NODE_ENV === 'development') {
    console.info('[Info Logger]', message, context);
  }
};

/**
 * Log debug message (only in development)
 */
export const logDebug = (message: string, context: LogContext = {}): void => {
  if (process.env.NODE_ENV === 'development') {
    const logEntry = createLogEntry('debug', message, context);
    console.debug('[Debug Logger]', message, context);
  }
};

/**
 * Log GraphQL error
 */
export const logGraphQLError = (
  error: unknown,
  operationName: string,
  variables?: Record<string, any>
): void => {
  logError(error, {
    context: 'GraphQL Operation',
    graphqlOperation: operationName,
    metadata: {
      variables,
    },
  });
};

/**
 * Log React component error
 */
export const logComponentError = (
  error: unknown,
  componentName: string,
  props?: Record<string, any>
): void => {
  logError(error, {
    context: 'React Component Error',
    component: componentName,
    metadata: {
      props,
    },
  });
};

/**
 * Initialize error logging (call this in app initialization)
 * Sets up global error handlers
 */
export const initErrorLogging = (): void => {
  if (!isBrowser) {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, {
      context: 'Unhandled Promise Rejection',
      metadata: {
        promise: event.promise,
      },
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, {
      context: 'Uncaught Error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(' Error logging initialized');
  }
};

/**
 * Set user context for error logging
 * Call this after user logs in
 */
let currentUserId: string | undefined;

export const setUserContext = (userId: string | undefined): void => {
  currentUserId = userId;
};

export const getUserContext = (): string | undefined => {
  return currentUserId;
};
