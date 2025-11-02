/**
 * LearningTopicSelector.tsx
 * 
 * Topic and level selector component for learning mode.
 * Provides dropdowns for selecting learning topic and CEFR level.
 * 
 * Features:
 * - Topic dropdown (8 options with icons)
 * - CEFR level dropdown (A1-C2)
 * - Visual icons per topic
 * - Level descriptions
 * - Callbacks for changes
 * 
 * @author Avatar Learning App
 * @date 2025-11-01
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import type { LearningTopic, LanguageLevel } from '../../types';
import { HapticUtils } from '../../utils/hapticUtils';

/**
 * Props for LearningTopicSelector
 */
interface LearningTopicSelectorProps {
  selectedTopic: LearningTopic;
  selectedLevel: LanguageLevel;
  onTopicChange: (topic: LearningTopic) => void;
  onLevelChange: (level: LanguageLevel) => void;
  compact?: boolean;
}

/**
 * Topic data with icons and descriptions
 */
const TOPICS: Array<{ value: LearningTopic; label: string; icon: string; description: string }> = [
  { value: 'greetings', label: 'Greetings', icon: '👋', description: 'Meet & greet people' },
  { value: 'daily_conversation', label: 'Daily Talk', icon: '💬', description: 'Everyday conversations' },
  { value: 'business', label: 'Business', icon: '💼', description: 'Professional communication' },
  { value: 'travel', label: 'Travel', icon: '✈️', description: 'Tourism & directions' },
  { value: 'food', label: 'Food', icon: '🍽️', description: 'Restaurants & cooking' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', description: 'Buying & prices' },
  { value: 'weather', label: 'Weather', icon: '🌤️', description: 'Climate & seasons' },
  { value: 'hobbies', label: 'Hobbies', icon: '🎨', description: 'Interests & activities' },
];

/**
 * CEFR level data with descriptions
 */
const LEVELS: Array<{ value: LanguageLevel; label: string; description: string; color: string }> = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Very basic phrases', color: '#81C784' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Simple conversations', color: '#AED581' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Everyday situations', color: '#FFB74D' },
  { value: 'B2', label: 'B2 - Upper-Int.', description: 'Complex discussions', color: '#FF8A65' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Fluent communication', color: '#E57373' },
  { value: 'C2', label: 'C2 - Proficient', description: 'Near-native mastery', color: '#EF5350' },
];

/**
 * LearningTopicSelector Component
 */
export const LearningTopicSelector: React.FC<LearningTopicSelectorProps> = ({
  selectedTopic,
  selectedLevel,
  onTopicChange,
  onLevelChange,
  compact = false,
}) => {
  const [showTopicModal, setShowTopicModal] = React.useState(false);
  const [showLevelModal, setShowLevelModal] = React.useState(false);
  
  /**
   * Get selected topic data
   */
  const getSelectedTopicData = () => {
    return TOPICS.find(t => t.value === selectedTopic) || TOPICS[0];
  };
  
  /**
   * Get selected level data
   */
  const getSelectedLevelData = () => {
    return LEVELS.find(l => l.value === selectedLevel) || LEVELS[0];
  };
  
  /**
   * Handle topic selection
   */
  const handleTopicSelect = (topic: LearningTopic) => {
    HapticUtils.light();
    onTopicChange(topic);
    setShowTopicModal(false);
  };
  
  /**
   * Handle level selection
   */
  const handleLevelSelect = (level: LanguageLevel) => {
    HapticUtils.light();
    onLevelChange(level);
    setShowLevelModal(false);
  };
  
  const selectedTopicData = getSelectedTopicData();
  const selectedLevelData = getSelectedLevelData();
  
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Topic Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>📚 Topic</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => {
            HapticUtils.light();
            setShowTopicModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.selectorContent}>
            <Text style={styles.selectorIcon}>{selectedTopicData.icon}</Text>
            <View style={styles.selectorTextContainer}>
              <Text style={styles.selectorText}>{selectedTopicData.label}</Text>
              {!compact && (
                <Text style={styles.selectorDescription}>
                  {selectedTopicData.description}
                </Text>
              )}
            </View>
            <Text style={styles.selectorArrow}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Level Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>🎯 Level</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => {
            HapticUtils.light();
            setShowLevelModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.selectorContent}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: selectedLevelData.color },
              ]}
            >
              <Text style={styles.levelBadgeText}>{selectedLevelData.value}</Text>
            </View>
            <View style={styles.selectorTextContainer}>
              <Text style={styles.selectorText}>{selectedLevelData.label}</Text>
              {!compact && (
                <Text style={styles.selectorDescription}>
                  {selectedLevelData.description}
                </Text>
              )}
            </View>
            <Text style={styles.selectorArrow}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Topic Modal */}
      <Modal
        visible={showTopicModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Topic</Text>
              <TouchableOpacity
                onPress={() => setShowTopicModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic.value}
                  style={[
                    styles.modalItem,
                    selectedTopic === topic.value && styles.modalItemSelected,
                  ]}
                  onPress={() => handleTopicSelect(topic.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemIcon}>{topic.icon}</Text>
                  <View style={styles.modalItemTextContainer}>
                    <Text style={styles.modalItemLabel}>{topic.label}</Text>
                    <Text style={styles.modalItemDescription}>
                      {topic.description}
                    </Text>
                  </View>
                  {selectedTopic === topic.value && (
                    <Text style={styles.modalItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Level Modal */}
      <Modal
        visible={showLevelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Level (CEFR)</Text>
              <TouchableOpacity
                onPress={() => setShowLevelModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.modalItem,
                    selectedLevel === level.value && styles.modalItemSelected,
                  ]}
                  onPress={() => handleLevelSelect(level.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.modalLevelBadge,
                      { backgroundColor: level.color },
                    ]}
                  >
                    <Text style={styles.modalLevelBadgeText}>{level.value}</Text>
                  </View>
                  <View style={styles.modalItemTextContainer}>
                    <Text style={styles.modalItemLabel}>{level.label}</Text>
                    <Text style={styles.modalItemDescription}>
                      {level.description}
                    </Text>
                  </View>
                  {selectedLevel === level.value && (
                    <Text style={styles.modalItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  containerCompact: {
    gap: 8,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
  },
  selectorButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  selectorIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  selectorDescription: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
  selectorArrow: {
    fontSize: 12,
    color: '#BDBDBD',
    marginLeft: 8,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666666',
  },
  modalContent: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  modalItemSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  modalItemIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  modalItemCheck: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalLevelBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
