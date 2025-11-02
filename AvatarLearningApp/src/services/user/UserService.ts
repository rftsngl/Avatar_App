/**
 * UserService.ts
 * 
 * User identification and management for single-user app.
 * Generates unique device-based user ID on first launch.
 * 
 * Features:
 * - Device-unique user ID generation (UUID)
 * - Persistent user ID storage
 * - No personal data collection
 * - Privacy-first approach
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import { AsyncStorageService } from '../storage/AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Storage key for user ID
 */
const USER_ID_KEY = 'user_id';

/**
 * User Service
 * 
 * PRIVACY NOTE: This app is single-user and local-first.
 * User ID is device-based (not personal data) and never leaves the device.
 */
export class UserService {
  private static cachedUserId: string | null = null;

  /**
   * Get or create device-unique user ID
   * 
   * @returns Promise<string> - Device-unique user ID (UUID format)
   */
  static async getUserId(): Promise<string> {
    Logger.info('UserService: Getting user ID');

    try {
      // Return cached ID if available
      if (this.cachedUserId) {
        Logger.info('UserService: Using cached user ID');
        return this.cachedUserId;
      }

      // Try to get existing ID from storage
      const existingId = await AsyncStorageService.getItem<string>(USER_ID_KEY);

      if (existingId) {
        Logger.info('UserService: Found existing user ID');
        this.cachedUserId = existingId;
        return existingId;
      }

      // Generate new device-unique ID (UUID v4 format)
      const newUserId = this.generateUUID();
      
      await AsyncStorageService.setItem(USER_ID_KEY, newUserId);
      this.cachedUserId = newUserId;

      Logger.info('UserService: Generated new user ID', { 
        userId: `${newUserId.substring(0, 8)}...` // Log only first 8 chars
      });

      return newUserId;

    } catch (error) {
      Logger.error('UserService: Failed to get/create user ID', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to initialize user ID'
      );
    }
  }

  /**
   * Generate UUID v4 (device-unique identifier)
   * 
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * Example: 550e8400-e29b-41d4-a716-446655440000
   * 
   * NOTE: This is NOT a personal identifier. It's a random device ID
   * used only for local data organization.
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Reset user ID (for testing or app reset)
   * 
   * WARNING: This will delete all user data references.
   * Practice history, preferences, etc. will become orphaned.
   */
  static async resetUserId(): Promise<void> {
    Logger.info('UserService: Resetting user ID');

    try {
      await AsyncStorageService.removeItem(USER_ID_KEY);
      this.cachedUserId = null;

      Logger.info('UserService: User ID reset successfully');

    } catch (error) {
      Logger.error('UserService: Failed to reset user ID', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to reset user ID'
      );
    }
  }

  /**
   * Check if user ID exists (first launch detection)
   */
  static async hasUserId(): Promise<boolean> {
    try {
      const userId = await AsyncStorageService.getItem<string>(USER_ID_KEY);
      return userId !== null;
    } catch (error) {
      Logger.error('UserService: Failed to check user ID', error);
      return false;
    }
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.cachedUserId = null;
  }
}
