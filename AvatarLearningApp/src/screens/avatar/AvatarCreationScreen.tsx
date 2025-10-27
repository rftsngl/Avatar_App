/**
 * Avatar Creation Screen
 * 
 * ============================================================================
 * DEACTIVATED: D-ID Custom Avatar Feature Removed (2025-10-27)
 * ============================================================================
 * This screen is no longer accessible in the app as D-ID custom avatar
 * creation has been removed. HeyGen Avatar IV (instant photo avatars) is
 * now used instead via PhotoAvatarCreationScreen.
 * 
 * Route removed from RootNavigator.tsx.
 * Code kept for reference only.
 * ============================================================================
 * 
 * Allows users to create custom avatars from their photos.
 * Handles photo capture/selection, consent flow, and avatar profile creation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { 
  RootStackParamList, 
  AvatarProfile, 
  PlatformType,
  PhotoAvatarParams,
  PhotoAvatarProfile,
} from '../../types';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';
import { PhotoCaptureService, PhotoResult } from '../../services/photo/PhotoCaptureService';
import { AvatarStorageService } from '../../services/avatar/AvatarStorageService';
import { PhotoAvatarStorageService } from '../../services/avatar/PhotoAvatarStorageService';
import { DIDService } from '../../services/did/DIDService';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { PlatformService } from '../../services/platform/PlatformService';
import { AvatarConsentModal, hasAvatarConsent, PhotoAvatarCreationModal } from '../../components';
import { AVATAR_CREATION_TIPS, SAMPLE_AVATAR_NAMES } from '../../constants/avatarConsent';

/**
 * Navigation props
 * NOTE: Since this screen is deactivated, using generic navigation type
 */
type AvatarCreationScreenNavigationProp = StackNavigationProp<any>;

type AvatarCreationScreenRouteProp = RouteProp<any, any>;

interface AvatarCreationScreenProps {
  navigation: AvatarCreationScreenNavigationProp;
  route?: AvatarCreationScreenRouteProp;
}

/**
 * Avatar Creation Screen Component
 */
