import axios from 'axios';
import { ImageSourcePropType } from 'react-native';
import Constants from 'expo-constants';
import { TMDBResponse, SearchResult, TVShowDetail, SeasonDetail, MovieDetail, EpisodeDetailData } from '../types';
import { notifyErrorGlobal } from '../contexts/ErrorNotifier';
import { CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';

/**
 * Extract a loggable summary from an error without leaking sensitive data.
 * Axios errors include full request config (URLs with API keys, headers with
 * Bearer tokens) which can end up in crash-reporting tools in production.
 */
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    const axiosErr = error as any;
    if (axiosErr.isAxiosError) {
      const status: number | undefined = axiosErr.response?.status;
      const statusText: string | undefined = axiosErr.response?.statusText;
      const code: string | undefined = axiosErr.code; // e.g. ECONNABORTED
      return [
        axiosErr.message,
        status && `status=${status}`,
        statusText && `statusText=${statusText}`,
        code && `code=${code}`,
      ].filter(Boolean).join(' | ');
    }
    return error.message;
  }
  return String(error);
}

const BASE_URL = Constants.expoConfig?.extra?.tmdbBaseUrl || 'https://api.themoviedb.org/3';
const IMDB_GRAPHQL_URL = Constants.expoConfig?.extra?.imdbGraphqlUrl || 'https://graphql.imdb.com';

const tmdbClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'User-Agent': 'Sidetrack/1.0',
    'Content-Type': 'application/json',
  },
  params: {
    language: 'en-US',
  },
});

// Interceptor to dynamically attach the BYOK API Key
tmdbClient.interceptors.request.use(config => {
  const tmdbApiKey = useAppStore.getState().tmdbApiKey || '';
  const isBearerToken = tmdbApiKey.length > 50;

  if (isBearerToken) {
    config.headers.Authorization = `Bearer ${tmdbApiKey}`;
  } else {
    config.params = config.params || {};
    config.params.api_key = tmdbApiKey;
  }
  
  return config;
});

// --- In-memory cache (5 min TTL, bounded by count and memory) ---
const CACHE_TTL = CONFIG.API.CACHE_TTL_MS;
const CACHE_MAX_ENTRIES = CONFIG.LIMITS.CACHE_MAX_ENTRIES;
const CACHE_MAX_ENTRY_BYTES = 200 * 1024;   // ~200 KB per entry
const CACHE_MAX_TOTAL_BYTES = 5 * 1024 * 1024; // ~5 MB total

interface CacheEntry { data: any; timestamp: number; size: number }

// Hot-reload safe module state: clear stale globals when module re-evaluates
const _gen = Symbol.for('__tmdb_gen__');
const _prev = (globalThis as any)[_gen] ?? 0;
(globalThis as any)[_gen] = _prev + 1;

let cache = new Map<string, CacheEntry>();
let cacheBytes = 0;
let activeCount = 0;
let queue: Array<() => void> = [];

if (_prev > 0) {
  // Module was re-evaluated (hot reload) — reset everything
  cache = new Map();
  cacheBytes = 0;
  activeCount = 0;
  queue = [];
}

// Periodic sweep to proactively remove expired entries (once per minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      cacheBytes -= entry.size;
      cache.delete(key);
    }
  }
}, 60000);

/** 
 * Rough byte-size estimate (avoids expensive full JSON.stringify serialization) 
 * Iterates through keys/values with a depth limit to estimate memory footprint.
 */
function estimateSize(value: any, depth = 0): number {
  if (value === null || value === undefined) return 8;
  const type = typeof value;
  if (type === 'number') return 8;
  if (type === 'string') return value.length * 2;
  if (type === 'boolean') return 4;
  if (type === 'object' && depth < 10) {
    let size = 16; // baseline for object/array overhead
    if (Array.isArray(value)) {
      for (let i = 0; i < Math.min(value.length, 100); i++) {
        size += estimateSize(value[i], depth + 1);
      }
      // Scale if array is truncated for estimation
      if (value.length > 100) size = (size / 100) * value.length;
    } else {
      for (const key in value) {
        size += key.length * 2;
        size += estimateSize(value[key], depth + 1);
        if (size > CACHE_MAX_ENTRY_BYTES) break; 
      }
    }
    return size;
  }
  return 8;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  if (entry) {
    cacheBytes -= entry.size;
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, data: any) {
  // Remove previous version of same key
  const prev = cache.get(key);
  if (prev) {
    cacheBytes -= prev.size;
    cache.delete(key);
  }

  const size = estimateSize(data);
  if (size > CACHE_MAX_ENTRY_BYTES) return; // drop oversized entries silently

  cache.set(key, { data, timestamp: Date.now(), size });
  cacheBytes += size;

  // Evict oldest entries when over count or memory budget
  const keys = Array.from(cache.keys());
  let i = 0;
  while ((cache.size > CACHE_MAX_ENTRIES || cacheBytes > CACHE_MAX_TOTAL_BYTES) && i < keys.length) {
    const old = cache.get(keys[i]);
    if (old) {
      cacheBytes -= old.size;
      cache.delete(keys[i]);
    }
    i++;
  }
}

/** Drop all in-memory cached entries */
function clearCache() {
  cache.clear();
  cacheBytes = 0;
}

/** Drop cached entries whose key starts with the given prefix */
function invalidatePrefix(prefix: string) {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      const entry = cache.get(key);
      if (entry) cacheBytes -= entry.size;
      cache.delete(key);
    }
  }
}

