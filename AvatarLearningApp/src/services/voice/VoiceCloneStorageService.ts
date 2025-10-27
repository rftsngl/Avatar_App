/**
 * Voice Clone Storage Service
 * 
 * ============================================================================
 * DEACTIVATED: D-ID Voice Cloning Removed (2025-10-27)
 * ============================================================================
 * This service is no longer used as voice cloning was a D-ID-only feature.
 * HeyGen does not support user voice cloning (only Brand Voice API for
 * enterprise customers).
 * 
 * Code is kept for reference but should NOT be called.
 * ============================================================================
 * 
 * Handles local storage of voice samples and voice profile metadata.
 * Voice samples are stored in the file system, metadata in AsyncStorage.
 */

import RNFS from 'react-native-fs';
import { VoiceSample, VoiceProfile, PlatformType } from '../../types';
import { AsyncStorageService } from '../storage/AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Storage keys for AsyncStorage
 */
const STORAGE_KEYS = {
  VOICE_PROFILES: 'voice_profiles',
  VOICE_SAMPLES_PREFIX: 'voice_samples_',
  CONSENT_STATUS: 'voice_clone_consent',
};

/**
 * Directory paths for voice samples
 */
const VOICE_SAMPLES_DIR = `${RNFS.DocumentDirectoryPath}/voice_samples`;

/**
 * Voice Clone Storage Service
 */
export class VoiceCloneStorageService {
  /**
   * Initialize storage directories
   */
  static async initialize(): Promise<void> {
    try {
      // Create voice samples directory if it doesn't exist
      const dirExists = await RNFS.exists(VOICE_SAMPLES_DIR);
      if (!dirExists) {
        await RNFS.mkdir(VOICE_SAMPLES_DIR);
        Logger.info('VoiceCloneStorageService: Created voice samples directory');
      }
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to initialize', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, (error as Error).message);
    }
  }

  /**
   * Save a voice sample to file system
   */
  static async saveVoiceSample(
    profileId: string,
    sampleNumber: number,
    audioFilePath: string,
    duration: number
  ): Promise<VoiceSample> {
    try {
      await this.initialize();

      // Generate unique ID for sample
      const sampleId = `${profileId}_sample_${sampleNumber}_${Date.now()}`;
      const fileName = `${sampleId}.m4a`;
      const destinationPath = `${VOICE_SAMPLES_DIR}/${fileName}`;

      // Copy audio file to voice samples directory
      await RNFS.copyFile(audioFilePath, destinationPath);

      // Get file size
      const fileInfo = await RNFS.stat(destinationPath);

      const sample: VoiceSample = {
        id: sampleId,
        profileId,
        filePath: destinationPath,
        fileName,
        duration,
        fileSize: fileInfo.size,
        createdAt: new Date().toISOString(),
        sampleNumber,
      };

      // Save sample metadata
      await this.saveSampleMetadata(profileId, sample);

      Logger.info('VoiceCloneStorageService: Voice sample saved', {
        sampleId,
        profileId,
        duration,
        fileSize: fileInfo.size,
      });

      return sample;
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to save voice sample', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, 'Failed to save voice sample');
    }
  }

