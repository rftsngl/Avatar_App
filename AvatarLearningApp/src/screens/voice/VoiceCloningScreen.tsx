/**
 * Voice Cloning Screen
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
 * Main screen for recording voice samples and creating cloned voice profiles.
 * Guides users through the voice cloning process step by step.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, VoiceSample, PlatformType } from '../../types';
import { VoiceCloneConsentModal, VoiceSampleRecorder } from '../../components';
import { AudioPlaybackService } from '../../services/audio';
import { VoiceCloneStorageService } from '../../services/voice';
import { AsyncStorageService } from '../../services/storage';
import { PlatformService } from '../../services/platform';
import { DIDService } from '../../services/did';
import { PermissionUtils } from '../../utils/permissionUtils';
import { HapticUtils } from '../../utils/hapticUtils';
import { Logger } from '../../utils/Logger';
import {
  VOICE_CLONE_CONSENT_PHRASES,
  SAMPLE_SCRIPTS,
  VOICE_CLONE_REQUIREMENTS,
} from '../../constants/voiceCloneConsent';

type VoiceCloningScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VoiceCloning'>;
type VoiceCloningScreenRouteProp = RouteProp<RootStackParamList, 'VoiceCloning'>;

interface Props {
  navigation: VoiceCloningScreenNavigationProp;
  route: VoiceCloningScreenRouteProp;
}

/**
 * Voice Cloning Screen Component
 */
