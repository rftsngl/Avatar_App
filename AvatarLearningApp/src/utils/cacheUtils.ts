/**
 * Cache Utilities
 * 
 * Provides utilities for managing cached data with expiration logic
 */

import { PlatformType, Avatar, Voice } from '../types';
import { AsyncStorageService } from '../services/storage/AsyncStorageService';
import { Logger } from './Logger';

/**
 * Cache expiration time in milliseconds
 * Default: 24 hours
 */
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maximum number of items to cache
 * Prevents unlimited cache growth
 */
const MAX_AVATAR_CACHE_SIZE = 100;
const MAX_VOICE_CACHE_SIZE = 200;

/**
 * Cache data structure
 */
interface CacheData<T> {
  platform: PlatformType;
  data: T[];
  timestamp: string;
}

/**
 * Cache validation result
 */
interface CacheValidationResult<T> {
  isValid: boolean;
  data: T[] | null;
  age?: number; // Age in milliseconds
}

/**
 * Cache Utilities
 */
export class CacheUtils {
  /**
   * Check if cache is expired
   * 
   * @param timestamp - Cache timestamp (ISO string)
   * @param expirationMs - Expiration time in milliseconds (default: 24 hours)
   * @returns boolean - True if cache is expired
   */
  static isCacheExpired(timestamp: string, expirationMs: number = CACHE_EXPIRATION_MS): boolean {
    try {
      const cacheTime = new Date(timestamp).getTime();
      const now = Date.now();
      const age = now - cacheTime;

      return age > expirationMs;
    } catch (error) {
      Logger.error('CacheUtils: Error checking cache expiration', error);
      return true; // Treat invalid timestamp as expired
    }
  }

  /**
   * Get cache age in milliseconds
   * 
   * @param timestamp - Cache timestamp (ISO string)
   * @returns number - Age in milliseconds
   */
  static getCacheAge(timestamp: string): number {
    try {
      const cacheTime = new Date(timestamp).getTime();
      const now = Date.now();
      return now - cacheTime;
    } catch (error) {
      Logger.error('CacheUtils: Error calculating cache age', error);
      return Infinity;
    }
  }

  /**
   * Validate and get avatar cache
   * 
   * @param platform - Platform type
   * @param expirationMs - Expiration time in milliseconds (default: 24 hours)
   * @returns Promise<CacheValidationResult<Avatar>> - Validation result with data
   */
  static async getValidAvatarCache(
    platform: PlatformType,
    expirationMs: number = CACHE_EXPIRATION_MS
  ): Promise<CacheValidationResult<Avatar>> {
    try {
      Logger.info(`CacheUtils: Checking avatar cache for ${platform}`);

      const key = `avatar_cache_${platform}`;
      const cache = await AsyncStorageService.getItem<CacheData<Avatar>>(key);

      if (!cache) {
        Logger.info(`CacheUtils: No avatar cache found for ${platform}`);
        return { isValid: false, data: null };
      }

      const isExpired = this.isCacheExpired(cache.timestamp, expirationMs);
      const age = this.getCacheAge(cache.timestamp);

      if (isExpired) {
        Logger.info(`CacheUtils: Avatar cache expired for ${platform} (age: ${age}ms)`);
        return { isValid: false, data: null, age };
      }

      Logger.info(`CacheUtils: Valid avatar cache found for ${platform} (age: ${age}ms)`);
      return { isValid: true, data: cache.data, age };
    } catch (error) {
      Logger.error(`CacheUtils: Error getting avatar cache for ${platform}`, error);
      return { isValid: false, data: null };
    }
  }

