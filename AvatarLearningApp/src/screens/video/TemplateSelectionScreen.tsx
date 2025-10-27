/**
 * Template Selection Screen
 *
 * Allows users to browse and select video templates from HeyGen.
 * Features:
 * - Grid view of templates with thumbnails
 * - Portrait/Landscape filter
 * - Quick video generation from templates
 * - Pull-to-refresh
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, HeyGenTemplate } from '../../types';
import { HeyGenService } from '../../services/heygen/HeyGenService';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';

type TemplateSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface Props {
  navigation: TemplateSelectionScreenNavigationProp;
}

type AspectRatioFilter = 'all' | 'portrait' | 'landscape';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_MARGIN * 3) / 2;

const TemplateSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [templates, setTemplates] = useState<HeyGenTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<HeyGenTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<AspectRatioFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, filter, searchQuery]);

  /**
   * Load templates from HeyGen API
   */
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      Logger.info('TemplateSelectionScreen: Loading templates');

      const templateList = await HeyGenService.listTemplates();
      setTemplates(templateList);

      Logger.info('TemplateSelectionScreen: Templates loaded', {
        count: templateList.length,
      });
    } catch (error) {
      Logger.error('TemplateSelectionScreen: Failed to load templates', error);
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTemplates();
    setIsRefreshing(false);
  };

  /**
   * Filter templates based on aspect ratio and search
   */
  const filterTemplates = () => {
    let filtered = [...templates];

    // Filter by aspect ratio
    if (filter !== 'all') {
      filtered = filtered.filter((t) => t.aspect_ratio === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (template: HeyGenTemplate) => {
    HapticUtils.light();

    Alert.prompt(
      'Generate from Template',
      `Enter the text for "${template.name}" template:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async (text) => {
            if (!text || text.trim() === '') {
              Alert.alert('Error', 'Please enter some text');
              return;
            }
            await generateFromTemplate(template.template_id, text.trim());
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  /**
   * Generate video from template
   */
  const generateFromTemplate = async (templateId: string, text: string) => {
    try {
      Logger.info('TemplateSelectionScreen: Generating video from template', {
        templateId,
        textLength: text.length,
      });

      Alert.alert('Generating Video', 'Creating your video from template...');

      // Generate video with template
      const videoId = await HeyGenService.generateFromTemplate(
        templateId,
        { text }, // Most templates expect 'text' variable
        `Template Video - ${new Date().toLocaleDateString()}`
      );

      HapticUtils.success();
      Alert.alert(
        'Video Generation Started',
        'Your video is being generated. You can check the status in Video Archive.',
        [
          {
            text: 'View Archive',
            onPress: () =>
              navigation.navigate('MainTabs', { screen: 'VideoArchive' }),
          },
          { text: 'OK' },
        ]
      );

      Logger.info('TemplateSelectionScreen: Video generation started', {
        videoId,
      });
    } catch (error) {
      Logger.error('TemplateSelectionScreen: Failed to generate video', error);
      HapticUtils.error();
      Alert.alert('Error', ErrorHandler.getUserMessage(error));
    }
  };

  /**
   * Render template card
   */
  const renderTemplateCard = ({ item }: { item: HeyGenTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleTemplateSelect(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.thumbnail_image_url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.templateInfo}>
        <Text style={styles.templateName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.aspectRatioBadge}>
          <Text style={styles.aspectRatioText}>
            {item.aspect_ratio === 'portrait' ? '📱 Portrait' : '🖥️ Landscape'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Templates Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || filter !== 'all'
          ? 'No templates match your criteria.'
          : 'No templates available at the moment.'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Video Templates</Text>
        <Text style={styles.headerSubtitle}>
          Quick video generation with pre-built templates
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({templates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'portrait' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('portrait')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'portrait' && styles.filterButtonTextActive,
            ]}
          >
            📱 Portrait
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'landscape' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('landscape')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'landscape' && styles.filterButtonTextActive,
            ]}
          >
            🖥️ Landscape
          </Text>
        </TouchableOpacity>
      </View>

      {/* Templates Grid */}
      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.template_id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
      />
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: CARD_MARGIN,
  },
  templateCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: CARD_MARGIN,
    marginHorizontal: CARD_MARGIN / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
    backgroundColor: '#F3F4F6',
  },
  templateInfo: {
    padding: 12,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  aspectRatioBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aspectRatioText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default TemplateSelectionScreen;
