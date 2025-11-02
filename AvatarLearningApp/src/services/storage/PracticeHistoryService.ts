/**
 * PracticeHistoryService.ts
 * 
 * Practice history service for Learn and Practice modes.
 * Manages user's practice session history and statistics.
 * 
 * Features:
 * - Save practice results (STT + ISE + video)
 * - Retrieve practice history by mode
 * - Calculate statistics (average score, total duration)
 * - Delete old practices
 * - AsyncStorage persistence
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import { AsyncStorageService } from './AsyncStorageService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import type {
  PracticeHistory,
  PracticeResult,
  LearningMode,
} from '../../types';

/**
 * Storage key for practice history
 */
const PRACTICE_HISTORY_KEY = 'practice_history';

/**
 * Practice History Service
 */
export class PracticeHistoryService {
  /**
   * Initialize new practice history for user and mode
   */
  static async initializeHistory(
    userId: string,
    mode: LearningMode
  ): Promise<PracticeHistory> {
    Logger.info('PracticeHistoryService: Initializing history', { userId, mode });
    
    try {
      const history: PracticeHistory = {
        userId,
        mode,
        practices: [],
        totalPractices: 0,
        totalDuration: 0,
        averageScore: 0,
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorageService.setItem(
        `${PRACTICE_HISTORY_KEY}_${userId}_${mode}`,
        history
      );
      
      Logger.info('PracticeHistoryService: History initialized successfully');
      return history;
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to initialize history', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to initialize practice history'
      );
    }
  }
  
