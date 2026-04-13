import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutAnimation } from 'react-native';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { useAppStore } from '../store/appStore';

export const useDiscoveryData = () => {
  const queryClient = useQueryClient();
  const currentlyWatching = useAppStore(s => s.currentlyWatching);
  const [refreshing, setRefreshing] = useState(false);

  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ['trending', 'tv'],
    queryFn: async () => {
      if (useAppStore.getState().isOffline) {
        return await StorageProvider.getTrendingCache();
      }
      const data = await tmdbService.getTrending();
      if (data.length > 0) StorageProvider.setTrendingCache(data);
      return data;
    },
  });

  const { data: trendingMovies = [], isLoading: loadingMovies } = useQuery({
    queryKey: ['trending', 'movies'],
    queryFn: async () => {
      if (useAppStore.getState().isOffline) {
        return await StorageProvider.getTrendingMovieCache();
      }
      const data = await tmdbService.getTrendingMovies();
      if (data.length > 0) StorageProvider.setTrendingMovieCache(data);
      return data;
    },
  });

  const { data: topRated = [], isLoading: loadingTopRated } = useQuery({
    queryKey: ['topRated', 'movies'],
    queryFn: async () => {
      if (useAppStore.getState().isOffline) {
        return await StorageProvider.getTopRatedMovieCache();
      }
      const data = await tmdbService.getTopRatedMovies();
      if (data.length > 0) StorageProvider.setTopRatedMovieCache(data);
      return data;
    },
  });

  const loading = loadingTrending || loadingMovies || loadingTopRated;

  const loadTrending = useCallback(async (bustCache = false) => {
    if (bustCache) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trending', 'tv'] }),
        queryClient.invalidateQueries({ queryKey: ['trending', 'movies'] }),
        queryClient.invalidateQueries({ queryKey: ['topRated', 'movies'] })
      ]);
    }
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['trending', 'tv'] }),
      queryClient.refetchQueries({ queryKey: ['trending', 'movies'] }),
      queryClient.refetchQueries({ queryKey: ['topRated', 'movies'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Triggers LayoutAnimation when data finishes loading initially
  if (!loading) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

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
