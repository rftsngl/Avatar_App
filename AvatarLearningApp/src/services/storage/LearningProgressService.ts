/**
 * LearningProgressService.ts
 * 
 * Learning progress tracking service for Learn mode.
 * Manages user's progress through AI-generated sentences.
 * 
 * Features:
 * - Track current topic, level, and sentence position
 * - Save completed sentence sets
 * - Store practice results with pronunciation scores
 * - Calculate statistics (average score, weak words)
 * - AsyncStorage persistence
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import { AsyncStorageService } from './AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import type {
  LearningProgress,
  PracticeResult,
  LearningTopic,
  LanguageLevel,
} from '../../types';

/**
 * Storage key for learning progress
 */
const LEARNING_PROGRESS_KEY = 'learning_progress';

/**
 * Learning Progress Service
 */
export class LearningProgressService {
  /**
   * Initialize new learning progress for user
   */
  static async initializeProgress(
    userId: string,
    topic: LearningTopic,
    level: LanguageLevel
  ): Promise<LearningProgress> {
    Logger.info('LearningProgressService: Initializing progress', { userId, topic, level });
    
    try {
      const progress: LearningProgress = {
        userId,
        currentTopic: topic,
        currentLevel: level,
        currentSetId: '',
        currentSentenceIndex: 0,
        completedSets: [],
        sentenceResults: [],
        totalSentences: 0,
        averageScore: 0,
        weakWords: [],
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Progress initialized successfully');
      return progress;
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to initialize progress', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to initialize learning progress'
      );
    }
  }
  
  /**
   * Get learning progress for user
   */
  static async getProgress(userId: string): Promise<LearningProgress | null> {
    Logger.info('LearningProgressService: Getting progress', { userId });
    
    try {
      const progress = await AsyncStorageService.getItem<LearningProgress>(
        `${LEARNING_PROGRESS_KEY}_${userId}`
      );
      
      if (progress) {
        Logger.info('LearningProgressService: Progress retrieved successfully');
      } else {
        Logger.info('LearningProgressService: No progress found for user');
      }
      
      return progress;
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to get progress', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve learning progress'
      );
    }
  }
  
  /**
   * Update current sentence set
   */
  static async updateCurrentSet(
    userId: string,
    setId: string,
    sentenceIndex: number = 0
  ): Promise<void> {
    Logger.info('LearningProgressService: Updating current set', { 
      userId, 
      setId, 
      sentenceIndex 
    });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      progress.currentSetId = setId;
      progress.currentSentenceIndex = sentenceIndex;
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Current set updated successfully');
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to update current set', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to update current sentence set'
      );
    }
  }
  
  /**
   * Move to next sentence in current set
   */
  static async moveToNextSentence(userId: string): Promise<number> {
    Logger.info('LearningProgressService: Moving to next sentence', { userId });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      progress.currentSentenceIndex += 1;
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Moved to next sentence', { 
        newIndex: progress.currentSentenceIndex 
      });
      
      return progress.currentSentenceIndex;
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to move to next sentence', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to move to next sentence'
      );
    }
  }
  
  /**
   * Move to previous sentence in current set
   */
  static async moveToPreviousSentence(userId: string): Promise<number> {
    Logger.info('LearningProgressService: Moving to previous sentence', { userId });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      progress.currentSentenceIndex = Math.max(0, progress.currentSentenceIndex - 1);
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Moved to previous sentence', { 
        newIndex: progress.currentSentenceIndex 
      });
      
      return progress.currentSentenceIndex;
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to move to previous sentence', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to move to previous sentence'
      );
    }
  }
  
  /**
   * Mark current set as completed
   */
  static async completeCurrentSet(userId: string): Promise<void> {
    Logger.info('LearningProgressService: Completing current set', { userId });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      if (progress.currentSetId && !progress.completedSets.includes(progress.currentSetId)) {
        progress.completedSets.push(progress.currentSetId);
      }
      
      progress.currentSetId = '';
      progress.currentSentenceIndex = 0;
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Set completed successfully', {
        completedSetsCount: progress.completedSets.length,
      });
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to complete set', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to complete sentence set'
      );
    }
  }
  
  /**
   * Add practice result to progress
   */
  static async addPracticeResult(
    userId: string,
    result: PracticeResult
  ): Promise<void> {
    Logger.info('LearningProgressService: Adding practice result', { 
      userId, 
      resultId: result.id 
    });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      progress.sentenceResults.push(result);
      progress.totalSentences += 1;
      
      // Recalculate average score
      const totalScore = progress.sentenceResults.reduce(
        (sum, r) => sum + r.accuracy,
        0
      );
      progress.averageScore = totalScore / progress.sentenceResults.length;
      
      // Weak words tracking removed (no longer available without detailed assessment)
      progress.weakWords = [];
      
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Practice result added successfully', {
        totalSentences: progress.totalSentences,
        averageScore: progress.averageScore,
        weakWordsCount: progress.weakWords.length,
      });
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to add practice result', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to add practice result'
      );
    }
  }
  
  /**
   * Update topic and level
   */
  static async updateTopicAndLevel(
    userId: string,
    topic: LearningTopic,
    level: LanguageLevel
  ): Promise<void> {
    Logger.info('LearningProgressService: Updating topic and level', { 
      userId, 
      topic, 
      level 
    });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Learning progress not found'
        );
      }
      
      progress.currentTopic = topic;
      progress.currentLevel = level;
      progress.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${LEARNING_PROGRESS_KEY}_${userId}`,
        progress
      );
      
      Logger.info('LearningProgressService: Topic and level updated successfully');
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to update topic and level', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to update topic and level'
      );
    }
  }
  
  /**
   * Get learning statistics
   */
  static async getStatistics(userId: string): Promise<{
    totalSentences: number;
    completedSets: number;
    averageScore: number;
    weakWords: string[];
  }> {
    Logger.info('LearningProgressService: Getting statistics', { userId });
    
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        return {
          totalSentences: 0,
          completedSets: 0,
          averageScore: 0,
          weakWords: [],
        };
      }
      
      return {
        totalSentences: progress.totalSentences,
        completedSets: progress.completedSets.length,
        averageScore: progress.averageScore,
        weakWords: progress.weakWords,
      };
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to get statistics', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get learning statistics'
      );
    }
  }
  
  /**
   * Clear learning progress (reset)
   */
  static async clearProgress(userId: string): Promise<void> {
    Logger.info('LearningProgressService: Clearing progress', { userId });
    
    try {
      await AsyncStorageService.removeItem(`${LEARNING_PROGRESS_KEY}_${userId}`);
      Logger.info('LearningProgressService: Progress cleared successfully');
      
    } catch (error) {
      Logger.error('LearningProgressService: Failed to clear progress', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to clear learning progress'
      );
    }
  }
  
  /**
   * Check if user has progress
   */
  static async hasProgress(userId: string): Promise<boolean> {
    try {
      const progress = await this.getProgress(userId);
      return progress !== null;
    } catch (error) {
      Logger.error('LearningProgressService: Failed to check progress', error);
      return false;
    }
  }
}
