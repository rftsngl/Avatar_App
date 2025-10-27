/**
 * Audio Playback Service
 * 
 * Handles audio playback for reviewing voice samples.
 */

import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * Playback state
 */
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  duration: number; // in milliseconds
  currentPosition: number; // in milliseconds
  filePath: string | null;
}

/**
 * Playback callbacks
 */
export interface PlaybackCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onProgress?: (currentPosition: number, duration: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Audio Playback Service
 */
export class AudioPlaybackService {
  private static audioRecorderPlayer: AudioRecorderPlayer | null = null;
  private static playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    duration: 0,
    currentPosition: 0,
    filePath: null,
  };
  private static callbacks: PlaybackCallbacks = {};

  /**
   * Initialize the audio player
   */
  static async initialize(callbacks: PlaybackCallbacks = {}): Promise<void> {
    try {
      if (!this.audioRecorderPlayer) {
        this.audioRecorderPlayer = new AudioRecorderPlayer();
        this.audioRecorderPlayer.setSubscriptionDuration(0.1); // Update every 100ms
      }
      this.callbacks = callbacks;
      Logger.info('AudioPlaybackService: Initialized');
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to initialize', error);
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Start playback
   */
  static async startPlayback(filePath: string): Promise<void> {
    try {
      if (!this.audioRecorderPlayer) {
        await this.initialize();
      }

      // Stop any existing playback
      if (this.playbackState.isPlaying) {
        await this.stopPlayback();
      }

      // Start playback
      await this.audioRecorderPlayer!.startPlayer(filePath);

      // Set up progress listener
      this.audioRecorderPlayer!.addPlayBackListener((e) => {
        this.playbackState.currentPosition = e.currentPosition;
        this.playbackState.duration = e.duration;

        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(e.currentPosition, e.duration);
        }

        // Check if playback completed
        if (e.currentPosition >= e.duration && e.duration > 0) {
          this.handlePlaybackComplete();
        }
      });

      this.playbackState = {
        isPlaying: true,
        isPaused: false,
        duration: 0,
        currentPosition: 0,
        filePath,
      };

      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }

      Logger.info('AudioPlaybackService: Playback started', { filePath });
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to start playback', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Stop playback
   */
  static async stopPlayback(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.playbackState.isPlaying) {
        return;
      }

      await this.audioRecorderPlayer.stopPlayer();
      this.audioRecorderPlayer.removePlayBackListener();

      this.playbackState = {
        isPlaying: false,
        isPaused: false,
        duration: 0,
        currentPosition: 0,
        filePath: null,
      };

      if (this.callbacks.onStop) {
        this.callbacks.onStop();
      }

      Logger.info('AudioPlaybackService: Playback stopped');
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to stop playback', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Pause playback
   */
  static async pausePlayback(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.playbackState.isPlaying) {
        return;
      }

      await this.audioRecorderPlayer.pausePlayer();
      this.playbackState.isPaused = true;

      if (this.callbacks.onPause) {
        this.callbacks.onPause();
      }

      Logger.info('AudioPlaybackService: Playback paused');
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to pause playback', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Resume playback
   */
  static async resumePlayback(): Promise<void> {
    try {
      if (!this.audioRecorderPlayer || !this.playbackState.isPaused) {
        return;
      }

      await this.audioRecorderPlayer.resumePlayer();
      this.playbackState.isPaused = false;

      if (this.callbacks.onResume) {
        this.callbacks.onResume();
      }

      Logger.info('AudioPlaybackService: Playback resumed');
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to resume playback', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Seek to position
   */
  static async seekTo(position: number): Promise<void> {
    try {
      if (!this.audioRecorderPlayer) {
        return;
      }

      await this.audioRecorderPlayer.seekToPlayer(position);
      this.playbackState.currentPosition = position;

      Logger.info('AudioPlaybackService: Seeked to position', { position });
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to seek', error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      throw ErrorHandler.createError(ErrorCode.AUDIO_ERROR, (error as Error).message);
    }
  }

  /**
   * Handle playback completion
   */
  private static handlePlaybackComplete(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = false;

    if (this.callbacks.onComplete) {
      this.callbacks.onComplete();
    }

    Logger.info('AudioPlaybackService: Playback completed');
  }

  /**
   * Get current playback state
   */
  static getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Check if currently playing
   */
  static isPlaying(): boolean {
    return this.playbackState.isPlaying && !this.playbackState.isPaused;
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
   * Cleanup and destroy the player
   */
  static async destroy(): Promise<void> {
    try {
      if (this.playbackState.isPlaying) {
        await this.stopPlayback();
      }

      if (this.audioRecorderPlayer) {
        this.audioRecorderPlayer.removePlayBackListener();
        this.audioRecorderPlayer = null;
      }

      this.callbacks = {};
      Logger.info('AudioPlaybackService: Destroyed');
    } catch (error) {
      Logger.error('AudioPlaybackService: Failed to destroy', error);
    }
  }
}

