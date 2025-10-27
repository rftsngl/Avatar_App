/**
 * Core Type Definitions for Avatar Learning App
 * 
 * ============================================================================
 * MODIFIED: HeyGen-Only Platform (2025-10-27)
 * ============================================================================
 * This file contains all TypeScript type definitions for the application.
 * D-ID platform has been removed - HeyGen is now the sole avatar platform.
 * ElevenLabs API is used for speech-to-text functionality.
 * ============================================================================
 * 
 * This file contains all TypeScript type definitions for the application
 * including Platform, Avatar, Voice, Video, and API-related types.
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported avatar platforms
 * 
 * NOTE: 'did' kept for backward compatibility with existing data,
 * but platform is no longer selectable or functional in the app.
 * 'elevenlabs' is used for speech-to-text service only (not avatar platform)
 */
/**
 * Platform types
 */
export type PlatformType = 'did' | 'heygen' | 'elevenlabs';

/**
 * Platform configuration
 */
export interface PlatformConfig {
  type: PlatformType;
  name: string;
  apiKey: string | null;
  isConfigured: boolean;
}

/**
 * Platform selection state
 */
export interface PlatformState {
  selectedPlatform: PlatformType | null;
  didConfig: PlatformConfig;
  heygenConfig: PlatformConfig;
}

// ============================================================================
// Avatar Types
// ============================================================================

/**
 * Avatar gender
 */
export type AvatarGender = 'male' | 'female' | 'other';

/**
 * Base avatar interface
 */
export interface Avatar {
  id: string;
  name: string;
  gender: AvatarGender;
  thumbnailUrl: string;
  previewUrl?: string;
  platform: PlatformType;
  isCustom?: boolean;
  imageUrl?: string;
}

/**
 * D-ID specific avatar (Presenter)
 * 
 * DEACTIVATED: D-ID platform removed (2025-10-27)
 * Type kept for backward compatibility with existing stored data.
 */
export interface DIDAvatar extends Avatar {
  presenterId: string;
  defaultVoiceId?: string;
  defaultVoiceProvider?: string;
}

/**
 * HeyGen specific avatar
 */
export interface HeyGenAvatar extends Avatar {
  avatarId: string;
  avatarStyle?: string;
}

// ============================================================================
// Voice Types
// ============================================================================

/**
 * Voice provider types
 */
export type VoiceProvider = 'microsoft' | 'elevenlabs' | 'amazon' | 'heygen';

/**
 * Voice style (for Microsoft Azure)
 */
export type VoiceStyle = 
  | 'Cheerful' 
  | 'Friendly' 
  | 'Professional' 
  | 'Sad' 
  | 'Angry' 
  | 'Excited';

/**
 * Base voice interface
 */
export interface Voice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender: AvatarGender;
  provider: VoiceProvider;
  platform: PlatformType;
  isCloned?: boolean;
  // HeyGen advanced features
  previewAudio?: string;
  supportPause?: boolean;
  emotionSupport?: boolean;
  supportLocale?: boolean;
}

/**
 * Microsoft Azure voice configuration
 */
export interface MicrosoftVoiceConfig {
  style?: VoiceStyle;
  rate?: number; // 0.5 - 2.0
  pitch?: number; // 0.5 - 2.0
}

/**
 * Voice with configuration
 */
export interface VoiceWithConfig extends Voice {
  config?: MicrosoftVoiceConfig;
}

// ============================================================================
// Video Types
// ============================================================================

/**
 * Video generation status
 */
export type VideoStatus = 
  | 'created' 
  | 'processing' 
  | 'done' 
  | 'completed' 
  | 'failed' 
  | 'error';

/**
 * Video metadata
 */
export interface VideoMetadata {
  id: string;
  platform: PlatformType;
  avatarId: string;
  avatarName: string;
  voiceId: string;
  voiceName: string;
  text: string;
  duration?: number;
  resolution?: [number, number];
  createdAt: string;
  status: VideoStatus;
  cloudVideoUrl?: string; // For cloud-stored videos (HeyGen)
}

/**
 * Video file information
 */
export interface VideoFile {
  id: string;
  url: string;
  localPath?: string;
  thumbnailUrl?: string;
  metadata: VideoMetadata;
}

/**
 * Video generation request
 */
export interface VideoGenerationRequest {
  text: string;
  avatarId: string;
  voiceId: string;
  platform: PlatformType;
  voiceConfig?: MicrosoftVoiceConfig;
}

/**
 * Video generation response
 */
export interface VideoGenerationResponse {
  id: string;
  status: VideoStatus;
  resultUrl?: string;
  error?: string;
}

