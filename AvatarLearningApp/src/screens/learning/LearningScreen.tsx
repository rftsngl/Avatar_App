/**
 * LearningScreen.tsx
 * 
 * Unified language learning screen with 2 modes:
 * - Learn: AI-generated sentences with pronunciation practice
 * - Practice: Custom text input with pronunciation practice
 * 
 * Both modes share:
 * - ElevenLabs Speech-to-Text (voice input)
 * - Simple word-matching accuracy assessment
 * - Progress tracking
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
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types';
import { GeminiService } from '../../services/ai/GeminiService';
import { ElevenLabsSTTService } from '../../services/speech/ElevenLabsSTTService';
import { LearningProgressService } from '../../services/storage/LearningProgressService';
import { PracticeHistoryService } from '../../services/storage/PracticeHistoryService';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { UserService } from '../../services/user/UserService';
import {
  SentencePracticeCard,
  LearningTopicSelector,
  LearningStatistics,
} from '../../components/learning';
import { AnimatedButton } from '../../components/common/AnimatedButton';
import { Logger } from '../../utils/Logger';
import { ErrorHandler, ErrorCode } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import type {
  LearningTopic,
  LanguageLevel,
  AISentence,
  AISentenceSet,
  PracticeResult,
  LearningProgress,
} from '../../types';

type TabMode = 'learn' | 'practice';

/**
 * LearningScreen Component
 */
