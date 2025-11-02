/**
 * VideoTabContainer.tsx
 * 
 * Container for Video features with 3 tabs:
 * - Create: Video creation with AI avatars
 * - Learn: AI-powered sentence generation and practice
 * - Practice: Custom text pronunciation practice
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { CreateVideoScreen } from './CreateVideoScreen';
import { LearnModeScreen, PracticeModeScreen } from '../learning';

type TabType = 'create' | 'learn' | 'practice';

/**
 * VideoTabContainer Component
 */
export const VideoTabContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('create');

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={styles.tabIcon}>🎬</Text>
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Create
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => setActiveTab('learn')}
        >
          <Text style={styles.tabIcon}>📚</Text>
          <Text style={[styles.tabText, activeTab === 'learn' && styles.tabTextActive]}>
            Learn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'practice' && styles.tabActive]}
          onPress={() => setActiveTab('practice')}
        >
          <Text style={styles.tabIcon}>✏️</Text>
          <Text style={[styles.tabText, activeTab === 'practice' && styles.tabTextActive]}>
            Practice
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'create' && <CreateVideoScreen />}
        {activeTab === 'learn' && <LearnModeScreen />}
        {activeTab === 'practice' && <PracticeModeScreen />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  tabContent: {
    flex: 1,
  },
});
