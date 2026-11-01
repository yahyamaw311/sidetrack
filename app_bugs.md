# 🐛 Sidetrack — Bug Report

> Comprehensive audit of the Sidetrack codebase. Each bug includes the affected files, root cause, and severity.

---

## Bug 1 — Watchlist items not persisted when removed (storage key mismatch)

**Severity:** 🔴 Critical  
**Affected files:** `StorageProvider.ts`, `appStore.ts`

### Problem
The `QueuedItem` type has `itemId` and `itemType` fields (to support both TV shows and movies), but `StorageProvider.addToWatchlist()` stores items keyed by `item.seriesId` (line 93), which doesn't exist on `QueuedItem`. Meanwhile `StorageProvider.removeFromWatchlist()` also deletes by `seriesId` (line 98–100). Since `seriesId` is `undefined` on the `QueuedItem` type, the storage operations write to and delete from key `undefined`, causing:

1. Watchlist additions silently write to the wrong key (or overwrite each other).
2. Removals delete key `undefined` rather than the actual item, so the real item persists.
3. On refresh/hydrate, the stale items reappear because they were never actually deleted from AsyncStorage.

### Root cause
`StorageProvider` was written for the old schema where watchlist items only tracked TV shows (`seriesId`), but was never updated after the `QueuedItem` type was changed to use `itemId`/`itemType` to support both TV and movies.

The `appStore.removeFromWatchlist` correctly filters by `itemId + itemType` in memory (lines 268–270), so it appears to work until the next hydrate.

### Expected fix
`StorageProvider.addToWatchlist` should key by `${item.itemId}_${item.itemType}`. `removeFromWatchlist` should accept `(itemId, itemType)` and delete the matching key. `getWatchlist` already returns `Object.values()` so it would work once the keys are correct.

---

## Bug 2 — `StorageProvider.removeWatchedEpisode` signature mismatch with store

**Severity:** 🔴 Critical  
**Affected files:** `StorageProvider.ts` (line 61), `appStore.ts` (line 200)

### Problem
The store calls `StorageProvider.removeWatchedEpisode(seriesId, episodeId)` (line 200 of appStore), passing **two** arguments. However, `StorageProvider.removeWatchedEpisode` only accepts **one** argument (`episodeId`). The `seriesId` argument is being silently consumed as `episodeId`, and the real `episodeId` is ignored.

```ts
// appStore.ts line 200
await StorageProvider.removeWatchedEpisode(seriesId, episodeId);

// StorageProvider.ts line 61 — only one param
removeWatchedEpisode: async (episodeId: number) => { ... }
```

