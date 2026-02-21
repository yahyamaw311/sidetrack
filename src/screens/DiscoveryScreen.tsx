import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TextInput, 
  TouchableOpacity, ActivityIndicator, SafeAreaView, 
  Platform, ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, LAYOUT, BORDER_RADIUS } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { SearchResult } from '../types';

const SPOTLIGHT_WIDTH = LAYOUT.window.width * 0.75;
const POSTER_WIDTH = (LAYOUT.window.width - SPACING.m * 2 - SPACING.s * 2) / 3;

import { getRatingColor } from '../constants/theme';

interface DiscoveryScreenProps {
  onSelectShow: (show: SearchResult) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ onSelectShow }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    const data = await tmdbService.getTrending();
    setTrending(data);
    setLoading(false);
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      setLoading(true);
      const searchResults = await tmdbService.search(text);
      // Filter out 'person' results — only show movies and TV shows
      setResults(searchResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv'));
      setLoading(false);
    } else if (text.length === 0) {
      setResults([]);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
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
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
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
            onPress={() => setSearchActive(!searchActive)}
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
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={18} color={COLORS.text.muted} />
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
              loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
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
