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
   * Get TV Show Details (with external IDs for IMDb)
   */
  getTVShowDetails: async (tvId: number): Promise<TVShowDetail | null> => {
    try {
      const [showResponse, externalIds] = await Promise.all([
        tmdbClient.get<TVShowDetail>(`/tv/${tvId}`),
        tmdbClient.get<{ imdb_id?: string }>(`/tv/${tvId}/external_ids`),
      ]);
      return { ...showResponse.data, external_ids: externalIds.data };
    } catch (error) {
      console.error(`TMDB TV Detail Error (${tvId}):`, error);
      return null;
    }
  },

  /**
   * Get Movie Details
   */
  getMovieDetails: async (movieId: number): Promise<MovieDetail | null> => {
    try {
      const response = await tmdbClient.get<MovieDetail>(`/movie/${movieId}`);
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
    try {
      const response = await tmdbClient.get<SeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
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
    try {
      const response = await tmdbClient.get<EpisodeDetailData>(
        `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
        { params: { append_to_response: 'credits,images' } }
      );
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
    try {
      const response = await axios.post(IMDB_GRAPHQL_URL, {
        query: `{ title(id: "${imdbId}") { ratingsSummary { aggregateRating voteCount } } }`,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = response.data?.data?.title?.ratingsSummary;
      if (data && data.aggregateRating) {
        return {
          imdbRating: String(data.aggregateRating),
          imdbVotes: data.voteCount ? data.voteCount.toLocaleString() : 'N/A',
        };
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
    try {
      const episodeImdbId = await tmdbService.getEpisodeImdbId(tvId, seasonNumber, episodeNumber);
      if (!episodeImdbId) return null;
      return await tmdbService.getIMDbRating(episodeImdbId);
    } catch (error) {
      console.error('IMDb Episode Rating Error:', error);
      return null;
    }
  },
};
