/**
 * Learning Settings Screen
 * 
 * Configuration screen for AI-powered learning features:
 * - Gemini API (AI sentence generation)
 * - HeyGen API (Video avatars)
 * - ElevenLabs API (Speech-to-text)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { GeminiService } from '../../services/ai/GeminiService';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { ElevenLabsSTTService } from '../../services/speech/ElevenLabsSTTService';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';
import { ErrorHandler } from '../../utils/ErrorHandler';

type LearningSettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'LearningSettings'
>;

interface LearningSettingsScreenProps {
  navigation: LearningSettingsScreenNavigationProp;
}

/**
 * Learning Settings Screen Component
 */
const LearningSettingsScreen: React.FC<LearningSettingsScreenProps> = ({ navigation }) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  
  // Gemini API Key
  const [geminiAPIKey, setGeminiAPIKey] = useState('');
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);

  // HeyGen API Key
  const [heygenAPIKey, setHeygenAPIKey] = useState('');
  const [heygenConfigured, setHeygenConfigured] = useState(false);
  const [testingHeyGen, setTestingHeyGen] = useState(false);

  // ElevenLabs API Key
  const [elevenLabsAPIKey, setElevenLabsAPIKey] = useState('');
  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false);
  const [testingElevenLabs, setTestingElevenLabs] = useState(false);

  /**
   * Load existing credentials
   */
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      Logger.info('LearningSettingsScreen: Loading credentials');

      // Load Gemini API key
      const geminiKey = await SecureStorageService.getGeminiAPIKey();
      if (geminiKey) {
        setGeminiAPIKey(geminiKey);
        setGeminiConfigured(true);
      }

      // Load HeyGen API key
      const heygenKey = await SecureStorageService.getAPIKey('heygen');
      if (heygenKey) {
        setHeygenAPIKey(heygenKey);
        setHeygenConfigured(true);
      }

      // Load ElevenLabs API key
      const elevenLabsKey = await SecureStorageService.getElevenLabsAPIKey();
      if (elevenLabsKey) {
        setElevenLabsAPIKey(elevenLabsKey);
        setElevenLabsConfigured(true);
      }

      Logger.info('LearningSettingsScreen: Credentials loaded', {
        geminiConfigured: !!geminiKey,
        heygenConfigured: !!heygenKey,
        elevenLabsConfigured: !!elevenLabsKey,
      });
    } catch (error) {
      Logger.error('LearningSettingsScreen: Error loading credentials', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save Gemini API Key
   */
  const handleSaveGeminiKey = async () => {
    try {
      if (!geminiAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your Gemini API key');
        return;
      }

      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Saving Gemini API key');

      await SecureStorageService.saveGeminiAPIKey(geminiAPIKey.trim());
      setGeminiConfigured(true);

      HapticUtils.success();
      Alert.alert('Success', 'Gemini API key saved successfully!');
    } catch (error) {
      Logger.error('LearningSettingsScreen: Error saving Gemini key', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Test Gemini API Connection
   */
  const handleTestGemini = async () => {
    try {
      if (!geminiAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your Gemini API key first');
        return;
      }

      setTestingGemini(true);
      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Testing Gemini API');

      // Save key first
      await SecureStorageService.saveGeminiAPIKey(geminiAPIKey.trim());

      // Test by generating a simple sentence
      const testResult = await GeminiService.generateSentences(
        'daily_conversation',
        'A1',
        'en',
        'tr',
        1
      );

      Logger.info('LearningSettingsScreen: Gemini test successful', testResult);
      HapticUtils.success();
      Alert.alert(
        'Success',
        `Gemini API is working!\n\nTest sentence: "${testResult.sentences[0].text}"`
      );
      setGeminiConfigured(true);
    } catch (error) {
      Logger.error('LearningSettingsScreen: Gemini test failed', error);
      HapticUtils.error();
      Alert.alert('Error', `API test failed: ${ErrorHandler.getUserMessage(error)}`);
    } finally {
      setTestingGemini(false);
    }
  };

  /**
   * Remove Gemini API Key
   */
  const handleRemoveGeminiKey = async () => {
    Alert.alert(
      'Remove Gemini API Key',
      'Are you sure you want to remove your Gemini API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticUtils.light();
              await SecureStorageService.deleteGeminiAPIKey();
              setGeminiAPIKey('');
              setGeminiConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'Gemini API key removed');
            } catch (error) {
              Logger.error('LearningSettingsScreen: Error removing Gemini key', error);
              HapticUtils.error();
              Alert.alert('Error', ErrorHandler.getUserMessage(error));
            }
          },
        },
      ]
    );
  };

  /**
   * Open API signup pages
   */
  const openGeminiSignup = () => {
    Linking.openURL('https://ai.google.dev/');
  };

  const openHeyGenSignup = () => {
    Linking.openURL('https://www.heygen.com/');
  };

  const openElevenLabsSignup = () => {
    Linking.openURL('https://elevenlabs.io/');
  };

  /**
   * Save HeyGen API Key
   */
  const handleSaveHeyGenKey = async () => {
    try {
      if (!heygenAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your HeyGen API key');
        return;
      }

      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Saving HeyGen API key');

      await SecureStorageService.saveAPIKey('heygen', heygenAPIKey.trim());
      setHeygenConfigured(true);

      HapticUtils.success();
      Alert.alert('Success', 'HeyGen API key saved successfully!');
    } catch (error) {
      Logger.error('LearningSettingsScreen: Error saving HeyGen key', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Test HeyGen API Connection
   */
  const handleTestHeyGen = async () => {
    try {
      if (!heygenAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your HeyGen API key first');
        return;
      }

      setTestingHeyGen(true);
      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Testing HeyGen API');

      // Save key first
      await SecureStorageService.saveAPIKey('heygen', heygenAPIKey.trim());

      // Test by fetching avatars
      const avatars = await HeyGenService.fetchAvatars();

      Logger.info('LearningSettingsScreen: HeyGen test successful', { avatarCount: avatars.length });
      HapticUtils.success();
      Alert.alert(
        'Success',
        `HeyGen API is working!\n\nFound ${avatars.length} avatars available.`
      );
      setHeygenConfigured(true);
    } catch (error) {
      Logger.error('LearningSettingsScreen: HeyGen test failed', error);
      HapticUtils.error();
      Alert.alert('Error', `API test failed: ${ErrorHandler.getUserMessage(error)}`);
    } finally {
      setTestingHeyGen(false);
    }
  };

  /**
   * Remove HeyGen API Key
   */
  const handleRemoveHeyGenKey = async () => {
    Alert.alert(
      'Remove HeyGen API Key',
      'Are you sure you want to remove your HeyGen API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticUtils.light();
              await SecureStorageService.deleteAPIKey('heygen');
              setHeygenAPIKey('');
              setHeygenConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'HeyGen API key removed');
            } catch (error) {
              Logger.error('LearningSettingsScreen: Error removing HeyGen key', error);
              HapticUtils.error();
              Alert.alert('Error', ErrorHandler.getUserMessage(error));
            }
          },
        },
      ]
    );
  };

  /**
   * Save ElevenLabs API Key
   */
  const handleSaveElevenLabsKey = async () => {
    try {
      if (!elevenLabsAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your ElevenLabs API key');
        return;
      }

      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Saving ElevenLabs API key');

      await SecureStorageService.saveElevenLabsAPIKey(elevenLabsAPIKey.trim());
      setElevenLabsConfigured(true);

      HapticUtils.success();
      Alert.alert('Success', 'ElevenLabs API key saved successfully!');
    } catch (error) {
      Logger.error('LearningSettingsScreen: Error saving ElevenLabs key', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Test ElevenLabs API Connection
   */
  const handleTestElevenLabs = async () => {
    try {
      if (!elevenLabsAPIKey.trim()) {
        Alert.alert('Error', 'Please enter your ElevenLabs API key first');
        return;
      }

      setTestingElevenLabs(true);
      HapticUtils.light();
      Logger.info('LearningSettingsScreen: Testing ElevenLabs API');

      // Save key first
      await SecureStorageService.saveElevenLabsAPIKey(elevenLabsAPIKey.trim());

      // Test by initializing service
      await ElevenLabsSTTService.initialize();

      Logger.info('LearningSettingsScreen: ElevenLabs test successful');
      HapticUtils.success();
      Alert.alert(
        'Success',
        'ElevenLabs API is working and ready for speech-to-text!'
      );
      setElevenLabsConfigured(true);
    } catch (error) {
      Logger.error('LearningSettingsScreen: ElevenLabs test failed', error);
      HapticUtils.error();
      Alert.alert('Error', `API test failed: ${ErrorHandler.getUserMessage(error)}`);
    } finally {
      setTestingElevenLabs(false);
    }
  };

  /**
   * Remove ElevenLabs API Key
   */
  const handleRemoveElevenLabsKey = async () => {
    Alert.alert(
      'Remove ElevenLabs API Key',
      'Are you sure you want to remove your ElevenLabs API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticUtils.light();
              await SecureStorageService.deleteElevenLabsAPIKey();
              setElevenLabsAPIKey('');
              setElevenLabsConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'ElevenLabs API key removed');
            } catch (error) {
              Logger.error('LearningSettingsScreen: Error removing ElevenLabs key', error);
              HapticUtils.error();
              Alert.alert('Error', ErrorHandler.getUserMessage(error));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learning AI Services</Text>
        <Text style={styles.subtitle}>
          Configure API keys for AI-powered language learning features
        </Text>
      </View>

      {/* Gemini API Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🤖</Text>
            <Text style={styles.sectionTitle}>Gemini API</Text>
          </View>
          {geminiConfigured && (
            <View style={styles.configuredBadge}>
              <Text style={styles.configuredBadgeText}>✓ Configured</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionDescription}>
          Google's Gemini AI generates contextual sentences for pronunciation practice.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput
            style={styles.input}
            value={geminiAPIKey}
            onChangeText={setGeminiAPIKey}
            placeholder="Enter your Gemini API key"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSaveGeminiKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Save Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleTestGemini}
            disabled={testingGemini}
            activeOpacity={0.7}
          >
            {testingGemini ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={styles.buttonTextSecondary}>Test API</Text>
            )}
          </TouchableOpacity>
        </View>

        {geminiConfigured && (
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleRemoveGeminiKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTextDanger}>Remove Key</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={openGeminiSignup} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an API key? Get one here →</Text>
        </TouchableOpacity>
      </View>

      {/* HeyGen API Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🎬</Text>
            <Text style={styles.sectionTitle}>HeyGen API</Text>
          </View>
          {heygenConfigured && (
            <View style={styles.configuredBadge}>
              <Text style={styles.configuredBadgeText}>✓ Configured</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionDescription}>
          HeyGen provides AI video avatars for the main video creation feature.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput
            style={styles.input}
            value={heygenAPIKey}
            onChangeText={setHeygenAPIKey}
            placeholder="Enter your HeyGen API key"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSaveHeyGenKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Save Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleTestHeyGen}
            disabled={testingHeyGen}
            activeOpacity={0.7}
          >
            {testingHeyGen ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={styles.buttonTextSecondary}>Test API</Text>
            )}
          </TouchableOpacity>
        </View>

        {heygenConfigured && (
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleRemoveHeyGenKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTextDanger}>Remove Key</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={openHeyGenSignup} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an API key? Get one here →</Text>
        </TouchableOpacity>
      </View>

      {/* ElevenLabs API Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🎙️</Text>
            <Text style={styles.sectionTitle}>ElevenLabs API</Text>
          </View>
          {elevenLabsConfigured && (
            <View style={styles.configuredBadge}>
              <Text style={styles.configuredBadgeText}>✓ Configured</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionDescription}>
          ElevenLabs Speech-to-Text enables voice input for pronunciation practice.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput
            style={styles.input}
            value={elevenLabsAPIKey}
            onChangeText={setElevenLabsAPIKey}
            placeholder="Enter your ElevenLabs API key"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSaveElevenLabsKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Save Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleTestElevenLabs}
            disabled={testingElevenLabs}
            activeOpacity={0.7}
          >
            {testingElevenLabs ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={styles.buttonTextSecondary}>Test API</Text>
            )}
          </TouchableOpacity>
        </View>

        {elevenLabsConfigured && (
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleRemoveElevenLabsKey}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTextDanger}>Remove Key</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={openElevenLabsSignup} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an API key? Get one here →</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Requirements */}
      <View style={styles.requirementsSection}>
        <Text style={styles.requirementsTitle}>Feature Requirements</Text>
        
        <View style={styles.requirementItem}>
          <Text style={styles.requirementMode}>📚 Learn Mode</Text>
          <Text style={styles.requirementAPIs}>
            Requires: Gemini + iFlytek + ElevenLabs
          </Text>
        </View>

        <View style={styles.requirementItem}>
          <Text style={styles.requirementMode}>✏️ Practice Mode</Text>
          <Text style={styles.requirementAPIs}>
            Requires: iFlytek + ElevenLabs
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 40,
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
  header: {
    backgroundColor: '#6366F1',
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  configuredBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  configuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: '#6366F1',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  buttonDanger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  buttonTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#6366F1',
    textDecorationLine: 'underline',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  requirementsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  requirementItem: {
    marginBottom: 12,
  },
  requirementMode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  requirementAPIs: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default LearningSettingsScreen;
