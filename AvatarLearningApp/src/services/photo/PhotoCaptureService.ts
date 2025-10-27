/**
 * Photo Capture Service
 * 
 * Handles photo capture and selection for custom avatar creation.
 * Supports taking photos with camera and selecting from photo library.
 */

import { Platform } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { PermissionUtils } from '../../utils/permissionUtils';

/**
 * Photo capture options
 */
export interface PhotoCaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  includeBase64?: boolean;
}

/**
 * Photo result
 */
export interface PhotoResult {
  uri: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  type: string;
  base64?: string;
}

/**
 * Photo Capture Service
 */
export class PhotoCaptureService {
  private static readonly DEFAULT_MAX_WIDTH = 1920;
  private static readonly DEFAULT_MAX_HEIGHT = 1920;
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Take a photo using the device camera
   * 
   * @param options - Photo capture options
   * @returns Promise<PhotoResult | null> - Photo result or null if cancelled
   */
  static async takePhoto(options: PhotoCaptureOptions = {}): Promise<PhotoResult | null> {
    try {
      Logger.info('PhotoCaptureService: Taking photo with camera');

      // Check camera permission
      const permissionResult = await PermissionUtils.checkCameraPermission();
      
      if (permissionResult.status !== 'granted') {
        if (permissionResult.canRequest) {
          const status = await PermissionUtils.requestCameraPermission();
          if (status !== 'granted') {
            PermissionUtils.handlePhotoPermissionDenial('camera', status);
            return null;
          }
        } else {
          PermissionUtils.handlePhotoPermissionDenial('camera', permissionResult.status);
          return null;
        }
      }

      // Launch camera
      const response: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        maxWidth: options.maxWidth || this.DEFAULT_MAX_WIDTH,
        maxHeight: options.maxHeight || this.DEFAULT_MAX_HEIGHT,
        quality: (options.quality || this.DEFAULT_QUALITY) as 0 | 1 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9,
        includeBase64: options.includeBase64 || false,
        saveToPhotos: false,
        cameraType: 'front',
      });

