# 06 — Data Fetching, Caching & Offline Resilience Audit

**Codebase:** Sidetrack (React Native / Expo)
**Date:** 2026-04-05
**Scope:** All network calls, caching layers, mutation patterns, and offline handling

---

## Executive Summary

Sidetrack uses **Axios** with a custom in-memory cache for TMDB API calls, **AsyncStorage** for local persistence, a **Zustand** store for in-app state, and a **`DetailCache`** service for offline fallback on detail screens. There is **no server-state caching library** (React Query, SWR, Apollo) in use. While the app implements some good patterns — parallelized fetches, debounced search, optimistic updates with rollback — several critical and high-severity gaps exist around missing offline guards, absence of a proper server-state cache, and inconsistent error/loading handling.

---

## 1. Fetch Pattern Analysis

### 1.1 Data Fetching Mechanisms

| Mechanism | Location | Notes |
|---|---|---|
| **Axios** (via `tmdbClient`) | `tmdbService.ts` | Primary HTTP client for all TMDB API calls; interceptor dynamically attaches API key |
| **Axios** (raw) | `tmdbService.ts:370` (`getIMDbRating`) | Direct `axios.post` to IMDb GraphQL — bypasses `tmdbClient` and its interceptor config |
| **Custom in-memory cache** | `tmdbService.ts:63-152` | Map-based cache with 5 min TTL, 100-entry / 5 MB bounds, LRU-ish eviction |
| **AsyncStorage** (persistence) | `StorageProvider.ts`, `DetailCache.ts` | All local data (watch history, watchlist, favorites, detail cache) |
| **Zustand store** | `appStore.ts` | Centralized reactive state; hydrated from AsyncStorage on boot |
| **Custom hooks** | `useDiscoveryData`, `useSearch`, `useMovieDetail`, `useEpisodeDetail`, `useHistoryData` | Orchestrate fetches, manage loading/error states |

> **No server-state caching library** (React Query, SWR, RTK Query, Apollo) is installed.

### 1.2 Fetch-in-Component-Body Violations

| # | Finding | File | Severity |
|---|---|---|---|
| F-01 | `WrappedScreen.loadStats()` is an `async` function defined inside the component and called in a bare `useEffect(() => { loadStats(); }, [])`. The effect has an **empty dependency array** and the `loadStats` function is **not memoized** — on each render a new function reference is created. While the empty deps prevent re-runs, this is fragile. | `WrappedScreen.tsx:41-51` | 🟡 Medium |
| F-02 | `ProfileScreen.loadStats()` is declared with `useCallback` but depends on **no external deps** while calling `StorageProvider.getWatchlist()` directly — this call bypasses the Zustand store, producing a stale count if the watchlist was modified after hydration. | `ProfileScreen.tsx:118-129` | 🟠 High |
| F-03 | `HistoryScreen.handleConfirmEpisodeEdit` calls `StorageProvider.markEpisodeAsWatched(updated)` directly instead of going through the Zustand store (`storeMarkEpisodeWatched`), then manually refreshes via `fetchAndSetHistoryData()`. This bypasses optimistic updates and rollback. | `HistoryScreen.tsx:159-185` | 🟠 High |

### 1.3 Missing Loading / Error / Empty State Handling

| # | Finding | File | Severity |
|---|---|---|---|
| S-01 | ~~`tmdbService.getTrending()` and `getTrendingMovies()` — no in-memory cache applied. On failure they return `[]` with only a toast notification. The `useDiscoveryData` hook shows a skeleton only when `loading && trending.length === 0`. After the first successful load, a subsequent failure **silently replaces trending data with `[]`**, blanking the screen.~~ **✅ FIXED** — `useDiscoveryData` now checks `isOffline` before fetching, reads from `StorageProvider.getTrendingCache()` when offline, and writes fresh data to persistence on every successful fetch. | `tmdbService.ts`, `useDiscoveryData.ts` | ~~🔴 Critical~~ ✅ |
| S-02 | `tmdbService.search()` — on network error returns `{ results: [], hasNextPage: false }`. The search UI shows a `PopcornLoader` while `searching` is true, but if the search completes with an API error the user sees **"No results found"** — indistinguishable from a genuine empty result set. | `tmdbService.ts:183-197`, `DiscoveryScreen.tsx:326-335` | 🟠 High |
| S-03 | `SeasonBrowser.fetchEpisodeImdbRatings` — fires `Promise.all()` for every episode in a season. Returns `null` for individual failures but **no error state** is surfaced — ratings silently never appear. No loading indicator per-episode. | `SeasonBrowser.tsx:62-74` | 🟡 Medium |
| S-04 | `useSearch.loadMoreSearchResults` and `loadMoreGenreResults` — no error handling if the pagination fetch fails. The `isLoadingMore` flag will be stuck `true` (never set to `false` on error path). | `useSearch.ts:57-67`, `useSearch.ts:106-115` | 🟠 High |

