/**
 * Speech-to-Text Service
 * 
 * Handles speech recognition using @react-native-voice/voice library.
 * Supports multiple languages including Turkish and English.
 */

import Voice, {
  SpeechRecognizedEvent,
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { LogBox } from 'react-native';

// Suppress NativeEventEmitter warning from @react-native-voice/voice
// This is a known issue in the library and doesn't affect functionality
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'EventEmitter.removeListener',
]);

/**
 * Supported languages for speech recognition
 * Extended support for multiple languages
 */
export type SpeechLanguage = 
  | 'tr-TR' // Turkish (Turkey)
  | 'en-US' // English (United States)
  | 'en-GB' // English (United Kingdom)
  | 'de-DE' // German (Germany)
  | 'es-ES' // Spanish (Spain)
  | 'fr-FR' // French (France)
  | 'it-IT' // Italian (Italy)
  | 'pt-BR' // Portuguese (Brazil)
  | 'ru-RU' // Russian (Russia)
  | 'ar-SA' // Arabic (Saudi Arabia)
  | 'zh-CN' // Chinese (Simplified, China)
  | 'ja-JP' // Japanese (Japan)
  | 'ko-KR'; // Korean (South Korea)

/**
 * Language metadata
 */
export interface LanguageMetadata {
  code: SpeechLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Supported languages with metadata
 */
export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

/**
 * Speech recognition state
 */
export type SpeechRecognitionState = 'idle' | 'listening' | 'processing' | 'error';

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

/**
 * Speech recognition error
 */
export interface SpeechRecognitionError {
  code: string;
  message: string;
}

/**
 * Speech recognition callbacks
 */
export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (result: SpeechRecognitionResult) => void;
  onEnd?: () => void;
  onError?: (error: SpeechRecognitionError) => void;
  onPartialResult?: (partialText: string) => void;
}

/**
 * Speech-to-Text Service
 */
export class SpeechToTextService {
  private static isInitialized = false;
  private static currentLanguage: SpeechLanguage = 'en-US';
  private static callbacks: SpeechRecognitionCallbacks = {};

  /**
   * Initialize the speech recognition service
   * 
   * @param language - Language code for speech recognition
   * @param callbacks - Callbacks for speech recognition events
   */
  static async initialize(
    language: SpeechLanguage = 'en-US',
    callbacks: SpeechRecognitionCallbacks = {}
  ): Promise<void> {
    try {
      Logger.info('SpeechToTextService: Initializing', { language });

      this.currentLanguage = language;
      this.callbacks = callbacks;

      // Set up event listeners
      Voice.onSpeechStart = this.handleSpeechStart.bind(this);
      Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
      Voice.onSpeechResults = this.handleSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.handleSpeechPartialResults.bind(this);
      Voice.onSpeechError = this.handleSpeechError.bind(this);

      this.isInitialized = true;
      Logger.info('SpeechToTextService: Initialized successfully');
    } catch (error) {
      Logger.error('SpeechToTextService: Initialization failed', error);
      throw ErrorHandler.createError(
        ErrorCode.INITIALIZATION_ERROR,
        'Failed to initialize speech recognition'
      );
    }
  }

  /**
   * Start speech recognition
   * 
   * @param language - Optional language override
   */
  static async startListening(language?: SpeechLanguage): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize(language || this.currentLanguage);
      }

      const languageToUse = language || this.currentLanguage;
      Logger.info('SpeechToTextService: Starting speech recognition', { language: languageToUse });

      await Voice.start(languageToUse);
    } catch (error) {
      Logger.error('SpeechToTextService: Failed to start listening', error);
      
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
        'Failed to start speech recognition'
      );
    }
  }

  /**
   * Stop speech recognition
   */
  static async stopListening(): Promise<void> {
    try {
      Logger.info('SpeechToTextService: Stopping speech recognition');
      await Voice.stop();
    } catch (error) {
      Logger.error('SpeechToTextService: Failed to stop listening', error);
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to stop speech recognition'
      );
    }
  }

  /**
   * Cancel speech recognition
   */
  static async cancelListening(): Promise<void> {
    try {
      Logger.info('SpeechToTextService: Canceling speech recognition');
      await Voice.cancel();
    } catch (error) {
      Logger.error('SpeechToTextService: Failed to cancel listening', error);
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to cancel speech recognition'
      );
    }
  }

  /**
   * Destroy the speech recognition service
   */
  static async destroy(): Promise<void> {
    try {
      Logger.info('SpeechToTextService: Destroying service');
      
      // Remove event listeners
      Voice.removeAllListeners();
      
      // Destroy Voice instance
      await Voice.destroy();
      
      this.isInitialized = false;
      this.callbacks = {};
      
      Logger.info('SpeechToTextService: Destroyed successfully');
    } catch (error) {
      Logger.error('SpeechToTextService: Failed to destroy service', error);
    }
  }

  /**
   * Check if speech recognition is available
   * 
   * @returns Promise<boolean> - True if available, false otherwise
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const available = await Voice.isAvailable();
      Logger.info('SpeechToTextService: Availability check', { available });
      return available === 1;
    } catch (error) {
      Logger.error('SpeechToTextService: Availability check failed', error);
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
    Logger.info('SpeechToTextService: Setting language', { language });
    this.currentLanguage = language;
  }

  /**
   * Update callbacks
   * 
   * @param callbacks - New callbacks
   */
  static setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle speech start event
   */
  private static handleSpeechStart(event: SpeechStartEvent): void {
    Logger.info('SpeechToTextService: Speech started', event);
    this.callbacks.onStart?.();
  }

  /**
   * Handle speech end event
   */
  private static handleSpeechEnd(event: SpeechEndEvent): void {
    Logger.info('SpeechToTextService: Speech ended', event);
    this.callbacks.onEnd?.();
  }

  /**
   * Handle speech results event
   */
  private static handleSpeechResults(event: SpeechResultsEvent): void {
    Logger.info('SpeechToTextService: Speech results', event);

    if (event.value && event.value.length > 0) {
      const text = event.value[0];
      const result: SpeechRecognitionResult = {
        text,
        isFinal: true,
        confidence: 1.0,
      };

      this.callbacks.onResult?.(result);
    }
  }

  /**
   * Handle speech partial results event
   */
  private static handleSpeechPartialResults(event: SpeechResultsEvent): void {
    Logger.debug('SpeechToTextService: Partial results', event);

    if (event.value && event.value.length > 0) {
      const partialText = event.value[0];
      this.callbacks.onPartialResult?.(partialText);
    }
  }

  /**
   * Handle speech error event
   */
  private static handleSpeechError(event: SpeechErrorEvent): void {
    Logger.error('SpeechToTextService: Speech error', event);

    const error: SpeechRecognitionError = {
      code: event.error?.code || 'UNKNOWN_ERROR',
      message: event.error?.message || 'Unknown speech recognition error',
    };

    this.callbacks.onError?.(error);
  }
}

