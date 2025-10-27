/**
 * Advanced Settings Screen
 *
 * Comprehensive settings screen with:
 * - Platform management
 * - Voice profile management
 * - Custom avatar management
 * - Storage information
 * - App information
 * - Clear data options
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList, PlatformType } from '../../types';
import { PlatformService } from '../../services/platform';
import { VideoStorageService } from '../../services/video/VideoStorageService';
import { VoiceCloneStorageService } from '../../services/voice/VoiceCloneStorageService';
import { AvatarStorageService } from '../../services/avatar/AvatarStorageService';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';

/**
 * Navigation props
 * CompositeNavigationProp allows navigation to both tab screens and stack screens
 */
type SettingsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Settings'>,
  StackNavigationProp<RootStackParamList>
>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

/**
 * App version from package.json
 */
const APP_VERSION = '0.0.1';
const APP_BUILD = '1';

/**
 * Settings Screen Component
 */
const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [didConfigured, setDidConfigured] = useState(false);
  const [heygenConfigured, setHeygenConfigured] = useState(false);
  const [elevenlabsConfigured, setElevenlabsConfigured] = useState(false);
  const [voiceProfileCount, setVoiceProfileCount] = useState(0);
  const [avatarProfileCount, setAvatarProfileCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [storageUsage, setStorageUsage] = useState({
    videos: 0,
    voices: 0,
    avatars: 0,
    total: 0,
  });
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  /**
   * Load HeyGen credits
   */
  const loadCredits = async () => {
    try {
      setLoadingCredits(true);
      Logger.info('SettingsScreen: Loading HeyGen credits');
      
      const remainingCredits = await HeyGenService.getRemainingQuota();
      setCredits(remainingCredits);
      
      Logger.info('SettingsScreen: Credits loaded', { credits: remainingCredits });
    } catch (error) {
      Logger.error('SettingsScreen: Error loading credits', error);
      setCredits(null);
    } finally {
      setLoadingCredits(false);
    }
  };

  /**
   * Load settings data
   */
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      Logger.info('SettingsScreen: Loading settings');

      // Get platform state
      const platformState = await PlatformService.getPlatformState();
      setSelectedPlatform(platformState.selectedPlatform);
      setDidConfigured(platformState.didConfig.isConfigured);
      setHeygenConfigured(platformState.heygenConfig.isConfigured);

      // Check if ElevenLabs is configured
      const elevenlabsAPIKey = await SecureStorageService.getElevenLabsAPIKey();
      setElevenlabsConfigured(!!elevenlabsAPIKey);

      // Load credits if HeyGen is configured and selected
      if (platformState.selectedPlatform === 'heygen' && platformState.heygenConfig.isConfigured) {
        loadCredits();
      }

      // Get voice profiles
      const voiceProfiles = await VoiceCloneStorageService.getAllVoiceProfiles();
      setVoiceProfileCount(voiceProfiles.length);

      // Get avatar profiles
      const avatarProfiles = await AvatarStorageService.getAllAvatarProfiles();
      setAvatarProfileCount(avatarProfiles.length);

      // Get videos
      const videos = await VideoStorageService.getAllVideos();
      setVideoCount(videos.length);

      // Get storage usage
      const voiceStorage = await VoiceCloneStorageService.getStorageUsage();
      const avatarStorage = await AvatarStorageService.getStorageUsage();

      // Calculate video storage (approximate)
      let videoStorage = 0;
      for (const video of videos) {
        try {
          const RNFS = require('react-native-fs');
          // Construct video path from ID (mp4 or mov)
          const mp4Path = `${RNFS.DocumentDirectoryPath}/videos/${video.id}.mp4`;
          const movPath = `${RNFS.DocumentDirectoryPath}/videos/${video.id}.mov`;
          
          // Try mp4 first, then mov
          const videoPath = (await RNFS.exists(mp4Path)) ? mp4Path : movPath;
          
          if (await RNFS.exists(videoPath)) {
            const stat = await RNFS.stat(videoPath);
            videoStorage += stat.size;
          }
        } catch (error) {
          Logger.warn('SettingsScreen: Failed to get video file size', error);
        }
      }

      setStorageUsage({
        videos: videoStorage,
        voices: voiceStorage.totalSize,
        avatars: avatarStorage.totalSize,
        total: videoStorage + voiceStorage.totalSize + avatarStorage.totalSize,
      });

      Logger.info('SettingsScreen: Settings loaded successfully');
    } catch (error) {
      Logger.error('SettingsScreen: Error loading settings', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load settings on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  /**
   * Handle platform switch
   */
  const handleSwitchPlatform = async (platform: PlatformType) => {
    HapticUtils.light();

    const platformName = platform === 'did' ? 'D-ID' : 'HeyGen';
    const isConfigured = platform === 'did' ? didConfigured : heygenConfigured;

    if (!isConfigured) {
      Alert.alert(
        'Platform Not Configured',
        `${platformName} is not configured. Would you like to set it up now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Setup',
            onPress: () => navigation.navigate('APIKeySetup', { platform }),
          },
        ]
      );
      return;
    }

    if (platform === selectedPlatform) {
      return;
    }

    Alert.alert(
      'Switch Platform',
      `Switch to ${platformName}? Your existing videos and profiles will remain available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            const success = await PlatformService.switchPlatform(platform);
            if (success) {
              HapticUtils.success();
              setSelectedPlatform(platform);
              Alert.alert('Success', `Switched to ${platformName}`);
            } else {
              HapticUtils.error();
              Alert.alert('Error', 'Failed to switch platform');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle configure ElevenLabs API key
   */
  const handleConfigureElevenLabs = () => {
    HapticUtils.light();
    // ElevenLabs için özel bir parametre veya ekran kullanın
    navigation.navigate('APIKeySetup', { platform: 'elevenlabs' as any });
    // VEYA: Ayrı bir ElevenLabs yapılandırma ekranı oluşturun
    // navigation.navigate('ElevenLabsSetup');
  };

  /**
   * Handle remove ElevenLabs API key
   */
  const handleRemoveElevenLabsAPIKey = () => {
    HapticUtils.light();

    Alert.alert(
      'Remove ElevenLabs API Key',
      'This will remove your ElevenLabs API key. Speech-to-text feature will no longer work until you configure it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStorageService.deleteElevenLabsAPIKey();
              setElevenlabsConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'ElevenLabs API key removed');
              Logger.info('SettingsScreen: ElevenLabs API key removed');
            } catch (error) {
              Logger.error('SettingsScreen: Failed to remove ElevenLabs API key', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to remove API key');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle clear all data
   */
  const handleClearAllData = () => {
    HapticUtils.light();

    Alert.alert(
      'Clear All Data',
      'This will delete all videos, voice profiles, custom avatars, and API keys. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all voice profiles
              await VoiceCloneStorageService.deleteAllProfiles();

              // Delete all avatar profiles
              await AvatarStorageService.deleteAllProfiles();

              // Delete all videos
              const videos = await VideoStorageService.getAllVideos();
              for (const video of videos) {
                await VideoStorageService.deleteVideo(video.id);
              }

              // Clear platform data
              await PlatformService.clearAllPlatformData();

              HapticUtils.success();
              Alert.alert('Success', 'All data cleared successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to Welcome screen (use getParent for root navigator)
                    const rootNavigation = navigation.getParent();
                    if (rootNavigation) {
                      rootNavigation.reset({
                        index: 0,
                        routes: [{ name: 'Welcome' }],
                      });
                    }
                  },
                },
              ]);
            } catch (error) {
              Logger.error('SettingsScreen: Error clearing data', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle open URL
   */
  const handleOpenURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    } catch (error) {
      Logger.error('SettingsScreen: Error opening URL', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Platform Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform</Text>

          <TouchableOpacity
            style={[
              styles.platformCard,
              selectedPlatform === 'did' && styles.platformCardSelected,
            ]}
            onPress={() => handleSwitchPlatform('did')}
            activeOpacity={0.7}
          >
            <View style={styles.platformCardHeader}>
              <Text style={styles.platformCardTitle}>D-ID</Text>
              {selectedPlatform === 'did' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.platformCardStatus}>
              {didConfigured ? '✅ Configured' : '❌ Not Configured'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.platformCard,
              selectedPlatform === 'heygen' && styles.platformCardSelected,
            ]}
            onPress={() => handleSwitchPlatform('heygen')}
            activeOpacity={0.7}
          >
            <View style={styles.platformCardHeader}>
              <Text style={styles.platformCardTitle}>HeyGen</Text>
              {selectedPlatform === 'heygen' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.platformCardStatus}>
              {heygenConfigured ? '✅ Configured' : '❌ Not Configured'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* API Usage Section (HeyGen Only) */}
        {selectedPlatform === 'heygen' && heygenConfigured && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>API Usage</Text>
              <TouchableOpacity
                onPress={loadCredits}
                disabled={loadingCredits}
                activeOpacity={0.7}
              >
                <Text style={styles.refreshButton}>
                  {loadingCredits ? '⟳' : '↻'} Refresh
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.creditCard}>
              <View style={styles.creditCardIcon}>
                <Text style={styles.creditIconText}>💳</Text>
              </View>
              <View style={styles.creditCardContent}>
                <Text style={styles.creditCardLabel}>Remaining Credits</Text>
                {loadingCredits ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : credits !== null ? (
                  <Text style={styles.creditCardValue}>
                    {credits.toFixed(2)} credits
                  </Text>
                ) : (
                  <Text style={styles.creditCardError}>Unable to load</Text>
                )}
                <Text style={styles.creditCardHint}>
                  Free plan: 10 credits • Pro: 100+ credits
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ElevenLabs STT Service Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speech-to-Text Service</Text>
          
          <View style={styles.platformCard}>
            <View style={styles.platformCardHeader}>
              <Text style={styles.platformCardTitle}>ElevenLabs API</Text>
              <View style={[
                styles.activeBadge,
                { backgroundColor: elevenlabsConfigured ? '#10B981' : '#EF4444' }
              ]}>
                <Text style={styles.activeBadgeText}>
                  {elevenlabsConfigured ? 'Configured' : 'Not Configured'}
                </Text>
              </View>
            </View>
            <Text style={styles.platformCardDescription}>
              Required for speech-to-text input in 13 languages
            </Text>
            
            <View style={styles.platformCardButtons}>
              {elevenlabsConfigured ? (
                <>
                  <TouchableOpacity
                    style={[styles.platformButton, styles.platformButtonPrimary]}
                    onPress={handleConfigureElevenLabs}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.platformButtonText}>Update Key</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.platformButton, styles.platformButtonDanger]}
                    onPress={handleRemoveElevenLabsAPIKey}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.platformButtonTextDanger}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.platformButton, styles.platformButtonPrimary]}
                  onPress={handleConfigureElevenLabs}
                  activeOpacity={0.7}
                >
                  <Text style={styles.platformButtonText}>Configure API Key</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Content Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('VoiceProfileManagement')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>🎤</Text>
              <View>
                <Text style={styles.menuItemTitle}>Voice Profiles</Text>
                <Text style={styles.menuItemSubtitle}>{voiceProfileCount} profiles</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AvatarProfileManagement')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <View>
                <Text style={styles.menuItemTitle}>Custom Avatars</Text>
                <Text style={styles.menuItemSubtitle}>{avatarProfileCount} avatars</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          {selectedPlatform === 'heygen' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('PhotoAvatarManagement')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>🎨</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Photo Avatars</Text>
                  <Text style={styles.menuItemSubtitle}>AI-generated avatars</Text>
                </View>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MainTabs', { screen: 'VideoArchive' })}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>🎬</Text>
              <View>
                <Text style={styles.menuItemTitle}>Video Archive</Text>
                <Text style={styles.menuItemSubtitle}>{videoCount} videos</Text>
              </View>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          {selectedPlatform === 'heygen' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('TemplateSelection')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuItemIcon}>📋</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Video Templates</Text>
                  <Text style={styles.menuItemSubtitle}>Quick video generation</Text>
                </View>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>

          <View style={styles.storageCard}>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Videos</Text>
              <Text style={styles.storageValue}>{formatFileSize(storageUsage.videos)}</Text>
            </View>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Voice Profiles</Text>
              <Text style={styles.storageValue}>{formatFileSize(storageUsage.voices)}</Text>
            </View>
            <View style={styles.storageRow}>
              <Text style={styles.storageLabel}>Custom Avatars</Text>
              <Text style={styles.storageValue}>{formatFileSize(storageUsage.avatars)}</Text>
            </View>
            <View style={[styles.storageRow, styles.storageRowTotal]}>
              <Text style={styles.storageLabelTotal}>Total</Text>
              <Text style={styles.storageValueTotal}>{formatFileSize(storageUsage.total)}</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App Name</Text>
              <Text style={styles.aboutValue}>Avatar Learning App</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>{APP_VERSION} ({APP_BUILD})</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Platform</Text>
              <Text style={styles.aboutValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearAllData}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for Turkish Language Learning
          </Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  platformCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  platformCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  platformCardStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  creditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  creditCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  creditIconText: {
    fontSize: 24,
  },
  creditCardContent: {
    flex: 1,
  },
  creditCardLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  creditCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 4,
  },
  creditCardError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  creditCardHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  storageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  storageRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  storageLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  storageLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  storageValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  platformCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  platformCardButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  platformButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  platformButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  platformButtonDanger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  platformButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  platformButtonTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default SettingsScreen;

