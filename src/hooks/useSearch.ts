import { useState, useRef, useCallback, useEffect } from 'react';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { useAppStore } from '../store/appStore';
import { SearchResult } from '../types';
import { CONFIG } from '../constants/config';

export const useSearch = () => {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const isOffline = useAppStore(s => s.isOffline);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchError, setSearchError] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreResults, setGenreResults] = useState<SearchResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genrePage, setGenrePage] = useState(1);
  const [genreHasMore, setGenreHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const performSearch = useCallback(async (text: string) => {
    if (isOffline) {
      setSearchError(true);
      return;
    }
    const seq = ++searchSeq.current;
    if (text.length > CONFIG.LIMITS.MIN_SEARCH_LENGTH) {
      setSearching(true);
      setSearchError(false);
      try {
        const { results: searchResults, hasNextPage } = await tmdbService.search(text, 1);
        if (!isMounted.current) return;
        if (seq !== searchSeq.current) return;
        const filtered = searchResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
        setResults(filtered);
        setSearchPage(1);
        setSearchHasMore(hasNextPage);
      } catch (err) {
        if (!isMounted.current || seq !== searchSeq.current) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (isMounted.current && seq === searchSeq.current) {
          setSearching(false);
        }
      }
    } else if (text.length === 0) {
      setResults([]);
      setSearchHasMore(false);
      setSearching(false);
      setSearchError(false);
    }
  }, [isOffline]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (text.length > CONFIG.LIMITS.MIN_SEARCH_LENGTH) {
      setSearching(true);
    } else {
      setSearching(false);
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, CONFIG.TIMING.DEBOUNCE_DELAY);
  }, [performSearch]);

  const loadMoreSearchResults = useCallback(async () => {
    if (isOffline || !searchHasMore || isLoadingMore || query.length <= CONFIG.LIMITS.MIN_SEARCH_LENGTH) return;
    setIsLoadingMore(true);
    const nextPage = searchPage + 1;
    try {
      const { results: newResults, hasNextPage } = await tmdbService.search(query, nextPage);
      if (!isMounted.current) return;
      const filtered = newResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
      setResults(prev => [...prev, ...filtered]);
      setSearchPage(nextPage);
      setSearchHasMore(hasNextPage);
    } catch (error) {
      console.error('loadMoreSearchResults error:', error);
    } finally {
      if (isMounted.current) setIsLoadingMore(false);
    }
  }, [searchHasMore, isLoadingMore, query, searchPage]);

  const clearSearch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    setResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearching(false);
    setSearchActive(false);
    setSearchError(false);
  }, []);

  const loadSearchHistory = useCallback(async () => {
    const history = await StorageProvider.getSearchHistory();
    if (isMounted.current) {
      setSearchHistory(history);
    }
  }, []);

  useEffect(() => {
    if (searchActive) {
      loadSearchHistory();
    }
  }, [searchActive, loadSearchHistory]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleGenreSelect = useCallback(async (genreId: number) => {
    if (isOffline) return;
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
      setGenreResults([]);
      setGenreHasMore(false);
      return;
    }
    setSelectedGenre(genreId);
    setGenreLoading(true);
    const { results: data, hasNextPage } = await tmdbService.discoverByGenre(genreId, 1);
    if (!isMounted.current) return;
    setGenreResults(data);
    setGenrePage(1);
    setGenreHasMore(hasNextPage);
    setGenreLoading(false);
  }, [selectedGenre]);

  const loadMoreGenreResults = useCallback(async () => {
    if (isOffline || !selectedGenre || !genreHasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = genrePage + 1;
    try {
      const { results: newResults, hasNextPage } = await tmdbService.discoverByGenre(selectedGenre, nextPage);
      if (!isMounted.current) return;
      setGenreResults(prev => [...prev, ...newResults]);
      setGenrePage(nextPage);
      setGenreHasMore(hasNextPage);
    } catch (error) {
      console.error('loadMoreGenreResults error:', error);
    } finally {
      if (isMounted.current) setIsLoadingMore(false);
    }
  }, [selectedGenre, genreHasMore, isLoadingMore, genrePage]);

  const removeHistoryItem = useCallback(async (item: SearchResult) => {
    await StorageProvider.removeSearchHistoryItem(item.id, item.media_type);
    const newHistory = await StorageProvider.getSearchHistory();
    if (!isMounted.current) return;
    setSearchHistory(newHistory);
  }, []);

  const clearAllHistory = useCallback(async () => {
    await StorageProvider.clearSearchHistory();
    if (!isMounted.current) return;
    setSearchHistory([]);
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isOffline) return;
    setRefreshing(true);
    tmdbService.clearCache();
    if (selectedGenre) {
      const { results: data, hasNextPage } = await tmdbService.discoverByGenre(selectedGenre, 1);
      if (!isMounted.current) return;
      setGenreResults(data);
      setGenrePage(1);
      setGenreHasMore(hasNextPage);
    } else if (query.length > CONFIG.LIMITS.MIN_SEARCH_LENGTH) {
      await performSearch(query);
      if (!isMounted.current) return;
    }
    if (!isMounted.current) return;
    setRefreshing(false);
  }, [isOffline, selectedGenre, query, performSearch]);

  return {
    query,
    results,
    searchActive,
    setSearchActive,
    searching,
    searchError,
    refreshing,
    searchHistory,
    selectedGenre,
    genreResults,
    genreLoading,
    genreHasMore,
    isLoadingMore,
    isOffline,
    handleSearch,
    loadMoreSearchResults,
    clearSearch,
    handleRefresh,
    handleGenreSelect,
    loadMoreGenreResults,
    removeHistoryItem,
    clearAllHistory,
  };
};
