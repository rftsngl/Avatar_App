/**
 * Permission Utilities
 * 
 * Handles runtime permission checking and requesting for iOS and Android.
 * Provides utilities for microphone, camera, and other permissions.
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { Logger } from './Logger';
import { ErrorHandler, ErrorCode } from './ErrorHandler';

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

/**
 * Permission result
 */
export interface PermissionResult {
  status: PermissionStatus;
  canRequest: boolean;
}

/**
 * Permission Utilities
 */
export class PermissionUtils {
  /**
   * Check if microphone permission is granted
   * 
   * @returns Promise<PermissionResult> - Permission status and whether we can request
   */
  static async checkMicrophonePermission(): Promise<PermissionResult> {
    try {
      Logger.info('PermissionUtils: Checking microphone permission');

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );

        if (granted) {
          Logger.info('PermissionUtils: Microphone permission already granted');
          return { status: 'granted', canRequest: false };
        } else {
          Logger.info('PermissionUtils: Microphone permission not granted');
          return { status: 'denied', canRequest: true };
        }
      } else if (Platform.OS === 'ios') {
        // iOS doesn't have a direct check API, we'll request and see the result
        // For now, assume we can request
        return { status: 'denied', canRequest: true };
      }

      return { status: 'unavailable', canRequest: false };
    } catch (error) {
      Logger.error('PermissionUtils: Error checking microphone permission', error);
      return { status: 'unavailable', canRequest: false };
    }
  }

  /**
   * Request microphone permission
   * 
   * @returns Promise<PermissionStatus> - Permission status after request
   */
  static async requestMicrophonePermission(): Promise<PermissionStatus> {
    try {
      Logger.info('PermissionUtils: Requesting microphone permission');

      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to convert your speech to text for video scripts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          Logger.info('PermissionUtils: Microphone permission granted');
          return 'granted';
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Logger.warn('PermissionUtils: Microphone permission blocked');
          return 'blocked';
        } else {
          Logger.warn('PermissionUtils: Microphone permission denied');
          return 'denied';
        }
      } else if (Platform.OS === 'ios') {
        // iOS permissions are requested automatically when using the microphone
        // The permission dialog will appear when Voice.start() is called
        Logger.info('PermissionUtils: iOS microphone permission will be requested on first use');
        return 'granted'; // Assume granted, actual check happens in Voice.start()
      }

      return 'unavailable';
    } catch (error) {
      Logger.error('PermissionUtils: Error requesting microphone permission', error);
      throw ErrorHandler.createError(
        ErrorCode.PERMISSION_DENIED,
        'Failed to request microphone permission'
      );
    }
  }

  /**
   * Check and request microphone permission if needed
   * 
   * @returns Promise<boolean> - True if permission granted, false otherwise
   */
  static async ensureMicrophonePermission(): Promise<boolean> {
    try {
      Logger.info('PermissionUtils: Ensuring microphone permission');

      // Check current permission status
      const checkResult = await this.checkMicrophonePermission();

      if (checkResult.status === 'granted') {
        return true;
      }

      if (checkResult.status === 'blocked') {
        // Permission is permanently blocked, show settings dialog
        this.showPermissionBlockedDialog();
        return false;
      }

      if (!checkResult.canRequest) {
        Logger.warn('PermissionUtils: Cannot request microphone permission');
        return false;
      }

      // Request permission
      const requestResult = await this.requestMicrophonePermission();

      if (requestResult === 'granted') {
        return true;
      }

      if (requestResult === 'blocked') {
        this.showPermissionBlockedDialog();
        return false;
      }

      return false;
    } catch (error) {
      Logger.error('PermissionUtils: Error ensuring microphone permission', error);
      return false;
    }
  }

  /**
   * Show dialog when permission is permanently blocked
   */
  static showPermissionBlockedDialog(): void {
    Alert.alert(
      'Microphone Permission Required',
      'Microphone access is required to use speech-to-text. Please enable it in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]
    );
  }

  /**
   * Show dialog when permission is denied
   */
  static showPermissionDeniedDialog(): void {
    Alert.alert(
      'Microphone Permission Denied',
      'Microphone access is required to use speech-to-text. Please grant permission to continue.',
      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  }

  /**
   * Check if camera permission is granted (for future use)
   * 
   * @returns Promise<PermissionResult> - Permission status and whether we can request
   */
  static async checkCameraPermission(): Promise<PermissionResult> {
    try {
      Logger.info('PermissionUtils: Checking camera permission');

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );

        if (granted) {
          Logger.info('PermissionUtils: Camera permission already granted');
          return { status: 'granted', canRequest: false };
        } else {
          Logger.info('PermissionUtils: Camera permission not granted');
          return { status: 'denied', canRequest: true };
        }
      } else if (Platform.OS === 'ios') {
        // iOS doesn't have a direct check API
        return { status: 'denied', canRequest: true };
      }

      return { status: 'unavailable', canRequest: false };
    } catch (error) {
      Logger.error('PermissionUtils: Error checking camera permission', error);
      return { status: 'unavailable', canRequest: false };
    }
  }

  /**
   * Request camera permission (for future use)
   * 
   * @returns Promise<PermissionStatus> - Permission status after request
   */
  static async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      Logger.info('PermissionUtils: Requesting camera permission');

      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to capture photos for custom avatars.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          Logger.info('PermissionUtils: Camera permission granted');
          return 'granted';
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Logger.warn('PermissionUtils: Camera permission blocked');
          return 'blocked';
        } else {
          Logger.warn('PermissionUtils: Camera permission denied');
          return 'denied';
        }
      } else if (Platform.OS === 'ios') {
        // iOS permissions are requested automatically when using the camera
        Logger.info('PermissionUtils: iOS camera permission will be requested on first use');
        return 'granted';
      }

      return 'unavailable';
    } catch (error) {
      Logger.error('PermissionUtils: Error requesting camera permission', error);
      throw ErrorHandler.createError(
        ErrorCode.PERMISSION_DENIED,
        'Failed to request camera permission'
      );
    }
  }

  /**
   * Check if photo library permission is granted
   *
   * @returns Promise<PermissionResult> - Permission status and whether we can request
   */
  static async checkPhotoLibraryPermission(): Promise<PermissionResult> {
    try {
      Logger.info('PermissionUtils: Checking photo library permission');

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );

        if (granted) {
          Logger.info('PermissionUtils: Photo library permission already granted');
          return { status: 'granted', canRequest: false };
        } else {
          Logger.info('PermissionUtils: Photo library permission not granted');
          return { status: 'denied', canRequest: true };
        }
      } else if (Platform.OS === 'ios') {
        // iOS permissions are requested automatically by react-native-image-picker
        Logger.info('PermissionUtils: iOS photo library permission will be requested on first use');
        return { status: 'granted', canRequest: false };
      }

      return { status: 'unavailable', canRequest: false };
    } catch (error) {
      Logger.error('PermissionUtils: Error checking photo library permission', error);
      throw ErrorHandler.createError(
        ErrorCode.PERMISSION_DENIED,
        'Failed to check photo library permission'
      );
    }
  }

  /**
   * Request photo library permission
   *
   * @returns Promise<PermissionStatus> - Permission status after request
   */
  static async requestPhotoLibraryPermission(): Promise<PermissionStatus> {
    try {
      Logger.info('PermissionUtils: Requesting photo library permission');

      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Photo Library Permission',
            message: 'This app needs access to your photo library to select photos for creating custom avatars.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          Logger.info('PermissionUtils: Photo library permission granted');
          return 'granted';
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Logger.warn('PermissionUtils: Photo library permission blocked');
          return 'blocked';
        } else {
          Logger.warn('PermissionUtils: Photo library permission denied');
          return 'denied';
        }
      } else if (Platform.OS === 'ios') {
        // iOS permissions are requested automatically by react-native-image-picker
        Logger.info('PermissionUtils: iOS photo library permission will be requested on first use');
        return 'granted';
      }

      return 'unavailable';
    } catch (error) {
      Logger.error('PermissionUtils: Error requesting photo library permission', error);
      throw ErrorHandler.createError(
        ErrorCode.PERMISSION_DENIED,
        'Failed to request photo library permission'
      );
    }
  }

  /**
   * Handle permission denial with user-friendly dialog
   *
   * @param permissionType - Type of permission (e.g., 'Camera', 'Photo Library')
   * @param status - Permission status
   */
  static handlePhotoPermissionDenial(permissionType: string, status: PermissionStatus): void {
    if (status === 'blocked') {
      Alert.alert(
        `${permissionType} Permission Required`,
        `${permissionType} access has been blocked. Please enable it in your device settings to use this feature.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ]
      );
    } else if (status === 'denied') {
      Alert.alert(
        `${permissionType} Permission Required`,
        `This app needs ${permissionType.toLowerCase()} access to create custom avatars. Please grant permission to continue.`,
        [{ text: 'OK' }]
      );
    }
  }
}

