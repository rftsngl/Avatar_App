/**
 * Main Tab Navigator
 * 
 * ============================================================================
 * MODIFIED: Updated for HeyGen-only architecture (2025-10-27)
 * ============================================================================
 * Voice and Avatar catalogs now show HeyGen content only (stock voices/avatars).
 * D-ID custom voice cloning and avatar creation features removed.
 * ============================================================================
 * 
 * Bottom tab navigation for main app screens
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import { Text, StyleSheet } from 'react-native';

// Import screens
import VideoCreationScreen from '../screens/video/VideoCreationScreen';
import VideoArchiveScreen from '../screens/video/VideoArchiveScreen';
import AvatarCatalogScreen from '../screens/avatar/AvatarCatalogScreen';
import VoiceCatalogScreen from '../screens/voice/VoiceCatalogScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Simple icon component (text-based emoji icons)
 */
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icon}
    </Text>
  );
};

/**
 * Main Tab Navigator Component
 */
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6366F1', // Indigo-500
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="VideoCreation"
        component={VideoCreationScreen}
        options={{
          title: 'Create Video',
          tabBarLabel: 'Video',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="VideoArchive"
        component={VideoArchiveScreen}
        options={{
          title: 'Video Archive',
          tabBarLabel: 'Archive',
          tabBarIcon: ({ focused }) => <TabIcon icon="📁" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AvatarCatalog"
        component={AvatarCatalogScreen}
        options={{
          title: 'Avatars',
          tabBarLabel: 'Avatars',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="VoiceCatalog"
        component={VoiceCatalogScreen}
        options={{
          title: 'Voices',
          tabBarLabel: 'Voices',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎤" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});

export default MainTabNavigator;
