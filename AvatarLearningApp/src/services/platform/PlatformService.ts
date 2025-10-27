/**
 * Platform Service
 * 
 * ============================================================================
 * MODIFIED: D-ID Platform Deactivated (2025-10-27)
 * ============================================================================
 * HeyGen is now the only supported platform. D-ID methods are kept for
 * reference but should not be used. Platform is hardcoded to 'heygen'.
 * ============================================================================
 * 
 * Manages platform configuration, API keys, and platform state.
 * Provides methods for platform selection, API key management, and validation.
 */

import { PlatformType, PlatformConfig, PlatformState } from '../../types';
import { SecureStorageService } from '../storage/SecureStorageService';
import { AsyncStorageService } from '../storage/AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { validateAPIKey, APIValidationResult } from '../../utils/apiValidation';

/**
 * Platform Service
 */
export class PlatformService {
  /**
   * Get current platform state
   * 
   * NOTE: HeyGen is the only active platform
   * 
   * @returns Promise<PlatformState> - Current platform state
   */
  static async getPlatformState(): Promise<PlatformState> {
    try {
      Logger.info('PlatformService: Getting platform state');

      // Get selected platform from AsyncStorage (should always be 'heygen')
      const selectedPlatform = await AsyncStorageService.getSelectedPlatform();

      // Get API keys from SecureStorage
      // D-ID API key kept for backward compatibility but not used
      const didApiKey = await SecureStorageService.getAPIKey('did');
      const heygenApiKey = await SecureStorageService.getAPIKey('heygen');

      // Build platform state
      const state: PlatformState = {
        selectedPlatform: 'heygen', // Force HeyGen
        didConfig: {
          type: 'did',
          name: 'D-ID (Deactivated)',
          apiKey: didApiKey,
          isConfigured: false, // Always false - D-ID disabled
        },
        heygenConfig: {
          type: 'heygen',
          name: 'HeyGen',
          apiKey: heygenApiKey,
          isConfigured: heygenApiKey !== null,
        },
      };

      Logger.info('PlatformService: Platform state retrieved', {
        selectedPlatform: 'heygen',
        heygenConfigured: state.heygenConfig.isConfigured,
      });

      return state;
    } catch (error) {
      Logger.error('PlatformService: Error getting platform state', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get platform state'
      );
    }
  }

  /**
   * Get selected platform
   * 
   * NOTE: Always returns 'heygen' as it's the only active platform
   * 
   * @returns Promise<PlatformType | null> - Selected platform (always 'heygen')
   */
  static async getSelectedPlatform(): Promise<PlatformType | null> {
    try {
      // Always return HeyGen
      Logger.info('PlatformService: Selected platform is heygen (only available platform)');
      return 'heygen';
    } catch (error) {
      Logger.error('PlatformService: Error getting selected platform', error);
      return 'heygen'; // Fallback to HeyGen
    }
  }