  /**
   * Save sample metadata to AsyncStorage
   */
  private static async saveSampleMetadata(profileId: string, sample: VoiceSample): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.VOICE_SAMPLES_PREFIX}${profileId}`;
      const samples = await AsyncStorageService.getItem<VoiceSample[]>(key) || [];
      samples.push(sample);
      await AsyncStorageService.setItem(key, samples);
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to save sample metadata', error);
      throw error;
    }
  }

  /**
   * Get all voice samples for a profile
   */
  static async getVoiceSamples(profileId: string): Promise<VoiceSample[]> {
    try {
      const key = `${STORAGE_KEYS.VOICE_SAMPLES_PREFIX}${profileId}`;
      const samples = await AsyncStorageService.getItem<VoiceSample[]>(key) || [];
      return samples;
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to get voice samples', error);
      return [];
    }
  }

  /**
   * Delete a voice sample
   */
  static async deleteVoiceSample(profileId: string, sampleId: string): Promise<void> {
    try {
      // Get all samples for profile
      const samples = await this.getVoiceSamples(profileId);
      const sample = samples.find(s => s.id === sampleId);

      if (!sample) {
        Logger.warn('VoiceCloneStorageService: Sample not found', { sampleId });
        return;
      }

      // Delete file from file system
      const fileExists = await RNFS.exists(sample.filePath);
      if (fileExists) {
        await RNFS.unlink(sample.filePath);
      }

      // Remove from metadata
      const updatedSamples = samples.filter(s => s.id !== sampleId);
      const key = `${STORAGE_KEYS.VOICE_SAMPLES_PREFIX}${profileId}`;
      await AsyncStorageService.setItem(key, updatedSamples);

      Logger.info('VoiceCloneStorageService: Voice sample deleted', { sampleId });
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to delete voice sample', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, 'Failed to delete voice sample');
    }
  }

  /**
   * Save voice profile metadata
   */
  static async saveVoiceProfile(profile: VoiceProfile): Promise<void> {
    try {
      const profiles = await this.getAllVoiceProfiles();
      const existingIndex = profiles.findIndex(p => p.id === profile.id);

      if (existingIndex >= 0) {
        // Update existing profile
        profiles[existingIndex] = {
          ...profile,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new profile
        profiles.push(profile);
      }

      await AsyncStorageService.setItem(STORAGE_KEYS.VOICE_PROFILES, profiles);
      Logger.info('VoiceCloneStorageService: Voice profile saved', { profileId: profile.id });
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to save voice profile', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, 'Failed to save voice profile');
    }
  }

  /**
   * Get all voice profiles
   */
  static async getAllVoiceProfiles(): Promise<VoiceProfile[]> {
    try {
      const profiles = await AsyncStorageService.getItem<VoiceProfile[]>(STORAGE_KEYS.VOICE_PROFILES) || [];
      return profiles;
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to get voice profiles', error);
      return [];
    }
  }

  /**
   * Get a specific voice profile by ID
   */
  static async getVoiceProfile(profileId: string): Promise<VoiceProfile | null> {
    try {
      const profiles = await this.getAllVoiceProfiles();
      return profiles.find(p => p.id === profileId) || null;
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to get voice profile', error);
      return null;
    }
  }

  /**
   * Delete voice profile and all associated samples
   */
  static async deleteVoiceProfile(profileId: string): Promise<void> {
    try {
      // Get all samples for profile
      const samples = await this.getVoiceSamples(profileId);

      // Delete all sample files
      for (const sample of samples) {
        const fileExists = await RNFS.exists(sample.filePath);
        if (fileExists) {
          await RNFS.unlink(sample.filePath);
        }
      }

      // Delete sample metadata
      const sampleKey = `${STORAGE_KEYS.VOICE_SAMPLES_PREFIX}${profileId}`;
      await AsyncStorageService.removeItem(sampleKey);

      // Delete profile metadata
      const profiles = await this.getAllVoiceProfiles();
      const updatedProfiles = profiles.filter(p => p.id !== profileId);
      await AsyncStorageService.setItem(STORAGE_KEYS.VOICE_PROFILES, updatedProfiles);

      Logger.info('VoiceCloneStorageService: Voice profile deleted', { profileId });
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to delete voice profile', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, 'Failed to delete voice profile');
    }
  }

  /**
   * Get storage usage for voice samples
   */
  static async getStorageUsage(): Promise<{ totalSize: number; sampleCount: number }> {
    try {
      await this.initialize();

      const dirExists = await RNFS.exists(VOICE_SAMPLES_DIR);
      if (!dirExists) {
        return { totalSize: 0, sampleCount: 0 };
      }

      const files = await RNFS.readDir(VOICE_SAMPLES_DIR);
      let totalSize = 0;
      let sampleCount = 0;

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.m4a')) {
          totalSize += file.size;
          sampleCount++;
        }
      }

      Logger.info('VoiceCloneStorageService: Storage usage calculated', {
        totalSize,
        sampleCount,
      });

      return { totalSize, sampleCount };
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to get storage usage', error);
      return { totalSize: 0, sampleCount: 0 };
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Delete all voice profiles and samples
   */
  static async deleteAllProfiles(): Promise<void> {
    try {
      const profiles = await this.getAllVoiceProfiles();

      // Delete each profile (which deletes its samples)
      for (const profile of profiles) {
        await this.deleteVoiceProfile(profile.id);
      }

      Logger.info('VoiceCloneStorageService: All voice profiles deleted');
    } catch (error) {
      Logger.error('VoiceCloneStorageService: Failed to delete all profiles', error);
      throw ErrorHandler.createError(ErrorCode.STORAGE_ERROR, 'Failed to delete all profiles');
    }
  }
}

