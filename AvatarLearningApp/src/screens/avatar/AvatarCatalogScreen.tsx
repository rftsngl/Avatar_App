/**
 * Avatar Catalog Screen
 *
 * ============================================================================
 * MODIFIED: HeyGen-Only Platform (2025-10-27)
 * ============================================================================
 * Displays available avatars from HeyGen platform only.
 * Removed: D-ID avatars, custom avatars (D-ID-only feature)
 * HeyGen Photo Avatar profiles managed in PhotoAvatarManagementScreen instead.
 * ============================================================================
 * 
 * Allows users to browse and select an avatar for video creation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList, Avatar, AvatarGender, PlatformType } from '../../types';
import { PlatformService } from '../../services/platform';
import { HeyGenService } from '../../services/heygen';
import Colors, { Shadows, BorderRadius, Spacing } from '../../constants/colors';
import { CacheUtils } from '../../utils/cacheUtils';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import { AsyncStorageService } from '../../services/storage';

type AvatarCatalogScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'AvatarCatalog'>,
  StackNavigationProp<RootStackParamList>
>;

type AvatarCatalogScreenRouteProp = RouteProp<MainTabParamList, 'AvatarCatalog'>;

interface Props {
  navigation: AvatarCatalogScreenNavigationProp;
  route: AvatarCatalogScreenRouteProp;
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_SPACING = 16;
const ITEM_WIDTH = (width - (COLUMN_COUNT + 1) * ITEM_SPACING) / COLUMN_COUNT;

const AvatarCatalogScreen: React.FC<Props> = ({ navigation, route }) => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [filteredAvatars, setFilteredAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGender, setSelectedGender] = useState<AvatarGender | 'all'>('all');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [currentPlatform, setCurrentPlatform] = useState<PlatformType | null>(null);

  /**
   * Fetch avatars from HeyGen API
   * MODIFIED: Removed D-ID avatars and custom avatars (D-ID-only feature)
   */
  const fetchAvatars = useCallback(async (useCache: boolean = true) => {
    try {
      Logger.info('AvatarCatalogScreen: Fetching avatars');

      // Get selected platform (always 'heygen' now)
      const platform = await PlatformService.getSelectedPlatform();

      if (!platform) {
        Alert.alert('Error', 'No platform selected. Please select a platform first.');
        navigation.goBack();
        return;
      }

      // Store current platform
      setCurrentPlatform(platform);

      // REMOVED: Custom avatars from AvatarStorageService (D-ID-only feature)
      // HeyGen Photo Avatar profiles are managed separately via PhotoAvatarManagementScreen

      // Check cache first if useCache is true
      if (useCache) {
        const cacheResult = await CacheUtils.getValidAvatarCache(platform);
        if (cacheResult.isValid && cacheResult.data) {
          Logger.info(`AvatarCatalogScreen: Using cached avatars (${cacheResult.data.length})`);
          setAvatars(cacheResult.data);
          setFilteredAvatars(cacheResult.data);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from HeyGen API only (D-ID removed)
      const fetchedAvatars: Avatar[] = await HeyGenService.fetchAvatars();

      // Save to cache
      await CacheUtils.saveAvatarCache(platform, fetchedAvatars);

      // MODIFIED: No custom avatars (D-ID-only feature removed)
      setAvatars(fetchedAvatars);
      setFilteredAvatars(fetchedAvatars);
      Logger.info(`AvatarCatalogScreen: Fetched ${fetchedAvatars.length} stock avatars`);
    } catch (error) {
      Logger.error('AvatarCatalogScreen: Error fetching avatars', error);
      const errorMessage = ErrorHandler.getUserMessage(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigation]);

  /**
   * Handle pull to refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAvatars(false); // Force refresh, bypass cache
  }, [fetchAvatars]);

  /**
   * Filter avatars by gender
   */
  const filterByGender = useCallback((gender: AvatarGender | 'all') => {
    setSelectedGender(gender);

    if (gender === 'all') {
      setFilteredAvatars(avatars);
    } else {
      const filtered = avatars.filter((avatar) => avatar.gender === gender);
      setFilteredAvatars(filtered);
    }
  }, [avatars]);

  /**
   * Handle avatar selection
   */
  const handleAvatarSelect = useCallback(async (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    
    // Check if we're in selection mode
    const selectionMode = await AsyncStorageService.getItem<{ type: string; returnScreen: string }>('selection_mode');
    
    if (selectionMode && selectionMode.type === 'avatar') {
      // Store selected avatar temporarily
      await AsyncStorageService.setItem('temp_selected_avatar', avatar);
      // Clear selection mode
      await AsyncStorageService.removeItem('selection_mode');
      // Navigate back to the return screen
      HapticUtils.success();
      Logger.info('AvatarCatalogScreen: Avatar selected for video creation', { avatarId: avatar.id });
      navigation.navigate(selectionMode.returnScreen as any);
    }
  }, [navigation]);

  /**
   * Handle avatar selection (for browsing mode - just show details)
   */
  const handleConfirmSelection = () => {
    if (!selectedAvatar) {
      Alert.alert('No Selection', 'Please select an avatar first.');
      return;
    }

    Logger.info('AvatarCatalogScreen: Avatar viewed', { avatarId: selectedAvatar.id });
    
    // Show avatar details
    Alert.alert(
      selectedAvatar.name,
      `Gender: ${selectedAvatar.gender}\n\nTo use this avatar, go to the Video tab and select it during video creation.`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Load avatars on mount
   */
  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  /**
   * Render gender filter button
   */
  const renderGenderFilter = (gender: AvatarGender | 'all', label: string) => {
    const isSelected = selectedGender === gender;

    return (
      <TouchableOpacity
        key={gender}
        style={[styles.filterButton, isSelected && styles.filterButtonActive]}
        onPress={() => filterByGender(gender)}
      >
        <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render avatar item
   */
  const renderAvatarItem = ({ item }: { item: Avatar }) => {
    const isSelected = selectedAvatar?.id === item.id;
    // Use imageUrl if available, fallback to thumbnailUrl
    const imageSource = item.imageUrl || item.thumbnailUrl;

    return (
      <TouchableOpacity
        style={[
          styles.avatarCard,
          isSelected && styles.avatarCardSelected,
          item.isCustom && styles.avatarCardCustom,
        ]}
        onPress={() => handleAvatarSelect(item)}
        activeOpacity={0.7}
      >
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>👤</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>✓</Text>
          </View>
        )}
        {item.isCustom && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>👤 Custom</Text>
          </View>
        )}
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.avatarGender}>{item.gender}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading avatars...</Text>
      </View>
    );
  }

  /**
   * Render empty state
   */
  if (filteredAvatars.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No avatars found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAvatars(false)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Create Button (HeyGen only) */}
      {currentPlatform === 'heygen' && (
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('PhotoAvatarCreation')}
          >
            <Text style={styles.createButtonIcon}>📸</Text>
            <Text style={styles.createButtonText}>Create Instant Video</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gender Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filter by Gender:</Text>
        <View style={styles.filtersRow}>
          {renderGenderFilter('all', 'All')}
          {renderGenderFilter('male', 'Male')}
          {renderGenderFilter('female', 'Female')}
          {renderGenderFilter('other', 'Other')}
        </View>
      </View>

      {/* Avatar Grid */}
      <FlatList
        data={filteredAvatars}
        renderItem={renderAvatarItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
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
      />

      {/* Confirm Button */}
      {selectedAvatar && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSelection}>
            <Text style={styles.confirmButtonText}>
              Select {selectedAvatar.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonIcon: {
    fontSize: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: ITEM_SPACING,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  avatarCard: {
    width: ITEM_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: ITEM_SPACING,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  avatarCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 3,
    ...Shadows.large,
  },
  avatarCardCustom: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  avatarImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.2,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarInfo: {
    padding: 12,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  avatarGender: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AvatarCatalogScreen;