---

## 2. Request Waterfall Detection

### 2.1 Parallelized Fetches (Good Patterns ✅)

| Pattern | File | Assessment |
|---|---|---|
| `Promise.all([getTrending(), getTrendingMovies(), getTopRated()])` | `useDiscoveryData.ts:22-26` | ✅ Three independent API calls correctly parallelized |
| `Promise.all([getSeasonDetails(), getTVShowDetails()])` | `useEpisodeDetail.ts:67-70` | ✅ Two independent detail calls parallelized |
| `Promise.all()` in `appStore.hydrate()` | `appStore.ts:64-73` | ✅ Eight AsyncStorage reads parallelized |

### 2.2 Sequential Waterfalls (Anti-Patterns 🚨)

| # | Finding | File | Severity |
|---|---|---|---|
| W-01 | **EpisodeDetail IMDb waterfall**: After `Promise.all` resolves show + season data, the hook sequentially awaits `getIMDbRating(showImdbId)`, then `getEpisodeDetails()`, then `getIMDbEpisodeRating()`. These three calls are **independent of each other** and could all be fired concurrently. Total sequential penalty: ~3 extra round-trips. | `useEpisodeDetail.ts:90-130` | 🟠 High |
| W-02 | **MovieDetail IMDb + trailer waterfall**: After `getMovieDetails()` resolves, `getIMDbRating()` is awaited, and only *then* is `getMovieTrailer()` fired (via `.then()`). The IMDb call and the trailer call are independent and can be parallelized. | `useMovieDetail.ts:44-84` | 🟡 Medium |
| W-03 | **`getIMDbEpisodeRating` inherent waterfall**: This function first awaits `getEpisodeImdbId()`, then awaits `getIMDbRating()`. The two calls *are* genuinely dependent (ID → Rating), but since both live inside the concurrency limiter this sequence blocks a slot for the duration of two sequential HTTP calls. | `tmdbService.ts:416-427` | 🟡 Medium |
| W-04 | **ProfileScreen.loadStats → StatsService.computeWrapped**: The `StatsService` internally calls `StorageProvider.getWatchedMovies()`, `getAllWatchedEpisodes()`, `getAllFavoriteMovies()`, `getAllFavorites()` via sequential awaits instead of parallelizing them (they are used in `Promise.all` inside `hydrate()` but not here — `StatsService` calls them independently). After stats compute, `ProfileScreen` also separately calls `StorageProvider.getWatchlist()`. | `StatsService.ts:157-161`, `ProfileScreen.tsx:126` | 🟡 Medium |

---

## 3. Caching Strategy Assessment

### 3.1 Server-State Cache Library

| Assessment | Severity |
|---|---|
| **No React Query / SWR / Apollo / RTK Query** is in use. All caching is hand-rolled. This means: no automatic background refetching, no deduplication of in-flight requests, no shared query keys, no garbage collection policies, no `staleTime` / `gcTime` tuning, no devtools. | 🔴 Critical |

### 3.2 Custom In-Memory Cache Audit

The custom cache in `tmdbService.ts` provides:

| Feature | Implementation | Assessment |
|---|---|---|
| TTL | 5 min (300 000 ms) | ✅ Reasonable for trending/detail data |
| Max entries | 100 | ✅ Bounded |
| Max per-entry size | 200 KB | ✅ Prevents oversized entries |
| Max total size | 5 MB | ✅ Bounded |
| Eviction policy | Oldest-first (FIFO by insertion order) | 🟡 Not true LRU — frequently accessed items may be evicted |
| Thread/concurrency safety | No dedup of in-flight requests | 🟠 Two components requesting the same endpoint concurrently will fire two network calls |
| Persistence | **None** — cache is lost on app restart or hot reload | 🟠 Cold start always re-fetches everything |

### 3.3 Inconsistent Caching Across Endpoints

