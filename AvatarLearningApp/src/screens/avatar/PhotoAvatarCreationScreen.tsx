/**
 * Photo Avatar Creation Screen (Avatar IV - Instant Video)
 *
 * ============================================================================
 * HeyGen Avatar IV Integration (2025-10-27)
 * ============================================================================
 * This screen uses HeyGen's Avatar IV feature for instant video generation
 * from photos. Already fully implemented with HeyGen API methods:
 * - uploadAsset() for photo upload
 * - generateInstantVideo() for Avatar IV generation
 * - pollInstantVideoStatus() for status checking
 * ============================================================================
 *
 * Allows users to create instant videos from their photos using HeyGen's Avatar IV feature.
 * This is a simplified photo-to-video workflow (1-2 minutes) vs. trained avatars (10-30 minutes).
 *
 * Flow:
 * 1. User selects/captures photo
 * 2. User enters script text
 * 3. User selects voice
 * 4. Upload photo → Get image_key
 * 5. Generate instant video
 * 6. Poll status until ready
 * 7. Save video to archive
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { RootStackParamList, Voice, VideoMetadata } from '../../types';
import { HeyGenService } from '../../services/heygen';
import { PhotoCaptureService } from '../../services/photo/PhotoCaptureService';
import { VideoStorageService } from '../../services/video/VideoStorageService';
import { AsyncStorageService } from '../../services/storage';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import { PermissionUtils } from '../../utils/permissionUtils';
import { AvatarConsentModal } from '../../components';

type PhotoAvatarCreationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhotoAvatarCreation'
>;

type PhotoAvatarCreationScreenRouteProp = RouteProp<
  RootStackParamList,
  'PhotoAvatarCreation'
>;

interface Props {
  navigation: PhotoAvatarCreationScreenNavigationProp;
  route: PhotoAvatarCreationScreenRouteProp;
}

type CreationStep = 'consent' | 'photo' | 'script' | 'voice' | 'preview' | 'generating';

const PhotoAvatarCreationScreen: React.FC<Props> = ({ navigation, route }) => {
  // State
  const [currentStep, setCurrentStep] = useState<CreationStep>('consent');
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [videoOrientation, setVideoOrientation] = useState<'landscape' | 'portrait' | 'square'>('landscape');

  /**
   * Handle consent acceptance
   */
  const handleConsentAccept = useCallback(async () => {
    try {
      // Save consent
      await AsyncStorageService.setItem('photo_avatar_consent', {
        accepted: true,
        version: '1.0',
        acceptedAt: new Date().toISOString(),
      });

      Logger.info('PhotoAvatarCreationScreen: Consent accepted');
      setShowConsentModal(false);
      setCurrentStep('photo');
      HapticUtils.success();
    } catch (error) {
      Logger.error('PhotoAvatarCreationScreen: Failed to save consent', error);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    }
  }, []);

  /**
   * Handle consent decline
   */
  const handleConsentDecline = useCallback(() => {
    Logger.info('PhotoAvatarCreationScreen: Consent declined');
    HapticUtils.light();
    navigation.goBack();
  }, [navigation]);

  /**
   * Handle photo capture from camera
   */
  const handleTakePhoto = useCallback(async () => {
    try {
      // Check camera permission
      const hasPermission = await PermissionUtils.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take photos. Please enable it in Settings.'
        );
        return;
      }

      const photo = await PhotoCaptureService.takePhoto();
      if (photo) {
        setPhotoUri(photo.uri);
        setCurrentStep('script');
        HapticUtils.success();
        Logger.info('PhotoAvatarCreationScreen: Photo captured', { uri: photo.uri });
      }
    } catch (error) {
      Logger.error('PhotoAvatarCreationScreen: Failed to capture photo', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
      HapticUtils.error();
    }
  }, []);

  /**
   * Handle photo selection from library
   */
  const handleSelectPhoto = useCallback(async () => {
    try {
      // Check photo library permission
      const hasPermission = await PermissionUtils.requestPhotoLibraryPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Photo library access is required. Please enable it in Settings.'
        );
        return;
      }

      const photo = await PhotoCaptureService.selectPhoto();
      if (photo) {
        setPhotoUri(photo.uri);
        setCurrentStep('script');
        HapticUtils.success();
        Logger.info('PhotoAvatarCreationScreen: Photo selected', { uri: photo.uri });
      }
    } catch (error) {
      Logger.error('PhotoAvatarCreationScreen: Failed to select photo', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
      HapticUtils.error();
    }
  }, []);

  /**
   * Handle voice selection
   */
  const handleSelectVoice = useCallback(async () => {
    try {
      // Set selection mode for voice catalog
      await AsyncStorageService.setItem('selection_mode', {
        type: 'voice',
        returnScreen: 'PhotoAvatarCreation',
      });

      // Navigate to voice catalog
      navigation.navigate('MainTabs', { 
        screen: 'VoiceCatalog',
      });
    } catch (error) {
      Logger.error('PhotoAvatarCreationScreen: Failed to navigate to voice catalog', error);
      Alert.alert('Error', 'Failed to open voice catalog');
    }
  }, [navigation]);

  /**
   * Handle generate video
   */
  const handleGenerateVideo = useCallback(async () => {
    if (!photoUri || !script || !selectedVoice) {
      Alert.alert('Missing Information', 'Please complete all steps before generating video.');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setGenerationProgress('Uploading photo...');

    try {
      // Step 1: Upload photo to get image_key
      Logger.info('PhotoAvatarCreationScreen: Uploading photo');
      const imageKey = await HeyGenService.uploadAsset(photoUri, 'avatar-photo.jpg');
      
      setGenerationProgress('Creating instant video...');

      // Step 2: Generate instant video
      Logger.info('PhotoAvatarCreationScreen: Generating instant video', {
        imageKey,
        voiceId: selectedVoice.id,
        orientation: videoOrientation,
      });

      const generatedVideoId = await HeyGenService.generateInstantVideo(
        imageKey,
        script,
        selectedVoice.id,
        `Photo Avatar - ${new Date().toLocaleDateString()}`,
        videoOrientation
      );

      setGenerationProgress('Processing video (1-2 minutes)...');

      // Step 3: Poll video status
      const videoUrl = await HeyGenService.pollInstantVideoStatus(
        generatedVideoId,
        (status) => {
          setGenerationProgress(`Video status: ${status}`);
        },
        60, // 5 minutes max
        5000 // Check every 5 seconds
      );

      setGenerationProgress('Saving video...');

      // Step 4: Save video to local storage and archive
      const videoId = VideoStorageService.generateVideoId();
      const localPath = await VideoStorageService.downloadVideo(videoUrl, videoId);

      // Get file stats
      const stat = await RNFS.stat(localPath);

      const metadata: VideoMetadata = {
        id: videoId,
        platform: 'heygen' as const,
        avatarId: generatedVideoId,
        avatarName: 'Photo Avatar',
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        text: script,
        createdAt: new Date().toISOString(),
        status: 'completed' as const,
        duration: 0,
      };

      await VideoStorageService.saveVideoMetadata(metadata);

      Logger.info('PhotoAvatarCreationScreen: Video created and saved', { videoId });

      // Success!
      HapticUtils.success();
      Alert.alert(
        'Success!',
        'Your instant video is ready! You can find it in the Video Archive.',
        [
          {
            text: 'View Video',
            onPress: () => {
              navigation.replace('VideoPlayback', { videoId: videoId });
            },
          },
          {
            text: 'Create Another',
            onPress: () => {
              // Reset form
              setPhotoUri(null);
              setScript('');
              setSelectedVoice(null);
              setCurrentStep('photo');
              setIsGenerating(false);
              setGenerationProgress('');
            },
          },
          {
            text: 'Go to Archive',
            onPress: () => {
              navigation.navigate('MainTabs', { screen: 'VideoArchive' });
            },
          },
        ]
      );
    } catch (error) {
      Logger.error('PhotoAvatarCreationScreen: Failed to generate video', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
      HapticUtils.error();
      setIsGenerating(false);
      setCurrentStep('preview');
    }
  }, [photoUri, script, selectedVoice, videoOrientation, navigation]);

  /**
   * Check for temp selected voice on focus
   */
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const tempVoice = await AsyncStorageService.getItem<Voice>('temp_selected_voice');
      if (tempVoice) {
        setSelectedVoice(tempVoice);
        setCurrentStep('preview');
        await AsyncStorageService.removeItem('temp_selected_voice');
        Logger.info('PhotoAvatarCreationScreen: Voice selected', { voiceId: tempVoice.id });
      }
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Render consent modal
   */
  if (showConsentModal) {
    return (
      <AvatarConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    );
  }

  /**
   * Render generating state
   */
  if (currentStep === 'generating') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.generatingText}>{generationProgress}</Text>
        <Text style={styles.generatingHint}>
          This may take 1-2 minutes. Please don't close the app.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Instant Video</Text>
          <Text style={styles.headerSubtitle}>
            Transform your photo into a talking avatar in 1-2 minutes
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, currentStep !== 'photo' && styles.stepCompleted]}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepLabel}>Photo</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, currentStep === 'preview' && styles.stepCompleted]}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepLabel}>Script</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, selectedVoice && styles.stepCompleted]}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepLabel}>Voice</Text>
          </View>
        </View>

        {/* Photo Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Your Photo</Text>
          {photoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => setCurrentStep('photo')}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                <Text style={styles.photoButtonIcon}>📷</Text>
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={handleSelectPhoto}>
                <Text style={styles.photoButtonIcon}>🖼️</Text>
                <Text style={styles.photoButtonText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Script Input */}
        {photoUri && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✍️ Script</Text>
            <Text style={styles.sectionHint}>
              What should your avatar say? (Max 500 characters)
            </Text>
            <TextInput
              style={styles.scriptInput}
              placeholder="Enter the text your avatar will speak..."
              placeholderTextColor="#9CA3AF"
              value={script}
              onChangeText={setScript}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{script.length} / 500</Text>
          </View>
        )}

        {/* Voice Selection */}
        {photoUri && script && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎤 Voice</Text>
            {selectedVoice ? (
              <View style={styles.voiceSelected}>
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceName}>{selectedVoice.name}</Text>
                  <Text style={styles.voiceDetails}>
                    {selectedVoice.language} • {selectedVoice.gender}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeVoiceButton}
                  onPress={handleSelectVoice}
                >
                  <Text style={styles.changeVoiceText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.selectVoiceButton} onPress={handleSelectVoice}>
                <Text style={styles.selectVoiceText}>Select Voice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Video Orientation */}
        {photoUri && script && selectedVoice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📐 Video Orientation</Text>
            <View style={styles.orientationButtons}>
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  videoOrientation === 'landscape' && styles.orientationButtonActive,
                ]}
                onPress={() => setVideoOrientation('landscape')}
              >
                <Text style={styles.orientationIcon}>🖥️</Text>
                <Text style={styles.orientationLabel}>Landscape</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  videoOrientation === 'portrait' && styles.orientationButtonActive,
                ]}
                onPress={() => setVideoOrientation('portrait')}
              >
                <Text style={styles.orientationIcon}>📱</Text>
                <Text style={styles.orientationLabel}>Portrait</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  videoOrientation === 'square' && styles.orientationButtonActive,
                ]}
                onPress={() => setVideoOrientation('square')}
              >
                <Text style={styles.orientationIcon}>⬜</Text>
                <Text style={styles.orientationLabel}>Square</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Generate Button */}
        {photoUri && script && selectedVoice && (
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateVideo}
            disabled={isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : '🎬 Generate Instant Video'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  generatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  generatingHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  step: {
    alignItems: 'center',
  },
  stepCompleted: {
    opacity: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  changePhotoButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  scriptInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  selectVoiceButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  selectVoiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  voiceSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  voiceDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  changeVoiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  changeVoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  orientationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  orientationButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  orientationButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  orientationIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  orientationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  generateButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PhotoAvatarCreationScreen;
