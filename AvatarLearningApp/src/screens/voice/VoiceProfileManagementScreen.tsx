/**
 * Voice Profile Management Screen
 * 
 * ============================================================================
 * DEACTIVATED: D-ID Voice Cloning Feature Removed (2025-10-27)
 * ============================================================================
 * This screen is no longer accessible in the app as voice cloning was a
 * D-ID-only feature. HeyGen does not support user voice cloning.
 * 
 * Route removed from RootNavigator.tsx.
 * Code kept for reference only.
 * ============================================================================
 * 
 * Displays and manages all cloned voice profiles.
 * Allows users to view, rename, and delete voice profiles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, VoiceProfile } from '../../types';
import { VoiceCloneStorageService } from '../../services/voice/VoiceCloneStorageService';
import { DIDService } from '../../services/did/DIDService';
import { HapticUtils } from '../../utils/hapticUtils';
import { Logger } from '../../utils/Logger';

type VoiceProfileManagementScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VoiceProfileManagement'
>;
type VoiceProfileManagementScreenRouteProp = RouteProp<
  RootStackParamList,
  'VoiceProfileManagement'
>;

interface Props {
  navigation: VoiceProfileManagementScreenNavigationProp;
  route: VoiceProfileManagementScreenRouteProp;
}

/**
 * Voice Profile Management Screen Component
 */
export const VoiceProfileManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState({ totalSize: 0, sampleCount: 0 });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  /**
   * Load profiles on mount and when screen is focused
   */
  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [])
  );

  /**
   * Load all voice profiles
   */
  const loadProfiles = async () => {
    try {
      setLoading(true);
      const allProfiles = await VoiceCloneStorageService.getAllVoiceProfiles();
      const usage = await VoiceCloneStorageService.getStorageUsage();
      setProfiles(allProfiles);
      setStorageUsage(usage);
      Logger.info('VoiceProfileManagementScreen: Profiles loaded', {
        count: allProfiles.length,
      });
    } catch (error) {
      Logger.error('VoiceProfileManagementScreen: Failed to load profiles', error);
      Alert.alert('Error', 'Failed to load voice profiles');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle create new profile
   */
  const handleCreateNewProfile = () => {
    navigation.navigate('VoiceCloning');
  };

  /**
   * Handle rename profile
   */
  const handleRenameProfile = (profile: VoiceProfile) => {
    setSelectedProfile(profile);
    setNewProfileName(profile.name);
    setShowRenameModal(true);
    HapticUtils.light();
  };

  /**
   * Save renamed profile
   */
  const saveRenamedProfile = async () => {
    if (!selectedProfile || !newProfileName.trim()) {
      return;
    }

    try {
      const updatedProfile = {
        ...selectedProfile,
        name: newProfileName.trim(),
        updatedAt: new Date().toISOString(),
      };

      await VoiceCloneStorageService.saveVoiceProfile(updatedProfile);
      setProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p));
      setShowRenameModal(false);
      setSelectedProfile(null);
      setNewProfileName('');
      HapticUtils.success();
      Logger.info('VoiceProfileManagementScreen: Profile renamed', {
        profileId: updatedProfile.id,
        newName: newProfileName.trim(),
      });
    } catch (error) {
      Logger.error('VoiceProfileManagementScreen: Failed to rename profile', error);
      Alert.alert('Error', 'Failed to rename profile');
    }
  };

  /**
   * Handle delete profile
   */
  const handleDeleteProfile = (profile: VoiceProfile) => {
    Alert.alert(
      'Delete Voice Profile',
      `Are you sure you want to delete "${profile.name}"? This will also delete all voice samples.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from API if needed
              if (profile.apiVoiceId) {
                try {
                  if (profile.platform === 'did') {
                    await DIDService.deleteClonedVoice(profile.apiVoiceId);
                  }
                } catch (apiError) {
                  Logger.warn('VoiceProfileManagementScreen: Failed to delete from API', apiError);
                  // Continue with local deletion even if API deletion fails
                }
              }

              // Delete from local storage
              await VoiceCloneStorageService.deleteVoiceProfile(profile.id);
              setProfiles(profiles.filter(p => p.id !== profile.id));
              
              // Update storage usage
              const usage = await VoiceCloneStorageService.getStorageUsage();
              setStorageUsage(usage);

              HapticUtils.success();
              Logger.info('VoiceProfileManagementScreen: Profile deleted', {
                profileId: profile.id,
              });
            } catch (error) {
              Logger.error('VoiceProfileManagementScreen: Failed to delete profile', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  /**
   * Render profile item
   */
  const renderProfileItem = ({ item }: { item: VoiceProfile }) => (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.name}</Text>
          <Text style={styles.profilePlatform}>
            {item.platform.toUpperCase()} • {item.sampleCount} samples • {item.totalDuration}s
          </Text>
          <Text style={styles.profileDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'completed' && styles.statusCompleted,
          item.status === 'processing' && styles.statusProcessing,
          item.status === 'failed' && styles.statusFailed,
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'completed' ? '✓' : item.status === 'processing' ? '⏳' : '✕'}
          </Text>
        </View>
      </View>

      <View style={styles.profileActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.renameButton]}
          onPress={() => handleRenameProfile(item)}
        >
          <Text style={styles.actionButtonText}>Rename</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProfile(item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎤</Text>
      <Text style={styles.emptyTitle}>No Voice Profiles</Text>
      <Text style={styles.emptyText}>
        Create your first voice profile to get started with personalized AI voices.
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateNewProfile}>
        <Text style={styles.createButtonText}>Create Voice Profile</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Voice Profiles</Text>
        <Text style={styles.subtitle}>Manage your cloned voices</Text>
      </View>

      {/* Storage Usage */}
      <View style={styles.storageCard}>
        <Text style={styles.storageTitle}>Storage Usage</Text>
        <Text style={styles.storageText}>
          {VoiceCloneStorageService.formatFileSize(storageUsage.totalSize)} • {storageUsage.sampleCount} samples
        </Text>
      </View>

      {/* Profiles List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Create Button (when profiles exist) */}
      {profiles.length > 0 && (
        <TouchableOpacity style={styles.fabButton} onPress={handleCreateNewProfile}>
          <Text style={styles.fabButtonText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Rename Voice Profile</Text>
            <TextInput
              style={styles.modalInput}
              value={newProfileName}
              onChangeText={setNewProfileName}
              placeholder="Enter new name"
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRenameModal(false);
                  setSelectedProfile(null);
                  setNewProfileName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveRenamedProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  storageCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  storageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profilePlatform: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  profileDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusProcessing: {
    backgroundColor: '#FEF3C7',
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 16,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  renameButton: {
    backgroundColor: '#EEF2FF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fabButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabButtonText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

