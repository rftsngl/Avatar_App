/**
 * Haptic Feedback Utilities
 * 
 * Provides haptic feedback for user interactions
 */

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';
import { Logger } from './Logger';

/**
 * Haptic feedback options
 */
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Haptic Feedback Types
 */
export enum HapticFeedbackType {
  LIGHT = 'impactLight',
  MEDIUM = 'impactMedium',
  HEAVY = 'impactHeavy',
  SUCCESS = 'notificationSuccess',
  WARNING = 'notificationWarning',
  ERROR = 'notificationError',
  SELECTION = 'selection',
}

/**
 * Haptic Utilities
 */
export class HapticUtils {
  /**
   * Trigger haptic feedback
   * 
   * @param type - Haptic feedback type
   */
  static trigger(type: HapticFeedbackType = HapticFeedbackType.LIGHT): void {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        ReactNativeHapticFeedback.trigger(type, hapticOptions);
      }
    } catch (error) {
      Logger.error('HapticUtils: Error triggering haptic feedback', error);
    }
  }

  /**
   * Light impact feedback
   * Use for: Button taps, list item selection
   */
  static light(): void {
    this.trigger(HapticFeedbackType.LIGHT);
  }

  /**
   * Medium impact feedback
   * Use for: Toggle switches, important button taps
   */
  static medium(): void {
    this.trigger(HapticFeedbackType.MEDIUM);
  }

  /**
   * Heavy impact feedback
   * Use for: Destructive actions, important confirmations
   */
  static heavy(): void {
    this.trigger(HapticFeedbackType.HEAVY);
  }

  /**
   * Success notification feedback
   * Use for: Successful operations, confirmations
   */
  static success(): void {
    this.trigger(HapticFeedbackType.SUCCESS);
  }

  /**
   * Warning notification feedback
   * Use for: Warning messages, caution actions
   */
  static warning(): void {
    this.trigger(HapticFeedbackType.WARNING);
  }

  /**
   * Error notification feedback
   * Use for: Error messages, failed operations
   */
  static error(): void {
    this.trigger(HapticFeedbackType.ERROR);
  }

  /**
   * Selection feedback
   * Use for: Picker selection, scrolling through options
   */
  static selection(): void {
    this.trigger(HapticFeedbackType.SELECTION);
  }
}

