/**
 * Logger Utility
 * 
 * Provides centralized logging functionality for the application.
 * Supports different log levels and can be configured for development/production.
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Timestamp formatting
 * - Conditional logging based on environment
 * - Error object formatting
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  enabled: __DEV__, // Only enable in development mode
  minLevel: LogLevel.DEBUG,
  includeTimestamp: true,
};

/**
 * Logger class
 */
export class Logger {
  private static config: LoggerConfig = defaultConfig;

  /**
   * Configure logger
   * 
   * @param config - Logger configuration
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if logging is enabled for a specific level
   * 
   * @param level - Log level to check
   * @returns boolean - True if logging is enabled for this level
   */
  private static isLevelEnabled(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Format timestamp
   * 
   * @returns string - Formatted timestamp
   */
  private static getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Format log message
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   * @returns string - Formatted log message
   */
  private static formatMessage(
    level: LogLevel,
    message: string,
    data?: any
  ): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${this.getTimestamp()}]`);
    }

    parts.push(`[${level}]`);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Format error object
   * 
   * @param error - Error object
   * @returns string - Formatted error message
   */
  private static formatError(error: any): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack || ''}`;
    }
    return JSON.stringify(error, null, 2);
  }

  /**
   * Log debug message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  static debug(message: string, data?: any): void {
    if (!this.isLevelEnabled(LogLevel.DEBUG)) {
      return;
    }

    const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, data);
    console.log(formattedMessage);

    if (data !== undefined) {
      console.log(data);
    }
  }

  /**
   * Log info message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  static info(message: string, data?: any): void {
    if (!this.isLevelEnabled(LogLevel.INFO)) {
      return;
    }

    const formattedMessage = this.formatMessage(LogLevel.INFO, message, data);
    console.log(formattedMessage);

    if (data !== undefined) {
      console.log(data);
    }
  }

  /**
   * Log warning message
   * 
   * @param message - Log message
   * @param data - Additional data
   */
  static warn(message: string, data?: any): void {
    if (!this.isLevelEnabled(LogLevel.WARN)) {
      return;
    }

    const formattedMessage = this.formatMessage(LogLevel.WARN, message, data);
    console.warn(formattedMessage);

    if (data !== undefined) {
      console.warn(data);
    }
  }

  /**
   * Log error message
   * 
   * @param message - Log message
   * @param error - Error object or additional data
   */
  static error(message: string, error?: any): void {
    if (!this.isLevelEnabled(LogLevel.ERROR)) {
      return;
    }

    const formattedMessage = this.formatMessage(LogLevel.ERROR, message);
    console.error(formattedMessage);

    if (error !== undefined) {
      if (error instanceof Error) {
        console.error(this.formatError(error));
      } else {
        console.error(error);
      }
    }
  }

  /**
   * Log group start
   * 
   * @param label - Group label
   */
  static group(label: string): void {
    if (!this.config.enabled) {
      return;
    }
    console.group(label);
  }

  /**
   * Log group end
   */
  static groupEnd(): void {
    if (!this.config.enabled) {
      return;
    }
    console.groupEnd();
  }

  /**
   * Log table (for arrays and objects)
   * 
   * @param data - Data to display in table format
   */
  static table(data: any): void {
    if (!this.config.enabled) {
      return;
    }
    console.table(data);
  }

  /**
   * Start performance timer
   * 
   * @param label - Timer label
   */
  static time(label: string): void {
    if (!this.config.enabled) {
      return;
    }
    console.time(label);
  }

  /**
   * End performance timer
   * 
   * @param label - Timer label
   */
  static timeEnd(label: string): void {
    if (!this.config.enabled) {
      return;
    }
    console.timeEnd(label);
  }
}