export const VoiceCloningScreen: React.FC<Props> = ({ navigation }) => {
  // Consent state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-US' | 'tr-TR'>('en-US');

  // Recording state
  const [recordedSamples, setRecordedSamples] = useState<VoiceSample[]>([]);
  const [currentSampleNumber, setCurrentSampleNumber] = useState(1);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Playback state
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  /**
   * Check consent status on mount
   */
  useEffect(() => {
    checkConsentStatus();
    loadSelectedPlatform();
  }, []);

  /**
   * Check if user has already given consent
   */
  const checkConsentStatus = async () => {
    try {
      const consent = await AsyncStorageService.getItem<{ hasConsented: boolean }>('voice_clone_consent');
      if (consent && consent.hasConsented) {
        setHasConsent(true);
      } else {
        setShowConsentModal(true);
      }
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to check consent', error);
      setShowConsentModal(true);
    }
  };

  /**
   * Load selected platform
   */
  const loadSelectedPlatform = async () => {
    try {
      const platform = await PlatformService.getSelectedPlatform();
      setSelectedPlatform(platform);
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to load platform', error);
    }
  };

  /**
   * Handle consent accepted
   */
  const handleConsentAccepted = async () => {
    setShowConsentModal(false);
    setHasConsent(true);
    HapticUtils.success();

    // Check microphone permission
    const hasPermission = await PermissionUtils.ensureMicrophonePermission();
    if (!hasPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Voice cloning requires microphone access to record your voice samples.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  /**
   * Handle consent declined
   */
  const handleConsentDeclined = () => {
    setShowConsentModal(false);
    Alert.alert(
      'Consent Required',
      'You must accept the consent terms to use voice cloning.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  /**
   * Handle recording complete
   */
  const handleRecordingComplete = async (filePath: string, duration: number) => {
    try {
      // Generate temporary profile ID
      const tempProfileId = `temp_${Date.now()}`;

      // Save voice sample
      const sample = await VoiceCloneStorageService.saveVoiceSample(
        tempProfileId,
        currentSampleNumber,
        filePath,
        duration
      );

      setRecordedSamples([...recordedSamples, sample]);
      setCurrentSampleNumber(currentSampleNumber + 1);
      HapticUtils.success();

      Logger.info('VoiceCloningScreen: Sample recorded', {
        sampleNumber: currentSampleNumber,
        duration,
      });
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to save sample', error);
      Alert.alert('Error', 'Failed to save voice sample. Please try again.');
    }
  };

  /**
   * Handle play sample
   */
  const handlePlaySample = async (sample: VoiceSample) => {
    try {
      if (playingSampleId === sample.id) {
        // Stop playback
        await AudioPlaybackService.stopPlayback();
        setPlayingSampleId(null);
      } else {
        // Start playback
        await AudioPlaybackService.initialize({
          onComplete: () => setPlayingSampleId(null),
        });
        await AudioPlaybackService.startPlayback(sample.filePath);
        setPlayingSampleId(sample.id);
      }
      HapticUtils.light();
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to play sample', error);
      setPlayingSampleId(null);
    }
  };

  /**
   * Handle delete sample
   */
  const handleDeleteSample = async (sample: VoiceSample) => {
    try {
      Alert.alert(
        'Delete Sample',
        `Are you sure you want to delete Sample ${sample.sampleNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await VoiceCloneStorageService.deleteVoiceSample(sample.profileId, sample.id);
              setRecordedSamples(recordedSamples.filter(s => s.id !== sample.id));
              HapticUtils.success();
              Logger.info('VoiceCloningScreen: Sample deleted', { sampleId: sample.id });
            },
          },
        ]
      );
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to delete sample', error);
    }
  };

  /**
   * Get current sample script
   */
  const getCurrentSampleScript = (): string => {
    const scripts = SAMPLE_SCRIPTS[selectedLanguage];
    const scriptIndex = (currentSampleNumber - 1) % scripts.length;
    return scripts[scriptIndex];
  };

  /**
   * Get consent phrase for selected language
   */
  const getConsentPhrase = (): string => {
    const phrase = VOICE_CLONE_CONSENT_PHRASES.find(p => p.languageCode === selectedLanguage);
    return phrase ? phrase.text : VOICE_CLONE_CONSENT_PHRASES[0].text;
  };

  /**
   * Calculate total duration of recorded samples
   */
  const getTotalDuration = (): number => {
    return recordedSamples.reduce((total, sample) => total + sample.duration, 0);
  };

  /**
   * Check if ready to create profile
   */
  const isReadyToCreate = (): boolean => {
    return (
      profileName.trim().length > 0 &&
      recordedSamples.length >= VOICE_CLONE_REQUIREMENTS.MIN_SAMPLE_COUNT &&
      getTotalDuration() >= VOICE_CLONE_REQUIREMENTS.MIN_TOTAL_DURATION
    );
  };

  /**
   * Handle create voice profile
   */
  const handleCreateProfile = async () => {
    if (!selectedPlatform) {
      Alert.alert('Error', 'Please select a platform first.');
      return;
    }

    if (!isReadyToCreate()) {
      Alert.alert(
        'Not Ready',
        `Please record at least ${VOICE_CLONE_REQUIREMENTS.MIN_SAMPLE_COUNT} samples with a total duration of ${VOICE_CLONE_REQUIREMENTS.MIN_TOTAL_DURATION} seconds.`
      );
      return;
    }

    setIsCreatingProfile(true);

    try {
      // Create voice profile via API
      const profileId = `voice_${Date.now()}`;

      // For D-ID platform
      if (selectedPlatform === 'did') {
        // Combine all samples into one file or use the longest sample
        const longestSample = recordedSamples.reduce((prev, current) =>
          current.duration > prev.duration ? current : prev
        );

        const apiVoiceId = await DIDService.cloneVoice(
          longestSample.filePath,
          profileName.trim()
        );

        // Save voice profile
        const profile = {
          id: profileId,
          name: profileName.trim(),
          platform: selectedPlatform,
          apiVoiceId,
          sampleCount: recordedSamples.length,
          totalDuration: getTotalDuration(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isCloned: true as const,
          status: 'completed' as const,
        };

        await VoiceCloneStorageService.saveVoiceProfile(profile);

        // Update sample profile IDs
        for (const sample of recordedSamples) {
          const updatedSample = { ...sample, profileId };
          await VoiceCloneStorageService.deleteVoiceSample(sample.profileId, sample.id);
          await VoiceCloneStorageService.saveVoiceSample(
            profileId,
            sample.sampleNumber,
            sample.filePath,
            sample.duration
          );
        }

        HapticUtils.success();
        Alert.alert(
          'Success!',
          'Your voice has been cloned successfully. You can now use it to create videos.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // HeyGen or other platforms
        Alert.alert(
          'Not Supported',
          'Voice cloning is currently only supported for D-ID platform.'
        );
      }
    } catch (error) {
      Logger.error('VoiceCloningScreen: Failed to create profile', error);
      HapticUtils.error();
      Alert.alert(
        'Error',
        'Failed to create voice profile. Please make sure you have a valid API key and try again.'
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Consent Modal */}
      <VoiceCloneConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccepted}
        onDecline={handleConsentDeclined}
      />

      {/* Main Content */}
      {hasConsent && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Clone Your Voice</Text>
            <Text style={styles.subtitle}>
              Record {VOICE_CLONE_REQUIREMENTS.RECOMMENDED_SAMPLE_COUNT} voice samples to create your personalized voice
            </Text>
          </View>

          {/* Profile Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Profile Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My Voice, Professional Voice"
              value={profileName}
              onChangeText={setProfileName}
              maxLength={50}
            />
          </View>

          {/* Language Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recording Language</Text>
            <View style={styles.languageButtons}>
              {VOICE_CLONE_CONSENT_PHRASES.map((phrase) => (
                <TouchableOpacity
                  key={phrase.languageCode}
                  style={[
                    styles.languageButton,
                    selectedLanguage === phrase.languageCode && styles.languageButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedLanguage(phrase.languageCode as 'en-US' | 'tr-TR');
                    HapticUtils.light();
                  }}
                >
                  <Text style={styles.languageFlag}>{phrase.flag}</Text>
                  <Text
                    style={[
                      styles.languageText,
                      selectedLanguage === phrase.languageCode && styles.languageTextActive,
                    ]}
                  >
                    {phrase.language}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Consent Phrase */}
          {currentSampleNumber === 1 && recordedSamples.length === 0 && (
            <View style={styles.consentPhraseContainer}>
              <Text style={styles.consentPhraseTitle}>⚠️ Important: Read This First</Text>
              <Text style={styles.consentPhraseText}>{getConsentPhrase()}</Text>
              <Text style={styles.consentPhraseNote}>
                Please read this consent phrase at the beginning of your first recording.
              </Text>
            </View>
          )}

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Recording Progress</Text>
              <Text style={styles.progressText}>
                {recordedSamples.length} / {VOICE_CLONE_REQUIREMENTS.RECOMMENDED_SAMPLE_COUNT} samples
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(recordedSamples.length / VOICE_CLONE_REQUIREMENTS.RECOMMENDED_SAMPLE_COUNT) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.durationText}>
              Total Duration: {getTotalDuration()}s / {VOICE_CLONE_REQUIREMENTS.RECOMMENDED_TOTAL_DURATION}s
            </Text>
          </View>

          {/* Recorded Samples List */}
          {recordedSamples.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recorded Samples</Text>
              {recordedSamples.map((sample) => (
                <View key={sample.id} style={styles.sampleCard}>
                  <View style={styles.sampleInfo}>
                    <Text style={styles.sampleNumber}>Sample {sample.sampleNumber}</Text>
                    <Text style={styles.sampleDuration}>{sample.duration}s</Text>
                  </View>
                  <View style={styles.sampleActions}>
                    <TouchableOpacity
                      style={styles.sampleButton}
                      onPress={() => handlePlaySample(sample)}
                    >
                      <Text style={styles.sampleButtonText}>
                        {playingSampleId === sample.id ? '⏸' : '▶'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sampleButton, styles.deleteButton]}
                      onPress={() => handleDeleteSample(sample)}
                    >
                      <Text style={styles.sampleButtonText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Voice Sample Recorder */}
          {recordedSamples.length < VOICE_CLONE_REQUIREMENTS.MAX_SAMPLE_COUNT && (
            <VoiceSampleRecorder
              sampleNumber={currentSampleNumber}
              sampleScript={getCurrentSampleScript()}
              minDuration={VOICE_CLONE_REQUIREMENTS.MIN_SAMPLE_DURATION}
              onRecordingComplete={handleRecordingComplete}
            />
          )}

          {/* Create Profile Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              !isReadyToCreate() && styles.createButtonDisabled,
            ]}
            onPress={handleCreateProfile}
            disabled={!isReadyToCreate() || isCreatingProfile}
          >
            {isCreatingProfile ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.createButtonText,
                  !isReadyToCreate() && styles.createButtonTextDisabled,
                ]}
              >
                Create Voice Profile
              </Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>💡 Tips for Best Results:</Text>
            <Text style={styles.helpText}>• Record in a quiet environment</Text>
            <Text style={styles.helpText}>• Speak clearly and naturally</Text>
            <Text style={styles.helpText}>• Keep consistent distance from microphone</Text>
            <Text style={styles.helpText}>
              • Record at least {VOICE_CLONE_REQUIREMENTS.RECOMMENDED_TOTAL_DURATION / 60} minutes total for best quality
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  languageButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 8,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  languageTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  consentPhraseContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  consentPhraseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  consentPhraseText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#78350F',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  consentPhraseNote: {
    fontSize: 12,
    color: '#92400E',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  durationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sampleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sampleInfo: {
    flex: 1,
  },
  sampleNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sampleDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  sampleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  sampleButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createButtonTextDisabled: {
    color: '#9CA3AF',
  },
  helpContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4338CA',
    marginBottom: 4,
  },
});