      return this.processImagePickerResponse(response);
    } catch (error) {
      Logger.error('PhotoCaptureService: Error taking photo', error);
      throw ErrorHandler.createError(
        ErrorCode.MEDIA_ERROR,
        'Failed to take photo'
      );
    }
  }

  /**
   * Select a photo from the device photo library
   * 
   * @param options - Photo capture options
   * @returns Promise<PhotoResult | null> - Photo result or null if cancelled
   */
  static async selectPhoto(options: PhotoCaptureOptions = {}): Promise<PhotoResult | null> {
    try {
      Logger.info('PhotoCaptureService: Selecting photo from library');

      // Check photo library permission
      const permissionResult = await PermissionUtils.checkPhotoLibraryPermission();
      
      if (permissionResult.status !== 'granted') {
        if (permissionResult.canRequest) {
          const status = await PermissionUtils.requestPhotoLibraryPermission();
          if (status !== 'granted') {
            PermissionUtils.handlePhotoPermissionDenial('Photo Library', status);
            return null;
          }
        } else {
          PermissionUtils.handlePhotoPermissionDenial('Photo Library', permissionResult.status);
          return null;
        }
      }

      // Launch image library
      const response: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: options.maxWidth || this.DEFAULT_MAX_WIDTH,
        maxHeight: options.maxHeight || this.DEFAULT_MAX_HEIGHT,
        quality: (options.quality || this.DEFAULT_QUALITY) as 0 | 1 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9,
        includeBase64: options.includeBase64 || false,
        selectionLimit: 1,
      });

      return this.processImagePickerResponse(response);
    } catch (error) {
      Logger.error('PhotoCaptureService: Error selecting photo', error);
      throw ErrorHandler.createError(
        ErrorCode.MEDIA_ERROR,
        'Failed to select photo'
      );
    }
  }

  /**
   * Process image picker response
   * 
   * @param response - Image picker response
   * @returns PhotoResult | null - Processed photo result or null if cancelled
   */
  private static processImagePickerResponse(response: ImagePickerResponse): PhotoResult | null {
    // User cancelled
    if (response.didCancel) {
      Logger.info('PhotoCaptureService: User cancelled photo selection');
      return null;
    }

    // Error occurred
    if (response.errorCode) {
      Logger.error('PhotoCaptureService: Image picker error', {
        code: response.errorCode,
        message: response.errorMessage,
      });
      throw ErrorHandler.createError(
        ErrorCode.MEDIA_ERROR,
        response.errorMessage || 'Failed to capture photo'
      );
    }

    // No assets
    if (!response.assets || response.assets.length === 0) {
      Logger.warn('PhotoCaptureService: No photo selected');
      return null;
    }

    const asset: Asset = response.assets[0];

    // Validate asset
    if (!asset.uri) {
      throw ErrorHandler.createError(
        ErrorCode.MEDIA_ERROR,
        'Invalid photo: missing URI'
      );
    }

    // Check file size
    if (asset.fileSize && asset.fileSize > this.MAX_FILE_SIZE) {
      throw ErrorHandler.createError(
        ErrorCode.VALIDATION_ERROR,
        `Photo is too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    Logger.info('PhotoCaptureService: Photo captured successfully', {
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
    });

    return {
      uri: asset.uri,
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize || 0,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.type || 'image/jpeg',
      base64: asset.base64,
    };
  }

  /**
   * Validate photo dimensions and quality
   * 
   * @param photo - Photo result to validate
   * @returns boolean - True if photo is valid
   */
  static validatePhoto(photo: PhotoResult): { isValid: boolean; error?: string } {
    // Check minimum dimensions
    const MIN_WIDTH = 512;
    const MIN_HEIGHT = 512;

    if (photo.width < MIN_WIDTH || photo.height < MIN_HEIGHT) {
      return {
        isValid: false,
        error: `Photo is too small. Minimum size is ${MIN_WIDTH}x${MIN_HEIGHT} pixels.`,
      };
    }

    // Check file size
    if (photo.fileSize > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Photo is too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(photo.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Invalid photo format. Please use JPEG or PNG.',
      };
    }

    return { isValid: true };
  }

  /**
   * Copy photo to app's document directory
   * 
   * @param sourceUri - Source photo URI
   * @param fileName - Destination file name
   * @returns Promise<string> - Destination file path
   */
  static async copyPhotoToDocuments(sourceUri: string, fileName: string): Promise<string> {
    try {
      Logger.info('PhotoCaptureService: Copying photo to documents', { sourceUri, fileName });

      // Create avatars directory if it doesn't exist
      const avatarsDir = `${RNFS.DocumentDirectoryPath}/avatar_photos`;
      const dirExists = await RNFS.exists(avatarsDir);
      
      if (!dirExists) {
        await RNFS.mkdir(avatarsDir);
        Logger.info('PhotoCaptureService: Created avatar_photos directory');
      }

      // Destination path
      const destPath = `${avatarsDir}/${fileName}`;

      // Copy file
      const normalizedSourceUri = Platform.OS === 'android' && !sourceUri.startsWith('file://')
        ? `file://${sourceUri}`
        : sourceUri;

      await RNFS.copyFile(normalizedSourceUri, destPath);

      Logger.info('PhotoCaptureService: Photo copied successfully', { destPath });

      return destPath;
    } catch (error) {
      Logger.error('PhotoCaptureService: Error copying photo', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save photo'
      );
    }
  }

  /**
   * Delete photo from app's document directory
   * 
   * @param filePath - File path to delete
   * @returns Promise<void>
   */
  static async deletePhoto(filePath: string): Promise<void> {
    try {
      Logger.info('PhotoCaptureService: Deleting photo', { filePath });

      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        Logger.info('PhotoCaptureService: Photo deleted successfully');
      } else {
        Logger.warn('PhotoCaptureService: Photo file does not exist', { filePath });
      }
    } catch (error) {
      Logger.error('PhotoCaptureService: Error deleting photo', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete photo'
      );
    }
  }
}

