import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchedEpisode, QueuedItem, WatchedMovie, FavoriteMovie, CurrentlyWatchingItem, SearchResult } from '../types';
import { notifyErrorGlobal } from '../contexts/ErrorNotifier';

import { storageMutex } from './Mutex';
import { CONFIG } from '../constants/config';

const STORAGE_KEYS = {
  WATCHED: '@sidetrack_watched',
  FAVORITES: '@sidetrack_favorites',
  WATCHLIST: '@sidetrack_watchlist',
  WATCHED_MOVIES: '@sidetrack_watched_movies',
  FAVORITE_MOVIES: '@sidetrack_favorite_movies',
  CURRENTLY_WATCHING: '@sidetrack_currently_watching',
  SEARCH_HISTORY: '@sidetrack_search_history',
  ONBOARDING_COMPLETE: '@sidetrack_onboarding_complete',
  WATCHED_V2_PREFIX: '@sidetrack_watched_v2:',
  PARTITION_MIGRATED: '@sidetrack_partition_migrated',
};

// --- Helper to get parsed JSON ---
const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue == null) return defaultValue;
    try {
      return JSON.parse(jsonValue);
    } catch (parseError) {
      // JSON is corrupted — backup the corrupted string before returning default
      console.error(`Corrupted data in ${key}`, parseError);
      const backupKey = `@corrupted_${key}_${Date.now()}`;
      await AsyncStorage.setItem(backupKey, jsonValue).catch(() => { });

      notifyErrorGlobal(`Data corruption detected in ${key}. A backup was created.`, 'storage');

      // We return defaultValue but ideally the UI should prevent saving over this
      // until the user confirms. For now, we at least have a backup.
      return defaultValue;
    }
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    notifyErrorGlobal(`Could not read your saved data`, 'storage');
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
    notifyErrorGlobal(`Could not save — your change may be lost`, 'storage');
    throw e; // Re-throw so optimistic-update callers can roll back
  }
};

const withMutex = async <T>(task: () => Promise<T>): Promise<T> => {
  return storageMutex.runExclusive(task);
};

// --- Migration ---
const migrateToPartitionedStorage = async () => {
  const isMigrated = await AsyncStorage.getItem(STORAGE_KEYS.PARTITION_MIGRATED);
  if (isMigrated === 'true') return;

  console.log('[Storage] Starting migration to partitioned storage...');
  try {
    const legacyData = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    const items = Object.values(legacyData);
    if (items.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEYS.PARTITION_MIGRATED, 'true');
      return;
    }

    // Group by seriesId
    const groups: Record<number, WatchedEpisode[]> = {};
    for (const item of items) {
      if (!groups[item.seriesId]) groups[item.seriesId] = [];
      groups[item.seriesId].push(item);
    }

    // Multi-set the new partitions
    const pairs: [string, string][] = Object.entries(groups).map(([seriesId, eps]) => [
      `${STORAGE_KEYS.WATCHED_V2_PREFIX}${seriesId}`,
      JSON.stringify(eps)
    ]);

    await AsyncStorage.multiSet(pairs);
    await AsyncStorage.setItem(STORAGE_KEYS.PARTITION_MIGRATED, 'true');
    console.log(`[Storage] Migrated ${items.length} episodes into ${pairs.length} series partitions.`);

    // Optional: Only clear old data after ensuring stability
    // await AsyncStorage.removeItem(STORAGE_KEYS.WATCHED);
  } catch (e) {
    console.error('[Storage] Migration Error:', e);
    notifyErrorGlobal('Failed to optimize storage. Please restart the app.', 'storage');
  }
};

