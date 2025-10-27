/**
 * Avatar Storage Service
 * 
 * Manages local storage of custom avatar photos and metadata.
 * Similar to VoiceCloneStorageService but for avatar photos.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { AvatarProfile, AvatarPhoto } from '../../types';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  AVATAR_PROFILES: '@avatar_profiles',
  AVATAR_CONSENT: '@avatar_consent',
};

/**
 * Avatar Storage Service
 */
export class AvatarStorageService {
  private static readonly AVATAR_PHOTOS_DIR = `${RNFS.DocumentDirectoryPath}/avatar_photos`;

  /**
   * Initialize avatar storage
   * Creates necessary directories
   */
  static async initialize(): Promise<void> {
    try {
      Logger.info('AvatarStorageService: Initializing');

      // Create avatar photos directory if it doesn't exist
      const dirExists = await RNFS.exists(this.AVATAR_PHOTOS_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.AVATAR_PHOTOS_DIR);
        Logger.info('AvatarStorageService: Created avatar_photos directory');
      }

      Logger.info('AvatarStorageService: Initialized successfully');
    } catch (error) {
      Logger.error('AvatarStorageService: Initialization error', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to initialize avatar storage'
      );
    }
  }

  /**
   * Save avatar photo to local storage
   * 
   * @param profileId - Avatar profile ID
   * @param photoUri - Source photo URI
   * @param photoFileName - Photo file name
   * @param fileSize - File size in bytes
   * @returns Promise<AvatarPhoto> - Saved avatar photo metadata
   */
  static async saveAvatarPhoto(
    profileId: string,
    photoUri: string,
    photoFileName: string,
    fileSize: number
  ): Promise<AvatarPhoto> {
    try {
      Logger.info('AvatarStorageService: Saving avatar photo', {
        profileId,
        photoFileName,
      });

      // Ensure directory exists
      await this.initialize();

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `${profileId}_${timestamp}_${photoFileName}`;
      const filePath = `${this.AVATAR_PHOTOS_DIR}/${fileName}`;

      // Copy photo to storage
      await RNFS.copyFile(photoUri, filePath);

      // Create photo metadata
      const photo: AvatarPhoto = {
        id: `photo_${timestamp}`,
        profileId,
        filePath,
        fileName,
        fileSize,
        createdAt: new Date().toISOString(),
      };

      Logger.info('AvatarStorageService: Avatar photo saved successfully', {
        photoId: photo.id,
        filePath,
      });

      return photo;
    } catch (error) {
      Logger.error('AvatarStorageService: Error saving avatar photo', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save avatar photo'
      );
    }
  }

  /**
   * Get avatar photo for a profile
   * 
   * @param profileId - Avatar profile ID
   * @returns Promise<AvatarPhoto | null> - Avatar photo or null if not found
   */
  static async getAvatarPhoto(profileId: string): Promise<AvatarPhoto | null> {
    try {
      Logger.info('AvatarStorageService: Getting avatar photo', { profileId });

      // Get all files in avatar photos directory
      const files = await RNFS.readDir(this.AVATAR_PHOTOS_DIR);

      // Find photo for this profile
      const photoFile = files.find(file => file.name.startsWith(`${profileId}_`));

      if (!photoFile) {
        Logger.info('AvatarStorageService: No photo found for profile', { profileId });
        return null;
      }

      const photo: AvatarPhoto = {
        id: `photo_${profileId}`,
        profileId,
        filePath: photoFile.path,
        fileName: photoFile.name,
        fileSize: photoFile.size,
        createdAt: new Date(photoFile.mtime || Date.now()).toISOString(),
      };

      return photo;
    } catch (error) {
      Logger.error('AvatarStorageService: Error getting avatar photo', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get avatar photo'
      );
    }
  }

  /**
   * Delete avatar photo
   * 
   * @param profileId - Avatar profile ID
   * @param photoId - Photo ID
   * @returns Promise<void>
   */
  static async deleteAvatarPhoto(profileId: string, photoId: string): Promise<void> {
    try {
      Logger.info('AvatarStorageService: Deleting avatar photo', {
        profileId,
        photoId,
      });

      // Get all files in avatar photos directory
      const files = await RNFS.readDir(this.AVATAR_PHOTOS_DIR);

      // Find and delete photo for this profile
      const photoFile = files.find(file => file.name.startsWith(`${profileId}_`));

      if (photoFile) {
        await RNFS.unlink(photoFile.path);
        Logger.info('AvatarStorageService: Avatar photo deleted successfully');
      } else {
        Logger.warn('AvatarStorageService: Photo file not found', { profileId });
      }
    } catch (error) {
      Logger.error('AvatarStorageService: Error deleting avatar photo', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete avatar photo'
      );
    }
  }

  /**
   * Save avatar profile metadata
   * 
   * @param profile - Avatar profile to save
   * @returns Promise<void>
   */
  static async saveAvatarProfile(profile: AvatarProfile): Promise<void> {
    try {
      Logger.info('AvatarStorageService: Saving avatar profile', {
        profileId: profile.id,
        name: profile.name,
      });

      // Get existing profiles
      const profiles = await this.getAllAvatarProfiles();

      // Update or add profile
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.AVATAR_PROFILES,
        JSON.stringify(profiles)
      );

      Logger.info('AvatarStorageService: Avatar profile saved successfully');
    } catch (error) {
      Logger.error('AvatarStorageService: Error saving avatar profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save avatar profile'
      );
    }
  }

  /**
   * Get all avatar profiles
   * 
   * @returns Promise<AvatarProfile[]> - Array of avatar profiles
   */
  static async getAllAvatarProfiles(): Promise<AvatarProfile[]> {
    try {
      Logger.info('AvatarStorageService: Getting all avatar profiles');

      const profilesJson = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR_PROFILES);

      if (!profilesJson) {
        Logger.info('AvatarStorageService: No avatar profiles found');
        return [];
      }

      const profiles: AvatarProfile[] = JSON.parse(profilesJson);
      Logger.info(`AvatarStorageService: Found ${profiles.length} avatar profiles`);

      return profiles;
    } catch (error) {
      Logger.error('AvatarStorageService: Error getting avatar profiles', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get avatar profiles'
      );
    }
  }

  /**
   * Get avatar profile by ID
   * 
   * @param profileId - Avatar profile ID
   * @returns Promise<AvatarProfile | null> - Avatar profile or null if not found
   */
  static async getAvatarProfile(profileId: string): Promise<AvatarProfile | null> {
    try {
      Logger.info('AvatarStorageService: Getting avatar profile', { profileId });

      const profiles = await this.getAllAvatarProfiles();
      const profile = profiles.find(p => p.id === profileId);

      if (!profile) {
        Logger.info('AvatarStorageService: Avatar profile not found', { profileId });
        return null;
      }

      return profile;
    } catch (error) {
      Logger.error('AvatarStorageService: Error getting avatar profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get avatar profile'
      );
    }
  }

  /**
   * Delete avatar profile and associated photo
   * 
   * @param profileId - Avatar profile ID
   * @returns Promise<void>
   */
  static async deleteAvatarProfile(profileId: string): Promise<void> {
    try {
      Logger.info('AvatarStorageService: Deleting avatar profile', { profileId });

      // Delete photo
      await this.deleteAvatarPhoto(profileId, `photo_${profileId}`);

      // Get existing profiles
      const profiles = await this.getAllAvatarProfiles();

      // Remove profile
      const updatedProfiles = profiles.filter(p => p.id !== profileId);

      // Save updated profiles
      await AsyncStorage.setItem(
        STORAGE_KEYS.AVATAR_PROFILES,
        JSON.stringify(updatedProfiles)
      );

      Logger.info('AvatarStorageService: Avatar profile deleted successfully');
    } catch (error) {
      Logger.error('AvatarStorageService: Error deleting avatar profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete avatar profile'
      );
    }
  }

  /**
   * Get storage usage for avatar photos
   * 
   * @returns Promise<{ totalSize: number; photoCount: number }> - Storage usage info
   */
  static async getStorageUsage(): Promise<{ totalSize: number; photoCount: number }> {
    try {
      Logger.info('AvatarStorageService: Calculating storage usage');

      const dirExists = await RNFS.exists(this.AVATAR_PHOTOS_DIR);
      if (!dirExists) {
        return { totalSize: 0, photoCount: 0 };
      }

      const files = await RNFS.readDir(this.AVATAR_PHOTOS_DIR);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      Logger.info('AvatarStorageService: Storage usage calculated', {
        totalSize,
        photoCount: files.length,
      });

      return {
        totalSize,
        photoCount: files.length,
      };
    } catch (error) {
      Logger.error('AvatarStorageService: Error calculating storage usage', error);
      return { totalSize: 0, photoCount: 0 };
    }
  }

  /**
   * Format file size for display
   * 
   * @param bytes - File size in bytes
   * @returns string - Formatted file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Delete all avatar profiles and photos
   * 
   * @returns Promise<void>
   */
  static async deleteAllProfiles(): Promise<void> {
    try {
      Logger.info('AvatarStorageService: Deleting all avatar profiles');

      // Delete all photos
      const dirExists = await RNFS.exists(this.AVATAR_PHOTOS_DIR);
      if (dirExists) {
        await RNFS.unlink(this.AVATAR_PHOTOS_DIR);
        await RNFS.mkdir(this.AVATAR_PHOTOS_DIR);
      }

      // Clear profiles from AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.AVATAR_PROFILES);

      Logger.info('AvatarStorageService: All avatar profiles deleted successfully');
    } catch (error) {
      Logger.error('AvatarStorageService: Error deleting all profiles', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete all avatar profiles'
      );
    }
  }
}

