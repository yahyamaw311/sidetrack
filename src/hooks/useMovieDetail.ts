import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { DetailCache } from '../services/DetailCache';
import { useNetwork } from '../contexts/NetworkContext';
import { MovieDetail as MovieDetailType, WatchedMovie } from '../types';
import { SnackbarConfig } from '../components/Snackbar';

export const useMovieDetail = (movieId: number) => {
  const { isOffline } = useNetwork();
  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

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
        const [watchlist, favStatus, watchedEntry] = await Promise.all([
          StorageProvider.getWatchlist(),
          StorageProvider.isMovieFavorite(movieId),
          StorageProvider.isMovieWatched(movieId),
        ]);
        setIsInWatchlist(!!watchlist.find((item: any) => item.seriesId === movieId && item.itemType === 'movie'));
        setIsFavorite(favStatus);
        setIsWatched(!!watchedEntry);
        setExistingEntry(watchedEntry);

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
    const prev = isInWatchlist;
    // Optimistic update
    setIsInWatchlist(!prev);
    try {
      if (prev) {
        await StorageProvider.removeFromWatchlist(movieId, 'movie');
      } else {
        await StorageProvider.addToWatchlist({
          seriesId: movieId,
          name: movie.title,
          posterPath: movie.poster_path,
          addedDate: new Date().toISOString(),
          itemType: 'movie',
        });
      }
    } catch {
      // Rollback on failure
      setIsInWatchlist(prev);
    }
  };

  const toggleFavorite = async () => {
    if (!movie) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newState = !isFavorite;
    // Optimistic update
    setIsFavorite(newState);
    try {
      await StorageProvider.toggleFavoriteMovie(movieId, newState, newState ? {
        movieId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        addedDate: new Date().toISOString(),
      } : undefined);
    } catch {
      // Rollback on failure
      setIsFavorite(!newState);
    }
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
      await StorageProvider.updateWatchedMovie(watchedMovie, existingEntry.watchedDate);
    } else {
      await StorageProvider.addToWatchedMovies(watchedMovie);
    }

    setIsWatched(true);
    setExistingEntry(watchedMovie);
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
