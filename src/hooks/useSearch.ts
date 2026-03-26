import { useState, useRef, useCallback, useEffect } from 'react';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SearchResult } from '../types';
import { CONFIG } from '../constants/config';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [genreResults, setGenreResults] = useState<SearchResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  const performSearch = useCallback(async (text: string) => {
    const seq = ++searchSeq.current;
    if (text.length > CONFIG.LIMITS.MIN_SEARCH_LENGTH) {
      setSearching(true);
      const searchResults = await tmdbService.search(text);
      if (seq !== searchSeq.current) return;
      const filtered = searchResults.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
      setResults(filtered);
      setSearching(false);
    } else if (text.length === 0) {
      setResults([]);
      setSearching(false);
    }
  }, []);

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

  const clearSearch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQuery('');
    setResults([]);
    setSearching(false);
    setSearchActive(false);
  }, []);

  const loadSearchHistory = useCallback(async () => {
    const history = await StorageProvider.getSearchHistory();
    setSearchHistory(history);
  }, []);

  useEffect(() => {
    if (searchActive) {
      loadSearchHistory();
    }
  }, [searchActive, loadSearchHistory]);

  const handleGenreSelect = useCallback(async (genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
      setGenreResults([]);
      return;
    }
    setSelectedGenre(genreId);
    setGenreLoading(true);
    const data = await tmdbService.discoverByGenre(genreId);
    setGenreResults(data);
    setGenreLoading(false);
  }, [selectedGenre]);

  const removeHistoryItem = useCallback(async (item: SearchResult) => {
    await StorageProvider.removeSearchHistoryItem(item.id, item.media_type);
    setSearchHistory(await StorageProvider.getSearchHistory());
  }, []);

  const clearAllHistory = useCallback(async () => {
    await StorageProvider.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  return {
    query,
    results,
    searchActive,
    setSearchActive,
    searching,
    searchHistory,
    selectedGenre,
    genreResults,
    genreLoading,
    handleSearch,
    clearSearch,
    handleGenreSelect,
    removeHistoryItem,
    clearAllHistory,
  };
};
