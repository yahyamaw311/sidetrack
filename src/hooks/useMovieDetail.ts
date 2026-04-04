import { useState, useCallback, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { DetailCache } from '../services/DetailCache';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppStore } from '../store/appStore';
import { MovieDetail as MovieDetailType, WatchedMovie } from '../types';
import { SnackbarConfig } from '../components/Snackbar';

export const useMovieDetail = (movieId: number) => {
  const { isOffline } = useNetwork();
  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [imdbRating, setImdbRating] = useState<string | null>(null);
  const [imdbVotes, setImdbVotes] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

  // ── Store selectors ──
  const watchlist = useAppStore(s => s.watchlist);
  const favoriteMovieIds = useAppStore(s => s.favoriteMovieIds);
  const watchedMovies = useAppStore(s => s.watchedMovies);
  const storeAddWatchedMovie = useAppStore(s => s.addWatchedMovie);
  const storeUpdateWatchedMovie = useAppStore(s => s.updateWatchedMovie);
  const storeToggleFavorite = useAppStore(s => s.toggleFavoriteMovie);
  const storeAddToWatchlist = useAppStore(s => s.addToWatchlist);
  const storeRemoveFromWatchlist = useAppStore(s => s.removeFromWatchlist);

  // ── Derived state from store ──
  const isFavorite = useMemo(() => favoriteMovieIds.has(movieId), [favoriteMovieIds, movieId]);
  const isInWatchlist = useMemo(
    () => watchlist.some(item => item.seriesId === movieId && item.itemType === 'movie'),
    [watchlist, movieId]
  );
  const existingEntry = useMemo(
    () => watchedMovies.find(m => m.movieId === movieId) ?? null,
    [watchedMovies, movieId]
  );
  const isWatched = existingEntry !== null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    if (movieId) {
      let data = await tmdbService.getMovieDetails(movieId);

      // If network failed, try offline cache
      if (!data) {
        const cached = await DetailCache.getCachedMovieDetail(movieId);
        if (cached) data = cached;
      }

      // Cache fresh data for offline use
      if (data) {
        DetailCache.cacheMovieDetail(movieId, data);
      }

      setMovie(data);

      if (data) {
        // Fetch IMDb rating (non-critical, skip if offline)
        if (!isOffline && data.imdb_id) {
          const imdb = await tmdbService.getIMDbRating(data.imdb_id);
          if (imdb) {
            setImdbRating(imdb.imdbRating);
            setImdbVotes(imdb.imdbVotes);
          }
        }

        // Fetch trailer (non-critical, skip if offline)
        if (!isOffline) {
          tmdbService.getMovieTrailer(movieId).then(key => {
            if (key) setTrailerKey(key);
          });
        }
      } else {
        setLoadError(true);
      }
    }
    setLoading(false);
  }, [movieId, isOffline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleWatchlist = async () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      await storeRemoveFromWatchlist(movieId, 'movie');
    } else {
      await storeAddToWatchlist({
        seriesId: movieId,
        name: movie.title,
        posterPath: movie.poster_path,
        addedDate: new Date().toISOString(),
        itemType: 'movie',
      });
    }
  };

  const toggleFavorite = async () => {
    if (!movie) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newState = !isFavorite;
    await storeToggleFavorite(movieId, newState, newState ? {
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      addedDate: new Date().toISOString(),
    } : undefined);
  };

  const openLogModal = () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRatingModalVisible(true);
  };

  const handleConfirmLog = async (data: {
    rating: number;
    liked: boolean;
    review: string;
    tags: string;
    rewatch: boolean;
    noSpoilers: boolean;
    watchedDate: Date;
  }) => {
    if (!movie) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const parsedTags = data.tags.trim() ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    const watchedMovie: WatchedMovie = {
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      rating: data.rating,
      watchedDate: data.watchedDate.toISOString(),
      runtime: movie.runtime,
      releaseDate: movie.release_date,
      genres: movie.genres.map(g => g.name),
      overview: movie.overview,
      liked: data.liked,
      review: data.review.trim() || undefined,
      tags: parsedTags,
      rewatch: data.rewatch,
      noSpoilers: data.noSpoilers,
    };

    if (existingEntry) {
      await storeUpdateWatchedMovie(watchedMovie, existingEntry.watchedDate);
    } else {
      await storeAddWatchedMovie(watchedMovie);
    }

    setRatingModalVisible(false);
    setSnackbar({
      message: existingEntry ? `Updated ${movie.title}` : `Logged ${movie.title}`,
    });
  };

  return {
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
  };
};
