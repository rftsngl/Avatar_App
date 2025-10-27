/**
 * ElevenLabs Speech-to-Text Service
 * 
 * ============================================================================
 * ElevenLabs STT Integration (2025-10-27)
 * ============================================================================
 * Replaces native @react-native-voice/voice with ElevenLabs API for better
 * accuracy and consistency across platforms. Uses model: eleven_multilingual_v2
 * Supports all 13 languages from the original native STT implementation.
 * ============================================================================
 * 
 * API Endpoint: https://api.elevenlabs.io/v1/speech-to-text
 * Model: eleven_multilingual_v2
 * 
 * Features:
 * - Audio recording via react-native-audio-recorder-player
 * - Upload to ElevenLabs API
 * - Transcription with high accuracy
 * - Support for 13 languages
 */

import axios, { AxiosError } from 'axios';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { LogBox, Platform, EmitterSubscription } from 'react-native';
import { SecureStorageService } from '../storage/SecureStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { SpeechLanguage, SUPPORTED_LANGUAGES, LanguageMetadata } from './SpeechToTextService';

// Suppress AudioRecorderPlayer event emitter warnings globally
if (__DEV__) {
  LogBox.ignoreLogs([
    'new NativeEventEmitter',
    'EventEmitter.removeListener',
    'EventEmitter.addListener',
  ]);
  
  // Also suppress console warnings for these specific messages
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('new NativeEventEmitter') ||
       message.includes('EventEmitter.removeListener') ||
       message.includes('addListener') ||
       message.includes('removeListeners'))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

/**
 * ElevenLabs API configuration
 */
const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';
const STT_ENDPOINT = `${ELEVENLABS_API_BASE_URL}/speech-to-text`;
const STT_MODEL = 'eleven_multilingual_v2';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * ElevenLabs API key storage key
 */
const ELEVENLABS_API_KEY_STORAGE = 'elevenlabs_api_key';

/**
 * Audio recording configuration
 */
const AUDIO_CONFIG = {
  AudioEncoderAndroid: 'aac',
  AudioSourceAndroid: 'MIC',
  AVEncoderAudioQualityKeyIOS: 'high',
  AVNumberOfChannelsKeyIOS: 1,
  AVFormatIDKeyIOS: 'kAudioFormatMPEG4AAC',
};

/**
 * Language code mapping (React Native Speech → ElevenLabs)
 * ElevenLabs uses ISO 639-1 codes (2-letter) while we use full locale codes
 */
const LANGUAGE_CODE_MAP: Record<SpeechLanguage, string> = {
  'tr-TR': 'tr', // Turkish
  'en-US': 'en', // English (US)
  'en-GB': 'en', // English (UK)
  'de-DE': 'de', // German
  'es-ES': 'es', // Spanish
  'fr-FR': 'fr', // French
  'it-IT': 'it', // Italian
  'pt-BR': 'pt', // Portuguese
  'ru-RU': 'ru', // Russian
  'ar-SA': 'ar', // Arabic
  'zh-CN': 'zh', // Chinese
  'ja-JP': 'ja', // Japanese
  'ko-KR': 'ko', // Korean
};

/**
 * Speech recognition state
 */
export type ElevenLabsSTTState = 'idle' | 'recording' | 'processing' | 'error';

/**
 * Speech recognition result
 */
export interface ElevenLabsSTTResult {
  text: string;
  language: string;
  confidence?: number;
}

/**
 * Speech recognition callbacks
 */
export interface ElevenLabsSTTCallbacks {
  onStart?: () => void;
  onResult?: (result: ElevenLabsSTTResult) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onRecordingProgress?: (durationMs: number) => void;
}

/**
 * ElevenLabs STT Response
 */
interface ElevenLabsSTTResponse {
  text: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

/**
 * ElevenLabs Speech-to-Text Service
 */
export class ElevenLabsSTTService {
  private static audioRecorder = new AudioRecorderPlayer();
  private static currentState: ElevenLabsSTTState = 'idle';
  private static currentLanguage: SpeechLanguage = 'en-US';
  private static callbacks: ElevenLabsSTTCallbacks = {};
  private static recordingPath: string | null = null;
  private static isInitialized = false;
  private static recordingSubscription: unknown = null;