  /**
   * Save avatar cache with timestamp
   *
   * @param platform - Platform type
   * @param avatars - Array of avatars
   * @returns Promise<boolean> - Success status
   */
  static async saveAvatarCache(platform: PlatformType, avatars: Avatar[]): Promise<boolean> {
    try {
      Logger.info(`CacheUtils: Saving avatar cache for ${platform} (${avatars.length} avatars)`);

      // Limit cache size to prevent unlimited growth
      const limitedAvatars = avatars.slice(0, MAX_AVATAR_CACHE_SIZE);
      if (avatars.length > MAX_AVATAR_CACHE_SIZE) {
        Logger.warn(`CacheUtils: Avatar cache size limited to ${MAX_AVATAR_CACHE_SIZE} items (was ${avatars.length})`);
      }

      const key = `avatar_cache_${platform}`;
      const cacheData: CacheData<Avatar> = {
        platform,
        data: limitedAvatars,
        timestamp: new Date().toISOString(),
      };

      const success = await AsyncStorageService.setItem(key, cacheData);

      if (success) {
        Logger.info(`CacheUtils: Successfully saved avatar cache for ${platform}`);
      } else {
        Logger.error(`CacheUtils: Failed to save avatar cache for ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error(`CacheUtils: Error saving avatar cache for ${platform}`, error);
      return false;
    }
  }

  /**
   * Validate and get voice cache
   * 
   * @param platform - Platform type
   * @param expirationMs - Expiration time in milliseconds (default: 24 hours)
   * @returns Promise<CacheValidationResult<Voice>> - Validation result with data
   */
  static async getValidVoiceCache(
    platform: PlatformType,
    expirationMs: number = CACHE_EXPIRATION_MS
  ): Promise<CacheValidationResult<Voice>> {
    try {
      Logger.info(`CacheUtils: Checking voice cache for ${platform}`);

      const key = `voice_cache_${platform}`;
      const cache = await AsyncStorageService.getItem<CacheData<Voice>>(key);

      if (!cache) {
        Logger.info(`CacheUtils: No voice cache found for ${platform}`);
        return { isValid: false, data: null };
      }

      const isExpired = this.isCacheExpired(cache.timestamp, expirationMs);
      const age = this.getCacheAge(cache.timestamp);

      if (isExpired) {
        Logger.info(`CacheUtils: Voice cache expired for ${platform} (age: ${age}ms)`);
        return { isValid: false, data: null, age };
      }

      Logger.info(`CacheUtils: Valid voice cache found for ${platform} (age: ${age}ms)`);
      return { isValid: true, data: cache.data, age };
    } catch (error) {
      Logger.error(`CacheUtils: Error getting voice cache for ${platform}`, error);
      return { isValid: false, data: null };
    }
  }

  /**
   * Save voice cache with timestamp
   *
   * @param platform - Platform type
   * @param voices - Array of voices
   * @returns Promise<boolean> - Success status
   */
  static async saveVoiceCache(platform: PlatformType, voices: Voice[]): Promise<boolean> {
    try {
      Logger.info(`CacheUtils: Saving voice cache for ${platform} (${voices.length} voices)`);

      // Limit cache size to prevent unlimited growth
      const limitedVoices = voices.slice(0, MAX_VOICE_CACHE_SIZE);
      if (voices.length > MAX_VOICE_CACHE_SIZE) {
        Logger.warn(`CacheUtils: Voice cache size limited to ${MAX_VOICE_CACHE_SIZE} items (was ${voices.length})`);
      }

      const key = `voice_cache_${platform}`;
      const cacheData: CacheData<Voice> = {
        platform,
        data: limitedVoices,
        timestamp: new Date().toISOString(),
      };

      const success = await AsyncStorageService.setItem(key, cacheData);

      if (success) {
        Logger.info(`CacheUtils: Successfully saved voice cache for ${platform}`);
      } else {
        Logger.error(`CacheUtils: Failed to save voice cache for ${platform}`);
      }

      return success;
    } catch (error) {
      Logger.error(`CacheUtils: Error saving voice cache for ${platform}`, error);
      return false;
    }
  }

  /**
   * Clear avatar cache for a platform
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - Success status
   */
  static async clearAvatarCache(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`CacheUtils: Clearing avatar cache for ${platform}`);
      const key = `avatar_cache_${platform}`;
      return await AsyncStorageService.removeItem(key);
    } catch (error) {
      Logger.error(`CacheUtils: Error clearing avatar cache for ${platform}`, error);
      return false;
    }
  }

  /**
   * Clear voice cache for a platform
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - Success status
   */
  static async clearVoiceCache(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`CacheUtils: Clearing voice cache for ${platform}`);
      const key = `voice_cache_${platform}`;
      return await AsyncStorageService.removeItem(key);
    } catch (error) {
      Logger.error(`CacheUtils: Error clearing voice cache for ${platform}`, error);
      return false;
    }
  }

  /**
   * Clear all caches for a platform
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - Success status
   */
  static async clearAllCaches(platform: PlatformType): Promise<boolean> {
    try {
      Logger.info(`CacheUtils: Clearing all caches for ${platform}`);
      const avatarCleared = await this.clearAvatarCache(platform);
      const voiceCleared = await this.clearVoiceCache(platform);
      return avatarCleared && voiceCleared;
    } catch (error) {
      Logger.error(`CacheUtils: Error clearing all caches for ${platform}`, error);
      return false;
    }
  }

  /**
   * Get cache expiration time in hours
   * 
   * @returns number - Expiration time in hours
   */
  static getCacheExpirationHours(): number {
    return CACHE_EXPIRATION_MS / (60 * 60 * 1000);
  }
}

