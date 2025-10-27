/**
 * Avatar Consent Modal Component
 * 
 * Displays privacy notice and consent form for custom avatar creation.
 * Similar to VoiceCloneConsentModal but for avatar photos.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/Logger';
import { HapticUtils } from '../utils/hapticUtils';
import { AVATAR_PRIVACY_SECTIONS, AVATAR_CONSENT_VERSION } from '../constants/avatarConsent';
import { AvatarConsent } from '../types';

/**
 * Component props
 */
interface AvatarConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Storage key for avatar consent
 */
const AVATAR_CONSENT_KEY = '@avatar_consent';

/**
 * Avatar Consent Modal Component
 */
export const AvatarConsentModal: React.FC<AvatarConsentModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  /**
   * Handle scroll event to detect if user has scrolled to bottom
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      HapticUtils.success();
    }
  };

  /**
   * Handle consent checkbox toggle
   */
  const handleConsentToggle = () => {
    if (!hasScrolledToBottom) {
      HapticUtils.warning();
      return;
    }

    setConsentChecked(!consentChecked);
    HapticUtils.light();
  };

  /**
   * Handle accept button press
   */
  const handleAccept = async () => {
    if (!consentChecked) {
      HapticUtils.warning();
      return;
    }

    try {
      // Save consent to AsyncStorage
      const consent: AvatarConsent = {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        version: AVATAR_CONSENT_VERSION,
      };

      await AsyncStorage.setItem(AVATAR_CONSENT_KEY, JSON.stringify(consent));
      Logger.info('AvatarConsentModal: Consent accepted and saved');

      HapticUtils.success();
      onAccept();
    } catch (error) {
      Logger.error('AvatarConsentModal: Error saving consent', error);
      HapticUtils.error();
    }
  };

  /**
   * Handle decline button press
   */
  const handleDecline = () => {
    HapticUtils.light();
    onDecline();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDecline}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🎭</Text>
          </View>
          <Text style={styles.headerTitle}>Custom Avatar Privacy</Text>
          <Text style={styles.headerSubtitle}>Please read carefully before proceeding</Text>
        </View>

        {/* Privacy Notice */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {AVATAR_PRIVACY_SECTIONS.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              
              {section.content && (
                <Text style={styles.sectionContent}>{section.content}</Text>
              )}
              
              {section.bullets && (
                <View style={styles.bulletList}>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {!hasScrolledToBottom && (
            <View style={styles.scrollIndicator}>
              <Text style={styles.scrollIndicatorText}>↓ Scroll to continue ↓</Text>
            </View>
          )}
        </ScrollView>

        {/* Consent Checkbox */}
        <View style={styles.consentContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleConsentToggle}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                consentChecked && styles.checkboxChecked,
                !hasScrolledToBottom && styles.checkboxDisabled,
              ]}
            >
              {consentChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.consentText,
                !hasScrolledToBottom && styles.consentTextDisabled,
              ]}
            >
              I have read and agree to the privacy notice and terms above
            </Text>
          </TouchableOpacity>

          {!hasScrolledToBottom && (
            <Text style={styles.scrollHint}>
              Please scroll to the bottom to enable consent
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              !consentChecked && styles.acceptButtonDisabled,
            ]}
            onPress={handleAccept}
            activeOpacity={0.7}
            disabled={!consentChecked}
          >
            <Text
              style={[
                styles.acceptButtonText,
                !consentChecked && styles.acceptButtonTextDisabled,
              ]}
            >
              Accept & Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Check if user has already accepted avatar consent
 */
export const hasAvatarConsent = async (): Promise<boolean> => {
  try {
    const consentJson = await AsyncStorage.getItem(AVATAR_CONSENT_KEY);
    if (!consentJson) {
      return false;
    }

    const consent: AvatarConsent = JSON.parse(consentJson);
    return consent.accepted && consent.version === AVATAR_CONSENT_VERSION;
  } catch (error) {
    Logger.error('AvatarConsentModal: Error checking consent', error);
    return false;
  }
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerIconText: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 16,
    color: '#6366F1',
    marginRight: 8,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  scrollIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  scrollIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  consentContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontWeight: '500',
  },
  consentTextDisabled: {
    color: '#9CA3AF',
  },
  scrollHint: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  acceptButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

