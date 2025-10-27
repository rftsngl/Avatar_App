/**
 * Async Storage Service
 * 
 * Provides a wrapper around React Native AsyncStorage for storing non-sensitive data.
 * This service is used for storing user preferences, platform selection, video metadata, etc.
 * 
 * Features:
 * - Type-safe storage operations
 * - JSON serialization/deserialization
 * - Error handling and logging
 * - Batch operations support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PlatformType, 
  StorageKeys, 
  UserPreferences, 
  VideoMetadata,
  Avatar,
  Voice
} from '../../types';
import { Logger } from '../../utils/Logger';

/**
 * Async Storage Service
 */
export class AsyncStorageService {
  /**
   * Save data to AsyncStorage
   * 
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   * @returns Promise<boolean> - Success status
   */
  static async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      Logger.info(`AsyncStorageService: Saved item with key: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`AsyncStorageService: Error saving item with key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get data from AsyncStorage
   * 
   * @param key - Storage key
   * @returns Promise<T | null> - Stored value or null if not found
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue !== null) {
        const value = JSON.parse(jsonValue) as T;
        Logger.info(`AsyncStorageService: Retrieved item with key: ${key}`);
        return value;
      }
      Logger.info(`AsyncStorageService: No item found with key: ${key}`);
      return null;
    } catch (error) {
      Logger.error(`AsyncStorageService: Error retrieving item with key: ${key}`, error);
      return null;
    }
  }

  /**
   * Remove data from AsyncStorage
   * 
   * @param key - Storage key
   * @returns Promise<boolean> - Success status
   */
  static async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      Logger.info(`AsyncStorageService: Removed item with key: ${key}`);
      return true;
    } catch (error) {
      Logger.error(`AsyncStorageService: Error removing item with key: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all data from AsyncStorage
   * 
   * @returns Promise<boolean> - Success status
   */
  static async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      Logger.info('AsyncStorageService: Cleared all storage');
      return true;
    } catch (error) {
      Logger.error('AsyncStorageService: Error clearing storage', error);
      return false;
    }
  }

  /**
   * Get all keys from AsyncStorage
   * 
   * @returns Promise<string[]> - Array of all keys
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      Logger.info(`AsyncStorageService: Retrieved ${keys.length} keys`);
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      Logger.error('AsyncStorageService: Error getting all keys', error);
      return [];
    }
  }

  // ============================================================================
  // Platform-specific methods
  // ============================================================================

  /**
   * Save selected platform
   * 
   * @param platform - Platform type
   * @returns Promise<boolean> - Success status
   */
  static async saveSelectedPlatform(platform: PlatformType): Promise<boolean> {
    return this.setItem(StorageKeys.SELECTED_PLATFORM, platform);
  }

  /**
   * Get selected platform
   * 
   * @returns Promise<PlatformType | null> - Selected platform or null
   */
  static async getSelectedPlatform(): Promise<PlatformType | null> {
    return this.getItem<PlatformType>(StorageKeys.SELECTED_PLATFORM);
  }

  // ============================================================================
  // User Preferences methods
  // ============================================================================

  /**
   * Save user preferences
   * 
   * @param preferences - User preferences object
   * @returns Promise<boolean> - Success status
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<boolean> {
    return this.setItem(StorageKeys.USER_PREFERENCES, preferences);
  }

  /**
   * Get user preferences
   * 
   * @returns Promise<UserPreferences | null> - User preferences or null
   */
  static async getUserPreferences(): Promise<UserPreferences | null> {
    return this.getItem<UserPreferences>(StorageKeys.USER_PREFERENCES);
  }

  /**
   * Get user preferences with defaults
   * 
   * @returns Promise<UserPreferences> - User preferences with default values
   */
  static async getUserPreferencesWithDefaults(): Promise<UserPreferences> {
    const preferences = await this.getUserPreferences();
    
    return {
      autoPlayVideos: preferences?.autoPlayVideos ?? true,
      saveVideosLocally: preferences?.saveVideosLocally ?? true,
      videoQuality: preferences?.videoQuality ?? 'high',
      defaultPlatform: preferences?.defaultPlatform,
      defaultAvatarId: preferences?.defaultAvatarId,
      defaultVoiceId: preferences?.defaultVoiceId,
    };
  }

  // ============================================================================
  // Video Metadata methods
  // ============================================================================

  /**
   * Save video metadata
   * 
   * @param videoId - Video ID
   * @param metadata - Video metadata
   * @returns Promise<boolean> - Success status
   */
  static async saveVideoMetadata(
    videoId: string,
    metadata: VideoMetadata
  ): Promise<boolean> {
    const key = `${StorageKeys.VIDEO_METADATA}_${videoId}`;
    return this.setItem(key, metadata);
  }

  /**
   * Get video metadata
   * 
   * @param videoId - Video ID
   * @returns Promise<VideoMetadata | null> - Video metadata or null
   */
  static async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    const key = `${StorageKeys.VIDEO_METADATA}_${videoId}`;
    return this.getItem<VideoMetadata>(key);
  }

  /**
   * Get all video metadata
   * 
   * @returns Promise<VideoMetadata[]> - Array of all video metadata
   */
  static async getAllVideoMetadata(): Promise<VideoMetadata[]> {
    try {
      const keys = await this.getAllKeys();
      const videoKeys = keys.filter(key => 
        key.startsWith(StorageKeys.VIDEO_METADATA)
      );

      const metadataPromises = videoKeys.map(key => 
        this.getItem<VideoMetadata>(key)
      );

      const metadataArray = await Promise.all(metadataPromises);
      
      // Filter out null values and sort by creation date (newest first)
      const validMetadata = metadataArray
        .filter((metadata): metadata is VideoMetadata => metadata !== null)
        .sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      Logger.info(`AsyncStorageService: Retrieved ${validMetadata.length} video metadata entries`);
      return validMetadata;
    } catch (error) {
      Logger.error('AsyncStorageService: Error getting all video metadata', error);
      return [];
    }
  }

  /**
   * Delete video metadata
   * 
   * @param videoId - Video ID
   * @returns Promise<boolean> - Success status
   */
  static async deleteVideoMetadata(videoId: string): Promise<boolean> {
    const key = `${StorageKeys.VIDEO_METADATA}_${videoId}`;
    return this.removeItem(key);
  }

  // ============================================================================
  // Cache methods
  // ============================================================================

  /**
   * Save avatar cache
   * 
   * @param platform - Platform type
   * @param avatars - Array of avatars
   * @returns Promise<boolean> - Success status
   */
  static async saveAvatarCache(platform: PlatformType, avatars: Avatar[]): Promise<boolean> {
    const key = `${StorageKeys.AVATAR_CACHE}_${platform}`;
    return this.setItem(key, {
      platform,
      avatars,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get avatar cache
   * 
   * @param platform - Platform type
   * @returns Promise<Avatar[] | null> - Cached avatars or null
   */
  static async getAvatarCache(platform: PlatformType): Promise<Avatar[] | null> {
    const key = `${StorageKeys.AVATAR_CACHE}_${platform}`;
    const cache = await this.getItem<{ avatars: Avatar[]; timestamp: string }>(key);
    return cache?.avatars ?? null;
  }

  /**
   * Save voice cache
   * 
   * @param platform - Platform type
   * @param voices - Array of voices
   * @returns Promise<boolean> - Success status
   */
  static async saveVoiceCache(platform: PlatformType, voices: Voice[]): Promise<boolean> {
    const key = `${StorageKeys.VOICE_CACHE}_${platform}`;
    return this.setItem(key, {
      platform,
      voices,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get voice cache
   * 
   * @param platform - Platform type
   * @returns Promise<Voice[] | null> - Cached voices or null
   */
  static async getVoiceCache(platform: PlatformType): Promise<Voice[] | null> {
    const key = `${StorageKeys.VOICE_CACHE}_${platform}`;
    const cache = await this.getItem<{ voices: Voice[]; timestamp: string }>(key);
    return cache?.voices ?? null;
  }
}