This means **the wrong episode is deleted from storage** (or no episode at all, since `seriesId` likely doesn't match any `episodeId` key). The in-memory Zustand state correctly filters by `episodeId`, so it looks like it works until the next hydrate — then the "deleted" episode reappears.

### Expected fix
Either update the store call to `StorageProvider.removeWatchedEpisode(episodeId)`, or update the StorageProvider method to accept `(seriesId, episodeId)` for consistency with the store interface.

---

## Bug 3 — Movie not removed from watchlist when logged as watched

**Severity:** 🟡 Medium  
**Affected files:** `useMovieDetail.ts`

### Problem
When a user logs a movie as watched via `handleConfirmLog`, there is no call to `removeFromWatchlist`. This means movies that were in the watchlist remain there even after being logged, forcing the user to manually remove them.

### Expected behavior
When `handleConfirmLog` is called and `isInWatchlist` is true, the movie should be auto-removed from the watchlist.

---

## Bug 4 — TV show not removed from watchlist when episodes are logged

**Severity:** 🟡 Medium  
**Affected files:** `useEpisodeDetail.ts`

### Problem
Similar to Bug 3 — when a user marks a TV episode as watched via `handleConfirmWatched`, there is no logic to auto-remove the show from the watchlist. Even when all episodes have been watched (the "fully watched" check on line 213–227 only removes from "currently watching"), the show stays in the watchlist.

### Expected behavior
At minimum, when the show is fully watched, it should be auto-removed from the watchlist. Ideally, there should also be a user preference for this behavior.

---

## Bug 5 — `DiscoveryScreen` reads "Currently Watching" directly from StorageProvider instead of Zustand store

**Severity:** 🟡 Medium  
**Affected files:** `DiscoveryScreen.tsx` (lines 68, 89, 106)

### Problem
The DiscoveryScreen calls `StorageProvider.getCurrentlyWatching()` directly instead of reading from the Zustand store (`useAppStore`). This means:

1. The "Currently Watching" section won't update in real-time when the user logs an episode from a detail screen and navigates back — they'd need to pull-to-refresh.
2. It's inconsistent with all other screens which read from the store.
3. The `refreshRef` callback only re-reads from `StorageProvider`, so it also misses optimistic state.

### Expected behavior
Read `currentlyWatching` from `useAppStore(s => s.currentlyWatching)` to stay in sync with the centralized state.

---

## Bug 6 — `WatchedMovieModal` resets form state after `onConfirm` resolves, even if modal stays open due to error

**Severity:** 🟡 Medium  
**Affected files:** `WatchedMovieModal.tsx` (lines 78–96)

### Problem
In `handleConfirm`, the form state (rating, review, tags, etc.) is always reset at lines 89–95, even if the async `onConfirm` call fails and the modal is still visible. The reset happens after the `finally` block, meaning:
- If persist fails and the store shows a rollback error, the user's entered data is already wiped.
- They can't retry with the same data.

### Expected behavior
Form state should only be reset when the confirm is fully successful and the modal is being closed.

---

## Bug 7 — `WatchedMovieModal` `useEffect` depends on `visible` but reads stale `initialData`

**Severity:** 🟠 Low-Medium  
**Affected files:** `WatchedMovieModal.tsx` (line 57–76)

### Problem
The `useEffect` that pre-fills form fields lists `[visible]` as its only dependency. When `initialData` changes while the modal is already visible (which can happen in edge cases), the form won't update. React's linting rules would warn about the missing `initialData` dependency.

---

## Bug 8 — `FlatList` `keyExtractor` on WatchlistScreen doesn't include `itemType`, causing key collisions

**Severity:** 🟡 Medium  
**Affected files:** `WatchlistScreen.tsx` (line 193)

### Problem
```ts
keyExtractor={(item) => item.itemId.toString()}
```
If a movie and a TV show happen to share the same TMDB ID (which is possible since movie IDs and TV IDs are in separate namespaces), they'll get the same key, causing React rendering issues (wrong item rendered, swipe state bleeds between items).

### Expected fix
```ts
keyExtractor={(item) => `${item.itemType}_${item.itemId}`}
```

---

## Bug 9 — `StatsService.totalLikes` and `totalReviews` only count episodes, not movies

**Severity:** 🟡 Medium  
**Affected files:** `StatsService.ts` (lines 392, 396)

### Problem
```ts
// Line 392 — only counts episode likes
const totalLikes = episodes.filter(e => e.liked).length;

// Line 396 — only counts episode reviews  
const allReviews = episodes.filter(e => e.review && e.review.trim().length > 0);
```
`WatchedMovie` also has `liked` and `review` fields, but they are completely ignored in the stats computation. This means:
- The Profile screen under-reports likes and reviews.
- Sidetrack Wrapped stats are inaccurate.
- The `likeRatio` is calculated against `totalEntries` (movies + episodes) but only counts episode likes, making it always lower than it should be.

---

## Bug 10 — `StatsService` genre rating normalization is inconsistent for movies

**Severity:** 🟡 Medium  
**Affected files:** `StatsService.ts` (lines 277–284)

### Problem
In the genre rating map computation, movie ratings are divided by 2 (`m.rating / 2` at line 282) to "normalize to 5-star". But the top-level `avgMovieRating` computation (line 222–224) uses `normalizeMovieRating()` which only divides by 2 if the rating is `> 5`. These are two different normalization strategies applied to the same data. Since the current app uses a 0–5 star rating (not 1–10), all movie genre ratings are incorrectly halved (a 4-star movie contributes a 2.0 to its genre's average).

---

## Bug 11 — Episode `SeasonBrowser` "Remove" action passes `ep.seriesId` which doesn't exist on the `Episode` type

**Severity:** 🟡 Medium  
**Affected files:** `SeasonBrowser.tsx` (line 297)

### Problem
```ts
await storeRemoveEpisode(ep.seriesId, ep.id);
```
The `Episode` type (from TMDB) does not have a `seriesId` field — only `WatchedEpisode` does. `ep.seriesId` is `undefined`, so this calls `storeRemoveEpisode(undefined, ep.id)`. Combined with Bug 2, this propagates to `StorageProvider.removeWatchedEpisode(undefined)` which tries to `delete watched[undefined]` — a no-op.

### Consequence
Removing a watched episode from the SeasonBrowser doesn't persist to storage. The checkmark disappears but comes back on refresh.

---

## Bug 12 — `updateWatchedMovieRating` in StorageProvider only updates the first matching movieId entry

**Severity:** 🟠 Low  
**Affected files:** `StorageProvider.ts` (lines 120–127)

### Problem
`updateWatchedMovieRating` finds the first entry by `movieId` using `Object.keys(watched).find(...)`. For movies that have been logged multiple times (rewatches), this will only ever update the rating of the first-found entry, not the one the user intended. This method is currently not used in the app, but it would cause bugs if called.

---

## Bug 13 — `handleRefresh` on `EpisodeDetail` doesn't refresh episode-specific queries

**Severity:** 🟠 Low  
**Affected files:** `useEpisodeDetail.ts` (lines 270–274)

### Problem
```ts
const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['tv', tvId] });
    setRefreshing(false);
}, [queryClient, tvId]);
```
This only refetches the show-level query. The selected episode detail, episode IMDb ratings, trailer, and show IMDb rating queries are not refetched. The user has to navigate away and back to get fresh episode data.

---

## Bug 14 — `DiscoveryScreen` doesn't clear `loading` state if search throws an error

**Severity:** 🟠 Low  
**Affected files:** `DiscoveryScreen.tsx` (lines 114–127)

### Problem
In `performSearch`, if `tmdbService.search(text)` throws, there's no `catch` or `finally` block, so `loading` remains `true` and `searching` remains `true`. The user sees an infinite loading state.

```ts
const performSearch = useCallback(async (text: string) => {
    if (text.length > 2) {
        setLoading(true);        // ← never set back to false on error
        const searchData = await tmdbService.search(text);  // ← can throw
        // ...
        setLoading(false);
        setSearching(false);
    }
}, []);
```

---

## Bug 15 — `DiscoveryScreen` uses its own `loading` state that conflicts with `trending` loading

**Severity:** 🟠 Low  
**Affected files:** `DiscoveryScreen.tsx` (lines 36, 80, 116, 358)

### Problem
The same `loading` boolean is used for two completely different operations: loading trending data (line 80) and loading search results (line 116). When a user performs a search while trending data is already loaded, `setLoading(true)` at line 116 triggers the full-screen skeleton check at line 358: `if (loading && trending.length === 0)`. This creates a flash/flicker if the `trending` array happens to have been cleared by a prior error.

---

## Bug 16 — Race condition in `handleConfirmLog` when logging a movie as watched rapidly

**Severity:** 🟠 Low  
**Affected files:** `useMovieDetail.ts` (lines 135–177)

### Problem
There is no debounce or guard to prevent double-submission. If the user taps "Save" rapidly, `handleConfirmLog` can be called multiple times before the first `addWatchedMovie` resolves, resulting in duplicate entries in the watch log (each with a different `watchedDate` since `data.watchedDate.toISOString()` is evaluated at call time).

---

## Bug 17 — Tags are double-processed (cleaned twice, inconsistently)

**Severity:** 🟠 Low  
**Affected files:** `WatchedMovieModal.tsx` (line 81), `useMovieDetail.ts` (line 147)

### Problem
The `WatchedMovieModal.handleConfirm` cleans tags by deduplicating and lowercasing:
```ts
const cleanTags = Array.from(new Set(tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))).join(', ');
```
Then `useMovieDetail.handleConfirmLog` also processes the already-cleaned tags:
```ts
const parsedTags = data.tags.trim() ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
```
The double-processing is wasteful but functionally harmless. However, the modal lowercases tags while the hook doesn't, creating inconsistency. The episode counterpart (`useEpisodeDetail.handleConfirmWatched`) also splits tags but doesn't lowercase, so movie tags end up lowercased while episode tags preserve case.

---

## Bug 18 — `SeasonBrowser` clears all IMDb ratings and episode details when toggling any season

**Severity:** 🟠 Low  
**Affected files:** `SeasonBrowser.tsx` (lines 68–70)

### Problem
```ts
setExpandedEpisodeId(null);
setEpisodeDetails({});      // ← clears ALL cached episode details
setEpisodeImdbRatings({});  // ← clears ALL cached IMDb ratings
```
Every time a user toggles a season, all previously loaded episode details and IMDb ratings are wiped. If the user re-expands the same season, all episode details and IMDb ratings need to be re-fetched from the network, causing unnecessary API calls and loading spinners.

---

## Bug 19 — `getTVTrailer` doesn't check `isOffline` before making the API call

**Severity:** 🟠 Low  
**Affected files:** `tmdbService.ts` (lines 551–570)

### Problem
`getMovieTrailer` correctly checks `if (useAppStore.getState().isOffline) return null;` before making the API call (line 530), but `getTVTrailer` has no such guard. While the `enabled` flag in `useEpisodeDetail`'s React Query config checks `isOffline`, the `tmdbService.getTVTrailer` function itself can still be called directly without the offline check, leading to a failed network request and an error toast when offline.

---

## Bug 20 — `existingEntry` in `useMovieDetail` only finds the first watched entry, ignoring rewatches

**Severity:** 🟠 Low  
**Affected files:** `useMovieDetail.ts` (lines 40–43)

### Problem
```ts
const existingEntry = useMemo(
    () => watchedMovies.find(m => m.movieId === movieId) ?? null,
    [watchedMovies, movieId]
);
```
For movies logged multiple times (rewatches), `find()` returns only the first match. When the user opens the movie detail and taps "Watched" (to edit), they always edit the first watch entry, not the most recent one. Since `watchedMovies` is sorted by date descending this is likely the newest, but the behavior is implicit rather than explicit, and could break if sorting changes.