  /**
   * Initialize the ElevenLabs STT service
   * 
   * @param language - Language code for speech recognition
   * @param callbacks - Callbacks for STT events
   */
  static async initialize(
    language: SpeechLanguage = 'en-US',
    callbacks: ElevenLabsSTTCallbacks = {}
  ): Promise<void> {
    try {
      Logger.info('ElevenLabsSTTService: Initializing', { language });

      this.currentLanguage = language;
      this.callbacks = callbacks;
      this.isInitialized = true;

      Logger.info('ElevenLabsSTTService: Initialized successfully');
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Initialization failed', error);
      throw ErrorHandler.createError(
        ErrorCode.INITIALIZATION_ERROR,
        'Failed to initialize ElevenLabs STT'
      );
    }
  }

  /**
   * Get ElevenLabs API key from secure storage
   */
  private static async getAPIKey(): Promise<string> {
    const apiKey = await SecureStorageService.getAPIKey('elevenlabs');

    if (!apiKey) {
      Logger.error('ElevenLabsSTTService: No API key found');
      throw ErrorHandler.createError(
        ErrorCode.API_KEY_MISSING,
        'ElevenLabs API key not found. Please configure your API key in settings.'
      );
    }

    return apiKey;
  }

  /**
   * Start recording audio
   * 
   * @param language - Optional language override
   */
  static async startListening(language?: SpeechLanguage): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize(language || this.currentLanguage);
      }

      if (this.currentState !== 'idle') {
        Logger.warn('ElevenLabsSTTService: Already recording or processing');
        return;
      }

      const languageToUse = language || this.currentLanguage;
      this.currentLanguage = languageToUse;

      Logger.info('ElevenLabsSTTService: Starting audio recording', { language: languageToUse });

      // Generate unique file path for recording
      const timestamp = Date.now();
      this.recordingPath = `${RNFS.DocumentDirectoryPath}/recording_${timestamp}.m4a`;

      // Start recording
      await this.audioRecorder.startRecorder(this.recordingPath);

      // Set up recording progress listener (safely)
      // Remove any existing listener first
      if (this.recordingSubscription) {
        this.audioRecorder.removeRecordBackListener();
        this.recordingSubscription = null;
      }
      
      this.recordingSubscription = this.audioRecorder.addRecordBackListener((e) => {
        if (this.callbacks.onRecordingProgress) {
          this.callbacks.onRecordingProgress(e.currentPosition);
        }
      });

      this.currentState = 'recording';
      this.callbacks.onStart?.();

