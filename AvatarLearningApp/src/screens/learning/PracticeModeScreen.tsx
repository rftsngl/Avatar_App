/**
 * PracticeModeScreen.tsx
 * 
 * Custom text pronunciation practice.
 * Users enter any text and practice pronunciation.
 * 
 * Features:
 * - Custom text input
 * - Voice recording (ElevenLabs STT)
 * - Simple word-matching accuracy
 * - Practice history
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types';
import { ElevenLabsSTTService } from '../../services/speech/ElevenLabsSTTService';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { AsyncStorageService } from '../../services/storage/AsyncStorageService';
import { VideoStorageService } from '../../services/video/VideoStorageService';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';
import { PermissionUtils } from '../../utils/permissionUtils';
import { ErrorHandler } from '../../utils/ErrorHandler';
import type { VideoMetadata } from '../../types';

/**
 * PracticeModeScreen Component
 */
export const PracticeModeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // API key checks
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);

  // Practice state
  const [customText, setCustomText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isAssessing, setIsAssessing] = useState(false);

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('');
  const [generatedVideoId, setGeneratedVideoId] = useState<string | null>(null);

  /**
   * Check API keys on mount
   */
  useEffect(() => {
    checkAPIKeys();
  }, []);

  /**
   * Recording timer
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const checkAPIKeys = async () => {
    try {
      const elevenLabsKey = await SecureStorageService.getElevenLabsAPIKey();
      setHasElevenLabsKey(!!elevenLabsKey);
    } catch (error) {
      Logger.error('PracticeModeScreen: Error checking API keys', error);
    } finally {
      setIsCheckingKeys(false);
    }
  };

  /**
   * Start recording AND video generation in parallel
   */
  const handleStartRecording = async () => {
    if (!hasElevenLabsKey) {
      Alert.alert(
        '🎙️ ElevenLabs API Required',
        'Voice input requires ElevenLabs Speech-to-Text API.\n\nConfigure your API key in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('LearningSettings') },
        ]
      );
      return;
    }

    if (!customText.trim()) {
      Alert.alert('Error', 'Please enter some text to practice first.');
      return;
    }

    try {
      // Check microphone permission BEFORE starting recording
      const hasPermission = await PermissionUtils.requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert(
          'Microphone Permission Required',
          'Please grant microphone permission to use voice recording.',
          [{ text: 'OK' }]
        );
        return;
      }

      setTranscription('');
      setAccuracy(0);
      setIsRecording(true);
      setRecordingTime(0);
      setGeneratedVideoId(null); // Reset previous video
      
      // Start video generation in parallel (background)
      startVideoGeneration();
      
      // Initialize ElevenLabs STT
      await ElevenLabsSTTService.initialize('en-US', {
        onResult: (result) => {
          setTranscription(result.text);
          Logger.info('PracticeModeScreen: Transcription received', { length: result.text.length });
        },
        onError: (error) => {
          Logger.error('PracticeModeScreen: STT error', error);
          Alert.alert('Error', 'Speech recognition failed. Please try again.');
        },
        onRecordingProgress: (seconds) => {
          setRecordingTime(seconds);
        },
      });
      
      await ElevenLabsSTTService.startListening('en-US');
      HapticUtils.light();
      Logger.info('PracticeModeScreen: Recording started');
    } catch (error) {
      Logger.error('PracticeModeScreen: Failed to start recording', error);
      HapticUtils.error();
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  /**
   * Stop recording and assess pronunciation
   */
  const handleStopRecording = async () => {
    try {
      // Stop recording and get audio file path + transcription
      const { audioFilePath, transcription: recordedText } = await ElevenLabsSTTService.stopListening();
      setIsRecording(false);
      HapticUtils.success();
      Logger.info('PracticeModeScreen: Recording stopped', { 
        audioFilePath,
        transcription: recordedText,
        transcriptionLength: recordedText?.length || 0,
      });

      // Check if transcription is valid
      if (!recordedText || recordedText.trim().length === 0) {
        Alert.alert(
          'No Speech Detected',
          'Could not detect any speech. Please try again and speak clearly.',
          [{ text: 'OK' }]
        );
        await ElevenLabsSTTService.cleanupRecording();
        return;
      }

      // Check if transcription contains non-English characters
      const hasNonEnglish = /[\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(recordedText);
      if (hasNonEnglish) {
        Logger.warn('PracticeModeScreen: Non-English characters detected', { transcription: recordedText });
        Alert.alert(
          'Speech Recognition Issue',
          'Could not understand the speech clearly. Please try again.\n\nTip: Speak clearly in English.',
          [{ text: 'OK' }]
        );
        await ElevenLabsSTTService.cleanupRecording();
        setTranscription('');
        return;
      }

      if (recordedText && customText.trim()) {
        // Use simple word-matching accuracy
        setIsAssessing(true);
        const calculatedAccuracy = calculateAccuracy(recordedText, customText.trim());
        setAccuracy(calculatedAccuracy);
        setIsAssessing(false);
        
        showSimpleFeedback(calculatedAccuracy);
        
        // Cleanup recording file
        await ElevenLabsSTTService.cleanupRecording();
      }
    } catch (error) {
      Logger.error('PracticeModeScreen: Failed to stop recording', error);
      setIsRecording(false);
      setIsAssessing(false);
      
      // Cleanup on error
      try {
        await ElevenLabsSTTService.cleanupRecording();
      } catch (cleanupError) {
        Logger.error('PracticeModeScreen: Cleanup failed', cleanupError);
      }
    }
  };

  /**
   * Calculate accuracy (simple word match)
   */
  const calculateAccuracy = (userText: string, correctText: string): number => {
    const userWords = userText.toLowerCase().split(/\s+/);
    const correctWords = correctText.toLowerCase().split(/\s+/);
    
    let matches = 0;
    correctWords.forEach((word) => {
      if (userWords.includes(word)) {
        matches++;
      }
    });

    return correctWords.length > 0 ? (matches / correctWords.length) * 100 : 0;
  };

  /**
   * Show simple feedback
   */
  const showSimpleFeedback = (accuracy: number) => {
    if (accuracy >= 80) {
      Alert.alert(
        'Great Job! 🎉',
        `Accuracy: ${accuracy.toFixed(0)}%\n\nYou're doing excellent!`
      );
      HapticUtils.success();
    } else if (accuracy >= 50) {
      Alert.alert(
        'Good Try! 👍',
        `Accuracy: ${accuracy.toFixed(0)}%\n\nKeep practicing!`
      );
      HapticUtils.light();
    } else {
      Alert.alert(
        'Keep Practicing! 💪',
        `Accuracy: ${accuracy.toFixed(0)}%\n\nTry again!`
      );
      HapticUtils.light();
    }
  };

  /**
   * Start video generation in background (parallel with recording)
   */
  const startVideoGeneration = async () => {
    if (!customText.trim()) return;

    try {
      setIsGeneratingVideo(true);
      setVideoGenerationProgress('Checking API keys...');

      // Check if HeyGen API key exists
      const heygenKey = await SecureStorageService.getAPIKey('heygen');
      if (!heygenKey) {
        Logger.warn('PracticeModeScreen: HeyGen API key not configured, skipping video generation');
        setIsGeneratingVideo(false);
        setVideoGenerationProgress('');
        return;
      }

      // Get user preferences for default avatar and voice
      const preferences = await AsyncStorageService.getUserPreferencesWithDefaults();

      if (!preferences.defaultAvatarId || !preferences.defaultVoiceId) {
        Logger.warn('PracticeModeScreen: Default avatar/voice not set, skipping video generation');
        setIsGeneratingVideo(false);
        setVideoGenerationProgress('');
        return;
      }

      setVideoGenerationProgress('Creating video...');
      Logger.info('PracticeModeScreen: Starting background video generation', {
        text: customText,
        avatarId: preferences.defaultAvatarId,
        voiceId: preferences.defaultVoiceId,
      });

      // Create video
      const response = await HeyGenService.createVideo({
        text: customText,
        avatarId: preferences.defaultAvatarId,
        voiceId: preferences.defaultVoiceId,
        platform: 'heygen',
      });

      setVideoGenerationProgress('Processing video...');

      // Poll for completion
      const result = await HeyGenService.pollVideoStatus(
        response.id,
        (status) => {
          Logger.info('PracticeModeScreen: Video status', { status });
          if (status === 'processing') {
            setVideoGenerationProgress('Generating video...');
          }
        },
        60,
        5000
      );

      if (result.status === 'completed' && result.resultUrl) {
        setVideoGenerationProgress('Downloading video...');
        
        // Download and save video
        const videoId = VideoStorageService.generateVideoId();
        const localPath = await VideoStorageService.downloadVideo(result.resultUrl, videoId);

        const videoMetadata: VideoMetadata = {
          id: videoId,
          platform: 'heygen',
          avatarId: preferences.defaultAvatarId,
          avatarName: 'Default Avatar',
          voiceId: preferences.defaultVoiceId,
          voiceName: 'Default Voice',
          text: customText,
          duration: 0,
          createdAt: new Date().toISOString(),
          status: 'completed',
          cloudVideoUrl: result.resultUrl,
        };

        await VideoStorageService.saveVideoMetadata(videoMetadata);

        setGeneratedVideoId(videoId);
        setVideoGenerationProgress('Video ready!');
        HapticUtils.success();
        
        Logger.info('PracticeModeScreen: Video generated successfully', { videoId });
      }
    } catch (error) {
      Logger.error('PracticeModeScreen: Background video generation failed', error);
      setVideoGenerationProgress('Video generation failed');
      
      // Don't show alert for background errors - just log them
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  if (isCheckingKeys) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Enter Text to Practice</Text>
      <Text style={styles.sectionDescription}>
        Type any sentence or phrase you want to practice pronouncing.
      </Text>

      <TextInput
        style={styles.textInput}
        placeholder="Enter a sentence to practice..."
        placeholderTextColor="#9CA3AF"
        value={customText}
        onChangeText={setCustomText}
        multiline
        textAlignVertical="top"
      />

      {!hasElevenLabsKey && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ ElevenLabs API required for voice input. Please configure in Settings.
          </Text>
        </View>
      )}

      <View style={styles.recordingSection}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.recordButton, (!customText.trim() || !hasElevenLabsKey) && styles.buttonDisabled]}
            onPress={handleStartRecording}
            disabled={!customText.trim() || !hasElevenLabsKey || isAssessing}
          >
            <Text style={styles.recordButtonText}>
              🎙️ {hasElevenLabsKey ? 'Start Recording' : 'Configure ElevenLabs First'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
            >
              <Text style={styles.stopButtonText}>⏹️ Stop Recording</Text>
            </TouchableOpacity>
            <Text style={styles.recordingIndicator}>
              🔴 Recording... {recordingTime}s
            </Text>
          </View>
        )}

        {isAssessing && (
          <View style={styles.assessingBox}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.assessingText}>Analyzing pronunciation...</Text>
          </View>
        )}

        {transcription && !isAssessing && (
          <View style={styles.transcriptionBox}>
            <Text style={styles.transcriptionLabel}>Your Speech:</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}
      </View>

      {/* Video Status Card */}
      {(isGeneratingVideo || generatedVideoId || videoGenerationProgress) && (
        <View style={styles.videoStatusCard}>
          {isGeneratingVideo ? (
            <>
              <View style={styles.videoStatusHeader}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.videoStatusTitle}>Preparing Pronunciation Guide</Text>
              </View>
              <Text style={styles.videoStatusProgress}>{videoGenerationProgress}</Text>
            </>
          ) : generatedVideoId ? (
            <>
              <View style={styles.videoStatusHeader}>
                <Text style={styles.videoReadyIcon}>✅</Text>
                <Text style={styles.videoStatusTitle}>Video Ready!</Text>
              </View>
              <TouchableOpacity
                style={styles.watchVideoButton}
                onPress={() => navigation.navigate('VideoPlayback', { videoId: generatedVideoId })}
              >
                <Text style={styles.watchVideoButtonText}>▶️ Watch Pronunciation Guide</Text>
              </TouchableOpacity>
            </>
          ) : videoGenerationProgress.includes('failed') ? (
            <View style={styles.videoStatusHeader}>
              <Text style={styles.videoErrorIcon}>⚠️</Text>
              <Text style={styles.videoStatusTitle}>Video generation failed</Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordingSection: {
    marginTop: 8,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  transcriptionBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  transcriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordingIndicator: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  assessingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  assessingText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  assessmentBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#374151',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  videoStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  videoStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  videoStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  videoStatusProgress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  videoReadyIcon: {
    fontSize: 20,
  },
  videoErrorIcon: {
    fontSize: 20,
  },
  watchVideoButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  watchVideoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generateVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  generateVideoButtonIcon: {
    fontSize: 18,
  },
  generateVideoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
