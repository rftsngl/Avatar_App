/**
 * Configure API Keys Screen
 * 
 * Centralized screen for managing all API keys:
 * - D-ID API Key (video generation platform)
 * - HeyGen API Key (video generation platform)
 * - ElevenLabs API Key (speech-to-text)
 * - Gemini API Key (AI sentence generation)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { PlatformService } from '../../services/platform';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { Logger } from '../../utils/Logger';
import { HapticUtils } from '../../utils/hapticUtils';

type ConfigureAPIKeysScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ConfigureAPIKeys'
>;
type ConfigureAPIKeysScreenRouteProp = RouteProp<RootStackParamList, 'ConfigureAPIKeys'>;

interface ConfigureAPIKeysScreenProps {
  navigation: ConfigureAPIKeysScreenNavigationProp;
  route: ConfigureAPIKeysScreenRouteProp;
}

/**
 * API Key Configuration Item
 */
interface APIKeyConfig {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  icon: string;
  isConfigured: boolean;
  value: string;
}

const ConfigureAPIKeysScreen: React.FC<ConfigureAPIKeysScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // API Keys state
  const [heygenKey, setHeygenKey] = useState('');
  const [heygenConfigured, setHeygenConfigured] = useState(false);
  
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [elevenlabsConfigured, setElevenlabsConfigured] = useState(false);
  
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  /**
   * Load API keys configuration status
   */
  const loadAPIKeys = async () => {
    try {
      setIsLoading(true);
      Logger.info('ConfigureAPIKeysScreen: Loading API keys status');

      // Check HeyGen
      const heygenApiKey = await SecureStorageService.getAPIKey('heygen');
      setHeygenConfigured(!!heygenApiKey);

      // Check ElevenLabs
      const elevenlabsApiKey = await SecureStorageService.getElevenLabsAPIKey();
      setElevenlabsConfigured(!!elevenlabsApiKey);

      // Check Gemini
      const geminiApiKey = await SecureStorageService.getGeminiAPIKey();
      setGeminiConfigured(!!geminiApiKey);

      Logger.info('ConfigureAPIKeysScreen: API keys status loaded');
    } catch (error) {
      Logger.error('ConfigureAPIKeysScreen: Error loading API keys', error);
      Alert.alert('Error', 'Failed to load API keys status');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      loadAPIKeys();
    }, [])
  );

  /**
   * Save HeyGen API Key
   */
  const saveHeyGenKey = async () => {
    if (!heygenKey.trim()) {
      Alert.alert('Error', 'Please enter a valid HeyGen API key');
      return;
    }

    try {
      setIsSaving(true);
      
      // Validate key by testing it
      Logger.info('ConfigureAPIKeysScreen: Validating HeyGen API key');
      await SecureStorageService.saveAPIKey('heygen', heygenKey.trim());
      
      try {
        await HeyGenService.fetchAvatars();
        setHeygenConfigured(true);
        setHeygenKey('');
        HapticUtils.success();
        Alert.alert('Success', 'HeyGen API key saved and validated successfully');
        Logger.info('ConfigureAPIKeysScreen: HeyGen API key saved');
      } catch (validationError) {
        await SecureStorageService.deleteAPIKey('heygen');
        throw new Error('Invalid API key - could not fetch avatars');
      }
    } catch (error: any) {
      Logger.error('ConfigureAPIKeysScreen: Error saving HeyGen key', error);
      HapticUtils.error();
      Alert.alert('Error', error.message || 'Failed to save HeyGen API key');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Remove HeyGen API Key
   */
  const removeHeyGenKey = () => {
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
              await SecureStorageService.deleteAPIKey('heygen');
              setHeygenConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'HeyGen API key removed');
              Logger.info('ConfigureAPIKeysScreen: HeyGen API key removed');
            } catch (error) {
              Logger.error('ConfigureAPIKeysScreen: Error removing HeyGen key', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to remove HeyGen API key');
            }
          },
        },
      ]
    );
  };

  /**
   * Save ElevenLabs API Key
   */
  const saveElevenLabsKey = async () => {
    if (!elevenlabsKey.trim()) {
      Alert.alert('Error', 'Please enter a valid ElevenLabs API key');
      return;
    }

    try {
      setIsSaving(true);
      await SecureStorageService.saveElevenLabsAPIKey(elevenlabsKey.trim());
      setElevenlabsConfigured(true);
      setElevenlabsKey('');
      HapticUtils.success();
      Alert.alert('Success', 'ElevenLabs API key saved successfully');
      Logger.info('ConfigureAPIKeysScreen: ElevenLabs API key saved');
    } catch (error) {
      Logger.error('ConfigureAPIKeysScreen: Error saving ElevenLabs key', error);
      HapticUtils.error();
      Alert.alert('Error', 'Failed to save ElevenLabs API key');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Remove ElevenLabs API Key
   */
  const removeElevenLabsKey = () => {
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
              await SecureStorageService.deleteElevenLabsAPIKey();
              setElevenlabsConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'ElevenLabs API key removed');
              Logger.info('ConfigureAPIKeysScreen: ElevenLabs API key removed');
            } catch (error) {
              Logger.error('ConfigureAPIKeysScreen: Error removing ElevenLabs key', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to remove ElevenLabs API key');
            }
          },
        },
      ]
    );
  };

  /**
   * Save Gemini API Key
   */
  const saveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid Gemini API key');
      return;
    }

    try {
      setIsSaving(true);
      await SecureStorageService.saveGeminiAPIKey(geminiKey.trim());
      setGeminiConfigured(true);
      setGeminiKey('');
      HapticUtils.success();
      Alert.alert('Success', 'Gemini API key saved successfully');
      Logger.info('ConfigureAPIKeysScreen: Gemini API key saved');
    } catch (error) {
      Logger.error('ConfigureAPIKeysScreen: Error saving Gemini key', error);
      HapticUtils.error();
      Alert.alert('Error', 'Failed to save Gemini API key');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Remove Gemini API Key
   */
  const removeGeminiKey = () => {
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
              await SecureStorageService.deleteGeminiAPIKey();
              setGeminiConfigured(false);
              HapticUtils.success();
              Alert.alert('Success', 'Gemini API key removed');
              Logger.info('ConfigureAPIKeysScreen: Gemini API key removed');
            } catch (error) {
              Logger.error('ConfigureAPIKeysScreen: Error removing Gemini key', error);
              HapticUtils.error();
              Alert.alert('Error', 'Failed to remove Gemini API key');
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
        <Text style={styles.loadingText}>Loading API keys...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>API Configuration</Text>
          <Text style={styles.headerDescription}>
            Manage your API keys for video generation, speech-to-text, and AI features
          </Text>
        </View>

        {/* HeyGen Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎭</Text>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>HeyGen</Text>
              <Text style={styles.sectionSubtitle}>Video generation platform</Text>
            </View>
            <View style={[styles.statusBadge, heygenConfigured && styles.statusBadgeConfigured]}>
              <Text style={styles.statusBadgeText}>
                {heygenConfigured ? '✓ Configured' : 'Not Set'}
              </Text>
            </View>
          </View>

          {!heygenConfigured ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter HeyGen API Key"
                placeholderTextColor="#9CA3AF"
                value={heygenKey}
                onChangeText={setHeygenKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveHeyGenKey}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Validating...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeHeyGenKey}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>Remove Key</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ElevenLabs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎙️</Text>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>ElevenLabs</Text>
              <Text style={styles.sectionSubtitle}>Speech-to-text (13 languages)</Text>
            </View>
            <View style={[styles.statusBadge, elevenlabsConfigured && styles.statusBadgeConfigured]}>
              <Text style={styles.statusBadgeText}>
                {elevenlabsConfigured ? '✓ Configured' : 'Not Set'}
              </Text>
            </View>
          </View>

          {!elevenlabsConfigured ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter ElevenLabs API Key"
                placeholderTextColor="#9CA3AF"
                value={elevenlabsKey}
                onChangeText={setElevenlabsKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveElevenLabsKey}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeElevenLabsKey}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>Remove Key</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Gemini Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>✨</Text>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Gemini</Text>
              <Text style={styles.sectionSubtitle}>AI sentence generation</Text>
            </View>
            <View style={[styles.statusBadge, geminiConfigured && styles.statusBadgeConfigured]}>
              <Text style={styles.statusBadgeText}>
                {geminiConfigured ? '✓ Configured' : 'Not Set'}
              </Text>
            </View>
          </View>

          {!geminiConfigured ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter Gemini API Key"
                placeholderTextColor="#9CA3AF"
                value={geminiKey}
                onChangeText={setGeminiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveGeminiKey}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeGeminiKey}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>Remove Key</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            All API keys are stored securely using hardware-backed encryption (iOS Keychain / Android Keystore).
            Keys never leave your device.
          </Text>
        </View>

      </ScrollView>
    </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  statusBadgeConfigured: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputMargin: {
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  infoBox: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 18,
  },
});

export default ConfigureAPIKeysScreen;
