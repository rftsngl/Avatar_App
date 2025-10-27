/**
 * Platform Selection Screen
 *
 * ============================================================================
 * MODIFIED: D-ID Platform Deactivated (2025-10-27)
 * ============================================================================
 * HeyGen is now the only platform option. D-ID has been disabled and code
 * is kept for reference only. Auto-selects HeyGen on mount.
 * ============================================================================
 *
 * Allows users to choose between D-ID and HeyGen platforms.
 * Currently only HeyGen is active.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, PlatformType } from '../../types';
import { PlatformService } from '../../services/platform';
import { Logger } from '../../utils/Logger';

type PlatformSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PlatformSelection'
>;

interface Props {
  navigation: PlatformSelectionScreenNavigationProp;
}

interface PlatformInfo {
  type: PlatformType;
  name: string;
  description: string;
  features: string[];
  pricing: string;
  videoQuality: string;
  generationTime: string;
  color: string;
}

// ============================================================================
// DEACTIVATED: D-ID Platform (2025-10-27)
// ============================================================================
// D-ID platform has been removed from the app. Code is kept for reference.
// ============================================================================
const PLATFORM_INFO: Partial<Record<PlatformType, PlatformInfo>> = {
  did: {
    type: 'did',
    name: 'D-ID',
    description: 'High-quality AI avatars with natural expressions',
    features: [
      'Full HD (1920x1080) video quality',
      'Natural facial expressions',
      'Multiple voice providers',
      'Fast generation (5-15 seconds)',
      'Wide language support',
    ],
    pricing: '~$50/month',
    videoQuality: 'Full HD (1920x1080)',
    generationTime: '5-15 seconds',
    color: '#6366F1',
  },
  heygen: {
    type: 'heygen',
    name: 'HeyGen',
    description: 'Professional AI avatars with advanced customization',
    features: [
      '720p-1080p video quality',
      'Professional avatar styles',
      '175+ languages supported',
      'Photo avatar creation (Avatar IV)',
      'Custom avatar from your photos',
    ],
    pricing: '$29-89/month',
    videoQuality: '720p-1080p',
    generationTime: '10-30 seconds',
    color: '#8B5CF6',
  },
};

const PlatformSelectionScreen: React.FC<Props> = ({ navigation }) => {
  // Auto-select HeyGen since it's the only option
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('heygen');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-select HeyGen on component mount
  useEffect(() => {
    Logger.info('PlatformSelectionScreen: Auto-selecting HeyGen (only available platform)');
    setSelectedPlatform('heygen');
  }, []);

  const handlePlatformSelect = (platform: PlatformType) => {
    // Only HeyGen is available now
    if (platform !== 'heygen') {
      Logger.warn(`Attempted to select disabled platform: ${platform}`);
      Alert.alert(
        'Platform Not Available',
        'This platform is currently not available. Please use HeyGen.'
      );
      return;
    }
    Logger.info(`User selected platform: ${platform}`);
    setSelectedPlatform(platform);
  };

  const handleContinue = async () => {
    // HeyGen is auto-selected, but double-check
    if (!selectedPlatform || selectedPlatform !== 'heygen') {
      Alert.alert('Error', 'HeyGen must be selected to continue.');
      setSelectedPlatform('heygen'); // Force HeyGen
      return;
    }

    setIsLoading(true);
    Logger.info(`Saving selected platform: ${selectedPlatform}`);

    try {
      // Save selected platform (always HeyGen)
      const success = await PlatformService.setSelectedPlatform('heygen');

      if (success) {
        Logger.info('Platform saved successfully, navigating to API Key Setup');
        // Navigate to API Key Setup
        navigation.navigate('APIKeySetup', { platform: 'heygen' });
      } else {
        Alert.alert(
          'Error',
          'Failed to save platform selection. Please try again.'
        );
      }
    } catch (error) {
      Logger.error('Error saving platform selection', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlatformCard = (platformInfo: PlatformInfo) => {
    const isSelected = selectedPlatform === platformInfo.type;
    // D-ID is permanently disabled
    const isDisabled = platformInfo.type === 'did';

    return (
      <TouchableOpacity
        key={platformInfo.type}
        style={[
          styles.platformCard,
          isSelected && { borderColor: platformInfo.color, borderWidth: 3 },
          isDisabled && styles.platformCardDisabled,
        ]}
        onPress={() => !isDisabled && handlePlatformSelect(platformInfo.type)}
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
      >
        {isDisabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledBadge}>Disabled</Text>
          </View>
        )}
        <View style={styles.platformHeader}>
          <View
            style={[
              styles.platformIcon,
              { backgroundColor: platformInfo.color },
              isDisabled && styles.platformIconDisabled,
            ]}
          >
            <Text style={styles.platformIconText}>
              {platformInfo.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.platformTitleContainer}>
            <Text style={[styles.platformName, isDisabled && styles.textDisabled]}>
              {platformInfo.name}
            </Text>
            <Text style={[styles.platformPricing, isDisabled && styles.textDisabled]}>
              {platformInfo.pricing}
            </Text>
          </View>
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: platformInfo.color }]}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={[styles.platformDescription, isDisabled && styles.textDisabled]}>
          {platformInfo.description}
        </Text>

        <View style={styles.platformDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDisabled && styles.textDisabled]}>Video Quality:</Text>
            <Text style={[styles.detailValue, isDisabled && styles.textDisabled]}>{platformInfo.videoQuality}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDisabled && styles.textDisabled]}>Generation Time:</Text>
            <Text style={[styles.detailValue, isDisabled && styles.textDisabled]}>{platformInfo.generationTime}</Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, isDisabled && styles.textDisabled]}>Features:</Text>
          {platformInfo.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={[styles.featureBullet, isDisabled && styles.textDisabled]}>•</Text>
              <Text style={[styles.featureText, isDisabled && styles.textDisabled]}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Choose Your Platform</Text>
        <Text style={styles.subtitle}>
          HeyGen is the selected AI avatar platform for this app. You'll need to provide
          your own HeyGen API key to continue.
        </Text>

        <View style={styles.platformsContainer}>
          {/* D-ID Platform - DEACTIVATED */}
          {/* {renderPlatformCard(PLATFORM_INFO.did)} */}
          
          {/* HeyGen Platform - ACTIVE */}
          {PLATFORM_INFO.heygen && renderPlatformCard(PLATFORM_INFO.heygen)}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Important</Text>
          <Text style={styles.infoText}>
            You'll need to sign up for a HeyGen account and obtain an API key.
            HeyGen offers plans starting from $29/month with free trial options.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            // HeyGen is always selected, button always enabled
          ]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Loading...' : 'Continue with HeyGen'}
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 20,
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
  platformsContainer: {
    gap: 16,
  },
  platformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    position: 'relative',
  },
  platformCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  disabledBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  platformIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  platformIconDisabled: {
    opacity: 0.5,
  },
  platformTitleContainer: {
    flex: 1,
  },
  platformName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  platformPricing: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  platformDescription: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
  },
  platformDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  featureBullet: {
    fontSize: 16,
    color: '#6366F1',
    marginRight: 8,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PlatformSelectionScreen;

