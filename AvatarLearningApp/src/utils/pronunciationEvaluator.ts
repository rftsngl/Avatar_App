/**
 * pronunciationEvaluator.ts
 * 
 * Advanced pronunciation evaluation system without external APIs.
 * Uses multiple algorithms for accurate assessment:
 * - Levenshtein Distance (edit distance)
 * - Phonetic matching (Soundex-like)
 * - Word-by-word analysis
 * - Pronunciation score calculation
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import { Logger } from './Logger';

/**
 * Evaluation result interface
 */
export interface PronunciationEvaluation {
  /** Overall accuracy score (0-100) */
  accuracy: number;
  /** Pronunciation quality score (0-100) */
  pronunciation: number;
  /** Fluency score (0-100) */
  fluency: number;
  /** Completeness score (0-100) */
  completeness: number;
  /** Word-by-word detailed analysis */
  wordAnalysis: WordAnalysis[];
  /** Feedback message */
  feedback: string;
  /** Performance level: excellent, good, fair, poor */
  level: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Word analysis interface
 */
export interface WordAnalysis {
  /** Expected word */
  expected: string;
  /** Spoken word */
  spoken: string;
  /** Match status */
  status: 'correct' | 'similar' | 'incorrect' | 'missing' | 'extra';
  /** Similarity score (0-100) */
  similarity: number;
}

/**
 * Pronunciation Evaluator Utility
 */
export class PronunciationEvaluator {
  /**
   * Evaluate pronunciation with advanced algorithms
   */
  static evaluate(
    spokenText: string,
    expectedText: string
  ): PronunciationEvaluation {
    Logger.info('PronunciationEvaluator: Starting evaluation', {
      spokenLength: spokenText.length,
      expectedLength: expectedText.length,
    });

    // Normalize texts
    const normalizedSpoken = this.normalizeText(spokenText);
    const normalizedExpected = this.normalizeText(expectedText);

    // Split into words
    const spokenWords = normalizedSpoken.split(/\s+/).filter(w => w.length > 0);
    const expectedWords = normalizedExpected.split(/\s+/).filter(w => w.length > 0);

    Logger.info('PronunciationEvaluator: Normalized texts', {
      spokenWords: spokenWords.length,
      expectedWords: expectedWords.length,
    });

    // Word-by-word analysis
    const wordAnalysis = this.analyzeWords(spokenWords, expectedWords);

    // Calculate sub-scores
    const accuracy = this.calculateAccuracy(wordAnalysis);
    const pronunciation = this.calculatePronunciation(wordAnalysis, spokenWords, expectedWords);
    const fluency = this.calculateFluency(spokenWords, expectedWords);
    const completeness = this.calculateCompleteness(spokenWords, expectedWords);

    // Calculate overall score (weighted average)
    const overallScore = (
      accuracy * 0.4 +           // 40% accuracy
      pronunciation * 0.3 +       // 30% pronunciation
      fluency * 0.2 +             // 20% fluency
      completeness * 0.1          // 10% completeness
    );

    // Determine performance level
    const level = this.getPerformanceLevel(overallScore);

    // Generate feedback
    const feedback = this.generateFeedback(overallScore, accuracy, pronunciation, fluency, completeness, wordAnalysis);

    const result: PronunciationEvaluation = {
      accuracy: Math.round(accuracy),
      pronunciation: Math.round(pronunciation),
      fluency: Math.round(fluency),
      completeness: Math.round(completeness),
      wordAnalysis,
      feedback,
      level,
    };

    Logger.info('PronunciationEvaluator: Evaluation complete', {
      overallScore: result.accuracy,
      level: result.level,
    });

    return result;
  }

  /**
   * Normalize text (lowercase, remove punctuation, trim)
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"()\[\]{}]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')                // Normalize spaces
      .trim();
  }

  /**
   * Analyze words using multiple matching strategies
   */
  private static analyzeWords(
    spokenWords: string[],
    expectedWords: string[]
  ): WordAnalysis[] {
    const analysis: WordAnalysis[] = [];
    const usedSpokenIndices = new Set<number>();

    // Match expected words with spoken words
    for (let i = 0; i < expectedWords.length; i++) {
      const expected = expectedWords[i];
      let bestMatch: { index: number; similarity: number; status: WordAnalysis['status'] } | null = null;

      // Try to find best match in spoken words
      for (let j = 0; j < spokenWords.length; j++) {
        if (usedSpokenIndices.has(j)) continue;

        const spoken = spokenWords[j];
        const similarity = this.calculateWordSimilarity(spoken, expected);

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            index: j,
            similarity,
            status: this.getWordStatus(similarity),
          };
        }
      }

