/**
 * Logging module for Date Range Picker
 * Uses loglevel for lightweight, browser-friendly logging
 */

import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

// Apply prefix plugin for better formatting
prefix.reg(log);

prefix.apply(log, {
    format(level, name, timestamp) {
        return `[${timestamp}] [${level}] ${name ? `[${name}]` : ''}`;
    },
    timestampFormatter(date) {
        return date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0');
    }
});

// Create category-specific loggers for different parts of the date picker
export const initLogger = log.getLogger('INIT');
export const validationLogger = log.getLogger('VALIDATION');
export const dragLogger = log.getLogger('DRAG');
export const selectionLogger = log.getLogger('SELECTION');
export const renderingLogger = log.getLogger('RENDERING');
export const uiLogger = log.getLogger('UI');
export const navigationLogger = log.getLogger('NAVIGATION');
export const interactionLogger = log.getLogger('INTERACTION');

// Apply prefix to all category loggers
prefix.apply(initLogger);
prefix.apply(validationLogger);
prefix.apply(dragLogger);
prefix.apply(selectionLogger);
prefix.apply(renderingLogger);
prefix.apply(uiLogger);
prefix.apply(navigationLogger);
prefix.apply(interactionLogger);

// Default to silent (no logging) - will be enabled when showDebugInfo is true
const defaultLevel = 'silent';
log.setLevel(defaultLevel);
initLogger.setLevel(defaultLevel);
validationLogger.setLevel(defaultLevel);
dragLogger.setLevel(defaultLevel);
selectionLogger.setLevel(defaultLevel);
renderingLogger.setLevel(defaultLevel);
uiLogger.setLevel(defaultLevel);
navigationLogger.setLevel(defaultLevel);
interactionLogger.setLevel(defaultLevel);

/**
 * Enable or disable logging for all loggers
 */
export const setLoggingEnabled = (enabled: boolean) => {
    const level = enabled ? 'debug' : 'silent';
    log.setLevel(level);
    initLogger.setLevel(level);
    validationLogger.setLevel(level);
    dragLogger.setLevel(level);
    selectionLogger.setLevel(level);
    renderingLogger.setLevel(level);
    uiLogger.setLevel(level);
    navigationLogger.setLevel(level);
    interactionLogger.setLevel(level);
};

/**
 * Set log level for all loggers
 * Levels: trace, debug, info, warn, error, silent
 */
export const setLogLevel = (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent') => {
    log.setLevel(level);
    initLogger.setLevel(level);
    validationLogger.setLevel(level);
    dragLogger.setLevel(level);
    selectionLogger.setLevel(level);
    renderingLogger.setLevel(level);
    uiLogger.setLevel(level);
    navigationLogger.setLevel(level);
    interactionLogger.setLevel(level);
};

// Export the default logger for general use
export default log;
