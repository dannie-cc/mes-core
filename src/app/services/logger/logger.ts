/**
 * Logger module for handling application logging with different levels and formats
 * @module logger
 */

import fs from 'fs';
import path from 'path';
import gach, { COLOR_NAMES } from 'gach';

/**
 * Available log levels in order of increasing severity
 */
export enum LOG_LEVEL {
    TRACE = 'trace',
    INFO = 'info',
    DEBUG = 'debug',
    WARN = 'warn',
    ERROR = 'error',
}

/**
 * Priority levels mapped to each log level for filtering
 * Higher numbers indicate higher priority
 * @internal
 */
const LOG_PRIORITY: Record<LOG_LEVEL, number> = {
    [LOG_LEVEL.TRACE]: 0,
    [LOG_LEVEL.INFO]: 1,
    [LOG_LEVEL.DEBUG]: 2,
    [LOG_LEVEL.WARN]: 3,
    [LOG_LEVEL.ERROR]: 4,
};

/**
 * Color mapping for different log levels in terminal output
 * @internal
 */
const LOG_COLORS: Record<LOG_LEVEL, COLOR_NAMES> = {
    [LOG_LEVEL.TRACE]: COLOR_NAMES.LIGHT_MAGENTA,
    [LOG_LEVEL.INFO]: COLOR_NAMES.CYAN,
    [LOG_LEVEL.DEBUG]: COLOR_NAMES.BLUE,
    [LOG_LEVEL.WARN]: COLOR_NAMES.YELLOW,
    [LOG_LEVEL.ERROR]: COLOR_NAMES.RED,
};

/**
 * Configuration options for log file storage
 */
interface StoreOptions {
    /** Directory path where log files will be stored */
    directory: string;
    /** Minimum level of logs to store in files */
    level: LOG_LEVEL;
}

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
    /** Minimum level of logs to output */
    level: LOG_LEVEL;
    /** Whether to include stack traces in error logs */
    showStackTrace: boolean;
    /** Whether to include timestamps in log messages */
    showTimestamp: boolean;
    /** Output format for logs */
    format: 'json' | 'text';
    /** Configuration for file storage, if enabled */
    storeOptions?: StoreOptions | null;
}

/**
 * Default configuration for the logger
 * @internal
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: LOG_LEVEL.DEBUG,
    showStackTrace: true,
    showTimestamp: true,
    format: 'text',
    storeOptions: null,
};

/**
 * Main logger class that handles all logging operations
 */
export default class Logger {
    private logPriority: number;
    private config: LoggerConfig = DEFAULT_CONFIG;

    /**
     * Creates a new Logger instance
     * @param options - Configuration options for the logger
     */
    constructor(options: LoggerConfig = DEFAULT_CONFIG) {
        this.configure(options);
        this.logPriority = LOG_PRIORITY[options.level];
    }

    /**
     * Updates the logger configuration
     * @param options - Partial configuration options to update
     */
    configure(options: LoggerConfig): void {
        this.config = { ...this.config, ...options };
    }

    /**
     * Internal method to handle log message processing and output
     * @param level - Log level for the message
     * @param args - Arguments to be logged
     * @internal
     */
    private log(level: LOG_LEVEL, args: any[]): void {
        const timestamp = Logger.getTimestamp();

        // Printing Logs
        if (LOG_PRIORITY[level] >= this.logPriority) {
            if (this.config.format === 'json') {
                const logObject = {
                    ...(this.config.showTimestamp && { timestamp }),
                    level: level.toUpperCase(),
                    message: args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '),
                };
                console[level](JSON.stringify(logObject));
            } else {
                const coloredLevel = gach(`[${level.toUpperCase()}]`).color(LOG_COLORS[level]).text;
                const coloredTime = this.config.showTimestamp ? gach(`[${timestamp}]`).color('blue').text + ' ' : '';
                console[level](`${coloredTime}${coloredLevel}`, ...args);
            }

            // Remove stack trace if configured
            if (!this.config.showStackTrace) {
                Error.stackTraceLimit = 0;
            } else {
                Error.stackTraceLimit = 10; // or whatever default you want
            }
        }

        // Saving Logs to files
        if (this.config.storeOptions && LOG_PRIORITY[level] >= LOG_PRIORITY[this.config.storeOptions.level]) {
            const formattedArgs = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${formattedArgs}`;
            const filePath = this.getLogFilePath(level);
            fs.appendFileSync(filePath, logMessage + '\n');
        }
    }

    /**
     * Generates an ISO timestamp for log messages
     * @returns Formatted timestamp string
     */
    static getTimestamp(): string {
        return new Date().toISOString().replace('T', ' - ').replace('Z', '');
    }

    /**
     * Gets current date in YYYY-MM-DD format
     * @returns Date string in YYYY-MM-DD format
     */
    static getTodaysDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Generates file path for storing logs
     * @param level - Log level to determine file name
     * @returns Full path to log file
     * @internal
     */
    private getLogFilePath(level: LOG_LEVEL): string {
        if (!this.config.storeOptions) {
            throw new Error('Log directory is not initialized. Call initStore first.');
        }
        const date = Logger.getTodaysDate();
        const fileName = level === LOG_LEVEL.ERROR ? `grvt-errors-${date}.log` : `grvt-logs-${date}.log`;
        return path.join(this.config.storeOptions.directory, fileName);
    }

    /**
     * Initializes file storage for logs
     * @param options - Storage configuration options
     * @throws Error if directory creation fails
     */
    initStore(options: StoreOptions) {
        const { directory, level } = options;
        const absolutePath = path.resolve(directory);
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }
        this.config.storeOptions = { directory: absolutePath, level };
    }

    /**
     * Updates the minimum log level
     * @param level - New minimum log level
     */
    setLevel(level: LOG_LEVEL) {
        this.logPriority = LOG_PRIORITY[level];
    }

    /**
     * Logs an error message
     * @param args - Values to log
     */
    error(...args: any[]): void {
        this.log(LOG_LEVEL.ERROR, args);
    }

    /**
     * Logs a warning message
     * @param args - Values to log
     */
    warn(...args: any[]): void {
        this.log(LOG_LEVEL.WARN, args);
    }

    /**
     * Logs an informational message
     * @param args - Values to log
     */
    info(...args: any[]): void {
        this.log(LOG_LEVEL.INFO, args);
    }

    /**
     * Logs a trace message for detailed debugging
     * @param args - Values to log
     */
    trace(...args: any[]): void {
        this.log(LOG_LEVEL.TRACE, args);
    }

    /**
     * Logs a debug message
     * @param args - Values to log
     */
    debug(...args: any[]): void {
        this.log(LOG_LEVEL.DEBUG, args);
    }
}