      Logger.info('ElevenLabsSTTService: Recording started', { path: this.recordingPath });
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to start recording', error);
      this.currentState = 'error';

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('permissions') || error.message.includes('permission')) {
          throw ErrorHandler.createError(
            ErrorCode.MICROPHONE_PERMISSION_DENIED,
            'Microphone permission is required for speech recognition'
          );
        }
      }

      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to start audio recording'
      );
    }
  }

  /**
   * Stop recording and process audio with ElevenLabs API
   */
  static async stopListening(): Promise<void> {
    try {
      if (this.currentState !== 'recording') {
        Logger.warn('ElevenLabsSTTService: Not recording');
        return;
      }

      Logger.info('ElevenLabsSTTService: Stopping recording');

      // Stop recording
      const result = await this.audioRecorder.stopRecorder();
      
      // Remove listener safely
      if (this.recordingSubscription) {
        this.audioRecorder.removeRecordBackListener();
        this.recordingSubscription = null;
      }

      Logger.info('ElevenLabsSTTService: Recording stopped', { path: result });

      this.currentState = 'processing';

      // Check if recording file exists
      if (!this.recordingPath || !(await RNFS.exists(this.recordingPath))) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Recording file not found'
        );
      }

      // Process with ElevenLabs API
      await this.processRecording(this.recordingPath);

      this.currentState = 'idle';
      this.callbacks.onEnd?.();
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to stop recording', error);
      this.currentState = 'error';
      this.callbacks.onError?.(error as Error);

      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to stop audio recording'
      );
    } finally {
      // Clean up recording file
      if (this.recordingPath && (await RNFS.exists(this.recordingPath))) {
        await RNFS.unlink(this.recordingPath);
        Logger.info('ElevenLabsSTTService: Recording file cleaned up');
      }
      this.recordingPath = null;
    }
  }

  /**
   * Cancel recording without processing
   */
  static async cancelListening(): Promise<void> {
    try {
      Logger.info('ElevenLabsSTTService: Canceling recording');

      if (this.currentState === 'recording') {
        await this.audioRecorder.stopRecorder();
        
        // Remove listener safely
        if (this.recordingSubscription) {
          this.audioRecorder.removeRecordBackListener();
          this.recordingSubscription = null;
        }
      }

      // Clean up recording file
      if (this.recordingPath && (await RNFS.exists(this.recordingPath))) {
        await RNFS.unlink(this.recordingPath);
        Logger.info('ElevenLabsSTTService: Recording file cleaned up');
      }

      this.currentState = 'idle';
      this.recordingPath = null;

      Logger.info('ElevenLabsSTTService: Recording canceled');
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to cancel recording', error);
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to cancel audio recording'
      );
    }
  }

  /**
   * Process recorded audio with ElevenLabs API
   * 
   * @param audioFilePath - Path to audio file
   */
  private static async processRecording(audioFilePath: string): Promise<void> {
    try {
      Logger.info('ElevenLabsSTTService: Processing audio with ElevenLabs API', {
        language: this.currentLanguage,
      });

      // Get API key
      const apiKey = await this.getAPIKey();

      // Get language code for ElevenLabs (ISO 639-1)
      const languageCode = LANGUAGE_CODE_MAP[this.currentLanguage] || 'en';

      // Read audio file as base64
      const audioBase64 = await RNFS.readFile(audioFilePath, 'base64');

      // Convert base64 to blob for FormData
      // Note: In React Native, FormData handles file URIs directly
      const formData = new FormData();
      formData.append('audio', {
        uri: `file://${audioFilePath}`,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', STT_MODEL);
      formData.append('language', languageCode);

      Logger.info('ElevenLabsSTTService: Sending request to ElevenLabs', {
        model: STT_MODEL,
        language: languageCode,
      });

      // Send request to ElevenLabs API
      const response = await axios.post<ElevenLabsSTTResponse>(
        STT_ENDPOINT,
        formData,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'multipart/form-data',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (!response.data || !response.data.text) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Invalid response from ElevenLabs API'
        );
      }

      const result: ElevenLabsSTTResult = {
        text: response.data.text,
        language: languageCode,
        confidence: 1.0, // ElevenLabs doesn't provide confidence scores
      };

      Logger.info('ElevenLabsSTTService: Transcription successful', {
        text: result.text,
        language: result.language,
      });

      this.callbacks.onResult?.(result);
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to process audio', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          Logger.error('ElevenLabsSTTService: API error response', {
            status: axiosError.response.status,
            data: axiosError.response.data,
          });
        }
        throw ErrorHandler.handleAPIError(axiosError);
      }

      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to process audio with ElevenLabs'
      );
    }
  }

  /**
   * Destroy the service
   */
  static async destroy(): Promise<void> {
    try {
      Logger.info('ElevenLabsSTTService: Destroying service');

      if (this.currentState === 'recording') {
        await this.cancelListening();
      }

      // Remove listener safely
      if (this.recordingSubscription) {
        this.audioRecorder.removeRecordBackListener();
        this.recordingSubscription = null;
      }

      this.isInitialized = false;
      this.callbacks = {};
      this.currentState = 'idle';

      Logger.info('ElevenLabsSTTService: Destroyed successfully');
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to destroy service', error);
    }
  }

  /**
   * Check if STT is available (always true for API-based service)
   * 
   * @returns Promise<boolean> - Always returns true
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Check if API key exists
      const apiKey = await SecureStorageService.getAPIKey('elevenlabs');
      const available = apiKey !== null;
      Logger.info('ElevenLabsSTTService: Availability check', { available });
      return available;
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Availability check failed', error);
      return false;
    }
  }

  /**
   * Get current language
   * 
   * @returns SpeechLanguage - Current language
   */
  static getCurrentLanguage(): SpeechLanguage {
    return this.currentLanguage;
  }

  /**
   * Set language
   * 
   * @param language - Language code
   */
  static setLanguage(language: SpeechLanguage): void {
    Logger.info('ElevenLabsSTTService: Setting language', { language });
    this.currentLanguage = language;
  }

  /**
   * Update callbacks
   * 
   * @param callbacks - New callbacks
   */
  static setCallbacks(callbacks: ElevenLabsSTTCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get current state
   * 
   * @returns ElevenLabsSTTState - Current state
   */
  static getState(): ElevenLabsSTTState {
    return this.currentState;
  }
}

// Export supported languages from SpeechToTextService for compatibility
export { SUPPORTED_LANGUAGES };
export type { LanguageMetadata, SpeechLanguage } from './SpeechToTextService';
