/**
 * Lightweight typed pub/sub for cross-screen state synchronization.
 * StorageProvider emits events after mutations; screens subscribe to
 * auto-refresh when data they depend on changes.
 */

export type DataChannel =
  | 'watchedEpisodes'
  | 'watchedMovies'
  | 'watchlist'
  | 'favorites'
  | 'currentlyWatching';

type Listener = () => void;

const listeners = new Map<DataChannel, Set<Listener>>();

export const dataEvents = {
  subscribe(channel: DataChannel, fn: Listener): () => void {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(fn);
    return () => { listeners.get(channel)?.delete(fn); };
  },

  emit(channel: DataChannel) {
    listeners.get(channel)?.forEach(fn => {
      try { fn(); } catch (e) { console.error(`[DataEvents] Error in ${channel} listener`, e); }
    });
  },
};
