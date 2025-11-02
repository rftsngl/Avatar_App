/**
 * GeminiService.ts
 * 
 * AI-powered sentence generation service using Google Gemini API.
 * 
 * Features:
 * - Generate learning sentences by topic and level
 * - Batch generation (10 sentences per request)
 * - Translation to user's native language
 * - Difficulty adjustment based on CEFR level
 * - Rate limit: 60 requests/minute (free tier)
 * 
 * API Documentation:
 * https://ai.google.dev/gemini-api/docs
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import axios from 'axios';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { SecureStorageService } from '../storage/SecureStorageService';
import type { AISentence, AISentenceSet, LearningTopic, LanguageLevel } from '../../types';

/**
 * Base URL for Gemini API
 * Official endpoint: https://generativelanguage.googleapis.com/v1beta
 */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Model to use (gemini-2.5-flash is the latest stable model)
 * Note: gemini-1.5-flash was removed from v1beta API
 */
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Request timeout (30 seconds)
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Topic descriptions for prompt engineering
 */
const TOPIC_DESCRIPTIONS: Record<LearningTopic, string> = {
  greetings: 'greetings, introductions, meeting people',
  daily_conversation: 'everyday conversations, casual talk, common phrases',
  business: 'business meetings, professional communication, workplace language',
  travel: 'traveling, airports, hotels, asking directions',
  food: 'restaurants, ordering food, cooking, recipes',
  shopping: 'shopping, buying things, prices, stores',
  weather: 'weather, seasons, climate, temperature',
  hobbies: 'hobbies, interests, leisure activities, sports',
};

/**
 * CEFR level descriptions for prompt engineering
 */
const LEVEL_DESCRIPTIONS: Record<LanguageLevel, string> = {
  A1: 'beginner (A1): very simple sentences, basic vocabulary, present tense',
  A2: 'elementary (A2): simple sentences, common vocabulary, basic past/future',
  B1: 'intermediate (B1): clear standard sentences, everyday vocabulary, various tenses',
  B2: 'upper-intermediate (B2): complex sentences, abstract topics, advanced vocabulary',
  C1: 'advanced (C1): sophisticated sentences, nuanced expressions, idiomatic language',
  C2: 'proficient (C2): near-native sentences, complex structures, specialized vocabulary',
};

/**
 * Gemini API response interface
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

/**
 * Gemini Service for AI sentence generation
 */
export class GeminiService {
  /**
   * Get Gemini API key from secure storage
   */
  private static async getAPIKey(): Promise<string> {
    Logger.info('GeminiService: Retrieving API key');
    
    const apiKey = await SecureStorageService.getGeminiAPIKey();
    
    if (!apiKey) {
      Logger.error('GeminiService: API key not found');
      throw ErrorHandler.createError(
        ErrorCode.API_KEY_MISSING,
        'Gemini API key not configured. Please add it in Settings.'
      );
    }
    
    return apiKey;
  }
  
