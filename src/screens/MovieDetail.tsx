import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ImageBackground, Platform, ActivityIndicator, Animated, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import YoutubePlayer from 'react-native-youtube-iframe';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, LAYOUT, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { MovieDetail as MovieDetailType, WatchedMovie } from '../types';
import { DatePickerModal } from '../components/DatePicker';
import { SwipeableStars } from '../components/SwipeableStars';
import { Snackbar, SnackbarConfig } from '../components/Snackbar';

interface MovieDetailProps {
  route?: { params: { movieId: number } };
  onBack?: () => void;
}

export const MovieDetail: React.FC<MovieDetailProps> = ({ route, onBack }) => {
  const { movieId } = route?.params || { movieId: 0 };
  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [imdbRating, setImdbRating] = useState<string | null>(null);
  const [imdbVotes, setImdbVotes] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerPlaying, setTrailerPlaying] = useState(false);

  // Log / Rate state
  const [isWatched, setIsWatched] = useState(false);
  const [existingEntry, setExistingEntry] = useState<WatchedMovie | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState('');
  const [rewatch, setRewatch] = useState(false);
  const [noSpoilers, setNoSpoilers] = useState(false);
  const [watchedDate, setWatchedDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

  useEffect(() => {
    loadData();
  }, [movieId]);

  const [loadError, setLoadError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    if (movieId) {
      const data = await tmdbService.getMovieDetails(movieId);
      setMovie(data);

      if (data) {
        const [watchlist, favStatus, watchedEntry] = await Promise.all([
          StorageProvider.getWatchlist(),
          StorageProvider.isMovieFavorite(movieId),
          StorageProvider.isMovieWatched(movieId),
        ]);
        setIsInWatchlist(!!watchlist.find(item => item.seriesId === movieId));
        setIsFavorite(favStatus);
        setIsWatched(!!watchedEntry);
        setExistingEntry(watchedEntry);

        // Fetch IMDb rating
        if (data.imdb_id) {
          const imdb = await tmdbService.getIMDbRating(data.imdb_id);
          if (imdb) {
            setImdbRating(imdb.imdbRating);
            setImdbVotes(imdb.imdbVotes);
          }
        }

        // Fetch trailer
        tmdbService.getMovieTrailer(movieId).then(key => {
          if (key) setTrailerKey(key);
        });
      } else {
        setLoadError(true);
      }
    }
    setLoading(false);
  };

  const toggleWatchlist = async () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      await StorageProvider.removeFromWatchlist(movieId);
      setIsInWatchlist(false);
    } else {
      await StorageProvider.addToWatchlist({
        seriesId: movieId,
        name: movie.title,
        posterPath: movie.poster_path,
        addedDate: new Date().toISOString(),
        itemType: 'movie',
      });
      setIsInWatchlist(true);
    }
  };

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const toggleFavorite = async () => {
    if (!movie) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newState = !isFavorite;
    await StorageProvider.toggleFavoriteMovie(movieId, newState, newState ? {
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      addedDate: new Date().toISOString(),
    } : undefined);
    setIsFavorite(newState);
  };

  const openLogModal = () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (existingEntry) {
      setRating(existingEntry.rating);
      setLiked(existingEntry.liked ?? false);
      setReview(existingEntry.review ?? '');
      setTags(existingEntry.tags?.join(', ') ?? '');
      setRewatch(existingEntry.rewatch ?? false);
      setNoSpoilers(existingEntry.noSpoilers ?? false);
      setWatchedDate(new Date(existingEntry.watchedDate));
    } else {
      setRating(0);
      setLiked(false);
      setReview('');
      setTags('');
      setRewatch(false);
      setNoSpoilers(false);
      setWatchedDate(new Date());
    }
    setRatingModalVisible(true);
  };

  const handleConfirmLog = async () => {
    if (!movie) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const parsedTags = tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    const watchedMovie: WatchedMovie = {
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      rating,
      watchedDate: watchedDate.toISOString(),
      runtime: movie.runtime,
      releaseDate: movie.release_date,
      genres: movie.genres.map(g => g.name),
      overview: movie.overview,
      liked,
      review: review.trim() || undefined,
      tags: parsedTags,
      rewatch,
      noSpoilers,
    };

    if (existingEntry) {
      // Remove old entry and add updated one
      await StorageProvider.removeFromWatchedMovies(movieId, existingEntry.watchedDate);
    }
    await StorageProvider.addToWatchedMovies(watchedMovie);

    setIsWatched(true);
    setExistingEntry(watchedMovie);
    setRatingModalVisible(false);
    setSnackbar({
      message: existingEntry ? `Updated ${movie.title}` : `Logged ${movie.title}`,
    });
  };

  const handleCloseLogModal = () => {
    setRating(0);
    setLiked(false);
    setReview('');
    setTags('');
    setRewatch(false);
    setNoSpoilers(false);
    setWatchedDate(new Date());
    setRatingModalVisible(false);
  };

  const formatLogDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

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
              <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </SafeAreaView>
        )}
        <View style={skelStyles.wrapper}>
          {/* Backdrop skeleton */}
          <Animated.View style={[skelStyles.backdrop, { opacity: shimmerOpacity }]} />
          {/* Content skeleton */}
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

  if (loadError || !movie) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.text.muted} />
          <Text style={styles.loadingText}>Failed to load movie</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        {onBack && (
          <SafeAreaView style={styles.backSafe}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
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
          source={{ uri: tmdbService.getImageUrl(movie.backdrop_path || movie.poster_path, 'w780') }}
          style={styles.backdrop}
        >
          <LinearGradient
            colors={['rgba(7,7,11,0.3)', 'rgba(7,7,11,0.6)', COLORS.background]}
            locations={[0, 0.6, 1]}
            style={styles.backdropGradient}
          />

          {onBack && (
            <SafeAreaView style={styles.backSafe}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="chevron-back" size={20} color={COLORS.text.primary} />
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
          {/* Title */}
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
            <Text style={styles.sectionLabel}>SYNOPSIS</Text>
            <Text style={styles.overview}>{movie.overview || 'No overview available.'}</Text>
          </View>

          {/* Trailer */}
          {trailerKey && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TRAILER</Text>
              {trailerPlaying ? (
                <View style={styles.trailerContainer}>
                  <YoutubePlayer
                    height={Dimensions.get('window').width * 0.52}
                    videoId={trailerKey}
                    play={true}
                    webViewProps={{ allowsInlineMediaPlayback: true }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.trailerContainer}
                  onPress={() => setTrailerPlaying(true)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg` }}
                    style={styles.trailerThumbnail}
                  />
                  <View style={styles.trailerPlayOverlay}>
                    <View style={styles.trailerPlayButton}>
                      <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Log / Rate Modal — same design as TV episode modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseLogModal}
      >
        <View style={logStyles.overlay}>
          <View style={logStyles.container}>
            {/* Header */}
            <View style={logStyles.header}>
              <TouchableOpacity onPress={handleCloseLogModal} style={logStyles.headerBtn}>
                <Ionicons name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={logStyles.headerTitle}>I Watched</Text>
              <TouchableOpacity onPress={handleConfirmLog} style={logStyles.headerBtn}>
                <Ionicons name="checkmark" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={logStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Movie info */}
              {movie && (
                <View style={logStyles.movieInfo}>
                  {movie.poster_path ? (
                    <Image
                      source={{ uri: tmdbService.getImageUrl(movie.poster_path, 'w185') }}
                      style={logStyles.movieThumb}
                    />
                  ) : (
                    <View style={[logStyles.movieThumb, logStyles.thumbPlaceholder]}>
                      <Ionicons name="film-outline" size={20} color={COLORS.text.muted} />
                    </View>
                  )}
                  <View style={logStyles.movieText}>
                    <Text style={logStyles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                    <Text style={logStyles.movieSub} numberOfLines={1}>
                      {movie.release_date?.split('-')[0]} · {movie.runtime}m
                    </Text>
                  </View>
                </View>
              )}

              {/* Date */}
              <TouchableOpacity style={logStyles.row} onPress={() => setDatePickerVisible(true)} activeOpacity={0.7}>
                <Text style={logStyles.rowLabel}>Date</Text>
                <View style={logStyles.dateRight}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
                  <Text style={logStyles.dateText}>{formatLogDate(watchedDate)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
                </View>
              </TouchableOpacity>
              <View style={logStyles.separator} />

              <DatePickerModal
                visible={datePickerVisible}
                date={watchedDate}
                onConfirm={(d) => { setWatchedDate(d); setDatePickerVisible(false); }}
                onCancel={() => setDatePickerVisible(false)}
              />

              {/* Star rating + Like */}
              <View style={logStyles.ratingLikeRow}>
                <View style={logStyles.starsWrap}>
                  <SwipeableStars value={rating} onChange={setRating} />
                  <Text style={logStyles.starsLabel}>{rating > 0 ? 'Rated' : 'Rate'}</Text>
                </View>
                <TouchableOpacity
                  style={logStyles.likeWrap}
                  onPress={() => setLiked(!liked)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={36}
                    color={liked ? COLORS.coral : COLORS.text.muted}
                  />
                  <Text style={logStyles.likeLabel}>Like</Text>
                </TouchableOpacity>
              </View>
              <View style={logStyles.separator} />

              {/* Review */}
              <TextInput
                style={logStyles.reviewInput}
                placeholder="Add review..."
                placeholderTextColor={COLORS.text.muted}
                value={review}
                onChangeText={setReview}
                multiline
                textAlignVertical="top"
              />
              <View style={logStyles.separator} />

              {/* Tags */}
              <TextInput
                style={logStyles.tagsInput}
                placeholder="Add tags..."
                placeholderTextColor={COLORS.text.muted}
                value={tags}
                onChangeText={setTags}
              />
              <View style={logStyles.separator} />

              {/* Toggles */}
              <View style={logStyles.toggleRow}>
                <TouchableOpacity
                  style={logStyles.toggleItem}
                  onPress={() => setRewatch(!rewatch)}
                  activeOpacity={0.7}
                >
                  <View style={logStyles.toggleIconWrap}>
                    {rewatch && (
                      <View style={logStyles.toggleCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                      </View>
                    )}
                    <Ionicons name="eye-outline" size={28} color={rewatch ? COLORS.text.primary : COLORS.text.muted} />
                  </View>
                  <Text style={[logStyles.toggleLabel, rewatch && logStyles.toggleLabelActive]}>
                    {"I've seen this\nbefore"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={logStyles.toggleItem}
                  onPress={() => setNoSpoilers(!noSpoilers)}
                  activeOpacity={0.7}
                >
                  <View style={logStyles.toggleIconWrap}>
                    {noSpoilers && (
                      <View style={logStyles.toggleCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                      </View>
                    )}
                    <Ionicons name="shield-outline" size={28} color={noSpoilers ? COLORS.text.primary : COLORS.text.muted} />
                  </View>
                  <Text style={[logStyles.toggleLabel, noSpoilers && logStyles.toggleLabelActive]}>
                    No spoilers
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
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
    gap: SPACING.m,
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
    height: LAYOUT.window.height * 0.55,
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
  },
  backButton: {
    margin: SPACING.m,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(25,25,35,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  backdropRating: {
    position: 'absolute',
    bottom: SPACING.l,
    right: SPACING.m,
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
    fontSize: 26,
    lineHeight: 32,
    marginBottom: SPACING.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.m,
  },
  metaText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.text.muted,
  },
  statusText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.s,
  },
  logButtonWatched: {
    backgroundColor: 'rgba(45, 212, 168, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  logButtonText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  logButtonTextWatched: {
    color: COLORS.teal,
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
  trailerContainer: {
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    aspectRatio: 16 / 9,
  },
  trailerThumbnail: {
    width: '100%',
    height: '100%',
  },
  trailerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trailerPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(200, 165, 85, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ── Skeleton loader styles ──
const skelStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backdrop: {
    height: LAYOUT.window.height * 0.4,
    backgroundColor: COLORS.card,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.l,
    gap: SPACING.m,
  },
  titleLine: {
    height: 28,
    width: '70%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  subtitleLine: {
    height: 16,
    width: '45%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  metaRow: {
    flexDirection: 'row' as const,
    gap: SPACING.s,
  },
  metaChip: {
    height: 28,
    width: 72,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.round,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: SPACING.s,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.s,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.card,
  },
  textBlock: {
    height: 14,
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  textBlockShort: {
    height: 14,
    width: '65%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
});

// ── Log / Rate Modal styles (matches WatchedEpisodeModal) ──
const logStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    paddingTop: Platform.OS === 'android' ? 40 : 54,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.m,
  },
  movieInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    paddingVertical: SPACING.m,
  },
  movieThumb: {
    width: 50,
    height: 75,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieText: {
    flex: 1,
    gap: 2,
  },
  movieTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  movieSub: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.m,
  },
  rowLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
  },
  dateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  ratingLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.l,
  },
  starsWrap: {
    alignItems: 'flex-start',
    gap: 6,
  },
  starsLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  likeWrap: {
    alignItems: 'center',
    gap: 6,
  },
  likeLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  reviewInput: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: SPACING.m,
    minHeight: 100,
  },
  tagsInput: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: SPACING.m,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xl,
  },
  toggleItem: {
    alignItems: 'center',
    gap: 8,
  },
  toggleIconWrap: {
    position: 'relative',
  },
  toggleCheck: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 1,
  },
  toggleLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: COLORS.text.secondary,
  },
});