// ============================================================================
// API Types - D-ID (DEACTIVATED)
// ============================================================================
// DEACTIVATED: D-ID API types removed (2025-10-27)
// Types kept for backward compatibility with existing code/data.
// ============================================================================

/**
 * D-ID Clips API request
 * DEACTIVATED: D-ID platform removed
 */
export interface DIDClipsRequest {
  script: {
    type: 'text' | 'audio';
    input: string;
    provider?: {
      type: VoiceProvider;
      voice_id: string;
      voice_config?: MicrosoftVoiceConfig;
    };
  };
  presenter_id: string;
  background?: {
    color?: string;
    image_url?: string;
  };
  config?: {
    result_format?: 'mp4' | 'gif';
  };
  webhook?: string;
}

/**
 * D-ID Clips API response
 * DEACTIVATED: D-ID platform removed
 */
export interface DIDClipsResponse {
  id: string;
  created_at: string;
  object: string;
  status: VideoStatus;
  result_url?: string;
  duration?: number;
  metadata?: {
    resolution: [number, number];
    num_frames: number;
  };
  error?: {
    kind: string;
    description: string;
  };
}

/**
 * D-ID Presenter
 * DEACTIVATED: D-ID platform removed
 */
export interface DIDPresenter {
  presenter_id: string;
  name: string;
  gender: AvatarGender;
  preview_url: string;
  thumbnail_url: string;
  voice?: {
    type: VoiceProvider;
    voice_id: string;
  };
}

/**
 * D-ID Voice Response (from API)
 */
export interface DIDVoiceData {
  voice_id?: string;
  id?: string;
  name: string;
  language?: string;
  language_code?: string;
  gender?: AvatarGender;
  provider?: VoiceProvider;
  is_cloned?: boolean;
  owner_id?: string;
  preview_url?: string;
}

// ============================================================================
// API Types - HeyGen
// ============================================================================

/**
 * HeyGen Video Generation request
 */
export interface HeyGenVideoRequest {
  video_inputs: Array<{
    character: {
      type: 'avatar';
      avatar_id: string;
      avatar_style?: string;
    };
    voice: {
      type: 'text';
      input_text: string;
      voice_id: string;
      speed?: number;
    };
    background?: {
      type: 'color' | 'image';
      value: string;
    };
  }>;
  dimension?: {
    width: number;
    height: number;
  };
  test?: boolean;
  webhook_url?: string;
}

/**
 * HeyGen Video Generation response
 */
export interface HeyGenVideoResponse {
  error: string | null;
  data: {
    video_id: string;
  };
}

/**
 * HeyGen Video Status response
 */
export interface HeyGenVideoStatusResponse {
  code: number;
  data: {
    id: string;
    status: VideoStatus;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: string;
  };
  message: string;
}

/**
 * HeyGen Avatar
 */
export interface HeyGenAvatarData {
  avatar_id: string;
  avatar_name: string;
  gender: AvatarGender;
  preview_image_url: string;
  preview_video_url?: string;
}

/**
 * HeyGen API Response wrapper (generic)
 */
export interface HeyGenAPIResponse<T = unknown> {
  error: string | null;
  data: T;
}

/**
 * HeyGen Remaining Quota response
 */
export interface HeyGenQuotaData {
  remaining_quota: number;
  details: Record<string, unknown>;
}

/**
 * HeyGen Template data
 */
export interface HeyGenTemplateData {
  template_id: string;
  name: string;
  thumbnail_image_url: string;
  aspect_ratio: 'portrait' | 'landscape';
}

/**
 * HeyGen Templates list response
 */
export interface HeyGenTemplatesData {
  templates: HeyGenTemplateData[];
}

/**
 * HeyGen Asset upload response
 */
export interface HeyGenAssetData {
  image_key: string;
  url: string;
}

/**
 * HeyGen Video ID response
 */
