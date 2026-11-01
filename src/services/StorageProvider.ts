import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchedEpisode, QueuedItem, WatchedMovie, FavoriteMovie, CurrentlyWatchingItem, SearchResult } from '../types';

const STORAGE_KEYS = {
  WATCHED: '@sidetrack_watched',
  FAVORITES: '@sidetrack_favorites',
  WATCHLIST: '@sidetrack_watchlist',
  WATCHED_MOVIES: '@sidetrack_watched_movies',
  FAVORITE_MOVIES: '@sidetrack_favorite_movies',
  CURRENTLY_WATCHING: '@sidetrack_currently_watching',
  SEARCH_HISTORY: '@sidetrack_search_history',
  CONSENT_GIVEN: '@sidetrack_consent_given',
  TMDB_API_KEY: '@sidetrack_tmdb_api_key',
  ONBOARDING_COMPLETE: '@sidetrack_onboarding_complete',
  TRENDING_TV: '@cache_trending_tv',
  TRENDING_MOVIE: '@cache_trending_movie',
  TOP_RATED_MOVIE: '@cache_top_rated_movie',
};

// --- Helper to get parsed JSON ---
const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return defaultValue;
  }
};

// --- Helper to set JSON ---
const setData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

export const StorageProvider = {
  // --- Migration (no-op, data already in partitioned format) ---
  migrateToPartitionedStorage: async () => {},

  // --- Watched Status & Ratings ---

  markEpisodeAsWatched: async (episode: WatchedEpisode) => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    watched[episode.episodeId] = episode;
    await setData(STORAGE_KEYS.WATCHED, watched);
  },

  getWatchedEpisode: async (episodeId: number): Promise<WatchedEpisode | null> => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    return watched[episodeId] || null;
  },

  getAllWatchedEpisodes: async (): Promise<WatchedEpisode[]> => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    return Object.values(watched).sort((a, b) =>
      new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
    );
  },

  getWatchedEpisodesForShow: async (seriesId: number): Promise<WatchedEpisode[]> => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    return Object.values(watched).filter(w => w.seriesId === seriesId);
  },

  removeWatchedEpisode: async (seriesIdOrEpisodeId: number, maybeEpisodeId?: number) => {
    const episodeId = maybeEpisodeId !== undefined ? maybeEpisodeId : seriesIdOrEpisodeId;
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    delete watched[episodeId];
    await setData(STORAGE_KEYS.WATCHED, watched);
  },

  // --- Favorites (Episodes) ---

  toggleFavoriteEpisode: async (episodeId: number, isFavorite: boolean) => {
    const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
    if (isFavorite) {
      favorites[episodeId] = true;
    } else {
      delete favorites[episodeId];
    }
    await setData(STORAGE_KEYS.FAVORITES, favorites);
  },

  isEpisodeFavorite: async (episodeId: number): Promise<boolean> => {
    const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
    return !!favorites[episodeId];
  },

  getAllFavorites: async (): Promise<number[]> => {
    const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
    return Object.keys(favorites).map(Number);
  },

  // --- Watchlist ---

  addToWatchlist: async (item: QueuedItem) => {
    const watchlist = await getData<Record<string, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    const key = `${item.itemId}_${item.itemType}`;
    watchlist[key] = item;
    await setData(STORAGE_KEYS.WATCHLIST, watchlist);
  },

  removeFromWatchlist: async (itemId: number, itemType: 'tv' | 'movie') => {
    const watchlist = await getData<Record<string, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    const key = `${itemId}_${itemType}`;
    delete watchlist[key];
    await setData(STORAGE_KEYS.WATCHLIST, watchlist);
  },

  getWatchlist: async (): Promise<QueuedItem[]> => {
    const watchlist = await getData<Record<string, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    return Object.values(watchlist).sort((a, b) =>
      new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
    );
  },

  // --- Watched Movies (History) ---

  addToWatchedMovies: async (movie: WatchedMovie) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    // Use movieId + timestamp as key to allow multiple logs (rewatches)
    const key = `${movie.movieId}_${movie.watchedDate}`;
    watched[key] = movie;
    await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);
  },

  updateWatchedMovieRating: async (movieId: number, newRating: number, watchedDate?: string) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    const key = Object.keys(watched).find(k => {
      if (watched[k].movieId !== movieId) return false;
      if (watchedDate && watched[k].watchedDate !== watchedDate) return false;
      return true;
    });
    if (key) {
      watched[key].rating = newRating;
      await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);
    }
  },

  removeFromWatchedMovies: async (movieId: number, watchedDate?: string) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    // Find the matching entry (by movieId + optional watchedDate for precision)
    const keyToDelete = Object.keys(watched).find(key => {
      const entry = watched[key];
      if (entry.movieId !== movieId) return false;
      if (watchedDate && entry.watchedDate !== watchedDate) return false;
      return true;
    });
    if (keyToDelete) {
      delete watched[keyToDelete];
      await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);
    }
  },

  updateWatchedMovie: async (newMovie: WatchedMovie, oldWatchedDate: string) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    // find old key
    const keyToDelete = Object.keys(watched).find(key => {
      const entry = watched[key];
      return entry.movieId === newMovie.movieId && entry.watchedDate === oldWatchedDate;
    });
    if (keyToDelete) {
      delete watched[keyToDelete];
    }
    const newKey = `${newMovie.movieId}_${newMovie.watchedDate}`;
    watched[newKey] = newMovie;
    await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);
  },

  getWatchedMovies: async (): Promise<WatchedMovie[]> => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    let dirty = false;
    for (const key in watched) {
      if (watched[key].rating !== null && watched[key].rating !== undefined && watched[key].rating > 5) {
        watched[key].rating = watched[key].rating / 2;
        dirty = true;
      }
    }
    if (dirty) await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);

    return Object.values(watched).sort((a, b) =>
      new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
    );
  },

  isMovieWatched: async (movieId: number): Promise<WatchedMovie | null> => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    const entry = Object.values(watched).find(m => m.movieId === movieId);
    return entry || null;
  },

  // --- Favorite Movies ---

  toggleFavoriteMovie: async (movieId: number, isFavorite: boolean, movieInfo?: FavoriteMovie) => {
    const favorites = await getData<Record<number, FavoriteMovie>>(STORAGE_KEYS.FAVORITE_MOVIES, {});
    if (isFavorite && movieInfo) {
      favorites[movieId] = movieInfo;
    } else {
      delete favorites[movieId];
    }
    await setData(STORAGE_KEYS.FAVORITE_MOVIES, favorites);
  },

  isMovieFavorite: async (movieId: number): Promise<boolean> => {
    const favorites = await getData<Record<number, FavoriteMovie>>(STORAGE_KEYS.FAVORITE_MOVIES, {});
    return !!favorites[movieId];
  },

  getAllFavoriteMovies: async (): Promise<FavoriteMovie[]> => {
    const favorites = await getData<Record<number, FavoriteMovie>>(STORAGE_KEYS.FAVORITE_MOVIES, {});
    return Object.values(favorites);
  },

  // --- Currently Watching ---

  addToCurrentlyWatching: async (item: CurrentlyWatchingItem) => {
    const list = await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
    // Remove if already exists, then add to front
    const filtered = list.filter(i => i.seriesId !== item.seriesId);
    filtered.unshift({ ...item, lastUpdated: new Date().toISOString() });
    await setData(STORAGE_KEYS.CURRENTLY_WATCHING, filtered);
  },

  removeFromCurrentlyWatching: async (seriesId: number) => {
    const list = await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
    await setData(STORAGE_KEYS.CURRENTLY_WATCHING, list.filter(i => i.seriesId !== seriesId));
  },

  getCurrentlyWatching: async (): Promise<CurrentlyWatchingItem[]> => {
    return await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
  },

  /** Check if all episodes of a show have been watched */
  isShowFullyWatched: async (seriesId: number, totalEpisodesBySeasons: Record<number, number>): Promise<boolean> => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    const watchedForShow = Object.values(watched).filter(w => w.seriesId === seriesId);
    // Count total expected episodes (skip season 0 / specials)
    let totalExpected = 0;
    for (const [season, count] of Object.entries(totalEpisodesBySeasons)) {
      if (Number(season) > 0) totalExpected += count;
    }
    // Count unique watched episodes
    const watchedIds = new Set(watchedForShow.map(w => w.episodeId));
    return watchedIds.size >= totalExpected;
  },

  // --- Search History (recently tapped items) ---
  getSearchHistory: async (): Promise<SearchResult[]> => {
    return await getData<SearchResult[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
  },

  addSearchHistoryItem: async (item: SearchResult) => {
    const MAX_ITEMS = 10;
    const history = await getData<SearchResult[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
    // Remove duplicate by id+media_type
    const filtered = history.filter(h => !(h.id === item.id && h.media_type === item.media_type));
    filtered.unshift(item);
    await setData(STORAGE_KEYS.SEARCH_HISTORY, filtered.slice(0, MAX_ITEMS));
  },

  removeSearchHistoryItem: async (id: number, mediaType: string) => {
    const history = await getData<SearchResult[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
    await setData(STORAGE_KEYS.SEARCH_HISTORY, history.filter(h => !(h.id === id && h.media_type === mediaType)));
  },

  clearSearchHistory: async () => {
    await setData(STORAGE_KEYS.SEARCH_HISTORY, []);
  },

  // --- Consent & API Key ---
  hasGivenConsent: async (): Promise<boolean | null> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.CONSENT_GIVEN);
      return value != null ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  setConsentGiven: async (given: boolean) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CONSENT_GIVEN, JSON.stringify(given));
  },

  getTmdbApiKey: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TMDB_API_KEY);
    } catch {
      return null;
    }
  },

  setTmdbApiKey: async (key: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TMDB_API_KEY, key);
  },

  // --- Onboarding ---
  hasCompletedOnboarding: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      return value === 'true';
    } catch {
      return false;
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (e) {
      console.error('Error saving onboarding flag', e);
    }
  },

  // --- Discovery Caching (Offline) ---
  getTrendingCache: async (): Promise<SearchResult[]> => {
    return await getData<SearchResult[]>(STORAGE_KEYS.TRENDING_TV, []);
  },

  setTrendingCache: async (data: SearchResult[]) => {
    await setData(STORAGE_KEYS.TRENDING_TV, data);
  },

  getTrendingMovieCache: async (): Promise<SearchResult[]> => {
    return await getData<SearchResult[]>(STORAGE_KEYS.TRENDING_MOVIE, []);
  },

  setTrendingMovieCache: async (data: SearchResult[]) => {
    await setData(STORAGE_KEYS.TRENDING_MOVIE, data);
  },

  getTopRatedMovieCache: async (): Promise<SearchResult[]> => {
    return await getData<SearchResult[]>(STORAGE_KEYS.TOP_RATED_MOVIE, []);
  },

  setTopRatedMovieCache: async (data: SearchResult[]) => {
    await setData(STORAGE_KEYS.TOP_RATED_MOVIE, data);
  },
};
