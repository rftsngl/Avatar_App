/**
 * Photo Avatar Management Screen
 *
 * Manage photo avatars created via HeyGen Photo Avatar API.
 * View, delete, retry failed avatars, and see generation/training status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, PhotoAvatarProfile, PhotoAvatarParams } from '../../types';
import { PhotoAvatarStorageService } from '../../services/avatar';
import { HeyGenService } from '../../services/heygen';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';

type PhotoAvatarManagementScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhotoAvatarManagement'
>;

type PhotoAvatarManagementScreenRouteProp = RouteProp<
  RootStackParamList,
  'PhotoAvatarManagement'
>;

interface Props {
  navigation: PhotoAvatarManagementScreenNavigationProp;
  route: PhotoAvatarManagementScreenRouteProp;
}

const PhotoAvatarManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [profiles, setProfiles] = useState<PhotoAvatarProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingProfileIds, setRetryingProfileIds] = useState<Set<string>>(new Set());

  /**
   * Load profiles from storage
   */
  const loadProfiles = useCallback(async () => {
    try {
      Logger.info('PhotoAvatarManagementScreen: Loading photo avatar profiles');
      const allProfiles = await PhotoAvatarStorageService.getAllProfiles();
      
      // Sort by creation date (newest first)
      const sorted = allProfiles.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setProfiles(sorted);
      Logger.info(`PhotoAvatarManagementScreen: Loaded ${sorted.length} profiles`);
    } catch (error) {
      Logger.error('PhotoAvatarManagementScreen: Error loading profiles', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfiles();
  }, [loadProfiles]);

  /**
   * Handle delete profile
   */
  const handleDelete = useCallback(async (profile: PhotoAvatarProfile) => {
    Alert.alert(
      'Delete Avatar',
      `Are you sure you want to delete "${profile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('PhotoAvatarManagementScreen: Deleting profile', { profileId: profile.id });
              await PhotoAvatarStorageService.deleteProfile(profile.id);
              HapticUtils.success();
              Alert.alert('Success', 'Avatar deleted successfully');
              loadProfiles(); // Reload list
            } catch (error) {
              Logger.error('PhotoAvatarManagementScreen: Error deleting profile', error);
              Alert.alert('Error', ErrorHandler.getUserMessage(error));
            }
          },
        },
      ]
    );
  }, [loadProfiles]);

  /**
   * Handle retry failed avatar
   */
  const handleRetry = useCallback(async (profile: PhotoAvatarProfile) => {
    if (!profile.params) {
      Alert.alert('Error', 'Cannot retry - original parameters not found');
      return;
    }

    try {
      setRetryingProfileIds(prev => new Set(prev).add(profile.id));
      Logger.info('PhotoAvatarManagementScreen: Retrying failed avatar', { profileId: profile.id });

      // Update status to 'generating'
      await PhotoAvatarStorageService.updateProfile(profile.id, {
        status: 'generating',
        error: undefined,
      });

      // Step 1: Generate photo avatar
      const generated = await HeyGenService.generatePhotoAvatar(profile.params);
      const generationId = generated.data.generation_id;

      // Step 2: Poll generation status
      const generationStatus = await HeyGenService.pollPhotoGenerationStatus(
        generationId,
        (status) => {
          Logger.info('PhotoAvatarManagementScreen: Generation progress', { status });
        }
      );

      // Step 3: Create avatar group
      const avatarGroup = await HeyGenService.createAvatarGroup({
        name: profile.name,
        image_key: generationStatus.data.image_key || '',
        generation_id: generationId,
      });

      // Step 4: Train avatar
      await PhotoAvatarStorageService.updateProfile(profile.id, { status: 'training' });

      const training = await HeyGenService.trainAvatar(avatarGroup.data.avatar_group_id);

      // Step 5: Poll training status
      const trainingStatus = await HeyGenService.pollTrainingStatus(
        training.data.job_id,
        (status) => {
          Logger.info('PhotoAvatarManagementScreen: Training progress', { status });
        }
      );

      // Step 6: Update profile with success
      await PhotoAvatarStorageService.updateProfile(profile.id, {
        status: 'completed',
        generationId,
        avatarId: trainingStatus.data.avatar_id,
        imageUrl: generationStatus.data.image_url || undefined,
        error: undefined,
      });

      HapticUtils.success();
      Alert.alert('Success', 'Avatar created successfully!');
      loadProfiles(); // Reload list
    } catch (error) {
      Logger.error('PhotoAvatarManagementScreen: Retry failed', error);
      
      await PhotoAvatarStorageService.updateProfile(profile.id, {
        status: 'failed',
        error: ErrorHandler.getUserMessage(error),
      });

      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setRetryingProfileIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  }, [loadProfiles]);

  /**
   * Handle view details
   */
  const handleViewDetails = useCallback((profile: PhotoAvatarProfile) => {
    const statusEmoji = {
      generating: '⏳',
      training: '🔨',
      completed: '✅',
      failed: '❌',
    }[profile.status];

    const details = [
      `Status: ${statusEmoji} ${profile.status.toUpperCase()}`,
      `Created: ${new Date(profile.createdAt).toLocaleString()}`,
      profile.generationId && `Generation ID: ${profile.generationId}`,
      profile.avatarId && `Avatar ID: ${profile.avatarId}`,
      profile.params?.age && `Age: ${profile.params.age}`,
      profile.params?.gender && `Gender: ${profile.params.gender}`,
      profile.params?.ethnicity && `Ethnicity: ${profile.params.ethnicity}`,
      profile.params?.style && `Style: ${profile.params.style}`,
      profile.error && `Error: ${profile.error}`,
    ].filter(Boolean).join('\n');

    Alert.alert(profile.name, details, [{ text: 'OK' }]);
  }, []);

  /**
   * Load profiles on mount
   */
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  /**
   * Render profile item
   */
  const renderProfileItem = ({ item }: { item: PhotoAvatarProfile }) => {
    const isRetrying = retryingProfileIds.has(item.id);

    const statusConfig = {
      generating: { color: '#F59E0B', label: 'Generating...', icon: '⏳' },
      training: { color: '#3B82F6', label: 'Training...', icon: '🔨' },
      completed: { color: '#10B981', label: 'Completed', icon: '✅' },
      failed: { color: '#EF4444', label: 'Failed', icon: '❌' },
    }[item.status];

    return (
      <View style={styles.profileCard}>
        {/* Avatar Preview */}
        <View style={styles.avatarPreview}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: statusConfig.color + '20' }]}>
              <Text style={styles.avatarPlaceholderIcon}>{statusConfig.icon}</Text>
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.name}</Text>
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          <Text style={styles.profileDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>

          {item.params && (
            <Text style={styles.profileParams} numberOfLines={1}>
              {item.params.age} • {item.params.gender} • {item.params.ethnicity}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.profileActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDetails(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>ℹ️</Text>
          </TouchableOpacity>

          {item.status === 'failed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => handleRetry(item)}
              disabled={isRetrying}
              activeOpacity={0.7}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.actionButtonIcon}>🔄</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  if (profiles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎨</Text>
        <Text style={styles.emptyText}>No photo avatars yet</Text>
        <Text style={styles.emptyHint}>
          Create AI-generated avatars in the Avatar Creation screen
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('PhotoAvatarCreation')}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>Create Photo Avatar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photo Avatars</Text>
        <Text style={styles.headerSubtitle}>
          {profiles.length} {profiles.length === 1 ? 'avatar' : 'avatars'}
        </Text>
      </View>

      {/* Profile List */}
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      />
    </View>
  );
};

/**
 * Styles
 */
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
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#6366F1',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  listContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  avatarPlaceholderIcon: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  profileDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  profileParams: {
    fontSize: 12,
    color: '#6B7280',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonIcon: {
    fontSize: 18,
  },
});

export default PhotoAvatarManagementScreen;
