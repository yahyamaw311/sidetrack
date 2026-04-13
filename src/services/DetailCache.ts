import AsyncStorage from '@react-native-async-storage/async-storage';
import { TVShowDetail, MovieDetail, SeasonDetail, EpisodeDetailData } from '../types';

/**
 * Persists the most recently fetched detail page data so it can
 * survive a navigate-away-and-back while the device is offline.
 *
 * Keys are kept namespaced and the cache is write-through: we write
 * after a successful network fetch and read only when the network
 * fetch fails.
 *
 * Eviction policy:
 *  - Each entry is wrapped with a `cachedAt` timestamp.
 *  - `pruneStaleEntries()` removes entries older than MAX_AGE_MS.
 *  - If the total entry count exceeds MAX_ENTRIES the oldest entries
 *    are evicted first (LRU by write time).
 *  - Call `pruneStaleEntries()` once on app startup (after migration).
 */

const KEY_PREFIX = '@sidetrack_detail_cache_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 50;

const cacheKey = (kind: string, id: string | number) =>
  `${KEY_PREFIX}${kind}_${id}`;

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number; // Unix ms
}

const writeCache = async (key: string, data: any) => {
  try {
    const envelope: CacheEnvelope<any> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (e) {
    // Swallow – caching is best-effort
    console.warn('[DetailCache] write error', e);
  }
};

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    // Treat as a cache miss if the entry has expired
    if (Date.now() - envelope.cachedAt > MAX_AGE_MS) {
      AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    return envelope.data;
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

  // --- Episode ---------------------------------------------------------------
  cacheEpisodeDetail: (tvId: number, season: number, episode: number, data: EpisodeDetailData) =>
    writeCache(cacheKey('episode', `${tvId}_${season}_${episode}`), data),

  getCachedEpisodeDetail: (tvId: number, season: number, episode: number) =>
    readCache<EpisodeDetailData>(cacheKey('episode', `${tvId}_${season}_${episode}`)),

  // --- IMDb Rating -----------------------------------------------------------
  cacheIMDbRating: (imdbId: string, data: { imdbRating: string; imdbVotes: string }) =>
    writeCache(cacheKey('imdb', imdbId), data),

  getCachedIMDbRating: (imdbId: string) =>
    readCache<{ imdbRating: string; imdbVotes: string }>(cacheKey('imdb', imdbId)),

  /**
   * Prune stale and excess entries from AsyncStorage.
   * Call once on app startup (e.g. after StorageProvider.migrateToPartitionedStorage).
   *
   * Strategy:
   *  1. Collect all detail-cache keys.
   *  2. Remove any entry older than MAX_AGE_MS.
   *  3. If still over MAX_ENTRIES, evict oldest entries until within budget.
   */
  pruneStaleEntries: async (): Promise<void> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const detailKeys = allKeys.filter(k => k.startsWith(KEY_PREFIX));

      // Read timestamps for all entries (parallel, best-effort)
      const entries: { key: string; cachedAt: number }[] = [];
      await Promise.all(
        detailKeys.map(async (key) => {
          try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return;
            const envelope = JSON.parse(raw) as Partial<CacheEnvelope<unknown>>;
            const cachedAt = typeof envelope.cachedAt === 'number' ? envelope.cachedAt : 0;
            entries.push({ key, cachedAt });
          } catch {
            // Malformed entry — schedule for removal
            entries.push({ key, cachedAt: 0 });
          }
        })
      );

      const now = Date.now();
      const stale = entries.filter(e => now - e.cachedAt > MAX_AGE_MS);
      if (stale.length > 0) {
        await AsyncStorage.multiRemove(stale.map(e => e.key));
      }

      // After age eviction, check count budget
      const remaining = entries
        .filter(e => now - e.cachedAt <= MAX_AGE_MS)
        .sort((a, b) => a.cachedAt - b.cachedAt); // oldest first

      if (remaining.length > MAX_ENTRIES) {
        const excess = remaining.slice(0, remaining.length - MAX_ENTRIES);
        await AsyncStorage.multiRemove(excess.map(e => e.key));
      }
    } catch (e) {
      console.warn('[DetailCache] pruneStaleEntries error', e);
    }
  },
};
