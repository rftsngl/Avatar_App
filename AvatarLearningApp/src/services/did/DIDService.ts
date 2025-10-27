/**
 * D-ID Service
 * 
 * ============================================================================
 * DEACTIVATED: D-ID Platform Removed (2025-10-27)
 * ============================================================================
 * This service is no longer used as the app now supports HeyGen only.
 * Code is kept for reference but should NOT be called.
 * 
 * All D-ID features removed:
 * - Voice cloning (user custom voices)
 * - Custom avatar creation (D-ID image upload)
 * - D-ID video generation
 * 
 * Replaced by:
 * - HeyGen stock voices (no voice cloning)
 * - HeyGen Avatar IV (instant photo avatars)
 * - HeyGen video generation
 * ============================================================================
 * 
 * Handles all interactions with the D-ID API including:
 * - Fetching presenters (avatars)
 * - Fetching voices
 * - Creating video clips
 */

import axios, { AxiosError } from 'axios';
import { encode as base64Encode } from 'base-64';
import { Platform } from 'react-native';
import {
  DIDPresenter,
  DIDAvatar,
  Voice,
  VoiceProvider,
  AvatarGender,
  VideoGenerationRequest,
  VideoGenerationResponse,
  DIDClipsResponse,
  VideoStatus,
  VideoMetadata,
  DIDVoiceData,
} from '../../types';
import { SecureStorageService } from '../storage/SecureStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';

/**
 * D-ID API configuration
 */
const DID_API_BASE_URL = 'https://api.d-id.com';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * D-ID API response for presenters list
 */
interface DIDPresentersResponse {
  presenters: DIDPresenter[];
}

/**
 * D-ID API response for voices list
 */
interface DIDVoicesResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    language: string;
    language_code: string;
    gender: string;
    provider: {
      type: VoiceProvider;
    };
  }>;
}

/**
 * D-ID Service
 */
export class DIDService {
  /**
   * Get D-ID API key from secure storage and encode it for Basic Auth
   */
  private static async getAPIKey(): Promise<string> {
    const apiKey = await SecureStorageService.getAPIKey('did');
    
    if (!apiKey) {
      Logger.error('DIDService: No API key found');
      throw ErrorHandler.createError(
        ErrorCode.API_KEY_MISSING,
        'D-ID API key not found. Please configure your API key in settings.'
      );
    }

    return apiKey;
  }

  /**
   * Get authorization header value for D-ID API
   * D-ID uses Basic Auth with format: Basic base64(apiKey:)
   * Note the colon after the API key
   */
  private static getAuthHeader(apiKey: string): string {
    // D-ID API expects: Basic base64(apiKey:)
    // The colon is required even though there's no password
    const credentials = `${apiKey}:`;
    const encodedCredentials = base64Encode(credentials);
    
    // Debug log (remove after testing)
    Logger.info('DIDService: Auth header created', {
      apiKeyLength: apiKey.length,
      apiKeyPreview: `${apiKey.substring(0, 8)}...`,
      encodedLength: encodedCredentials.length,
    });
    
    return `Basic ${encodedCredentials}`;
  }

  /**
   * Fetch all presenters (avatars) from D-ID
   * 
   * @returns Promise<DIDAvatar[]> - List of D-ID avatars
   */
  static async fetchPresenters(): Promise<DIDAvatar[]> {
    Logger.info('DIDService: Fetching presenters');

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.get<DIDPresentersResponse>(
        `${DID_API_BASE_URL}/presenters`,
        {
          headers: {
            'Authorization': this.getAuthHeader(apiKey),
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (!response.data || !response.data.presenters) {
        Logger.warn('DIDService: Invalid response format', response.data);
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Invalid response from D-ID API'
        );
      }

      // Transform D-ID presenters to our Avatar format
      const avatars: DIDAvatar[] = response.data.presenters.map((presenter) => ({
        id: presenter.presenter_id,
        presenterId: presenter.presenter_id,
        name: presenter.name,
        gender: presenter.gender,
        thumbnailUrl: presenter.thumbnail_url,
        previewUrl: presenter.preview_url,
        platform: 'did' as const,
        defaultVoiceId: presenter.voice?.voice_id,
        defaultVoiceProvider: presenter.voice?.type,
      }));

      Logger.info(`DIDService: Successfully fetched ${avatars.length} presenters`);
      return avatars;
    } catch (error) {
      Logger.error('DIDService: Error fetching presenters', error);
      
      if (axios.isAxiosError(error)) {
        throw ErrorHandler.handleAPIError(error);
      }
      
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch D-ID presenters'
      );
    }
  }

