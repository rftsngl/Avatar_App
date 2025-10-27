/**
 * Audio Recording Service
 * 
 * Handles audio recording for voice cloning using react-native-audio-recorder-player.
 */

import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Recording configuration
 */
const RECORDING_CONFIG = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
  AVNumberOfChannelsKeyIOS: 1,
  AVFormatIDKeyIOS: AVEncodingOption.aac,
  OutputFormatAndroid: OutputFormatAndroidType.AAC_ADTS,
};

/**
 * Recording state
 */
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in milliseconds
  filePath: string | null;
}

/**
 * Recording callbacks
 */
export interface RecordingCallbacks {
  onStart?: () => void;
  onStop?: (filePath: string, duration: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  onProgress?: (duration: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Audio Recording Service
 */
export class AudioRecordingService {
  private static audioRecorderPlayer: AudioRecorderPlayer | null = null;
  private static recordingState: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    filePath: null,
  };
  private static callbacks: RecordingCallbacks = {};
  private static recordingTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the audio recorder
   */
  static async initialize(callbacks: RecordingCallbacks = {}): Promise<void> {
    try {
      if (!this.audioRecorderPlayer) {
        this.audioRecorderPlayer = new AudioRecorderPlayer();
        this.audioRecorderPlayer.setSubscriptionDuration(0.1); // Update every 100ms
      }
      this.callbacks = callbacks;
      Logger.info('AudioRecordingService: Initialized');
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to initialize', error);
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Start recording
   */
  static async startRecording(fileName?: string): Promise<string> {
    try {
      if (!this.audioRecorderPlayer) {
        await this.initialize();
      }

      // Generate file path
      const timestamp = Date.now();
      const defaultFileName = `voice_sample_${timestamp}.m4a`;
      const recordingFileName = fileName || defaultFileName;
      const filePath = `${RNFS.DocumentDirectoryPath}/${recordingFileName}`;

      // Start recording
      await this.audioRecorderPlayer!.startRecorder(filePath, RECORDING_CONFIG);

      // Set up progress listener
      this.audioRecorderPlayer!.addRecordBackListener((e) => {
        this.recordingState.duration = e.currentPosition;
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(e.currentPosition);
        }
      });

      this.recordingState = {
        isRecording: true,
        isPaused: false,
        duration: 0,
        filePath,
      };

      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }

      Logger.info('AudioRecordingService: Recording started', { filePath });
      return filePath;
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to start recording', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Stop recording
   */
  static async stopRecording(): Promise<{ filePath: string; duration: number }> {
    try {
      if (!this.audioRecorderPlayer || !this.recordingState.isRecording) {
        throw new Error('No active recording');
      }

      const result = await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();

      const filePath = this.recordingState.filePath!;
      const duration = Math.floor(this.recordingState.duration / 1000); // Convert to seconds

      this.recordingState = {
        isRecording: false,
        isPaused: false,
        duration: 0,
        filePath: null,
      };

      if (this.callbacks.onStop) {
        this.callbacks.onStop(filePath, duration);
      }

      Logger.info('AudioRecordingService: Recording stopped', { filePath, duration });
      return { filePath, duration };
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to stop recording', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Pause recording
   */
  static async pauseRecording(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.recordingState.isRecording) {
        throw new Error('No active recording');
      }

      await this.audioRecorderPlayer.pauseRecorder();
      this.recordingState.isPaused = true;

      if (this.callbacks.onPause) {
        this.callbacks.onPause();
      }

      Logger.info('AudioRecordingService: Recording paused');
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to pause recording', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Resume recording
   */
  static async resumeRecording(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.recordingState.isPaused) {
        throw new Error('No paused recording');
      }

      await this.audioRecorderPlayer.resumeRecorder();
      this.recordingState.isPaused = false;

      if (this.callbacks.onResume) {
        this.callbacks.onResume();
      }

      Logger.info('AudioRecordingService: Recording resumed');
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to resume recording', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Cancel recording (stop and delete file)
   */
  static async cancelRecording(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.recordingState.isRecording) {
        return;
      }

      const filePath = this.recordingState.filePath;
      await this.audioRecorderPlayer.stopRecorder();
      this.audioRecorderPlayer.removeRecordBackListener();

      // Delete the recording file
      if (filePath) {
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
          await RNFS.unlink(filePath);
        }
      }

      this.recordingState = {
        isRecording: false,
        isPaused: false,
        duration: 0,
        filePath: null,
      };

      Logger.info('AudioRecordingService: Recording cancelled');
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to cancel recording', error);
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Get current recording state
   */
  static getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * Check if currently recording
   */
  static isRecording(): boolean {
    return this.recordingState.isRecording;
  }

  /**
   * Format duration for display (MM:SS)
   */
  static formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Cleanup and destroy the recorder
   */
  static async destroy(): Promise<void> {
    try {
      if (this.recordingState.isRecording) {
        await this.cancelRecording();
      }

      if (this.audioRecorderPlayer) {
        this.audioRecorderPlayer.removeRecordBackListener();
        this.audioRecorderPlayer = null;
      }

      this.callbacks = {};
      Logger.info('AudioRecordingService: Destroyed');
    } catch (error) {
      Logger.error('AudioRecordingService: Failed to destroy', error);
    }
  }
}