export const LearningScreen: React.FC = () => {
  // Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabMode>('learn');

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

  // Practice mode state
  const [customText, setCustomText] = useState('');

  // Shared state (both modes)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isAssessing, setIsAssessing] = useState(false);

  /**
   * Initialize screen - Check API keys
   */
  useEffect(() => {
    checkAPIKeys();
  }, []);

  const checkAPIKeys = async () => {
    try {
      setIsCheckingKeys(true);
      
      const geminiKeyExists = await GeminiService.hasAPIKey();
      const elevenLabsKey = await SecureStorageService.getElevenLabsAPIKey();
      const elevenLabsKeyExists = !!elevenLabsKey;
      
      setHasGeminiKey(geminiKeyExists);
      setHasElevenLabsKey(elevenLabsKeyExists);
      
      Logger.info('LearningScreen: API keys checked', {
        gemini: geminiKeyExists,
        elevenlabs: elevenLabsKeyExists,
      });
    } catch (error) {
      Logger.error('LearningScreen: Error checking API keys', error);
    } finally {
      setIsCheckingKeys(false);
    }
  };

  /**
   * Generate sentences for Learn mode
   */
  const handleGenerateSentences = async () => {
    if (!hasGeminiKey) {
      Alert.alert(
        '🤖 Gemini API Required',
        'Learn mode uses Google Gemini AI to generate practice sentences based on topics and difficulty levels.\n\n' +
        'Please configure your Gemini API key in Settings to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.navigate('LearningSettings'),
          },
        ]
      );
      return;
    }

    try {
      setIsGeneratingSentences(true);
      HapticUtils.light();
      Logger.info('LearningScreen: Generating sentences', { topic: selectedTopic, level: selectedLevel });

      const result = await GeminiService.generateSentences(
        selectedTopic,
        selectedLevel,
        'en', // Target language
        'tr', // Native language
        10   // Number of sentences
      );

      setCurrentSet(result);
      setCurrentSentenceIndex(0);
      setTranscription('');
      setAccuracy(0);

      HapticUtils.success();
      Logger.info('LearningScreen: Sentences generated', { count: result.sentences.length });
    } catch (error) {
      Logger.error('LearningScreen: Error generating sentences', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsGeneratingSentences(false);
    }
  };

  /**
   * Start recording (shared for both modes)
   */
  const handleStartRecording = async () => {
    if (!hasElevenLabsKey) {
      Alert.alert(
        '🎙️ ElevenLabs API Required',
        'Voice input uses ElevenLabs Speech-to-Text API to transcribe your pronunciation in real-time.\n\n' +
        'Please configure your ElevenLabs API key in Settings to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.navigate('LearningSettings'),
          },
        ]
      );
      return;
    }

    try {
      HapticUtils.light();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setAccuracy(0);

      Logger.info('LearningScreen: Starting recording');

      // Initialize ElevenLabs with callbacks
      await ElevenLabsSTTService.initialize('en-US', {
        onResult: (result) => {
          setTranscription(result.text);
          Logger.info('LearningScreen: Transcription received', { text: result.text });
        },
        onError: (error: Error) => {
          Logger.error('LearningScreen: Recording error', error);
          setIsRecording(false);
          Alert.alert('Error', ErrorHandler.getUserMessage(error));
        },
        onRecordingProgress: (seconds: number) => {
          setRecordingTime(seconds);
        },
      });
      
      // Start listening (no parameters needed)
      await ElevenLabsSTTService.startListening();
    } catch (error) {
      Logger.error('LearningScreen: Error starting recording', error);
      setIsRecording(false);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Stop recording and assess (shared for both modes)
   */
  const handleStopRecording = async () => {
    try {
      await ElevenLabsSTTService.stopListening();
      setIsRecording(false);
      HapticUtils.success();

      Logger.info('LearningScreen: Recording stopped', { transcription });

      // Auto-assess if we have text
      if (transcription.trim()) {
        await handleAssess();
      }
    } catch (error) {
      Logger.error('LearningScreen: Error stopping recording', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Assess pronunciation (shared for both modes)
   */
  const handleAssess = async () => {
    const referenceText = activeTab === 'learn' 
      ? (currentSet?.sentences[currentSentenceIndex]?.text || '')
      : customText;

    if (!referenceText.trim()) {
      Alert.alert('Error', 'Please enter or generate a sentence first.');
      return;
    }

    if (!transcription.trim()) {
      Alert.alert('Error', 'Please record your pronunciation first.');
      return;
    }

    try {
      setIsAssessing(true);
      HapticUtils.light();
      Logger.info('LearningScreen: Assessing pronunciation');

      // TODO: Full iFlytek integration requires audio file
      // For now, calculate basic similarity score from transcription
      const normalizedRef = referenceText.toLowerCase().trim();
      const normalizedTrans = transcription.toLowerCase().trim();
      const similarity = normalizedRef === normalizedTrans 
        ? 100 
        : normalizedRef.includes(normalizedTrans) || normalizedTrans.includes(normalizedRef)
        ? 75
        : 50;
      
      setAccuracy(similarity);
      HapticUtils.success();

      // Save to history
      await savePracticeResult(referenceText, similarity);

      Logger.info('LearningScreen: Assessment completed', { 
        accuracy: similarity
      });
    } catch (error) {
      Logger.error('LearningScreen: Error assessing pronunciation', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsAssessing(false);
    }
  };

  /**
   * Save practice result to history
   */
  const savePracticeResult = async (referenceText: string, accuracyScore: number) => {
    try {
      // Get device-unique user ID
      const userId = await UserService.getUserId();

      const practiceResult: PracticeResult = {
        id: `practice_${Date.now()}`,
        timestamp: new Date().toISOString(),
        mode: activeTab === 'learn' ? 'learn' : 'practice',
        referenceText,
        userAudio: '',  // Not saved in simple mode
        transcribedText: transcription,
        accuracy: accuracyScore,
        avatarId: '',  // Not used in this context
        voiceId: '',   // Not used in this context
        language: 'en-US',
      };

      await PracticeHistoryService.addPractice(userId, practiceResult.mode, practiceResult);
      Logger.info('LearningScreen: Practice result saved', {
        userId: `${userId.substring(0, 8)}...`, // Privacy: log only first 8 chars
      });
    } catch (error) {
      Logger.error('LearningScreen: Error saving practice result', error);
    }
  };

  /**
   * Move to next sentence (Learn mode only)
   */
  const handleNextSentence = () => {
    if (currentSet && currentSentenceIndex < currentSet.sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
      setTranscription('');
      setAccuracy(0);
      HapticUtils.light();
    } else {
      Alert.alert('Complete!', 'You\'ve completed all sentences in this set!');
    }
  };

  /**
   * Move to previous sentence (Learn mode only)
   */
  const handlePreviousSentence = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
      setTranscription('');
      setAccuracy(0);
      HapticUtils.light();
    }
  };

  /**
   * Render loading state
   */
  if (isCheckingKeys) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Checking API configuration...</Text>
      </View>
    );
  }

  /**
   * Render Learn mode tab content
   */
  const renderLearnMode = () => {
    // Check if Gemini is configured
    if (!hasGeminiKey) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyTitle}>Gemini API Required</Text>
          <Text style={styles.emptyDescription}>
            Please configure your Gemini API key in Settings to use AI-powered sentence generation.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
        {/* Topic/Level Selector */}
        {!currentSet && (
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
              disabled={isGeneratingSentences}
              activeOpacity={0.7}
            >
              {isGeneratingSentences ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.generateButtonIcon}>✨</Text>
                  <Text style={styles.generateButtonText}>Generate Sentences</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Sentence Practice */}
        {currentSet && (
          <>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>
                Sentence {currentSentenceIndex + 1} of {currentSet.sentences.length}
              </Text>
            </View>

            <SentencePracticeCard
              sentence={currentSet.sentences[currentSentenceIndex]}
              onPractice={(sentence) => {
                // Already in practice mode, just show info
                Alert.alert('Info', `Practicing: ${sentence.text}`);
              }}
              showTranslation={true}
            />

            {/* Recording Controls */}
            <View style={styles.recordingSection}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={handleStartRecording}
                  disabled={!hasElevenLabsKey}
                >
                  <Text style={styles.recordButtonText}>
                    🎙️ {hasElevenLabsKey ? 'Start Recording' : 'Configure ElevenLabs First'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.recordButton, styles.recordButtonActive]}
                  onPress={handleStopRecording}
                >
                  <Text style={styles.recordButtonText}>
                    ⏹️ Stop Recording ({recordingTime}s)
                  </Text>
                </TouchableOpacity>
              )}
              
              {transcription && (
                <View style={styles.transcriptionBox}>
                  <Text style={styles.transcriptionLabel}>Your Speech:</Text>
                  <Text style={styles.transcriptionText}>{transcription}</Text>
                </View>
              )}
            </View>

            {/* Navigation after practice */}
            {accuracy > 0 && (
              <View style={styles.navigationButtons}>
                {currentSentenceIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonSecondary]}
                    onPress={handlePreviousSentence}
                  >
                    <Text style={styles.navButtonTextSecondary}>← Previous</Text>
                  </TouchableOpacity>
                )}

                {currentSentenceIndex < currentSet.sentences.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonPrimary]}
                    onPress={handleNextSentence}
                  >
                    <Text style={styles.navButtonText}>Next →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.newSetButton}
              onPress={() => {
                setCurrentSet(null);
                setCurrentSentenceIndex(0);
                setTranscription('');
                setAccuracy(0);
              }}
            >
              <Text style={styles.newSetButtonText}>Start New Set</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  };

  /**
   * Render Practice mode tab content
   */
  const renderPracticeMode = () => {
    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer}>
        <Text style={styles.sectionTitle}>Enter Text to Practice</Text>
        <Text style={styles.sectionDescription}>
          Type any sentence or phrase you want to practice pronouncing.
        </Text>

        <TextInput
          style={styles.textInput}
          value={customText}
          onChangeText={setCustomText}
          placeholder="Enter a sentence to practice..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {customText.trim() && (
          <>
            <View style={styles.recordingSection}>
              <Text style={styles.sectionTitle}>Record Your Pronunciation</Text>
              
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                  (!hasElevenLabsKey || !customText.trim()) && styles.buttonDisabled,
                ]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!hasElevenLabsKey || !customText.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.recordButtonIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
                <Text style={styles.recordButtonText}>
                  {isRecording ? `Recording... ${recordingTime}s` : 'Start Recording'}
                </Text>
              </TouchableOpacity>

              {transcription && (
                <View style={styles.transcriptionBox}>
                  <Text style={styles.transcriptionLabel}>You said:</Text>
                  <Text style={styles.transcriptionText}>{transcription}</Text>
                </View>
              )}
            </View>

            {/* Assess button appears after transcription */}
            {transcription && accuracy === 0 && (
              <AnimatedButton
                title="Assess Pronunciation"
                onPress={handleAssess}
                disabled={isAssessing}
                loading={isAssessing}
                variant="secondary"
                size="large"
                fullWidth={true}
                icon={<Text style={{ fontSize: 20 }}>📊</Text>}
                style={{ marginTop: 16 }}
              />
            )}

            {/* Show accuracy score and try again button */}
            {accuracy > 0 && (
              <>
                <View style={styles.accuracyDisplay}>
                  <Text style={styles.accuracyLabel}>Accuracy</Text>
                  <Text style={styles.accuracyValue}>{accuracy.toFixed(0)}%</Text>
                  <Text style={styles.accuracyGrade}>
                    {accuracy >= 80 ? '🌟 Excellent!' : accuracy >= 60 ? '👍 Good!' : '💪 Keep Practicing!'}
                  </Text>
                </View>
                <AnimatedButton
                  title="Try Again"
                  onPress={() => {
                    setTranscription('');
                    setAccuracy(0);
                  }}
                  variant="outline"
                  size="medium"
                  fullWidth={true}
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </>
        )}

        {!hasElevenLabsKey && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              ElevenLabs API required for voice input. Please configure in Settings.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  /**
   * Main render
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => {
            setActiveTab('learn');
            HapticUtils.light();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'learn' && styles.tabIconActive]}>📚</Text>
          <Text style={[styles.tabText, activeTab === 'learn' && styles.tabTextActive]}>
            Learn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'practice' && styles.tabActive]}
          onPress={() => {
            setActiveTab('practice');
            HapticUtils.light();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'practice' && styles.tabIconActive]}>✏️</Text>
          <Text style={[styles.tabText, activeTab === 'practice' && styles.tabTextActive]}>
            Practice
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'learn' ? renderLearnMode() : renderPracticeMode()}
    </SafeAreaView>
  );
};

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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Tab Header
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#6366F1',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  
  // Tab Content
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 100,
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
  },
  
  // Section Headers
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
  
  // Buttons
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
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
  
  // Progress Indicator
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
  
  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  navButtonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // New Set Button
  newSetButton: {
    marginTop: 16,
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
  
  // Practice Mode - Text Input
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
  
  // Recording Section
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
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordButtonIcon: {
    fontSize: 20,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Transcription
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
  
  // Assess Button
  assessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  assessButtonIcon: {
    fontSize: 20,
  },
  assessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Reset Button
  resetButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  // Warning Box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  
  // Accuracy Display (simple pronunciation feedback)
  accuracyDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  accuracyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  accuracyGrade: {
    fontSize: 18,
    color: '#374151',
  },
});
