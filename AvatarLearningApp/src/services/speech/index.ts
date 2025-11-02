/**
 * Speech Services
 * 
 * ============================================================================
 * ElevenLabs STT Service
 * ============================================================================
 * Native @react-native-voice/voice (SpeechToTextService) is being replaced
 * with ElevenLabs API (ElevenLabsSTTService) for better accuracy.
 * ============================================================================
 * 
 * Exports speech-related services
 */

// Native STT (being phased out)
export { SpeechToTextService, SUPPORTED_LANGUAGES } from './SpeechToTextService';
export type {
  SpeechLanguage,
  LanguageMetadata,
  SpeechRecognitionState,
  SpeechRecognitionResult,
  SpeechRecognitionError,
  SpeechRecognitionCallbacks,
} from './SpeechToTextService';

// ElevenLabs STT (new implementation)
export { ElevenLabsSTTService } from './ElevenLabsSTTService';
export type {
  ElevenLabsSTTState,
  ElevenLabsSTTResult,
  ElevenLabsSTTCallbacks,
} from './ElevenLabsSTTService';