| Endpoint | Cached? | Issue | Severity |
|---|---|---|---|
| `search()` | ❌ No | Repeated identical searches hit the network every time | 🟡 Medium |
| `getTrending()` | ❌ No | Every screen focus / pull-to-refresh re-fetches | 🟠 High |
| `getTrendingMovies()` | ❌ No | Same as above — these are on the landing page | 🟠 High |
| `getTopRatedMovies()` | ✅ Yes | Properly cached | ✅ |
| `discoverByGenre()` | ✅ Yes | Properly cached | ✅ |
| `getTVShowDetails()` | ✅ Yes | Properly cached | ✅ |
| `getMovieDetails()` | ✅ Yes | Properly cached | ✅ |
| `getSeasonDetails()` | ✅ Yes | Properly cached | ✅ |
| `getEpisodeDetails()` | ✅ Yes | Properly cached | ✅ |
| `getIMDbRating()` | ✅ Yes | Properly cached | ✅ |
| `getEpisodeImdbId()` | ❌ No | Fetched every time an episode's IMDb rating is needed | 🟡 Medium |
| `getMovieTrailer()` | ✅ Yes | Properly cached | ✅ |
| `getTVTrailer()` | ✅ Yes | Properly cached | ✅ |

### 3.4 Redundant Network Requests Across Screens

| # | Finding | Severity |
|---|---|---|
| C-01 | **Discovery → EpisodeDetail for same show**: The user taps a trending show, navigating to `EpisodeDetail`. This triggers `getTVShowDetails(tvId)` which is correctly cached. However, if the user **goes back and taps the same show again**, and the cache has been evicted (100-entry limit, or 5 min TTL expired), the data is re-fetched despite potentially having been written to `DetailCache` (AsyncStorage). The in-memory cache and `DetailCache` are not coordinated — `DetailCache` is only read as a fallback after an API *failure*, not as a warm cache before trying the network. | 🟡 Medium |
| C-02 | **ProfileScreen re-computes `StatsService.computeWrapped()` on every store change**: The `useEffect` at `ProfileScreen.tsx:138` depends on `watchedMovies`, `watchedEpisodes`, `favoriteMovieIds`, `favoriteEpisodeIds`, and `watchlist`. Any change to any of these slices triggers a full re-computation including 4+ AsyncStorage reads. Note that `StatsService.computeWrapped()` re-reads from `StorageProvider` (disk) instead of using the Zustand store values that are already available in memory. | 🟠 High |

---

## 4. Optimistic Updates & Mutation Handling

### 4.1 Mutation Inventory

All mutations are **local-only** (persisted to AsyncStorage, no server sync). The Zustand store implements an optimistic-update pattern where state is updated immediately, and if `StorageProvider` throws, the state is rolled back.

| Operation | Store Method | Optimistic? | Rollback? | Severity |
|---|---|---|---|---|
| Add watched movie | `addWatchedMovie` | ✅ Yes | ✅ Yes (re-hydrate) | ✅ |
| Update watched movie | `updateWatchedMovie` | ✅ Yes | ✅ Yes (restore `prev`) | ✅ |
| Remove watched movie | `removeWatchedMovie` | ✅ Yes | ✅ Yes (restore `prev`) | ✅ |
| Mark episode watched | `markEpisodeWatched` | ✅ Yes | ✅ Yes (re-hydrate) | ✅ |
| Remove episode | `removeEpisode` | ✅ Yes | ✅ Yes (restore `prev`) | ✅ |
| Toggle favorite movie | `toggleFavoriteMovie` | ✅ Yes | ✅ Yes (inverse toggle) | ✅ |
| Toggle favorite episode | `toggleFavoriteEpisode` | ✅ Yes | ✅ Yes (inverse toggle) | ✅ |
| Add to watchlist | `addToWatchlist` | ✅ Yes | ✅ Yes (re-hydrate) | ✅ |
| Remove from watchlist | `removeFromWatchlist` | ✅ Yes | ✅ Yes (restore `prev`) | ✅ |
| Add to currently watching | `addToCurrentlyWatching` | ✅ Yes | ✅ Yes (re-hydrate) | ✅ |
| Remove currently watching | `removeFromCurrentlyWatching` | ✅ Yes | ✅ Yes (restore `prev`) | ✅ |

### 4.2 Mutation Anti-Patterns

