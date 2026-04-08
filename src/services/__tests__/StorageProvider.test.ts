import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the ErrorNotifier so it doesn't pollute tests
jest.mock('../../contexts/ErrorNotifier', () => ({
  notifyErrorGlobal: jest.fn(),
}));

import { StorageProvider } from '../StorageProvider';
import { WatchedEpisode, WatchedMovie, QueuedItem, SearchResult } from '../../types';

const store = (AsyncStorage as any).__store as Map<string, string>;

beforeEach(async () => {
  store.clear();
  jest.clearAllMocks();
});

// ── Helper factories ──

const makeEpisode = (overrides: Partial<WatchedEpisode> = {}): WatchedEpisode => ({
  episodeId: 1001,
  seriesId: 42,
  seriesName: 'Test Show',
  episodeName: 'Pilot',
  seasonNumber: 1,
  episodeNumber: 1,
  rating: 4,
  watchedDate: '2025-01-15T12:00:00.000Z',
  ...overrides,
});

const makeMovie = (overrides: Partial<WatchedMovie> = {}): WatchedMovie => ({
  movieId: 500,
  title: 'Test Movie',
  posterPath: '/poster.jpg',
  backdropPath: '/bg.jpg',
  rating: 4,
  watchedDate: '2025-02-20T12:00:00.000Z',
  runtime: 120,
  releaseDate: '2024-06-15',
  genres: ['Action'],
  overview: 'A great movie',
  ...overrides,
});

const makeQueuedItem = (overrides: Partial<QueuedItem> = {}): QueuedItem => ({
  itemId: 42,
  name: 'Queued Show',
  posterPath: '/poster.jpg',
  addedDate: '2025-01-10T12:00:00.000Z',
  itemType: 'tv',
  ...overrides,
});

// ── Tests ──

