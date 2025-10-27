/**
 * Error Handler Utility
 * 
 * Provides centralized error handling functionality for the application.
 * Handles different types of errors and provides user-friendly error messages.
 * 
 * Features:
 * - Error type detection
 * - User-friendly error messages
 * - Error logging
 * - API error handling
 */

import { AppError, APIError } from '../types';
import { Logger } from './Logger';

/**
 * Error codes
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // API errors
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  
  // Video generation errors
  VIDEO_GENERATION_FAILED = 'VIDEO_GENERATION_FAILED',
  VIDEO_GENERATION_TIMEOUT = 'VIDEO_GENERATION_TIMEOUT',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  
  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  NOT_FOUND = 'NOT_FOUND',
  
  // Platform errors
  PLATFORM_NOT_SELECTED = 'PLATFORM_NOT_SELECTED',
  PLATFORM_NOT_CONFIGURED = 'PLATFORM_NOT_CONFIGURED',
  
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MICROPHONE_PERMISSION_DENIED = 'MICROPHONE_PERMISSION_DENIED',
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  
  // Service errors
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Media errors
  AUDIO_ERROR = 'AUDIO_ERROR',
  MEDIA_ERROR = 'MEDIA_ERROR',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  
  [ErrorCode.API_KEY_INVALID]: 'Invalid API key. Please check your API key and try again.',
  [ErrorCode.API_KEY_MISSING]: 'API key is missing. Please configure your API key in settings.',
  [ErrorCode.API_RATE_LIMIT]: 'API rate limit exceeded. Please try again later.',
  [ErrorCode.API_SERVER_ERROR]: 'Server error. Please try again later.',
  [ErrorCode.API_UNAUTHORIZED]: 'Unauthorized access. Please check your API key.',
  
  [ErrorCode.VIDEO_GENERATION_FAILED]: 'Video generation failed. Please try again.',
  [ErrorCode.VIDEO_GENERATION_TIMEOUT]: 'Video generation timed out. Please try again.',
  [ErrorCode.VIDEO_NOT_FOUND]: 'Video not found.',
  
  [ErrorCode.STORAGE_ERROR]: 'Storage error. Please try again.',
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please free up some space.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
  
  [ErrorCode.PLATFORM_NOT_SELECTED]: 'Please select a platform first.',
  [ErrorCode.PLATFORM_NOT_CONFIGURED]: 'Platform is not configured. Please configure it in settings.',
  
  [ErrorCode.PERMISSION_DENIED]: 'Permission denied. Please grant the necessary permissions.',
  [ErrorCode.MICROPHONE_PERMISSION_DENIED]: 'Microphone permission denied. Please grant microphone access in settings.',
  [ErrorCode.CAMERA_PERMISSION_DENIED]: 'Camera permission denied. Please grant camera access in settings.',
  
  [ErrorCode.INITIALIZATION_ERROR]: 'Initialization failed. Please restart the app.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is currently unavailable. Please try again later.',
  
  [ErrorCode.AUDIO_ERROR]: 'Audio error occurred. Please try again.',
  [ErrorCode.MEDIA_ERROR]: 'Media error occurred. Please check file access permissions.',
  
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again.',
  [ErrorCode.VALIDATION_ERROR]: 'Validation error. Please check your input.',
};

/**
 * Error Handler class
 */
export class ErrorHandler {
  /**
   * Create an AppError
   * 
   * @param code - Error code
   * @param message - Custom error message (optional)
   * @param details - Additional error details
   * @returns AppError
   */
  static createError(
    code: ErrorCode,
    message?: string,
    details?: any
  ): AppError {
    return {
      code,
      message: message || ERROR_MESSAGES[code],
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle API error
   * 
   * @param error - Error object
   * @returns AppError
   */
  static handleAPIError(error: any): AppError {
    Logger.error('ErrorHandler: Handling API error', error);

    // Check if it's an axios error
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          return this.createError(
            ErrorCode.API_UNAUTHORIZED,
            undefined,
            { status, data }
          );
        case 403:
          return this.createError(
            ErrorCode.API_KEY_INVALID,
            undefined,
            { status, data }
          );
        case 429:
          return this.createError(
            ErrorCode.API_RATE_LIMIT,
            undefined,
            { status, data }
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return this.createError(
            ErrorCode.API_SERVER_ERROR,
            undefined,
            { status, data }
          );
        default:
          return this.createError(
            ErrorCode.UNKNOWN_ERROR,
            `API error: ${status}`,
            { status, data }
          );
      }
    }

    // Check if it's a network error
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      return this.createError(ErrorCode.NETWORK_ERROR, undefined, error);
    }

    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return this.createError(ErrorCode.TIMEOUT_ERROR, undefined, error);
    }

    // Unknown error
    return this.createError(
      ErrorCode.UNKNOWN_ERROR,
      error.message || 'Unknown API error',
      error
    );
  }

  /**
   * Handle storage error
   * 
   * @param error - Error object
   * @returns AppError
   */
  static handleStorageError(error: any): AppError {
    Logger.error('ErrorHandler: Handling storage error', error);

    if (error.message && error.message.includes('quota')) {
      return this.createError(ErrorCode.STORAGE_QUOTA_EXCEEDED, undefined, error);
    }

    return this.createError(ErrorCode.STORAGE_ERROR, undefined, error);
  }

  /**
   * Handle video generation error
   * 
   * @param error - Error object
   * @returns AppError
   */
  static handleVideoGenerationError(error: any): AppError {
    Logger.error('ErrorHandler: Handling video generation error', error);

    if (error.message && error.message.includes('timeout')) {
      return this.createError(ErrorCode.VIDEO_GENERATION_TIMEOUT, undefined, error);
    }

    if (error.message && error.message.includes('not found')) {
      return this.createError(ErrorCode.VIDEO_NOT_FOUND, undefined, error);
    }

    return this.createError(ErrorCode.VIDEO_GENERATION_FAILED, undefined, error);
  }

  /**
   * Get user-friendly error message
   * 
   * @param error - AppError or Error object
   * @returns string - User-friendly error message
   */
  static getUserMessage(error: AppError | Error | any): string {
    if ('code' in error && error.code in ERROR_MESSAGES) {
      return error.message || ERROR_MESSAGES[error.code as ErrorCode];
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
  }

  /**
   * Log error
   * 
   * @param error - Error object
   * @param context - Additional context
   */
  static logError(error: any, context?: string): void {
    const message = context 
      ? `${context}: ${this.getUserMessage(error)}`
      : this.getUserMessage(error);

    Logger.error(message, error);
  }

  /**
   * Check if error is a network error
   * 
   * @param error - Error object
   * @returns boolean
   */
  static isNetworkError(error: any): boolean {
    return (
      error.code === ErrorCode.NETWORK_ERROR ||
      error.code === ErrorCode.TIMEOUT_ERROR ||
      error.message === 'Network Error' ||
      error.code === 'ECONNABORTED'
    );
  }

  /**
   * Check if error is an API error
   * 
   * @param error - Error object
   * @returns boolean
   */
  static isAPIError(error: any): boolean {
    return (
      error.code === ErrorCode.API_KEY_INVALID ||
      error.code === ErrorCode.API_KEY_MISSING ||
      error.code === ErrorCode.API_RATE_LIMIT ||
      error.code === ErrorCode.API_SERVER_ERROR ||
      error.code === ErrorCode.API_UNAUTHORIZED
    );
  }
}