| # | Finding | File | Severity |
|---|---|---|---|
| M-01 | **HistoryScreen bypasses store for episode edits**: `handleConfirmEpisodeEdit` calls `StorageProvider.markEpisodeAsWatched(updated)` directly, then manually triggers `fetchAndSetHistoryData()` to re-hydrate the entire store. This means: (1) no optimistic update — the UI flickers; (2) no rollback on failure; (3) a full re-hydrate is triggered instead of a surgical update. | `HistoryScreen.tsx:176-184` | 🟠 High |
| M-02 | **Rollback is silent**: All `catch` blocks in `appStore.ts` perform rollback but **log no error and show no user notification**. The user sees their action visually revert with no explanation. | `appStore.ts` (all mutation methods) | 🟡 Medium |
| M-03 | **No TMDB in-memory cache invalidation after mutations**: When the user logs a movie as watched or adds it to the watchlist, the in-memory cache for that movie's detail is not invalidated. If the user navigates away and back, the cached detail data is still served — this is acceptable for read-only TMDB data but could be stale if the app later adds server-sync capabilities. | `tmdbService.ts` | 🟢 Low |
| M-04 | **`ProfileScreen.handleClearAllData`** calls `AsyncStorage.clear()` which wipes everything, then calls `loadStats()` — but does **not** reset the Zustand store. The store still holds the old data in memory. A full app restart is needed to see the reset. | `ProfileScreen.tsx:186-188` | 🔴 Critical |
| M-05 | **`ProfileScreen.handleClearCache`** clears the DetailCache from AsyncStorage and calls `tmdbService.clearCache()`, but the `import` pattern uses `require()` synchronously mixed with `await import()` — this is inconsistent and `require('../services/DetailCache')` is called without using its return value (dead code). | `ProfileScreen.tsx:162-168` | 🟡 Medium |

---

## 5. Offline & Network Resilience

### 5.1 Offline Detection

| Feature | Implementation | Assessment |
|---|---|---|
| Network listener | `@react-native-community/netinfo` via `NetworkContext.tsx` | ✅ Properly subscribes and exposes `isOffline` via context |
| Provider wiring | Wrapped at app root in `App.tsx` | ✅ Available app-wide |

### 5.2 Offline Guard Usage

| Screen / Hook | Uses `isOffline`? | Offline Behavior | Severity |
|---|---|---|---|
| `useMovieDetail` | ✅ Yes | Skips IMDb rating + trailer fetch when offline; falls back to `DetailCache` | ✅ |
| `useEpisodeDetail` | ✅ Yes | Skips IMDb + trailer fetch; falls back to `DetailCache` for show + season | ✅ |
| `DiscoveryScreen` / `useDiscoveryData` | ✅ **Yes** | **✅ FIXED** — Guards on `isOffline`; when offline serves from `StorageProvider.getTrendingCache()` / `getTrendingMovieCache()` / `getTopRatedMovieCache()`. Writes back to persistence on every successful network fetch. | ~~🔴 Critical~~ ✅ |
| `useSearch` (search + genre discover) | ✅ **Yes** | **✅ FIXED** — `performSearch`, `handleGenreSelect`, `loadMoreGenreResults`, and `handleRefresh` all check `isOffline` and return early. The `isOffline` flag is exposed to the UI. | ~~🟠 High~~ ✅ |
| `SeasonBrowser` (toggle season) | ⚠️ Partial | `tmdbService.getSeasonDetails()` now has an `isOffline` guard at the service layer (returns `null` when offline), but `SeasonBrowser` shows no explicit user-facing message. | 🟡 Low |
| `ProfileScreen.loadStats` | N/A | Stats are computed from local data only (no network calls) | ✅ |
| `WrappedScreen.loadStats` | N/A | Same — local computation only | ✅ |
| `WatchlistScreen` | N/A | Reads from Zustand store only | ✅ |
| `HistoryScreen` | N/A | Reads from Zustand store only | ✅ |

### 5.3 Local Persistence Fallback

