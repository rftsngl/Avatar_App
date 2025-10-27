/**
 * Video Storage Service
 * 
 * Manages video files and metadata on the device.
 * Handles downloading videos from URLs, saving to local storage,
 * and managing video metadata in AsyncStorage.
 */

import RNFS from 'react-native-fs';
import { AsyncStorageService } from '../storage/AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { VideoMetadata, VideoFile, StorageKeys, PlatformType, VideoStatus } from '../../types';

export class VideoStorageService {
  private static readonly VIDEO_DIRECTORY = `${RNFS.DocumentDirectoryPath}/videos`;
  private static readonly DOWNLOAD_TIMEOUT = 120000; // 2 minutes

  /**
   * Initialize video storage directory
   */
  static async initialize(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.VIDEO_DIRECTORY);
      
      if (!exists) {
        await RNFS.mkdir(this.VIDEO_DIRECTORY);
        Logger.info('VideoStorageService: Video directory created', { path: this.VIDEO_DIRECTORY });
      }
    } catch (error) {
      Logger.error('VideoStorageService: Failed to initialize video directory', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to initialize video storage'
      );
    }
  }

  /**
   * Generate unique video ID
   */
  static generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Download video from URL to local storage
   */
  static async downloadVideo(url: string, videoId: string): Promise<string> {
    try {
      await this.initialize();

      const fileExtension = url.includes('.mp4') ? 'mp4' : 'mov';
      const localPath = `${this.VIDEO_DIRECTORY}/${videoId}.${fileExtension}`;

      Logger.info('VideoStorageService: Downloading video', { url, localPath });

      // Download file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: localPath,
        connectionTimeout: this.DOWNLOAD_TIMEOUT,
        readTimeout: this.DOWNLOAD_TIMEOUT,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw ErrorHandler.createError(
          ErrorCode.NETWORK_ERROR,
          `Failed to download video: HTTP ${downloadResult.statusCode}`
        );
      }

      // Verify file exists
      const exists = await RNFS.exists(localPath);
      if (!exists) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Video file not found after download'
        );
      }

      // Get file size
      const stat = await RNFS.stat(localPath);
      Logger.info('VideoStorageService: Video downloaded successfully', {
        localPath,
        size: stat.size,
      });

      return localPath;
    } catch (error) {
      Logger.error('VideoStorageService: Failed to download video', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to download video to device'
      );
    }
  }

  /**
   * Save video metadata to AsyncStorage
   */
  static async saveVideoMetadata(metadata: VideoMetadata): Promise<void> {
    try {
      // Get existing videos
      const videos = await this.getAllVideos();

      // Add new video
      videos.push(metadata);

      // Save to storage
      await AsyncStorageService.setItem(StorageKeys.VIDEO_METADATA, videos);

      Logger.info('VideoStorageService: Video metadata saved', { videoId: metadata.id });
    } catch (error) {
      Logger.error('VideoStorageService: Failed to save video metadata', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save video metadata'
      );
    }
  }

  /**
   * Update video metadata
   */
  static async updateVideoMetadata(videoId: string, updates: Partial<VideoMetadata>): Promise<void> {
    try {
      const videos = await this.getAllVideos();
      const index = videos.findIndex((v) => v.id === videoId);

      if (index === -1) {
        throw ErrorHandler.createError(
          ErrorCode.NOT_FOUND,
          'Video not found'
        );
      }

      // Update metadata
      videos[index] = { ...videos[index], ...updates };

      // Save to storage
      await AsyncStorageService.setItem(StorageKeys.VIDEO_METADATA, videos);

      Logger.info('VideoStorageService: Video metadata updated', { videoId, updates });
    } catch (error) {
      Logger.error('VideoStorageService: Failed to update video metadata', error);
      throw error;
    }
  }

  /**
   * Get all videos from AsyncStorage
   */
  static async getAllVideos(): Promise<VideoMetadata[]> {
    try {
      Logger.info('VideoStorageService: Getting all videos from storage');
      const videos = await AsyncStorageService.getItem<VideoMetadata[]>(StorageKeys.VIDEO_METADATA);
      
      Logger.info('VideoStorageService: Retrieved videos', {
        found: !!videos,
        count: videos?.length || 0,
        data: videos,
      });
      
      return videos || [];
    } catch (error) {
      Logger.error('VideoStorageService: Failed to get videos', error);
      return [];
    }
  }

  /**
   * Get video by ID
   */
  static async getVideoById(videoId: string): Promise<VideoMetadata | null> {
    try {
      const videos = await this.getAllVideos();
      return videos.find((v) => v.id === videoId) || null;
    } catch (error) {
      Logger.error('VideoStorageService: Failed to get video by ID', error);
      return null;
    }
  }

  /**
   * Get video file path
   */
  static getVideoFilePath(videoId: string, extension: string = 'mp4'): string {
    return `${this.VIDEO_DIRECTORY}/${videoId}.${extension}`;
  }

  /**
   * Check if video file exists
   */
  static async videoFileExists(videoId: string): Promise<boolean> {
    try {
      const mp4Path = this.getVideoFilePath(videoId, 'mp4');
      const movPath = this.getVideoFilePath(videoId, 'mov');

      const mp4Exists = await RNFS.exists(mp4Path);
      if (mp4Exists) return true;

      const movExists = await RNFS.exists(movPath);
      return movExists;
    } catch (error) {
      Logger.error('VideoStorageService: Failed to check video file existence', error);
      return false;
    }
  }

  /**
   * Delete video file and metadata
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      // Delete file
      const mp4Path = this.getVideoFilePath(videoId, 'mp4');
      const movPath = this.getVideoFilePath(videoId, 'mov');

      const mp4Exists = await RNFS.exists(mp4Path);
      if (mp4Exists) {
        await RNFS.unlink(mp4Path);
        Logger.info('VideoStorageService: Video file deleted', { path: mp4Path });
      }

      const movExists = await RNFS.exists(movPath);
      if (movExists) {
        await RNFS.unlink(movPath);
        Logger.info('VideoStorageService: Video file deleted', { path: movPath });
      }

      // Delete metadata
      const videos = await this.getAllVideos();
      const filteredVideos = videos.filter((v) => v.id !== videoId);
      await AsyncStorageService.setItem(StorageKeys.VIDEO_METADATA, filteredVideos);

      Logger.info('VideoStorageService: Video deleted', { videoId });
    } catch (error) {
      Logger.error('VideoStorageService: Failed to delete video', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete video'
      );
    }
  }

  /**
   * Delete all videos
   */
  static async deleteAllVideos(): Promise<void> {
    try {
      // Delete directory
      const exists = await RNFS.exists(this.VIDEO_DIRECTORY);
      if (exists) {
        await RNFS.unlink(this.VIDEO_DIRECTORY);
        Logger.info('VideoStorageService: All video files deleted');
      }

      // Clear metadata
      await AsyncStorageService.removeItem(StorageKeys.VIDEO_METADATA);

      // Recreate directory
      await this.initialize();

      Logger.info('VideoStorageService: All videos deleted');
    } catch (error) {
      Logger.error('VideoStorageService: Failed to delete all videos', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete all videos'
      );
    }
  }

  /**
   * Get total storage used by videos
   */
  static async getTotalStorageUsed(): Promise<number> {
    try {
      const exists = await RNFS.exists(this.VIDEO_DIRECTORY);
      if (!exists) return 0;

      const files = await RNFS.readDir(this.VIDEO_DIRECTORY);
      let totalSize = 0;

      for (const file of files) {
        totalSize += file.size;
      }

      return totalSize;
    } catch (error) {
      Logger.error('VideoStorageService: Failed to get total storage used', error);
      return 0;
    }
  }

  /**
   * Create video file object
   */
  static createVideoFile(metadata: VideoMetadata, url: string, localPath?: string): VideoFile {
    return {
      id: metadata.id,
      url,
      localPath,
      metadata,
    };
  }
}

