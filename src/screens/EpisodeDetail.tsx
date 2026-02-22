import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ImageBackground, Platform, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import YoutubePlayer from 'react-native-youtube-iframe';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, LAYOUT, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { Episode, TVShowDetail, SeasonSummary, WatchedEpisode } from '../types';
import { WatchedEpisodeModal } from '../components/WatchedEpisodeModal';
import { SeasonBrowser } from '../components/SeasonBrowser';

interface EpisodeDetailProps {
  route?: { params: { tvId: number; seasonNumber: number; episodeNumber: number } };
  onBack?: () => void;
}

export const EpisodeDetail: React.FC<EpisodeDetailProps> = ({ route, onBack }) => {
  const { tvId, seasonNumber: initialSeason, episodeNumber: initialEpisode } = route?.params || { tvId: 1399, seasonNumber: 1, episodeNumber: 1 };

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [show, setShow] = useState<TVShowDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [imdbRating, setImdbRating] = useState<string | null>(null);
  const [imdbVotes, setImdbVotes] = useState<string | null>(null);
  const [showImdbRating, setShowImdbRating] = useState<string | null>(null);
  const [showImdbVotes, setShowImdbVotes] = useState<string | null>(null);

  const [watchedModalVisible, setWatchedModalVisible] = useState(false);
  const [watchedEpisode, setWatchedEpisode] = useState<Episode | null>(null);
  const [watchedEpisodeIds, setWatchedEpisodeIds] = useState<Set<number>>(new Set());
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerExpanded, setTrailerExpanded] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const trailerAnim = useRef(new Animated.Value(0)).current;
  const trailerShimmerAnim = useRef(new Animated.Value(0.3)).current;

  // Shimmer pulse for trailer skeleton
  useEffect(() => {
    if (trailerExpanded && !trailerReady) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(trailerShimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(trailerShimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [trailerExpanded, trailerReady]);

  useEffect(() => {
    loadData();
  }, [tvId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    const [seasonData, showData] = await Promise.all([
      tmdbService.getSeasonDetails(tvId, initialSeason),
      tmdbService.getTVShowDetails(tvId)
    ]);

    if (showData) {
      setShow(showData);
      const watchlist = await StorageProvider.getWatchlist();
      setIsInWatchlist(!!watchlist.find(item => item.seriesId === tvId));

      // Fetch show-level IMDb rating
      const showImdbId = showData.external_ids?.imdb_id;
      if (showImdbId) {
        const showRating = await tmdbService.getIMDbRating(showImdbId);
        if (showRating) {
          setShowImdbRating(showRating.imdbRating);
          setShowImdbVotes(showRating.imdbVotes);
        }
      }

      // Fetch trailer
      tmdbService.getTVTrailer(tvId).then(key => {
        if (key) setTrailerKey(key);
      });
    }

    if (seasonData) {
      const ep = seasonData.episodes.find(e => e.episode_number === initialEpisode);
      setEpisode(ep || null);


      if (ep) {
        const fav = await StorageProvider.isEpisodeFavorite(ep.id);
        setIsFavorite(fav);

        // Fetch episode-specific IMDb rating
        const omdb = await tmdbService.getIMDbEpisodeRating(tvId, ep.season_number, ep.episode_number);
        if (omdb) {
          setImdbRating(omdb.imdbRating);
          setImdbVotes(omdb.imdbVotes);
        }
      }
    }
    if (!showData && !seasonData) {
      setLoadError(true);
    }
    setLoading(false);

    // Load watched episode IDs
    const allWatched = await StorageProvider.getAllWatchedEpisodes();
    const ids = new Set(allWatched.filter(w => w.seriesId === tvId).map(w => w.episodeId));
    setWatchedEpisodeIds(ids);
  };

  const openWatchedModal = useCallback((ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWatchedEpisode(ep);
    setWatchedModalVisible(true);
  }, []);

  const handleConfirmWatched = async (data: {
    rating: number; liked: boolean; review: string; tags: string;
    rewatch: boolean; noSpoilers: boolean; watchedDate: Date;
  }) => {
    if (!watchedEpisode || !show) return;

    const entry: WatchedEpisode = {
      episodeId: watchedEpisode.id,
      seriesId: tvId,
      seriesName: show.name,
      episodeName: watchedEpisode.name,
      stillPath: watchedEpisode.still_path,
      seasonNumber: watchedEpisode.season_number,
      episodeNumber: watchedEpisode.episode_number,
      rating: data.rating,
      watchedDate: data.watchedDate.toISOString(),
      liked: data.liked,
      review: data.review.trim() || undefined,
      tags: data.tags.trim() ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      rewatch: data.rewatch,
      noSpoilers: data.noSpoilers,
      runtime: watchedEpisode.runtime,
      genres: show.genres?.map(g => g.name),
    };

    await StorageProvider.markEpisodeAsWatched(entry);
    setWatchedEpisodeIds(prev => new Set(prev).add(watchedEpisode.id));

    // Auto-add to Currently Watching
    await StorageProvider.addToCurrentlyWatching({
      seriesId: tvId,
      name: show?.name || '',
      posterPath: show?.poster_path || null,
      lastUpdated: new Date().toISOString(),
    });

    // Check if this was the last episode of the last season → auto-remove if fully watched
    const realSeasons = show.seasons.filter(s => s.season_number > 0);
    const lastSeason = realSeasons[realSeasons.length - 1];
    if (
      lastSeason &&
      watchedEpisode.season_number === lastSeason.season_number &&
      watchedEpisode.episode_number === lastSeason.episode_count
    ) {
      const seasonMap: Record<number, number> = {};
      for (const s of realSeasons) {
        seasonMap[s.season_number] = s.episode_count;
      }
      const fullyWatched = await StorageProvider.isShowFullyWatched(tvId, seasonMap);
      if (fullyWatched) {
        await StorageProvider.removeFromCurrentlyWatching(tvId);
      }
    }

    setWatchedModalVisible(false);
    setWatchedEpisode(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const selectEpisode = async (ep: Episode) => {
    setEpisode(ep);
    const fav = await StorageProvider.isEpisodeFavorite(ep.id);
    setIsFavorite(fav);

    // Fetch episode-specific IMDb rating
    setImdbRating(null);
    setImdbVotes(null);
    const omdb = await tmdbService.getIMDbEpisodeRating(tvId, ep.season_number, ep.episode_number);
    if (omdb) {
      setImdbRating(omdb.imdbRating);
      setImdbVotes(omdb.imdbVotes);
    }
  };

  const toggleWatchlist = async () => {
    if (!show) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      await StorageProvider.removeFromWatchlist(tvId);
      setIsInWatchlist(false);
    } else {
      await StorageProvider.addToWatchlist({
        seriesId: tvId,
        name: show.name,
        posterPath: show.poster_path,
        addedDate: new Date().toISOString(),
        itemType: 'tv',
      });
      setIsInWatchlist(true);
    }
  };

  const toggleFavorite = async () => {
    if (episode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newState = !isFavorite;
      await StorageProvider.toggleFavoriteEpisode(episode.id, newState);
      setIsFavorite(newState);
    }
  };

  const formatRuntime = (mins?: number) => {
    if (!mins) return '45m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Filter out specials (season 0) from the seasons list
  const displaySeasons = show?.seasons.filter(s => s.season_number > 0) || [];

  // Skeleton shimmer animation
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [loading, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  if (loading) {
    return (
      <View style={styles.container}>
        {onBack && (
          <SafeAreaView style={styles.backSafe}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </SafeAreaView>
        )}
        <View style={skelStyles.wrapper}>
          <Animated.View style={[skelStyles.backdrop, { opacity: shimmerOpacity }]} />
          <View style={skelStyles.content}>
            <Animated.View style={[skelStyles.titleLine, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.subtitleLine, { opacity: shimmerOpacity }]} />
            <View style={skelStyles.metaRow}>
              <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
              <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
              <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
            </View>
            <View style={skelStyles.actionRow}>
              <Animated.View style={[skelStyles.actionBtn, { opacity: shimmerOpacity }]} />
              <Animated.View style={[skelStyles.actionBtn, { opacity: shimmerOpacity }]} />
            </View>
            <Animated.View style={[skelStyles.divider, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.textBlock, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.textBlockShort, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
    );
  }

  if (loadError || !episode || !show) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.muted} />
          <Text style={styles.loadingText}>Failed to load show</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        {onBack && (
          <SafeAreaView style={styles.backSafe}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </SafeAreaView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Full-bleed backdrop */}
        <ImageBackground
          source={{ uri: tmdbService.getImageUrl(episode.still_path || show.backdrop_path, 'w780') }}
          style={styles.backdrop}
        >
          <LinearGradient
            colors={['rgba(7,7,11,0.3)', 'rgba(7,7,11,0.6)', COLORS.background]}
            locations={[0, 0.6, 1]}
            style={styles.backdropGradient}
          />
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{episode.name}</Text>
          <Text style={styles.showName}>{show.name}</Text>

          {/* Meta line */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{episode.air_date}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatRuntime(episode.runtime)}</Text>
          </View>

          {/* Genres */}
          <View style={styles.genreRow}>
            {show.genres.slice(0, 3).map(g => (
              <View key={g.id} style={styles.genreTag}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, isInWatchlist && styles.actionButtonActive]}
              onPress={toggleWatchlist}
            >
              <Ionicons
                name={isInWatchlist ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isInWatchlist ? COLORS.primary : COLORS.text.primary}
              />
              <Text style={[styles.actionText, isInWatchlist && styles.actionTextActive]}>
                {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
              onPress={toggleFavorite}
            >
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={18}
                color={isFavorite ? COLORS.primary : COLORS.text.primary}
              />
              <Text style={[styles.actionText, isFavorite && styles.actionTextActive]}>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.overview}>{show.overview || 'No overview available.'}</Text>
          </View>

          {/* Show Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT THE SHOW</Text>
            <View style={styles.showInfoRow}>
              <View style={styles.showInfoItem}>
                <Text style={styles.showInfoValue}>{show.number_of_seasons}</Text>
                <Text style={styles.showInfoLabel}>Seasons</Text>
              </View>
              <View style={styles.showInfoDivider} />
              <View style={styles.showInfoItem}>
                <Text style={[styles.showInfoValue, { color: getRatingColor(parseFloat(showImdbRating || String(show.vote_average))) }]}>
                  {showImdbRating || show.vote_average.toFixed(1)}
                </Text>
                <Text style={styles.showInfoLabel}>{showImdbRating ? 'IMDb' : 'Rating'}</Text>
              </View>
              <View style={styles.showInfoDivider} />
              {trailerKey ? (
                <TouchableOpacity style={styles.showInfoItem} onPress={() => {
                  const toValue = trailerExpanded ? 0 : 1;
                  if (trailerExpanded) setTrailerReady(false);
                  setTrailerExpanded(!trailerExpanded);
                  Animated.spring(trailerAnim, {
                    toValue,
                    damping: 18,
                    stiffness: 140,
                    useNativeDriver: false,
                  }).start();
                }} activeOpacity={0.7}>
                  <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                  <Text style={styles.showInfoLabel}>{trailerExpanded ? 'Close' : 'Trailer'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.showInfoItem}>
                  <View style={[styles.statusDot, show.status === 'Ended' && styles.statusEnded]} />
                  <Text style={styles.showInfoLabel}>{show.status}</Text>
                </View>
              )}
            </View>

            {/* Animated Trailer Player */}
            <Animated.View style={{
              height: trailerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Dimensions.get('window').width * 0.52],
              }),
              opacity: trailerAnim,
              overflow: 'hidden',
              borderRadius: BORDER_RADIUS.m,
              marginTop: trailerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SPACING.m],
              }),
            }}>
              {/* Shimmer skeleton while loading */}
              {trailerExpanded && !trailerReady && (
                <Animated.View style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: COLORS.card,
                  opacity: trailerShimmerAnim,
                  borderRadius: BORDER_RADIUS.m,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 2,
                }}>
                  <Ionicons name="logo-youtube" size={40} color={COLORS.text.muted} />
                </Animated.View>
              )}
              {trailerExpanded && (
                <YoutubePlayer
                  height={Dimensions.get('window').width * 0.52}
                  videoId={trailerKey!}
                  play={trailerExpanded}
                  onReady={() => setTrailerReady(true)}
                  webViewProps={{ allowsInlineMediaPlayback: true }}
                />
              )}
            </Animated.View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seasons & Episodes Browser */}
          <SeasonBrowser
            tvId={tvId}
            displaySeasons={displaySeasons}
            currentEpisode={episode}
            watchedEpisodeIds={watchedEpisodeIds}
            onSelectEpisode={selectEpisode}
            onOpenWatchedModal={openWatchedModal}
            onWatchedIdsChange={setWatchedEpisodeIds}
          />
        </View>
      </ScrollView>

      {/* Fixed back button – stays in place during scroll */}
      {onBack && (
        <SafeAreaView style={styles.backSafe} pointerEvents="box-none">
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Watched Episode Modal */}
      <WatchedEpisodeModal
        visible={watchedModalVisible}
        episode={watchedEpisode}
        show={show}
        onClose={() => { setWatchedModalVisible(false); setWatchedEpisode(null); }}
        onConfirm={handleConfirmWatched}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: SPACING.s,
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
  scroll: {
    flex: 1,
  },
  backdrop: {
    height: LAYOUT.window.height * 0.35,
    justifyContent: 'flex-end',
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backSafe: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 32 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    margin: SPACING.m,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(25,25,35,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  backdropBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.l,
  },
  episodeTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  episodeTagText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  ratingCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
    backgroundColor: 'rgba(7,7,11,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingCircleText: {
    fontFamily: FONTS.display,
    fontSize: 16,
  },
  imdbBadge: {
    backgroundColor: 'rgba(7,7,11,0.85)',
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    gap: 2,
  },
  imdbLabel: {
    color: '#F5C518',
    fontFamily: FONTS.heading,
    fontSize: 11,
    letterSpacing: 1,
  },
  imdbScore: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },
  imdbVotes: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 9,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingBottom: 120,
    marginTop: -SPACING.m,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 30,
  },
  showName: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    marginTop: 2,
    marginBottom: SPACING.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.m,
  },
  metaText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.text.muted,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.l,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.l,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  actionButtonActive: {
    borderColor: COLORS.primaryMuted,
    backgroundColor: COLORS.primaryMuted,
  },
  actionText: {
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  actionTextActive: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.l,
  },
  section: {
    marginBottom: SPACING.l,
  },
  sectionLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: SPACING.s,
  },
  overview: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 24,
  },
  showInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  showInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  showInfoDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  showInfoValue: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  showInfoLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  statusEnded: {
    backgroundColor: COLORS.text.muted,
  },
});

// ── Skeleton loader styles ──
const skelStyles = StyleSheet.create({
  wrapper: { flex: 1 },
  backdrop: {
    height: LAYOUT.window.height * 0.35,
    backgroundColor: COLORS.card,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.l,
    gap: SPACING.m,
  },
  titleLine: {
    height: 24,
    width: '65%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  subtitleLine: {
    height: 14,
    width: '40%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  metaRow: { flexDirection: 'row' as const, gap: SPACING.s },
  metaChip: {
    height: 28,
    width: 72,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.round,
  },
  actionRow: { flexDirection: 'row' as const, gap: SPACING.s },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.s,
  },
  divider: { height: 1, backgroundColor: COLORS.card },
  textBlock: {
    height: 14,
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  textBlockShort: {
    height: 14,
    width: '60%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
});
