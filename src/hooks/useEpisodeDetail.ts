import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { DetailCache } from '../services/DetailCache';
import { useAppStore } from '../store/appStore';
import { Episode, WatchedEpisode } from '../types';
import { SnackbarConfig } from '../components/Snackbar';

export const useEpisodeDetail = (tvId: number, initialSeason?: number, initialEpisode?: number) => {
  const queryClient = useQueryClient();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const [watchedModalVisible, setWatchedModalVisible] = useState(false);
  const [watchedEpisode, setWatchedEpisode] = useState<Episode | null>(null);
  const [editInitialData, setEditInitialData] = useState<{
    rating?: number | null; liked?: boolean; review?: string; tags?: string;
    rewatch?: boolean; noSpoilers?: boolean; watchedDate?: Date;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

  // ── Store selectors ──
  const watchlist = useAppStore(s => s.watchlist);
  const favoriteEpisodeIds = useAppStore(s => s.favoriteEpisodeIds);
  const storeEpisodes = useAppStore(s => s.watchedEpisodes);
  const storeMarkEpisodeWatched = useAppStore(s => s.markEpisodeWatched);
  const storeToggleFavoriteEpisode = useAppStore(s => s.toggleFavoriteEpisode);
  const storeAddToWatchlist = useAppStore(s => s.addToWatchlist);
  const storeRemoveFromWatchlist = useAppStore(s => s.removeFromWatchlist);
  const storeAddToCurrentlyWatching = useAppStore(s => s.addToCurrentlyWatching);
  const storeRemoveFromCurrentlyWatching = useAppStore(s => s.removeFromCurrentlyWatching);

  // React Query Logic
  const { data: show, isLoading: showLoading, error: showError } = useQuery({
    queryKey: ['tv', tvId],
    queryFn: async () => {
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getTVShowDetails(tvId);
      }
      if (!data) data = await DetailCache.getCachedTVShowDetail(tvId);
      else DetailCache.cacheTVShowDetail(tvId, data);
      
      if (!data) throw new Error('Show not found');
      return data;
    },
    enabled: !!tvId,
  });

  const { data: episodeData, isLoading: episodeLoading } = useQuery({
    queryKey: ['tv', tvId, 'season', selectedSeason, 'episode', selectedEpisode],
    queryFn: async () => {
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getEpisodeDetails(tvId, selectedSeason!, selectedEpisode!);
      }
      if (!data) data = await DetailCache.getCachedEpisodeDetail(tvId, selectedSeason!, selectedEpisode!);
      else DetailCache.cacheEpisodeDetail(tvId, selectedSeason!, selectedEpisode!, data);
      return data;
    },
    enabled: selectedSeason !== undefined && selectedEpisode !== undefined,
  });

  const { data: showImdb } = useQuery({
    queryKey: ['imdb', show?.external_ids?.imdb_id],
    queryFn: async () => {
      const imdbId = show!.external_ids!.imdb_id!;
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getIMDbRating(imdbId);
      }
      if (!data) data = await DetailCache.getCachedIMDbRating(imdbId);
      else DetailCache.cacheIMDbRating(imdbId, data);
      return data;
    },
    enabled: !!show?.external_ids?.imdb_id,
  });

  const { data: epImdb } = useQuery({
    queryKey: ['tv_ep_imdb', tvId, selectedSeason, selectedEpisode],
    queryFn: async () => {
      const imdbId = await tmdbService.getEpisodeImdbId(tvId, selectedSeason!, selectedEpisode!);
      if (!imdbId) return null;
      
      let data = null;
      if (!useAppStore.getState().isOffline) {
        data = await tmdbService.getIMDbRating(imdbId);
      }
      if (!data) data = await DetailCache.getCachedIMDbRating(imdbId);
      else DetailCache.cacheIMDbRating(imdbId, data);
      return data;
    },
    enabled: selectedSeason !== undefined && selectedEpisode !== undefined,
  });

  const { data: trailerKey } = useQuery({
    queryKey: ['trailer', 'tv', tvId],
    queryFn: async () => {
      if (useAppStore.getState().isOffline) return null;
      return await tmdbService.getTVTrailer(tvId);
    },
    enabled: !!tvId && !useAppStore.getState().isOffline,
  });

  const loading = showLoading || episodeLoading;
  const loadError = !!showError;
  const episode = episodeData ?? null;
  const imdbRating = epImdb?.imdbRating ?? null;
  const imdbVotes = epImdb?.imdbVotes ?? null;
  const showImdbRating = showImdb?.imdbRating ?? null;
  const showImdbVotes = showImdb?.imdbVotes ?? null;

  // ── Derived state from store ──
  const isInWatchlist = useMemo(
    () => watchlist.some(item => item.itemId === tvId && (item.itemType || 'tv') === 'tv'),
    [watchlist, tvId]
  );

  const isFavorite = useMemo(
    () => episode ? favoriteEpisodeIds.has(episode.id) : false,
    [favoriteEpisodeIds, episode]
  );

  const watchedEpisodeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const e of storeEpisodes) {
      if (e.seriesId === tvId) ids.add(e.episodeId);
    }
    return ids;
  }, [storeEpisodes, tvId]);

  const loadData = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['tv', tvId] });
  }, [queryClient, tvId]);

  const openWatchedModal = useCallback((ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditInitialData(null);
    setWatchedEpisode(ep);
    setWatchedModalVisible(true);
  }, []);

  const openEditWatchedModal = useCallback(async (ep: Episode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existing = await StorageProvider.getWatchedEpisode(ep.id);
    if (existing) {
      setEditInitialData({
        rating: existing.rating,
        liked: existing.liked,
        review: existing.review ?? '',
        tags: existing.tags?.join(', ') ?? '',
        rewatch: existing.rewatch,
        noSpoilers: existing.noSpoilers,
        watchedDate: new Date(existing.watchedDate),
      });
    } else {
      setEditInitialData(null);
    }
    setWatchedEpisode(ep);
    setWatchedModalVisible(true);
  }, []);

  const handleConfirmWatched = async (data: {
    rating: number | null; liked: boolean; review: string; tags: string;
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
      genres: show.genres?.map((g: any) => g.name),
    };

    await storeMarkEpisodeWatched(entry);
    if (!isMounted.current) return;

    // Auto-add to Currently Watching
    await storeAddToCurrentlyWatching({
      seriesId: tvId,
      name: show?.name || '',
      posterPath: show?.poster_path || null,
      lastUpdated: new Date().toISOString(),
    });
    if (!isMounted.current) return;

    // Check if this was the last episode of the last season → auto-remove if fully watched
    const realSeasons = show.seasons.filter((s: any) => s.season_number > 0);
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
      if (!isMounted.current) return;
      if (fullyWatched) {
        await storeRemoveFromCurrentlyWatching(tvId);
      }
    }

    if (!isMounted.current) return;
    const isEdit = !!editInitialData;
    setWatchedModalVisible(false);
    setWatchedEpisode(null);
    setEditInitialData(null);
    setSnackbar({
      message: isEdit
        ? `Updated S${entry.seasonNumber}E${entry.episodeNumber}`
        : `Logged S${entry.seasonNumber}E${entry.episodeNumber}`,
    });
  };

  const selectEpisode = async (ep: Episode) => {
    setSelectedSeason(ep.season_number);
    setSelectedEpisode(ep.episode_number);
  };

  const toggleWatchlist = async () => {
    if (!show) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInWatchlist) {
      await storeRemoveFromWatchlist(tvId, 'tv');
    } else {
      await storeAddToWatchlist({
        itemId: tvId,
        name: show.name,
        posterPath: show.poster_path,
        addedDate: new Date().toISOString(),
        itemType: 'tv',
      });
    }
  };

  const toggleFavorite = async () => {
    if (episode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newState = !isFavorite;
      await storeToggleFavoriteEpisode(episode.id, newState);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['tv', tvId] });
    setRefreshing(false);
  }, [queryClient, tvId]);

  return {
    episode,
    show,
    isFavorite,
    isInWatchlist,
    loading,
    refreshing,
    loadError,
    imdbRating,
    imdbVotes,
    showImdbRating,
    showImdbVotes,
    watchedModalVisible,
    setWatchedModalVisible,
    watchedEpisode,
    setWatchedEpisode,
    watchedEpisodeIds,
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
  };
};
