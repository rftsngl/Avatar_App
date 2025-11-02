/**
 * LearnModeScreen.tsx
 * 
 * AI-powered sentence generation for language learning.
 * Users select topic and difficulty, AI generates practice sentences.
 * 
 * Features:
 * - Topic and level selection
 * - AI sentence generation (Gemini)
 * - Voice recording (ElevenLabs STT)
 * - Simple word-matching accuracy
 * - Progress tracking
 * 
 * @author Avatar Learning App
 * @date 2025-11-02
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types';
import { GeminiService } from '../../services/ai/GeminiService';
import { ElevenLabsSTTService } from '../../services/speech/ElevenLabsSTTService';
import { PracticeHistoryService } from '../../services/storage/PracticeHistoryService';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { UserService } from '../../services/user/UserService';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { AsyncStorageService } from '../../services/storage/AsyncStorageService';
import { VideoStorageService } from '../../services/video/VideoStorageService';
import {
  SentencePracticeCard,
  LearningTopicSelector,
} from '../../components/learning';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import { PermissionUtils } from '../../utils/permissionUtils';
import type {
  LearningTopic,
  LanguageLevel,
  AISentenceSet,
  PracticeResult,
  VideoMetadata,
} from '../../types';

/**
 * LearnModeScreen Component
 */
