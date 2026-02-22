import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  LayoutAnimation,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SwipeableRow } from '../components/SwipeableRow';
import { WatchedMovie, WatchedEpisode, FavoriteMovie } from '../types';

type TVDrillLevel = 'shows' | 'episodes';

type UnifiedItem =
  | { type: 'movie'; data: WatchedMovie; sortDate: string }
  | { type: 'show'; data: ShowGroup; sortDate: string };

interface ShowGroup {
  seriesId: number;
  seriesName: string;
  posterPath?: string | null;
  episodes: WatchedEpisode[];
  seasons: number[];
  latestDate: string;
}

interface HistoryScreenProps {
  onSelectMovie?: (id: number) => void;
  onSelectShow?: (id: number) => void;
  onOpenWrapped?: () => void;
  onBackRef?: (fn: (() => boolean) | null) => void;
}

// ── Wrapped Banner ──
const WrappedBanner: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={wrappedStyles.bannerWrap}>
      <LinearGradient
        colors={['#1a1a2e', '#302b63', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={wrappedStyles.bannerGradient}
      >
        <Animated.View style={[wrappedStyles.bannerContent, { opacity: shimmerOpacity }]}>
          <Text style={wrappedStyles.bannerEmoji}>🎬</Text>
        </Animated.View>
        <View style={wrappedStyles.bannerTextWrap}>
          <Text style={wrappedStyles.bannerTitle}>Your Sidetrack Wrapped</Text>
          <Text style={wrappedStyles.bannerSubtitle}>See your year in movies & TV</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectMovie, onSelectShow, onOpenWrapped, onBackRef }) => {
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [episodes, setEpisodes] = useState<WatchedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());
  const [favoriteEpisodeIds, setFavoriteEpisodeIds] = useState<Set<number>>(new Set());

  // TV drill-down state
  const [tvLevel, setTvLevel] = useState<TVDrillLevel>('shows');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const [movieData, episodeData, favMovies, favEpisodeIdList] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
      StorageProvider.getAllFavoriteMovies(),
      StorageProvider.getAllFavorites(),
    ]);
    setMovies(movieData);
    setEpisodes(episodeData);
    setFavoriteMovieIds(new Set(favMovies.map(m => m.movieId)));
    setFavoriteEpisodeIds(new Set(favEpisodeIdList));
    setLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const [movieData, episodeData, favMovies, favEpisodeIdList] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
      StorageProvider.getAllFavoriteMovies(),
      StorageProvider.getAllFavorites(),
    ]);
    setMovies(movieData);
    setEpisodes(episodeData);
    setFavoriteMovieIds(new Set(favMovies.map(m => m.movieId)));
    setFavoriteEpisodeIds(new Set(favEpisodeIdList));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Register back handler with parent
  useEffect(() => {
    if (onBackRef) {
      onBackRef(() => {
        if (tvLevel === 'episodes') {
          drillBack();
          return true;
        }
        return false;
      });
    }
    return () => { onBackRef?.(null); };
  }, [tvLevel, onBackRef]);

  const handleRemoveMovie = async (movieId: number, watchedDate: string) => {
    await StorageProvider.removeFromWatchedMovies(movieId, watchedDate);
    loadHistory();
  };

  const handleRemoveEpisode = async (episodeId: number) => {
    await StorageProvider.removeWatchedEpisode(episodeId);
    loadHistory();
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderHalfStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<Ionicons key={i} name="star" size={12} color={COLORS.primary} />);
      } else if (rating >= i - 0.5) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color={COLORS.primary} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color={COLORS.text.muted} />);
      }
    }
    return stars;
  };

  const totalCount = movies.length + episodes.length;
  const query = searchQuery.trim().toLowerCase();

  // ── Group episodes by show ──
  const showGroups: ShowGroup[] = useMemo(() => {
    const grouped: Record<number, ShowGroup> = {};
    const episodesToGroup = showFavoritesOnly
      ? episodes.filter(ep => favoriteEpisodeIds.has(ep.episodeId))
      : episodes;
    for (const ep of episodesToGroup) {
      if (!grouped[ep.seriesId]) {
        grouped[ep.seriesId] = {
          seriesId: ep.seriesId,
          seriesName: ep.seriesName || 'Unknown show',
          posterPath: ep.stillPath,
          episodes: [],
          seasons: [],
          latestDate: ep.watchedDate,
        };
      }
      grouped[ep.seriesId].episodes.push(ep);
      if (!grouped[ep.seriesId].seasons.includes(ep.seasonNumber)) {
        grouped[ep.seriesId].seasons.push(ep.seasonNumber);
      }
      if (new Date(ep.watchedDate) > new Date(grouped[ep.seriesId].latestDate)) {
        grouped[ep.seriesId].latestDate = ep.watchedDate;
      }
    }
    return Object.values(grouped)
      .map(g => ({ ...g, seasons: g.seasons.sort((a, b) => a - b) }));
  }, [episodes, showFavoritesOnly, favoriteEpisodeIds]);

  // ── Unified list: movies + show groups, sorted by most recent date ──
  const unifiedItems: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];
    for (const m of movies) {
      if (query && !m.title.toLowerCase().includes(query)) continue;
      if (showFavoritesOnly && !favoriteMovieIds.has(m.movieId)) continue;
      items.push({ type: 'movie', data: m, sortDate: m.watchedDate });
    }
    for (const g of showGroups) {
      if (query && !g.seriesName.toLowerCase().includes(query)) continue;
      items.push({ type: 'show', data: g, sortDate: g.latestDate });
    }
    return items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [movies, showGroups, query, showFavoritesOnly, favoriteMovieIds]);

  // ── Selected show / season data for drill-down ──
  const selectedShow = useMemo(() => {
    if (selectedShowId === null) return null;
    return showGroups.find(s => s.seriesId === selectedShowId) ?? null;
  }, [showGroups, selectedShowId]);

  // All episodes for the selected show, most recently watched first
  const selectedShowEpisodes = useMemo(() => {
    if (!selectedShow) return [];
    return [...selectedShow.episodes].sort((a, b) =>
      new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
    );
  }, [selectedShow]);

  // ── Navigation helpers ──
  const drillIntoShow = (seriesId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedShowId(seriesId);
    setTvLevel('episodes');
  };

  const drillBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedShowId(null);
    setTvLevel('shows');
  };

  // ── Render: unified movie row ──
  const renderMovieRow = (item: WatchedMovie, index: number) => (
    <SwipeableRow onDelete={() => handleRemoveMovie(item.movieId, item.watchedDate)} height={80}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelectMovie?.(item.movieId)}
        activeOpacity={0.7}
      >
        <View style={styles.timeline}>
          <View style={[styles.timelineDot, { backgroundColor: getRatingColor(item.rating) }]} />
          {index < unifiedItems.length - 1 && <View style={styles.timelineLine} />}
        </View>
        <Image
          source={{ uri: tmdbService.getImageUrl(item.posterPath) }}
          style={styles.poster}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.releaseDate?.split('-')[0]} · {item.runtime}m
          </Text>
          <View style={styles.bottomRow}>
            <View style={styles.genreRow}>
              {item.genres.slice(0, 2).map((genre, idx) => (
                <Text key={idx} style={styles.genreText}>{genre}</Text>
              ))}
            </View>
            <Text style={styles.dateText}>{formatDate(item.watchedDate)}</Text>
          </View>
        </View>
        <View style={styles.ratingCol}>
          {favoriteMovieIds.has(item.movieId) && (
            <Ionicons name="star" size={12} color={COLORS.primary} style={{ marginBottom: 2 }} />
          )}
          <Text style={[styles.ratingValue, { color: getRatingColor(item.rating) }]}>
            {item.rating}
          </Text>
          <Text style={styles.ratingMax}>/10</Text>
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );

  // ── Render: unified show card ──
  const renderShowCard = (item: ShowGroup, index: number) => {
    const ratedEps = item.episodes.filter(ep => ep.rating > 0);
    const avgRating = ratedEps.length > 0
      ? ratedEps.reduce((sum, ep) => sum + ep.rating, 0) / ratedEps.length
      : 0;
    const totalEps = item.episodes.length;
    const totalSeasons = item.seasons.length;

    return (
      <TouchableOpacity
        style={tvStyles.showCard}
        onPress={() => drillIntoShow(item.seriesId)}
        activeOpacity={0.7}
      >
        <View style={styles.timeline}>
          <View style={[styles.timelineDot, { backgroundColor: avgRating > 0 ? COLORS.primary : COLORS.text.muted }]} />
          {index < unifiedItems.length - 1 && <View style={styles.timelineLine} />}
        </View>

        {item.episodes[0]?.stillPath ? (
          <Image
            source={{ uri: tmdbService.getImageUrl(item.episodes[0].stillPath, 'w300') }}
            style={tvStyles.showPoster}
          />
        ) : (
          <View style={[tvStyles.showPoster, tvStyles.posterPlaceholder]}>
            <Ionicons name="tv-outline" size={20} color={COLORS.text.muted} />
          </View>
        )}

        <View style={tvStyles.showInfo}>
          <Text style={tvStyles.showName} numberOfLines={1}>{item.seriesName}</Text>
          <Text style={tvStyles.showMeta}>
            {totalSeasons} season{totalSeasons !== 1 ? 's' : ''} · {totalEps} ep{totalEps !== 1 ? 's' : ''}
          </Text>
          <View style={tvStyles.showBottomRow}>
            {avgRating > 0 && (
              <View style={tvStyles.avgRatingWrap}>
                <Ionicons name="star" size={11} color={COLORS.primary} />
                <Text style={tvStyles.avgRatingText}>{avgRating.toFixed(1)}</Text>
              </View>
            )}
            <Text style={tvStyles.showDate}>{formatDate(item.latestDate)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
      </TouchableOpacity>
    );
  };

  // ── Render: unified item ──
  const renderUnifiedItem = ({ item, index }: { item: UnifiedItem; index: number }) => {
    if (item.type === 'movie') return renderMovieRow(item.data, index);
    return renderShowCard(item.data, index);
  };

  // ── Render: Episode rows ──
  const renderEpisodeRow = ({ item }: { item: WatchedEpisode }) => {
    const starRating = item.rating || 0;
    return (
      <SwipeableRow onDelete={() => handleRemoveEpisode(item.episodeId)} height={64}>
        <TouchableOpacity
          style={tvStyles.episodeRow}
          activeOpacity={0.7}
        >
          <View style={tvStyles.epNumberWrap}>
            <Text style={tvStyles.epNumber}>{item.episodeNumber}</Text>
          </View>

          {item.stillPath ? (
            <Image
              source={{ uri: tmdbService.getImageUrl(item.stillPath, 'w300') }}
              style={tvStyles.epStill}
            />
          ) : (
            <View style={[tvStyles.epStill, tvStyles.epStillPlaceholder]}>
              <Ionicons name="image-outline" size={16} color={COLORS.text.muted} />
            </View>
          )}

          <View style={tvStyles.epInfo}>
            <Text style={tvStyles.epTitle} numberOfLines={1}>
              S{item.seasonNumber}E{item.episodeNumber} · {item.episodeName || `Episode ${item.episodeNumber}`}
            </Text>
            <View style={tvStyles.epMetaRow}>
              {starRating > 0 ? (
                <View style={tvStyles.starsRow}>
                  {renderHalfStars(starRating)}
                </View>
              ) : (
                <Text style={tvStyles.epMetaText}>Not rated</Text>
              )}
              <Text style={tvStyles.epDateText}>{formatDate(item.watchedDate)}</Text>
            </View>
          </View>

          {item.liked && (
            <Ionicons name="heart" size={14} color={COLORS.coral} style={{ marginLeft: SPACING.xs }} />
          )}
          {favoriteEpisodeIds.has(item.episodeId) && (
            <Ionicons name="star" size={14} color={COLORS.primary} style={{ marginLeft: SPACING.xs }} />
          )}
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  // ── Breadcrumb header for TV drill-down ──
  const renderBreadcrumb = () => {
    if (tvLevel === 'shows' || !selectedShow) return null;

    return (
      <View style={tvStyles.breadcrumb}>
        <TouchableOpacity onPress={drillBack} style={tvStyles.breadcrumbBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={tvStyles.breadcrumbContent}>
          <Text style={tvStyles.breadcrumbTitle} numberOfLines={1}>{selectedShow.seriesName}</Text>
          <Text style={tvStyles.breadcrumbSub}>
            {selectedShowEpisodes.length} episode{selectedShowEpisodes.length !== 1 ? 's' : ''}{showFavoritesOnly ? ' favorited' : ' watched'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onSelectShow?.(selectedShow.seriesId)}
          style={tvStyles.infoButton}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Drill-down view: show's episodes ──
  if (tvLevel === 'episodes') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{showFavoritesOnly ? 'Favorites' : 'Watch Log'}</Text>
          </View>
          {renderBreadcrumb()}
          <FlatList
            data={selectedShowEpisodes}
            renderItem={renderEpisodeRow}
            keyExtractor={item => `ep_${item.episodeId}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Main unified list ──
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{showFavoritesOnly ? 'Favorites' : 'Watch Log'}</Text>
          {!showFavoritesOnly && totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowFavoritesOnly(!showFavoritesOnly);
            }}
            style={[styles.favFilterBtn, showFavoritesOnly && styles.favFilterBtnActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showFavoritesOnly ? 'star' : 'star-outline'}
              size={18}
              color={showFavoritesOnly ? COLORS.primary : COLORS.text.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & shows..."
            placeholderTextColor={COLORS.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {unifiedItems.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={showFavoritesOnly ? 'star-outline' : query ? 'search-outline' : 'albums-outline'} size={48} color={COLORS.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {showFavoritesOnly ? 'No favorites yet' : query ? 'No results' : 'Nothing logged yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {showFavoritesOnly
                ? 'Favorite movies and episodes will appear here'
                : query
                  ? `No movies or shows matching "${searchQuery}"`
                  : 'Movies and TV shows you watch will appear here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={unifiedItems}
            renderItem={renderUnifiedItem}
            keyExtractor={(item, index) =>
              item.type === 'movie'
                ? `m_${item.data.movieId}_${item.data.watchedDate}`
                : `s_${item.data.seriesId}`
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListHeaderComponent={
              <>
                {onOpenWrapped && <WrappedBanner onPress={onOpenWrapped} />}
                <Text style={styles.longPressHint}>Long-press an entry to remove it</Text>
              </>
            }
          />
        )}
      </View>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    gap: SPACING.s,
  },
  headerTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryMuted,
  },
  countText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.s,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.s,
    paddingHorizontal: SPACING.s,
    height: 40,
    gap: SPACING.xs,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.m,
    paddingBottom: 100,
  },
  loadingText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  emptyTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  emptySubtitle: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  list: {
    paddingHorizontal: SPACING.m,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    gap: SPACING.m,
  },
  timeline: {
    alignItems: 'center',
    width: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.borderLight,
    position: 'absolute',
    top: 12,
    bottom: -SPACING.m,
  },
  poster: {
    width: 48,
    height: 72,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  meta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genreText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  dateText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  ratingCol: {
    alignItems: 'center',
    minWidth: 36,
  },
  ratingValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  ratingMax: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 9,
  },
  favFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  favFilterBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  longPressHint: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
});

// ── Wrapped Banner styles ──
const wrappedStyles = StyleSheet.create({
  bannerWrap: {
    marginBottom: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    gap: SPACING.m,
  },
  bannerContent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 17,
  },
  bannerSubtitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
});

// ── TV drill-down styles ──
const tvStyles = StyleSheet.create({
  // Level 1: Show cards
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.s,
    marginBottom: SPACING.s,
    gap: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  showPoster: {
    width: 64,
    height: 48,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.surface,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  showInfo: {
    flex: 1,
    gap: 2,
  },
  showName: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  showMeta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  showBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginTop: 2,
  },
  avgRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avgRatingText: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 12,
  },
  showDate: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 10,
  },

  // Level 3: Episode rows
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  epNumberWrap: {
    width: 24,
    alignItems: 'center',
  },
  epNumber: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  epStill: {
    width: 72,
    height: 42,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  epStillPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  epInfo: {
    flex: 1,
    gap: 3,
  },
  epTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 13,
  },
  epMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  epMetaText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  epDateText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 10,
  },

  // Breadcrumb navigation
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    gap: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    marginBottom: SPACING.xs,
  },
  breadcrumbBack: {
    padding: 4,
  },
  breadcrumbContent: {
    flex: 1,
    gap: 1,
  },
  breadcrumbTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  breadcrumbSub: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
