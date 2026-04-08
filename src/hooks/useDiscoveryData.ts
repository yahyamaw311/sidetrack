import { useState, useCallback, useRef, useEffect } from 'react';
import { LayoutAnimation } from 'react-native';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { useAppStore } from '../store/appStore';
import { SearchResult } from '../types';

export const useDiscoveryData = () => {
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([]);
  const [topRated, setTopRated] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Currently watching comes from the store
  const currentlyWatching = useAppStore(s => s.currentlyWatching);
  const isOffline = useAppStore(s => s.isOffline);

  const loadTrending = useCallback(async (bustCache = false) => {
    if (bustCache) {
      tmdbService.clearCache();
    }
    setLoading(true);

    if (isOffline) {
      const [cachedTv, cachedMovies, cachedTop] = await Promise.all([
        StorageProvider.getTrendingCache(),
        StorageProvider.getTrendingMovieCache(),
        StorageProvider.getTopRatedMovieCache(),
      ]);
      if (!isMounted.current) return;
      setTrending(cachedTv);
      setTrendingMovies(cachedMovies);
      setTopRated(cachedTop);
    } else {
      const [tvData, movieData, topRatedData] = await Promise.all([
        tmdbService.getTrending(),
        tmdbService.getTrendingMovies(),
        tmdbService.getTopRatedMovies(),
      ]);
      if (!isMounted.current) return;
      setTrending(tvData);
      setTrendingMovies(movieData);
      setTopRated(topRatedData);

      // Update offline cache
      if (tvData.length > 0) StorageProvider.setTrendingCache(tvData);
      if (movieData.length > 0) StorageProvider.setTrendingMovieCache(movieData);
      if (topRatedData.length > 0) StorageProvider.setTopRatedMovieCache(topRatedData);
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(false);
  }, [isOffline]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrending(true);
    if (!isMounted.current) return;
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
