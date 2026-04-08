// ── Mock StorageProvider ──
// jest.mock is hoisted before imports
jest.mock('../../services/StorageProvider', () => ({
  StorageProvider: {
    getWatchedMovies: jest.fn().mockResolvedValue([]),
    getAllWatchedEpisodes: jest.fn().mockResolvedValue([]),
    getWatchlist: jest.fn().mockResolvedValue([]),
    getAllFavoriteMovies: jest.fn().mockResolvedValue([]),
    getAllFavorites: jest.fn().mockResolvedValue([]),
    getCurrentlyWatching: jest.fn().mockResolvedValue([]),
    hasGivenConsent: jest.fn().mockResolvedValue(true),
    getTmdbApiKey: jest.fn().mockResolvedValue(null),
    setTmdbApiKey: jest.fn().mockResolvedValue(undefined),
    addToWatchedMovies: jest.fn().mockResolvedValue(undefined),
    updateWatchedMovie: jest.fn().mockResolvedValue(undefined),
    removeFromWatchedMovies: jest.fn().mockResolvedValue(undefined),
    markEpisodeAsWatched: jest.fn().mockResolvedValue(undefined),
    removeWatchedEpisode: jest.fn().mockResolvedValue(undefined),
    toggleFavoriteMovie: jest.fn().mockResolvedValue(undefined),
    toggleFavoriteEpisode: jest.fn().mockResolvedValue(undefined),
    addToWatchlist: jest.fn().mockResolvedValue(undefined),
    removeFromWatchlist: jest.fn().mockResolvedValue(undefined),
    addToCurrentlyWatching: jest.fn().mockResolvedValue(undefined),
    removeFromCurrentlyWatching: jest.fn().mockResolvedValue(undefined),
  },
}));

import { useAppStore } from '../appStore';
import { StorageProvider } from '../../services/StorageProvider';

// Cast to access mock methods
const mocked = StorageProvider as jest.Mocked<typeof StorageProvider>;

// ── Helpers ──
const resetStore = () => {
  useAppStore.setState({
    watchedMovies: [],
    watchedEpisodes: [],
    watchlist: [],
    favoriteMovieIds: new Set(),
    favoriteEpisodeIds: new Set(),
    currentlyWatching: [],
    hydrated: false,
  });
  jest.clearAllMocks();
};

const makeMovie = (id: number, date = '2026-01-01T00:00:00.000Z') => ({
  movieId: id,
  title: `Movie ${id}`,
  posterPath: null,
  backdropPath: null,
  rating: 4,
  watchedDate: date,
  runtime: 120,
  releaseDate: '2026-01-01',
  genres: ['Action'],
  overview: 'A movie',
  liked: true,
  rewatch: false,
  noSpoilers: false,
});

const makeEpisode = (epId: number, seriesId: number, date = '2026-01-01T00:00:00.000Z') => ({
  episodeId: epId,
  seriesId,
  seriesName: `Show ${seriesId}`,
  episodeName: `Episode ${epId}`,
  stillPath: null,
  seasonNumber: 1,
  episodeNumber: epId,
  rating: 3,
  watchedDate: date,
  liked: false,
  rewatch: false,
  noSpoilers: false,
});

// ── Tests ──

