import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TextInput, 
  TouchableOpacity, ActivityIndicator, 
  Platform, ScrollView, Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, LAYOUT, BORDER_RADIUS } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { SearchResult } from '../types';

const SPOTLIGHT_WIDTH = LAYOUT.window.width * 0.75;
const POSTER_WIDTH = (LAYOUT.window.width - SPACING.m * 2 - SPACING.s * 2) / 3;

import { getRatingColor } from '../constants/theme';

// --- Skeleton Components ---
const SkeletonBox = ({ style }: { style: any }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: COLORS.card, opacity }, style]} />;
};

const SpotlightSkeleton = () => (
  <View style={skeletonStyles.spotlightRow}>
    {[0, 1].map(i => (
      <View key={i} style={skeletonStyles.spotlightCard}>
        <SkeletonBox style={skeletonStyles.spotlightImage} />
        <View style={skeletonStyles.spotlightTextArea}>
          <SkeletonBox style={skeletonStyles.titleBar} />
          <SkeletonBox style={skeletonStyles.ratingBar} />
        </View>
      </View>
    ))}
  </View>
);

const PosterSkeleton = () => (
  <View style={skeletonStyles.posterRow}>
    {[0, 1, 2].map(i => (
      <View key={i} style={skeletonStyles.posterCard}>
        <SkeletonBox style={skeletonStyles.posterImage} />
        <SkeletonBox style={skeletonStyles.posterTitleBar} />
      </View>
    ))}
  </View>
);

const SearchResultSkeleton = () => (
  <View>
    {[0, 1, 2, 3, 4].map(i => (
      <View key={i} style={skeletonStyles.searchRow}>
        <SkeletonBox style={skeletonStyles.searchPoster} />
        <View style={skeletonStyles.searchTextArea}>
          <SkeletonBox style={skeletonStyles.searchTitleBar} />
          <SkeletonBox style={skeletonStyles.searchMetaBar} />
          <SkeletonBox style={skeletonStyles.searchRatingBar} />
        </View>
      </View>
    ))}
  </View>
);

const PopcornLoader = () => {
  const bounce1 = useRef(new Animated.Value(0)).current;
  const bounce2 = useRef(new Animated.Value(0)).current;
  const bounce3 = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -12, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const spinAnim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    createBounce(bounce1, 0).start();
    createBounce(bounce2, 150).start();
    createBounce(bounce3, 300).start();
    spinAnim.start();
    return () => {
      bounce1.stopAnimation();
      bounce2.stopAnimation();
      bounce3.stopAnimation();
      spin.stopAnimation();
    };
  }, [bounce1, bounce2, bounce3, spin]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={popcornStyles.container}>
      <View style={popcornStyles.kernelRow}>
        <Animated.Text style={[popcornStyles.kernel, { transform: [{ translateY: bounce1 }] }]}>
          🍿
        </Animated.Text>
        <Animated.Text style={[popcornStyles.kernel, { transform: [{ translateY: bounce2 }] }]}>
          🎬
        </Animated.Text>
        <Animated.Text style={[popcornStyles.kernel, { transform: [{ translateY: bounce3 }] }]}>
          🍿
        </Animated.Text>
      </View>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Ionicons name="film-outline" size={20} color={COLORS.primary} />
      </Animated.View>
      <Text style={popcornStyles.text}>Finding your next watch...</Text>
    </View>
  );
};

const DiscoverySkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SkeletonBox style={{ width: 6, height: 6, borderRadius: 3 }} />
        <SkeletonBox style={{ width: 80, height: 14, borderRadius: BORDER_RADIUS.xs }} />
      </View>
      <SpotlightSkeleton />
    </View>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SkeletonBox style={{ width: 6, height: 6, borderRadius: 3 }} />
        <SkeletonBox style={{ width: 60, height: 14, borderRadius: BORDER_RADIUS.xs }} />
      </View>
      <PosterSkeleton />
    </View>
  </ScrollView>
);

