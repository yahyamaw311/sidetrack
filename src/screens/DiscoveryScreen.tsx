import React, { useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Image, TextInput,
  TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDataEvent } from '../hooks/useDataEvent';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { FadeImage } from '../components/FadeImage';
import { SearchResult, CurrentlyWatchingItem } from '../types';
import { getRatingColor } from '../constants/theme';

import { useDiscoveryData } from '../hooks/useDiscoveryData';
import { useSearch } from '../hooks/useSearch';
import {
  useDiscoveryDimensions,
  DiscoverySkeleton,
} from '../components/discovery/DiscoverySkeletons';
import { PopcornLoader } from '../components/discovery/PopcornLoader';
import { styles } from './DiscoveryScreen.styles';

interface DiscoveryScreenProps {
  onSelectShow: (show: SearchResult) => void;
  onBackRef?: (fn: (() => boolean) | null) => void;
  refreshRef?: (fn: (() => void) | null) => void;
}

const GENRES = [
  { id: 28, name: 'Action', icon: 'flash-outline' },
  { id: 35, name: 'Comedy', icon: 'happy-outline' },
  { id: 18, name: 'Drama', icon: 'film-outline' },
  { id: 27, name: 'Horror', icon: 'skull-outline' },
  { id: 878, name: 'Sci-Fi', icon: 'rocket-outline' },
  { id: 10749, name: 'Romance', icon: 'heart-half-outline' },
  { id: 53, name: 'Thriller', icon: 'alert-circle-outline' },
  { id: 16, name: 'Animation', icon: 'color-palette-outline' },
  { id: 99, name: 'Documentary', icon: 'videocam-outline' },
];

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ onSelectShow, onBackRef, refreshRef }) => {
  const {
    trending, trendingMovies, topRated, currentlyWatching,
    loading, refreshing, loadTrending, handleRefresh, refreshCW
  } = useDiscoveryData();

  const {
    query, results, searchActive, setSearchActive, searching, searchHistory,
    selectedGenre, genreResults, genreLoading, handleSearch, clearSearch,
    handleGenreSelect, removeHistoryItem, clearAllHistory
  } = useSearch();

  const { spotlightWidth, posterWidth } = useDiscoveryDimensions();

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    if (searchActive) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onBackRef) {
      onBackRef(() => {
        if (searchActive) {
          clearSearch();
          return true;
        }
        return false;
      });
    }
    return () => { onBackRef?.(null); };
  }, [searchActive, onBackRef, clearSearch]);

  useDataEvent('currentlyWatching', refreshCW);

  const refreshCWRef = useRef(refreshCW);
  refreshCWRef.current = refreshCW;

  useEffect(() => {
    if (refreshRef) refreshRef(() => { refreshCWRef.current(); });
    return () => { refreshRef?.(null); };
  }, [refreshRef]);

  const handleSelectFromSearch = useCallback(async (item: SearchResult) => {
    await StorageProvider.addSearchHistoryItem(item);
    onSelectShow(item);
  }, [onSelectShow]);

  const spotlight = trending.slice(0, CONFIG.LIMITS.SPOTLIGHT_LIMIT);
  const popular = trending.slice(CONFIG.LIMITS.SPOTLIGHT_LIMIT);

  const renderSpotlightItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => onSelectShow(item)}
      activeOpacity={0.8}
      style={[styles.spotlightCard, { width: spotlightWidth, height: spotlightWidth * CONFIG.LAYOUT.TRAILER_ASPECT_RATIO }]}
    >
      <Image
        source={tmdbService.getImageSource(item.backdrop_path || item.poster_path, 'w780')}
        style={styles.spotlightImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(7,7,11,0.9)']}
        style={styles.spotlightGradient}
      >
        <View style={styles.spotlightInfo}>
          <Text style={styles.spotlightTitle} numberOfLines={1}>
            {item.name || item.title}
          </Text>
          <View style={styles.spotlightMeta}>
            <View style={[styles.ratingDot, { backgroundColor: getRatingColor(item.vote_average) }]} />
            <Text style={styles.spotlightRating}>{(item.vote_average || 0).toFixed(1)}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderPosterItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => onSelectShow(item)}
      activeOpacity={0.8}
      style={[styles.posterCard, { width: posterWidth }]}
    >
      <FadeImage
        source={tmdbService.getImageSource(item.poster_path)}
        style={[styles.posterImage, { width: posterWidth }]}
        resizeMode="cover"
      />
      <Text style={styles.posterTitle} numberOfLines={2}>
        {item.name || item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleSelectFromSearch(item)}
      activeOpacity={0.7}
      style={styles.searchResultCard}
    >
      <FadeImage
        source={tmdbService.getImageSource(item.poster_path)}
        style={styles.searchPoster}
      />
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{item.name || item.title}</Text>
        <Text style={styles.searchMeta}>
          {(item.release_date || item.first_air_date)?.split('-')[0] || ''} · {item.media_type === 'movie' ? 'Movie' : 'Series'}
        </Text>
        <View style={styles.searchRatingRow}>
          <View style={[styles.ratingDot, { backgroundColor: getRatingColor(item.vote_average) }]} />
          <Text style={styles.searchRatingText}>{(item.vote_average || 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleRemoveCW = async (item: CurrentlyWatchingItem) => {
    Alert.alert(
      "Remove Show",
      `Remove "${item.name}" from Currently Watching?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await StorageProvider.removeFromCurrentlyWatching(item.seriesId);
            refreshCW();
          }
        }
      ]
    );
  };

  const renderCurrentlyWatchingItem = ({ item }: { item: CurrentlyWatchingItem }) => (
    <TouchableOpacity
      key={`cw-${item.seriesId}`}
      onPress={() => onSelectShow({ id: item.seriesId, media_type: 'tv', name: item.name, poster_path: item.posterPath } as SearchResult)}
      onLongPress={() => handleRemoveCW(item)}
      activeOpacity={0.8}
      style={[styles.posterCard, { width: posterWidth }]}
    >
      <FadeImage
        source={tmdbService.getImageSource(item.posterPath)}
        style={[styles.posterImage, { width: posterWidth }]}
        resizeMode="cover"
      />
      <Text style={styles.posterTitle} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && trending.length === 0 && topRated.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore</Text>
            <View style={styles.searchToggle}>
              <Ionicons name="search" size={20} color={COLORS.text.primary} />
            </View>
          </View>
          <DiscoverySkeleton />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <TouchableOpacity
            onPress={() => {
              if (searchActive) {
                clearSearch();
              } else {
                setSearchActive(true);
              }
            }}
            style={styles.searchToggle}
          >
            <Ionicons name={searchActive ? "close" : "search"} size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {searchActive && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Movies, shows..."
              placeholderTextColor={COLORS.text.muted}
              value={query}
              onChangeText={handleSearch}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recent Searches */}
        {searchActive && query.length <= 2 && searchHistory.length > 0 ? (
          <View style={styles.recentSearches}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
              <TouchableOpacity onPress={clearAllHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.recentClear}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((item, index) => (
              <TouchableOpacity
                key={`${item.media_type || 'unknown'}_${item.id || index}`}
                style={styles.recentRow}
                onPress={() => onSelectShow(item)}
                activeOpacity={0.7}
              >
                {item.poster_path ? (
                  <FadeImage
                    source={tmdbService.getImageSource(item.poster_path, 'w92')}
                    style={styles.recentPoster}
                  />
                ) : (
                  <View style={[styles.recentPoster, styles.recentPosterPlaceholder]}>
                    <Ionicons name="film-outline" size={14} color={COLORS.text.muted} />
                  </View>
                )}
                <View style={styles.recentInfo}>
                  <Text style={styles.recentItemTitle} numberOfLines={1}>{item.name || item.title}</Text>
                  <Text style={styles.recentItemMeta}>
                    {(item.release_date || item.first_air_date)?.split('-')[0] || ''} · {item.media_type === 'movie' ? 'Movie' : 'Series'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeHistoryItem(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={14} color={COLORS.text.muted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchActive && query.length > 2 ? (
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={item => `${item.media_type}_${item.id}`}
            contentContainerStyle={styles.searchList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              loading || searching ? (
                <PopcornLoader />
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="film-outline" size={40} color={COLORS.text.muted} />
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              )
            }
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          >
            {/* Spotlight */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Spotlight</Text>
              </View>
              <FlatList
                data={spotlight}
                renderItem={renderSpotlightItem}
                keyExtractor={(item) => `spot-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotlightList}
                snapToInterval={spotlightWidth + SPACING.s}
                decelerationRate="fast"
                initialNumToRender={2}
                windowSize={3}
                maxToRenderPerBatch={2}
              />
            </View>

            {/* Currently Watching */}
            {currentlyWatching.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.teal }]} />
                  <Text style={styles.sectionTitle}>Currently Watching</Text>
                </View>
                <FlatList
                  data={currentlyWatching}
                  renderItem={renderCurrentlyWatchingItem}
                  keyExtractor={(item) => `cw-${item.seriesId}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.posterList}
                  initialNumToRender={3}
                  windowSize={3}
                  maxToRenderPerBatch={3}
                />
              </View>
            )}

            {/* Popular */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Popular</Text>
              </View>
              <FlatList
                data={popular.length > 0 ? popular : trending}
                renderItem={renderPosterItem}
                keyExtractor={(item) => `pop-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.posterList}
                initialNumToRender={4}
                windowSize={3}
              />
            </View>

            {/* Trending Movies */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Trending Movies</Text>
              </View>
              <FlatList
                data={trendingMovies.slice(0, CONFIG.LIMITS.TRENDING_SLICE_LIMIT)}
                renderItem={renderPosterItem}
                keyExtractor={(item) => `tmov-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.posterList}
                initialNumToRender={4}
                windowSize={3}
              />
            </View>

            {/* Genre Chips */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.sectionTitle}>Browse by Genre</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreChipList}>
                {GENRES.map(g => (
                  <TouchableOpacity
                    key={`genre-${g.id}`}
                    style={[styles.genreChip, selectedGenre === g.id && styles.genreChipActive]}
                    onPress={() => handleGenreSelect(g.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={g.icon as any} size={14} color={selectedGenre === g.id ? COLORS.primary : COLORS.text.secondary} />
                    <Text style={[styles.genreChipText, selectedGenre === g.id && styles.genreChipTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedGenre && (
                genreLoading ? (
                  <View style={{ paddingVertical: SPACING.l, alignItems: 'center' }}>
                    <ActivityIndicator color={COLORS.primary} />
                  </View>
                ) : genreResults.length > 0 ? (
                  <FlatList
                    data={genreResults.slice(0, CONFIG.LIMITS.TRENDING_SLICE_LIMIT)}
                    renderItem={renderPosterItem}
                    keyExtractor={(item) => `genre-r-${item.id}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.posterList, { marginTop: SPACING.m }]}
                    initialNumToRender={4}
                    windowSize={3}
                  />
                ) : null
              )}
            </View>

            {/* Top Rated */}
            {topRated.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: COLORS.teal }]} />
                  <Text style={styles.sectionTitle}>Top Rated</Text>
                </View>
                <FlatList
                  data={topRated.slice(0, CONFIG.LIMITS.TRENDING_SLICE_LIMIT)}
                  renderItem={renderPosterItem}
                  keyExtractor={(item) => `top-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.posterList}
                  initialNumToRender={4}
                  windowSize={3}
                />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};