import React, { Suspense, lazy, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
const YoutubePlayer: any = lazy(() => import('react-native-youtube-iframe'));
import { COLORS, GRADIENTS, getRatingColor } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { Snackbar } from '../components/Snackbar';
import { WatchedMovieModal } from '../components/WatchedMovieModal';
import { FadeImage } from '../components/FadeImage';
import { CreditList } from '../components/CreditList';
import { useMovieDetail } from '../hooks/useMovieDetail';
import { MovieDetailSkeleton } from '../components/movie/MovieDetailSkeleton';
import { styles } from './MovieDetail.styles';

interface MovieDetailProps {
  route?: { params: { movieId: number } };
  onBack?: () => void;
}

export const MovieDetail: React.FC<MovieDetailProps> = ({ route, onBack }) => {
  const { movieId } = route?.params || { movieId: 0 };
  const { width, height } = useWindowDimensions();

  const {
    movie,
    loading,
    loadError,
    isFavorite,
    isInWatchlist,
    imdbRating,
    imdbVotes,
    trailerKey,
    trailerPlaying,
    setTrailerPlaying,
    isWatched,
    existingEntry,
    ratingModalVisible,
    setRatingModalVisible,
    snackbar,
    setSnackbar,
    loadData,
    toggleWatchlist,
    toggleFavorite,
    openLogModal,
    handleConfirmLog,
  } = useMovieDetail(movieId);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return <MovieDetailSkeleton onBack={onBack} />;
  }

  if (loadError || !movie) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.muted} />
          <Text style={styles.loadingText}>Failed to load movie</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry loading movie">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        {onBack && (
          <SafeAreaView style={styles.backSafe}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />
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
          source={tmdbService.getImageSource(movie.backdrop_path || movie.poster_path, 'w780')}
          style={[styles.backdrop, { height: height * CONFIG.LAYOUT.BACKDROP_HEIGHT_RATIO_HIGH }]}
        >
          <LinearGradient
            colors={GRADIENTS.backdrop}
            locations={[0, 0.6, 1]}
            style={styles.backdropGradient}
          />

          {onBack && (
            <SafeAreaView style={styles.backSafe}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </SafeAreaView>
          )}

          {/* Rating badge on backdrop */}
          <View style={styles.backdropRating}>
            {imdbRating ? (
              <View style={styles.imdbBadge}>
                <Text style={styles.imdbLabel}>IMDb</Text>
                <Text style={[styles.imdbScore, { color: getRatingColor(parseFloat(imdbRating)) }]}>
                  {imdbRating}
                </Text>
                {imdbVotes && <Text style={styles.imdbVotes}>{imdbVotes}</Text>}
              </View>
            ) : (
              <View style={[styles.ratingCircle, { borderColor: getRatingColor(movie.vote_average) }]}>
                <Text style={[styles.ratingCircleText, { color: getRatingColor(movie.vote_average) }]}>
                  {movie.vote_average.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{movie.title}</Text>

          {/* Meta line */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{movie.release_date?.split('-')[0]}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatRuntime(movie.runtime)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.statusText}>{movie.status}</Text>
          </View>

          {/* Genres */}
          <View style={styles.genreRow}>
            {movie.genres.map(g => (
              <View key={g.id} style={styles.genreTag}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>

          {/* Log as Watched Button */}
          <TouchableOpacity
            style={[styles.logButton, isWatched && styles.logButtonWatched]}
            onPress={openLogModal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isWatched ? 'Watched, double tap to edit' : 'Log as Watched'}
          >
            <Ionicons
              name={isWatched ? "checkmark-circle" : "add-circle-outline"}
              size={20}
              color={isWatched ? COLORS.teal : COLORS.text.inverse}
            />
            <Text style={[styles.logButtonText, isWatched && styles.logButtonTextWatched]}>
              {isWatched ? 'Watched' : 'Log as Watched'}
            </Text>
          </TouchableOpacity>

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

          {/* Cast & Crew */}
          {movie.credits && (
            <CreditList cast={movie.credits.cast} crew={movie.credits.crew} />
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SYNOPSIS</Text>
            <Text style={styles.overview} numberOfLines={overviewExpanded ? undefined : 4}>{movie.overview || 'No overview available.'}</Text>
            {(movie.overview || '').length > 200 && (
              <TouchableOpacity onPress={() => setOverviewExpanded(!overviewExpanded)} activeOpacity={0.7}>
                <Text style={styles.readMore}>{overviewExpanded ? 'Read less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Trailer */}
          {trailerKey && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TRAILER</Text>
              {trailerPlaying ? (
                <View style={styles.trailerContainer}>
                  <Suspense fallback={<View style={[styles.trailerContainer, { justifyContent: 'center', height: width * 0.52 }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>}>
                    <YoutubePlayer
                      height={width * 0.52}
                      play={true}
                      videoId={trailerKey}
                      webViewProps={{ allowsInlineMediaPlayback: true }}
                      onChangeState={(state: string) => {
                        if (state === 'ended') setTrailerPlaying(false);
                      }}
                    />
                  </Suspense>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.trailerContainer}
                  onPress={() => setTrailerPlaying(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Play trailer"
                >
                  <FadeImage
                    source={{ uri: `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg` }}
                    style={styles.trailerThumbnail}
                    showSkeleton={false}
                  />
                  <View style={styles.trailerPlayOverlay}>
                    <View style={styles.trailerPlayButton}>
                      <Ionicons name="play" size={28} color={COLORS.text.primary} style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Log / Rate Modal */}
      <WatchedMovieModal
        visible={ratingModalVisible}
        movie={movie}
        onClose={() => setRatingModalVisible(false)}
        onConfirm={handleConfirmLog}
        initialData={existingEntry ? {
          rating: existingEntry.rating,
          liked: existingEntry.liked,
          review: existingEntry.review,
          tags: existingEntry.tags?.join(', '),
          rewatch: existingEntry.rewatch,
          noSpoilers: existingEntry.noSpoilers,
          watchedDate: new Date(existingEntry.watchedDate),
        } : null}
      />

      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
};