  /**
   * Set selected platform
   * 
   * NOTE: Only accepts 'heygen' as valid platform
   * 
   * @param platform - Platform to select (must be 'heygen')
   * @returns Promise<boolean> - Success status
   */
  static async setSelectedPlatform(platform: PlatformType): Promise<boolean> {
    try {
      // Only allow HeyGen
      if (platform !== 'heygen') {
        Logger.warn(`PlatformService: Attempted to set disabled platform: ${platform}`);
        Logger.info('PlatformService: Forcing platform to heygen');
        platform = 'heygen';
      }

      Logger.info(`PlatformService: Setting selected platform to ${platform}`);
      const success = await AsyncStorageService.saveSelectedPlatform(platform);

      if (success) {
        Logger.info(`PlatformService: Successfully set platform to ${platform}`);
      } else {
        Logger.error(`PlatformService: Failed to set platform to ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error('PlatformService: Error setting selected platform', error);
      return false;
    }
  }

  /**
   * Delete API key for a platform
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - Success status
   */
  static async deleteAPIKey(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`PlatformService: Deleting API key for ${platform}`);
      const success = await SecureStorageService.deleteAPIKey(platform);

      if (success) {
        Logger.info(`PlatformService: Successfully deleted API key for ${platform}`);
      } else {
        Logger.error(`PlatformService: Failed to delete API key for ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error(`PlatformService: Error deleting API key for ${platform}`, error);
      return false;
    }
  }

  /**
   * Check if a platform has an API key configured
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - True if API key exists
   */
  static async hasAPIKey(platform: PlatformType): Promise<boolean> {
    try {
      const hasKey = await SecureStorageService.hasAPIKey(platform);
      Logger.info(`PlatformService: Platform ${platform} ${hasKey ? 'has' : 'does not have'} API key`);
      return hasKey;
    } catch (error) {
      Logger.error(`PlatformService: Error checking API key for ${platform}`, error);
      return false;
    }
  }

  /**
   * Validate API key for a platform
   * 
   * @param platform - Platform type
   * @param apiKey - API key to validate
   * @returns Promise<APIValidationResult> - Validation result
   */
  static async validateAPIKey(
    platform: PlatformType,
    apiKey: string
  ): Promise<APIValidationResult> {
    try {
      Logger.info(`PlatformService: Validating API key for ${platform}`);
      const result = await validateAPIKey(platform, apiKey);

      if (result.isValid) {
        Logger.info(`PlatformService: API key for ${platform} is valid`);
      } else {
        Logger.warn(`PlatformService: API key for ${platform} is invalid`, result);
      }

      return result;
    } catch (error) {
      Logger.error(`PlatformService: Error validating API key for ${platform}`, error);
      return {
        isValid: false,
        message: 'Failed to validate API key',
        errorCode: ErrorCode.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Get platform configuration
   * 
   * @param platform - Platform type
   * @returns Promise<PlatformConfig> - Platform configuration
   */
  static async getPlatformConfig(platform: PlatformType): Promise<PlatformConfig> {
    try {
      const apiKey = await this.getAPIKey(platform);
      const name = platform === 'did' ? 'D-ID' : 'HeyGen';

      return {
        type: platform,
        name,
        apiKey,
        isConfigured: apiKey !== null,
      };
    } catch (error) {
      Logger.error(`PlatformService: Error getting config for ${platform}`, error);
      return {
        type: platform,
        name: platform === 'did' ? 'D-ID' : 'HeyGen',
        apiKey: null,
        isConfigured: false,
      };
    }
  }

  /**
   * Switch to a different platform
   * 
   * ============================================================================
   * DEACTIVATED: Platform switching disabled (2025-10-27)
   * HeyGen is the only supported platform. This method is kept for backward
   * compatibility but will not allow switching.
   * ============================================================================
   * 
   * @param platform - Platform to switch to (only 'heygen' is valid)
   * @returns Promise<boolean> - Success status
   */
  static async switchPlatform(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`PlatformService: Switch platform requested to ${platform}`);

      // DEACTIVATED: Only HeyGen is allowed
      if (platform !== 'heygen') {
        Logger.warn(`PlatformService: Platform switching disabled - only HeyGen is supported`);
        throw ErrorHandler.createError(
          ErrorCode.PLATFORM_NOT_CONFIGURED,
          'Only HeyGen platform is currently supported'
        );
      }

      // Get API key for platform
      const apiKey = await SecureStorageService.getAPIKey(platform);

      if (!apiKey) {
        Logger.warn(`PlatformService: Cannot switch to ${platform} - API key not configured`);
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          `${platform.toUpperCase()} API key not configured`
        );
      }

      // Set as selected platform
      const success = await this.setSelectedPlatform(platform);

      if (success) {
        Logger.info(`PlatformService: Successfully switched to ${platform}`);
      } else {
        Logger.error(`PlatformService: Failed to switch to ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error('PlatformService: Error switching platform', error);
      throw error;
    }
  }

  /**
   * Get API key for a platform
   * 
   * NOTE: D-ID API keys are stored but not used
   * 
   * @param platform - Platform to get API key for
   * @returns Promise<string | null> - API key or null
   */
  static async getAPIKey(platform: PlatformType): Promise<string | null> {
    try {
      Logger.info(`PlatformService: Getting API key for ${platform}`);
      
      // Log warning if requesting D-ID API key
      if (platform === 'did') {
        Logger.warn('PlatformService: D-ID platform is deactivated - API key stored but not used');
      }
      
      const apiKey = await SecureStorageService.getAPIKey(platform);

      if (apiKey) {
        Logger.info(`PlatformService: API key found for ${platform}`);
      } else {
        Logger.info(`PlatformService: No API key found for ${platform}`);
      }

      return apiKey;
    } catch (error) {
      Logger.error(`PlatformService: Error getting API key for ${platform}`, error);
      return null;
    }
  }

  /**
   * Save API key for a platform
   * 
   * NOTE: Only HeyGen API keys should be saved going forward
   * 
   * @param platform - Platform to save API key for
   * @param apiKey - API key to save
   * @returns Promise<boolean> - Success status
   */
  static async saveAPIKey(platform: PlatformType, apiKey: string): Promise<boolean> {
    try {
      Logger.info(`PlatformService: Saving API key for ${platform}`);
      
      // Warn if saving D-ID API key (still allowed for backward compatibility)
      if (platform === 'did') {
        Logger.warn('PlatformService: Saving D-ID API key - platform is deactivated');
      }
      
      const success = await SecureStorageService.saveAPIKey(platform, apiKey);

      if (success) {
        Logger.info(`PlatformService: Successfully saved API key for ${platform}`);
      } else {
        Logger.error(`PlatformService: Failed to save API key for ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error(`PlatformService: Error saving API key for ${platform}`, error);
      return false;
    }
  }

  /**
   * Check if platform is ready to use
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - True if platform is ready
   */
  static async isPlatformReady(platform: PlatformType): Promise<boolean> {
    try {
      const hasKey = await this.hasAPIKey(platform);
      Logger.info(`PlatformService: Platform ${platform} is ${hasKey ? 'ready' : 'not ready'}`);
      return hasKey;
    } catch (error) {
      Logger.error(`PlatformService: Error checking if ${platform} is ready`, error);
      return false;
    }
  }

  /**
   * Clear all platform data
   * 
   * @returns Promise<boolean> - Success status
   */
  static async clearAllPlatformData(): Promise<boolean> {
    try {
      Logger.info('PlatformService: Clearing all platform data');

      // Delete all API keys
      await SecureStorageService.deleteAPIKey('did');
      await SecureStorageService.deleteAPIKey('heygen');

      // Clear selected platform
      await AsyncStorageService.removeItem('selectedPlatform');

      Logger.info('PlatformService: Successfully cleared all platform data');
      return true;
    } catch (error) {
      Logger.error('PlatformService: Error clearing platform data', error);
      return false;
    }
  }
}

