/**
 * Voice Clone Consent Modal
 * 
 * Displays privacy notice and consent form for voice cloning.
 * Must be accepted before users can clone their voice.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { VOICE_CLONE_PRIVACY_NOTICE, VOICE_CLONE_CONSENT_VERSION } from '../constants/voiceCloneConsent';
import { AsyncStorageService } from '../services/storage/AsyncStorageService';
import { Logger } from '../utils/Logger';
import { HapticUtils } from '../utils/hapticUtils';

interface VoiceCloneConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const CONSENT_STORAGE_KEY = 'voice_clone_consent';

/**
 * Voice Clone Consent Modal Component
 */
export const VoiceCloneConsentModal: React.FC<VoiceCloneConsentModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  /**
   * Handle scroll to detect if user has read to bottom
   */
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && !hasReadToBottom) {
      setHasReadToBottom(true);
      HapticUtils.light();
    }
  };

  /**
   * Handle consent checkbox toggle
   */
  const handleConsentToggle = () => {
    setConsentChecked(!consentChecked);
    HapticUtils.light();
  };

  /**
   * Handle accept button press
   */
  const handleAccept = async () => {
    try {
      // Save consent to storage
      await AsyncStorageService.setItem(CONSENT_STORAGE_KEY, {
        hasConsented: true,
        consentDate: new Date().toISOString(),
        consentVersion: VOICE_CLONE_CONSENT_VERSION,
      });

      HapticUtils.success();
      Logger.info('VoiceCloneConsentModal: Consent accepted');
      onAccept();
    } catch (error) {
      Logger.error('VoiceCloneConsentModal: Failed to save consent', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle decline button press
   */
  const handleDecline = () => {
    HapticUtils.light();
    Logger.info('VoiceCloneConsentModal: Consent declined');
    onDecline();
  };

  /**
   * Reset modal state when closed
   */
  const handleModalClose = () => {
    setHasReadToBottom(false);
    setConsentChecked(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDecline}
      onDismiss={handleModalClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Voice Cloning Consent</Text>
            <Text style={styles.headerSubtitle}>Please read carefully before proceeding</Text>
          </View>

          {/* Privacy Notice */}
          <ScrollView
            style={styles.scrollView}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <Text style={styles.privacyText}>{VOICE_CLONE_PRIVACY_NOTICE}</Text>
          </ScrollView>

          {/* Scroll Indicator */}
          {!hasReadToBottom && (
            <View style={styles.scrollIndicator}>
              <Text style={styles.scrollIndicatorText}>
                ↓ Please scroll to read the full notice ↓
              </Text>
            </View>
          )}

          {/* Consent Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleConsentToggle}
            disabled={!hasReadToBottom}
          >
            <View style={[
              styles.checkbox,
              consentChecked && styles.checkboxChecked,
              !hasReadToBottom && styles.checkboxDisabled,
            ]}>
              {consentChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[
              styles.checkboxLabel,
              !hasReadToBottom && styles.checkboxLabelDisabled,
            ]}>
              I have read and agree to the terms above. I confirm that the voice is mine or I have
              the necessary rights to use it.
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                (!hasReadToBottom || !consentChecked) && styles.acceptButtonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!hasReadToBottom || !consentChecked}
            >
              <Text style={[
                styles.acceptButtonText,
                (!hasReadToBottom || !consentChecked) && styles.acceptButtonTextDisabled,
              ]}>
                Accept & Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    maxHeight: 300,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  scrollIndicator: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  checkboxLabelDisabled: {
    color: '#9CA3AF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    backgroundColor: '#6366F1',
  },
  acceptButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  acceptButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

