/**
 * LearningStatistics.tsx
 * 
 * Statistics dashboard component for learning progress.
 * Shows total practices, average score, weak words, and trends.
 * 
 * Features:
 * - Total practices counter
 * - Average score with percentage circle
 * - Weak words list (top 10)
 * - Progress trend indicator
 * - Completed sets counter
 * - Visual stat cards
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

/**
 * Props for LearningStatistics
 */
interface LearningStatisticsProps {
  totalSentences: number;
  completedSets: number;
  averageScore: number;
  weakWords: string[];
  compact?: boolean;
}

/**
 * Get score color
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
};

/**
 * Get performance level text
 */
const getPerformanceLevel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Great';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Keep Practicing';
};

/**
 * LearningStatistics Component
 */
export const LearningStatistics: React.FC<LearningStatisticsProps> = ({
  totalSentences,
  completedSets,
  averageScore,
  weakWords,
  compact = false,
}) => {
  const scoreColor = getScoreColor(averageScore);
  const performanceLevel = getPerformanceLevel(averageScore);
  
  /**
   * Render stat card
   */
  const renderStatCard = (
    icon: string,
    value: string | number,
    label: string,
    color: string
  ) => {
    return (
      <View style={[styles.statCard, { borderLeftColor: color }]}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  };
  
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Average Score Circle */}
      <View style={styles.scoreSection}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>
            {averageScore.toFixed(0)}
          </Text>
          <Text style={styles.scoreLabel}>Average</Text>
        </View>
        <View style={styles.scoreDetails}>
          <Text style={styles.performanceText}>{performanceLevel}</Text>
          <Text style={styles.performanceSubtext}>
            {totalSentences} practices completed
          </Text>
        </View>
      </View>
      
      {/* Stat Cards Grid */}
      {!compact && (
        <View style={styles.statCardsGrid}>
          {renderStatCard('🎯', totalSentences, 'Total Practices', '#2196F3')}
          {renderStatCard('📚', completedSets, 'Completed Sets', '#4CAF50')}
          {renderStatCard('⚡', Math.round((averageScore / 100) * totalSentences), 'Points Earned', '#FF9800')}
        </View>
      )}
      
      {/* Weak Words Section */}
      {weakWords.length > 0 && (
        <View style={styles.weakWordsSection}>
          <Text style={styles.sectionTitle}>🎓 Focus Words</Text>
          <Text style={styles.sectionSubtitle}>
            Practice these words to improve
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weakWordsScroll}
          >
            {weakWords.slice(0, 10).map((word, index) => (
              <View key={`${word}-${index}`} style={styles.weakWordChip}>
                <Text style={styles.weakWordText}>{word}</Text>
                <View style={styles.weakWordBadge}>
                  <Text style={styles.weakWordBadgeText}>Focus</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Empty State */}
      {totalSentences === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateText}>
            No statistics yet
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Complete some practice sessions to see your progress
          </Text>
        </View>
      )}
      
      {/* Progress Insights (if not empty) */}
      {totalSentences > 0 && !compact && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          
          {averageScore >= 80 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightIcon}>🎉</Text>
              <Text style={styles.insightText}>
                Great job! You're mastering the material!
              </Text>
            </View>
          )}
          
          {averageScore < 60 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightIcon}>💪</Text>
              <Text style={styles.insightText}>
                Keep practicing! Consistency is key to improvement.
              </Text>
            </View>
          )}
          
          {weakWords.length > 5 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightIcon}>🎯</Text>
              <Text style={styles.insightText}>
                Focus on {weakWords.length} words that need more practice.
              </Text>
            </View>
          )}
          
          {completedSets >= 3 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightIcon}>🏆</Text>
              <Text style={styles.insightText}>
                Excellent dedication! {completedSets} sets completed!
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerCompact: {
    padding: 16,
    marginVertical: 6,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  scoreDetails: {
    flex: 1,
  },
  performanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  performanceSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  statCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  weakWordsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 12,
  },
  weakWordsScroll: {
    marginHorizontal: -4,
  },
  weakWordChip: {
    backgroundColor: '#FFF9C4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FBC02D',
    alignItems: 'center',
  },
  weakWordText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 4,
  },
  weakWordBadge: {
    backgroundColor: '#F57F17',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  weakWordBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  insightsSection: {
    marginTop: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
