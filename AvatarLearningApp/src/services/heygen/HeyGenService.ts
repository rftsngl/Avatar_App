/**
 * HeyGen Service
 * 
 * Handles all interactions with the HeyGen API including:
 * - Fetching avatars
 * - Fetching voices
 * - Creating videos
 */

import axios, { AxiosError } from 'axios';
import {
  HeyGenAvatarData,
  HeyGenAvatar,
  Voice,
  AvatarGender,
  VideoGenerationRequest,
  VideoGenerationResponse,
  HeyGenVideoRequest,
  HeyGenVideoResponse,
  HeyGenVideoStatusResponse,
  VideoStatus,
  PhotoAvatarParams,
  PhotoGenerationResponse,
  PhotoGenerationStatus,
  AvatarGroupParams,
  AvatarGroupResponse,
  AvatarTrainingResponse,
  AvatarTrainingStatus,
  PhotoAvatarDetails,
  BrandVoiceListResponse,
  BrandVoiceSettings,
  BrandVoice,
  HeyGenVideo,
  HeyGenTemplate,
  HeyGenAPIResponse,
  HeyGenQuotaData,
  HeyGenTemplatesData,
  HeyGenTemplateData,
  HeyGenAssetData,
  HeyGenVideoIdData,
} from '../../types';
import { SecureStorageService } from '../storage/SecureStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * HeyGen API configuration
 */
const HEYGEN_API_BASE_URL = 'https://api.heygen.com';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * HeyGen API response for avatars list
 * Note: HeyGen API returns error field instead of code for error handling
 */
interface HeyGenAvatarsResponse {
  data: {
    avatars: HeyGenAvatarData[];
    talking_photos?: HeyGenAvatarData[]; // HeyGen also returns talking photos
  };
  error: string | null;
}

/**
 * HeyGen API response for voices list
 * Note: HeyGen API returns error field instead of code for error handling
 */
interface HeyGenVoicesResponse {
  data: {
    voices: Array<{
      voice_id: string;
      name: string;
      language: string;
      language_code: string;
      gender: string;
      preview_audio?: string;
      support_pause?: boolean;
      emotion_support?: boolean;
      support_locale?: boolean;
    }>;
  };
  error: string | null;
}

/**
 * HeyGen Service
 */
export class HeyGenService {
  /**
   * Get HeyGen API key from secure storage
   */
  private static async getAPIKey(): Promise<string> {
    const apiKey = await SecureStorageService.getAPIKey('heygen');
    
    if (!apiKey) {
      Logger.error('HeyGenService: No API key found');
      throw ErrorHandler.createError(
        ErrorCode.API_KEY_MISSING,
        'HeyGen API key not found. Please configure your API key in settings.'
      );
    }

    return apiKey;
  }

