/**
 * Avatar Profile Management Screen
 * 
 * ============================================================================
 * DEACTIVATED: D-ID Custom Avatar Feature Removed (2025-10-27)
 * ============================================================================
 * This screen is no longer accessible in the app as D-ID custom avatar
 * creation has been removed. HeyGen Avatar IV profiles are managed via
 * PhotoAvatarManagementScreen instead.
 * 
 * Route removed from RootNavigator.tsx.
 * Code kept for reference only.
 * ============================================================================
 * 
 * Allows users to view, rename, and delete custom avatar profiles.
 * Similar to VoiceProfileManagementScreen but for custom avatars.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, AvatarProfile } from '../../types';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';
import { AvatarStorageService } from '../../services/avatar/AvatarStorageService';
import { DIDService } from '../../services/did/DIDService';

/**
 * Navigation props
 * Note: This screen is deactivated but kept for reference.
 * Using 'any' to avoid type errors since route is removed from RootStackParamList.
 */
type AvatarProfileManagementScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  any
>;

type AvatarProfileManagementScreenRouteProp = RouteProp<
  RootStackParamList,
  any
>;

interface AvatarProfileManagementScreenProps {
  navigation: AvatarProfileManagementScreenNavigationProp;
  route: AvatarProfileManagementScreenRouteProp;
}

/**
 * Avatar Profile Management Screen Component
 */
export const AvatarProfileManagementScreen: React.FC<
  AvatarProfileManagementScreenProps
> = ({ navigation }) => {
  // State
  const [profiles, setProfiles] = useState<AvatarProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState({ totalSize: 0, photoCount: 0 });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AvatarProfile | null>(null);
  const [newName, setNewName] = useState('');

  /**
   * Load profiles when screen is focused
   */
  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [])
  );

  /**
   * Load avatar profiles
   */
  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      Logger.info('AvatarProfileManagementScreen: Loading profiles');

      const loadedProfiles = await AvatarStorageService.getAllAvatarProfiles();
      const usage = await AvatarStorageService.getStorageUsage();

      setProfiles(loadedProfiles);
      setStorageUsage(usage);

      Logger.info(`AvatarProfileManagementScreen: Loaded ${loadedProfiles.length} profiles`);
    } catch (error) {
      Logger.error('AvatarProfileManagementScreen: Error loading profiles', error);
      Alert.alert('Error', 'Failed to load avatar profiles');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle rename profile
   */
  const handleRenameProfile = (profile: AvatarProfile) => {
    setSelectedProfile(profile);
    setNewName(profile.name);
    setShowRenameModal(true);
    HapticUtils.light();
  };

  /**
   * Handle save rename
   */
  const handleSaveRename = async () => {
    if (!selectedProfile || !newName.trim()) {
      HapticUtils.warning();
      return;
    }

    try {
      Logger.info('AvatarProfileManagementScreen: Renaming profile', {
        profileId: selectedProfile.id,
        newName,
      });

      const updatedProfile: AvatarProfile = {
        ...selectedProfile,
        name: newName.trim(),
        updatedAt: new Date().toISOString(),
      };

      await AvatarStorageService.saveAvatarProfile(updatedProfile);

      setShowRenameModal(false);
      setSelectedProfile(null);
      setNewName('');
      HapticUtils.success();

      await loadProfiles();
    } catch (error) {
      Logger.error('AvatarProfileManagementScreen: Error renaming profile', error);
      Alert.alert('Error', 'Failed to rename avatar profile');
      HapticUtils.error();
    }
  };

  /**
   * Handle delete profile
   */
  const handleDeleteProfile = (profile: AvatarProfile) => {
    HapticUtils.light();

    Alert.alert(
      'Delete Avatar Profile',
      `Are you sure you want to delete "${profile.name}"? This will delete the avatar photo from your device.`,
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
              Logger.info('AvatarProfileManagementScreen: Deleting profile', {
                profileId: profile.id,
              });

              // Delete from local storage
              await AvatarStorageService.deleteAvatarProfile(profile.id);

              // Note: D-ID images are automatically deleted after 24 hours
              // No need to call API to delete

              HapticUtils.success();
              await loadProfiles();
            } catch (error) {
              Logger.error('AvatarProfileManagementScreen: Error deleting profile', error);
              Alert.alert('Error', 'Failed to delete avatar profile');
              HapticUtils.error();
            }
          },
        },
      ]
    );
  };

  /**
   * Handle create new avatar
   */
  const handleCreateNewAvatar = () => {
    HapticUtils.light();
    // Note: AvatarCreation route removed, redirecting to PhotoAvatarCreation (HeyGen Avatar IV)
    navigation.navigate('PhotoAvatarCreation');
  };

  /**
   * Render profile item
   */
  const renderProfileItem = ({ item }: { item: AvatarProfile }) => {
    const statusColor =
      item.status === 'completed' ? '#10B981' : item.status === 'failed' ? '#EF4444' : '#F59E0B';

    return (
      <View style={styles.profileCard}>
        {/* Avatar Photo */}
        <View style={styles.profilePhotoContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
              <Text style={styles.profilePhotoPlaceholderText}>👤</Text>
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.name}</Text>
          <View style={styles.profileMetaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
            <Text style={styles.profilePlatform}>{item.platform.toUpperCase()}</Text>
          </View>
          <Text style={styles.profileDate}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.profileActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRenameProfile(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteProfile(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>👤</Text>
      <Text style={styles.emptyStateTitle}>No Custom Avatars</Text>
      <Text style={styles.emptyStateText}>
        Create your first custom avatar from a photo to get started
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleCreateNewAvatar}
        activeOpacity={0.7}
      >
        <Text style={styles.emptyStateButtonText}>Create Avatar</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading avatar profiles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Custom Avatars</Text>
        <Text style={styles.headerSubtitle}>
          {profiles.length} {profiles.length === 1 ? 'avatar' : 'avatars'} •{' '}
          {AvatarStorageService.formatFileSize(storageUsage.totalSize)} used
        </Text>
      </View>

      {/* Profile List */}
      {profiles.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB Button */}
      {profiles.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateNewAvatar}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Avatar</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowRenameModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveRename}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
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
  header: {
    backgroundColor: '#6366F1',
    padding: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  profilePhotoContainer: {
    marginRight: 16,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPlaceholderText: {
    fontSize: 40,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  profilePlatform: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  profileDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    backgroundColor: '#6366F1',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


