import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity,
  ScrollView, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, LETTER_SPACING, getRatingColor } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SearchResult, CurrentlyWatchingItem } from '../types';
import { FadeImage } from '../components/FadeImage';
import { DiscoverySkeleton } from '../components/discovery/DiscoverySkeletons';
import { PopcornLoader } from '../components/discovery/PopcornLoader';

interface DiscoveryScreenProps {
  onSelectShow: (show: SearchResult) => void;
  onBackRef?: (fn: (() => boolean) | null) => void;
  refreshRef?: (fn: (() => void) | null) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ onSelectShow, onBackRef, refreshRef }) => {
  const { width: screenWidth } = useWindowDimensions();
  const SPOTLIGHT_WIDTH = screenWidth * 0.75;
  const POSTER_WIDTH = (screenWidth - SPACING.m * 2 - SPACING.s * 2) / 3;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<CurrentlyWatchingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadTrending();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Register back handler with parent
  useEffect(() => {
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
  }, [searchActive, onBackRef]);

  // Expose silent currently-watching refresh to parent
  const refreshCW = useCallback(async () => {
    setCurrentlyWatching(await StorageProvider.getCurrentlyWatching());
  }, []);

  const refreshCWRef = useRef(refreshCW);
  refreshCWRef.current = refreshCW;

  useEffect(() => {
    if (refreshRef) refreshRef(() => { refreshCWRef.current(); });
    return () => { refreshRef?.(null); };
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [tvData, movieData] = await Promise.all([
        tmdbService.getTrending(),
        tmdbService.getTrendingMovies(),
      ]);
      setTrending(tvData);
      setTrendingMovies(movieData);
      setCurrentlyWatching(await StorageProvider.getCurrentlyWatching());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [tvData, movieData] = await Promise.all([
        tmdbService.getTrending(),
        tmdbService.getTrendingMovies(),
      ]);
      setTrending(tvData);
      setTrendingMovies(movieData);
      setCurrentlyWatching(await StorageProvider.getCurrentlyWatching());
    } catch {
      // silently fail on refresh — existing data remains
    } finally {
      setRefreshing(false);
    }
  };

  const performSearch = useCallback(async (text: string) => {
    if (text.length > 2) {
      setLoading(true);
      const searchData = await tmdbService.search(text);
      // Filter out 'person' results â€" only show movies and TV shows
      const filtered = searchData.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
      setResults(filtered);
      setLoading(false);
      setSearching(false);
    } else if (text.length === 0) {
      setResults([]);
      setSearching(false);
    }
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      setSearching(true);
    } else {
      setSearching(false);
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  const clearSearch = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    setResults([]);
    setSearching(false);
    setSearchActive(false);
  };

  // Load search history when search becomes active
  useEffect(() => {
    if (searchActive) {
      StorageProvider.getSearchHistory().then(setSearchHistory);
    }
  }, [searchActive]);

  const handleSelectFromSearch = useCallback(async (item: SearchResult) => {
    await StorageProvider.addSearchHistoryItem(item);
    onSelectShow(item);
  }, [onSelectShow]);

  const removeHistoryItem = useCallback(async (item: SearchResult) => {
    await StorageProvider.removeSearchHistoryItem(item.id, item.media_type);
    setSearchHistory(await StorageProvider.getSearchHistory());
  }, []);

  const clearAllHistory = useCallback(async () => {
    await StorageProvider.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const spotlight = trending.slice(0, 8);
  const popular = trending.slice(8);

  type BrowseSection =
    | { key: 'spotlight'; data: SearchResult[] }
    | { key: 'currentlyWatching'; data: CurrentlyWatchingItem[] }
    | { key: 'popular'; data: SearchResult[] }
    | { key: 'trendingMovies'; data: SearchResult[] };

  const browseSections = React.useMemo<BrowseSection[]>(() => {
    const sections: BrowseSection[] = [];
    if (spotlight.length > 0) sections.push({ key: 'spotlight', data: spotlight });
    if (currentlyWatching.length > 0) sections.push({ key: 'currentlyWatching', data: currentlyWatching });
    if (popular.length > 0 || trending.length > 0)
      sections.push({ key: 'popular', data: popular.length > 0 ? popular : trending });
    if (trendingMovies.length > 0) sections.push({ key: 'trendingMovies', data: trendingMovies.slice(0, 12) });
    return sections;
  }, [spotlight, popular, trending, trendingMovies, currentlyWatching]);

  const handleCardPress = useCallback((item: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectShow(item);
  }, [onSelectShow]);

  const handleSearchSelect = useCallback((item: SearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSelectFromSearch(item);
  }, [handleSelectFromSearch]);

  const renderBrowseSection = useCallback(({ item: section }: { item: BrowseSection }) => {
    switch (section.key) {
      case 'spotlight':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Spotlight</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotlightList}
              snapToInterval={SPOTLIGHT_WIDTH + SPACING.s}
              decelerationRate="fast"
            >
              {(section.data as SearchResult[]).map(item => (
                <TouchableOpacity
                  key={`spot-${item.id}`}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD}
                  style={[styles.spotlightCard, { width: SPOTLIGHT_WIDTH, height: SPOTLIGHT_WIDTH * 0.56 }]}
                >
                  <FadeImage
                    source={{ uri: tmdbService.getImageUrl(item.backdrop_path || item.poster_path, 'w780') }}
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
              ))}
            </ScrollView>
          </View>
        );
      case 'currentlyWatching':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: COLORS.teal }]} />
              <Text style={styles.sectionTitle}>Currently Watching</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterList}>
              {(section.data as CurrentlyWatchingItem[]).map(item => (
                <TouchableOpacity
                  key={`cw-${item.seriesId}`}
                  onPress={() => handleCardPress({ id: item.seriesId, media_type: 'tv', name: item.name, poster_path: item.posterPath } as SearchResult)}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD}
                  style={[styles.posterCard, { width: POSTER_WIDTH }]}
                >
                  <FadeImage
                    source={{ uri: tmdbService.getImageUrl(item.posterPath) }}
                    style={[styles.posterImage, { width: POSTER_WIDTH }]}
                    resizeMode="cover"
                  />
                  <Text style={styles.posterTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 'popular':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Popular</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterList}>
              {(section.data as SearchResult[]).map(item => (
                <TouchableOpacity
                  key={`pop-${item.id}`}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD}
                  style={[styles.posterCard, { width: POSTER_WIDTH }]}
                >
                  <FadeImage
                    source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
                    style={[styles.posterImage, { width: POSTER_WIDTH }]}
                    resizeMode="cover"
                  />
                  <Text style={styles.posterTitle} numberOfLines={2}>
                    {item.name || item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 'trendingMovies':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Trending Movies</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterList}>
              {(section.data as SearchResult[]).map(item => (
                <TouchableOpacity
                  key={`tmov-${item.id}`}
                  onPress={() => handleCardPress(item)}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD}
                  style={[styles.posterCard, { width: POSTER_WIDTH }]}
                >
                  <FadeImage
                    source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
                    style={[styles.posterImage, { width: POSTER_WIDTH }]}
                    resizeMode="cover"
                  />
                  <Text style={styles.posterTitle} numberOfLines={2}>
                    {item.name || item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
    }
  }, [SPOTLIGHT_WIDTH, POSTER_WIDTH, handleCardPress]);

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleSearchSelect(item)}
      activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
      style={styles.searchResultCard}
    >
      <FadeImage
        source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
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

  if (loading && trending.length === 0) {
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

  if (loadError && trending.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Explore</Text>
          </View>
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.muted} />
            <Text style={styles.emptyText}>Couldn't load trending content</Text>
            <Text style={styles.emptySubText}>Check your connection and try again</Text>
            <TouchableOpacity onPress={loadTrending} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              placeholder="Search movies and shows..."
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

        {/* Recent Searches â€” shows/movies the user previously tapped */}
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
                activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
              >
                {item.poster_path ? (
                  <FadeImage
                    source={{ uri: tmdbService.getImageUrl(item.poster_path, 'w92') }}
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
                    {(item.release_date || item.first_air_date)?.split('-')[0] || ''} Â· {item.media_type === 'movie' ? 'Movie' : 'Series'}
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
            ListEmptyComponent={
              loading || searching ? (
                <PopcornLoader />
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="search-outline" size={40} color={COLORS.text.muted} />
                  <Text style={styles.emptyText}>No results found</Text>
                  <Text style={styles.emptySubText}>Try a different spelling or search term</Text>
                </View>
              )
            }
          />
        ) : (
          /* Browse Sections */
          <FlatList
            data={browseSections}
            renderItem={renderBrowseSection}
            keyExtractor={section => section.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
  },
  headerTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    paddingHorizontal: SPACING.m,
    height: 48,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.s,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearches: {
    flex: 1,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  recentTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wide,
  },
  recentClear: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.primary,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  recentPoster: {
    width: 36,
    height: 54,
    borderRadius: 4,
    marginRight: SPACING.s,
    backgroundColor: COLORS.surface,
  },
  recentPosterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
    marginRight: SPACING.s,
  },
  recentItemTitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  recentItemMeta: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: SPACING.xxs,
  },
  searchList: {
    paddingHorizontal: SPACING.m,
    paddingBottom: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
  },
  searchResultCard: {
    flexDirection: 'row',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.m,
  },
  searchPoster: {
    width: 56,
    height: 84,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  searchTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  searchMeta: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  searchRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  searchRatingText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  emptySubText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  retryButton: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: SPACING.s,
  },
  retryText: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: LETTER_SPACING.wide,
    textTransform: 'uppercase',
  },
  spotlightList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  spotlightCard: {
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  spotlightGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    justifyContent: 'flex-end',
    padding: SPACING.m,
  },
  spotlightInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  spotlightTitle: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    marginRight: SPACING.s,
  },
  spotlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  spotlightRating: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  ratingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  posterList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  posterCard: {
    gap: SPACING.xs,
  },
  posterImage: {
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.card,
  },
  posterTitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
});