  /**
   * Fetch all avatars from HeyGen
   * 
   * @returns Promise<HeyGenAvatar[]> - List of HeyGen avatars
   */
  static async fetchAvatars(): Promise<HeyGenAvatar[]> {
    Logger.info('HeyGenService: Fetching avatars');

    try {
      const apiKey = await this.getAPIKey();
      const url = `${HEYGEN_API_BASE_URL}/v2/avatars`;
      
      Logger.info('HeyGenService: Making API request', {
        url,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
      });

      const response = await axios.get<HeyGenAvatarsResponse>(
        url,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Check for API error
      if (response.data.error) {
        Logger.warn('HeyGenService: API returned error', { error: response.data.error });
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.error
        );
      }

      // Check if data exists
      if (!response.data.data || !response.data.data.avatars) {
        Logger.warn('HeyGenService: Invalid response format - missing avatars data', response.data);
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Invalid response from HeyGen API - missing avatars data'
        );
      }

      // Transform HeyGen avatars to our Avatar format
      // Filter out avatars with null/missing thumbnail URLs for better UX
      const avatars: HeyGenAvatar[] = response.data.data.avatars
        .filter((avatar) => avatar.preview_image_url && avatar.preview_image_url !== 'null')
        .map((avatar) => ({
          id: avatar.avatar_id,
          avatarId: avatar.avatar_id,
          name: avatar.avatar_name,
          gender: avatar.gender,
          thumbnailUrl: avatar.preview_image_url,
          previewUrl: avatar.preview_video_url || avatar.preview_image_url, // Fallback to image if no video
          platform: 'heygen' as const,
          avatarStyle: undefined, // Can be set during video creation
        }));

      Logger.info(`HeyGenService: Successfully fetched ${avatars.length} avatars`);
      return avatars;
    } catch (error) {
      Logger.error('HeyGenService: Error fetching avatars', error);
      
      if (axios.isAxiosError(error)) {
        throw ErrorHandler.handleAPIError(error);
      }
      
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch HeyGen avatars'
      );
    }
  }

  /**
   * Fetch voices from HeyGen
   * 
   * @param languageCode - Optional language code filter (e.g., 'en', 'tr', 'es')
   * @returns Promise<Voice[]> - List of voices
   */
  static async fetchVoices(languageCode?: string): Promise<Voice[]> {
    Logger.info('HeyGenService: Fetching voices', { languageCode });

    try {
      const apiKey = await this.getAPIKey();

      // Build query parameters
      const params: Record<string, string> = {};
      if (languageCode) {
        params.language_code = languageCode;
      }

      const response = await axios.get<HeyGenVoicesResponse>(
        `${HEYGEN_API_BASE_URL}/v2/voices`,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          params,
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Check for API error
      if (response.data.error) {
        Logger.warn('HeyGenService: API returned error', { error: response.data.error });
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.error
        );
      }

      // Check if data exists
      if (!response.data.data || !response.data.data.voices) {
        Logger.warn('HeyGenService: Invalid voices response format - missing voices data', response.data);
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Invalid response from HeyGen API - missing voices data'
        );
      }

      // Transform HeyGen voices to our Voice format
      // Filter out voices with missing required fields
      const voices: Voice[] = response.data.data.voices
        .filter((voice) => voice.voice_id && voice.name)
        .map((voice) => ({
          id: voice.voice_id,
          name: voice.name,
          language: voice.language || 'Unknown',
          languageCode: voice.language_code || 'unknown',
          gender: this.parseGender(voice.gender),
          provider: 'heygen' as const,
          platform: 'heygen' as const,
          // Advanced features
          previewAudio: voice.preview_audio,
          supportPause: voice.support_pause,
          emotionSupport: voice.emotion_support,
          supportLocale: voice.support_locale,
        }));

      Logger.info(`HeyGenService: Successfully fetched ${voices.length} voices`);
      return voices;
    } catch (error) {
      Logger.error('HeyGenService: Error fetching voices', error);
      
      if (axios.isAxiosError(error)) {
        throw ErrorHandler.handleAPIError(error);
      }
      
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch HeyGen voices'
      );
    }
  }

  /**
   * Fetch English voices specifically
   * 
   * @returns Promise<Voice[]> - List of English voices
   */
  static async fetchEnglishVoices(): Promise<Voice[]> {
    return this.fetchVoices('en');
  }

  /**
   * Fetch Turkish voices specifically
   * 
   * @returns Promise<Voice[]> - List of Turkish voices
   */
  static async fetchTurkishVoices(): Promise<Voice[]> {
    return this.fetchVoices('tr');
  }

  /**
   * Get a specific avatar by ID
   * 
   * @param avatarId - Avatar ID
   * @returns Promise<HeyGenAvatar | null> - Avatar or null if not found
   */
  static async getAvatar(avatarId: string): Promise<HeyGenAvatar | null> {
    Logger.info(`HeyGenService: Fetching avatar ${avatarId}`);

    try {
      // HeyGen doesn't have a single avatar endpoint, so we fetch all and filter
      const avatars = await this.fetchAvatars();
      const avatar = avatars.find((a) => a.avatarId === avatarId);

      if (avatar) {
        Logger.info(`HeyGenService: Successfully found avatar ${avatarId}`);
        return avatar;
      }

      Logger.warn(`HeyGenService: Avatar ${avatarId} not found`);
      return null;
    } catch (error) {
      Logger.error(`HeyGenService: Error fetching avatar ${avatarId}`, error);
      throw error;
    }
  }

  /**
   * Parse gender string to AvatarGender type
   * 
   * @param gender - Gender string from API
   * @returns AvatarGender
   */
  private static parseGender(gender: string): AvatarGender {
    const normalized = gender.toLowerCase();
    
    if (normalized === 'male' || normalized === 'm') {
      return 'male';
    } else if (normalized === 'female' || normalized === 'f') {
      return 'female';
    }
    
    return 'other'; // Changed from 'neutral' to 'other' to match AvatarGender type
  }

  /**
   * Get available languages
   *
   * Note: This is a helper method that returns common language codes
   * In a production app, you might want to fetch this from the API
   *
   * @returns Array of language codes and names
   */
  static getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'tr', name: 'Turkish' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
    ];
  }

  // ============================================================================
  // Video Generation Methods
  // ============================================================================

  /**
   * Create a video using HeyGen API
   *
   * @param request - Video generation request
   * @returns Video generation response with video ID
   */
  static async createVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      Logger.info('HeyGenService: Creating video', {
        avatarId: request.avatarId,
        voiceId: request.voiceId,
        textLength: request.text.length,
      });

      // Get API key
      const apiKey = await this.getAPIKey();

      // Prepare request body
      const requestBody: HeyGenVideoRequest = {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: request.avatarId,
            },
            voice: {
              type: 'text',
              input_text: request.text,
              voice_id: request.voiceId,
            },
          },
        ],
        dimension: {
          width: 1280,
          height: 720,
        },
        test: false,
      };

      // Make API request
      const response = await axios.post<HeyGenVideoResponse>(
        `${HEYGEN_API_BASE_URL}/v2/video/generate`,
        requestBody,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Check for errors
      if (response.data.error) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.error
        );
      }

      Logger.info('HeyGenService: Video created', {
        videoId: response.data.data.video_id,
      });

      return {
        id: response.data.data.video_id,
        status: 'processing',
      };
    } catch (error) {
      Logger.error('HeyGenService: Failed to create video', error);
      throw ErrorHandler.handleAPIError(error);
    }
  }

  /**
   * Get video status
   *
   * @param videoId - Video ID
   * @returns Video generation response with current status
   */
  static async getVideoStatus(videoId: string): Promise<VideoGenerationResponse> {
    try {
      Logger.info('HeyGenService: Getting video status', { videoId });

      // Get API key
      const apiKey = await this.getAPIKey();

      // Make API request
      const response = await axios.get<HeyGenVideoStatusResponse>(
        `${HEYGEN_API_BASE_URL}/v1/video_status.get`,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          params: {
            video_id: videoId,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Check for API error
      if (response.data.code !== 100) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.message || 'Failed to get video status'
        );
      }

      Logger.info('HeyGenService: Video status retrieved', {
        videoId,
        status: response.data.data.status,
        hasVideoUrl: !!response.data.data.video_url,
      });

      return {
        id: response.data.data.id,
        status: response.data.data.status,
        resultUrl: response.data.data.video_url,
        error: response.data.data.error,
      };
    } catch (error) {
      Logger.error('HeyGenService: Failed to get video status', error);
      throw ErrorHandler.handleAPIError(error);
    }
  }

  /**
   * Poll video status until completion or timeout
   *
   * @param videoId - Video ID
   * @param onProgress - Callback for progress updates
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param intervalMs - Polling interval in milliseconds (default: 5000)
   * @returns Final video generation response
   */
  static async pollVideoStatus(
    videoId: string,
    onProgress?: (status: VideoStatus) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<VideoGenerationResponse> {
    Logger.info('HeyGenService: Starting video status polling', {
      videoId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.getVideoStatus(videoId);

        // Call progress callback
        if (onProgress) {
          onProgress(response.status);
        }

        // Check if video is done
        if (response.status === 'completed') {
          Logger.info('HeyGenService: Video generation completed', {
            videoId,
            attempt,
            resultUrl: response.resultUrl,
          });
          return response;
        }

        // Check if video failed
        if (response.status === 'failed' || response.status === 'error') {
          throw ErrorHandler.createError(
            ErrorCode.API_SERVER_ERROR,
            response.error || 'Video generation failed'
          );
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        Logger.error('HeyGenService: Error during video status polling', error);
        throw error;
      }
    }

    // Timeout
    throw ErrorHandler.createError(
      ErrorCode.VIDEO_GENERATION_TIMEOUT,
      'Video generation timed out'
    );
  }

  // ============================================================================
  // PHOTO AVATAR API
  // ============================================================================

  /**
   * Generate a photo avatar from parameters (AI-generated)
   * @param params Photo avatar generation parameters
   * @returns Photo generation response with generation_id and image_key
   */
  static async generatePhotoAvatar(params: PhotoAvatarParams): Promise<PhotoGenerationResponse> {
    Logger.info('HeyGenService: Generating photo avatar', { name: params.name });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.post<PhotoGenerationResponse>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/photo/generate`,
        {
          name: params.name,
          age: params.age,
          gender: params.gender,
          ethnicity: params.ethnicity,
          orientation: params.orientation || 'square',
          pose: params.pose || 'half_body',
          style: params.style,
          appearance: params.appearance,
          callback_url: params.callback_url,
          callback_id: params.callback_id,
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.code !== 100) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.message || 'Failed to generate photo avatar'
        );
      }

      Logger.info('HeyGenService: Photo avatar generation started', {
        generationId: response.data.data.generation_id,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to generate photo avatar', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Check photo generation status
   * @param generationId Generation ID from generatePhotoAvatar
   * @returns Photo generation status
   */
  static async checkPhotoGenerationStatus(generationId: string): Promise<PhotoGenerationStatus> {
    Logger.info('HeyGenService: Checking photo generation status', { generationId });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.get<PhotoGenerationStatus>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/photo/status/${generationId}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Photo generation status', {
        generationId,
        status: response.data.data.status,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to check photo generation status', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Poll photo generation status with retry logic
   * @param generationId Generation ID to poll
   * @param onProgress Optional progress callback
   * @param maxAttempts Maximum polling attempts (default: 60)
   * @param intervalMs Polling interval in milliseconds (default: 5000)
   * @returns Final photo generation status
   */
  static async pollPhotoGenerationStatus(
    generationId: string,
    onProgress?: (status: PhotoGenerationStatus) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<PhotoGenerationStatus> {
    Logger.info('HeyGenService: Starting to poll photo generation status', {
      generationId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkPhotoGenerationStatus(generationId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.data.status === 'completed') {
        Logger.info('HeyGenService: Photo generation completed', { generationId });
        return status;
      }

      if (status.data.status === 'failed') {
        throw ErrorHandler.createError(
          ErrorCode.VIDEO_GENERATION_FAILED,
          status.data.error || 'Photo generation failed'
        );
      }

      if (attempt < maxAttempts) {
        Logger.info(`HeyGenService: Photo still generating, attempt ${attempt}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Timeout
    throw ErrorHandler.createError(
      ErrorCode.VIDEO_GENERATION_TIMEOUT,
      'Photo generation timed out'
    );
  }

  /**
   * Create avatar group
   * @param params Avatar group parameters
   * @returns Avatar group response with avatar_group_id and avatar_id
   */
  static async createAvatarGroup(params: AvatarGroupParams): Promise<AvatarGroupResponse> {
    Logger.info('HeyGenService: Creating avatar group', { name: params.name });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.post<AvatarGroupResponse>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/avatar_group/create`,
        {
          name: params.name,
          image_key: params.image_key,
          generation_id: params.generation_id,
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.code !== 100) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.message || 'Failed to create avatar group'
        );
      }

      Logger.info('HeyGenService: Avatar group created', {
        avatarGroupId: response.data.data.avatar_group_id,
        avatarId: response.data.data.avatar_id,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to create avatar group', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Train avatar
   * @param groupId Avatar group ID
   * @returns Training response with job_id
   */
  static async trainAvatar(groupId: string): Promise<AvatarTrainingResponse> {
    Logger.info('HeyGenService: Training avatar', { groupId });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.post<AvatarTrainingResponse>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/train`,
        {
          group_id: groupId,
        },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.code !== 100) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          response.data.message || 'Failed to train avatar'
        );
      }

      Logger.info('HeyGenService: Avatar training started', {
        jobId: response.data.data.job_id,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to train avatar', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Check training status
   * @param jobId Training job ID
   * @returns Training status
   */
  static async checkTrainingStatus(jobId: string): Promise<AvatarTrainingStatus> {
    Logger.info('HeyGenService: Checking training status', { jobId });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.get<AvatarTrainingStatus>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/train/status/${jobId}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Training status', {
        jobId,
        status: response.data.data.status,
        progress: response.data.data.progress,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to check training status', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Poll training status with retry logic
   * @param jobId Training job ID to poll
   * @param onProgress Optional progress callback
   * @param maxAttempts Maximum polling attempts (default: 180)
   * @param intervalMs Polling interval in milliseconds (default: 10000)
   * @returns Final training status
   */
  static async pollTrainingStatus(
    jobId: string,
    onProgress?: (status: AvatarTrainingStatus) => void,
    maxAttempts: number = 180,
    intervalMs: number = 10000
  ): Promise<AvatarTrainingStatus> {
    Logger.info('HeyGenService: Starting to poll training status', {
      jobId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkTrainingStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.data.status === 'completed') {
        Logger.info('HeyGenService: Training completed', { jobId });
        return status;
      }

      if (status.data.status === 'failed') {
        throw ErrorHandler.createError(
          ErrorCode.VIDEO_GENERATION_FAILED,
          status.data.error || 'Training failed'
        );
      }

      if (attempt < maxAttempts) {
        Logger.info(`HeyGenService: Training in progress, attempt ${attempt}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Timeout
    throw ErrorHandler.createError(
      ErrorCode.VIDEO_GENERATION_TIMEOUT,
      'Training timed out'
    );
  }

  /**
   * Get photo avatar details
   * @param avatarId Avatar ID
   * @returns Photo avatar details
   */
  static async getPhotoAvatarDetails(avatarId: string): Promise<PhotoAvatarDetails> {
    Logger.info('HeyGenService: Getting photo avatar details', { avatarId });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.get<PhotoAvatarDetails>(
        `${HEYGEN_API_BASE_URL}/v2/photo_avatar/photo_avatar_details/${avatarId}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Photo avatar details retrieved', { avatarId });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to get photo avatar details', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  // ============================================================================
  // BRAND VOICE API
  // ============================================================================

  /**
   * List brand voices
   * @param limit Maximum number of voices to return (default: 100)
   * @param token Pagination token
   * @returns Brand voice list response
   */
  static async listBrandVoices(
    limit: number = 100,
    token?: string
  ): Promise<BrandVoiceListResponse> {
    Logger.info('HeyGenService: Listing brand voices', { limit });

    try {
      const apiKey = await this.getAPIKey();

      const params: Record<string, any> = { limit };
      if (token) {
        params.token = token;
      }

      const response = await axios.get<BrandVoiceListResponse>(
        `${HEYGEN_API_BASE_URL}/v1/brand_voice/list`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          params,
          timeout: REQUEST_TIMEOUT,
        }
      );

      // API response structure: { data: { brand_voices: [], total: number, next_token?: string } }
      const brandVoices = response.data.data?.brand_voices || [];
      const total = response.data.data?.total || 0;

      Logger.info('HeyGenService: Brand voices retrieved', {
        count: brandVoices.length,
        total,
      });

      return response.data;
    } catch (error) {
      Logger.error('HeyGenService: Failed to list brand voices', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Get all brand voices with pagination handling
   * @returns Array of all brand voices
   */
  static async getAllBrandVoices(): Promise<BrandVoice[]> {
    Logger.info('HeyGenService: Getting all brand voices');

    const allVoices: BrandVoice[] = [];
    let nextToken: string | undefined;

    try {
      do {
        const response = await this.listBrandVoices(100, nextToken);
        const voices = response.data?.brand_voices || [];
        allVoices.push(...voices);
        nextToken = response.data?.next_token;
      } while (nextToken);

      Logger.info('HeyGenService: Retrieved all brand voices', {
        total: allVoices.length,
      });

      return allVoices;
    } catch (error) {
      Logger.error('HeyGenService: Failed to get all brand voices', error);
      throw error;
    }
  }

  /**
   * Update brand voice settings
   * @param voiceId Brand voice ID
   * @param settings Settings to update
   */
  static async updateBrandVoice(
    voiceId: string,
    settings: BrandVoiceSettings
  ): Promise<void> {
    Logger.info('HeyGenService: Updating brand voice', { voiceId });

    try {
      const apiKey = await this.getAPIKey();

      await axios.post(
        `${HEYGEN_API_BASE_URL}/v1/brand_voice/${voiceId}`,
        settings,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Brand voice updated', { voiceId });
    } catch (error) {
      Logger.error('HeyGenService: Failed to update brand voice', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  // ============================================================================
  // Faz 1 - New Features: Quota, Video Management, Templates
  // ============================================================================

  /**
   * Get remaining quota (credits) for the authenticated user
   * @returns Remaining quota information (divide by 60 to get credits)
   */
  static async getRemainingQuota(): Promise<number> {
    Logger.info('HeyGenService: Getting remaining quota');

    try {
      const apiKey = await this.getAPIKey();

      // HeyGen API response structure: { error: null, data: { remaining_quota: number, details: {...} } }
      const response = await axios.get<HeyGenAPIResponse<HeyGenQuotaData>>(
        `${HEYGEN_API_BASE_URL}/v2/user/remaining_quota`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // DEBUG: Log full response to diagnose issue
      Logger.info('HeyGenService: Full API response', { 
        fullResponse: JSON.stringify(response.data, null, 2)
      });

      // Extract quota from nested data structure
      const quota = response.data?.data?.remaining_quota;
      
      Logger.info('HeyGenService: Extracted quota value', { 
        quota,
        type: typeof quota,
        rawData: response.data?.data
      });

      if (quota === undefined || quota === null || isNaN(quota)) {
        Logger.warn('HeyGenService: Invalid quota value received', { 
          response: response.data 
        });
        return 0;
      }

      const credits = quota / 60;
      Logger.info('HeyGenService: Remaining quota retrieved', { 
        quota,
        credits: credits.toFixed(2),
      });

      return credits;
    } catch (error) {
      Logger.error('HeyGenService: Failed to get remaining quota', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Delete a video by ID
   * @param videoId Video ID to delete
   */
  static async deleteVideo(videoId: string): Promise<void> {
    Logger.info('HeyGenService: Deleting video', { videoId });

    try {
      const apiKey = await this.getAPIKey();

      await axios.delete(
        `${HEYGEN_API_BASE_URL}/v1/video/${videoId}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Video deleted successfully', { videoId });
    } catch (error) {
      Logger.error('HeyGenService: Failed to delete video', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Get shareable URL for a video
   * @param videoId Video ID
   * @returns Shareable URL
   */
  static async getShareableUrl(videoId: string): Promise<string> {
    Logger.info('HeyGenService: Getting shareable URL', { videoId });

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.post<{
        code: number;
        data: {
          url: string;
          expires_at?: string;
        };
        message: string;
      }>(
        `${HEYGEN_API_BASE_URL}/v1/video/sharable_url`,
        { video_id: videoId },
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.code !== 100) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          `Failed to get shareable URL: ${response.data.message}`
        );
      }

      Logger.info('HeyGenService: Shareable URL retrieved', { 
        videoId,
        expiresAt: response.data.data.expires_at,
      });

      return response.data.data.url;
    } catch (error) {
      Logger.error('HeyGenService: Failed to get shareable URL', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * List videos from HeyGen account
   * @param limit Number of videos to retrieve (0-100)
   * @param folderId Optional folder ID to filter by
   * @param title Optional title to filter by
   * @param token Pagination token for next page
   * @returns List of videos with pagination info
   */
  static async listVideos(
    limit: number = 20,
    folderId?: string,
    title?: string,
    token?: string
  ): Promise<{
    videos: HeyGenVideo[];
    total: number;
    nextToken: string | null;
  }> {
    Logger.info('HeyGenService: Listing videos', { limit, folderId, title });

    try {
      const apiKey = await this.getAPIKey();

      const params: Record<string, any> = { limit };
      if (folderId) params.folder_id = folderId;
      if (title) params.title = title;
      if (token) params.token = token;

      const response = await axios.get<{
        code: number;
        data: {
          videos: Array<{
            video_id: string;
            status: 'completed' | 'processing' | 'failed' | 'draft';
            created_at: number;
            type: 'GENERATED' | 'TRANSLATED';
            folder_id?: string;
          }>;
          total: number;
          token: string | null;
        };
        message: string;
      }>(
        `${HEYGEN_API_BASE_URL}/v1/video.list`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          params,
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('HeyGenService: Videos retrieved', {
        count: response.data.data.videos.length,
        total: response.data.data.total,
      });

      return {
        videos: response.data.data.videos,
        total: response.data.data.total,
        nextToken: response.data.data.token,
      };
    } catch (error) {
      Logger.error('HeyGenService: Failed to list videos', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * List all templates available
   * @returns Array of templates
   */
  static async listTemplates(): Promise<HeyGenTemplate[]> {
    Logger.info('HeyGenService: Listing templates');

    try {
      const apiKey = await this.getAPIKey();

      // HeyGen API response structure: { error: null, data: { templates: [...] } }
      const response = await axios.get<HeyGenAPIResponse<HeyGenTemplatesData>>(
        `${HEYGEN_API_BASE_URL}/v2/templates`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Extract templates from nested data structure
      const templates = response.data?.data?.templates || [];

      Logger.info('HeyGenService: Templates retrieved', {
        count: templates.length,
      });

      return templates;
    } catch (error) {
      Logger.error('HeyGenService: Failed to list templates', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Generate video from template
   * @param templateId Template ID
   * @param variables Template variables (dynamic content)
   * @param title Optional video title
   * @returns Video generation response with video_id
   */
  static async generateFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    title?: string
  ): Promise<string> {
    Logger.info('HeyGenService: Generating video from template', {
      templateId,
      variables,
    });

    try {
      const apiKey = await this.getAPIKey();

      const requestBody: Record<string, unknown> = {
        template_id: templateId,
        variables,
      };

      if (title) {
        requestBody.title = title;
      }

      const response = await axios.post<HeyGenAPIResponse<HeyGenVideoIdData>>(
        `${HEYGEN_API_BASE_URL}/v2/template/${templateId}/generate`,
        requestBody,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.error) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          `Template generation failed: ${response.data.error}`
        );
      }

      const videoId = response.data.data.video_id;
      Logger.info('HeyGenService: Video generation from template started', {
        videoId,
      });

      return videoId;
    } catch (error) {
      Logger.error('HeyGenService: Failed to generate from template', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Get template details
   * @param templateId Template ID
   * @returns Template details including available variables
   */
  static async getTemplateDetails(templateId: string): Promise<unknown> {
    Logger.info('HeyGenService: Getting template details', { templateId });

    try {
      const apiKey = await this.getAPIKey();

      // HeyGen API response structure: { error: null, data: { template: {...} } }
      const response = await axios.get<HeyGenAPIResponse<unknown>>(
        `${HEYGEN_API_BASE_URL}/v2/template/${templateId}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      // Extract template details from nested structure
      const templateData = response.data?.data || response.data;

      Logger.info('HeyGenService: Template details retrieved');
      return templateData;
    } catch (error) {
      Logger.error('HeyGenService: Failed to get template details', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  // ============================================================================
  // Avatar IV (Instant Video) Methods
  // ============================================================================

  /**
   * Upload an asset (image) to HeyGen
   * @param imageUri Local file path to the image
   * @param fileName Optional file name
   * @returns Image key for use in video generation
   */
  static async uploadAsset(
    imageUri: string,
    fileName?: string
  ): Promise<string> {
    Logger.info('HeyGenService: Uploading asset', { imageUri, fileName });

    try {
      const apiKey = await this.getAPIKey();

      // Create FormData
      const formData = new FormData();
      // React Native FormData accepts file objects with uri, type, name properties
      // Type assertion necessary due to React Native's custom FormData implementation
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName || 'avatar.jpg',
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Upload to HeyGen asset endpoint
      const response = await axios.post<HeyGenAPIResponse<HeyGenAssetData>>(
        'https://upload.heygen.com/v1/asset',
        formData,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 seconds for upload
        }
      );

      if (response.data.error) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          `Asset upload failed: ${response.data.error}`
        );
      }

      const imageKey = response.data.data.image_key;
      Logger.info('HeyGenService: Asset uploaded successfully', { imageKey });

      return imageKey;
    } catch (error) {
      Logger.error('HeyGenService: Failed to upload asset', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Generate instant video from photo using Avatar IV
   * @param imageKey Image key from uploadAsset()
   * @param script Text content for the avatar to speak
   * @param voiceId Voice ID to use
   * @param title Optional video title
   * @param videoOrientation Optional video orientation ('landscape' | 'portrait' | 'square')
   * @returns Video ID for polling status
   */
  static async generateInstantVideo(
    imageKey: string,
    script: string,
    voiceId: string,
    title?: string,
    videoOrientation: 'landscape' | 'portrait' | 'square' = 'landscape'
  ): Promise<string> {
    Logger.info('HeyGenService: Generating instant video (Avatar IV)', {
      imageKey,
      voiceId,
      videoOrientation,
      scriptLength: script.length,
    });

    try {
      const apiKey = await this.getAPIKey();

      const requestBody = {
        image_key: imageKey,
        script: {
          type: 'text',
          input_text: script,
          voice_id: voiceId,
        },
        video_inputs: [
          {
            character: {
              type: 'photo_avatar',
              image_key: imageKey,
            },
            voice: {
              type: 'text',
              input_text: script,
              voice_id: voiceId,
            },
          },
        ],
        dimension: {
          width: videoOrientation === 'portrait' ? 1080 : videoOrientation === 'square' ? 1080 : 1920,
          height: videoOrientation === 'portrait' ? 1920 : videoOrientation === 'square' ? 1080 : 1080,
        },
        title: title || `Instant Video - ${new Date().toISOString()}`,
      };

      const response = await axios.post<HeyGenAPIResponse<HeyGenVideoIdData>>(
        `${HEYGEN_API_BASE_URL}/v2/video/generate`,
        requestBody,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (response.data.error) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          `Instant video generation failed: ${response.data.error}`
        );
      }

      const videoId = response.data.data.video_id;
      Logger.info('HeyGenService: Instant video generation started', { videoId });

      return videoId;
    } catch (error) {
      Logger.error('HeyGenService: Failed to generate instant video', error);
      throw ErrorHandler.handleAPIError(error as AxiosError);
    }
  }

  /**
   * Poll instant video status until completion
   * @param videoId Video ID from generateInstantVideo()
   * @param onProgress Optional progress callback
   * @param maxAttempts Maximum polling attempts (default: 60 = 5 minutes)
   * @param intervalMs Polling interval in milliseconds (default: 5000 = 5 seconds)
   * @returns Video URL when ready
   */
  static async pollInstantVideoStatus(
    videoId: string,
    onProgress?: (status: string) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<string> {
    Logger.info('HeyGenService: Polling instant video status', {
      videoId,
      maxAttempts,
      intervalMs,
    });

    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.getVideoStatus(videoId);

        Logger.info('HeyGenService: Instant video status check', {
          videoId,
          status: status.status,
          attempt: attempts + 1,
        });

        if (onProgress) {
          onProgress(status.status);
        }

        if (status.status === 'completed') {
          if (!status.resultUrl) {
            throw ErrorHandler.createError(
              ErrorCode.VIDEO_NOT_FOUND,
              'Video completed but URL not available'
            );
          }
          Logger.info('HeyGenService: Instant video ready', {
            videoId,
            videoUrl: status.resultUrl,
          });
          return status.resultUrl;
        }

        if (status.status === 'failed' || status.status === 'error') {
          throw ErrorHandler.createError(
            ErrorCode.VIDEO_GENERATION_FAILED,
            `Instant video generation failed: ${status.error || 'Unknown error'}`
          );
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        Logger.error('HeyGenService: Error polling instant video status', error);
        throw error;
      }
    }

    throw ErrorHandler.createError(
      ErrorCode.VIDEO_GENERATION_TIMEOUT,
      `Instant video generation timed out after ${maxAttempts * intervalMs / 1000} seconds`
    );
  }
}

