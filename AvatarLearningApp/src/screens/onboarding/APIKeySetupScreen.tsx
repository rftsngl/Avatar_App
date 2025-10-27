/**
 * API Key Setup Screen
 *
 * Allows users to input and validate their API key for the selected platform.
 * Securely stores the API key and navigates to Home screen upon success.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, PlatformType } from '../../types';
import { PlatformService } from '../../services/platform';
import { SecureStorageService } from '../../services/storage';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';

type APIKeySetupScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'APIKeySetup'
>;

type APIKeySetupScreenRouteProp = RouteProp<RootStackParamList, 'APIKeySetup'>;

interface Props {
  navigation: APIKeySetupScreenNavigationProp;
  route: APIKeySetupScreenRouteProp;
}

const PLATFORM_INFO = {
  did: {
    name: 'D-ID',
    color: '#6366F1',
    apiKeyFormat: 'Basic authentication token',
    helpUrl: 'https://docs.d-id.com/reference/authentication',
    instructions: [
      'Sign up at studio.d-id.com',
      'Go to Settings → API Keys',
      'Create a new API key',
      'Copy the entire key (starts with "Basic")',
    ],
  },
  heygen: {
    name: 'HeyGen',
    color: '#8B5CF6',
    apiKeyFormat: 'API key string',
    helpUrl: 'https://docs.heygen.com/reference/authentication',
    instructions: [
      'Sign up at heygen.com',
      'Go to Settings → API Keys',
      'Generate a new API key',
      'Copy the API key',
    ],
  },
  elevenlabs: {
    name: 'ElevenLabs',
    color: '#10B981',
    apiKeyFormat: 'API key string (starts with "xi_")',
    helpUrl: 'https://elevenlabs.io/docs/api-reference/authentication',
    instructions: [
      'Sign up at elevenlabs.io',
      'Go to Profile → API Keys',
      'Generate a new API key',
      'Copy the API key (starts with "xi_")',
    ],
  },
};

const APIKeySetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { platform } = route.params;
  const platformInfo = PLATFORM_INFO[platform];

  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const handleTestAPIKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Empty API Key', 'Please enter your API key first.');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    Logger.info(`Testing API key for ${platform}`);

    try {
      const result = await PlatformService.validateAPIKey(platform, apiKey.trim());

      setValidationResult({
        isValid: result.isValid,
        message: result.message,
      });

      if (result.isValid) {
        Alert.alert(
          'Success',
          'API key is valid! Click "Save & Continue" to proceed.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Invalid API Key', result.message, [{ text: 'OK' }]);
      }
    } catch (error) {
      Logger.error('Error testing API key', error);
      Alert.alert(
        'Error',
        'Failed to test API key. Please check your internet connection and try again.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Empty API Key', 'Please enter your API key first.');
      return;
    }

    // If not validated yet, validate first
    if (!validationResult) {
      Alert.alert(
        'Not Validated',
        'Please test your API key first by clicking "Test API Key".'
      );
      return;
    }

    if (!validationResult.isValid) {
      Alert.alert(
        'Invalid API Key',
        'Your API key is invalid. Please check it and test again.'
      );
      return;
    }

    setIsSaving(true);
    Logger.info(`Saving API key for ${platform}`);

    try {
      // Save API key securely
      let saveSuccess: boolean;
      
      if (platform === 'elevenlabs') {
        // Special handling for ElevenLabs (not a platform, just STT service)
        await SecureStorageService.saveAPIKey('elevenlabs', apiKey.trim());
        saveSuccess = true;
        
        Logger.info('ElevenLabs API key saved successfully');

        // Navigate back to settings (ElevenLabs is configured from Settings)
        Alert.alert(
          'Success!',
          'Your ElevenLabs API key has been saved securely. Speech-to-text is now enabled!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // Standard platform (HeyGen or D-ID)
        saveSuccess = await PlatformService.saveAPIKey(platform, apiKey.trim());

        if (!saveSuccess) {
          Alert.alert('Error', 'Failed to save API key. Please try again.');
          setIsSaving(false);
          return;
        }

        Logger.info('API key saved successfully');

        // Navigate to Main Tabs screen
        Alert.alert(
          'Setup Complete!',
          `Your ${platformInfo.name} API key has been saved securely. You can now start creating videos!`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Reset navigation stack to MainTabs
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      Logger.error('Error saving API key', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.platformBadge, { backgroundColor: platformInfo.color }]}>
          <Text style={styles.platformBadgeText}>{platformInfo.name}</Text>
        </View>

        <Text style={styles.title}>Enter Your API Key</Text>
        <Text style={styles.subtitle}>
          You'll need an API key from {platformInfo.name} to use this app.
        </Text>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>How to get your API key:</Text>
          {platformInfo.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{index + 1}.</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {/* API Key Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>API Key</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter your ${platformInfo.name} API key`}
            value={apiKey}
            onChangeText={(text) => {
              setApiKey(text);
              setValidationResult(null); // Reset validation when key changes
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
            multiline={false}
          />
          <Text style={styles.inputHint}>
            Format: {platformInfo.apiKeyFormat}
          </Text>
        </View>

        {/* Validation Result */}
        {validationResult && (
          <View
            style={[
              styles.validationBox,
              validationResult.isValid
                ? styles.validationBoxSuccess
                : styles.validationBoxError,
            ]}
          >
            <Text
              style={[
                styles.validationText,
                validationResult.isValid
                  ? styles.validationTextSuccess
                  : styles.validationTextError,
              ]}
            >
              {validationResult.isValid ? '✓ ' : '✗ '}
              {validationResult.message}
            </Text>
          </View>
        )}

        {/* Test Button */}
        <TouchableOpacity
          style={[styles.testButton, isValidating && styles.buttonDisabled]}
          onPress={handleTestAPIKey}
          disabled={isValidating || isSaving}
        >
          {isValidating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>Test API Key</Text>
          )}
        </TouchableOpacity>

        {/* Consent/Disclaimer */}
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>🔒 Privacy & Security</Text>
          <Text style={styles.consentText}>
            Your API key will be stored securely on your device using{' '}
            {Platform.OS === 'ios' ? 'iOS Keychain' : 'Android Keystore'}.
            It will never be sent to any server except {platformInfo.name}'s API.
          </Text>
          <Text style={styles.consentText}>
            This app does not collect or store any of your data. All information
            stays on your device.
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!validationResult?.isValid || isSaving) && styles.buttonDisabled,
          ]}
          onPress={handleSaveAndContinue}
          disabled={!validationResult?.isValid || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 20,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  instructionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 8,
    width: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  validationBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  validationBoxSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  validationBoxError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  validationTextSuccess: {
    color: '#065F46',
  },
  validationTextError: {
    color: '#991B1B',
  },
  testButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  consentBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  consentText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default APIKeySetupScreen;

