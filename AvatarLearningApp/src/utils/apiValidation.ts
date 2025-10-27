/**
 * API Validation Utilities
 * 
 * Provides functions to validate API keys for D-ID and HeyGen platforms
 * by making test requests to their respective APIs.
 */

import axios, { AxiosError } from 'axios';
import { encode as base64Encode } from 'base-64';
import { PlatformType } from '../types';
import { Logger } from './Logger';
import { ErrorHandler, ErrorCode } from './ErrorHandler';

/**
 * API validation result
 */
export interface APIValidationResult {
  isValid: boolean;
  message: string;
  errorCode?: ErrorCode;
  details?: any;
}

/**
 * D-ID API endpoints
 */
const DID_API_BASE_URL = 'https://api.d-id.com';
const DID_PRESENTERS_ENDPOINT = '/presenters';

/**
 * HeyGen API endpoints
 */
const HEYGEN_API_BASE_URL = 'https://api.heygen.com';
const HEYGEN_AVATARS_ENDPOINT = '/v2/avatars';

/**
 * ElevenLabs API endpoints
 */
const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io';
const ELEVENLABS_USER_ENDPOINT = '/v1/user';

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Maximum retry attempts for network errors
 */
const MAX_RETRY_ATTEMPTS = 2;

/**
 * Delay between retry attempts (ms)
 */
const RETRY_DELAY = 1000; // 1 second

/**
 * Retry helper function for API calls with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delay - Initial delay between attempts (doubles each retry)
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Only retry on network errors
      if (axios.isAxiosError(error) && !error.response) {
        if (attempt < maxAttempts) {
          Logger.warn(
            `apiValidation: Network error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
      }
      
      // Don't retry on other errors (auth, server errors, etc.)
      throw error;
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Validate D-ID API key
 * 
 * Makes a test request to the D-ID API to verify the API key is valid.
 * Uses the /presenters endpoint which is a simple GET request.
 * 
 * @param apiKey - D-ID API key to validate
 * @returns Promise<APIValidationResult> - Validation result
 */
export const validateDIDAPIKey = async (apiKey: string): Promise<APIValidationResult> => {
  Logger.info('APIValidation: Validating D-ID API key');
  try {
    // Wrap API call with retry logic for network stability
    await retryWithBackoff(async () => {
      // D-ID uses Basic Auth with format: Basic base64(apiKey:)
      const credentials = `${apiKey}:`;
      const encodedCredentials = base64Encode(credentials);
      
      // Use /credits endpoint for validation (simpler and available to all users)
      const response = await axios.get(`${DID_API_BASE_URL}/credits`, {
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT,
      });
      
      return response;
    });

    Logger.info('APIValidation: D-ID API key is valid');
    return {
      isValid: true,
      message: 'API key is valid',
    };
  } catch (error) {
    Logger.error('APIValidation: D-ID API key validation failed', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return {
          isValid: false,
          message: 'Request timeout. Please try again.',
          errorCode: ErrorCode.TIMEOUT_ERROR,
        };
      }
      
      if (!axiosError.response) {
        return {
          isValid: false,
          message: 'Network error. Please check your internet connection.',
          errorCode: ErrorCode.NETWORK_ERROR,
        };
      }
      
      const status = axiosError.response.status;
      
      if (status === 401 || status === 403) {
        return {
          isValid: false,
          message: 'Invalid API key. Please check your credentials.',
          errorCode: ErrorCode.API_KEY_INVALID,
        };
      }
      
      return {
        isValid: false,
        message: `API error: ${axiosError.message}`,
        errorCode: ErrorCode.API_SERVER_ERROR,
      };
    }
    
    return {
      isValid: false,
      message: 'Unknown error occurred during validation',
      errorCode: ErrorCode.UNKNOWN_ERROR,
    };
  }
};

/**
 * Validate HeyGen API key
 * 
 * Makes a test request to the HeyGen API to verify the API key is valid.
 * Uses the /v1/avatar.list endpoint which is a simple GET request.
 * 
 * @param apiKey - HeyGen API key to validate
 * @returns Promise<APIValidationResult> - Validation result
 */
/**
 * Validates HeyGen API key by attempting to fetch avatars
 * @param apiKey - The HeyGen API key to validate
 * @returns Validation result with isValid flag and optional error message
 */
export const validateHeyGenAPIKey = async (
  apiKey: string,
): Promise<APIValidationResult> => {
  Logger.info('apiValidation: Validating HeyGen API key');

  if (!apiKey || apiKey.trim().length === 0) {
    Logger.warn('apiValidation: Empty API key provided');
    return {
      isValid: false,
      message: 'API key cannot be empty',
      errorCode: ErrorCode.VALIDATION_ERROR,
    };
  }

  try {
    // Wrap API call with retry logic for network stability
    const response = await retryWithBackoff(async () => {
      return await axios.get(
        `${HEYGEN_API_BASE_URL}${HEYGEN_AVATARS_ENDPOINT}`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        },
      );
    });

    if (response.status === 200 && response.data) {
      Logger.info('apiValidation: HeyGen API key is valid');
      return {
        isValid: true,
        message: 'API key is valid',
      };
    }

    Logger.warn('apiValidation: Unexpected response from HeyGen API', {
      status: response.status,
    });
    return {
      isValid: false,
      message: 'Unexpected response from HeyGen API',
      errorCode: ErrorCode.UNKNOWN_ERROR,
    };
  } catch (error) {
    Logger.error('apiValidation: HeyGen API key validation failed', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          isValid: false,
          message: 'Connection timeout. Please check your internet connection.',
          errorCode: ErrorCode.TIMEOUT_ERROR,
        };
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return {
            isValid: false,
            message: 'Invalid API key. Please check your HeyGen API key.',
            errorCode: ErrorCode.API_KEY_INVALID,
          };
        }

        return {
          isValid: false,
          message: `HeyGen API error: ${error.response.statusText}`,
          errorCode: ErrorCode.API_SERVER_ERROR,
        };
      }

      return {
        isValid: false,
        message: 'Network error. Please check your internet connection.',
        errorCode: ErrorCode.NETWORK_ERROR,
      };
    }

    return {
      isValid: false,
      message: 'An unexpected error occurred',
      errorCode: ErrorCode.UNKNOWN_ERROR,
    };
  }
};

