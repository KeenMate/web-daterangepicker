/**
 * Logging module for Date Range Picker
 * Uses loglevel for lightweight, browser-friendly logging
 * Pattern matches svelte-spa-router for consistency
 */

import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

// Define all logging categories
export const LOGGING_CATEGORIES = [
    'DRP',
    'DRP:RENDERING',
    'DRP:INTERACTION',
    'DRP:SELECTION',
    'DRP:NAVIGATION',
    'DRP:UI',
    'DRP:VALIDATION',
    'DRP:DRAG'
] as const;

// Color scheme for console output
const COLORS = {
    trace: '#6b7280',  // Gray
    debug: '#0ea5e9',  // Blue
    info: '#10b981',   // Green
    warn: '#f59e0b',   // Orange
    error: '#ef4444'   // Red
};

// Store original factory before overriding
const originalFactory = log.methodFactory;

// Custom methodFactory for color-coded output
const colorMethodFactory = (methodName: string, logLevel: number, loggerName: string) => {
    const rawMethod = originalFactory.call(log, methodName, logLevel, loggerName);

    return (...args: any[]) => {
        const color = COLORS[methodName as keyof typeof COLORS] || '#6b7280';
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        } as any);
        const prefix = `%c[${timestamp}] [${methodName.toUpperCase()}] ${loggerName ? `[${loggerName}]` : ''}`;
        rawMethod(prefix, `color: ${color}`, ...args);
    };
};

// Array to track all loggers for batch operations
const allLoggers: log.Logger[] = [];

/**
 * Create a logger with color-coded output
 */
function createLogger(category: string): log.Logger {
    const logger = log.getLogger(category);
    logger.methodFactory = colorMethodFactory as any;
    logger.setLevel('silent');  // Start silent, enable via API
    allLoggers.push(logger);
    return logger;
}

// Create category-specific loggers
export const drpLogger = createLogger('DRP');
export const renderingLogger = createLogger('DRP:RENDERING');
export const interactionLogger = createLogger('DRP:INTERACTION');
export const selectionLogger = createLogger('DRP:SELECTION');
export const navigationLogger = createLogger('DRP:NAVIGATION');
export const uiLogger = createLogger('DRP:UI');
export const validationLogger = createLogger('DRP:VALIDATION');
export const dragLogger = createLogger('DRP:DRAG');

// Default to silent
log.setLevel('silent');

/**
 * Set log level for all loggers
 * @param level Log level to set ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export const setLogLevel = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => {
    log.setLevel(level);
    allLoggers.forEach(logger => logger.setLevel(level));
};

/**
 * Enable all logging (set to debug level)
 */
export const enableLogging = () => {
    setLogLevel('debug');
};

/**
 * Disable all logging (set to silent level)
 */
export const disableLogging = () => {
    setLogLevel('silent');
};

/**
 * Set log level for a specific category
 * @param category Category logger to configure
 * @param level Log level to set (default: 'debug')
 */
export const setCategoryLevel = (
    category: typeof LOGGING_CATEGORIES[number],
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' = 'debug'
) => {
    const loggerMap: Record<string, log.Logger> = {
        'DRP': drpLogger,
        'DRP:RENDERING': renderingLogger,
        'DRP:INTERACTION': interactionLogger,
        'DRP:SELECTION': selectionLogger,
        'DRP:NAVIGATION': navigationLogger,
        'DRP:UI': uiLogger,
        'DRP:VALIDATION': validationLogger,
        'DRP:DRAG': dragLogger
    };

    const logger = loggerMap[category];
    if (logger) {
        logger.setLevel(level);
    }
};

/**
 * Get list of all logging categories
 */
export const getCategories = (): string[] => {
    return [...LOGGING_CATEGORIES];
};

// Export the default logger for general use
export default log;