describe('StorageProvider', () => {
  // --- Episodes ---
  describe('Episodes', () => {
    it('marks an episode as watched and retrieves it', async () => {
      const ep = makeEpisode();
      await StorageProvider.markEpisodeAsWatched(ep);

      const all = await StorageProvider.getWatchedEpisodesForShow(42);
      expect(all).toHaveLength(1);
      expect(all[0].episodeId).toBe(1001);
    });

    it('updates an existing episode when marking again', async () => {
      const ep = makeEpisode({ rating: 3 });
      await StorageProvider.markEpisodeAsWatched(ep);
      await StorageProvider.markEpisodeAsWatched({ ...ep, rating: 5 });

      const all = await StorageProvider.getWatchedEpisodesForShow(42);
      expect(all).toHaveLength(1);
      expect(all[0].rating).toBe(5);
    });

    it('removes a watched episode', async () => {
      const ep = makeEpisode();
      await StorageProvider.markEpisodeAsWatched(ep);
      await StorageProvider.removeWatchedEpisode(42, 1001);

      const all = await StorageProvider.getWatchedEpisodesForShow(42);
      expect(all).toHaveLength(0);
    });

    it('getAllWatchedEpisodes returns episodes from partitioned storage', async () => {
      await StorageProvider.markEpisodeAsWatched(makeEpisode({ episodeId: 1, seriesId: 10 }));
      await StorageProvider.markEpisodeAsWatched(makeEpisode({ episodeId: 2, seriesId: 20 }));

      const all = await StorageProvider.getAllWatchedEpisodes();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Movies ---
  describe('Movies', () => {
    it('adds and retrieves a watched movie', async () => {
      const movie = makeMovie();
      await StorageProvider.addToWatchedMovies(movie);

      const all = await StorageProvider.getWatchedMovies();
      expect(all).toHaveLength(1);
      expect(all[0].title).toBe('Test Movie');
    });

    it('removes a watched movie', async () => {
      const movie = makeMovie();
      await StorageProvider.addToWatchedMovies(movie);
      await StorageProvider.removeFromWatchedMovies(500, movie.watchedDate);

      const all = await StorageProvider.getWatchedMovies();
      expect(all).toHaveLength(0);
    });

    it('updates a watched movie with new date', async () => {
      const movie = makeMovie();
      await StorageProvider.addToWatchedMovies(movie);

      const updated = { ...movie, rating: 5, watchedDate: '2025-03-01T12:00:00.000Z' };
      await StorageProvider.updateWatchedMovie(updated, movie.watchedDate);

      const all = await StorageProvider.getWatchedMovies();
      expect(all).toHaveLength(1);
      expect(all[0].rating).toBe(5);
      expect(all[0].watchedDate).toBe('2025-03-01T12:00:00.000Z');
    });

    it('isMovieWatched returns the movie or null', async () => {
      expect(await StorageProvider.isMovieWatched(500)).toBeNull();

      await StorageProvider.addToWatchedMovies(makeMovie());
      const result = await StorageProvider.isMovieWatched(500);
      expect(result?.movieId).toBe(500);
    });

    it('normalizes legacy 1-10 ratings to 0-5 when reading', async () => {
      const movie = makeMovie({ rating: 8 }); // legacy 1-10 scale
      await StorageProvider.addToWatchedMovies(movie);

      const all = await StorageProvider.getWatchedMovies();
      expect(all[0].rating).toBe(4); // 8 / 2
    });

    it('updateWatchedMovieRating changes rating in-place', async () => {
      const movie = makeMovie({ rating: 3 });
      await StorageProvider.addToWatchedMovies(movie);

      await StorageProvider.updateWatchedMovieRating(500, 4.5, movie.watchedDate);

      const all = await StorageProvider.getWatchedMovies();
      expect(all[0].rating).toBe(4.5);
    });
  });

  // --- Watchlist ---
  describe('Watchlist', () => {
    it('adds and retrieves watchlist items', async () => {
      await StorageProvider.addToWatchlist(makeQueuedItem());

      const list = await StorageProvider.getWatchlist();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Queued Show');
    });

    it('removes from watchlist', async () => {
      await StorageProvider.addToWatchlist(makeQueuedItem());
      await StorageProvider.removeFromWatchlist(42, 'tv');

      const list = await StorageProvider.getWatchlist();
      expect(list).toHaveLength(0);
    });

    it('separates tv and movie items with the same itemId', async () => {
      await StorageProvider.addToWatchlist(makeQueuedItem({ itemType: 'tv', itemId: 1 }));
      await StorageProvider.addToWatchlist(makeQueuedItem({ itemType: 'movie', itemId: 1, name: 'Movie 1' }));

      const list = await StorageProvider.getWatchlist();
      expect(list).toHaveLength(2);
    });
  });

  // --- Favorites ---
  describe('Favorites (Episodes)', () => {
    it('toggles episode favorite on', async () => {
      await StorageProvider.toggleFavoriteEpisode(1001, true);
      expect(await StorageProvider.isEpisodeFavorite(1001)).toBe(true);
    });

    it('toggles episode favorite off', async () => {
      await StorageProvider.toggleFavoriteEpisode(1001, true);
      await StorageProvider.toggleFavoriteEpisode(1001, false);
      expect(await StorageProvider.isEpisodeFavorite(1001)).toBe(false);
    });

    it('getAllFavorites returns favorite episode IDs', async () => {
      await StorageProvider.toggleFavoriteEpisode(1, true);
      await StorageProvider.toggleFavoriteEpisode(2, true);

      const faves = await StorageProvider.getAllFavorites();
      expect(faves).toContain(1);
      expect(faves).toContain(2);
    });
  });

  describe('Favorites (Movies)', () => {
    it('toggles movie favorite on', async () => {
      await StorageProvider.toggleFavoriteMovie(500, true, {
        movieId: 500, title: 'Test', posterPath: null, addedDate: '2025-01-01',
      });
      expect(await StorageProvider.isMovieFavorite(500)).toBe(true);
    });

    it('toggles movie favorite off', async () => {
      await StorageProvider.toggleFavoriteMovie(500, true, {
        movieId: 500, title: 'Test', posterPath: null, addedDate: '2025-01-01',
      });
      await StorageProvider.toggleFavoriteMovie(500, false);
      expect(await StorageProvider.isMovieFavorite(500)).toBe(false);
    });
  });

  // --- Currently Watching ---
  describe('Currently Watching', () => {
    it('adds and retrieves currently watching', async () => {
      await StorageProvider.addToCurrentlyWatching({
        seriesId: 42, name: 'Show', posterPath: null, lastUpdated: '',
      });

      const list = await StorageProvider.getCurrentlyWatching();
      expect(list).toHaveLength(1);
      expect(list[0].seriesId).toBe(42);
    });

    it('removes from currently watching', async () => {
      await StorageProvider.addToCurrentlyWatching({
        seriesId: 42, name: 'Show', posterPath: null, lastUpdated: '',
      });
      await StorageProvider.removeFromCurrentlyWatching(42);

      const list = await StorageProvider.getCurrentlyWatching();
      expect(list).toHaveLength(0);
    });

    it('re-adding a show moves it to the front', async () => {
      await StorageProvider.addToCurrentlyWatching({
        seriesId: 1, name: 'A', posterPath: null, lastUpdated: '',
      });
      await StorageProvider.addToCurrentlyWatching({
        seriesId: 2, name: 'B', posterPath: null, lastUpdated: '',
      });
      // Re-add show 1
      await StorageProvider.addToCurrentlyWatching({
        seriesId: 1, name: 'A', posterPath: null, lastUpdated: '',
      });

      const list = await StorageProvider.getCurrentlyWatching();
      expect(list[0].seriesId).toBe(1);
    });
  });

  // --- Search History ---
  describe('Search History', () => {
    const makeSearchResult = (id: number, mediaType: 'tv' | 'movie' = 'tv'): SearchResult => ({
      id,
      name: `Result ${id}`,
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 7,
      media_type: mediaType,
    });

    it('adds and retrieves search history', async () => {
      await StorageProvider.addSearchHistoryItem(makeSearchResult(1));
      const history = await StorageProvider.getSearchHistory();
      expect(history).toHaveLength(1);
    });

    it('deduplicates by id+media_type', async () => {
      await StorageProvider.addSearchHistoryItem(makeSearchResult(1));
      await StorageProvider.addSearchHistoryItem(makeSearchResult(1));

      const history = await StorageProvider.getSearchHistory();
      expect(history).toHaveLength(1);
    });

    it('clears search history', async () => {
      await StorageProvider.addSearchHistoryItem(makeSearchResult(1));
      await StorageProvider.clearSearchHistory();

      const history = await StorageProvider.getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it('removes specific search history item', async () => {
      await StorageProvider.addSearchHistoryItem(makeSearchResult(1, 'tv'));
      await StorageProvider.addSearchHistoryItem(makeSearchResult(2, 'movie'));
      await StorageProvider.removeSearchHistoryItem(1, 'tv');

      const history = await StorageProvider.getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(2);
    });
  });

  // --- Onboarding ---
  describe('Onboarding', () => {
    it('defaults to not completed', async () => {
      expect(await StorageProvider.hasCompletedOnboarding()).toBe(false);
    });

    it('completeOnboarding marks it as done', async () => {
      await StorageProvider.completeOnboarding();
      expect(await StorageProvider.hasCompletedOnboarding()).toBe(true);
    });
  });
});
