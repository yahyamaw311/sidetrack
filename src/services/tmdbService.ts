import axios from 'axios';
import Constants from 'expo-constants';
import { TMDBResponse, SearchResult, TVShowDetail, SeasonDetail, MovieDetail, EpisodeDetailData } from '../types';

const TMDB_API_KEY = Constants.expoConfig?.extra?.tmdbApiKey
  || process.env.EXPO_PUBLIC_TMDB_API_KEY
  || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMDB_GRAPHQL_URL = 'https://graphql.imdb.com';

// Helper to determine auth method
const isBearerToken = TMDB_API_KEY.length > 50;

const tmdbClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: isBearerToken ? {
    Authorization: `Bearer ${TMDB_API_KEY}`,
    'Content-Type': 'application/json',
  } : undefined,
  params: isBearerToken ? {
    language: 'en-US',
  } : {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

// --- In-memory cache (5 min TTL) ---
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// --- Concurrency limiter for IMDb calls ---
const MAX_CONCURRENT = 3;
let activeCount = 0;
const queue: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  activeCount++;
  try {
    return await fn();
  } finally {
    activeCount--;
    if (queue.length > 0) {
      const next = queue.shift();
      next?.();
    }
  }
}

export const tmdbService = {
  /**
   * Search for multi (TV, Movies)
   */
  search: async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/search/multi', {
        params: { query },
      });
      return response.data.results;
    } catch (error) {
      console.error('TMDB Search Error:', error);
      return [];
    }
  },

  /**
   * Get Trending TV Shows
   */
  getTrending: async (): Promise<SearchResult[]> => {
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/trending/tv/week');
      return response.data.results;
    } catch (error) {
      console.error('TMDB Trending Error:', error);
      return [];
    }
  },

  /**
   * Get Trending Movies
   */
  getTrendingMovies: async (): Promise<SearchResult[]> => {
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/trending/movie/week');
      return response.data.results;
    } catch (error) {
      console.error('TMDB Trending Movies Error:', error);
      return [];
    }
  },

  /**
   * Get TV Show Details (with external IDs for IMDb)
   */
  getTVShowDetails: async (tvId: number): Promise<TVShowDetail | null> => {
    const cacheKey = `tv_${tvId}`;
    const cached = getCached<TVShowDetail>(cacheKey);
    if (cached) return cached;
    try {
      const [showResponse, externalIds] = await Promise.all([
        tmdbClient.get<TVShowDetail>(`/tv/${tvId}`),
        tmdbClient.get<{ imdb_id?: string }>(`/tv/${tvId}/external_ids`),
      ]);
      const result = { ...showResponse.data, external_ids: externalIds.data };
      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`TMDB TV Detail Error (${tvId}):`, error);
      return null;
    }
  },

  /**
   * Get Movie Details
   */
  getMovieDetails: async (movieId: number): Promise<MovieDetail | null> => {
    const cacheKey = `movie_${movieId}`;
    const cached = getCached<MovieDetail>(cacheKey);
    if (cached) return cached;
    try {
      const response = await tmdbClient.get<MovieDetail>(`/movie/${movieId}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Movie Detail Error (${movieId}):`, error);
      return null;
    }
  },

  /**
   * Get Season Details (includes episodes)
   */
  getSeasonDetails: async (tvId: number, seasonNumber: number): Promise<SeasonDetail | null> => {
    const cacheKey = `season_${tvId}_${seasonNumber}`;
    const cached = getCached<SeasonDetail>(cacheKey);
    if (cached) return cached;
    try {
      const response = await tmdbClient.get<SeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Season Detail Error (${tvId} S${seasonNumber}):`, error);
      return null;
    }
  },

  /**
   * Get Episode Details (with credits and images)
   */
  getEpisodeDetails: async (tvId: number, seasonNumber: number, episodeNumber: number): Promise<EpisodeDetailData | null> => {
    const cacheKey = `ep_${tvId}_${seasonNumber}_${episodeNumber}`;
    const cached = getCached<EpisodeDetailData>(cacheKey);
    if (cached) return cached;
    try {
      const response = await tmdbClient.get<EpisodeDetailData>(
        `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
        { params: { append_to_response: 'credits,images' } }
      );
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Episode Detail Error (${tvId} S${seasonNumber}E${episodeNumber}):`, error);
      return null;
    }
  },

  /**
   * Get image URL
   * size: 'w500', 'original', etc.
   */
  getImageUrl: (path: string | null, size: string = 'w500'): string => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },

  /**
   * Get IMDb rating directly from IMDb's GraphQL API
   */
  getIMDbRating: async (imdbId: string): Promise<{ imdbRating: string; imdbVotes: string } | null> => {
    if (!imdbId) return null;
    const cacheKey = `imdb_${imdbId}`;
    const cached = getCached<{ imdbRating: string; imdbVotes: string }>(cacheKey);
    if (cached) return cached;
    try {
      const response = await axios.post(IMDB_GRAPHQL_URL, {
        query: `{ title(id: "${imdbId}") { ratingsSummary { aggregateRating voteCount } } }`,
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      const data = response.data?.data?.title?.ratingsSummary;
      if (data && data.aggregateRating) {
        const result = {
          imdbRating: String(data.aggregateRating),
          imdbVotes: data.voteCount ? data.voteCount.toLocaleString() : 'N/A',
        };
        setCache(cacheKey, result);
        return result;
      }
      return null;
    } catch (error) {
      console.error('IMDb GraphQL Error:', error);
      return null;
    }
  },

  /**
   * Get the IMDb ID for a specific episode via TMDB external IDs
   */
  getEpisodeImdbId: async (tvId: number, seasonNumber: number, episodeNumber: number): Promise<string | null> => {
    try {
      const response = await tmdbClient.get<{ imdb_id?: string }>(
        `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/external_ids`
      );
      return response.data.imdb_id || null;
    } catch (error) {
      console.error(`TMDB Episode External IDs Error:`, error);
      return null;
    }
  },

  /**
   * Get IMDb rating for a specific episode (fetches episode IMDb ID, then queries IMDb GraphQL)
   */
  getIMDbEpisodeRating: async (tvId: number, seasonNumber: number, episodeNumber: number): Promise<{ imdbRating: string; imdbVotes: string } | null> => {
    return withConcurrencyLimit(async () => {
      try {
        const episodeImdbId = await tmdbService.getEpisodeImdbId(tvId, seasonNumber, episodeNumber);
        if (!episodeImdbId) return null;
        return await tmdbService.getIMDbRating(episodeImdbId);
      } catch (error) {
        console.error('IMDb Episode Rating Error:', error);
        return null;
      }
    });
  },
};
