import { create } from 'zustand';
import { StorageProvider } from '../services/StorageProvider';
import { notifyErrorGlobal } from '../contexts/ErrorNotifier';
import {
  WatchedMovie,
  WatchedEpisode,
  QueuedItem,
  FavoriteMovie,
  CurrentlyWatchingItem,
} from '../types';

/**
 * Inserts an item into a sorted array using binary search to find the correct index.
 * Sorting is descending by date (newest first).
 */
function binaryDateInsert<T extends { watchedDate: string }>(array: T[], item: T): T[] {
  const itemTime = new Date(item.watchedDate).getTime();
  let low = 0;
  let high = array.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    const midTime = new Date(array[mid].watchedDate).getTime();
    if (midTime > itemTime) low = mid + 1;
    else high = mid;
  }

  const next = [...array];
  next.splice(low, 0, item);
  return next;
}

interface AppState {
  // ── Data slices ──────────────────────────────────────────────
  watchedMovies: WatchedMovie[];
  watchedEpisodes: WatchedEpisode[];
  watchlist: QueuedItem[];
  favoriteMovieIds: Set<number>;
  favoriteEpisodeIds: Set<number>;
  currentlyWatching: CurrentlyWatchingItem[];

  // ── Lifecycle ───────────────────────────────────────────────
  hydrated: boolean;
  hydrate: () => Promise<void>;
  consentGiven: boolean | null;
  setConsentGiven: (given: boolean) => Promise<void>;
  tmdbApiKey: string | null;
  setTmdbApiKey: (key: string) => Promise<void>;

  // ── Watched Movies ──────────────────────────────────────────
  addWatchedMovie: (movie: WatchedMovie) => Promise<void>;
  updateWatchedMovie: (movie: WatchedMovie, oldDate: string) => Promise<void>;
  removeWatchedMovie: (movieId: number, watchedDate: string) => Promise<void>;

  // ── Watched Episodes ────────────────────────────────────────
  markEpisodeWatched: (episode: WatchedEpisode) => Promise<void>;
  removeEpisode: (seriesId: number, episodeId: number) => Promise<void>;

  // ── Favorites ───────────────────────────────────────────────
  toggleFavoriteMovie: (movieId: number, isFavorite: boolean, movieInfo?: FavoriteMovie) => Promise<void>;
  toggleFavoriteEpisode: (episodeId: number, isFavorite: boolean) => Promise<void>;

  // ── Watchlist ───────────────────────────────────────────────
  addToWatchlist: (item: QueuedItem) => Promise<void>;
  removeFromWatchlist: (itemId: number, itemType: 'tv' | 'movie') => Promise<void>;

  // ── Currently Watching ──────────────────────────────────────
  addToCurrentlyWatching: (item: CurrentlyWatchingItem) => Promise<void>;
  removeFromCurrentlyWatching: (seriesId: number) => Promise<void>;

  // ── Network Status ──────────────────────────────────────────
  isOffline: boolean;
  setIsOffline: (isOffline: boolean) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  // ── Initial state ───────────────────────────────────────────
  watchedMovies: [],
  watchedEpisodes: [],
  watchlist: [],
  favoriteMovieIds: new Set<number>(),
  favoriteEpisodeIds: new Set<number>(),
  currentlyWatching: [],
  hydrated: false,
  consentGiven: null,
  tmdbApiKey: null,
  isOffline: false,

  setIsOffline: (isOffline: boolean) => set({ isOffline }),

