/**
 * Brand Voice List Component
 * 
 * Displays list of user's HeyGen brand voices (cloned voices).
 * Supports selection and refresh.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { BrandVoice } from '../types';

interface BrandVoiceListProps {
  voices: BrandVoice[];
  selectedVoiceId?: string;
  onSelect: (voice: BrandVoice) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const BrandVoiceList: React.FC<BrandVoiceListProps> = ({
  voices,
  selectedVoiceId,
  onSelect,
  onRefresh,
  loading = false,
}) => {
  const renderVoiceItem = ({ item }: { item: BrandVoice }) => {
    const isSelected = item.id === selectedVoiceId;

    return (
      <TouchableOpacity
        style={[styles.voiceCard, isSelected && styles.voiceCardSelected]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.voiceIconContainer}>
          <Text style={styles.voiceIcon}>🎤</Text>
          {isSelected && <View style={styles.selectedBadge} />}
        </View>

        <View style={styles.voiceInfo}>
          <Text style={styles.voiceName}>{item.name}</Text>
          
          <View style={styles.voiceMetadata}>
            {item.gender && (
              <Text style={styles.voiceMetaText}>
                {item.gender === 'male' ? '👨' : '👩'} {item.gender}
              </Text>
            )}
            {item.language && (
              <Text style={styles.voiceMetaText}>🌐 {item.language}</Text>
            )}
          </View>

          <Text style={styles.voiceId}>ID: {item.voice_id}</Text>
          
          <Text style={styles.createdAt}>
            Created: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎙️</Text>
      <Text style={styles.emptyTitle}>No Brand Voices</Text>
      <Text style={styles.emptyText}>
        Create brand voices on HeyGen.com{'\n'}
        Then they will appear here
      </Text>
    </View>
  );

  if (loading && voices.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading brand voices...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={voices}
      renderItem={renderVoiceItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  voiceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  voiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  voiceIcon: {
    fontSize: 32,
  },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  voiceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  voiceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  voiceMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  voiceMetaText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 12,
  },
  voiceId: {
    fontSize: 12,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  createdAt: {
    fontSize: 12,
    color: '#999999',
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
