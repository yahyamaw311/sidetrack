import { useState, useCallback, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { DetailCache } from '../services/DetailCache';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppStore } from '../store/appStore';
import { Episode, TVShowDetail, WatchedEpisode } from '../types';
import { SnackbarConfig } from '../components/Snackbar';

export const useEpisodeDetail = (tvId: number, initialSeason: number, initialEpisode: number) => {
  const { isOffline } = useNetwork();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [show, setShow] = useState<TVShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [imdbRating, setImdbRating] = useState<string | null>(null);
  const [imdbVotes, setImdbVotes] = useState<string | null>(null);
  const [showImdbRating, setShowImdbRating] = useState<string | null>(null);
  const [showImdbVotes, setShowImdbVotes] = useState<string | null>(null);

  const [watchedModalVisible, setWatchedModalVisible] = useState(false);
  const [watchedEpisode, setWatchedEpisode] = useState<Episode | null>(null);
  const [editInitialData, setEditInitialData] = useState<{
    rating?: number; liked?: boolean; review?: string; tags?: string;
    rewatch?: boolean; noSpoilers?: boolean; watchedDate?: Date;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

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

  // ── Derived state from store ──
  const isInWatchlist = useMemo(
    () => watchlist.some(item => item.seriesId === tvId && (item.itemType || 'tv') === 'tv'),
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

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setLoadError(false);

    // Attempt network fetch
    let [seasonData, showData] = await Promise.all([
      tmdbService.getSeasonDetails(tvId, initialSeason),
      tmdbService.getTVShowDetails(tvId)
    ]);

    // If network failed, try the offline cache
    if (!showData) {
      const cached = await DetailCache.getCachedTVShowDetail(tvId);
      if (cached) showData = cached;
    }
    if (!seasonData) {
      const cached = await DetailCache.getCachedSeasonDetail(tvId, initialSeason);
      if (cached) seasonData = cached;
    }

    // Write fresh data to offline cache for next time
    if (showData) {
      DetailCache.cacheTVShowDetail(tvId, showData);
    }
    if (seasonData) {
      DetailCache.cacheSeasonDetail(tvId, initialSeason, seasonData);
    }

    if (showData) {
      setShow(showData);

      // Fetch show-level IMDb rating (non-critical, skip if offline)
      if (!isOffline) {
        const showImdbId = showData.external_ids?.imdb_id;
        if (showImdbId) {
          const showRating = await tmdbService.getIMDbRating(showImdbId);
          if (showRating) {
            setShowImdbRating(showRating.imdbRating);
            setShowImdbVotes(showRating.imdbVotes);
          }
        }

        // Fetch trailer
        tmdbService.getTVTrailer(tvId).then((key: string | null) => {
          if (key) setTrailerKey(key);
        });
      }
    }

    if (seasonData) {
      const ep = seasonData.episodes.find((e: Episode) => e.episode_number === initialEpisode);
      setEpisode(ep || null);

      if (ep) {
        // Fetch episode-specific IMDb rating (non-critical, skip if offline)
        if (!isOffline) {
          const omdb = await tmdbService.getIMDbEpisodeRating(tvId, ep.season_number, ep.episode_number);
          if (omdb) {
            setImdbRating(omdb.imdbRating);
            setImdbVotes(omdb.imdbVotes);
          }
        }
      }
    }
    if (!showData && !seasonData) {
      setLoadError(true);
    }
    if (!isRefresh) setLoading(false);
  }, [tvId, initialSeason, initialEpisode, isOffline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      genres: show.genres?.map((g: any) => g.name),
    };

    await storeMarkEpisodeWatched(entry);

    // Auto-add to Currently Watching
    await storeAddToCurrentlyWatching({
      seriesId: tvId,
      name: show?.name || '',
      posterPath: show?.poster_path || null,
      lastUpdated: new Date().toISOString(),
    });

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
      if (fullyWatched) {
        await storeRemoveFromCurrentlyWatching(tvId);
      }
    }

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
    setEpisode(ep);

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
      await storeRemoveFromWatchlist(tvId, 'tv');
    } else {
      await storeAddToWatchlist({
        seriesId: tvId,
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

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
