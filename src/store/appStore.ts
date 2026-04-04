import { create } from 'zustand';
import { StorageProvider } from '../services/StorageProvider';
import {
  WatchedMovie,
  WatchedEpisode,
  QueuedItem,
  FavoriteMovie,
  CurrentlyWatchingItem,
} from '../types';

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
  removeFromWatchlist: (seriesId: number, itemType: 'tv' | 'movie') => Promise<void>;

  // ── Currently Watching ──────────────────────────────────────
  addToCurrentlyWatching: (item: CurrentlyWatchingItem) => Promise<void>;
  removeFromCurrentlyWatching: (seriesId: number) => Promise<void>;
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

  // ── Hydrate from AsyncStorage ───────────────────────────────
  hydrate: async () => {
    const [movies, episodes, watchlist, favMovies, favEpisodeIds, cw] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
      StorageProvider.getWatchlist(),
      StorageProvider.getAllFavoriteMovies(),
      StorageProvider.getAllFavorites(),
      StorageProvider.getCurrentlyWatching(),
    ]);
    set({
      watchedMovies: movies,
      watchedEpisodes: episodes,
      watchlist,
      favoriteMovieIds: new Set(favMovies.map(m => m.movieId)),
      favoriteEpisodeIds: new Set(favEpisodeIds),
      currentlyWatching: cw,
      hydrated: true,
    });
  },

  // ── Watched Movies ──────────────────────────────────────────
  addWatchedMovie: async (movie) => {
    // Optimistic: add to array
    set(s => ({
      watchedMovies: [movie, ...s.watchedMovies].sort(
        (a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
      ),
    }));
    try {
      await StorageProvider.addToWatchedMovies(movie);
    } catch {
      // Rollback on persist failure by re-hydrating this slice
      const fresh = await StorageProvider.getWatchedMovies();
      set({ watchedMovies: fresh });
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
    }
  },

  // ── Watched Episodes ────────────────────────────────────────
  markEpisodeWatched: async (episode) => {
    set(s => {
      const exists = s.watchedEpisodes.some(e => e.episodeId === episode.episodeId);
      const updated = exists
        ? s.watchedEpisodes.map(e => e.episodeId === episode.episodeId ? episode : e)
        : [episode, ...s.watchedEpisodes];
      return {
        watchedEpisodes: updated.sort(
          (a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
        ),
      };
    });
    try {
      await StorageProvider.markEpisodeAsWatched(episode);
    } catch {
      const fresh = await StorageProvider.getAllWatchedEpisodes();
      set({ watchedEpisodes: fresh });
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
    }
  },

  // ── Watchlist ───────────────────────────────────────────────
  addToWatchlist: async (item) => {
    set(s => ({
      watchlist: [item, ...s.watchlist.filter(
        w => !(w.seriesId === item.seriesId && w.itemType === item.itemType)
      )],
    }));
    try {
      await StorageProvider.addToWatchlist(item);
    } catch {
      const fresh = await StorageProvider.getWatchlist();
      set({ watchlist: fresh });
    }
  },

  removeFromWatchlist: async (seriesId, itemType) => {
    const prev = get().watchlist;
    set(s => ({
      watchlist: s.watchlist.filter(
        w => !(w.seriesId === seriesId && w.itemType === itemType)
      ),
    }));
    try {
      await StorageProvider.removeFromWatchlist(seriesId, itemType);
    } catch {
      set({ watchlist: prev });
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
    }
  },
}));