describe('appStore', () => {
  beforeEach(resetStore);

  describe('hydrate', () => {
    it('loads all data from StorageProvider and sets hydrated = true', async () => {
      const movie = makeMovie(1);
      const episode = makeEpisode(101, 1);
      mocked.getWatchedMovies.mockResolvedValueOnce([movie] as any);
      mocked.getAllWatchedEpisodes.mockResolvedValueOnce([episode] as any);
      mocked.getWatchlist.mockResolvedValueOnce([]);
      mocked.getAllFavoriteMovies.mockResolvedValueOnce([{ movieId: 1 }] as any);
      mocked.getAllFavorites.mockResolvedValueOnce([101]);
      mocked.getCurrentlyWatching.mockResolvedValueOnce([]);

      await useAppStore.getState().hydrate();

      const state = useAppStore.getState();
      expect(state.hydrated).toBe(true);
      expect(state.watchedMovies).toEqual([movie]);
      expect(state.watchedEpisodes).toEqual([episode]);
      expect(state.favoriteMovieIds.has(1)).toBe(true);
      expect(state.favoriteEpisodeIds.has(101)).toBe(true);
    });
  });

  describe('addWatchedMovie', () => {
    it('optimistically adds movie to store and persists', async () => {
      const movie = makeMovie(42);
      await useAppStore.getState().addWatchedMovie(movie as any);

      expect(useAppStore.getState().watchedMovies).toHaveLength(1);
      expect(useAppStore.getState().watchedMovies[0].movieId).toBe(42);
      expect(mocked.addToWatchedMovies).toHaveBeenCalledWith(movie);
    });

    it('rolls back on persist failure', async () => {
      mocked.addToWatchedMovies.mockRejectedValueOnce(new Error('disk full'));
      mocked.getWatchedMovies.mockResolvedValueOnce([]);

      await useAppStore.getState().addWatchedMovie(makeMovie(99) as any);

      expect(useAppStore.getState().watchedMovies).toEqual([]);
    });
  });

  describe('removeWatchedMovie', () => {
    it('removes movie from store and persists', async () => {
      const movie = makeMovie(1);
      useAppStore.setState({ watchedMovies: [movie] as any });

      await useAppStore.getState().removeWatchedMovie(1, movie.watchedDate);

      expect(useAppStore.getState().watchedMovies).toHaveLength(0);
      expect(mocked.removeFromWatchedMovies).toHaveBeenCalledWith(1, movie.watchedDate);
    });
  });

  describe('markEpisodeWatched', () => {
    it('adds new episode to store', async () => {
      const ep = makeEpisode(201, 10);
      await useAppStore.getState().markEpisodeWatched(ep as any);

      expect(useAppStore.getState().watchedEpisodes).toHaveLength(1);
      expect(useAppStore.getState().watchedEpisodes[0].episodeId).toBe(201);
      expect(mocked.markEpisodeAsWatched).toHaveBeenCalledWith(ep);
    });

    it('updates existing episode in-place', async () => {
      const ep = makeEpisode(201, 10);
      useAppStore.setState({ watchedEpisodes: [ep] as any });

      const updated = { ...ep, rating: 5 };
      await useAppStore.getState().markEpisodeWatched(updated as any);

      expect(useAppStore.getState().watchedEpisodes).toHaveLength(1);
      expect(useAppStore.getState().watchedEpisodes[0].rating).toBe(5);
    });
  });

  describe('removeEpisode', () => {
    it('removes episode by id', async () => {
      const ep = makeEpisode(301, 20);
      useAppStore.setState({ watchedEpisodes: [ep] as any });

      await useAppStore.getState().removeEpisode(20, 301);

      expect(useAppStore.getState().watchedEpisodes).toHaveLength(0);
      expect(mocked.removeWatchedEpisode).toHaveBeenCalledWith(20, 301);
    });
  });

  describe('toggleFavoriteMovie', () => {
    it('adds movieId to favoriteMovieIds', async () => {
      await useAppStore.getState().toggleFavoriteMovie(42, true, { movieId: 42, title: 'T', posterPath: null, addedDate: '' });

      expect(useAppStore.getState().favoriteMovieIds.has(42)).toBe(true);
      expect(mocked.toggleFavoriteMovie).toHaveBeenCalled();
    });

    it('removes movieId from favoriteMovieIds', async () => {
      useAppStore.setState({ favoriteMovieIds: new Set([42]) });

      await useAppStore.getState().toggleFavoriteMovie(42, false);

      expect(useAppStore.getState().favoriteMovieIds.has(42)).toBe(false);
    });
  });

  describe('toggleFavoriteEpisode', () => {
    it('adds/removes episodeId', async () => {
      await useAppStore.getState().toggleFavoriteEpisode(101, true);
      expect(useAppStore.getState().favoriteEpisodeIds.has(101)).toBe(true);

      await useAppStore.getState().toggleFavoriteEpisode(101, false);
      expect(useAppStore.getState().favoriteEpisodeIds.has(101)).toBe(false);
    });
  });

  describe('watchlist', () => {
    it('addToWatchlist adds item', async () => {
      const item = { itemId: 1, name: 'Show', posterPath: null, addedDate: '2026-01-01', itemType: 'tv' as const };
      await useAppStore.getState().addToWatchlist(item);

      expect(useAppStore.getState().watchlist).toHaveLength(1);
      expect(mocked.addToWatchlist).toHaveBeenCalledWith(item);
    });

    it('removeFromWatchlist removes item', async () => {
      useAppStore.setState({
        watchlist: [{ itemId: 1, name: 'Show', posterPath: null, addedDate: '2026-01-01', itemType: 'tv' as const }],
      });

      await useAppStore.getState().removeFromWatchlist(1, 'tv');

      expect(useAppStore.getState().watchlist).toHaveLength(0);
      expect(mocked.removeFromWatchlist).toHaveBeenCalledWith(1, 'tv');
    });
  });

  describe('currentlyWatching', () => {
    it('addToCurrentlyWatching adds item to front', async () => {
      const item = { seriesId: 5, name: 'Show 5', posterPath: null, lastUpdated: '2026-01-01' };
      await useAppStore.getState().addToCurrentlyWatching(item);

      expect(useAppStore.getState().currentlyWatching).toHaveLength(1);
      expect(useAppStore.getState().currentlyWatching[0].seriesId).toBe(5);
    });

    it('removeFromCurrentlyWatching removes item', async () => {
      useAppStore.setState({
        currentlyWatching: [{ seriesId: 5, name: 'Show 5', posterPath: null, lastUpdated: '2026-01-01' }],
      });

      await useAppStore.getState().removeFromCurrentlyWatching(5);

      expect(useAppStore.getState().currentlyWatching).toHaveLength(0);
    });
  });
});