interface DiscoveryScreenProps {
  onSelectShow: (show: SearchResult) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ onSelectShow }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadTrending();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    const data = await tmdbService.getTrending();
    setTrending(data);
    setLoading(false);
  };

  const performSearch = useCallback(async (text: string) => {
    if (text.length > 2) {
      setLoading(true);
      const searchResults = await tmdbService.search(text);
      // Filter out 'person' results — only show movies and TV shows
      setResults(searchResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv'));
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

  const spotlight = trending.slice(0, 8);
  const popular = trending.slice(8);

  const renderSpotlightItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      onPress={() => onSelectShow(item)}
      activeOpacity={0.8}
      style={styles.spotlightCard}
    >
      <Image 
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
  );

  const renderPosterItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      onPress={() => onSelectShow(item)}
      activeOpacity={0.8}
      style={styles.posterCard}
    >
      <Image 
        source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
        style={styles.posterImage}
        resizeMode="cover"
      />
      <Text style={styles.posterTitle} numberOfLines={2}>
        {item.name || item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => onSelectShow(item)}
      activeOpacity={0.7}
      style={styles.searchResultCard}
    >
      <Image 
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
              placeholder="Movies, shows, people..."
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

        {/* Search Results */}
        {searchActive && query.length > 2 ? (
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.searchList}
            showsVerticalScrollIndicator={false}
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
          /* Browse Sections */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Spotlight */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Spotlight</Text>
              </View>
              <FlatList
                data={spotlight}
                renderItem={renderSpotlightItem}
                keyExtractor={item => `spot-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotlightList}
                snapToInterval={SPOTLIGHT_WIDTH + SPACING.s}
                decelerationRate="fast"
              />
            </View>

            {/* Popular */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Popular</Text>
              </View>
              <FlatList
                data={popular.length > 0 ? popular : trending}
                renderItem={renderPosterItem}
                keyExtractor={item => `pop-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.posterList}
              />
            </View>
          </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? 44 : 0,
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
  searchList: {
    paddingHorizontal: SPACING.m,
    paddingBottom: 100,
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
    gap: 4,
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
    gap: 6,
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
  scrollContent: {
    paddingBottom: 120,
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
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  spotlightList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  spotlightCard: {
    width: SPOTLIGHT_WIDTH,
    height: SPOTLIGHT_WIDTH * 0.56,
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
    gap: 4,
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
    width: POSTER_WIDTH,
    gap: SPACING.xs,
  },
  posterImage: {
    width: POSTER_WIDTH,
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

const skeletonStyles = StyleSheet.create({
  spotlightRow: {
    flexDirection: 'row',
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  spotlightCard: {
    width: SPOTLIGHT_WIDTH,
    height: SPOTLIGHT_WIDTH * 0.56,
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.l,
  },
  spotlightTextArea: {
    position: 'absolute',
    bottom: SPACING.m,
    left: SPACING.m,
    right: SPACING.m,
    gap: SPACING.xs,
  },
  titleBar: {
    width: '60%',
    height: 16,
    borderRadius: BORDER_RADIUS.xs,
  },
  ratingBar: {
    width: 40,
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
  posterRow: {
    flexDirection: 'row',
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  posterCard: {
    width: POSTER_WIDTH,
    gap: SPACING.xs,
  },
  posterImage: {
    width: POSTER_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.s,
  },
  posterTitleBar: {
    width: '70%',
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchRow: {
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
  },
  searchTextArea: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.s,
  },
  searchTitleBar: {
    width: '65%',
    height: 15,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchMetaBar: {
    width: '40%',
    height: 13,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchRatingBar: {
    width: 30,
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
});

const popcornStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 1.5,
    gap: SPACING.m,
  },
  kernelRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginBottom: SPACING.s,
  },
  kernel: {
    fontSize: 32,
  },
  text: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
});