export const LearnModeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // API key checks
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);

  // Learn mode state
  const [selectedTopic, setSelectedTopic] = useState<LearningTopic>('greetings');
  const [selectedLevel, setSelectedLevel] = useState<LanguageLevel>('A1');
  const [currentSet, setCurrentSet] = useState<AISentenceSet | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isGeneratingSentences, setIsGeneratingSentences] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
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

  const checkAPIKeys = async () => {
    try {
      const geminiKey = await SecureStorageService.getGeminiAPIKey();
      const elevenLabsKey = await SecureStorageService.getElevenLabsAPIKey();

      setHasGeminiKey(!!geminiKey);
      setHasElevenLabsKey(!!elevenLabsKey);
    } catch (error) {
      Logger.error('LearnModeScreen: Error checking API keys', error);
    } finally {
      setIsCheckingKeys(false);
    }
  };

  /**
   * Generate sentences
   */
  const handleGenerateSentences = async () => {
    if (!hasGeminiKey) {
      Alert.alert(
        '🤖 Gemini API Required',
        'Learn mode uses Google Gemini AI to generate practice sentences.\n\nConfigure your Gemini API key in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('LearningSettings') },
        ]
      );
      return;
    }

    try {
      setIsGeneratingSentences(true);
      HapticUtils.light();

      const result = await GeminiService.generateSentences(
        selectedTopic,
        selectedLevel,
        'en',
        'tr',
        10
      );

      setCurrentSet(result);
      setCurrentSentenceIndex(0);
      setTranscription('');

      HapticUtils.success();
      Logger.info('LearnModeScreen: Sentences generated', { count: result.sentences.length });
    } catch (error) {
      Logger.error('LearnModeScreen: Error generating sentences', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsGeneratingSentences(false);
    }
  };

  /**
   * Recording timer effect
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

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

    if (!currentSet) return;

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

      setIsRecording(true);
      setTranscription('');
      setGeneratedVideoId(null); // Reset previous video
      HapticUtils.light();

      // Start video generation in parallel (background)
      startVideoGeneration();

      // Initialize with callbacks
      await ElevenLabsSTTService.initialize('en-US', {
        onResult: (result) => {
          setTranscription(result.text);
          Logger.info('LearnModeScreen: Transcription received', { text: result.text });
        },
        onError: (error) => {
          Logger.error('LearnModeScreen: Recording error', error);
          HapticUtils.error();
          Alert.alert('Recording Error', error.message);
          setIsRecording(false);
        },
        onRecordingProgress: (durationMs: number) => {
          // Progress handled by useEffect timer
        },
      });

      // Start listening
      await ElevenLabsSTTService.startListening('en-US');

      Logger.info('LearnModeScreen: Recording started');
    } catch (error) {
      Logger.error('LearnModeScreen: Failed to start recording', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
      setIsRecording(false);
    }
  };

  /**
   * Stop recording
   */
  const handleStopRecording = async () => {
    try {
      // Stop recording and get audio file path + transcription
      const { audioFilePath, transcription: recordedText } = await ElevenLabsSTTService.stopListening();
      setIsRecording(false);
      HapticUtils.success();
      
      Logger.info('LearnModeScreen: Recording stopped', { 
        audioFilePath,
        transcription: recordedText,
        transcriptionLength: recordedText?.length || 0,
        hasCurrentSet: !!currentSet,
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

      // Check if transcription contains non-English characters (might be wrong language detection)
      const hasNonEnglish = /[\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(recordedText);
      if (hasNonEnglish) {
        Logger.warn('LearnModeScreen: Non-English characters detected in transcription', {
          transcription: recordedText,
        });
        Alert.alert(
          'Speech Recognition Issue',
          'Could not understand the speech clearly. Please try again.\n\nTip: Speak clearly in English.',
          [{ text: 'OK' }]
        );
        await ElevenLabsSTTService.cleanupRecording();
        setTranscription('');
        return;
      }

      if (recordedText && currentSet) {
        Logger.info('LearnModeScreen: Entering assessment block', {
          transcription: recordedText,
          currentSentence: currentSet.sentences[currentSentenceIndex]?.text,
        });
        
        const currentSentence = currentSet.sentences[currentSentenceIndex];
        
        // Use simple word-matching accuracy
        // (Azure Speech Service pronunciation assessment requires SDK, not available via REST API)
        const accuracy = calculateAccuracy(recordedText, currentSentence.text);
        await savePracticeResult(currentSentence.text, recordedText, accuracy);
        showSimpleFeedback(accuracy);
        
        // Cleanup recording file
        await ElevenLabsSTTService.cleanupRecording();
      } else {
        // Debug: Why is this block not entered?
        Logger.warn('LearnModeScreen: Assessment block skipped', {
          hasTranscription: !!recordedText,
          transcription: recordedText || '(empty)',
          hasCurrentSet: !!currentSet,
          currentSetId: currentSet?.id || '(no set)',
        });
      }
    } catch (error) {
      Logger.error('LearnModeScreen: Failed to stop recording', error);
      setIsRecording(false);
      setIsAssessing(false);
      
      // Cleanup on error
      try {
        await ElevenLabsSTTService.cleanupRecording();
      } catch (cleanupError) {
        Logger.error('LearnModeScreen: Cleanup failed', cleanupError);
      }
    }
  };

  /**
   * Save practice result to history (offline cache)
   */
  const savePracticeResult = async (
    referenceText: string,
    transcribedText: string,
    accuracy: number
  ) => {
    try {
      Logger.info('LearnModeScreen: Saving practice result', {
        accuracy,
        referenceLength: referenceText.length,
        transcriptionLength: transcribedText.length,
      });

      // Get device-unique user ID (generated on first launch)
      const userId = await UserService.getUserId();

      // Create simplified practice result
      const practiceResult: PracticeResult = {
        id: `practice_${Date.now()}`,
        mode: 'learn' as const,
        timestamp: new Date().toISOString(),
        
        // Input
        referenceText,
        userAudio: '', // Audio file path (not saved in Learn mode)
        
        // STT Result
        transcribedText,
        
        // Simple accuracy score
        accuracy,
        
        // Metadata
        avatarId: '', // Not relevant for Learn mode
        voiceId: '', // Not relevant for Learn mode
        language: 'en-US', // Default for now
      };

      // Save to history with dynamic user ID
      await PracticeHistoryService.addPractice(userId, 'learn', practiceResult);

      Logger.info('LearnModeScreen: Practice result saved successfully', {
        userId: `${userId.substring(0, 8)}...`, // Log only first 8 chars for privacy
      });
    } catch (error) {
      Logger.error('LearnModeScreen: Failed to save practice result', error);
      // Don't throw - saving history should not block user flow
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
   * Navigate to next sentence
   */
  const handleNextSentence = () => {
    if (!currentSet) return;
    
    if (currentSentenceIndex < currentSet.sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setTranscription('');
      setGeneratedVideoId(null); // Reset video when changing sentence
      HapticUtils.light();
    } else {
      // Completed all sentences
      Alert.alert(
        'Set Complete! 🎉',
        'You\'ve practiced all sentences in this set!',
        [
          { text: 'New Set', onPress: () => {
            setCurrentSet(null);
            setCurrentSentenceIndex(0);
            setTranscription('');
            setGeneratedVideoId(null);
          }},
          { text: 'Practice Again', onPress: () => {
            setCurrentSentenceIndex(0);
            setGeneratedVideoId(null);
          }},
        ]
      );
      HapticUtils.success();
    }
  };

  /**
   * Navigate to previous sentence
   */
  const handlePreviousSentence = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex((prev) => prev - 1);
      setTranscription('');
      setGeneratedVideoId(null); // Reset video when changing sentence
      HapticUtils.light();
    }
  };

  /**
   * Start video generation in background (parallel with recording)
   */
  const startVideoGeneration = async () => {
    if (!currentSet) return;

    const currentSentence = currentSet.sentences[currentSentenceIndex];

    try {
      setIsGeneratingVideo(true);
      setVideoGenerationProgress('Checking API keys...');

      // Check if HeyGen API key exists
      const heygenKey = await SecureStorageService.getAPIKey('heygen');
      if (!heygenKey) {
        Logger.warn('LearnModeScreen: HeyGen API key not configured, skipping video generation');
        setIsGeneratingVideo(false);
        setVideoGenerationProgress('');
        return;
      }

      // Get user preferences for default avatar and voice
      const preferences = await AsyncStorageService.getUserPreferencesWithDefaults();

      if (!preferences.defaultAvatarId || !preferences.defaultVoiceId) {
        Logger.warn('LearnModeScreen: Default avatar/voice not set, skipping video generation');
        setIsGeneratingVideo(false);
        setVideoGenerationProgress('');
        return;
      }

      setVideoGenerationProgress('Creating video...');
      Logger.info('LearnModeScreen: Starting background video generation', {
        text: currentSentence.text,
        avatarId: preferences.defaultAvatarId,
        voiceId: preferences.defaultVoiceId,
      });

      // Create video
      const response = await HeyGenService.createVideo({
        text: currentSentence.text,
        avatarId: preferences.defaultAvatarId,
        voiceId: preferences.defaultVoiceId,
        platform: 'heygen',
      });

      setVideoGenerationProgress('Processing video...');

      // Poll for completion
      const result = await HeyGenService.pollVideoStatus(
        response.id,
        (status) => {
          Logger.info('LearnModeScreen: Video status', { status });
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
          text: currentSentence.text,
          duration: 0,
          createdAt: new Date().toISOString(),
          status: 'completed',
          cloudVideoUrl: result.resultUrl,
        };

        await VideoStorageService.saveVideoMetadata(videoMetadata);

        setGeneratedVideoId(videoId);
        setVideoGenerationProgress('Video ready!');
        HapticUtils.success();
        
        Logger.info('LearnModeScreen: Video generated successfully', { videoId });
      }
    } catch (error) {
      Logger.error('LearnModeScreen: Background video generation failed', error);
      setVideoGenerationProgress('Video generation failed');
      
      // Don't show alert for background errors - just log them
      // User can still continue practicing
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>AI-Powered Learning</Text>
      <Text style={styles.emptyDescription}>
        Select a topic and difficulty level, then generate practice sentences with AI
      </Text>
      {!hasGeminiKey && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Gemini API key required. Configure in Settings.
          </Text>
        </View>
      )}
    </View>
  );

  if (isCheckingKeys) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!currentSet ? (
        <>
          <LearningTopicSelector
            selectedTopic={selectedTopic}
            selectedLevel={selectedLevel}
            onTopicChange={setSelectedTopic}
            onLevelChange={setSelectedLevel}
          />

          <TouchableOpacity
            style={[styles.generateButton, isGeneratingSentences && styles.buttonDisabled]}
            onPress={handleGenerateSentences}
            disabled={isGeneratingSentences || !hasGeminiKey}
          >
            {isGeneratingSentences ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.generateButtonIcon}>✨</Text>
                <Text style={styles.generateButtonText}>Generate Sentences</Text>
              </>
            )}
          </TouchableOpacity>

          {renderEmptyState()}
        </>
      ) : (
        <>
          <View style={styles.progressIndicator}>
            <Text style={styles.progressText}>
              Sentence {currentSentenceIndex + 1} of {currentSet.sentences.length}
            </Text>
          </View>

          <SentencePracticeCard
            sentence={currentSet.sentences[currentSentenceIndex]}
            onPractice={handleStartRecording}
            showTranslation={true}
          />

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentSentenceIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePreviousSentence}
              disabled={currentSentenceIndex === 0}
            >
              <Text style={styles.navButtonText}>⬅️ Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentSentenceIndex === currentSet.sentences.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNextSentence}
              disabled={currentSentenceIndex === currentSet.sentences.length - 1}
            >
              <Text style={styles.navButtonText}>Next ➡️</Text>
            </TouchableOpacity>
          </View>

          {/* Recording Section */}
          <View style={styles.recordingSection}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                !hasElevenLabsKey && styles.recordButtonDisabled,
              ]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!hasElevenLabsKey}
            >
              {isRecording ? (
                <>
                  <View style={styles.recordingIndicator} />
                  <Text style={styles.recordButtonText}>
                    ⏹️ Stop Recording ({recordingTime}s)
                  </Text>
                </>
              ) : (
                <Text style={styles.recordButtonText}>
                  🎙️ {hasElevenLabsKey ? 'Start Recording' : 'Configure ElevenLabs First'}
                </Text>
              )}
            </TouchableOpacity>

            {transcription && (
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

          <TouchableOpacity
            style={styles.newSetButton}
            onPress={() => {
              setCurrentSet(null);
              setCurrentSentenceIndex(0);
              setTranscription('');
              setGeneratedVideoId(null);
              setVideoGenerationProgress('');
            }}
          >
            <Text style={styles.newSetButtonText}>Start New Set</Text>
          </TouchableOpacity>
        </>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginHorizontal: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
    gap: 8,
  },
  generateButtonIcon: {
    fontSize: 20,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  progressIndicator: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recordingSection: {
    marginTop: 16,
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
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  newSetButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  newSetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
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
