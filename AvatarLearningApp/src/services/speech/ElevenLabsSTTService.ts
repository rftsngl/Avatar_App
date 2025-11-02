/**
 * ElevenLabs Speech-to-Text Service
 * 
 * ============================================================================
 * ElevenLabs STT Integration (2025-10-27)
 * ============================================================================
 * Replaces native @react-native-voice/voice with ElevenLabs API for better
 * accuracy and consistency across platforms. Uses model: scribe_v1 (stable)
 * Supports all 13 languages from the original native STT implementation.
 * ============================================================================
 * 
 * API Endpoint: https://api.elevenlabs.io/v1/speech-to-text
 * Model: scribe_v1 (stable production model)
 * Alternative: scribe_v1_experimental (beta features)
 * 
 * Features:
 * - Audio recording via react-native-audio-recorder-player
 * - Upload to ElevenLabs API
 * - Transcription with high accuracy
 * - Support for 13 languages
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
  AVEncodingOption,
  AVEncoderAudioQualityIOSType,
  AVLinearPCMBitDepthKeyIOSType,
} from 'react-native-audio-recorder-player';
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
const STT_MODEL = 'scribe_v1'; // Stable production model for STT
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * ElevenLabs API key storage key
 */
const ELEVENLABS_API_KEY_STORAGE = 'elevenlabs_api_key';

/**
 * Audio recording configuration
 * 
 * ANDROID DEVICE COMPATIBILITY NOTE:
 * - Many modern Android devices use AAC in M4A/3GP container
 * - iOS: Uses LPCM (Linear PCM) format for high quality
 * 
 * USER IMPACT:
 * - Android & iOS: Both use simple word-matching accuracy
 * - No detailed pronunciation assessment (requires Speech SDK)
 * 
 * AUDIO FORMAT:
 * - Android: AAC encoder in MPEG-4 container (M4A)
 * - iOS: LPCM (uncompressed PCM audio)
 * - Sample rate: 16kHz (optimal for speech)
 * - Channels: Mono (1 channel)
 */
