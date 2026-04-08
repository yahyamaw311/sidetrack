import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { LayoutAnimation } from 'react-native';
import { useAppStore } from '../store/appStore';
import { tmdbService } from '../services/tmdbService';
import { WatchedEpisode } from '../types';

export type TVDrillLevel = 'shows' | 'episodes';
export type HistorySortBy = 'date' | 'rating' | 'title';
export type HistoryMediaType = 'all' | 'movie' | 'show';

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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Pagination state
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<HistorySortBy>('date');
  const [filterMediaType, setFilterMediaType] = useState<HistoryMediaType>('all');
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

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
    if (!isMounted.current) return;
    setLoading(false);
  }, [hydrate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    tmdbService.clearCache();
    await hydrate();
    if (!isMounted.current) return;
    setPage(1);
    setRefreshing(false);
  }, [hydrate]);

  // Alias for backward compat (ProfileScreen uses this)
  const fetchAndSetHistoryData = handleRefresh;

  const handleRemoveMovie = async (movieId: number, watchedDate: string) => {
    const key = `movie_${movieId}_${watchedDate}`;
    setDeletingIds(prev => new Set(prev).add(key));
    try {
      await storeRemoveMovie(movieId, watchedDate);
    } finally {
      if (isMounted.current) {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
  };

  const handleRemoveEpisode = async (episodeId: number) => {
    const epToRemove = episodes.find(e => e.episodeId === episodeId);
    if (!epToRemove) return;
    const key = `episode_${episodeId}`;
    setDeletingIds(prev => new Set(prev).add(key));
    try {
      await storeRemoveEpisode(epToRemove.seriesId, episodeId);
    } finally {
      if (isMounted.current) {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
  };

  const query = searchQuery.trim().toLowerCase();

  // Reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, showFavoritesOnly, filterMediaType, filterGenre, sortBy]);

  // Group episodes by show
  const showGroups: ShowGroup[] = useMemo(() => {
    const grouped: Record<number, ShowGroup> = {};
    let episodesToGroup = showFavoritesOnly
      ? episodes.filter(ep => favoriteEpisodeIds.has(ep.episodeId))
      : episodes;

    // Apply Genre Filter to episodes
    if (filterGenre) {
      episodesToGroup = episodesToGroup.filter(ep => ep.genres?.includes(filterGenre));
    }

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
  }, [episodes, showFavoritesOnly, favoriteEpisodeIds, filterGenre]);

  // Available Genres
  const allAvailableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach(m => m.genres?.forEach(g => genreSet.add(g)));
    episodes.forEach(e => e.genres?.forEach(g => genreSet.add(g)));
    return Array.from(genreSet).sort();
  }, [movies, episodes]);

  // Unified list: movies + show groups, sorted and filtered
  const unifiedItems: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];

    // Filter and add movies
    if (filterMediaType === 'all' || filterMediaType === 'movie') {
      for (const m of movies) {
        if (query && !m.title.toLowerCase().includes(query)) continue;
        if (showFavoritesOnly && !favoriteMovieIds.has(m.movieId)) continue;
        if (filterGenre && !m.genres?.includes(filterGenre)) continue;
        items.push({ type: 'movie', data: m, sortDate: m.watchedDate });
      }
    }

    // Add show groups
    if (filterMediaType === 'all' || filterMediaType === 'show') {
      for (const g of showGroups) {
        if (query && !g.seriesName.toLowerCase().includes(query)) continue;
        // Genre filter is already applied to showGroups because it affects which episodes are inside
        items.push({ type: 'show', data: g, sortDate: g.latestDate });
      }
    }

    // Apply Sorting
    return items.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      }
      if (sortBy === 'rating') {
        const getRating = (item: UnifiedItem) => {
          if (item.type === 'movie') return item.data.rating !== null ? item.data.rating : -1;
          const ratedEps = item.data.episodes.filter(ep => ep.rating !== null);
          return ratedEps.length > 0 ? ratedEps.reduce((s, e) => s + (e.rating || 0), 0) / ratedEps.length : -1;
        };
        return getRating(b) - getRating(a);
      }
      if (sortBy === 'title') {
        const getTitle = (item: UnifiedItem) => item.type === 'movie' ? item.data.title : item.data.seriesName;
        return getTitle(a).localeCompare(getTitle(b));
      }
      return 0;
    });
  }, [movies, showGroups, query, showFavoritesOnly, favoriteMovieIds, filterMediaType, filterGenre, sortBy]);

  // Paginate items
  const paginatedItems = useMemo(() => {
    return unifiedItems.slice(0, page * PAGE_SIZE);
  }, [unifiedItems, page]);

  const loadMore = useCallback(() => {
    if (page * PAGE_SIZE < unifiedItems.length) {
      setPage(p => p + 1);
    }
  }, [page, unifiedItems.length]);

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
    unifiedItems: paginatedItems,
    hasMore: page * PAGE_SIZE < unifiedItems.length,
    loadMore,
    totalCount: unifiedItems.length,
    selectedShow,
    selectedShowEpisodes,
    handleRefresh,
    handleRemoveMovie,
    handleRemoveEpisode,
    drillIntoShow,
    drillBack,
    loadHistory,
    fetchAndSetHistoryData,
    deletingIds,
    sortBy,
    setSortBy,
    filterMediaType,
    setFilterMediaType,
    filterGenre,
    setFilterGenre,
    allAvailableGenres,
  };
};