export const StorageProvider = {
  migrateToPartitionedStorage,
  // --- Watched Status & Ratings ---

  getWatchedEpisode: async (episodeId: number): Promise<WatchedEpisode | null> => {
    const watched = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    return watched[episodeId] || null;
  },

  getAllWatchedEpisodes: async (): Promise<WatchedEpisode[]> => {
    // We want to combine all partitions and the legacy data
    const allKeys = await AsyncStorage.getAllKeys();
    const partitionKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.WATCHED_V2_PREFIX));

    const legacy = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    const partitions = await AsyncStorage.multiGet(partitionKeys);

    const allEpisodes: WatchedEpisode[] = [...Object.values(legacy)];
    for (const [, val] of partitions) {
      if (val) allEpisodes.push(...JSON.parse(val));
    }

    return allEpisodes.sort((a, b) =>
      new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
    );
  },

  getWatchedEpisodesForShow: async (seriesId: number): Promise<WatchedEpisode[]> => {
    // Check legacy first (in case migration hasn't run or is partial)
    const legacy = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
    const legacyForShow = Object.values(legacy).filter(w => w.seriesId === seriesId);

    // Check partition
    const partition = await getData<WatchedEpisode[]>(`${STORAGE_KEYS.WATCHED_V2_PREFIX}${seriesId}`, []);

    return [...legacyForShow, ...partition];
  },

  markEpisodeAsWatched: async (episode: WatchedEpisode) => {
    return withMutex(async () => {
      const key = `${STORAGE_KEYS.WATCHED_V2_PREFIX}${episode.seriesId}`;
      const watched = await getData<WatchedEpisode[]>(key, []);

      // Update if already exists, else push
      const idx = watched.findIndex(e => e.episodeId === episode.episodeId);
      if (idx > -1) {
        watched[idx] = episode;
      } else {
        watched.push(episode);
      }

      await setData(key, watched);

    });
  },

  removeWatchedEpisode: async (seriesId: number, episodeId: number) => {
    return withMutex(async () => {
      // Check partition first
      const key = `${STORAGE_KEYS.WATCHED_V2_PREFIX}${seriesId}`;
      const watched = await getData<WatchedEpisode[]>(key, []);
      const filtered = watched.filter(e => e.episodeId !== episodeId);

      if (watched.length !== filtered.length) {
        await setData(key, filtered);
      } else {
        // Check legacy as fallback
        const legacy = await getData<Record<number, WatchedEpisode>>(STORAGE_KEYS.WATCHED, {});
        if (legacy[episodeId]) {
          delete legacy[episodeId];
          await setData(STORAGE_KEYS.WATCHED, legacy);
        }
      }
    });
  },

  // --- Favorites (Episodes) ---

  toggleFavoriteEpisode: async (episodeId: number, isFavorite: boolean) => {
    return withMutex(async () => {
      const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
      if (isFavorite) {
        favorites[episodeId] = true;
      } else {
        delete favorites[episodeId];
      }
      await setData(STORAGE_KEYS.FAVORITES, favorites);

    });
  },

  isEpisodeFavorite: async (episodeId: number): Promise<boolean> => {
    const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
    return !!favorites[episodeId];
  },

  getAllFavorites: async (): Promise<number[]> => {
    const favorites = await getData<Record<number, boolean>>(STORAGE_KEYS.FAVORITES, {});
    return Object.keys(favorites).map(Number);
  },

  // --- Watchlist (Series & Movies) ---

  // Helper to prevent collision between TVs and Movies with identical TMDB IDs
  _migrateWatchlist: async (): Promise<Record<string, QueuedItem>> => {
    // This is called from within mutex-locked functions, or we can just not lock it and let callers lock
    const raw = await getData<any>(STORAGE_KEYS.WATCHLIST, {});
    let dirty = false;
    const migrated: Record<string, QueuedItem> = {};
    for (const [k, v] of Object.entries<any>(raw)) {
      if (!k.includes('_')) {
        const type = v.itemType || 'tv';
        v.itemType = type;
        migrated[`${type}_${v.seriesId}`] = v;
        dirty = true;
      } else {
        migrated[k] = v;
      }
    }
    if (dirty) {
      await setData(STORAGE_KEYS.WATCHLIST, migrated);
    }
    return migrated;
  },

  addToWatchlist: async (item: QueuedItem) => {
    return withMutex(async () => {
      const watchlist = await StorageProvider._migrateWatchlist();
      watchlist[`${item.itemType}_${item.seriesId}`] = item;
      await setData(STORAGE_KEYS.WATCHLIST, watchlist);

    });
  },

  removeFromWatchlist: async (seriesId: number, itemType: 'tv' | 'movie' = 'tv') => {
    return withMutex(async () => {
      const watchlist = await StorageProvider._migrateWatchlist();
      delete watchlist[`${itemType}_${seriesId}`];
      await setData(STORAGE_KEYS.WATCHLIST, watchlist);
    });
  },

  getWatchlist: async (): Promise<QueuedItem[]> => {
    return withMutex(async () => {
      const watchlist = await StorageProvider._migrateWatchlist();
      return Object.values(watchlist).sort((a, b) =>
        new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
      );
    });
  },

  // --- Watched Movies (History) ---

  addToWatchedMovies: async (movie: WatchedMovie) => {
    return withMutex(async () => {
      const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
      // Use movieId + timestamp as key to allow multiple logs (rewatches)
      const key = `${movie.movieId}_${movie.watchedDate}`;
      watched[key] = movie;
      await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);

    });
  },

  updateWatchedMovieRating: async (movieId: number, newRating: number, watchedDate: string) => {
    return withMutex(async () => {
      const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
      const key = Object.keys(watched).find(k => watched[k].movieId === movieId && watched[k].watchedDate === watchedDate);
      if (key) {
        watched[key].rating = newRating;
        await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);

      }
    });
  },

  removeFromWatchedMovies: async (movieId: number, watchedDate?: string) => {
    return withMutex(async () => {
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
    });
  },

  updateWatchedMovie: async (newMovie: WatchedMovie, oldWatchedDate: string) => {
    return withMutex(async () => {
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

    });
  },

  getWatchedMovies: async (): Promise<WatchedMovie[]> => {
    return withMutex(async () => {
      const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
      let dirty = false;
      for (const key in watched) {
        if (watched[key].rating > 5) {
          watched[key].rating = watched[key].rating / 2;
          dirty = true;
        }
      }
      if (dirty) await setData(STORAGE_KEYS.WATCHED_MOVIES, watched);

      return Object.values(watched).sort((a, b) =>
        new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
      );
    });
  },

  isMovieWatched: async (movieId: number): Promise<WatchedMovie | null> => {
    const watched = await getData<Record<string, WatchedMovie>>(STORAGE_KEYS.WATCHED_MOVIES, {});
    const entry = Object.values(watched).find(m => m.movieId === movieId);
    return entry || null;
  },

  // --- Favorite Movies ---

  toggleFavoriteMovie: async (movieId: number, isFavorite: boolean, movieInfo?: FavoriteMovie) => {
    return withMutex(async () => {
      const favorites = await getData<Record<number, FavoriteMovie>>(STORAGE_KEYS.FAVORITE_MOVIES, {});
      if (isFavorite && movieInfo) {
        favorites[movieId] = movieInfo;
      } else {
        delete favorites[movieId];
      }
      await setData(STORAGE_KEYS.FAVORITE_MOVIES, favorites);

    });
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
    return withMutex(async () => {
      const list = await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
      // Remove if already exists, then add to front
      const filtered = list.filter(i => i.seriesId !== item.seriesId);
      filtered.unshift({ ...item, lastUpdated: new Date().toISOString() });
      await setData(STORAGE_KEYS.CURRENTLY_WATCHING, filtered);

    });
  },

  removeFromCurrentlyWatching: async (seriesId: number) => {
    return withMutex(async () => {
      const list = await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
      await setData(STORAGE_KEYS.CURRENTLY_WATCHING, list.filter(i => i.seriesId !== seriesId));

    });
  },

  getCurrentlyWatching: async (): Promise<CurrentlyWatchingItem[]> => {
    return await getData<CurrentlyWatchingItem[]>(STORAGE_KEYS.CURRENTLY_WATCHING, []);
  },

  /** Check if all episodes of a show have been watched */
  isShowFullyWatched: async (seriesId: number, totalEpisodesBySeasons: Record<number, number>): Promise<boolean> => {
    const watchedForShow = await StorageProvider.getWatchedEpisodesForShow(seriesId);

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
    return withMutex(async () => {
      const history = await getData<SearchResult[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
      // Remove duplicate by id+media_type
      const filtered = history.filter(h => !(h.id === item.id && h.media_type === item.media_type));
      filtered.unshift(item);
      await setData(STORAGE_KEYS.SEARCH_HISTORY, filtered.slice(0, CONFIG.LIMITS.SEARCH_HISTORY_LIMIT));
    });
  },

  removeSearchHistoryItem: async (id: number, mediaType: string) => {
    return withMutex(async () => {
      const history = await getData<SearchResult[]>(STORAGE_KEYS.SEARCH_HISTORY, []);
      await setData(STORAGE_KEYS.SEARCH_HISTORY, history.filter(h => !(h.id === id && h.media_type === mediaType)));
    });
  },

  clearSearchHistory: async () => {
    return withMutex(async () => {
      await setData(STORAGE_KEYS.SEARCH_HISTORY, []);
    });
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
};
