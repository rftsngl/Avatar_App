/**
 * Loading Skeleton Component
 * 
 * Provides skeleton loading states for better UX while content is loading.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

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
 * Single Skeleton Component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

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
          StyleSheet.absoluteFill,
          {
            opacity,
            backgroundColor: '#E5E7EB',
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
      <Skeleton width="100%" height={150} borderRadius={12} />
      <View style={styles.avatarCardContent}>
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
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
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
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
      <Skeleton width="100%" height={200} borderRadius={12} />
      <View style={styles.videoCardContent}>
        <Skeleton width="90%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
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
    backgroundColor: '#E5E7EB',
  },
  listContainer: {
    padding: 16,
  },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCardContent: {
    padding: 12,
  },
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voiceCardContent: {
    marginLeft: 16,
    flex: 1,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  videoCardContent: {
    padding: 16,
  },
});

