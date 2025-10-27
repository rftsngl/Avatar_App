/**
 * Video Creation Screen
 *
 * ============================================================================
 * MODIFIED: ElevenLabs STT Integration (2025-10-27)
 * ============================================================================
 * Replaced native @react-native-voice/voice with ElevenLabs API for better
 * speech-to-text accuracy. All 13 languages still supported.
 * ============================================================================
 *
 * Allows users to create AI-generated videos by:
 * 1. Entering script text
 * 2. Selecting an avatar
 * 3. Selecting a voice
 * 4. Generating the video
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList, Avatar, Voice, VideoStatus, VideoMetadata, SpeechLanguage, LanguageOption } from '../../types';
import { PlatformService } from '../../services/platform';
import { DIDService } from '../../services/did';
import { HeyGenService } from '../../services/heygen';
import { VideoStorageService } from '../../services/video';
import { ElevenLabsSTTService, ElevenLabsSTTState, SUPPORTED_LANGUAGES } from '../../services/speech';
import { SpeechRecognitionState } from '../../services/speech/SpeechToTextService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import { PermissionUtils } from '../../utils/permissionUtils';
import { AsyncStorageService } from '../../services/storage';

type VideoCreationScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'VideoCreation'
>;

type VideoCreationScreenRouteProp = RouteProp<MainTabParamList, 'VideoCreation'>;

interface Props {
  navigation: VideoCreationScreenNavigationProp;
  route: VideoCreationScreenRouteProp;
}

const MAX_SCRIPT_LENGTH = 1000;

const VideoCreationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [script, setScript] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [currentVideoStatus, setCurrentVideoStatus] = useState<VideoStatus | null>(null);

  // Speech-to-text state (ElevenLabs STT)
  const [speechRecognitionState, setSpeechRecognitionState] = useState<ElevenLabsSTTState>('idle');
  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Navigate to Avatar Catalog
   */
  const handleSelectAvatar = useCallback(() => {
    HapticUtils.light();
    // Store selection mode in AsyncStorage
    AsyncStorageService.setItem('selection_mode', { type: 'avatar', returnScreen: 'VideoCreation' });
    // Navigate using parent navigation (BottomTabs)
    navigation.getParent()?.navigate('AvatarCatalog');
  }, [navigation]);

  /**
   * Navigate to Voice Catalog
   */
  const handleSelectVoice = useCallback(() => {
    HapticUtils.light();
    // Store selection mode in AsyncStorage
    AsyncStorageService.setItem('selection_mode', { type: 'voice', returnScreen: 'VideoCreation' });
    // Navigate using parent navigation (BottomTabs)
    navigation.getParent()?.navigate('VoiceCatalog');
  }, [navigation]);

  /**
   * Check for selected avatar/voice when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      const checkSelection = async () => {
        try {
          // Check for selected avatar
          const selectedAvatarData = await AsyncStorageService.getItem<Avatar>('temp_selected_avatar');
          if (selectedAvatarData) {
            setSelectedAvatar(selectedAvatarData);
            HapticUtils.success();
            Logger.info('VideoCreationScreen: Avatar selected from catalog', { avatarId: selectedAvatarData.id });
            // Clear temp storage
            await AsyncStorageService.removeItem('temp_selected_avatar');
          }

          // Check for selected voice
          const selectedVoiceData = await AsyncStorageService.getItem<Voice>('temp_selected_voice');
          if (selectedVoiceData) {
            setSelectedVoice(selectedVoiceData);
            HapticUtils.success();
            Logger.info('VideoCreationScreen: Voice selected from catalog', { voiceId: selectedVoiceData.id });
            // Clear temp storage
            await AsyncStorageService.removeItem('temp_selected_voice');
          }
        } catch (error) {
          Logger.error('VideoCreationScreen: Error checking selection', error);
        }
      };

      checkSelection();
    }, [])
  );

  /**
   * Load saved language preference
   */
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorageService.getItem<SpeechLanguage>('speech_language');
        if (savedLanguage) {
          setSelectedLanguage(savedLanguage);
          Logger.info('VideoCreationScreen: Loaded language preference', { language: savedLanguage });
        }
      } catch (error) {
        Logger.error('VideoCreationScreen: Failed to load language preference', error);
      }
    };

    loadLanguagePreference();
  }, []);

  /**
   * Initialize ElevenLabs STT service
   */
  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        await ElevenLabsSTTService.initialize(selectedLanguage, {
          onStart: () => {
            Logger.info('VideoCreationScreen: Recording started (ElevenLabs STT)');
            setSpeechRecognitionState('recording');
            HapticUtils.success();
            startRecordingTimer();
          },
          onProcessing: () => {
            Logger.info('VideoCreationScreen: Processing audio with ElevenLabs API');
            setSpeechRecognitionState('processing');
            stopRecordingTimer();
          },
          onResult: (result) => {
            Logger.info('VideoCreationScreen: Transcription result', { text: result.text });
            // Append transcribed text to script
            setScript((prevScript) => {
              const separator = prevScript.trim().length > 0 ? ' ' : '';
              return prevScript + separator + result.text;
            });
            setSpeechRecognitionState('idle');
            HapticUtils.success();
          },
          onEnd: () => {
            Logger.info('VideoCreationScreen: Recording ended');
            setSpeechRecognitionState('idle');
            stopRecordingTimer();
          },
          onError: (error) => {
            Logger.error('VideoCreationScreen: STT error', error);
            setSpeechRecognitionState('error');
            HapticUtils.error();
            stopRecordingTimer();
            Alert.alert('Speech Recognition Error', ErrorHandler.getUserMessage(error));
            setTimeout(() => setSpeechRecognitionState('idle'), 2000);
          },
          onRecordingProgress: (durationMs) => {
            // Progress callback (optional, for advanced UI updates)
          },
        });
      } catch (error) {
        Logger.error('VideoCreationScreen: Failed to initialize ElevenLabs STT', error);
      }
    };

    initializeSpeech();

    return () => {
      // Cleanup on unmount
      ElevenLabsSTTService.destroy();
      stopRecordingTimer();
    };
  }, [selectedLanguage]);

  /**
   * Start recording timer
   */
  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  /**
   * Stop recording timer
   */
  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  };

  /**
   * Map ElevenLabs STT state to SpeechRecognitionState for VoiceInputButton
   * (VoiceInputButton still uses the old state type for UI)
   */
  const mapSTTState = (state: ElevenLabsSTTState): SpeechRecognitionState => {
    switch (state) {
      case 'recording':
        return 'listening';
      case 'processing':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'idle';
    }
  };

  /**
   * Handle voice input button press
   */
  const handleVoiceInput = async () => {
    try {
      if (speechRecognitionState === 'recording') {
        // Stop recording
        HapticUtils.light();
        // Don't set state here - let the service callbacks handle it
        await ElevenLabsSTTService.stopListening();
        // State will be updated by onResult or onEnd callback
      } else if (speechRecognitionState === 'idle') {
        // Check microphone permission
        const hasPermission = await PermissionUtils.ensureMicrophonePermission();

        if (!hasPermission) {
          Logger.warn('VideoCreationScreen: Microphone permission denied');
          PermissionUtils.showPermissionDeniedDialog();
          return;
        }

        // Check if ElevenLabs STT is available (API key configured)
        const isAvailable = await ElevenLabsSTTService.isAvailable();
        if (!isAvailable) {
          Alert.alert(
            'Configuration Required',
            'Please configure your ElevenLabs API key in Settings to use speech-to-text.'
          );
          return;
        }

        // Start recording
        HapticUtils.light();
        // Don't set state here - let the service callbacks handle it
        await ElevenLabsSTTService.startListening(selectedLanguage);
        // State will be updated by onStart callback
      }
    } catch (error) {
      Logger.error('VideoCreationScreen: Voice input error', error);
      setSpeechRecognitionState('error');
      HapticUtils.error();

      const errorMessage = ErrorHandler.getUserMessage(error);
      Alert.alert('Voice Input Error', errorMessage);

      setTimeout(() => setSpeechRecognitionState('idle'), 2000);
    }
  };

  /**
   * Handle language selection
   */
  const handleLanguageSelect = async (language: SpeechLanguage) => {
    try {
      HapticUtils.light();
      setSelectedLanguage(language);
      setShowLanguageSelector(false);

      // Save preference
      await AsyncStorageService.setItem('speech_language', language);

      // Update ElevenLabs STT service language
      ElevenLabsSTTService.setLanguage(language);

      Logger.info('VideoCreationScreen: Language changed', { language });
    } catch (error) {
      Logger.error('VideoCreationScreen: Failed to save language preference', error);
    }
  };

  /**
   * Get status message based on video status
   */
  const getStatusMessage = (status: VideoStatus): string => {
    switch (status) {
      case 'created':
        return 'Video created, starting processing...';
      case 'processing':
        return 'Processing video...';
      case 'done':
      case 'completed':
        return 'Video completed! Downloading...';
      case 'failed':
      case 'error':
        return 'Video generation failed';
      default:
        return 'Generating video...';
    }
  };

  /**
   * Generate video
   */
  const handleGenerateVideo = async () => {
    if (!selectedAvatar || !selectedVoice || !script.trim()) {
      HapticUtils.warning();
      Alert.alert('Missing Information', 'Please select an avatar, voice, and enter a script.');
      return;
    }

    HapticUtils.medium();

    try {
      setIsGenerating(true);
      setGenerationStatus('Initializing video generation...');
      setCurrentVideoStatus(null);

      Logger.info('VideoCreationScreen: Starting video generation', {
        avatarId: selectedAvatar.id,
        voiceId: selectedVoice.id,
        scriptLength: script.length,
      });

      // Get selected platform
      const platform = await PlatformService.getSelectedPlatform();

      if (!platform) {
        throw new Error('No platform selected');
      }

      // Create video generation request
      const request = {
        text: script.trim(),
        avatarId: selectedAvatar.id,
        voiceId: selectedVoice.id,
        platform,
      };

      // Generate video based on platform
      let videoResponse;

      if (platform === 'did') {
        setGenerationStatus('Creating video with D-ID...');
        videoResponse = await DIDService.createVideo(request);

        // Poll for completion
        setGenerationStatus('Processing video...');
        videoResponse = await DIDService.pollVideoStatus(
          videoResponse.id,
          (status) => {
            setCurrentVideoStatus(status);
            setGenerationStatus(getStatusMessage(status));
          }
        );
      } else {
        setGenerationStatus('Creating video with HeyGen...');
        videoResponse = await HeyGenService.createVideo(request);

        // Poll for completion
        setGenerationStatus('Processing video...');
        videoResponse = await HeyGenService.pollVideoStatus(
          videoResponse.id,
          (status) => {
            setCurrentVideoStatus(status);
            setGenerationStatus(getStatusMessage(status));
          }
        );
      }

      // Check if video URL is available
      if (!videoResponse.resultUrl) {
        throw new Error('Video URL not available');
      }

      // Download video to local storage
      setGenerationStatus('Downloading video...');
      const videoId = VideoStorageService.generateVideoId();
      const localPath = await VideoStorageService.downloadVideo(
        videoResponse.resultUrl,
        videoId
      );

      // Save video metadata
      const metadata: VideoMetadata = {
        id: videoId,
        platform,
        avatarId: selectedAvatar.id,
        avatarName: selectedAvatar.name,
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        text: script.trim(),
        createdAt: new Date().toISOString(),
        status: 'completed',
      };

      await VideoStorageService.saveVideoMetadata(metadata);

      Logger.info('VideoCreationScreen: Video generation completed', {
        videoId,
        localPath,
      });

      // Navigate to video playback
      setGenerationStatus('Video ready!');
      HapticUtils.success();
      setTimeout(() => {
        navigation.getParent()?.navigate('VideoPlayback', { videoId });
      }, 500);

    } catch (error) {
      HapticUtils.error();
      Logger.error('VideoCreationScreen: Video generation failed', error);
      const errorMessage = ErrorHandler.getUserMessage(error);
      Alert.alert('Generation Failed', errorMessage);
      setGenerationStatus('');
      setCurrentVideoStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Check if generate button should be enabled
   */
  const isGenerateEnabled = !isGenerating && !!selectedAvatar && !!selectedVoice && script.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Title */}
        <Text style={styles.headerTitle}>AI Avatar</Text>

        {/* Avatar Display - Large Circular */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleSelectAvatar}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {selectedAvatar ? (
            <>
              {selectedAvatar.thumbnailUrl ? (
                <Image
                  source={{ uri: selectedAvatar.thumbnailUrl }}
                  style={styles.avatarImageLarge}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarImageLarge, styles.avatarPlaceholder]}>
                  <Text style={styles.placeholderIconLarge}>👤</Text>
                </View>
              )}
              <View style={styles.changeAvatarBadge}>
                <Text style={styles.changeAvatarText}>✏️</Text>
              </View>
            </>
          ) : (
            <View style={[styles.avatarImageLarge, styles.avatarPlaceholderEmpty]}>
              <Text style={styles.placeholderIconLarge}>👤</Text>
              <Text style={styles.selectAvatarPrompt}>Avatar Seç</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Avatar Name (if selected) */}
        {selectedAvatar && (
          <Text style={styles.avatarName}>{selectedAvatar.name}</Text>
        )}

        {/* Script Input Section */}
        <View style={styles.inputSection}>
          {/* Top Section: Voice & Language Selection */}
          <View style={styles.inputHeader}>
            <TouchableOpacity
              style={styles.voiceSelectButton}
              onPress={handleSelectVoice}
              disabled={isGenerating}
            >
              <Text style={styles.voiceSelectIcon}>🎤</Text>
              <Text style={styles.voiceSelectText} numberOfLines={1}>
                {selectedVoice ? selectedVoice.name : 'Ses Seç'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => {
                HapticUtils.light();
                setShowLanguageSelector(true);
              }}
              disabled={isGenerating || speechRecognitionState === 'recording'}
            >
              <Text style={styles.languageButtonText}>
                {SUPPORTED_LANGUAGES.find((l: LanguageOption) => l.code === selectedLanguage)?.flag}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Text Input with Mic Button */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Avatarın söylemesini istediğin metni yaz..."
              placeholderTextColor="#9CA3AF"
              value={script}
              onChangeText={setScript}
              multiline
              maxLength={MAX_SCRIPT_LENGTH}
              editable={!isGenerating && speechRecognitionState !== 'recording'}
            />

            <TouchableOpacity
              style={styles.micButton}
              onPress={handleVoiceInput}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              {speechRecognitionState === 'recording' ? (
                <View style={styles.recordingIndicator}>
                  <Text style={styles.micIcon}>⏸</Text>
                  <Text style={styles.recordingTime}>{recordingDuration}s</Text>
                </View>
              ) : speechRecognitionState === 'processing' ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Text style={styles.micIcon}>🎤</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Character Count */}
          <Text style={styles.characterCount}>
            {script.length} / {MAX_SCRIPT_LENGTH}
          </Text>
        </View>

        {/* Generation Status */}
        {isGenerating && (
          <View style={styles.statusSection}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.statusText}>{generationStatus}</Text>
            {currentVideoStatus && (
              <Text style={styles.statusDetail}>Status: {currentVideoStatus}</Text>
            )}
          </View>
        )}

        {/* Generate Button - Large Blue Button */}
        <TouchableOpacity
          style={[styles.generateButton, !isGenerateEnabled && styles.generateButtonDisabled]}
          onPress={handleGenerateVideo}
          disabled={!isGenerateEnabled}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>Konuş</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              HapticUtils.light();
              setShowLanguageSelector(false);
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                onPress={() => {
                  HapticUtils.light();
                  setShowLanguageSelector(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.languageScrollView}
              contentContainerStyle={styles.languageScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              {SUPPORTED_LANGUAGES.map((language: LanguageOption) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === language.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{language.name}</Text>
                    <Text style={styles.languageNativeName}>{language.nativeName}</Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  // Header
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  // Avatar Section
  avatarContainer: {
    width: 280,
    height: 280,
    borderRadius: 140,
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImageLarge: {
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderIconLarge: {
    fontSize: 80,
    opacity: 0.3,
  },
  selectAvatarPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  changeAvatarBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  changeAvatarText: {
    fontSize: 20,
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 32,
    textAlign: 'center',
  },
  // Input Section
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  voiceSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  voiceSelectIcon: {
    fontSize: 20,
  },
  voiceSelectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  languageButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: 24,
  },
  inputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 100,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    minHeight: 60,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micIcon: {
    fontSize: 28,
  },
  recordingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTime: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 2,
  },
  characterCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'right',
  },
  // Status Section
  statusSection: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 16,
    textAlign: 'center',
  },
  statusDetail: {
    fontSize: 14,
    color: '#6366F1',
    marginTop: 8,
    textAlign: 'center',
  },
  // Generate Button
  generateButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 48,
    paddingVertical: 20,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  generateButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Legacy styles (kept for compatibility)
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  languageScrollView: {
    maxHeight: 500,
  },
  languageScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  languageNativeName: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: 'bold',
  },
});

export default VideoCreationScreen;

