/**
 * Secure Storage Service
 * 
 * Provides secure storage for sensitive data using iOS Keychain and Android Keystore.
 * This service is used to store API keys securely on the device.
 * 
 * Features:
 * - Hardware-backed encryption (when available)
 * - Secure storage for API keys
 * - Platform-specific implementation (iOS Keychain / Android Keystore)
 */

import * as Keychain from 'react-native-keychain';
import { PlatformType } from '../../types';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Service identifiers for different platforms
 */
const SERVICE_IDENTIFIERS = {
  did: 'com.avatarlearningapp.did',
  heygen: 'com.avatarlearningapp.heygen',
  elevenlabs: 'com.avatarlearningapp.elevenlabs',
  gemini: 'com.avatarlearningapp.gemini',
  iflytek: 'com.avatarlearningapp.iflytek', // LEGACY - Kept for backward compatibility (old data cleanup)
} as const;

/**
 * Secure Storage Service
 */
export class SecureStorageService {
  /**
   * Save API key securely
   * 
   * @param platform - Platform type (did or heygen)
   * @param apiKey - API key to store
   * @returns Promise<boolean> - Success status
   */
  static async saveAPIKey(
    platform: PlatformType,
    apiKey: string
  ): Promise<boolean> {
    try {
      Logger.info(`SecureStorageService: Saving API key for ${platform}`);

      const result = await Keychain.setGenericPassword(
        platform,
        apiKey,
        {
          service: SERVICE_IDENTIFIERS[platform],
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          securityLevel: Keychain.SECURITY_LEVEL.ANY,
        }
      );

      if (result) {
        Logger.info(`SecureStorageService: API key saved successfully for ${platform}`);
        return true;
      } else {
        Logger.error(`SecureStorageService: Failed to save API key for ${platform}`);
        return false;
      }
    } catch (error) {
      Logger.error('SecureStorageService: Error saving API key', error);
      return false;
    }
  }

  /**
   * Get API key from secure storage
   * 
   * @param platform - Platform type (did or heygen)
   * @returns Promise<string | null> - API key or null if not found
   */
  static async getAPIKey(platform: PlatformType): Promise<string | null> {
    try {
      Logger.info(`SecureStorageService: Retrieving API key for ${platform}`);

      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_IDENTIFIERS[platform],
      });

