/**
 * PracticeResultCard.tsx
 * 
 * Card component for displaying practice history items.
 * Shows score, timestamp, reference text, and allows deletion.
 * 
 * Features:
 * - Practice score badge (color-coded)
 * - Timestamp formatting (relative: "2 hours ago")
 * - Reference text preview (truncated)
 * - Tap to view details
 * - Swipe to delete (optional)
 * - Mode indicator (Learn/Practice/Talk)
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { PracticeResult } from '../../types';
import Colors, { Shadows, BorderRadius, Spacing, getGradeColor } from '../../constants/colors';
import { HapticUtils } from '../../utils/hapticUtils';

/**
 * Props for PracticeResultCard
 */
interface PracticeResultCardProps {
  result: PracticeResult;
  onPress: (result: PracticeResult) => void;
  onDelete?: (result: PracticeResult) => void;
  compact?: boolean;
}

/**
 * Get score color - DEPRECATED: Use getGradeColor from constants
 */
const getScoreColor = (score: number): string => {
  return getGradeColor(score);
};

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString();
};

/**
 * Truncate text
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get mode emoji
 */
const getModeEmoji = (mode: string): string => {
  switch (mode) {
    case 'learn': return '📚';
    case 'practice': return '✏️';
    case 'talk': return '💬';
    default: return '📝';
  }
};

/**
 * Get mode label
 */
const getModeLabel = (mode: string): string => {
  switch (mode) {
    case 'learn': return 'Learn';
    case 'practice': return 'Practice';
    case 'talk': return 'Talk';
    default: return 'Unknown';
  }
};

/**
 * PracticeResultCard Component
 */
export const PracticeResultCard: React.FC<PracticeResultCardProps> = ({
  result,
  onPress,
  onDelete,
  compact = false,
}) => {
  /**
   * Handle card press
   */
  const handlePress = () => {
    HapticUtils.light();
    onPress(result);
  };
  
  /**
   * Handle delete press
   */
  const handleDelete = () => {
    HapticUtils.error();
    onDelete?.(result);
  };
  
  const scoreColor = getScoreColor(result.accuracy);
  const relativeTime = formatRelativeTime(result.timestamp);
  
  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Score Badge */}
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>
            {result.accuracy.toFixed(0)}
          </Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Header: Mode + Timestamp */}
          <View style={styles.header}>
            <View style={styles.modeContainer}>
              <Text style={styles.modeEmoji}>{getModeEmoji(result.mode)}</Text>
              <Text style={styles.modeText}>{getModeLabel(result.mode)}</Text>
            </View>
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>
          
          {/* Reference Text Preview */}
          <Text style={styles.referenceText} numberOfLines={compact ? 1 : 2}>
            {truncateText(result.referenceText, compact ? 50 : 100)}
          </Text>
          
          {/* Metrics Preview (if not compact) */}
          {!compact && (
            <View style={styles.metricsPreview}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Accuracy</Text>
                <Text style={styles.metricValue}>
                  {result.accuracy.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Score</Text>
                <Text style={styles.metricValue}>
                  {result.accuracy.toFixed(0)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Grade</Text>
                <Text style={styles.metricValue}>
                  {result.accuracy >= 80 ? 'A' : result.accuracy >= 60 ? 'B' : 'C'}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Video Status Indicator (if video exists) */}
      {result.videoId && (
        <View style={styles.videoIndicator}>
          <Text style={styles.videoIcon}>🎬</Text>
          <Text style={styles.videoText}>
            {result.videoStatus === 'completed' ? 'Video Ready' : 'Processing...'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: 6,
    marginHorizontal: Spacing.md,
    ...Shadows.medium,
  },
  cardCompact: {
    padding: Spacing.sm,
    marginVertical: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    ...Shadows.small,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  timestamp: {
    fontSize: 11,
    color: '#999999',
  },
  referenceText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
    marginBottom: 10,
  },
  metricsPreview: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  videoIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  videoText: {
    fontSize: 12,
    color: '#666666',
  },
});