  // ── Hydrate from AsyncStorage ───────────────────────────────
  hydrate: async () => {
    const [movies, episodes, watchlist, favMovies, favEpisodeIds, cw, consentGiven, apiKey] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
      StorageProvider.getWatchlist(),
      StorageProvider.getAllFavoriteMovies(),
      StorageProvider.getAllFavorites(),
      StorageProvider.getCurrentlyWatching(),
      StorageProvider.hasGivenConsent(),
      StorageProvider.getTmdbApiKey(),
    ]);
    set({
      watchedMovies: movies,
      watchedEpisodes: episodes,
      watchlist,
      favoriteMovieIds: new Set(favMovies.map((m: any) => m.movieId)),
      favoriteEpisodeIds: new Set(favEpisodeIds),
      currentlyWatching: cw,
      hydrated: true,
      consentGiven,
      tmdbApiKey: apiKey,
    });
  },

  setConsentGiven: async (given) => {
    set({ consentGiven: given });
    await StorageProvider.setConsentGiven(given);
  },

  setTmdbApiKey: async (key) => {
    set({ tmdbApiKey: key });
    await StorageProvider.setTmdbApiKey(key);
  },

  // ── Watched Movies ──────────────────────────────────────────
  addWatchedMovie: async (movie) => {
    // Optimistic: binary insertion instead of full sort
    set(s => ({
      watchedMovies: binaryDateInsert(s.watchedMovies, movie),
    }));
    try {
      await StorageProvider.addToWatchedMovies(movie);
    } catch {
      // Rollback on persist failure by re-hydrating this slice
      const fresh = await StorageProvider.getWatchedMovies();
      set({ watchedMovies: fresh });
      notifyErrorGlobal("Couldn't save movie — change reverted", 'storage');
    }
  },

  updateWatchedMovie: async (movie, oldDate) => {
    const prev = get().watchedMovies;
    set(s => ({
      watchedMovies: s.watchedMovies
        .map(m => (m.movieId === movie.movieId && m.watchedDate === oldDate) ? movie : m)
        .sort((a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()),
    }));
    try {
      await StorageProvider.updateWatchedMovie(movie, oldDate);
    } catch {
      set({ watchedMovies: prev });
      notifyErrorGlobal("Couldn't update movie — change reverted", 'storage');
    }
  },

  removeWatchedMovie: async (movieId, watchedDate) => {
    const prev = get().watchedMovies;
    set(s => ({
      watchedMovies: s.watchedMovies.filter(
        m => !(m.movieId === movieId && m.watchedDate === watchedDate)
      ),
    }));
    try {
      await StorageProvider.removeFromWatchedMovies(movieId, watchedDate);
    } catch {
      set({ watchedMovies: prev });
      notifyErrorGlobal("Couldn't remove movie — change reverted", 'storage');
    }
  },

  // ── Watched Episodes ────────────────────────────────────────
  markEpisodeWatched: async (episode) => {
    set(s => {
      const exists = s.watchedEpisodes.some(e => e.episodeId === episode.episodeId);
      if (exists) {
        // Remove the old entry then binary-insert the updated one at its correct sorted position
        const without = s.watchedEpisodes.filter(e => e.episodeId !== episode.episodeId);
        return { watchedEpisodes: binaryDateInsert(without, episode) };
      }
      return {
        watchedEpisodes: binaryDateInsert(s.watchedEpisodes, episode),
      };
    });
    try {
      await StorageProvider.markEpisodeAsWatched(episode);
    } catch {
      const fresh = await StorageProvider.getAllWatchedEpisodes();
      set({ watchedEpisodes: fresh });
      notifyErrorGlobal("Couldn't save episode — change reverted", 'storage');
    }
  },

  removeEpisode: async (seriesId, episodeId) => {
    const prev = get().watchedEpisodes;
    set(s => ({
      watchedEpisodes: s.watchedEpisodes.filter(e => e.episodeId !== episodeId),
    }));
    try {
      await StorageProvider.removeWatchedEpisode(seriesId, episodeId);
    } catch {
      set({ watchedEpisodes: prev });
      notifyErrorGlobal("Couldn't remove episode — change reverted", 'storage');
    }
  },

  // ── Favorites ───────────────────────────────────────────────
  toggleFavoriteMovie: async (movieId, isFavorite, movieInfo) => {
    set(s => {
      const next = new Set(s.favoriteMovieIds);
      if (isFavorite) next.add(movieId);
      else next.delete(movieId);
      return { favoriteMovieIds: next };
    });
    try {
      await StorageProvider.toggleFavoriteMovie(movieId, isFavorite, movieInfo);
    } catch {
      // Rollback
      set(s => {
        const next = new Set(s.favoriteMovieIds);
        if (isFavorite) next.delete(movieId);
        else next.add(movieId);
        return { favoriteMovieIds: next };
      });
      notifyErrorGlobal("Couldn't update favorite — change reverted", 'storage');
    }
  },

  toggleFavoriteEpisode: async (episodeId, isFavorite) => {
    set(s => {
      const next = new Set(s.favoriteEpisodeIds);
      if (isFavorite) next.add(episodeId);
      else next.delete(episodeId);
      return { favoriteEpisodeIds: next };
    });
    try {
      await StorageProvider.toggleFavoriteEpisode(episodeId, isFavorite);
    } catch {
      set(s => {
        const next = new Set(s.favoriteEpisodeIds);
        if (isFavorite) next.delete(episodeId);
        else next.add(episodeId);
        return { favoriteEpisodeIds: next };
      });
      notifyErrorGlobal("Couldn't update favorite — change reverted", 'storage');
    }
  },

  // ── Watchlist ───────────────────────────────────────────────
  addToWatchlist: async (item) => {
    set(s => ({
      watchlist: [item, ...s.watchlist.filter(
        w => !(w.itemId === item.itemId && w.itemType === item.itemType)
      )],
    }));
    try {
      await StorageProvider.addToWatchlist(item);
    } catch {
      const fresh = await StorageProvider.getWatchlist();
      set({ watchlist: fresh });
      notifyErrorGlobal("Couldn't update watchlist — change reverted", 'storage');
    }
  },

  removeFromWatchlist: async (itemId, itemType) => {
    const prev = get().watchlist;
    set(s => ({
      watchlist: s.watchlist.filter(
        w => !(w.itemId === itemId && w.itemType === itemType)
      ),
    }));
    try {
      await StorageProvider.removeFromWatchlist(itemId, itemType);
    } catch {
      set({ watchlist: prev });
      notifyErrorGlobal("Couldn't update watchlist — change reverted", 'storage');
    }
  },

  // ── Currently Watching ──────────────────────────────────────
  addToCurrentlyWatching: async (item) => {
    set(s => ({
      currentlyWatching: [
        { ...item, lastUpdated: new Date().toISOString() },
        ...s.currentlyWatching.filter(i => i.seriesId !== item.seriesId),
      ],
    }));
    try {
      await StorageProvider.addToCurrentlyWatching(item);
    } catch {
      const fresh = await StorageProvider.getCurrentlyWatching();
      set({ currentlyWatching: fresh });
      notifyErrorGlobal("Couldn't update currently watching — change reverted", 'storage');
    }
  },

  removeFromCurrentlyWatching: async (seriesId) => {
    const prev = get().currentlyWatching;
    set(s => ({
      currentlyWatching: s.currentlyWatching.filter(i => i.seriesId !== seriesId),
    }));
    try {
      await StorageProvider.removeFromCurrentlyWatching(seriesId);
    } catch {
      set({ currentlyWatching: prev });
      notifyErrorGlobal("Couldn't update currently watching — change reverted", 'storage');
    }
  },
}));
