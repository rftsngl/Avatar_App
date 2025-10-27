/**
 * Video Archive Screen
 *
 * Displays all generated videos stored on the device.
 * Features:
 * - List/grid view of videos
 * - Search by script text, avatar name, or voice name
 * - Filter by platform (D-ID or HeyGen)
 * - Sort by date or name
 * - Pull-to-refresh
 * - Storage usage display
 * - Delete all videos option
 * - Navigate to video playback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Share,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList, VideoMetadata, PlatformType } from '../../types';
import { VideoStorageService } from '../../services/video';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';

type VideoArchiveScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'VideoArchive'>,
  StackNavigationProp<RootStackParamList>
>;

type VideoArchiveScreenRouteProp = RouteProp<MainTabParamList, 'VideoArchive'>;

interface Props {
  navigation: VideoArchiveScreenNavigationProp;
  route: VideoArchiveScreenRouteProp;
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
type FilterOption = 'all' | 'did' | 'heygen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

const VideoArchiveScreen: React.FC<Props> = ({ navigation, route }) => {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [totalStorage, setTotalStorage] = useState(0);

  /**
   * Load videos when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  /**
   * Load videos from storage
   */
  const loadVideos = async () => {
    try {
      setIsLoading(true);

      Logger.info('VideoArchiveScreen: Loading videos');

      // Get all videos
      const allVideos = await VideoStorageService.getAllVideos();

      // Get total storage used
      const storage = await VideoStorageService.getTotalStorageUsed();

      setVideos(allVideos);
      setTotalStorage(storage);

      Logger.info('VideoArchiveScreen: Videos loaded', {
        count: allVideos.length,
        storage,
      });
    } catch (error) {
      Logger.error('VideoArchiveScreen: Failed to load videos', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh videos
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadVideos();
    setIsRefreshing(false);
  };

  /**
   * Filter and sort videos
   */
  useEffect(() => {
    let result = [...videos];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (video) =>
          video.text.toLowerCase().includes(query) ||
          video.avatarName.toLowerCase().includes(query) ||
          video.voiceName.toLowerCase().includes(query)
      );
    }

    // Apply platform filter
    if (filterOption !== 'all') {
      result = result.filter((video) => video.platform === filterOption);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.avatarName.localeCompare(b.avatarName);
        case 'name-desc':
          return b.avatarName.localeCompare(a.avatarName);
        default:
          return 0;
      }
    });

    setFilteredVideos(result);
  }, [videos, searchQuery, sortOption, filterOption]);


  /**
   * Navigate to video playback
   */
  const handleVideoPress = (videoId: string) => {
    HapticUtils.light();
    navigation.navigate('VideoPlayback', { videoId });
  };

  /**
   * Delete all videos
   */
  const handleDeleteAll = () => {
    HapticUtils.warning();
    Alert.alert(
      'Delete All Videos',
      `Are you sure you want to delete all ${videos.length} videos? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticUtils.heavy();
              Logger.info('VideoArchiveScreen: Deleting all videos');
              await VideoStorageService.deleteAllVideos();
              HapticUtils.success();
              Alert.alert('Success', 'All videos deleted successfully');
              await loadVideos();
            } catch (error) {
              HapticUtils.error();
              Logger.error('VideoArchiveScreen: Failed to delete all videos', error);
              Alert.alert('Error', 'Failed to delete all videos');
            }
          },
        },
      ]
    );
  };

  /**
   * Format storage size
   */
  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Handle delete video
   */
  const handleDeleteVideo = async (videoId: string, platform: PlatformType) => {
    HapticUtils.light();

    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('VideoArchiveScreen: Deleting video', { videoId });

              // Delete from local storage
              await VideoStorageService.deleteVideo(videoId);

              // If HeyGen video, also delete from API
              if (platform === 'heygen') {
                try {
                  await HeyGenService.deleteVideo(videoId);
                  Logger.info('VideoArchiveScreen: Deleted from HeyGen API');
                } catch (error) {
                  Logger.warn('VideoArchiveScreen: Failed to delete from HeyGen API (already deleted?)', error);
                  // Continue anyway - local deletion is more important
                }
              }

              HapticUtils.success();
              Alert.alert('Success', 'Video deleted successfully');
              loadVideos(); // Reload list
            } catch (error) {
              Logger.error('VideoArchiveScreen: Failed to delete video', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle share video
   */
  const handleShareVideo = async (videoId: string, platform: PlatformType) => {
    HapticUtils.light();

    try {
      Logger.info('VideoArchiveScreen: Sharing video', { videoId, platform });

      if (platform === 'heygen') {
        // Get shareable URL from HeyGen
        Alert.alert('Generating Link', 'Getting shareable link...');
        
        const shareableUrl = await HeyGenService.getShareableUrl(videoId);

        await Share.share({
          message: `Check out this AI-generated video: ${shareableUrl}`,
          url: shareableUrl,
          title: 'Share AI Video',
        });

        Logger.info('VideoArchiveScreen: Video shared successfully');
      } else {
        // D-ID videos - local file only
        Alert.alert(
          'Share Not Available',
          'Sharing is currently only supported for HeyGen videos. D-ID videos are stored locally on your device.'
        );
      }
    } catch (error) {
      Logger.error('VideoArchiveScreen: Failed to share video', error);
      Alert.alert('Error', 'Failed to share video. Please try again.');
    }
  };

  /**
   * Sync videos from HeyGen API
   */
  const handleSyncFromHeyGen = async () => {
    HapticUtils.light();

    try {
      Logger.info('VideoArchiveScreen: Syncing from HeyGen API');
      Alert.alert('Syncing', 'Fetching videos from HeyGen...');

      const result = await HeyGenService.listVideos(50); // Get last 50 videos
      
      Logger.info('VideoArchiveScreen: Fetched videos from HeyGen', {
        count: result.videos.length,
      });

      // Filter completed videos only
      const completedVideos = result.videos.filter(
        (v) => v.status === 'completed'
      );

      if (completedVideos.length === 0) {
        Alert.alert('No New Videos', 'No completed videos found on HeyGen.');
        return;
      }

      HapticUtils.success();
      Alert.alert(
        'Sync Complete',
        `Found ${completedVideos.length} completed video(s) on HeyGen.\n\nNote: Videos are stored in HeyGen's cloud. Use the Share button to get links to your videos.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Logger.error('VideoArchiveScreen: Failed to sync from HeyGen', error);
      HapticUtils.error();
      Alert.alert('Sync Failed', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Render video card
   */
  const renderVideoCard = ({ item }: { item: VideoMetadata }) => (
    <View style={styles.videoCard}>
      <TouchableOpacity
        style={styles.videoCardTouchable}
        onPress={() => handleVideoPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Video Thumbnail Placeholder */}
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailIcon}>🎬</Text>
          <Text style={styles.platformBadge}>
            {item.platform === 'did' ? 'D-ID' : 'HeyGen'}
          </Text>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.text.substring(0, 60)}
            {item.text.length > 60 ? '...' : ''}
          </Text>

          <View style={styles.videoMeta}>
            <Text style={styles.metaText}>👤 {item.avatarName}</Text>
            <Text style={styles.metaText}>🎤 {item.voiceName}</Text>
            <Text style={styles.metaText}>📅 {formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.videoActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShareVideo(item.id, item.platform)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>📤 Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteVideo(item.id, item.platform)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📹</Text>
      <Text style={styles.emptyTitle}>No Videos Yet</Text>
      <Text style={styles.emptyText}>
        {searchQuery || filterOption !== 'all'
          ? 'No videos match your search or filter criteria.'
          : 'Create your first AI-powered video to get started!'}
      </Text>
      {!searchQuery && filterOption === 'all' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('VideoCreation')}
        >
          <Text style={styles.createButtonText}>Create Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter and Sort Row */}
        <View style={styles.filterSortRow}>
          {/* Platform Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Platform:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterOption === 'all' && styles.filterButtonActive,
                ]}
                onPress={() => setFilterOption('all')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterOption === 'all' && styles.filterButtonTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterOption === 'did' && styles.filterButtonActive,
                ]}
                onPress={() => setFilterOption('did')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterOption === 'did' && styles.filterButtonTextActive,
                  ]}
                >
                  D-ID
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterOption === 'heygen' && styles.filterButtonActive,
                ]}
                onPress={() => setFilterOption('heygen')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterOption === 'heygen' && styles.filterButtonTextActive,
                  ]}
                >
                  HeyGen
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                const options: SortOption[] = [
                  'date-desc',
                  'date-asc',
                  'name-asc',
                  'name-desc',
                ];
                const currentIndex = options.indexOf(sortOption);
                const nextIndex = (currentIndex + 1) % options.length;
                setSortOption(options[nextIndex]);
              }}
            >
              <Text style={styles.sortButtonText}>
                {sortOption === 'date-desc' && '📅 ↓'}
                {sortOption === 'date-asc' && '📅 ↑'}
                {sortOption === 'name-asc' && 'A-Z'}
                {sortOption === 'name-desc' && 'Z-A'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage Info */}
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} •{' '}
            {formatStorage(totalStorage)} used
          </Text>
          <View style={styles.storageActions}>
            {filterOption === 'heygen' && (
              <TouchableOpacity onPress={handleSyncFromHeyGen}>
                <Text style={styles.syncText}>↻ Sync</Text>
              </TouchableOpacity>
            )}
            {videos.length > 0 && (
              <TouchableOpacity onPress={handleDeleteAll}>
                <Text style={styles.deleteAllText}>Delete All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Video List */}
      <FlatList
        data={filteredVideos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 180 + 16 + 100, // thumbnail height + margin + info height
          offset: (180 + 16 + 100 + CARD_MARGIN) * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clearIcon: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  filterSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterContainer: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    alignItems: 'flex-end',
  },
  sortLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  storageText: {
    fontSize: 12,
    color: '#6B7280',
  },
  storageActions: {
    flexDirection: 'row',
    gap: 16,
  },
  syncText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  deleteAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  listContent: {
    padding: CARD_MARGIN,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: CARD_MARGIN,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  videoCardTouchable: {
    width: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailIcon: {
    fontSize: 64,
  },
  platformBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 22,
  },
  videoMeta: {
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  videoActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default VideoArchiveScreen;

