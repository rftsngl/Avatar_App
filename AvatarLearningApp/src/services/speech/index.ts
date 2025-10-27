/**
 * Speech Services
 * 
 * ============================================================================
 * MODIFIED: ElevenLabs STT Added (2025-10-27)
 * ============================================================================
 * Native @react-native-voice/voice (SpeechToTextService) is being replaced
 * with ElevenLabs API (ElevenLabsSTTService) for better accuracy.
 * Both services are exported for transition compatibility.
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


