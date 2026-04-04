import { useState, useCallback, useMemo, useEffect } from 'react';
import { LayoutAnimation } from 'react-native';
import { useAppStore } from '../store/appStore';
import { WatchedEpisode } from '../types';

export type TVDrillLevel = 'shows' | 'episodes';

export interface ShowGroup {
  seriesId: number;
  seriesName: string;
  posterPath?: string | null;
  episodes: WatchedEpisode[];
  seasons: number[];
  latestDate: string;
}

export type UnifiedItem =
  | { type: 'movie'; data: import('../types').WatchedMovie; sortDate: string }
  | { type: 'show'; data: ShowGroup; sortDate: string };

export const useHistoryData = () => {
  // ── Store selectors (single source of truth) ──
  const movies = useAppStore(s => s.watchedMovies);
  const episodes = useAppStore(s => s.watchedEpisodes);
  const favoriteMovieIds = useAppStore(s => s.favoriteMovieIds);
  const favoriteEpisodeIds = useAppStore(s => s.favoriteEpisodeIds);
  const storeRemoveMovie = useAppStore(s => s.removeWatchedMovie);
  const storeRemoveEpisode = useAppStore(s => s.removeEpisode);
  const hydrate = useAppStore(s => s.hydrate);

  const [loading, setLoading] = useState(!useAppStore.getState().hydrated);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // TV drill-down state
  const [tvLevel, setTvLevel] = useState<TVDrillLevel>('shows');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  // Mark loading done once store is hydrated
  useEffect(() => {
    if (useAppStore.getState().hydrated) {
      setLoading(false);
      return;
    }
    const unsub = useAppStore.subscribe((s) => {
      if (s.hydrated) {
        setLoading(false);
        unsub();
      }
    });
    return unsub;
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    await hydrate();
    setLoading(false);
  }, [hydrate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hydrate();
    setRefreshing(false);
  }, [hydrate]);

  // Alias for backward compat (ProfileScreen uses this)
  const fetchAndSetHistoryData = handleRefresh;

  const handleRemoveMovie = async (movieId: number, watchedDate: string) => {
    await storeRemoveMovie(movieId, watchedDate);
  };

  const handleRemoveEpisode = async (episodeId: number) => {
    const epToRemove = episodes.find(e => e.episodeId === episodeId);
    if (!epToRemove) return;
    await storeRemoveEpisode(epToRemove.seriesId, episodeId);
  };

  const query = searchQuery.trim().toLowerCase();

  // Group episodes by show
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

  // Unified list: movies + show groups, sorted by most recent date
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

  // Selected show / season data for drill-down
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

  return {
    movies,
    episodes,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    favoriteMovieIds,
    favoriteEpisodeIds,
    tvLevel,
    setTvLevel,
    selectedShowId,
    setSelectedShowId,
    showGroups,
    unifiedItems,
    selectedShow,
    selectedShowEpisodes,
    handleRefresh,
    handleRemoveMovie,
    handleRemoveEpisode,
    drillIntoShow,
    drillBack,
    loadHistory,
    fetchAndSetHistoryData,
  };
};