/**
 * Validates ElevenLabs API key by attempting to fetch user information
 * @param apiKey - The ElevenLabs API key to validate
 * @returns Validation result with isValid flag and optional error message
 */
export const validateElevenLabsAPIKey = async (
  apiKey: string,
): Promise<APIValidationResult> => {
  Logger.info('apiValidation: Validating ElevenLabs API key');

  if (!apiKey || apiKey.trim().length === 0) {
    Logger.warn('apiValidation: Empty API key provided');
    return {
      isValid: false,
      message: 'API key cannot be empty',
      errorCode: ErrorCode.VALIDATION_ERROR,
    };
  }

  try {
    // Wrap API call with retry logic for network stability
    const response = await retryWithBackoff(async () => {
      return await axios.get(
        `${ELEVENLABS_API_BASE_URL}${ELEVENLABS_USER_ENDPOINT}`,
        {
          headers: {
            'xi-api-key': apiKey,
          },
          timeout: REQUEST_TIMEOUT,
        },
      );
    });

    if (response.status === 200 && response.data) {
      Logger.info('apiValidation: ElevenLabs API key is valid');
      return {
        isValid: true,
        message: 'API key is valid',
      };
    }

    Logger.warn('apiValidation: Unexpected response from ElevenLabs API', {
      status: response.status,
    });
    return {
      isValid: false,
      message: 'Unexpected response from ElevenLabs API',
      errorCode: ErrorCode.UNKNOWN_ERROR,
    };
  } catch (error) {
    Logger.error('apiValidation: ElevenLabs API key validation failed', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          isValid: false,
          message: 'Connection timeout. Please check your internet connection.',
          errorCode: ErrorCode.TIMEOUT_ERROR,
        };
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return {
            isValid: false,
            message: 'Invalid API key. Please check your ElevenLabs API key.',
            errorCode: ErrorCode.API_KEY_INVALID,
          };
        }

        return {
          isValid: false,
          message: `ElevenLabs API error: ${error.response.statusText}`,
          errorCode: ErrorCode.API_SERVER_ERROR,
        };
      }

      return {
        isValid: false,
        message: 'Network error. Please check your internet connection.',
        errorCode: ErrorCode.NETWORK_ERROR,
      };
    }

    return {
      isValid: false,
      message: 'An unexpected error occurred',
      errorCode: ErrorCode.UNKNOWN_ERROR,
    };
  }
};

/**
 * Validate API key for any platform
 * 
 * @param platform - Platform type
 * @param apiKey - API key to validate
 * @returns Promise<APIValidationResult> - Validation result
 */
export async function validateAPIKey(
  platform: PlatformType,
  apiKey: string
): Promise<APIValidationResult> {
  switch (platform) {
    case 'did':
      return validateDIDAPIKey(apiKey);
    case 'heygen':
      return validateHeyGenAPIKey(apiKey);
    case 'elevenlabs':
      return validateElevenLabsAPIKey(apiKey);
    default:
      return {
        isValid: false,
        message: `Unknown platform: ${platform}`,
        errorCode: ErrorCode.UNKNOWN_ERROR,
      };
  }
}

/**
 * Handle API validation errors
 * 
 * @param error - Axios error
 * @param platform - Platform type
 * @returns APIValidationResult - Validation result with error details
 */
function handleAPIValidationError(
  error: AxiosError,
  platform: PlatformType
): APIValidationResult {
  // Network error
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        isValid: false,
        message: 'Request timed out. Please check your internet connection and try again.',
        errorCode: ErrorCode.TIMEOUT_ERROR,
      };
    }

    return {
      isValid: false,
      message: 'Network error. Please check your internet connection.',
      errorCode: ErrorCode.NETWORK_ERROR,
    };
  }

  // HTTP error responses
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 401:
      return {
        isValid: false,
        message: 'Invalid API key. Please check your API key and try again.',
        errorCode: ErrorCode.API_KEY_INVALID,
        details: { status, data },
      };

    case 403:
      return {
        isValid: false,
        message: 'Access forbidden. Your API key may not have the required permissions.',
        errorCode: ErrorCode.API_UNAUTHORIZED,
        details: { status, data },
      };

    case 429:
      return {
        isValid: false,
        message: 'Rate limit exceeded. Please try again later.',
        errorCode: ErrorCode.API_RATE_LIMIT,
        details: { status, data },
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        isValid: false,
        message: `${platform.toUpperCase()} server error. Please try again later.`,
        errorCode: ErrorCode.API_SERVER_ERROR,
        details: { status, data },
      };

    default:
      return {
        isValid: false,
        message: `API validation failed with status ${status}. Please check your API key.`,
        errorCode: ErrorCode.API_KEY_INVALID,
        details: { status, data },
      };
  }
}

