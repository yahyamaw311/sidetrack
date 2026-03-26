import { useState, useCallback, useMemo, useEffect } from 'react';
import { LayoutAnimation } from 'react-native';
import { StorageProvider } from '../services/StorageProvider';
import { useDataEvent } from './useDataEvent';
import { WatchedMovie, WatchedEpisode } from '../types';

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
  | { type: 'movie'; data: WatchedMovie; sortDate: string }
  | { type: 'show'; data: ShowGroup; sortDate: string };

export const useHistoryData = () => {
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [episodes, setEpisodes] = useState<WatchedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites filter state
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());
  const [favoriteEpisodeIds, setFavoriteEpisodeIds] = useState<Set<number>>(new Set());

  // TV drill-down state
  const [tvLevel, setTvLevel] = useState<TVDrillLevel>('shows');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  // Single source of truth for fetching & setting history data
  const fetchAndSetHistoryData = useCallback(async () => {
    const [movieData, episodeData, favMovies, favEpisodeIdList] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
      StorageProvider.getAllFavoriteMovies(),
      StorageProvider.getAllFavorites(),
    ]);
    setMovies(movieData);
    setEpisodes(episodeData);
    setFavoriteMovieIds(new Set(favMovies.map((m: any) => m.movieId)));
    setFavoriteEpisodeIds(new Set(favEpisodeIdList));
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    await fetchAndSetHistoryData();
    setLoading(false);
  }, [fetchAndSetHistoryData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAndSetHistoryData();
    setRefreshing(false);
  }, [fetchAndSetHistoryData]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useDataEvent('watchedMovies', fetchAndSetHistoryData);
  useDataEvent('watchedEpisodes', fetchAndSetHistoryData);
  useDataEvent('favorites', fetchAndSetHistoryData);

  const handleRemoveMovie = async (movieId: number, watchedDate: string) => {
    // Optimistic removal
    const prevMovies = movies;
    setMovies(prev => prev.filter(m => !(m.movieId === movieId && m.watchedDate === watchedDate)));
    try {
      await StorageProvider.removeFromWatchedMovies(movieId, watchedDate);
    } catch {
      setMovies(prevMovies);
    }
  };

  const handleRemoveEpisode = async (episodeId: number) => {
    // Find the episode to get its seriesId for partitioning
    const epToRemove = episodes.find(e => e.episodeId === episodeId);
    if (!epToRemove) return;

    // Optimistic removal
    const prevEpisodes = episodes;
    setEpisodes(prev => prev.filter(e => e.episodeId !== episodeId));
    try {
      await StorageProvider.removeWatchedEpisode(epToRemove.seriesId, episodeId);
    } catch {
      setEpisodes(prevEpisodes);
    }
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
