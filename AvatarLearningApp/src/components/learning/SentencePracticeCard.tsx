/**
 * SentencePracticeCard.tsx
 * 
 * Card component for displaying AI-generated practice sentences.
 * Shows sentence text, translation, difficulty level, and pronunciation tips.
 * 
 * Features:
 * - Sentence display with large readable text
 * - Translation toggle (show/hide)
 * - Difficulty badge (easy/medium/hard)
 * - Pronunciation tips section
 * - Practice button callback
 * - CEFR level indicator
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import type { AISentence } from '../../types';
import Colors, { Shadows, BorderRadius, Spacing } from '../../constants/colors';
import { HapticUtils } from '../../utils/hapticUtils';

/**
 * Props for SentencePracticeCard
 */
interface SentencePracticeCardProps {
  sentence: AISentence;
  onPractice: (sentence: AISentence) => void;
  showTranslation?: boolean;
  compact?: boolean;
}

/**
 * Difficulty color mapping
 */
const DIFFICULTY_COLORS = {
  easy: '#4CAF50',      // Green
  medium: '#FF9800',    // Orange
  hard: '#F44336',      // Red
};

/**
 * CEFR level color mapping
 */
const LEVEL_COLORS = {
  A1: '#81C784',  // Light Green
  A2: '#AED581',  // Lime
  B1: '#FFB74D',  // Light Orange
  B2: '#FF8A65',  // Deep Orange
  C1: '#E57373',  // Light Red
  C2: '#EF5350',  // Red
};

/**
 * Topic icon mapping (emoji)
 */
const TOPIC_ICONS: Record<string, string> = {
  greetings: '👋',
  daily_conversation: '💬',
  business: '💼',
  travel: '✈️',
  food: '🍽️',
  shopping: '🛍️',
  weather: '🌤️',
  hobbies: '🎨',
};

/**
 * SentencePracticeCard Component
 */
export const SentencePracticeCard: React.FC<SentencePracticeCardProps> = ({
  sentence,
  onPractice,
  showTranslation: showTranslationProp = false,
  compact = false,
}) => {
  const [showTranslation, setShowTranslation] = useState(showTranslationProp);
  
  /**
   * Handle practice button press
   */
  const handlePracticePress = () => {
    HapticUtils.light();
    onPractice(sentence);
  };
  
  /**
   * Toggle translation visibility
   */
  const handleToggleTranslation = () => {
    HapticUtils.light();
    setShowTranslation(!showTranslation);
  };
  
  /**
   * Get difficulty color
   */
  const getDifficultyColor = () => {
    return DIFFICULTY_COLORS[sentence.difficulty];
  };
  
  /**
   * Get level color
   */
  const getLevelColor = () => {
    return LEVEL_COLORS[sentence.level];
  };
  
  /**
   * Get topic icon
   */
  const getTopicIcon = () => {
    return TOPIC_ICONS[sentence.topic] || '📝';
  };
  
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Header: Level, Topic, Difficulty */}
      <View style={styles.header}>
        <View style={styles.metaContainer}>
          {/* CEFR Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor() }]}>
            <Text style={styles.levelText}>{sentence.level}</Text>
          </View>
          
          {/* Topic Icon & Name */}
          <View style={styles.topicContainer}>
            <Text style={styles.topicIcon}>{getTopicIcon()}</Text>
            <Text style={styles.topicText}>
              {sentence.topic.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        
        {/* Difficulty Badge */}
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor() }]}>
          <Text style={styles.difficultyText}>
            {sentence.difficulty.toUpperCase()}
          </Text>
        </View>
      </View>
      
      {/* Sentence Text */}
      <View style={styles.sentenceContainer}>
        <Text style={[styles.sentenceText, compact && styles.sentenceTextCompact]}>
          {sentence.text}
        </Text>
      </View>
      
      {/* Translation Section */}
      <TouchableOpacity
        style={styles.translationToggle}
        onPress={handleToggleTranslation}
        activeOpacity={0.7}
      >
        <Text style={styles.translationToggleText}>
          {showTranslation ? '🔼 Hide Translation' : '🔽 Show Translation'}
        </Text>
      </TouchableOpacity>
      
      {showTranslation && (
        <View style={styles.translationContainer}>
          <Text style={styles.translationText}>{sentence.translation}</Text>
        </View>
      )}
      
      {/* Pronunciation Tips */}
      {sentence.tips && !compact && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsLabel}>💡 Tip:</Text>
          <Text style={styles.tipsText}>{sentence.tips}</Text>
        </View>
      )}
      
      {/* Practice Button */}
      <TouchableOpacity
        style={styles.practiceButton}
        onPress={handlePracticePress}
        activeOpacity={0.8}
      >
        <Text style={styles.practiceButtonText}>🎤 Practice Now</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: 8,
    marginHorizontal: Spacing.md,
    ...Shadows.medium,
  },
  cardCompact: {
    padding: Spacing.md,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  topicText: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'capitalize',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sentenceContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sentenceText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  sentenceTextCompact: {
    fontSize: 18,
    lineHeight: 28,
  },
  translationToggle: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  translationToggleText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
  },
  translationContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1976D2',
  },
  tipsContainer: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  tipsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#827717',
  },
  practiceButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  practiceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