  /**
   * Get practice history for user and mode
   */
  static async getHistory(
    userId: string,
    mode: LearningMode
  ): Promise<PracticeHistory | null> {
    Logger.info('PracticeHistoryService: Getting history', { userId, mode });
    
    try {
      const history = await AsyncStorageService.getItem<PracticeHistory>(
        `${PRACTICE_HISTORY_KEY}_${userId}_${mode}`
      );
      
      if (history) {
        Logger.info('PracticeHistoryService: History retrieved successfully', {
          practicesCount: history.practices.length,
        });
      } else {
        Logger.info('PracticeHistoryService: No history found');
      }
      
      return history;
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to get history', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve practice history'
      );
    }
  }
  
  /**
   * Add practice result to history
   */
  static async addPractice(
    userId: string,
    mode: LearningMode,
    result: PracticeResult
  ): Promise<void> {
    Logger.info('PracticeHistoryService: Adding practice', { 
      userId, 
      mode, 
      resultId: result.id 
    });
    
    try {
      let history = await this.getHistory(userId, mode);
      
      // Initialize if not exists
      if (!history) {
        history = await this.initializeHistory(userId, mode);
      }
      
      // Add practice result
      history.practices.unshift(result); // Add to beginning (most recent first)
      history.totalPractices += 1;
      
      // Calculate duration (estimate from audio file metadata if available)
      // For now, assume 5 seconds per practice as placeholder
      history.totalDuration += 5;
      
      // Recalculate average score
      const totalScore = history.practices.reduce(
        (sum, p) => sum + p.accuracy,
        0
      );
      history.averageScore = totalScore / history.practices.length;
      
      history.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${PRACTICE_HISTORY_KEY}_${userId}_${mode}`,
        history
      );
      
      Logger.info('PracticeHistoryService: Practice added successfully', {
        totalPractices: history.totalPractices,
        averageScore: history.averageScore,
      });
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to add practice', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to add practice to history'
      );
    }
  }
  
  /**
   * Get all practices (sorted by timestamp, newest first)
   */
  static async getPractices(
    userId: string,
    mode: LearningMode,
    limit?: number
  ): Promise<PracticeResult[]> {
    Logger.info('PracticeHistoryService: Getting practices', { userId, mode, limit });
    
    try {
      const history = await this.getHistory(userId, mode);
      
      if (!history) {
        return [];
      }
      
      const practices = history.practices;
      
      // Apply limit if provided
      if (limit && limit > 0) {
        return practices.slice(0, limit);
      }
      
      return practices;
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to get practices', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve practices'
      );
    }
  }
  
  /**
   * Get practice by ID
   */
  static async getPracticeById(
    userId: string,
    mode: LearningMode,
    practiceId: string
  ): Promise<PracticeResult | null> {
    Logger.info('PracticeHistoryService: Getting practice by ID', { 
      userId, 
      mode, 
      practiceId 
    });
    
    try {
      const history = await this.getHistory(userId, mode);
      
      if (!history) {
        return null;
      }
      
      const practice = history.practices.find((p) => p.id === practiceId);
      
      if (practice) {
        Logger.info('PracticeHistoryService: Practice found');
      } else {
        Logger.info('PracticeHistoryService: Practice not found');
      }
      
      return practice || null;
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to get practice by ID', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to retrieve practice'
      );
    }
  }
  
  /**
   * Delete practice by ID
   */
  static async deletePractice(
    userId: string,
    mode: LearningMode,
    practiceId: string
  ): Promise<void> {
    Logger.info('PracticeHistoryService: Deleting practice', { 
      userId, 
      mode, 
      practiceId 
    });
    
    try {
      const history = await this.getHistory(userId, mode);
      
      if (!history) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Practice history not found'
        );
      }
      
      const initialCount = history.practices.length;
      history.practices = history.practices.filter((p) => p.id !== practiceId);
      
      if (history.practices.length === initialCount) {
        throw ErrorHandler.createError(
          ErrorCode.STORAGE_ERROR,
          'Practice not found in history'
        );
      }
      
      history.totalPractices = history.practices.length;
      
      // Recalculate average score
      if (history.practices.length > 0) {
        const totalScore = history.practices.reduce(
          (sum, p) => sum + p.accuracy,
          0
        );
        history.averageScore = totalScore / history.practices.length;
      } else {
        history.averageScore = 0;
      }
      
      history.updatedAt = new Date().toISOString();
      
      await AsyncStorageService.setItem(
        `${PRACTICE_HISTORY_KEY}_${userId}_${mode}`,
        history
      );
      
      Logger.info('PracticeHistoryService: Practice deleted successfully');
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to delete practice', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete practice'
      );
    }
  }
  
  /**
   * Delete multiple practices by IDs
   */
  static async deletePractices(
    userId: string,
    mode: LearningMode,
    practiceIds: string[]
  ): Promise<void> {
    Logger.info('PracticeHistoryService: Deleting practices', { 
      userId, 
      mode, 
      count: practiceIds.length 
    });
    
    try {
      for (const practiceId of practiceIds) {
        await this.deletePractice(userId, mode, practiceId);
      }
      
      Logger.info('PracticeHistoryService: Practices deleted successfully');
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to delete practices', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to delete practices'
      );
    }
  }
  
  /**
   * Get practice statistics
   */
  static async getStatistics(
    userId: string,
    mode: LearningMode
  ): Promise<{
    totalPractices: number;
    totalDuration: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    recentPractices: number;
  }> {
    Logger.info('PracticeHistoryService: Getting statistics', { userId, mode });
    
    try {
      const history = await this.getHistory(userId, mode);
      
      if (!history || history.practices.length === 0) {
        return {
          totalPractices: 0,
          totalDuration: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          recentPractices: 0,
        };
      }
      
      const scores = history.practices.map((p) => p.accuracy);
      const bestScore = Math.max(...scores);
      const worstScore = Math.min(...scores);
      
      // Count practices in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentPractices = history.practices.filter(
        (p) => new Date(p.timestamp) >= sevenDaysAgo
      ).length;
      
      return {
        totalPractices: history.totalPractices,
        totalDuration: history.totalDuration,
        averageScore: history.averageScore,
        bestScore,
        worstScore,
        recentPractices,
      };
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to get statistics', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to get practice statistics'
      );
    }
  }
  
  /**
   * Clear all practice history for mode
   */
  static async clearHistory(userId: string, mode: LearningMode): Promise<void> {
    Logger.info('PracticeHistoryService: Clearing history', { userId, mode });
    
    try {
      await AsyncStorageService.removeItem(
        `${PRACTICE_HISTORY_KEY}_${userId}_${mode}`
      );
      
      Logger.info('PracticeHistoryService: History cleared successfully');
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to clear history', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to clear practice history'
      );
    }
  }
  
  /**
   * Clear all practice histories (all modes)
   */
  static async clearAllHistories(userId: string): Promise<void> {
    Logger.info('PracticeHistoryService: Clearing all histories', { userId });
    
    try {
      await this.clearHistory(userId, 'learn');
      await this.clearHistory(userId, 'practice');
      
      Logger.info('PracticeHistoryService: All histories cleared successfully');
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to clear all histories', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to clear all practice histories'
      );
    }
  }
  
  /**
   * Check if user has history for mode
   */
  static async hasHistory(userId: string, mode: LearningMode): Promise<boolean> {
    try {
      const history = await this.getHistory(userId, mode);
      return history !== null && history.practices.length > 0;
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to check history', error);
      return false;
    }
  }
  
  /**
   * Export history to JSON (for backup/transfer)
   */
  static async exportHistory(
    userId: string,
    mode: LearningMode
  ): Promise<string> {
    Logger.info('PracticeHistoryService: Exporting history', { userId, mode });
    
    try {
      const history = await this.getHistory(userId, mode);
      
      if (!history) {
        return JSON.stringify({ error: 'No history found' });
      }
      
      return JSON.stringify(history, null, 2);
      
    } catch (error) {
      Logger.error('PracticeHistoryService: Failed to export history', error);
      throw ErrorHandler.createError(
        ErrorCode.STORAGE_ERROR,
        'Failed to export practice history'
      );
    }
  }
}