      if (bestMatch && bestMatch.similarity > 30) {
        // Found a match
        usedSpokenIndices.add(bestMatch.index);
        analysis.push({
          expected,
          spoken: spokenWords[bestMatch.index],
          status: bestMatch.status,
          similarity: bestMatch.similarity,
        });
      } else {
        // Word missing
        analysis.push({
          expected,
          spoken: '',
          status: 'missing',
          similarity: 0,
        });
      }
    }

    // Mark extra words (spoken but not expected)
    for (let j = 0; j < spokenWords.length; j++) {
      if (!usedSpokenIndices.has(j)) {
        analysis.push({
          expected: '',
          spoken: spokenWords[j],
          status: 'extra',
          similarity: 0,
        });
      }
    }

    return analysis;
  }

  /**
   * Calculate word similarity using multiple algorithms
   */
  private static calculateWordSimilarity(word1: string, word2: string): number {
    // Exact match
    if (word1 === word2) {
      return 100;
    }

    // Levenshtein distance similarity
    const levenshteinScore = this.levenshteinSimilarity(word1, word2);

    // Phonetic similarity (Soundex-like)
    const phoneticScore = this.phoneticSimilarity(word1, word2);

    // Character overlap
    const overlapScore = this.characterOverlap(word1, word2);

    // Weighted average (Levenshtein is most important)
    return (
      levenshteinScore * 0.5 +
      phoneticScore * 0.3 +
      overlapScore * 0.2
    );
  }

  /**
   * Levenshtein distance (edit distance) converted to similarity percentage
   */
  private static levenshteinSimilarity(s1: string, s2: string): number {
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    if (maxLength === 0) return 100;
    
    return ((maxLength - distance) / maxLength) * 100;
  }

  /**
   * Calculate Levenshtein distance
   */
  private static levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deletion
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Phonetic similarity (simplified Soundex-like algorithm)
   */
  private static phoneticSimilarity(word1: string, word2: string): number {
    const phonetic1 = this.getPhoneticCode(word1);
    const phonetic2 = this.getPhoneticCode(word2);

    if (phonetic1 === phonetic2) {
      return 100;
    }

    // Partial phonetic match
    const commonChars = this.countCommonCharacters(phonetic1, phonetic2);
    const maxLength = Math.max(phonetic1.length, phonetic2.length);

    return maxLength > 0 ? (commonChars / maxLength) * 100 : 0;
  }

  /**
   * Get phonetic code (simplified Soundex)
   */
  private static getPhoneticCode(word: string): string {
    if (!word || word.length === 0) return '';

    const w = word.toLowerCase();
    let code = w[0]; // Keep first letter

    // Phonetic mapping
    const phoneticMap: { [key: string]: string } = {
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6',
    };

    let prevCode = '';
    for (let i = 1; i < w.length && code.length < 6; i++) {
      const char = w[i];
      const mappedCode = phoneticMap[char] || '';

      // Add only if different from previous code and not a vowel
      if (mappedCode && mappedCode !== prevCode) {
        code += mappedCode;
        prevCode = mappedCode;
      }
    }

    // Pad with zeros if needed
    while (code.length < 4) {
      code += '0';
    }

    return code.substring(0, 4);
  }

  /**
   * Character overlap percentage
   */
  private static characterOverlap(s1: string, s2: string): number {
    const chars1 = new Set(s1.split(''));
    const chars2 = new Set(s2.split(''));

    let common = 0;
    chars1.forEach(char => {
      if (chars2.has(char)) {
        common++;
      }
    });

    const total = Math.max(chars1.size, chars2.size);
    return total > 0 ? (common / total) * 100 : 0;
  }

  /**
   * Count common characters between two strings
   */
  private static countCommonCharacters(s1: string, s2: string): number {
    let count = 0;
    const minLength = Math.min(s1.length, s2.length);

    for (let i = 0; i < minLength; i++) {
      if (s1[i] === s2[i]) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get word status based on similarity
   */
  private static getWordStatus(similarity: number): WordAnalysis['status'] {
    if (similarity >= 90) return 'correct';
    if (similarity >= 60) return 'similar';
    return 'incorrect';
  }

  /**
   * Calculate accuracy score from word analysis
   */
  private static calculateAccuracy(wordAnalysis: WordAnalysis[]): number {
    if (wordAnalysis.length === 0) return 0;

    const totalWords = wordAnalysis.filter(w => w.expected !== '').length;
    if (totalWords === 0) return 0;

    const weightedScore = wordAnalysis.reduce((sum, word) => {
      if (word.expected === '') return sum; // Skip extra words
      return sum + word.similarity;
    }, 0);

    return weightedScore / totalWords;
  }

  /**
   * Calculate pronunciation score (penalize similar but not exact)
   */
  private static calculatePronunciation(
    wordAnalysis: WordAnalysis[],
    spokenWords: string[],
    expectedWords: string[]
  ): number {
    if (wordAnalysis.length === 0) return 0;

    let pronunciationScore = 0;
    let count = 0;

    wordAnalysis.forEach(word => {
      if (word.expected === '') return; // Skip extra words

      if (word.status === 'correct') {
        pronunciationScore += 100;
      } else if (word.status === 'similar') {
        pronunciationScore += word.similarity * 0.8; // Penalize slightly
      } else if (word.status === 'incorrect') {
        pronunciationScore += word.similarity * 0.5; // Heavier penalty
      }
      // Missing words contribute 0

      count++;
    });

    return count > 0 ? pronunciationScore / count : 0;
  }

  /**
   * Calculate fluency score (word order and continuity)
   */
  private static calculateFluency(spokenWords: string[], expectedWords: string[]): number {
    if (expectedWords.length === 0) return 0;

    // Length ratio
    const lengthRatio = spokenWords.length / expectedWords.length;
    const lengthScore = lengthRatio <= 1.2 && lengthRatio >= 0.8 ? 100 : Math.max(0, 100 - Math.abs(1 - lengthRatio) * 50);

    // Word order preservation (using longest common subsequence)
    const lcsLength = this.longestCommonSubsequence(spokenWords, expectedWords);
    const orderScore = (lcsLength / expectedWords.length) * 100;

    return (lengthScore * 0.4 + orderScore * 0.6);
  }

  /**
   * Calculate completeness score (coverage of expected words)
   */
  private static calculateCompleteness(spokenWords: string[], expectedWords: string[]): number {
    if (expectedWords.length === 0) return 0;

    const normalizedSpoken = spokenWords.map(w => w.toLowerCase());
    const normalizedExpected = expectedWords.map(w => w.toLowerCase());

    let found = 0;
    normalizedExpected.forEach(expected => {
      if (normalizedSpoken.some(spoken => 
        this.calculateWordSimilarity(spoken, expected) >= 70
      )) {
        found++;
      }
    });

    return (found / expectedWords.length) * 100;
  }

  /**
   * Longest common subsequence length (for fluency calculation)
   */
  private static longestCommonSubsequence(arr1: string[], arr2: string[]): number {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (this.calculateWordSimilarity(arr1[i - 1], arr2[j - 1]) >= 70) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Get performance level based on overall score
   */
  private static getPerformanceLevel(score: number): PronunciationEvaluation['level'] {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Generate detailed feedback message
   */
  private static generateFeedback(
    overallScore: number,
    accuracy: number,
    pronunciation: number,
    fluency: number,
    completeness: number,
    wordAnalysis: WordAnalysis[]
  ): string {
    const parts: string[] = [];

    // Overall feedback
    if (overallScore >= 85) {
      parts.push('Excellent work! Your pronunciation is very clear.');
    } else if (overallScore >= 70) {
      parts.push('Good job! Your pronunciation is quite good.');
    } else if (overallScore >= 50) {
      parts.push('Fair effort. Keep practicing to improve.');
    } else {
      parts.push('Keep practicing! Try to speak more clearly.');
    }

    // Specific feedback
    const issues: string[] = [];

    if (accuracy < 70) {
      issues.push('Try to pronounce words more accurately');
    }
    if (pronunciation < 70) {
      issues.push('Focus on correct pronunciation of each word');
    }
    if (fluency < 70) {
      issues.push('Work on speaking more smoothly');
    }
    if (completeness < 80) {
      issues.push('Try to include all words from the text');
    }

    // Word-specific feedback
    const incorrect = wordAnalysis.filter(w => w.status === 'incorrect' || w.status === 'similar');
    if (incorrect.length > 0 && incorrect.length <= 3) {
      const words = incorrect.map(w => `"${w.expected}"`).join(', ');
      issues.push(`Pay attention to: ${words}`);
    }

    if (issues.length > 0) {
      parts.push('\n\nSuggestions:\n• ' + issues.join('\n• '));
    }

    return parts.join('\n');
  }

  /**
   * Quick accuracy calculation (for backward compatibility)
   */
  static calculateSimpleAccuracy(spokenText: string, expectedText: string): number {
    const evaluation = this.evaluate(spokenText, expectedText);
    return evaluation.accuracy;
  }
}
