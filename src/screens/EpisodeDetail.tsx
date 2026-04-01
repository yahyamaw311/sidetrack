import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, Animated, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
const YoutubePlayer: any = lazy(() => import('react-native-youtube-iframe'));
import { COLORS, SPACING, BORDER_RADIUS, getRatingColor } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { WatchedEpisodeModal } from '../components/WatchedEpisodeModal';
import { SeasonBrowser } from '../components/SeasonBrowser';
import { Snackbar } from '../components/Snackbar';
import { EpisodeDetailSkeleton } from '../components/episode/EpisodeDetailSkeleton';
import { useEpisodeDetail } from '../hooks/useEpisodeDetail';
import { styles } from './EpisodeDetail.styles';

interface EpisodeDetailProps {
  route?: { params: { tvId: number; seasonNumber: number; episodeNumber: number } };
  onBack?: () => void;
}

export const EpisodeDetail: React.FC<EpisodeDetailProps> = ({ route, onBack }) => {
  const { tvId, seasonNumber: initialSeason, episodeNumber: initialEpisode } = route?.params || { tvId: 1399, seasonNumber: 1, episodeNumber: 1 };
  const { width, height } = useWindowDimensions();

  const {
    episode,
    show,
    isFavorite,
    isInWatchlist,
    loading,
    refreshing,
    loadError,
    showImdbRating,
    watchedModalVisible,
    setWatchedModalVisible,
    watchedEpisode,
    setWatchedEpisode,
    watchedEpisodeIds,
    setWatchedEpisodeIds,
    editInitialData,
    setEditInitialData,
    snackbar,
    setSnackbar,
    trailerKey,
    loadData,
    openWatchedModal,
    openEditWatchedModal,
    handleConfirmWatched,
    selectEpisode,
    toggleWatchlist,
    toggleFavorite,
    handleRefresh,
  } = useEpisodeDetail(tvId, initialSeason, initialEpisode);

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
    return undefined;
  }, [trailerExpanded, trailerReady, trailerShimmerAnim]);

  const formatRuntime = (mins?: number): string | null => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return <EpisodeDetailSkeleton onBack={onBack} />;
  }

  if (loadError || !episode || !show) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.muted} />
          <Text style={styles.loadingText}>Failed to load show</Text>
          <TouchableOpacity onPress={() => loadData()} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry loading show">
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

  // Filter out specials (season 0) from the seasons list
  const displaySeasons = show.seasons.filter(s => s.season_number > 0) || [];

  return (
    <View style={styles.container}>
      <SeasonBrowser
        tvId={tvId}
        displaySeasons={displaySeasons}
        currentEpisode={episode}
        watchedEpisodeIds={watchedEpisodeIds}
        onSelectEpisode={selectEpisode}
        onOpenWatchedModal={openWatchedModal}
        onEditWatchedEntry={openEditWatchedModal}
        onWatchedIdsChange={setWatchedEpisodeIds}
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
            {/* Full-bleed backdrop */}
            <ImageBackground
              source={tmdbService.getImageSource(episode.still_path || show.backdrop_path, 'w780')}
              style={[styles.backdrop, { height: height * CONFIG.LAYOUT.BACKDROP_HEIGHT_RATIO_LOW }]}
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
                {formatRuntime(episode.runtime) && (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaText}>{formatRuntime(episode.runtime)}</Text>
                  </>
                )}
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
                  accessibilityRole="button"
                  accessibilityLabel={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
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
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
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
                <Text style={styles.overview}>{episode.overview || 'No overview available.'}</Text>
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
                    }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={trailerExpanded ? 'Close trailer' : 'Play trailer'}>
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
                    outputRange: [0, width * 0.52],
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
                    <Suspense fallback={<View style={{ justifyContent: 'center', height: width * 0.52 }}><ActivityIndicator size="large" color={COLORS.primary} /></View>}>
                      <YoutubePlayer
                        height={width * 0.52}
                        videoId={trailerKey}
                        play={trailerExpanded}
                        onReady={() => setTrailerReady(true)}
                        webViewProps={{ allowsInlineMediaPlayback: true }}
                      />
                    </Suspense>
                  )}
                </Animated.View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />
            </View>
          </>
        }
      />

      {/* Fixed back button – stays in place during scroll */}
      {onBack && (
        <SafeAreaView style={styles.backSafe} pointerEvents="box-none">
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Watched Episode Modal */}
      <WatchedEpisodeModal
        visible={watchedModalVisible}
        episode={watchedEpisode}
        show={show}
        onClose={() => { setWatchedModalVisible(false); setWatchedEpisode(null); setEditInitialData(null); }}
        onConfirm={handleConfirmWatched}
        initialData={editInitialData}
      />
      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
};