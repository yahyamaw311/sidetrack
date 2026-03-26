import { useState, useCallback } from 'react';
import { LayoutAnimation } from 'react-native';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SearchResult, CurrentlyWatchingItem } from '../types';

export const useDiscoveryData = () => {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([]);
  const [topRated, setTopRated] = useState<SearchResult[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<CurrentlyWatchingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    const nextCw = await StorageProvider.getCurrentlyWatching();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentlyWatching(nextCw);
    setLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrending(true);
    setRefreshing(false);
  }, [loadTrending]);

  const refreshCW = useCallback(async () => {
    const nextCw = await StorageProvider.getCurrentlyWatching();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentlyWatching(nextCw);
  }, []);

  return {
    trending,
    trendingMovies,
    topRated,
    currentlyWatching,
    setCurrentlyWatching,
    loading,
    refreshing,
    loadTrending,
    handleRefresh,
    refreshCW,
  };
};
