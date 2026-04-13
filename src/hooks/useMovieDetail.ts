import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { DetailCache } from '../services/DetailCache';
import { useAppStore } from '../store/appStore';
import { WatchedMovie } from '../types';
import { SnackbarConfig } from '../components/Snackbar';

export const useMovieDetail = (movieId: number) => {
  const queryClient = useQueryClient();
  
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [refreshing, setRefreshing] = useState(false);
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
    () => watchlist.some(item => item.itemId === movieId && item.itemType === 'movie'),
    [watchlist, movieId]
  );
  const existingEntry = useMemo(
    () => watchedMovies.find(m => m.movieId === movieId) ?? null,
    [watchedMovies, movieId]
  );
  const isWatched = existingEntry !== null;

  // React Query Fetching
  const { data: movie, isLoading: loading, error } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: async () => {
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getMovieDetails(movieId);
      }
      if (!data) {
        data = await DetailCache.getCachedMovieDetail(movieId);
      } else {
        DetailCache.cacheMovieDetail(movieId, data);
      }
      if (!data) throw new Error('Failed to load movie');
      return data;
    },
    enabled: !!movieId,
  });

  const { data: imdbData } = useQuery({
    queryKey: ['imdb', movie?.imdb_id],
    queryFn: async () => {
      const imdbId = movie!.imdb_id!;
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getIMDbRating(imdbId);
      }
      if (!data) {
        data = await DetailCache.getCachedIMDbRating(imdbId);
      } else {
        DetailCache.cacheIMDbRating(imdbId, data);
      }
      return data;
    },
    enabled: !!movie?.imdb_id,
  });

  const { data: trailerKey } = useQuery({
    queryKey: ['trailer', movieId],
    queryFn: async () => {
      if (useAppStore.getState().isOffline) return null;
      return await tmdbService.getMovieTrailer(movieId);
    },
    enabled: !!movieId && !useAppStore.getState().isOffline,
  });

  const loadError = !!error;
  const imdbRating = imdbData?.imdbRating ?? null;
  const imdbVotes = imdbData?.imdbVotes ?? null;

  // For backward compatibility
  const loadData = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['movie', movieId] });
  }, [queryClient, movieId]);

  const toggleWatchlist = async () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      await storeRemoveFromWatchlist(movieId, 'movie');
    } else {
      await storeAddToWatchlist({
        itemId: movieId,
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
    rating: number | null;
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    tmdbService.clearCache();
    await loadData();
    if (!isMounted.current) return;
    setRefreshing(false);
  }, [loadData]);

  return {
    movie,
    loading,
    refreshing,
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
    handleRefresh,
    toggleWatchlist,
    toggleFavorite,
    openLogModal,
    handleConfirmLog,
  };
};