| Data | Persistence | Offline Available? | Severity |
|---|---|---|---|
| Watch history (movies + episodes) | ✅ AsyncStorage + Zustand | ✅ Yes — available immediately | ✅ |
| Watchlist | ✅ AsyncStorage + Zustand | ✅ Yes | ✅ |
| Favorites | ✅ AsyncStorage + Zustand | ✅ Yes | ✅ |
| Currently watching | ✅ AsyncStorage + Zustand | ✅ Yes | ✅ |
| Search history | ✅ AsyncStorage | ✅ Yes | ✅ |
| Movie detail (last viewed) | ✅ `DetailCache` → AsyncStorage | ✅ Yes — only for previously viewed items | ✅ |
| TV show detail (last viewed) | ✅ `DetailCache` → AsyncStorage | ✅ Yes | ✅ |
| Season detail (last viewed) | ✅ `DetailCache` → AsyncStorage | ✅ Yes | ✅ |
| **Trending / discovery data** | ✅ **Persisted** via `StorageProvider.setTrendingCache()` / `setTrendingMovieCache()` / `setTopRatedMovieCache()` | ✅ **Yes** — **✅ FIXED** — `useDiscoveryData` writes to and reads from AsyncStorage for offline | ~~🔴 Critical~~ ✅ |
| **Search results** | ❌ **No persistence** | ❌ **No** — search is unusable offline | 🟡 Medium |
| **IMDb ratings** | In-memory cache only (volatile) | ❌ Lost on restart | 🟡 Medium |
| **Episode detail** | ❌ **Not persisted** (only show + season are cached in `DetailCache`) | ❌ Episode-specific data unavailable offline | 🟡 Medium |

### 5.4 Missing Offline UX

| # | Finding | Severity |
|---|---|---|
| O-01 | ~~**No global offline banner**: The app detects offline state but **never shows a persistent indicator** to the user. The user has no idea they are offline until a toast appears from a failed API call.~~ **✅ FIXED** — `NetworkBanner.tsx` is implemented: a persistent animated slide-down banner reading "You're offline — showing cached data" with an icon, powered by `useAppStore(s => s.isOffline)`. | ~~🟠 High~~ ✅ |
| O-02 | ~~**DiscoveryScreen shows empty sections when offline**: Since trending data is not persisted, opening the app while offline shows an empty Discover page with section headers but no content. No "You're offline" message.~~ **✅ FIXED** — `useDiscoveryData` now reads from persisted AsyncStorage caches when offline and `NetworkBanner` is visible. | ~~🔴 Critical~~ ✅ |
| O-03 | ~~**Search shows "No results found" when offline**: Misleading — should say "Search requires a connection" or disable the search bar.~~ **✅ FIXED** — `useSearch` now bypasses all search calls when `isOffline` is true. The `isOffline` flag is returned from the hook so the UI can render an appropriate disabled state. | ~~🟠 High~~ ✅ |

---

## Fetch Inventory

| Screen / Component | Endpoint(s) | In-Memory Cache | Detail Cache (Offline) | Error Handled | Loading State | Empty State | Offline Guard | Severity |
|---|---|---|---|---|---|---|---|---|
| **DiscoveryScreen** | `/trending/tv/week` | ❌ | ✅ AsyncStorage | ⚠️ Toast only | ✅ Skeleton | ✅ Cached data shown | ✅ **FIXED** | ~~🔴~~ ✅ |
| **DiscoveryScreen** | `/trending/movie/week` | ❌ | ✅ AsyncStorage | ⚠️ Toast only | ✅ Skeleton | ✅ Cached data shown | ✅ **FIXED** | ~~🔴~~ ✅ |
| **DiscoveryScreen** | `/movie/top_rated` | ✅ | ✅ AsyncStorage | ⚠️ Toast only | ✅ Skeleton | ✅ Cached data shown | ✅ **FIXED** | ~~🟠~~ ✅ |
| **DiscoveryScreen** | `/search/multi` | ❌ | ❌ | ⚠️ Toast only | ✅ PopcornLoader | ⚠️ "No results" misleading | ✅ **FIXED** | 🟡 |
| **DiscoveryScreen** | `/discover/movie?genre` | ✅ | ❌ | ⚠️ Toast only | ✅ Spinner | ✅ Hidden | ✅ **FIXED** | 🟢 |
| **MovieDetail** | `/movie/{id}?credits` | ✅ | ✅ | ✅ Error + Retry | ✅ Skeleton | ✅ Error screen | ✅ | ✅ |
| **MovieDetail** | IMDb GraphQL | ✅ | ❌ | ✅ Toast | ⚠️ None (gradual) | N/A | ✅ Skip | ✅ |
| **MovieDetail** | `/movie/{id}/videos` | ✅ | ❌ | ✅ Toast | ⚠️ None (gradual) | N/A | ✅ Skip | ✅ |
| **EpisodeDetail** | `/tv/{id}?credits` | ✅ | ✅ | ✅ Error + Retry | ✅ Skeleton | ✅ Error screen | ✅ | ✅ |
| **EpisodeDetail** | `/tv/{id}/season/{n}` | ✅ | ✅ | ✅ Toast | ✅ Spinner | N/A | ⚠️ Partial | 🟡 |
| **EpisodeDetail** | IMDb GraphQL (show) | ✅ | ❌ | ✅ Toast | ⚠️ None (gradual) | N/A | ✅ Skip | ✅ |
| **EpisodeDetail** | IMDb GraphQL (episode) | ✅ | ❌ | ✅ Toast | ⚠️ None (gradual) | N/A | ✅ Skip | ✅ |
| **SeasonBrowser** | `/tv/{id}/season/{n}` | ✅ | ❌ | ⚠️ Toast only | ✅ Spinner | ⚠️ Season doesn't open | ⚠️ Service-layer only | 🟡 |
| **SeasonBrowser** | IMDb per-episode (batch) | ✅ | ❌ | 🟡 Silent null | ❌ None | N/A | ❌ | 🟡 |
| **ProfileScreen** | Local compute only | N/A | N/A | N/A | ⚠️ No skeleton | N/A | N/A | 🟡 |
| **WrappedScreen** | Local compute only | N/A | N/A | N/A | ✅ Spinner | ✅ Empty | N/A | ✅ |
| **WatchlistScreen** | Store only | N/A | N/A | N/A | ✅ Skeleton | ✅ Empty | N/A | ✅ |
| **HistoryScreen** | Store only | N/A | N/A | N/A | ✅ Skeleton | ✅ Empty | N/A | ✅ |

