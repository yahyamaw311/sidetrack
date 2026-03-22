import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVShowDetail, MovieDetail, SeasonDetail } from '../types';

/**
 * Persists the most recently fetched detail page data so it can
 * survive a navigate-away-and-back while the device is offline.
 *
 * Keys are kept namespaced and the cache is write-through: we write
 * after a successful network fetch and read only when the network
 * fetch fails.
 */

const KEY_PREFIX = '@sidetrack_detail_cache_';

const cacheKey = (kind: string, id: string | number) =>
  `${KEY_PREFIX}${kind}_${id}`;

const writeCache = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Swallow – caching is best-effort
    console.warn('[DetailCache] write error', e);
  }
};

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[DetailCache] read error', e);
    return null;
  }
};

export const DetailCache = {
  // --- TV Show ---------------------------------------------------------------
  cacheTVShowDetail: (tvId: number, data: TVShowDetail) =>
    writeCache(cacheKey('tv', tvId), data),

  getCachedTVShowDetail: (tvId: number) =>
    readCache<TVShowDetail>(cacheKey('tv', tvId)),

  // --- Movie -----------------------------------------------------------------
  cacheMovieDetail: (movieId: number, data: MovieDetail) =>
    writeCache(cacheKey('movie', movieId), data),

  getCachedMovieDetail: (movieId: number) =>
    readCache<MovieDetail>(cacheKey('movie', movieId)),

  // --- Season ----------------------------------------------------------------
  cacheSeasonDetail: (tvId: number, season: number, data: SeasonDetail) =>
    writeCache(cacheKey('season', `${tvId}_${season}`), data),

  getCachedSeasonDetail: (tvId: number, season: number) =>
    readCache<SeasonDetail>(cacheKey('season', `${tvId}_${season}`)),
};
