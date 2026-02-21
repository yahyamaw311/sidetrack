import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchedEpisode, QueuedItem, WatchedMovie, FavoriteMovie } from '../types';

const STORAGE_KEYS = {
  WATCHED: '@sidetrack_watched',
  FAVORITES: '@sidetrack_favorites',
  WATCHLIST: '@sidetrack_watchlist',
  WATCHED_MOVIES: '@sidetrack_watched_movies',
  FAVORITE_MOVIES: '@sidetrack_favorite_movies',
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

  removeWatchedEpisode: async (episodeId: number) => {
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

  // --- Watchlist (Series) ---

  addToWatchlist: async (item: QueuedItem) => {
    const watchlist = await getData<Record<number, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    watchlist[item.seriesId] = item;
    await setData(STORAGE_KEYS.WATCHLIST, watchlist);
  },

  removeFromWatchlist: async (seriesId: number) => {
    const watchlist = await getData<Record<number, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    delete watchlist[seriesId];
    await setData(STORAGE_KEYS.WATCHLIST, watchlist);
  },

  getWatchlist: async (): Promise<QueuedItem[]> => {
    const watchlist = await getData<Record<number, QueuedItem>>(STORAGE_KEYS.WATCHLIST, {});
    return Object.values(watchlist).sort((a, b) => 
      new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
    );
  },

  // --- Watched Movies (History) ---

  addToWatchedMovies: async (movie: WatchedMovie) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    // Use movieId as key — only one entry per movie (no duplicate logs)
    const key = String(movie.movieId);
    watched[key] = movie;
    await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);
  },

  updateWatchedMovieRating: async (movieId: number, newRating: number) => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    const key = Object.keys(watched).find(k => watched[k].movieId === movieId);
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

  getWatchedMovies: async (): Promise<WatchedMovie[]> => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
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
};