      if (credentials && typeof credentials !== 'boolean') {
        Logger.info(`SecureStorageService: API key retrieved successfully for ${platform}`);
        return credentials.password;
      } else {
        Logger.info(`SecureStorageService: No API key found for ${platform}`);
        return null;
      }
    } catch (error) {
      Logger.error('SecureStorageService: Error retrieving API key', error);
      return null;
    }
  }

  /**
   * Delete API key from secure storage
   * 
   * @param platform - Platform type (did or heygen)
   * @returns Promise<boolean> - Success status
   */
  static async deleteAPIKey(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`SecureStorageService: Deleting API key for ${platform}`);

      const result = await Keychain.resetGenericPassword({
        service: SERVICE_IDENTIFIERS[platform],
      });

      if (result) {
        Logger.info(`SecureStorageService: API key deleted successfully for ${platform}`);
        return true;
      } else {
        Logger.warn(`SecureStorageService: No API key to delete for ${platform}`);
        return false;
      }
    } catch (error) {
      Logger.error('SecureStorageService: Error deleting API key', error);
      return false;
    }
  }

  /**
   * Check if API key exists for platform
   * 
   * @param platform - Platform type (did or heygen)
   * @returns Promise<boolean> - True if API key exists
   */
  static async hasAPIKey(platform: PlatformType): Promise<boolean> {
    try {
      const apiKey = await this.getAPIKey(platform);
      return apiKey !== null;
    } catch (error) {
      Logger.error('SecureStorageService: Error checking API key existence', error);
      return false;
    }
  }

  /**
   * Get security level information
   * 
   * @returns Promise<string> - Security level description
   */
  static async getSecurityLevel(): Promise<string> {
    try {
      const securityLevel = await Keychain.getSecurityLevel();
      return securityLevel?.toString() || 'UNKNOWN';
    } catch (error) {
      Logger.error('SecureStorageService: Error getting security level', error);
      return 'ERROR';
    }
  }

  /**
   * Check if hardware-backed encryption is available
   * 
   * @returns Promise<boolean> - True if hardware-backed encryption is available
   */
  static async isHardwareBackedAvailable(): Promise<boolean> {
    try {
      const securityLevel = await Keychain.getSecurityLevel();
      return securityLevel === Keychain.SECURITY_LEVEL.SECURE_HARDWARE;
    } catch (error) {
      Logger.error('SecureStorageService: Error checking hardware-backed encryption', error);
      return false;
    }
  }

  /**
   * Clear all stored API keys
   * 
   * @returns Promise<boolean> - Success status
   */
  static async clearAll(): Promise<boolean> {
    try {
      Logger.info('SecureStorageService: Clearing all API keys');

      const didResult = await this.deleteAPIKey('did');
      const heygenResult = await this.deleteAPIKey('heygen');
      const elevenlabsResult = await this.deleteAPIKey('elevenlabs');

      const success = didResult || heygenResult || elevenlabsResult;
      
      if (success) {
        Logger.info('SecureStorageService: All API keys cleared successfully');
      } else {
        Logger.warn('SecureStorageService: No API keys to clear');
      }

      return success;
    } catch (error) {
      Logger.error('SecureStorageService: Error clearing all API keys', error);
      return false;
    }
  }

  /**
   * Save ElevenLabs API key securely
   */
  static async saveElevenLabsAPIKey(apiKey: string): Promise<void> {
    try {
      Logger.info('SecureStorageService: Saving ElevenLabs API key');
      await Keychain.setGenericPassword(
        SERVICE_IDENTIFIERS.elevenlabs,
        apiKey,
        {
          service: SERVICE_IDENTIFIERS.elevenlabs,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );
      Logger.info('SecureStorageService: ElevenLabs API key saved successfully');
    } catch (error) {
      Logger.error('SecureStorageService: Failed to save ElevenLabs API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save ElevenLabs API key securely'
      );
    }
  }

  /**
   * Get ElevenLabs API key
   */
  static async getElevenLabsAPIKey(): Promise<string | null> {
    try {
      Logger.info('SecureStorageService: Retrieving ElevenLabs API key');
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_IDENTIFIERS.elevenlabs,
      });

      if (credentials) {
        Logger.info('SecureStorageService: ElevenLabs API key retrieved successfully');
        return credentials.password;
      }

      Logger.info('SecureStorageService: No ElevenLabs API key found');
      return null;
    } catch (error) {
      Logger.error('SecureStorageService: Failed to retrieve ElevenLabs API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve ElevenLabs API key'
      );
    }
  }

  /**
   * Delete ElevenLabs API key
   */
  static async deleteElevenLabsAPIKey(): Promise<void> {
    try {
      Logger.info('SecureStorageService: Deleting ElevenLabs API key');
      await Keychain.resetGenericPassword({
        service: SERVICE_IDENTIFIERS.elevenlabs,
      });
      Logger.info('SecureStorageService: ElevenLabs API key deleted successfully');
    } catch (error) {
      Logger.error('SecureStorageService: Failed to delete ElevenLabs API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete ElevenLabs API key'
      );
    }
  }

  /**
   * Save Gemini API key securely
   */
  static async saveGeminiAPIKey(apiKey: string): Promise<void> {
    try {
      Logger.info('SecureStorageService: Saving Gemini API key');
      await Keychain.setGenericPassword(
        SERVICE_IDENTIFIERS.gemini,
        apiKey,
        {
          service: SERVICE_IDENTIFIERS.gemini,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );
      Logger.info('SecureStorageService: Gemini API key saved successfully');
    } catch (error) {
      Logger.error('SecureStorageService: Failed to save Gemini API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save Gemini API key securely'
      );
    }
  }

  /**
   * Get Gemini API key
   */
  static async getGeminiAPIKey(): Promise<string | null> {
    try {
      Logger.info('SecureStorageService: Retrieving Gemini API key');
      const credentials = await Keychain.getGenericPassword({
        service: SERVICE_IDENTIFIERS.gemini,
      });

      if (credentials && typeof credentials !== 'boolean') {
        Logger.info('SecureStorageService: Gemini API key retrieved successfully');
        return credentials.password;
      }

      Logger.info('SecureStorageService: No Gemini API key found');
      return null;
    } catch (error) {
      Logger.error('SecureStorageService: Failed to retrieve Gemini API key', error);
      return null;
    }
  }

  /**
   * Delete Gemini API key
   */
  static async deleteGeminiAPIKey(): Promise<void> {
    try {
      Logger.info('SecureStorageService: Deleting Gemini API key');
      await Keychain.resetGenericPassword({
        service: SERVICE_IDENTIFIERS.gemini,
      });
      Logger.info('SecureStorageService: Gemini API key deleted successfully');
    } catch (error) {
      Logger.error('SecureStorageService: Failed to delete Gemini API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete Gemini API key'
      );
    }
  }
}

/**
 * Save ElevenLabs API key securely
 */
export const saveElevenLabsAPIKey = async (apiKey: string): Promise<void> => {
  try {
    Logger.info('SecureStorageService: Saving ElevenLabs API key');
    
    await Keychain.setGenericPassword(SERVICE_IDENTIFIERS.elevenlabs, apiKey, {
      service: SERVICE_IDENTIFIERS.elevenlabs,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
    
    Logger.info('SecureStorageService: ElevenLabs API key saved successfully');
  } catch (error) {
    Logger.error('SecureStorageService: Error saving ElevenLabs API key', error);
    throw ErrorHandler.createError(
      ErrorCode.STORAGE_ERROR,
      'Failed to save ElevenLabs API key'
    );
  }
};

/**
 * Get ElevenLabs API key
 */
export const getElevenLabsAPIKey = async (): Promise<string | null> => {
  try {
    Logger.info('SecureStorageService: Getting ElevenLabs API key');
    
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_IDENTIFIERS.elevenlabs,
    });
    
    if (!credentials) {
      Logger.info('SecureStorageService: No ElevenLabs API key found');
      return null;
    }
    
    Logger.info('SecureStorageService: ElevenLabs API key retrieved successfully');
    return credentials.password;
  } catch (error) {
    Logger.error('SecureStorageService: Error getting ElevenLabs API key', error);
    return null;
  }
};

/**
 * Delete ElevenLabs API key
 */
export const deleteElevenLabsAPIKey = async (): Promise<void> => {
  try {
    Logger.info('SecureStorageService: Deleting ElevenLabs API key');
    
    await Keychain.resetGenericPassword({
      service: SERVICE_IDENTIFIERS.elevenlabs,
    });
    
    Logger.info('SecureStorageService: ElevenLabs API key deleted successfully');
  } catch (error) {
    Logger.error('SecureStorageService: Error deleting ElevenLabs API key', error);
    throw ErrorHandler.createError(
      ErrorCode.STORAGE_ERROR,
      'Failed to delete ElevenLabs API key'
    );
  }
};