  /**
   * Fetch voices from D-ID
   * 
   * Note: D-ID uses third-party voice providers (Microsoft, ElevenLabs, Amazon)
   * This method fetches available voices from the D-ID API
   * 
   * @param provider - Optional voice provider filter
   * @returns Promise<Voice[]> - List of voices
   */
  static async fetchVoices(provider?: VoiceProvider): Promise<Voice[]> {
    Logger.info('DIDService: Fetching voices', { provider });

    try {
      const apiKey = await this.getAPIKey();

      // Build query parameters
      const params: Record<string, string> = {};
      if (provider) {
        params.provider = provider;
      }

      const response = await axios.get<DIDVoicesResponse>(
        `${DID_API_BASE_URL}/voices`,
        {
          headers: {
            'Authorization': this.getAuthHeader(apiKey),
            'Content-Type': 'application/json',
          },
          params,
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (!response.data || !response.data.voices) {
        Logger.warn('DIDService: Invalid voices response format', response.data);
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Invalid response from D-ID API'
        );
      }

      // Transform D-ID voices to our Voice format
      const voices: Voice[] = response.data.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.language,
        languageCode: voice.language_code,
        gender: this.parseGender(voice.gender),
        provider: voice.provider.type,
        platform: 'did' as const,
      }));

      Logger.info(`DIDService: Successfully fetched ${voices.length} voices`);
      return voices;
    } catch (error) {
      Logger.error('DIDService: Error fetching voices', error);
      
      if (axios.isAxiosError(error)) {
        throw ErrorHandler.handleAPIError(error);
      }
      
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to fetch D-ID voices'
      );
    }
  }

  /**
   * Fetch Microsoft voices specifically
   * 
   * @returns Promise<Voice[]> - List of Microsoft voices
   */
  static async fetchMicrosoftVoices(): Promise<Voice[]> {
    return this.fetchVoices('microsoft');
  }

  /**
   * Fetch ElevenLabs voices specifically
   * 
   * @returns Promise<Voice[]> - List of ElevenLabs voices
   */
  static async fetchElevenLabsVoices(): Promise<Voice[]> {
    return this.fetchVoices('elevenlabs');
  }

  /**
   * Fetch Amazon voices specifically
   * 
   * @returns Promise<Voice[]> - List of Amazon voices
   */
  static async fetchAmazonVoices(): Promise<Voice[]> {
    return this.fetchVoices('amazon');
  }

  /**
   * Get a specific presenter by ID
   * 
   * @param presenterId - Presenter ID
   * @returns Promise<DIDAvatar | null> - Avatar or null if not found
   */
  static async getPresenter(presenterId: string): Promise<DIDAvatar | null> {
    Logger.info(`DIDService: Fetching presenter ${presenterId}`);

    try {
      const apiKey = await this.getAPIKey();

      const response = await axios.get<DIDPresenter>(
        `${DID_API_BASE_URL}/presenters/${presenterId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(apiKey),
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      if (!response.data) {
        return null;
      }

      const presenter = response.data;
      const avatar: DIDAvatar = {
        id: presenter.presenter_id,
        presenterId: presenter.presenter_id,
        name: presenter.name,
        gender: presenter.gender,
        thumbnailUrl: presenter.thumbnail_url,
        previewUrl: presenter.preview_url,
        platform: 'did' as const,
        defaultVoiceId: presenter.voice?.voice_id,
        defaultVoiceProvider: presenter.voice?.type,
      };

      Logger.info(`DIDService: Successfully fetched presenter ${presenterId}`);
      return avatar;
    } catch (error) {
      Logger.error(`DIDService: Error fetching presenter ${presenterId}`, error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      
      throw ErrorHandler.handleAPIError(error);
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

    return 'male'; // Default to male instead of neutral
  }

  // ============================================================================
  // Video Generation Methods
  // ============================================================================

  /**
   * Create a video clip using D-ID Clips API
   *
   * @param request - Video generation request
   * @returns Video generation response with clip ID
   */
  static async createVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      Logger.info('DIDService: Creating video clip', {
        avatarId: request.avatarId,
        voiceId: request.voiceId,
        textLength: request.text.length,
      });

      // Get API key
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          'D-ID API key not found'
        );
      }

      // Prepare request body
      const requestBody = {
        script: {
          type: 'text',
          input: request.text,
          provider: {
            type: 'microsoft', // Always use microsoft as default
            voice_id: request.voiceId,
          },
        },
        presenter_id: request.avatarId,
        config: {
          result_format: 'mp4',
        },
      };

      // Make API request
      const response = await axios.post<DIDClipsResponse>(
        `${DID_API_BASE_URL}/clips`,
        requestBody,
        {
          headers: {
            'Authorization': this.getAuthHeader(apiKey),
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('DIDService: Video clip created', {
        clipId: response.data.id,
        status: response.data.status,
      });

      return {
        id: response.data.id,
        status: response.data.status,
        resultUrl: response.data.result_url,
      };
    } catch (error) {
      Logger.error('DIDService: Failed to create video clip', error);
      throw ErrorHandler.handleAPIError(error);
    }
  }

  /**
   * Get video clip status
   *
   * @param clipId - Clip ID
   * @returns Video generation response with current status
   */
  static async getVideoStatus(clipId: string): Promise<VideoGenerationResponse> {
    try {
      Logger.info('DIDService: Getting video clip status', { clipId });

      // Get API key
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          'D-ID API key not found'
        );
      }

      // Make API request
      const response = await axios.get<DIDClipsResponse>(
        `${DID_API_BASE_URL}/clips/${clipId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(apiKey),
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('DIDService: Video clip status retrieved', {
        clipId,
        status: response.data.status,
        hasResultUrl: !!response.data.result_url,
      });

      return {
        id: response.data.id,
        status: response.data.status,
        resultUrl: response.data.result_url,
      };
    } catch (error) {
      Logger.error('DIDService: Failed to get video clip status', error);
      throw ErrorHandler.handleAPIError(error);
    }
  }

  /**
   * Poll video status until completion or timeout
   *
   * @param clipId - Clip ID
   * @param onProgress - Callback for progress updates
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param intervalMs - Polling interval in milliseconds (default: 5000)
   * @returns Final video generation response
   */
  static async pollVideoStatus(
    clipId: string,
    onProgress?: (status: VideoStatus) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<VideoGenerationResponse> {
    Logger.info('DIDService: Starting video status polling', {
      clipId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.getVideoStatus(clipId);

        // Call progress callback
        if (onProgress) {
          onProgress(response.status);
        }

        // Check if video is done
        if (response.status === 'done' || response.status === 'completed') {
          Logger.info('DIDService: Video generation completed', {
            clipId,
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
        Logger.error('DIDService: Error during video status polling', error);
        throw error;
      }
    }

    // Timeout
    throw ErrorHandler.createError(
      ErrorCode.TIMEOUT_ERROR,
      'Video generation timed out'
    );
  }

  /**
   * Clone a voice by uploading audio sample
   *
   * @param audioFilePath - Path to the audio file containing voice sample
   * @param voiceName - Name for the cloned voice
   * @returns Voice ID of the cloned voice
   */
  static async cloneVoice(
    audioFilePath: string,
    voiceName: string
  ): Promise<string> {
    try {
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          'D-ID API key not found'
        );
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${audioFilePath}` : audioFilePath,
        type: 'audio/m4a',
        name: 'voice_sample.m4a',
      } as any);

      Logger.info('DIDService: Cloning voice', { voiceName });

      const response = await axios.post(
        `${DID_API_BASE_URL}/tts/voices`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 seconds for upload
        }
      );

      const voiceId = response.data.id || response.data.voice_id;

      Logger.info('DIDService: Voice cloned successfully', {
        voiceName,
        voiceId,
      });

      return voiceId;
    } catch (error) {
      Logger.error('DIDService: Failed to clone voice', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data as any;

          if (status === 401) {
            throw ErrorHandler.createError(
              ErrorCode.API_UNAUTHORIZED,
              'Invalid API key'
            );
          } else if (status === 403) {
            throw ErrorHandler.createError(
              ErrorCode.API_UNAUTHORIZED,
              'Voice cloning not available on your plan. Please upgrade to Pro or higher.'
            );
          } else if (status === 400) {
            throw ErrorHandler.createError(
              ErrorCode.VALIDATION_ERROR,
              data.message || 'Invalid audio file or voice name'
            );
          }
        }
      }

      throw ErrorHandler.createError(
        ErrorCode.API_SERVER_ERROR,
        'Failed to clone voice'
      );
    }
  }

  /**
   * Get all cloned voices for the current user
   *
   * @returns Array of cloned voices
   */
  static async getClonedVoices(): Promise<Voice[]> {
    try {
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        return []; // Return empty array if no API key
      }

      Logger.info('DIDService: Fetching cloned voices');

      const response = await axios.get(
        `${DID_API_BASE_URL}/tts/voices`,
        {
          headers: {
            'Authorization': `Basic ${apiKey}`,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      const voices = response.data.voices || response.data || [];

      // Map to Voice interface
      const clonedVoices: Voice[] = voices
        .filter((v: DIDVoiceData) => v.is_cloned || v.owner_id) // Filter only cloned voices
        .map((voice: DIDVoiceData) => ({
          id: voice.voice_id || voice.id || '',
          name: voice.name,
          language: voice.language || 'Unknown',
          languageCode: voice.language_code || 'en-US',
          gender: voice.gender === 'male' ? 'male' : voice.gender === 'female' ? 'female' : 'neutral',
          provider: 'did' as VoiceProvider,
          previewUrl: voice.preview_url,
          isCloned: true,
        }));

      Logger.info('DIDService: Cloned voices fetched', {
        count: clonedVoices.length,
      });

      return clonedVoices;
    } catch (error) {
      Logger.error('DIDService: Failed to fetch cloned voices', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Delete a cloned voice
   *
   * @param voiceId - ID of the voice to delete
   */
  static async deleteClonedVoice(voiceId: string): Promise<void> {
    try {
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          'D-ID API key not found'
        );
      }

      Logger.info('DIDService: Deleting cloned voice', { voiceId });

      await axios.delete(
        `${DID_API_BASE_URL}/tts/voices/${voiceId}`,
        {
          headers: {
            'Authorization': `Basic ${apiKey}`,
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      Logger.info('DIDService: Cloned voice deleted', { voiceId });
    } catch (error) {
      Logger.error('DIDService: Failed to delete cloned voice', error);
      throw ErrorHandler.createError(
        ErrorCode.API_SERVER_ERROR,
        'Failed to delete cloned voice'
      );
    }
  }

  // ============================================================================
  // Custom Avatar Creation Methods
  // ============================================================================

  /**
   * Upload image to D-ID for custom avatar creation
   *
   * @param imageFilePath - Local file path to the image
   * @returns Promise<string> - D-ID image URL
   */
  static async uploadImage(imageFilePath: string): Promise<string> {
    try {
      Logger.info('DIDService: Uploading image for custom avatar', { imageFilePath });

      // Get API key
      const apiKey = await SecureStorageService.getAPIKey('did');

      if (!apiKey) {
        throw ErrorHandler.createError(
          ErrorCode.API_KEY_MISSING,
          'D-ID API key not found'
        );
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'android' ? `file://${imageFilePath}` : imageFilePath,
        type: 'image/jpeg',
        name: 'avatar_photo.jpg',
      } as any);

      // Upload image
      const response = await axios.post(
        `${DID_API_BASE_URL}/images`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 seconds for image upload
        }
      );

      const imageUrl = response.data.url;

      if (!imageUrl) {
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Image URL not returned from D-ID API'
        );
      }

      Logger.info('DIDService: Image uploaded successfully', { imageUrl });

      return imageUrl;
    } catch (error) {
      Logger.error('DIDService: Error uploading image', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 401) {
          throw ErrorHandler.createError(
            ErrorCode.API_UNAUTHORIZED,
            'Invalid D-ID API key'
          );
        }

        if (axiosError.response?.status === 400) {
          throw ErrorHandler.createError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid image file. Please use a clear photo of your face.'
          );
        }
      }

      throw ErrorHandler.createError(
        ErrorCode.API_SERVER_ERROR,
        'Failed to upload image to D-ID'
      );
    }
  }

  /**
   * Get all custom avatars (uploaded images)
   * Note: D-ID doesn't have a dedicated endpoint for listing uploaded images,
   * so we rely on local storage to track custom avatars
   *
   * @returns Promise<string[]> - Array of image URLs
   */
  static async getCustomAvatars(): Promise<string[]> {
    try {
      Logger.info('DIDService: Getting custom avatars');

      // D-ID doesn't provide an endpoint to list uploaded images
      // Custom avatars are tracked locally via AvatarStorageService
      Logger.info('DIDService: Custom avatars are tracked locally');

      return [];
    } catch (error) {
      Logger.error('DIDService: Error getting custom avatars', error);
      return [];
    }
  }

  /**
   * Delete custom avatar (uploaded image)
   * Note: D-ID doesn't provide an endpoint to delete uploaded images
   * Images are automatically deleted after 24 hours
   *
   * @param imageUrl - D-ID image URL
   * @returns Promise<void>
   */
  static async deleteCustomAvatar(imageUrl: string): Promise<void> {
    try {
      Logger.info('DIDService: Deleting custom avatar', { imageUrl });

      // D-ID doesn't provide an endpoint to delete uploaded images
      // Images are automatically deleted after 24 hours
      Logger.info('DIDService: D-ID images are automatically deleted after 24 hours');
    } catch (error) {
      Logger.error('DIDService: Error deleting custom avatar', error);
    }
  }
}

