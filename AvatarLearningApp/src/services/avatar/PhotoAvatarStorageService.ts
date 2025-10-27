/**
 * Photo Avatar Storage Service
 * 
 * Manages local storage of HeyGen Photo Avatar profiles.
 * Stores generation status, parameters, and metadata.
 */

import { PhotoAvatarProfile } from '../../types';
import { AsyncStorageService } from '../storage/AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Storage key for photo avatar profiles
 */
const STORAGE_KEY = 'photo_avatar_profiles';

/**
 * Photo Avatar Storage Service
 */
export class PhotoAvatarStorageService {
  /**
   * Save photo avatar profile
   * @param profile Photo avatar profile to save
   */
  static async saveProfile(profile: PhotoAvatarProfile): Promise<void> {
    Logger.info('PhotoAvatarStorageService: Saving profile', { 
      id: profile.id, 
      name: profile.name,
      status: profile.status,
    });

    try {
      const profiles = await this.getAllProfiles();
      
      // Check if profile already exists
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      
      if (existingIndex >= 0) {
        // Update existing profile
        profiles[existingIndex] = {
          ...profiles[existingIndex],
          ...profile,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new profile
        profiles.push(profile);
      }

      await AsyncStorageService.setItem<PhotoAvatarProfile[]>(STORAGE_KEY, profiles);
      
      Logger.info('PhotoAvatarStorageService: Profile saved successfully', { id: profile.id });
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to save profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save photo avatar profile'
      );
    }
  }

  /**
   * Get profile by ID
   * @param profileId Profile ID
   * @returns Photo avatar profile or null if not found
   */
  static async getProfile(profileId: string): Promise<PhotoAvatarProfile | null> {
    Logger.info('PhotoAvatarStorageService: Getting profile', { profileId });

    try {
      const profiles = await this.getAllProfiles();
      const profile = profiles.find(p => p.id === profileId);

      if (profile) {
        Logger.info('PhotoAvatarStorageService: Profile found', { profileId });
      } else {
        Logger.warn('PhotoAvatarStorageService: Profile not found', { profileId });
      }

      return profile || null;
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to get profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get photo avatar profile'
      );
    }
  }

  /**
   * Get all profiles
   * @returns Array of all photo avatar profiles
   */
  static async getAllProfiles(): Promise<PhotoAvatarProfile[]> {
    Logger.info('PhotoAvatarStorageService: Getting all profiles');

    try {
      const profiles = await AsyncStorageService.getItem<PhotoAvatarProfile[]>(STORAGE_KEY);
      
      Logger.info('PhotoAvatarStorageService: Retrieved profiles', { 
        count: profiles?.length || 0,
      });

      return profiles || [];
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to get all profiles', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get photo avatar profiles'
      );
    }
  }

  /**
   * Update profile
   * @param profileId Profile ID to update
   * @param updates Partial profile updates
   */
  static async updateProfile(
    profileId: string,
    updates: Partial<PhotoAvatarProfile>
  ): Promise<void> {
    Logger.info('PhotoAvatarStorageService: Updating profile', { 
      profileId,
      updates: Object.keys(updates),
    });

    try {
      const profiles = await this.getAllProfiles();
      const index = profiles.findIndex(p => p.id === profileId);

      if (index === -1) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Photo avatar profile not found'
        );
      }

      profiles[index] = {
        ...profiles[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorageService.setItem<PhotoAvatarProfile[]>(STORAGE_KEY, profiles);
      
      Logger.info('PhotoAvatarStorageService: Profile updated successfully', { profileId });
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to update profile', error);
      throw error;
    }
  }

  /**
   * Delete profile
   * @param profileId Profile ID to delete
   */
  static async deleteProfile(profileId: string): Promise<void> {
    Logger.info('PhotoAvatarStorageService: Deleting profile', { profileId });

    try {
      const profiles = await this.getAllProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== profileId);

      if (profiles.length === filteredProfiles.length) {
        Logger.warn('PhotoAvatarStorageService: Profile not found for deletion', { profileId });
        return;
      }

      await AsyncStorageService.setItem<PhotoAvatarProfile[]>(STORAGE_KEY, filteredProfiles);
      
      Logger.info('PhotoAvatarStorageService: Profile deleted successfully', { profileId });
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to delete profile', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete photo avatar profile'
      );
    }
  }

  /**
   * Get profiles by status
   * @param status Profile status to filter by
   * @returns Array of profiles with matching status
   */
  static async getProfilesByStatus(
    status: PhotoAvatarProfile['status']
  ): Promise<PhotoAvatarProfile[]> {
    Logger.info('PhotoAvatarStorageService: Getting profiles by status', { status });

    try {
      const profiles = await this.getAllProfiles();
      const filteredProfiles = profiles.filter(p => p.status === status);

      Logger.info('PhotoAvatarStorageService: Filtered profiles by status', { 
        status,
        count: filteredProfiles.length,
      });

      return filteredProfiles;
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to get profiles by status', error);
      throw error;
    }
  }

  /**
   * Clear all profiles (for testing/debugging)
   */
  static async clearAllProfiles(): Promise<void> {
    Logger.warn('PhotoAvatarStorageService: Clearing all profiles');

    try {
      await AsyncStorageService.removeItem(STORAGE_KEY);
      Logger.info('PhotoAvatarStorageService: All profiles cleared');
    } catch (error) {
      Logger.error('PhotoAvatarStorageService: Failed to clear profiles', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to clear photo avatar profiles'
      );
    }
  }
}