---

## Prioritized Refactoring Roadmap

| Priority | ID | Status | Task | Severity | Effort | Impact |
|---|---|---|---|---|---|---|
| **P0** | R-01 | 🔲 Open | **Adopt React Query (TanStack Query)**: Replace all hand-rolled fetching in hooks with `useQuery` / `useMutation`. This provides: deduplication of in-flight requests, shared cache keys, `staleTime` / `gcTime` tuning, automatic background refetching, devtools. Keep `tmdbService` functions as `queryFn` wrappers. | 🔴 Critical | Large | Eliminates C-01, in-flight dedup, shared caching |
| **P0** | R-02 | ✅ **Done** | ~~**Add offline guard to DiscoveryScreen**~~ — `useDiscoveryData` now checks `isOffline` and reads from `StorageProvider.getTrendingCache()` / `getTrendingMovieCache()` / `getTopRatedMovieCache()` when offline. Fresh data is written back to persistence after every successful fetch. The `NetworkBanner` is shown globally. | ~~🔴 Critical~~ | Medium | ✅ Fixes O-02, S-01 |
| **P0** | R-03 | ✅ **Done** | ~~**Persist trending data for offline**~~ — `useDiscoveryData` writes to `StorageProvider.setTrendingCache()`, `setTrendingMovieCache()`, and `setTopRatedMovieCache()` on every successful fetch. Reads from these on offline launch. | ~~🔴 Critical~~ | Medium | ✅ Fixes O-02 |
| **P0** | R-04 | 🔲 Open | **Fix `handleClearAllData` to also reset Zustand store**: After `AsyncStorage.clear()`, call `useAppStore.getState().hydrate()` or `useAppStore.setState(initialState)` to clear in-memory data. Currently `ProfileScreen.tsx:189` only calls `loadStats()` — the store retains stale data until app restart. | 🔴 Critical | Small | Fixes M-04 |
| **P1** | R-05 | ✅ **Done** | ~~**Add offline guard and UX to search**~~ — `useSearch` now guards `performSearch`, `handleGenreSelect`, `loadMoreGenreResults`, and `handleRefresh` behind `isOffline` checks. The `isOffline` flag is returned from the hook for UI-level handling. | ~~🟠 High~~ | Small | ✅ Fixes O-03, S-02 |
| **P1** | R-06 | 🔲 Open | **Cache trending API responses in-memory**: Add `getCached`/`setCache` calls to `getTrending()` and `getTrendingMovies()` in `tmdbService.ts` to match the pattern used by `getTopRatedMovies()`. Currently these two endpoints always hit the network (no in-memory TTL cache). | 🟠 High | Small | Fixes inconsistent in-memory caching |
| **P1** | R-07 | 🔲 Open | **Fix `loadMoreSearchResults` error handling**: Wrap in try/catch and ensure `setIsLoadingMore(false)` is called in a `finally` block. Same for `loadMoreGenreResults`. Currently, a thrown error leaves `isLoadingMore` stuck `true`. | 🟠 High | Small | Fixes S-04 |
| **P1** | R-08 | 🔲 Open | **Parallelize EpisodeDetail IMDb + episode detail fetches**: After show and season data resolve, fire `getIMDbRating`, `getEpisodeDetails`, and `getTVTrailer` concurrently using `Promise.all`. Currently `useEpisodeDetail.ts:121-134` awaits them sequentially. | 🟠 High | Small | Fixes W-01 |
| **P1** | R-09 | ⚠️ Partial | **Add offline guard + user message to SeasonBrowser**: `tmdbService.getSeasonDetails()` now returns `null` when offline at the service layer, but the component shows no user-facing message. Add an explicit "Offline — season unavailable" message when the toggle returns null. | 🟡 Medium | Small | Fixes SeasonBrowser offline UX |
| **P1** | R-10 | ✅ **Done** | ~~**Add global offline banner**~~ — `NetworkBanner.tsx` implemented: animated slide-down banner reading "You're offline — showing cached data" with Ionicons cloud-offline icon, powered by `useAppStore(s => s.isOffline)`. | ~~🟠 High~~ | Medium | ✅ Fixes O-01 |
| **P1** | R-11 | 🔲 Open | **Route HistoryScreen episode edits through Zustand store**: Replace direct `StorageProvider.markEpisodeAsWatched()` call in `HistoryScreen.tsx:176` (`handleConfirmEpisodeEdit`) with the store's `markEpisodeWatched()` action to get optimistic updates and rollback. | 🟠 High | Small | Fixes M-01 |
| **P1** | R-12 | 🔲 Open | **Fix ProfileScreen stats to use store data**: Change `StatsService.computeWrapped()` to accept data parameters instead of re-reading from `StorageProvider`. Pass `watchedMovies`, `watchedEpisodes` from Zustand directly. This eliminates redundant AsyncStorage reads and the stale `getWatchlist()` call. | 🟠 High | Medium | Fixes C-02, W-04, F-02 |
| **P2** | R-13 | 🔲 Open | **Cache `getEpisodeImdbId()` responses**: Add in-memory caching (like other endpoints) so repeated calls for the same episode don't re-fetch the external ID. | 🟡 Medium | Small | Fixes inconsistency |
| **P2** | R-14 | 🔲 Open | **Add episode detail to DetailCache**: Extend `DetailCache` to persist episode-specific data (not just show + season) for offline access. | 🟡 Medium | Small | Improves offline coverage |
| **P2** | R-15 | 🔲 Open | **Surface rollback errors to user**: In `appStore.ts` mutation catch blocks, call `notifyErrorGlobal` with a user-friendly message (e.g., "Couldn't save — change reverted"). | 🟡 Medium | Small | Fixes M-02 |
| **P2** | R-16 | 🔲 Open | **Upgrade cache eviction to LRU**: Replace FIFO eviction with access-time-based LRU to keep frequently used entries warm. | 🟡 Medium | Medium | Better cache hit rates |
| **P2** | R-17 | 🔲 Open | **Deduplicate in-flight requests**: Wrap `tmdbClient.get()` calls with a pending-request map to ensure two concurrent requests for the same URL share a single network call. | 🟡 Medium | Medium | Reduces redundant calls |
| **P3** | R-18 | 🔲 Open | **Fix `handleClearCache` dead `require()` call**: Remove the unused `require('../services/DetailCache')` at `ProfileScreen.tsx:164` — it is called without using its return value. | 🟢 Low | Trivial | Code hygiene |
| **P3** | R-19 | 🔲 Open | **Persist IMDb ratings to DetailCache**: Add IMDb rating data to persisted detail cache entries so ratings survive app restarts. | 🟢 Low | Small | Better offline experience |
| **P3** | R-20 | 🔲 Open | **Consider MMKV for hot-path storage**: Replace AsyncStorage with `react-native-mmkv` for synchronous reads and better performance on the critical hydration path. | 🟢 Low | Large | Performance improvement |
