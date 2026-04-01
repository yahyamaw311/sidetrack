import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetailCache } from '../DetailCache';
import { TVShowDetail, MovieDetail, SeasonDetail } from '../../types';

// Access the in-memory store for cleanup
const store = (AsyncStorage as any).__store as Map<string, string>;

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

const mockTVShow: TVShowDetail = {
  id: 1,
  name: 'Test Show',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  overview: 'A test show',
  first_air_date: '2024-01-01',
  vote_average: 8.5,
  number_of_seasons: 2,
  seasons: [],
  status: 'Returning Series',
  genres: [{ id: 18, name: 'Drama' }],
};

const mockMovie: MovieDetail = {
  id: 100,
  title: 'Test Movie',
  poster_path: '/movie.jpg',
  backdrop_path: '/moviebg.jpg',
  overview: 'A test movie',
  release_date: '2024-06-15',
  vote_average: 7.2,
  runtime: 120,
  genres: [{ id: 28, name: 'Action' }],
  status: 'Released',
};

const mockSeason: SeasonDetail = {
  air_date: '2024-01-01',
  episode_count: 10,
  id: 50,
  name: 'Season 1',
  overview: 'First season',
  poster_path: '/season1.jpg',
  season_number: 1,
  episodes: [],
};

describe('DetailCache', () => {
  describe('TV Show', () => {
    it('round-trips a TV show detail', async () => {
      await DetailCache.cacheTVShowDetail(1, mockTVShow);
      const result = await DetailCache.getCachedTVShowDetail(1);
      expect(result).toEqual(mockTVShow);
    });

    it('returns null on cache miss', async () => {
      const result = await DetailCache.getCachedTVShowDetail(999);
      expect(result).toBeNull();
    });
  });

  describe('Movie', () => {
    it('round-trips a movie detail', async () => {
      await DetailCache.cacheMovieDetail(100, mockMovie);
      const result = await DetailCache.getCachedMovieDetail(100);
      expect(result).toEqual(mockMovie);
    });

    it('returns null on cache miss', async () => {
      const result = await DetailCache.getCachedMovieDetail(999);
      expect(result).toBeNull();
    });
  });

  describe('Season', () => {
    it('round-trips a season detail', async () => {
      await DetailCache.cacheSeasonDetail(1, 1, mockSeason);
      const result = await DetailCache.getCachedSeasonDetail(1, 1);
      expect(result).toEqual(mockSeason);
    });

    it('returns null on cache miss', async () => {
      const result = await DetailCache.getCachedSeasonDetail(1, 99);
      expect(result).toBeNull();
    });

    it('different seasons are stored independently', async () => {
      const season2 = { ...mockSeason, season_number: 2, name: 'Season 2', id: 51 };
      await DetailCache.cacheSeasonDetail(1, 1, mockSeason);
      await DetailCache.cacheSeasonDetail(1, 2, season2);

      const s1 = await DetailCache.getCachedSeasonDetail(1, 1);
      const s2 = await DetailCache.getCachedSeasonDetail(1, 2);

      expect(s1?.name).toBe('Season 1');
      expect(s2?.name).toBe('Season 2');
    });
  });
});