// --- Concurrency limiter for IMDb calls ---
const MAX_CONCURRENT = CONFIG.LIMITS.MAX_CONCURRENT_API_CALLS;

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
  /** Drop all in-memory cached TMDB data */
  clearCache,

  /** Drop cached entries whose key starts with the given prefix */
  invalidatePrefix,

  /**
   * Search for multi (TV, Movies)
   */
  search: async (query: string, page: number = 1): Promise<{ results: SearchResult[], hasNextPage: boolean }> => {
    if (useAppStore.getState().isOffline) {
      return { results: [], hasNextPage: false };
    }
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/search/multi', {
        params: { query, page },
      });
      return { 
        results: response.data.results,
        hasNextPage: response.data.page < response.data.total_pages
      };
    } catch (error) {
      console.error('TMDB Search Error:', sanitizeError(error));
      notifyErrorGlobal('Search failed — check your connection', 'api');
      return { results: [], hasNextPage: false };
    }
  },

  /**
   * Get Trending TV Shows
   */
  getTrending: async (): Promise<SearchResult[]> => {
    if (useAppStore.getState().isOffline) return [];
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/trending/tv/week');
      return response.data.results;
    } catch (error) {
      console.error('TMDB Trending Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load trending shows', 'api');
      return [];
    }
  },

  /**
   * Get Trending Movies
   */
  getTrendingMovies: async (): Promise<SearchResult[]> => {
    if (useAppStore.getState().isOffline) return [];
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/trending/movie/week');
      return response.data.results;
    } catch (error) {
      console.error('TMDB Trending Movies Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load trending movies', 'api');
      return [];
    }
  },

  /**
   * Get Top Rated Movies
   */
  getTopRatedMovies: async (): Promise<SearchResult[]> => {
    const cacheKey = 'top_rated_movies';
    const cached = getCached<SearchResult[]>(cacheKey);
    if (cached) return cached;
    if (useAppStore.getState().isOffline) return [];
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/movie/top_rated');
      const results = response.data.results.map(r => ({ ...r, media_type: 'movie' as const }));
      setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('TMDB Top Rated Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load top rated movies', 'api');
      return [];
    }
  },

  /**
   * Discover movies by genre ID
   */
  discoverByGenre: async (genreId: number, page: number = 1): Promise<{ results: SearchResult[], hasNextPage: boolean }> => {
    const cacheKey = `discover_genre_${genreId}_page_${page}`;
    const cached = getCached<{ results: SearchResult[], hasNextPage: boolean }>(cacheKey);
    if (cached) return cached;
    if (useAppStore.getState().isOffline) return { results: [], hasNextPage: false };
    try {
      const response = await tmdbClient.get<TMDBResponse<SearchResult>>('/discover/movie', {
        params: { with_genres: genreId, sort_by: 'popularity.desc' },
      });
      const results = response.data.results.map(r => ({ ...r, media_type: 'movie' as const }));
      const output = {
        results,
        hasNextPage: response.data.page < response.data.total_pages
      };
      setCache(cacheKey, output);
      return output;
    } catch (error) {
      console.error('TMDB Discover Genre Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load genre movies', 'api');
      return { results: [], hasNextPage: false };
    }
  },

  /**
   * Get TV Show Details (with external IDs for IMDb)
   */
  getTVShowDetails: async (tvId: number): Promise<TVShowDetail | null> => {
    const cacheKey = `tv_${tvId}`;
    const cached = getCached<TVShowDetail>(cacheKey);
    if (cached) return cached;
    if (useAppStore.getState().isOffline) return null;
    try {
      const [showResponse, externalIds] = await Promise.all([
        tmdbClient.get<TVShowDetail>(`/tv/${tvId}`, { params: { append_to_response: 'credits' } }),
        tmdbClient.get<{ imdb_id?: string }>(`/tv/${tvId}/external_ids`),
      ]);
      const result = { ...showResponse.data, external_ids: externalIds.data };
      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`TMDB TV Detail Error (${tvId}):`, sanitizeError(error));
      notifyErrorGlobal('Could not load show details', 'api');
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
    if (useAppStore.getState().isOffline) return null;
    try {
      const response = await tmdbClient.get<MovieDetail>(`/movie/${movieId}`, {
        params: { append_to_response: 'credits' }
      });
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Movie Detail Error (${movieId}):`, sanitizeError(error));
      notifyErrorGlobal('Could not load movie details', 'api');
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
    if (useAppStore.getState().isOffline) return null;
    try {
      const response = await tmdbClient.get<SeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Season Detail Error (${tvId} S${seasonNumber}):`, sanitizeError(error));
      notifyErrorGlobal('Could not load season details', 'api');
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
    if (useAppStore.getState().isOffline) return null;
    try {
      const response = await tmdbClient.get<EpisodeDetailData>(
        `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
        { params: { append_to_response: 'credits,images' } }
      );
      setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`TMDB Episode Detail Error (${tvId} S${seasonNumber}E${episodeNumber}):`, sanitizeError(error));
      notifyErrorGlobal('Could not load episode details', 'api');
      return null;
    }
  },

  /**
   * Get image source for React Native Image component
   * size: 'w342', 'w500', 'original', etc.
   */
  getImageSource: (path: string | null, size: string = 'w342'): ImageSourcePropType => {
    if (!path) return require('../../assets/no-poster.png');
    return { uri: `${CONFIG.API.TMDB_IMAGE_BASE}${size}${path}` };
  },

  /**
   * Get IMDb rating directly from IMDb's GraphQL API
   */
  getIMDbRating: async (imdbId: string): Promise<{ imdbRating: string; imdbVotes: string } | null> => {
    if (!imdbId) return null;
    const cacheKey = `imdb_${imdbId}`;
    const cached = getCached<{ imdbRating: string; imdbVotes: string }>(cacheKey);
    if (cached) return cached;
    if (useAppStore.getState().isOffline) return null;
    try {
      const response = await axios.post(IMDB_GRAPHQL_URL, {
        query: `query GetImdbTitle($id: ID!) { title(id: $id) { ratingsSummary { aggregateRating voteCount } } }`,
        variables: { id: imdbId },
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sidetrack/1.0',
        },
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
      console.error('IMDb GraphQL Error:', sanitizeError(error));
      notifyErrorGlobal('Could not fetch IMDb ratings', 'api');
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
      console.error(`TMDB Episode External IDs Error:`, sanitizeError(error));
      notifyErrorGlobal('Could not fetch external IDs', 'api');
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
        console.error('IMDb Episode Rating Error:', sanitizeError(error));
        return null;
      }
    });
  },

  /**
   * Get YouTube trailer key for a movie
   */
  getMovieTrailer: async (movieId: number): Promise<string | null> => {
    const cacheKey = `movie_trailer_${movieId}`;
    const cached = getCached<string>(cacheKey);
    if (cached) return cached;
    if (useAppStore.getState().isOffline) return null;
    try {
      const response = await tmdbClient.get<{ results: Array<{ key: string; site: string; type: string; official: boolean }> }>(
        `/movie/${movieId}/videos`
      );
      const trailers = response.data.results.filter(
        v => v.site === 'YouTube' && v.type === 'Trailer'
      );
      const key = (trailers.find(t => t.official) || trailers[0])?.key || null;
      if (key) setCache(cacheKey, key);
      return key;
    } catch (error) {
      console.error('TMDB Movie Trailer Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load trailer', 'api');
      return null;
    }
  },

  /**
   * Get YouTube trailer key for a TV show
   */
  getTVTrailer: async (tvId: number): Promise<string | null> => {
    const cacheKey = `tv_trailer_${tvId}`;
    const cached = getCached<string>(cacheKey);
    if (cached) return cached;
    try {
      const response = await tmdbClient.get<{ results: Array<{ key: string; site: string; type: string; official: boolean }> }>(
        `/tv/${tvId}/videos`
      );
      const trailers = response.data.results.filter(
        v => v.site === 'YouTube' && v.type === 'Trailer'
      );
      const key = (trailers.find(t => t.official) || trailers[0])?.key || null;
      if (key) setCache(cacheKey, key);
      return key;
    } catch (error) {
      console.error('TMDB TV Trailer Error:', sanitizeError(error));
      notifyErrorGlobal('Could not load trailer', 'api');
      return null;
    }
  },
};