const AUDIO_CONFIG = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,  // M4A container
  AudioSamplingRateAndroid: 16000,  // 16kHz for speech
  AudioChannelsAndroid: 1,  // Mono
  AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
  AVNumberOfChannelsKeyIOS: 1,
  AVFormatIDKeyIOS: AVEncodingOption.lpcm,  // PCM for iOS
  AVSampleRateKeyIOS: 16000,  // 16kHz for speech
  AVLinearPCMBitDepthKeyIOS: AVLinearPCMBitDepthKeyIOSType.bit16,  // 16-bit
  AVLinearPCMIsBigEndianKeyIOS: false,
  AVLinearPCMIsFloatKeyIOS: false,
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
  onProcessing?: () => void; // Called when starting to process audio with API
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
  private static lastTranscription: string | null = null; // ← Cache for last transcription

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
      this.lastTranscription = null; // Reset cached transcription

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

      // Reset state if in error state
      if (this.currentState === 'error') {
        this.currentState = 'idle';
        Logger.info('ElevenLabsSTTService: Resetting from error state');
      }

      if (this.currentState === 'recording') {
        Logger.warn('ElevenLabsSTTService: Already recording');
        return;
      }

      if (this.currentState === 'processing') {
        Logger.warn('ElevenLabsSTTService: Still processing previous recording');
        return;
      }

      const languageToUse = language || this.currentLanguage;
      this.currentLanguage = languageToUse;

      Logger.info('ElevenLabsSTTService: Starting audio recording', { language: languageToUse });

      // Generate unique file path for recording
      // Platform-specific extensions: .m4a for Android (AAC), .wav for iOS (LPCM)
      const timestamp = Date.now();
      const extension = Platform.OS === 'ios' ? 'wav' : 'm4a';
      this.recordingPath = `${RNFS.DocumentDirectoryPath}/recording_${timestamp}.${extension}`;

      // Start recording with platform-optimized configuration
      await this.audioRecorder.startRecorder(this.recordingPath, AUDIO_CONFIG);

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
   * Stop listening and process the recording
   * 
   * @returns Path to the recorded audio file (before cleanup)
   */
  /**
   * Stop listening and process the recording
   * Returns audio file path and transcription
   */
  static async stopListening(): Promise<{ audioFilePath: string; transcription: string }> {
    try {
      // Allow stopping from 'recording' or 'processing' states
      if (this.currentState !== 'recording' && this.currentState !== 'processing') {
        Logger.warn('ElevenLabsSTTService: Not in recording state', { state: this.currentState });
        
        // If already idle, might be a double-call - return empty path
        if (this.currentState === 'idle') {
          throw ErrorHandler.createError(
            ErrorCode.UNKNOWN_ERROR,
            'Not currently recording'
          );
        }
      }

      Logger.info('ElevenLabsSTTService: Stopping recording', { state: this.currentState });

      // Stop recording
      const result = await this.audioRecorder.stopRecorder();
      
      // Remove listener safely
      if (this.recordingSubscription) {
        this.audioRecorder.removeRecordBackListener();
        this.recordingSubscription = null;
      }

      Logger.info('ElevenLabsSTTService: Recording stopped', { path: result });

      this.currentState = 'processing';
      this.callbacks.onProcessing?.(); // Notify UI that processing started

      // Check if recording file exists
      if (!this.recordingPath || !(await RNFS.exists(this.recordingPath))) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Recording file not found'
        );
      }

      // Save the recording path before processing
      const savedRecordingPath = this.recordingPath;

      // Process with ElevenLabs API
      await this.processRecording(this.recordingPath);

      this.currentState = 'idle';
      this.callbacks.onEnd?.();

      // Return both audio path and transcription
      // This allows ISE assessment to use the file and immediate access to text
      return {
        audioFilePath: savedRecordingPath,
        transcription: this.lastTranscription || '',
      };
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to stop recording', error);
      this.currentState = 'error';
      this.callbacks.onError?.(error as Error);

      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to stop audio recording'
      );
    }
  }

  /**
   * Clean up the recording file after ISE assessment
   * Call this after you're done with pronunciation evaluation
   */
  static async cleanupRecording(): Promise<void> {
    try {
      if (this.recordingPath && (await RNFS.exists(this.recordingPath))) {
        await RNFS.unlink(this.recordingPath);
        Logger.info('ElevenLabsSTTService: Recording file cleaned up');
      }
      this.recordingPath = null;
    } catch (error) {
      Logger.error('ElevenLabsSTTService: Failed to cleanup recording', error);
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
        audioFilePath,
      });

      // Get API key
      const apiKey = await this.getAPIKey();

      // Get language code for ElevenLabs (ISO 639-1)
      const languageCode = LANGUAGE_CODE_MAP[this.currentLanguage] || 'en';

      // Check if file exists
      const fileExists = await RNFS.exists(audioFilePath);
      if (!fileExists) {
        Logger.error('ElevenLabsSTTService: Audio file does not exist', { audioFilePath });
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Audio file not found'
        );
      }

      // Get file stats for logging
      const fileStat = await RNFS.stat(audioFilePath);
      Logger.info('ElevenLabsSTTService: Audio file stats', {
        size: fileStat.size,
        path: audioFilePath,
      });

      // Validate audio file size (minimum 1KB)
      if (fileStat.size < 1000) {
        Logger.warn('ElevenLabsSTTService: Audio file too small, likely silent', {
          size: fileStat.size,
        });
        
        // Return empty result for silent/corrupt recordings
        const emptyResult: ElevenLabsSTTResult = {
          text: '',
          language: this.currentLanguage,
          confidence: 0,
        };
        this.callbacks.onResult?.(emptyResult);
        return;
      }

      // Create FormData with proper file URI format
      // React Native FormData requires platform-specific URI handling
      const formData = new FormData();
      
      // Ensure file:// prefix is present
      const fileUri = audioFilePath.startsWith('file://') 
        ? audioFilePath 
        : `file://${audioFilePath}`;

      // Detect file type from extension
      const fileExtension = audioFilePath.toLowerCase().split('.').pop() || 'wav';
      let mimeType = 'audio/wav';  // Default for iOS
      
      // Platform-specific MIME types
      if (fileExtension === 'm4a') {
        mimeType = 'audio/m4a';  // Android AAC/MP4
      } else if (fileExtension === 'wav') {
        mimeType = 'audio/wav';  // iOS LPCM
      } else if (fileExtension === 'amr') {
        mimeType = 'audio/amr';  // Fallback (device dependent)
      }
      
      const fileName = `recording.${fileExtension}`;

      // ElevenLabs API requires 'file' field name (not 'audio')
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);
      
      // Add model_id parameter
      formData.append('model_id', STT_MODEL);
      
      // Add language parameter (optional but recommended)
      formData.append('language', languageCode);
      
      Logger.info('ElevenLabsSTTService: Sending request to ElevenLabs', {
        model: STT_MODEL,
        language: languageCode,
        fileUri,
        mimeType,
        endpoint: STT_ENDPOINT,
      });

      // Send request with retry logic for rate limits
      const response = await this.sendRequestWithRetry(
        STT_ENDPOINT,
        formData,
        apiKey,
        3 // Max 3 attempts
      );

      Logger.info('ElevenLabsSTTService: Response received', {
        status: response.status,
        hasData: !!response.data,
        hasText: !!response.data?.text,
      });

      if (!response.data || !response.data.text) {
        Logger.error('ElevenLabsSTTService: Invalid API response', { response: response.data });
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

      // Cache the transcription for immediate access
      this.lastTranscription = result.text;

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
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
            headers: axiosError.response.headers,
          });
        } else if (axiosError.request) {
          Logger.error('ElevenLabsSTTService: No response received', {
            request: axiosError.request,
          });
        } else {
          Logger.error('ElevenLabsSTTService: Request setup error', {
            message: axiosError.message,
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
   * Send request with exponential backoff retry for rate limits
   * 
   * @param url - API endpoint URL
   * @param formData - FormData to send
   * @param apiKey - ElevenLabs API key
   * @param maxAttempts - Maximum retry attempts
   * @returns API response
   */
  private static async sendRequestWithRetry(
    url: string,
    formData: FormData,
    apiKey: string,
    maxAttempts: number = 3
  ): Promise<AxiosResponse<ElevenLabsSTTResponse>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        Logger.info('ElevenLabsSTTService: Sending request', {
          attempt,
          maxAttempts,
        });

        const response = await axios.post<ElevenLabsSTTResponse>(
          url,
          formData,
          {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'multipart/form-data',
            },
            timeout: REQUEST_TIMEOUT,
          }
        );

        // Success - return response
        Logger.info('ElevenLabsSTTService: Request successful', { attempt });
        return response;

      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error (429)
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          // Calculate exponential backoff delay: 2s, 4s, 8s
          const delaySeconds = Math.pow(2, attempt);
          
          if (attempt < maxAttempts) {
            Logger.warn('ElevenLabsSTTService: Rate limit hit, retrying', {
              attempt,
              maxAttempts,
              delaySeconds,
              retryAfter: `${delaySeconds}s`,
            });

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            continue; // Try again
          } else {
            Logger.error('ElevenLabsSTTService: Max retry attempts reached', {
              attempt,
              maxAttempts,
            });
            // Fall through to throw error
          }
        } else {
          // Non-retryable error (network, auth, etc.) - throw immediately
          Logger.error('ElevenLabsSTTService: Non-retryable error', {
            error,
            attempt,
          });
          throw error;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Request failed after all retry attempts');
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
