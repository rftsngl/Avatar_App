/**
 * Utility Functions
 *
 * Exports all utility functions and classes
 */

export { Logger, LogLevel } from './Logger';
export { ErrorHandler, ErrorCode } from './ErrorHandler';
export { validateAPIKey, validateDIDAPIKey, validateHeyGenAPIKey } from './apiValidation';
export type { APIValidationResult } from './apiValidation';
export { CacheUtils } from './cacheUtils';
export { HapticUtils, HapticFeedbackType } from './hapticUtils';
export { PermissionUtils } from './permissionUtils';
export type { PermissionStatus, PermissionResult } from './permissionUtils';
export * from './testDataGenerator';
export * from './animationUtils';
export { PronunciationEvaluator } from './pronunciationEvaluator';
export type { PronunciationEvaluation, WordAnalysis } from './pronunciationEvaluator';