  /**
   * Validate Gemini API key
   */
  static async validateAPIKey(apiKey: string): Promise<boolean> {
    Logger.info('GeminiService: Validating API key');
    
    try {
      const response = await axios.post<GeminiResponse>(
        `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: 'Hello',
            }],
          }],
        },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const hasValidResponse = response.data.candidates && 
                              response.data.candidates.length > 0;
      
      Logger.info('GeminiService: API key validation result', { valid: hasValidResponse });
      return hasValidResponse;
      
    } catch (error) {
      Logger.error('GeminiService: API key validation failed', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        
        if (status === 400 || status === 403) {
          return false; // Invalid key
        }
      }
      
      throw ErrorHandler.handleAPIError(error);
    }
  }
  
  /**
   * Generate AI sentences for learning
   * 
   * @param topic - Learning topic
   * @param level - Language proficiency level
   * @param targetLanguage - Target language code (e.g., 'en-US', 'tr-TR')
   * @param nativeLanguage - User's native language for translations (e.g., 'Turkish', 'English')
   * @param count - Number of sentences to generate (default: 10)
   * @returns Generated sentence set
   */
  static async generateSentences(
    topic: LearningTopic,
    level: LanguageLevel,
    targetLanguage: string,
    nativeLanguage: string,
    count: number = 10
  ): Promise<AISentenceSet> {
    Logger.info('GeminiService: Generating sentences', { 
      topic, 
      level, 
      targetLanguage, 
      nativeLanguage, 
      count 
    });
    
    try {
      const apiKey = await this.getAPIKey();
      
      // Build prompt for Gemini
      const prompt = this.buildPrompt(topic, level, targetLanguage, nativeLanguage, count);
      
      // Call Gemini API
      const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
      Logger.info('GeminiService: API Request', { 
        url: `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=***`,
        model: GEMINI_MODEL 
      });
      
      const response = await axios.post<GeminiResponse>(
        url,
        {
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
          generationConfig: {
            temperature: 0.7,  // Balanced creativity
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 4096,  // Increased for complete JSON responses with 10 sentences
          },
        },
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Check for blocked content
      if (response.data.promptFeedback?.blockReason) {
        Logger.error('GeminiService: Content blocked', { 
          reason: response.data.promptFeedback.blockReason 
        });
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'Content generation blocked by safety filters'
        );
      }
      
      // Extract text response
      const candidates = response.data.candidates;
      if (!candidates || candidates.length === 0) {
        Logger.error('GeminiService: No candidates in response', { 
          response: response.data 
        });
        throw ErrorHandler.createError(
          ErrorCode.API_SERVER_ERROR,
          'No response from Gemini API'
        );
      }
      
      const generatedText = candidates[0].content.parts[0].text;
      
      Logger.info('GeminiService: Generated text received', {
        length: generatedText?.length || 0,
        preview: generatedText?.substring(0, 300) || '(empty)',
      });
      
      // Parse JSON response
      const sentences = this.parseGeminiResponse(generatedText, topic, level);
      
      // Create sentence set
      const sentenceSet: AISentenceSet = {
        id: `set_${Date.now()}`,
        topic,
        level,
        sentences,
        createdAt: new Date().toISOString(),
      };
      
      Logger.info('GeminiService: Successfully generated sentences', { 
        count: sentences.length,
        setId: sentenceSet.id,
      });
      
      return sentenceSet;
      
    } catch (error) {
      Logger.error('GeminiService: Failed to generate sentences', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        Logger.error('GeminiService: API Error Details', {
          status,
          statusText: error.response?.statusText,
          errorData,
          url: error.config?.url?.replace(/key=.+/, 'key=***'),
        });
        
        // Specific error messages for common issues
        if (status === 404) {
          throw ErrorHandler.createError(
            ErrorCode.API_SERVER_ERROR,
            'Gemini API endpoint not found. Please check your API key and ensure the Gemini API is enabled for your project.'
          );
        }
        
        throw ErrorHandler.handleAPIError(error);
      }
      
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to generate sentences with AI'
      );
    }
  }
  
  /**
   * Build prompt for Gemini API
   */
  private static buildPrompt(
    topic: LearningTopic,
    level: LanguageLevel,
    targetLanguage: string,
    nativeLanguage: string,
    count: number
  ): string {
    const topicDesc = TOPIC_DESCRIPTIONS[topic];
    const levelDesc = LEVEL_DESCRIPTIONS[level];
    
    return `You are a language learning assistant. Generate ${count} practice sentences for language learners.

REQUIREMENTS:
- Topic: ${topicDesc}
- Level: ${levelDesc}
- Target language: ${targetLanguage}
- Provide ${nativeLanguage} translations
- Each sentence should be realistic and practical
- Vary sentence length and complexity appropriately for the level
- Include helpful pronunciation/grammar tips

OUTPUT FORMAT (JSON ONLY):
{
  "sentences": [
    {
      "text": "The sentence in ${targetLanguage}",
      "translation": "Translation in ${nativeLanguage}",
      "difficulty": "easy|medium|hard",
      "tips": "Helpful tip for pronunciation or grammar"
    }
  ]
}

Generate exactly ${count} sentences. Output ONLY valid JSON, no additional text.`;
  }
  
  /**
   * Parse Gemini response and convert to AISentence array
   */
  private static parseGeminiResponse(
    responseText: string,
    topic: LearningTopic,
    level: LanguageLevel
  ): AISentence[] {
    Logger.info('GeminiService: Parsing response');
    
    try {
      // Log raw response for debugging
      Logger.info('GeminiService: Raw response', {
        length: responseText?.length || 0,
        preview: responseText?.substring(0, 200) || '(empty)',
      });
      
      // Remove markdown code blocks if present
      const cleanedText = responseText
        .replace(/```json\n/g, '')
        .replace(/```\n/g, '')
        .replace(/```/g, '')
        .trim();
      
      Logger.info('GeminiService: Cleaned text', {
        length: cleanedText.length,
        preview: cleanedText.substring(0, 200),
      });
      
      // Parse JSON
      const parsed = JSON.parse(cleanedText);
      
      if (!parsed.sentences || !Array.isArray(parsed.sentences)) {
        throw new Error('Invalid response format: missing sentences array');
      }
      
      // Convert to AISentence format
      const sentences: AISentence[] = parsed.sentences.map((item: any, index: number) => {
        if (!item.text || !item.translation) {
          throw new Error(`Invalid sentence format at index ${index}`);
        }
        
        return {
          id: `sentence_${Date.now()}_${index}`,
          text: item.text,
          translation: item.translation,
          difficulty: item.difficulty || 'medium',
          topic,
          level,
          tips: item.tips,
          createdAt: new Date().toISOString(),
        };
      });
      
      Logger.info('GeminiService: Successfully parsed sentences', { 
        count: sentences.length 
      });
      
      return sentences;
      
    } catch (error) {
      Logger.error('GeminiService: Failed to parse response', error);
      throw ErrorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to parse AI response. Please try again.'
      );
    }
  }
  
  /**
   * Save Gemini API key to secure storage
   */
  static async saveAPIKey(apiKey: string): Promise<void> {
    Logger.info('GeminiService: Saving API key');
    
    try {
      await SecureStorageService.saveGeminiAPIKey(apiKey);
      Logger.info('GeminiService: API key saved successfully');
    } catch (error) {
      Logger.error('GeminiService: Failed to save API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to save Gemini API key'
      );
    }
  }
  
  /**
   * Check if Gemini API key exists
   */
  static async hasAPIKey(): Promise<boolean> {
    try {
      const apiKey = await SecureStorageService.getGeminiAPIKey();
      return !!apiKey;
    } catch (error) {
      Logger.error('GeminiService: Failed to check API key', error);
      return false;
    }
  }
  
  /**
   * Remove Gemini API key from secure storage
   */
  static async removeAPIKey(): Promise<void> {
    Logger.info('GeminiService: Removing API key');
    
    try {
      await SecureStorageService.deleteGeminiAPIKey();
      Logger.info('GeminiService: API key removed successfully');
    } catch (error) {
      Logger.error('GeminiService: Failed to remove API key', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to remove Gemini API key'
      );
    }
  }
}
