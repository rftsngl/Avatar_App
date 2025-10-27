/**
 * Video Playback Screen
 *
 * Plays videos from local storage with custom controls.
 * Features:
 * - Video player with play/pause controls
 * - Progress bar with seek functionality
 * - Fullscreen mode toggle
 * - Video metadata display
 * - Delete video functionality
 * - Share video functionality (optional)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import Video, { OnLoadData, OnProgressData, VideoRef } from 'react-native-video';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, VideoMetadata } from '../../types';
import { VideoStorageService } from '../../services/video';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';

type VideoPlaybackScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VideoPlayback'
>;

type VideoPlaybackScreenRouteProp = RouteProp<RootStackParamList, 'VideoPlayback'>;

interface Props {
  navigation: VideoPlaybackScreenNavigationProp;
  route: VideoPlaybackScreenRouteProp;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VideoPlaybackScreen: React.FC<Props> = ({ navigation, route }) => {
  const { videoId } = route.params;

  const videoRef = useRef<VideoRef>(null);

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [videoPath, setVideoPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load video metadata and file path
   */
  useEffect(() => {
    loadVideo();
  }, [videoId]);

  /**
   * Auto-pause when screen loses focus
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause video when leaving screen
        setIsPaused(true);
        setIsPlaying(false);
      };
    }, [])
  );

  /**
   * Auto-hide controls after 3 seconds
   */
  useEffect(() => {
    if (showControls && isPlaying) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isPlaying]);

  /**
   * Cleanup video resources on unmount
   */
  useEffect(() => {
    return () => {
      // Release video player resources
      if (videoRef.current) {
        Logger.info('VideoPlaybackScreen: Releasing video player resources');
      }
    };
  }, []);

  /**
   * Load video from storage
   */
  const loadVideo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      Logger.info('VideoPlaybackScreen: Loading video', { videoId });

      // Get video metadata
      const videoMetadata = await VideoStorageService.getVideoById(videoId);

      if (!videoMetadata) {
        throw new Error('Video not found');
      }

      setMetadata(videoMetadata);

      // Check if this is a cloud video (HeyGen)
      if (videoMetadata.cloudVideoUrl) {
        Logger.info('VideoPlaybackScreen: Using cloud video URL', {
          videoId,
          url: videoMetadata.cloudVideoUrl,
        });
        setVideoPath(videoMetadata.cloudVideoUrl);
      } else {
        // Local video file
        const fileExists = await VideoStorageService.videoFileExists(videoId);

        if (!fileExists) {
          throw new Error('Video file not found on device');
        }

        // Get video file path
        const filePath = VideoStorageService.getVideoFilePath(videoId);
        setVideoPath(filePath);

        Logger.info('VideoPlaybackScreen: Video loaded from local storage', {
          videoId,
          filePath,
        });
      }
    } catch (err) {
      Logger.error('VideoPlaybackScreen: Failed to load video', err);
      const errorMessage = ErrorHandler.getUserMessage(err);
      setError(errorMessage);
      Alert.alert('Error', errorMessage, [
        {
          text: 'Go Back',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle video load
   */
  const handleLoad = (data: OnLoadData) => {
    Logger.info('VideoPlaybackScreen: Video loaded', {
      duration: data.duration,
    });
    setDuration(data.duration);
    setIsLoading(false);
  };

  /**
   * Handle video progress
   */
  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };


  /**
   * Handle video error
   */
  const handleError = (err: any) => {
    Logger.error('VideoPlaybackScreen: Video playback error', err);
    setError('Failed to play video');
    Alert.alert('Playback Error', 'Failed to play video. The file may be corrupted.');
  };

  /**
   * Handle video end
   */
  const handleEnd = () => {
    Logger.info('VideoPlaybackScreen: Video ended');
    setIsPaused(true);
    setIsPlaying(false);
    setCurrentTime(0);
    // Seek to beginning
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    HapticUtils.light();
    setIsPaused(!isPaused);
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  /**
   * Seek to position
   */
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seek(time);
      setCurrentTime(time);
    }
  };

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = () => {
    HapticUtils.medium();
    setIsFullscreen(!isFullscreen);
    setShowControls(true);
  };

  /**
   * Show/hide controls
   */
  const toggleControls = () => {
    setShowControls(!showControls);
  };

  /**
   * Delete video
   */
  const handleDeleteVideo = () => {
    HapticUtils.warning();
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticUtils.heavy();
              Logger.info('VideoPlaybackScreen: Deleting video', { videoId });
              await VideoStorageService.deleteVideo(videoId);
              HapticUtils.success();
              Alert.alert('Success', 'Video deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (err) {
              HapticUtils.error();
              Logger.error('VideoPlaybackScreen: Failed to delete video', err);
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
    );
  };

  /**
   * Format time in MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  // Error state
  if (error || !metadata || !videoPath) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Video not found'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={isFullscreen} />

      {/* Video Player */}
      <TouchableOpacity
        style={[styles.videoContainer, isFullscreen && styles.videoContainerFullscreen]}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <Video
          ref={videoRef}
          source={{ uri: `file://${videoPath}` }}
          style={styles.video}
          resizeMode="contain"
          paused={isPaused}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onError={handleError}
          onEnd={handleEnd}
          repeat={false}
        />

        {/* Video Controls Overlay */}
        {showControls && (
          <View style={styles.controlsOverlay}>
            {/* Top Controls */}
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={toggleFullscreen}
              >
                <Text style={styles.fullscreenButtonText}>
                  {isFullscreen ? '⊗' : '⛶'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Center Play/Pause Button */}
            <TouchableOpacity
              style={styles.centerPlayButton}
              onPress={togglePlayPause}
            >
              <Text style={styles.playButtonText}>
                {isPaused ? '▶' : '⏸'}
              </Text>
            </TouchableOpacity>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Time Display */}
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${(currentTime / duration) * 100}%` },
                  ]}
                />
                <TouchableOpacity
                  style={styles.progressBarTouchable}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    const progressBarWidth = SCREEN_WIDTH - 48;
                    const seekTime = (locationX / progressBarWidth) * duration;
                    seekTo(seekTime);
                  }}
                />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Video Metadata (only show when not fullscreen) */}
      {!isFullscreen && (
        <ScrollView style={styles.metadataContainer}>
          {/* Video Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Video Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform:</Text>
              <Text style={styles.infoValue}>
                {metadata.platform === 'did' ? 'D-ID' : 'HeyGen'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Avatar:</Text>
              <Text style={styles.infoValue}>{metadata.avatarName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Voice:</Text>
              <Text style={styles.infoValue}>{metadata.voiceName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>{formatDate(metadata.createdAt)}</Text>
            </View>

            {metadata.duration && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration:</Text>
                <Text style={styles.infoValue}>{formatTime(metadata.duration)}</Text>
              </View>
            )}
          </View>

          {/* Script */}
          <View style={styles.scriptSection}>
            <Text style={styles.scriptTitle}>Script</Text>
            <Text style={styles.scriptText}>{metadata.text}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteVideo}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete Video</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16), // 16:9 aspect ratio
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoContainerFullscreen: {
    width: SCREEN_HEIGHT,
    height: SCREEN_WIDTH,
    transform: [{ rotate: '90deg' }],
    position: 'absolute',
    top: (SCREEN_HEIGHT - SCREEN_WIDTH) / 2,
    left: (SCREEN_WIDTH - SCREEN_HEIGHT) / 2,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  fullscreenButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
  },
  fullscreenButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  centerPlayButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
    borderRadius: 50,
  },
  playButtonText: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  bottomControls: {
    padding: 16,
  },
  timeText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  progressBarTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  metadataContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  scriptSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 2,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  scriptText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 24,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default VideoPlaybackScreen;

