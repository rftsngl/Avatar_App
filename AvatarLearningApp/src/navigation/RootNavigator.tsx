/**
 * Root Navigator
 * 
 * ============================================================================
 * MODIFIED: D-ID Routes Deactivated (2025-10-27)
 * ============================================================================
 * Voice cloning and D-ID avatar creation routes are commented out as D-ID
 * platform is no longer supported. HeyGen-only architecture.
 * ============================================================================
 * 
 * Main navigation configuration for the application.
 * Uses React Navigation Stack Navigator for screen transitions.
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootStackParamList } from '../types';
import { PlatformService } from '../services/platform';
import { SecureStorageService } from '../services/storage';
import { Logger } from '../utils/Logger';

// Import screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PlatformSelectionScreen from '../screens/onboarding/PlatformSelectionScreen';
import APIKeySetupScreen from '../screens/onboarding/APIKeySetupScreen';
import MainTabNavigator from './MainTabNavigator';
import VideoPlaybackScreen from '../screens/video/VideoPlaybackScreen';
import TemplateSelectionScreen from '../screens/video/TemplateSelectionScreen';
import PlatformManagementScreen from '../screens/settings/PlatformManagementScreen';
// DEACTIVATED: D-ID voice cloning screens
// import { VoiceCloningScreen } from '../screens/voice/VoiceCloningScreen';
// import { VoiceProfileManagementScreen } from '../screens/voice/VoiceProfileManagementScreen';
// import { AvatarCreationScreen } from '../screens/avatar/AvatarCreationScreen';
// import { AvatarProfileManagementScreen } from '../screens/avatar/AvatarProfileManagementScreen';
import PhotoAvatarManagementScreen from '../screens/avatar/PhotoAvatarManagementScreen';
import PhotoAvatarCreationScreen from '../screens/avatar/PhotoAvatarCreationScreen';
// Settings screen is in MainTabNavigator (bottom tabs)

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Root Navigator Component
 */
const RootNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Welcome' | 'MainTabs'>('Welcome');

  /**
   * Check if user has completed onboarding
   * by checking if API keys exist
   */
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        Logger.info('RootNavigator: Checking onboarding status');

        // Since HeyGen is the only platform, just check if HeyGen API key exists
        const hasHeyGenKey = await SecureStorageService.hasAPIKey('heygen');
        
        if (!hasHeyGenKey) {
          Logger.info('RootNavigator: No HeyGen API key found, showing onboarding');
          setInitialRoute('Welcome');
          setIsLoading(false);
          return;
        }

        // Ensure platform is set to HeyGen (force it if not set)
        const selectedPlatform = await PlatformService.getSelectedPlatform();
        if (!selectedPlatform || selectedPlatform !== 'heygen') {
          Logger.info('RootNavigator: Setting platform to HeyGen');
          await PlatformService.setSelectedPlatform('heygen');
        }

        // API key exists, skip onboarding
        Logger.info('RootNavigator: HeyGen API key found, going to main app');
        setInitialRoute('MainTabs');
      } catch (error) {
        Logger.error('RootNavigator: Error checking onboarding status', error);
        // On error, show onboarding to be safe
        setInitialRoute('Welcome');
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Show loading screen while checking
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6366F1', // Indigo-500
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        {/* Onboarding Screens */}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PlatformSelection"
          component={PlatformSelectionScreen}
          options={{
            title: 'Select Platform',
            headerLeft: () => null, // Prevent going back
          }}
        />
        <Stack.Screen
          name="APIKeySetup"
          component={APIKeySetupScreen}
          options={{
            title: 'API Key Setup',
          }}
        />

        {/* Main App with Bottom Tabs */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* Modal Screens (open on top of tabs) */}
        <Stack.Screen
          name="VideoPlayback"
          component={VideoPlaybackScreen}
          options={{
            title: 'Video Playback',
          }}
        />
        <Stack.Screen
          name="TemplateSelection"
          component={TemplateSelectionScreen}
          options={{
            title: 'Video Templates',
          }}
        />
        <Stack.Screen
          name="PlatformManagement"
          component={PlatformManagementScreen}
          options={{
            title: 'Platform Management',
          }}
        />

        {/* DEACTIVATED: Voice Cloning Screens (D-ID only feature) */}
        {/* <Stack.Screen
          name="VoiceCloning"
          component={VoiceCloningScreen}
          options={{
            title: 'Clone Your Voice',
          }}
        />
        <Stack.Screen
          name="VoiceProfileManagement"
          component={VoiceProfileManagementScreen}
          options={{
            title: 'Voice Profiles',
          }}
        /> */}

        {/* DEACTIVATED: Avatar Creation Screens (D-ID custom avatars) */}
        {/* <Stack.Screen
          name="AvatarCreation"
          component={AvatarCreationScreen}
          options={{
            title: 'Create Custom Avatar',
          }}
        />
        <Stack.Screen
          name="AvatarProfileManagement"
          component={AvatarProfileManagementScreen}
          options={{
            title: 'Custom Avatars',
          }}
        /> */}

        {/* Photo Avatar Screens (HeyGen Avatar IV) */}
        <Stack.Screen
          name="PhotoAvatarManagement"
          component={PhotoAvatarManagementScreen}
          options={{
            title: 'Photo Avatars',
          }}
        />
        <Stack.Screen
          name="PhotoAvatarCreation"
          component={PhotoAvatarCreationScreen}
          options={{
            title: 'Create Instant Video',
          }}
        />

        {/* Settings is in MainTabNavigator (bottom tabs), not here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});

export default RootNavigator;