export const AvatarCreationScreen: React.FC<AvatarCreationScreenProps> = ({ navigation }) => {
  // State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPhotoAvatarModal, setShowPhotoAvatarModal] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState('');
  const [platform, setPlatform] = useState<PlatformType | null>(null);

  /**
   * Initialize screen
   */
  useEffect(() => {
    initializeScreen();
  }, []);

  /**
   * Initialize screen - check consent and platform
   */
  const initializeScreen = async () => {
    try {
      Logger.info('AvatarCreationScreen: Initializing');

      // Check consent
      const consentStatus = await hasAvatarConsent();
      setHasConsent(consentStatus);

      if (!consentStatus) {
        setShowConsentModal(true);
      }

      // Get selected platform
      const selectedPlatform = await PlatformService.getSelectedPlatform();
      if (!selectedPlatform) {
        Alert.alert('Error', 'No platform selected. Please select a platform first.');
        navigation.goBack();
        return;
      }
      setPlatform(selectedPlatform);

      Logger.info('AvatarCreationScreen: Initialized successfully');
    } catch (error) {
      Logger.error('AvatarCreationScreen: Initialization error', error);
      Alert.alert('Error', 'Failed to initialize avatar creation');
    }
  };

  /**
   * Handle consent accept
   */
  const handleConsentAccept = () => {
    setShowConsentModal(false);
    setHasConsent(true);
    HapticUtils.success();
  };

  /**
   * Handle consent decline
   */
  const handleConsentDecline = () => {
    setShowConsentModal(false);
    HapticUtils.light();
    navigation.goBack();
  };

  /**
   * Handle take photo
   */
  const handleTakePhoto = async () => {
    try {
      HapticUtils.light();
      Logger.info('AvatarCreationScreen: Taking photo');

      const photo = await PhotoCaptureService.takePhoto({
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.9,
      });

      if (photo) {
        // Validate photo
        const validation = PhotoCaptureService.validatePhoto(photo);
        if (!validation.isValid) {
          Alert.alert('Invalid Photo', validation.error || 'Please choose a different photo');
          return;
        }

        setSelectedPhoto(photo);
        HapticUtils.success();
        Logger.info('AvatarCreationScreen: Photo captured successfully');
      }
    } catch (error) {
      Logger.error('AvatarCreationScreen: Error taking photo', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      HapticUtils.error();
    }
  };

  /**
   * Handle select photo from library
   */
  const handleSelectPhoto = async () => {
    try {
      HapticUtils.light();
      Logger.info('AvatarCreationScreen: Selecting photo from library');

      const photo = await PhotoCaptureService.selectPhoto({
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.9,
      });

      if (photo) {
        // Validate photo
        const validation = PhotoCaptureService.validatePhoto(photo);
        if (!validation.isValid) {
          Alert.alert('Invalid Photo', validation.error || 'Please choose a different photo');
          return;
        }

        setSelectedPhoto(photo);
        HapticUtils.success();
        Logger.info('AvatarCreationScreen: Photo selected successfully');
      }
    } catch (error) {
      Logger.error('AvatarCreationScreen: Error selecting photo', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
      HapticUtils.error();
    }
  };

  /**
   * Handle retake photo
   */
  const handleRetakePhoto = () => {
    HapticUtils.light();
    setSelectedPhoto(null);
  };

  /**
   * Handle create avatar
   */
  const handleCreateAvatar = async () => {
    try {
      // Validation
      if (!avatarName.trim()) {
        Alert.alert('Missing Name', 'Please enter a name for your avatar');
        HapticUtils.warning();
        return;
      }

      if (!selectedPhoto) {
        Alert.alert('Missing Photo', 'Please take or select a photo for your avatar');
        HapticUtils.warning();
        return;
      }

      if (!platform) {
        Alert.alert('Error', 'Platform not selected');
        return;
      }

      setIsCreating(true);
      HapticUtils.light();
      Logger.info('AvatarCreationScreen: Creating avatar', { name: avatarName });

      // Generate profile ID
      const profileId = `avatar_${Date.now()}`;

      // Save photo to local storage
      const savedPhoto = await AvatarStorageService.saveAvatarPhoto(
        profileId,
        selectedPhoto.uri,
        selectedPhoto.fileName,
        selectedPhoto.fileSize
      );

      // Upload photo to D-ID and get image URL
      const imageUrl = await DIDService.uploadImage(savedPhoto.filePath);

      // Create avatar profile
      const profile: AvatarProfile = {
        id: profileId,
        name: avatarName.trim(),
        platform,
        apiAvatarId: imageUrl,
        photoPath: savedPhoto.filePath,
        thumbnailUrl: imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true,
        status: 'completed',
      };

      // Save profile
      await AvatarStorageService.saveAvatarProfile(profile);

      Logger.info('AvatarCreationScreen: Avatar created successfully', {
        profileId,
        imageUrl,
      });

      HapticUtils.success();

      // Show success message
      Alert.alert(
        'Avatar Created!',
        `Your custom avatar "${avatarName}" has been created successfully. You can now use it to create videos.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Logger.error('AvatarCreationScreen: Error creating avatar', error);
      Alert.alert(
        'Creation Failed',
        'Failed to create avatar. Please check your API key and try again.'
      );
      HapticUtils.error();
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle photo avatar creation (HeyGen AI-generated)
   */
  const handlePhotoAvatarSubmit = async (params: PhotoAvatarParams) => {
    Logger.info('AvatarCreationScreen: Creating photo avatar', { name: params.name });

    setIsCreating(true);
    setCreationProgress('Generating photo...');

    try {
      // Step 1: Generate photo avatar
      const generated = await HeyGenService.generatePhotoAvatar(params);
      Logger.info('AvatarCreationScreen: Photo generation started', {
        generationId: generated.data.generation_id,
      });

      // Step 2: Poll generation status
      setCreationProgress('Waiting for photo generation...');
      const generationStatus = await HeyGenService.pollPhotoGenerationStatus(
        generated.data.generation_id,
        (status) => {
          Logger.info('AvatarCreationScreen: Generation progress', {
            status: status.data.status,
          });
        }
      );

      if (!generationStatus.data.image_key || !generationStatus.data.image_url) {
        throw new Error('Photo generation completed but no image was returned');
      }

      Logger.info('AvatarCreationScreen: Photo generated successfully', {
        imageKey: generationStatus.data.image_key,
      });

      // Step 3: Create avatar group
      setCreationProgress('Creating avatar group...');
      const avatarGroup = await HeyGenService.createAvatarGroup({
        name: params.name,
        image_key: generationStatus.data.image_key,
        generation_id: generated.data.generation_id,
      });

      Logger.info('AvatarCreationScreen: Avatar group created', {
        avatarGroupId: avatarGroup.data.avatar_group_id,
        avatarId: avatarGroup.data.avatar_id,
      });

      // Step 4: Train avatar
      setCreationProgress('Training avatar (this may take a while)...');
      const training = await HeyGenService.trainAvatar(avatarGroup.data.avatar_group_id);

      Logger.info('AvatarCreationScreen: Training started', {
        jobId: training.data.job_id,
      });

      // Step 5: Poll training status
      const trainingStatus = await HeyGenService.pollTrainingStatus(
        training.data.job_id,
        (status) => {
          const progress = status.data.progress || 0;
          setCreationProgress(`Training avatar... ${progress}%`);
          Logger.info('AvatarCreationScreen: Training progress', {
            status: status.data.status,
            progress,
          });
        }
      );

      Logger.info('AvatarCreationScreen: Training completed', {
        avatarId: trainingStatus.data.avatar_id,
      });

      // Step 6: Save profile locally
      const profileId = `photo_avatar_${Date.now()}`;
      const profile: PhotoAvatarProfile = {
        id: profileId,
        name: params.name,
        platform: 'heygen',
        generationId: generated.data.generation_id,
        imageKey: generationStatus.data.image_key,
        imageUrl: generationStatus.data.image_url,
        avatarGroupId: avatarGroup.data.avatar_group_id,
        avatarId: trainingStatus.data.avatar_id || avatarGroup.data.avatar_id,
        jobId: training.data.job_id,
        status: 'completed',
        params,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await PhotoAvatarStorageService.saveProfile(profile);

      Logger.info('AvatarCreationScreen: Photo avatar created successfully', {
        profileId,
        avatarId: profile.avatarId,
      });

      HapticUtils.success();
      setCreationProgress('');

      // Show success message
      Alert.alert(
        'Photo Avatar Created!',
        `Your AI-generated avatar "${params.name}" has been created successfully. You can now use it to create videos.`,
        [
          {
            text: 'View Avatars',
            onPress: () => navigation.navigate('PhotoAvatarManagement'),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Logger.error('AvatarCreationScreen: Photo avatar creation failed', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      Alert.alert(
        'Creation Failed',
        `Failed to create photo avatar: ${errorMessage}\n\nPlease check your API key and try again.`
      );
      
      HapticUtils.error();
      setCreationProgress('');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Show photo avatar modal (HeyGen)
   */
  const handleShowPhotoAvatarModal = () => {
    if (!hasConsent) {
      setShowConsentModal(true);
      return;
    }
    HapticUtils.light();
    setShowPhotoAvatarModal(true);
  };

  /**
   * Render photo selection section
   */
  const renderPhotoSelection = () => {
    if (selectedPhoto) {
      return (
        <View style={styles.photoPreviewContainer}>
          <Text style={styles.sectionTitle}>Selected Photo</Text>
          <View style={styles.photoPreview}>
            <Image source={{ uri: selectedPhoto.uri }} style={styles.photoImage} />
          </View>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetakePhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.retakeButtonText}>Choose Different Photo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.photoSelectionContainer}>
        <Text style={styles.sectionTitle}>Select Photo</Text>
        <View style={styles.photoButtonsContainer}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.photoButtonIcon}>📸</Text>
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleSelectPhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.photoButtonIcon}>🖼️</Text>
            <Text style={styles.photoButtonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show consent modal if needed
  if (!hasConsent) {
    return (
      <AvatarConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Custom Avatar</Text>
          <Text style={styles.headerSubtitle}>
            {platform === 'heygen'
              ? 'Create an AI-generated avatar with customizable parameters'
              : 'Create a personalized avatar from your photo'}
          </Text>
        </View>

        {/* Platform-specific creation */}
        {platform === 'heygen' ? (
          // HeyGen: AI-generated photo avatar
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HeyGen Photo Avatar</Text>
            <Text style={styles.sectionDescription}>
              Generate an AI avatar by describing its appearance. No photo needed!
            </Text>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleShowPhotoAvatarModal}
              disabled={isCreating}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonIcon}>🎨</Text>
              <Text style={styles.createButtonText}>
                {isCreating ? 'Creating...' : 'Create AI Avatar'}
              </Text>
            </TouchableOpacity>

            {isCreating && creationProgress && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.progressText}>{creationProgress}</Text>
              </View>
            )}

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💡 Describe your avatar's appearance</Text>
              <Text style={styles.infoText}>⏱️ Generation takes 1-3 minutes</Text>
              <Text style={styles.infoText}>💰 Costs ~5 API credits</Text>
            </View>
          </View>
        ) : (
          // D-ID: Photo-based avatar
          <>
            {/* Avatar Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Avatar Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Professional Me, Teacher Avatar"
                placeholderTextColor="#9CA3AF"
                value={avatarName}
            onChangeText={setAvatarName}
            maxLength={50}
            editable={!isCreating}
          />
          <Text style={styles.inputHint}>
            Choose a name to identify this avatar (max 50 characters)
          </Text>
        </View>

            {/* Photo Selection */}
            {renderPhotoSelection()}

            {/* Tips Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Best Results</Text>
              {AVATAR_CREATION_TIPS.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipIcon}>{tip.icon}</Text>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDescription}>{tip.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Create Button (D-ID) */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!avatarName.trim() || !selectedPhoto || isCreating) && styles.createButtonDisabled,
                ]}
                onPress={handleCreateAvatar}
                activeOpacity={0.7}
                disabled={!avatarName.trim() || !selectedPhoto || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create Avatar</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <AvatarConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      <PhotoAvatarCreationModal
        visible={showPhotoAvatarModal}
        onClose={() => setShowPhotoAvatarModal(false)}
        onSubmit={handlePhotoAvatarSubmit}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  photoSelectionContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#6366F1',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    textAlign: 'center',
  },
  photoPreviewContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#0369A1',
    marginLeft: 8,
    flex: 1,
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoText: {
    fontSize: 13,
    color: '#0C4A6E',
    marginBottom: 6,
    lineHeight: 18,
  },
});


