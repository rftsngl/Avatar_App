/**
 * Loading Skeleton Component
 * 
 * Provides skeleton loading states with shimmer animation for better UX.
 * Enhanced with smooth opacity transitions.
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { shimmer } from '../utils/animationUtils';
import Colors, { BorderRadius, Spacing, Shadows } from '../constants/colors';

/**
 * Skeleton props
 */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Single Skeleton Component with enhanced shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.xs,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = shimmer(shimmerAnim);
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  // Interpolate shimmer animation for smooth wave effect
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as ViewStyle['width'],
          height: height as ViewStyle['height'],
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

/**
 * Avatar Card Skeleton
 */
export const AvatarCardSkeleton: React.FC = () => {
  return (
    <View style={styles.avatarCard}>
      <Skeleton width="100%" height={150} borderRadius={BorderRadius.md} />
      <View style={styles.avatarCardContent}>
        <Skeleton width="80%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
};

/**
 * Voice Card Skeleton
 */
export const VoiceCardSkeleton: React.FC = () => {
  return (
    <View style={styles.voiceCard}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <View style={styles.voiceCardContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
};

/**
 * Video Card Skeleton
 */
export const VideoCardSkeleton: React.FC = () => {
  return (
    <View style={styles.videoCard}>
      <Skeleton width="100%" height={200} borderRadius={BorderRadius.md} />
      <View style={styles.videoCardContent}>
        <Skeleton width="90%" height={18} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
};

/**
 * List Skeleton
 */
interface ListSkeletonProps {
  count?: number;
  type?: 'avatar' | 'voice' | 'video';
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ count = 6, type = 'avatar' }) => {
  const SkeletonComponent =
    type === 'avatar'
      ? AvatarCardSkeleton
      : type === 'voice'
      ? VoiceCardSkeleton
      : VideoCardSkeleton;

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.gray200,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    opacity: 0.3,
    width: 100,
  },
  listContainer: {
    padding: Spacing.md,
  },
  avatarCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  avatarCardContent: {
    padding: Spacing.md,
  },
  voiceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  voiceCardContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  videoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  videoCardContent: {
    padding: Spacing.md,
  },
});