export interface HeyGenVideoIdData {
  video_id: string;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Async storage keys
 */
export enum StorageKeys {
  SELECTED_PLATFORM = 'selected_platform',
  VIDEO_METADATA = 'video_metadata',
  AVATAR_CACHE = 'avatar_cache',
  VOICE_CACHE = 'voice_cache',
  USER_PREFERENCES = 'user_preferences',
}

/**
 * User preferences
 */
export interface UserPreferences {
  defaultPlatform?: PlatformType;
  defaultAvatarId?: string;
  defaultVoiceId?: string;
  autoPlayVideos: boolean;
  saveVideosLocally: boolean;
  videoQuality: 'low' | 'medium' | 'high';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Application error
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * API error response
 */
export interface APIError {
  status: number;
  message: string;
  error?: any;
}

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Main tab parameter list (Bottom tabs)
 */
export type MainTabParamList = {
  VideoCreation: undefined;
  VideoArchive: undefined;
  AvatarCatalog: {
    mode?: 'select' | 'browse';
    returnTo?: keyof RootStackParamList;
  } | undefined;
  VoiceCatalog: {
    mode?: 'select' | 'browse';
    returnTo?: keyof RootStackParamList;
  } | undefined;
  Settings: undefined;
};

/**
 * Root stack parameter list
 * 
 * ============================================================================
 * MODIFIED: D-ID Routes Deactivated (2025-10-27)
 * ============================================================================
 * VoiceCloning, VoiceProfileManagement, AvatarCreation routes are D-ID-only
 * features and have been removed from navigation but kept in types for
 * backwards compatibility.
 * 
 * AvatarProfileManagement is kept for type safety but not registered in navigator.
 * Settings moved to MainTabNavigator (bottom tabs).
 * ============================================================================
 */
export type RootStackParamList = {
  Welcome: undefined;
  PlatformSelection: undefined;
  APIKeySetup: { platform: PlatformType };
  MainTabs: {
    screen?: keyof MainTabParamList;
    params?: {
      selectedAvatar?: Avatar;
      selectedVoice?: Voice;
    };
  } | undefined; // Main app with bottom tabs
  VideoPlayback: { videoId: string };
  TemplateSelection: undefined;
  PlatformManagement: undefined;
  AvatarProfileManagement: undefined; // DEACTIVATED - D-ID custom avatars (kept for type safety)
  PhotoAvatarManagement: undefined;
  PhotoAvatarCreation: undefined; // HeyGen Avatar IV - Instant video from photo
  VoiceCloning: undefined; // DEACTIVATED - D-ID voice cloning (kept for type safety)
  VoiceProfileManagement: undefined; // DEACTIVATED - D-ID voice management (kept for type safety)
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/**
 * Async operation result
 */
export type AsyncResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: AppError;
};

// ============================================================================
// Speech Recognition Types
// ============================================================================
// MODIFIED: Now using ElevenLabs API for speech-to-text (2025-10-27)
// Native @react-native-voice/voice replaced with ElevenLabs API.
// ============================================================================

/**
 * Supported languages for speech recognition
 * Extended support for multiple languages
 * 
 * All 13 languages supported by both ElevenLabs (eleven_multilingual_v2)
 * and the previous native speech recognition.
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
 * Language option for UI
 */
export interface LanguageOption {
  code: SpeechLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Speech recognition preferences
 */
export interface SpeechPreferences {
  preferredLanguage: SpeechLanguage;
  autoAppendText: boolean;
  showPartialResults: boolean;
}

// ============================================================================
// ElevenLabs Speech-to-Text Types
// ============================================================================

/**
 * ElevenLabs STT service state
 * Used by ElevenLabsSTTService for audio recording and transcription
 */
export type ElevenLabsSTTState = 
  | 'idle'       // Not recording, ready to start
  | 'recording'  // Currently recording audio
  | 'processing' // Uploading and transcribing
  | 'error';     // Error occurred

/**
 * ElevenLabs STT callbacks
 * Event handlers for STT service lifecycle
 */
export interface ElevenLabsSTTCallbacks {
  onStart?: () => void;
  onResult?: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onRecordingProgress?: (seconds: number) => void;
}

/**
 * ElevenLabs STT API request
 */
export interface ElevenLabsSTTRequest {
  audio: string; // Base64 or file path
  model?: 'eleven_multilingual_v2'; // Default model
  language?: string; // ISO 639-1 code (e.g., 'tr', 'en', 'de')
}

/**
 * ElevenLabs STT API response
 */
export interface ElevenLabsSTTResponse {
  text: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

/**
 * ElevenLabs API error response
 */
export interface ElevenLabsAPIError {
  detail: {
    status: string;
    message: string;
  };
}

// ============================================================================
// Voice Cloning Types (DEACTIVATED)
// ============================================================================
// DEACTIVATED: D-ID Voice Cloning Feature Removed (2025-10-27)
// HeyGen does not support user voice cloning via API.
// Types kept for backward compatibility with existing data.
// ============================================================================

/**
 * Voice sample for voice cloning
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceSample {
  id: string;
  profileId: string;
  filePath: string;
  fileName: string;
  duration: number; // Duration in seconds
  fileSize: number; // File size in bytes
  createdAt: string;
  sampleNumber: number; // 1, 2, 3, etc.
}

/**
 * Voice profile for cloned voices
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceProfile {
  id: string;
  name: string;
  platform: PlatformType;
  apiVoiceId: string; // ID returned from D-ID/HeyGen API
  sampleCount: number;
  totalDuration: number; // Total duration of all samples in seconds
  createdAt: string;
  updatedAt: string;
  isCloned: true; // To distinguish from stock voices
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Voice clone request
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceCloneRequest {
  name: string;
  samples: VoiceSample[];
  platform: PlatformType;
  consentGiven: boolean;
}

/**
 * Voice clone response from API
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceCloneResponse {
  voiceId: string;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

/**
 * Voice cloning consent status
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceCloneConsent {
  hasConsented: boolean;
  consentDate?: string;
  consentVersion: string; // Version of terms accepted
}

/**
 * Recording state for voice samples
 * DEACTIVATED: D-ID-only feature
 */
export type VoiceRecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'error';

/**
 * Voice sample recording session
 * DEACTIVATED: D-ID-only feature
 */
export interface VoiceSampleRecordingSession {
  profileId: string;
  profileName: string;
  platform: PlatformType;
  targetSampleCount: number; // 3-5 samples
  recordedSamples: VoiceSample[];
  currentSampleNumber: number;
  recordingState: VoiceRecordingState;
}

// ============================================================================
// Avatar Creation Types (DEACTIVATED - D-ID Only)
// ============================================================================
// DEACTIVATED: D-ID Avatar Creation Feature Removed (2025-10-27)
// HeyGen Avatar IV (PhotoAvatarProfile types below) is now used instead.
// These types are for D-ID image upload approach only.
// Types kept for backward compatibility with existing data.
// ============================================================================

/**
 * Avatar photo metadata
 * DEACTIVATED: D-ID-only feature (replaced by HeyGen Avatar IV)
 */
export interface AvatarPhoto {
  id: string;
  profileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

/**
 * Avatar profile metadata
 * DEACTIVATED: D-ID-only feature (replaced by PhotoAvatarProfile)
 */
export interface AvatarProfile {
  id: string;
  name: string;
  platform: PlatformType;
  apiAvatarId: string; // D-ID image URL or avatar ID
  photoPath: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  isCustom: true;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Avatar create request (for D-ID image upload)
 * DEACTIVATED: D-ID-only feature
 */
export interface AvatarCreateRequest {
  name: string;
  photoPath: string;
  platform: PlatformType;
}

/**
 * Avatar create response (from D-ID image upload)
 * DEACTIVATED: D-ID-only feature
 */
export interface AvatarCreateResponse {
  url: string; // D-ID image URL
}

/**
 * Avatar consent
 * DEACTIVATED: D-ID-only feature (consent flow removed)
 */
export interface AvatarConsent {
  accepted: boolean;
  acceptedAt: string;
  version: string;
}

// ============================================================================
// HeyGen Photo Avatar Types
// ============================================================================

/**
 * Photo avatar age groups
 */
export type PhotoAvatarAge = 
  | 'Young Adult' 
  | 'Early Middle Age' 
  | 'Late Middle Age' 
  | 'Senior' 
  | 'Unspecified';

/**
 * Photo avatar gender
 */
export type PhotoAvatarGender = 'Woman' | 'Man' | 'Unspecified';

/**
 * Photo avatar ethnicity
 */
export type PhotoAvatarEthnicity = 
  | 'Asian'
  | 'African'
  | 'Caucasian'
  | 'Hispanic'
  | 'Middle Eastern'
  | 'South Asian'
  | 'Pacific Islander'
  | 'Native American'
  | 'Mixed'
  | 'Unspecified';

/**
 * Photo avatar style
 */
export type PhotoAvatarStyle = 
  | 'Realistic' 
  | 'Pixar' 
  | 'Cinematic' 
  | 'Vintage' 
  | 'Noir' 
  | 'Cyberpunk' 
  | 'Unspecified';

/**
 * Photo avatar orientation
 */
export type PhotoAvatarOrientation = 'square' | 'horizontal' | 'vertical';

/**
 * Photo avatar pose
 */
export type PhotoAvatarPose = 'half_body' | 'close_up' | 'full_body';

/**
 * Photo avatar generation parameters
 */
export interface PhotoAvatarParams {
  name: string;
  age: PhotoAvatarAge;
  gender: PhotoAvatarGender;
  ethnicity: PhotoAvatarEthnicity;
  style: PhotoAvatarStyle;
  appearance: string; // Max 1000 characters
  orientation?: PhotoAvatarOrientation;
  pose?: PhotoAvatarPose;
  callback_url?: string;
  callback_id?: string;
}

/**
 * Photo generation response
 */
export interface PhotoGenerationResponse {
  code: number;
  data: {
    generation_id: string;
    image_key: string;
  };
  message: string;
}

/**
 * Photo generation status
 */
export interface PhotoGenerationStatus {
  code: number;
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    generation_id: string;
    image_key?: string;
    image_url?: string;
    error?: string;
  };
  message: string;
}

/**
 * Avatar group creation parameters
 */
export interface AvatarGroupParams {
  name: string;
  image_key: string;
  generation_id: string;
}

/**
 * Avatar group response
 */
export interface AvatarGroupResponse {
  code: number;
  data: {
    avatar_group_id: string;
    avatar_id: string;
  };
  message: string;
}

/**
 * Avatar training response
 */
export interface AvatarTrainingResponse {
  code: number;
  data: {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };
  message: string;
}

/**
 * Avatar training status
 */
export interface AvatarTrainingStatus {
  code: number;
  data: {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number; // 0-100
    avatar_id?: string;
    error?: string;
  };
  message: string;
}

/**
 * Photo avatar details
 */
export interface PhotoAvatarDetails {
  code: number;
  data: {
    avatar_id: string;
    avatar_name: string;
    avatar_group_id: string;
    preview_image_url: string;
    status: 'active' | 'inactive' | 'training';
    created_at: string;
  };
  message: string;
}

/**
 * Photo avatar profile (local storage)
 */
export interface PhotoAvatarProfile {
  id: string;
  name: string;
  platform: 'heygen';
  generationId: string;
  imageKey: string;
  imageUrl?: string;
  avatarGroupId?: string;
  avatarId?: string;
  jobId?: string;
  status: 'generating' | 'training' | 'completed' | 'failed';
  params: PhotoAvatarParams;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

// ============================================================================
// HeyGen Brand Voice Types
// ============================================================================

/**
 * Brand voice
 */
export interface BrandVoice {
  id: string;
  name: string;
  voice_id: string;
  gender?: 'male' | 'female';
  language?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Brand voice list response
 */
export interface BrandVoiceListResponse {
  code: number;
  data: {
    brand_voices: BrandVoice[];
    total: number;
    next_token?: string;
  };
  message: string;
}

/**
 * Brand voice settings for updates
 */
export interface BrandVoiceSettings {
  name?: string;
  blacklist?: string[]; // Words not to translate
  whitelist?: [string, string][]; // Forced translations [from, to]
  tones?: string[]; // Tone keywords
  vocabulary?: [string, string][]; // Pronunciation guidance [word, pronunciation]
  tone?: string; // Overall tone description
}

// ============================================================================
// HeyGen Advanced API Types (Faz 1 - New Features)
// ============================================================================

/**
 * HeyGen video list item
 */
export interface HeyGenVideo {
  video_id: string;
  status: 'completed' | 'processing' | 'failed' | 'draft';
  created_at: number; // Unix timestamp
  type: 'GENERATED' | 'TRANSLATED';
  folder_id?: string;
  title?: string;
  thumbnail_url?: string;
  video_url?: string;
  duration?: number;
}

/**
 * HeyGen video list response
 */
export interface HeyGenVideoListResponse {
  code: number;
  data: {
    videos: HeyGenVideo[];
    total: number;
    token: string | null; // Pagination token
  };
  message: string;
}

/**
 * HeyGen quota information
 */
export interface HeyGenQuota {
  remaining_quota: number; // Total quota (divide by 60 for credits)
  details?: Record<string, any>;
}

/**
 * HeyGen quota response
 */
export interface HeyGenQuotaResponse {
  remaining_quota: number;
  details: Record<string, any>;
}

/**
 * HeyGen template
 */
export interface HeyGenTemplate {
  template_id: string;
  name: string;
  thumbnail_image_url: string;
  aspect_ratio: 'portrait' | 'landscape';
}

/**
 * HeyGen template list response
 */
export interface HeyGenTemplateListResponse {
  templates: HeyGenTemplate[];
}

/**
 * HeyGen shareable URL response
 */
export interface HeyGenShareableUrlResponse {
  code: number;
  data: {
    url: string;
    expires_at?: string;
  };
  message: string;
}

/**
 * HeyGen delete video response
 */
export interface HeyGenDeleteVideoResponse {
  code: number;
  data: {
    video_id: string;
  };
  message: string;
}

