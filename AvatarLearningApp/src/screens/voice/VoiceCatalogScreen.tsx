/**
 * Voice Catalog Screen
 *
 * ============================================================================
 * MODIFIED: HeyGen-Only Platform (2025-10-27)
 * ============================================================================
 * Displays available voices from HeyGen platform only.
 * Removed: D-ID voices, cloned voices tab (D-ID-only feature)
 * Available tabs: Stock Voices, Brand Voices (HeyGen custom voices)
 * ============================================================================
 * 
 * Allows users to browse, filter, and select a voice for video creation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList, Voice, AvatarGender, VoiceProvider, BrandVoice, PlatformType } from '../../types';
import { PlatformService } from '../../services/platform';
import { HeyGenService } from '../../services/heygen';
import { CacheUtils } from '../../utils/cacheUtils';
import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { HapticUtils } from '../../utils/hapticUtils';
import { AsyncStorageService } from '../../services/storage';
import { BrandVoiceList } from '../../components';

type VoiceCatalogScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'VoiceCatalog'>,
  StackNavigationProp<RootStackParamList>
>;

type VoiceCatalogScreenRouteProp = RouteProp<MainTabParamList, 'VoiceCatalog'>;

interface Props {
  navigation: VoiceCatalogScreenNavigationProp;
  route: VoiceCatalogScreenRouteProp;
}

const VoiceCatalogScreen: React.FC<Props> = ({ navigation, route }) => {
  // MODIFIED: Removed 'cloned' tab (D-ID-only feature)
  const [activeTab, setActiveTab] = useState<'all' | 'brand'>('all');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBrandVoicesLoading, setIsBrandVoicesLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGender, setSelectedGender] = useState<AvatarGender | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<BrandVoice | null>(null);
  const [platform, setPlatform] = useState<PlatformType | null>(null);

  /**
   * Fetch voices from HeyGen API
   * MODIFIED: Removed D-ID voices and cloned voices (D-ID-only feature)
   */
  const fetchVoices = useCallback(async (useCache: boolean = true) => {
    try {
      Logger.info('VoiceCatalogScreen: Fetching voices');

      // Get selected platform (always 'heygen' now)
      const selectedPlatform = await PlatformService.getSelectedPlatform();

      if (!selectedPlatform) {
        Alert.alert('Error', 'No platform selected. Please select a platform first.');
        navigation.goBack();
        return;
      }

      setPlatform(selectedPlatform);

      // REMOVED: Cloned voices from VoiceCloneStorageService (D-ID-only feature)

      // Check cache first if useCache is true
      if (useCache) {
        const cacheResult = await CacheUtils.getValidVoiceCache(selectedPlatform);
        if (cacheResult.isValid && cacheResult.data) {
          Logger.info(`VoiceCatalogScreen: Using cached voices (${cacheResult.data.length})`);
          setVoices(cacheResult.data);
          setFilteredVoices(cacheResult.data);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from HeyGen API only (D-ID removed)
      const fetchedVoices: Voice[] = await HeyGenService.fetchVoices();

      // Save to cache
      await CacheUtils.saveVoiceCache(selectedPlatform, fetchedVoices);

      // MODIFIED: No cloned voices (D-ID-only feature removed)
      setVoices(fetchedVoices);
      setFilteredVoices(fetchedVoices);
      Logger.info(`VoiceCatalogScreen: Fetched ${fetchedVoices.length} stock voices`);
    } catch (error) {
      Logger.error('VoiceCatalogScreen: Error fetching voices', error);
      const errorMessage = ErrorHandler.getUserMessage(error);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigation]);

  /**
   * Fetch brand voices (HeyGen only)
   */
  const fetchBrandVoices = useCallback(async () => {
    if (platform !== 'heygen') {
      return;
    }

    try {
      setIsBrandVoicesLoading(true);
      Logger.info('VoiceCatalogScreen: Fetching brand voices');

      const voices = await HeyGenService.getAllBrandVoices();
      setBrandVoices(voices);
      Logger.info(`VoiceCatalogScreen: Fetched ${voices.length} brand voices`);
    } catch (error) {
      Logger.error('VoiceCatalogScreen: Error fetching brand voices', error);
      const errorMessage = ErrorHandler.getUserMessage(error);
      Alert.alert('Error', 'Failed to load brand voices: ' + errorMessage);
    } finally {
      setIsBrandVoicesLoading(false);
    }
  }, [platform]);

  /**
   * Handle pull to refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchVoices(false); // Force refresh, bypass cache
  }, [fetchVoices]);

  /**
   * Apply filters
   */
  const applyFilters = useCallback(() => {
    let filtered = [...voices];

    // Filter by gender
    if (selectedGender !== 'all') {
      filtered = filtered.filter((voice) => voice.gender === selectedGender);
    }

    // Filter by provider (only for D-ID)
    if (platform === 'did' && selectedProvider !== 'all') {
      filtered = filtered.filter((voice) => voice.provider === selectedProvider);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (voice) =>
          voice.name.toLowerCase().includes(query) ||
          voice.language.toLowerCase().includes(query) ||
          voice.languageCode.toLowerCase().includes(query)
      );
    }

    setFilteredVoices(filtered);
  }, [voices, selectedGender, selectedProvider, searchQuery, platform]);

  /**
   * Handle voice selection
   */
  const handleVoiceSelect = useCallback(async (voice: Voice) => {
    setSelectedVoice(voice);
    
    // Check if we're in selection mode
    const selectionMode = await AsyncStorageService.getItem<{ type: string; returnScreen: string }>('selection_mode');
    
    if (selectionMode && selectionMode.type === 'voice') {
      // Store selected voice temporarily
      await AsyncStorageService.setItem('temp_selected_voice', voice);
      // Clear selection mode
      await AsyncStorageService.removeItem('selection_mode');
      // Navigate back to the return screen
      HapticUtils.success();
      Logger.info('VoiceCatalogScreen: Voice selected for video creation', { 
        voiceId: voice.id,
        returnScreen: selectionMode.returnScreen,
      });
      
      // Navigate based on return screen
      if (selectionMode.returnScreen === 'PhotoAvatarCreation') {
        navigation.navigate('PhotoAvatarCreation');
      } else if (selectionMode.returnScreen === 'VideoCreation') {
        navigation.navigate('MainTabs', { screen: 'VideoCreation' });
      } else {
        // Fallback: go back
        navigation.goBack();
      }
    }
  }, [navigation]);

  /**
   * Handle voice selection (for browsing mode - just show details)
   */
  const handleConfirmSelection = () => {
    if (!selectedVoice) {
      Alert.alert('No Selection', 'Please select a voice first.');
      return;
    }

    Logger.info('VoiceCatalogScreen: Voice viewed', { voiceId: selectedVoice.id });
    
    // Show voice details
    Alert.alert(
      selectedVoice.name,
      `Language: ${selectedVoice.language}\nProvider: ${selectedVoice.provider}\n\nTo use this voice, go to the Video tab and select it during video creation.`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle brand voice selection
   */
  const handleBrandVoiceSelect = useCallback(async (voice: BrandVoice) => {
    setSelectedBrandVoice(voice);
    HapticUtils.light();
    
    // Check if we're in selection mode
    const selectionMode = await AsyncStorageService.getItem<{ type: string; returnScreen: string }>('selection_mode');
    
    if (selectionMode && selectionMode.type === 'voice') {
      // Convert BrandVoice to Voice format for compatibility
      const convertedVoice: Voice = {
        id: voice.voice_id,
        name: voice.name,
        language: voice.language || 'English',
        languageCode: 'en',
        gender: voice.gender as AvatarGender,
        provider: 'heygen' as VoiceProvider,
        platform: 'heygen',
        isCloned: true, // Mark as cloned for UI purposes
      };
      
      // Store selected voice temporarily
      await AsyncStorageService.setItem('temp_selected_voice', convertedVoice);
      // Clear selection mode
      await AsyncStorageService.removeItem('selection_mode');
      // Navigate back to the return screen
      HapticUtils.success();
      Logger.info('VoiceCatalogScreen: Brand voice selected', { 
        voiceId: voice.voice_id,
        returnScreen: selectionMode.returnScreen,
      });
      
      // Navigate based on return screen
      if (selectionMode.returnScreen === 'PhotoAvatarCreation') {
        navigation.navigate('PhotoAvatarCreation');
      } else if (selectionMode.returnScreen === 'VideoCreation') {
        navigation.navigate('MainTabs', { screen: 'VideoCreation' });
      } else {
        // Fallback: go back
        navigation.goBack();
      }
    }
  }, [navigation]);

  /**
   * Handle refresh brand voices
   */
  const handleRefreshBrandVoices = useCallback(() => {
    fetchBrandVoices();
  }, [fetchBrandVoices]);

  /**
   * Load voices on mount
   */
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  /**
   * Load brand voices when tab changes to 'brand'
   */
  useEffect(() => {
    if (activeTab === 'brand' && platform === 'heygen' && brandVoices.length === 0) {
      fetchBrandVoices();
    }
  }, [activeTab, platform, brandVoices.length, fetchBrandVoices]);

  /**
   * Apply filters when filter criteria change
   */
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  /**
   * Render gender filter button
   */
  const renderGenderFilter = (gender: AvatarGender | 'all', label: string) => {
    const isSelected = selectedGender === gender;

    return (
      <TouchableOpacity
        key={gender}
        style={[styles.filterButton, isSelected && styles.filterButtonActive]}
        onPress={() => setSelectedGender(gender)}
      >
        <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render provider filter button (D-ID only)
   */
  const renderProviderFilter = (provider: VoiceProvider | 'all', label: string) => {
    const isSelected = selectedProvider === provider;

    return (
      <TouchableOpacity
        key={provider}
        style={[styles.filterButton, isSelected && styles.filterButtonActive]}
        onPress={() => setSelectedProvider(provider)}
      >
        <Text style={[styles.filterButtonText, isSelected && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render voice item
   */
  const renderVoiceItem = ({ item }: { item: Voice }) => {
    const isSelected = selectedVoice?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.voiceCard,
          isSelected && styles.voiceCardSelected,
          item.isCloned && styles.voiceCardCloned,
        ]}
        onPress={() => handleVoiceSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.voiceInfo}>
          <View style={styles.voiceNameRow}>
            <Text style={styles.voiceName}>{item.name}</Text>
            {item.isCloned && (
              <View style={styles.clonedBadge}>
                <Text style={styles.clonedBadgeText}>🎤 Cloned</Text>
              </View>
            )}
          </View>
          <View style={styles.voiceMetaRow}>
            <Text style={styles.voiceLanguage}>{item.language}</Text>
            <Text style={styles.voiceSeparator}>•</Text>
            <Text style={styles.voiceGender}>{item.gender}</Text>
            {platform === 'did' && !item.isCloned && (
              <>
                <Text style={styles.voiceSeparator}>•</Text>
                <Text style={styles.voiceProvider}>{item.provider}</Text>
              </>
            )}
          </View>
          
          {/* HeyGen Advanced Features Badges */}
          {platform === 'heygen' && (item.emotionSupport || item.supportPause || item.supportLocale) && (
            <View style={styles.featureBadgesRow}>
              {item.emotionSupport && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>🎭 Emotion</Text>
                </View>
              )}
              {item.supportPause && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>⏸️ Pause</Text>
                </View>
              )}
              {item.supportLocale && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>🌍 Locales</Text>
                </View>
              )}
            </View>
          )}
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading voices...</Text>
      </View>
    );
  }

  /**
   * Render empty state
   */
  if (filteredVoices.length === 0 && !searchQuery && selectedGender === 'all' && selectedProvider === 'all') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No voices found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchVoices(false)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar - MODIFIED: Removed 'My Cloned' tab (D-ID-only feature) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => {
            setActiveTab('all');
            HapticUtils.light();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Voices
          </Text>
        </TouchableOpacity>

        {platform === 'heygen' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'brand' && styles.tabActive]}
            onPress={() => {
              setActiveTab('brand');
              HapticUtils.light();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'brand' && styles.tabTextActive]}>
              Brand Voices
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Content */}
      {activeTab === 'brand' ? (
        // Brand Voices Tab (HeyGen only)
        <BrandVoiceList
          voices={brandVoices}
          selectedVoiceId={selectedBrandVoice?.voice_id}
          onSelect={handleBrandVoiceSelect}
          onRefresh={handleRefreshBrandVoices}
          loading={isBrandVoicesLoading}
        />
      ) : (
        // All Voices & Cloned Voices Tabs
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or language..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Gender Filters */}
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Gender:</Text>
            <View style={styles.filtersRow}>
              {renderGenderFilter('all', 'All')}
              {renderGenderFilter('male', 'Male')}
              {renderGenderFilter('female', 'Female')}
            </View>
          </View>

          {/* Provider Filters (D-ID only) */}
          {platform === 'did' && (
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersTitle}>Provider:</Text>
              <View style={styles.filtersRow}>
                {renderProviderFilter('all', 'All')}
                {renderProviderFilter('microsoft', 'Microsoft')}
                {renderProviderFilter('elevenlabs', 'ElevenLabs')}
                {renderProviderFilter('amazon', 'Amazon')}
              </View>
            </View>
          )}

          {/* Results Count - MODIFIED: Removed cloned voice filtering */}
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {`${filteredVoices.length} ${filteredVoices.length === 1 ? 'voice' : 'voices'} found`}
            </Text>
          </View>

          {/* Voice List - MODIFIED: Removed cloned voices filtering */}
          {filteredVoices.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                No voices match your filters
              </Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedGender('all');
                  setSelectedProvider('all');
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredVoices}
              renderItem={renderVoiceItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={['#6366F1']}
                  tintColor="#6366F1"
                />
              }
              // Performance optimizations
              removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={10}
                getItemLayout={(data, index) => ({
                  length: 100, // approximate item height
                  offset: 100 * index,
                  index,
                })}
              />
            )}

          {/* Confirm Button */}
          {selectedVoice && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSelection}>
                <Text style={styles.confirmButtonText}>
                  Select {selectedVoice.name}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#6366F1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearFiltersButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  voiceCardSelected: {
    borderColor: '#6366F1',
    borderWidth: 3,
  },
  voiceCardCloned: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  clonedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  clonedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  voiceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  voiceLanguage: {
    fontSize: 14,
    color: '#6B7280',
  },
  voiceGender: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  voiceProvider: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  voiceSeparator: {
    fontSize: 14,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  featureBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  featureBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default VoiceCatalogScreen;

