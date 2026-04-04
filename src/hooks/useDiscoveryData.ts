import { useState, useCallback } from 'react';
import { LayoutAnimation } from 'react-native';
import { tmdbService } from '../services/tmdbService';
import { useAppStore } from '../store/appStore';
import { SearchResult } from '../types';

export const useDiscoveryData = () => {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([]);
  const [topRated, setTopRated] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Currently watching comes from the store
  const currentlyWatching = useAppStore(s => s.currentlyWatching);

  const loadTrending = useCallback(async (bustCache = false) => {
    if (bustCache) {
      tmdbService.clearCache();
    }
    setLoading(true);
    const [tvData, movieData, topRatedData] = await Promise.all([
      tmdbService.getTrending(),
      tmdbService.getTrendingMovies(),
      tmdbService.getTopRatedMovies(),
    ]);
    setTrending(tvData);
    setTrendingMovies(movieData);
    setTopRated(topRatedData);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrending(true);
    setRefreshing(false);
  }, [loadTrending]);

  return {
    trending,
    trendingMovies,
    topRated,
    currentlyWatching,
    loading,
    refreshing,
    loadTrending,
    handleRefresh,
  };
};
