# Sidetrack — Backend Architecture Analysis

## Step 1 · Workspace Analysis

### Entity Table

| Entity name | Source file | Persistence key(s) | CRUD operations found |
|---|---|---|---|
| `WatchedEpisode` | `src/types/index.ts` | `@sidetrack_watched` (legacy), `@sidetrack_watched_v2:{seriesId}` (partitioned) | Create (markEpisodeAsWatched), Read (getWatchedEpisode, getAllWatchedEpisodes, getWatchedEpisodesForShow), Update (markEpisodeAsWatched upsert), Delete (removeWatchedEpisode) |
| `WatchedMovie` | `src/types/index.ts` | `@sidetrack_watched_movies` | Create (addToWatchedMovies), Read (getWatchedMovies, isMovieWatched), Update (updateWatchedMovie, updateWatchedMovieRating), Delete (removeFromWatchedMovies) |
| `QueuedItem` | `src/types/index.ts` | `@sidetrack_watchlist` | Create (addToWatchlist), Read (getWatchlist), Delete (removeFromWatchlist) |
| `FavoriteMovie` | `src/types/index.ts` | `@sidetrack_favorite_movies` | Create/Delete via toggle (toggleFavoriteMovie), Read (isMovieFavorite, getAllFavoriteMovies) |
| `FavoriteEpisode` (no named type — `Record<number, boolean>`) | `src/services/StorageProvider.ts` | `@sidetrack_favorites` | Create/Delete via toggle (toggleFavoriteEpisode), Read (isEpisodeFavorite, getAllFavorites) |
| `CurrentlyWatchingItem` | `src/types/index.ts` | `@sidetrack_currently_watching` | Create/Update (addToCurrentlyWatching), Read (getCurrentlyWatching), Delete (removeFromCurrentlyWatching) |
| `SearchResult` (search history) | `src/types/index.ts` | `@sidetrack_search_history` | Create (addSearchHistoryItem), Read (getSearchHistory), Delete (removeSearchHistoryItem, clearSearchHistory) |
| `WrappedStats` | `src/services/StatsService.ts` | — (derived/computed, never persisted) | Read-only, computed from WatchedMovie + WatchedEpisode |
| `TVShowDetail` | `src/types/index.ts` | `@sidetrack_detail_cache_tv_{id}` | Read (getCachedTVShowDetail), Write (cacheTVShowDetail) — offline cache only |
| `MovieDetail` | `src/types/index.ts` | `@sidetrack_detail_cache_movie_{id}` | Read (getCachedMovieDetail), Write (cacheMovieDetail) — offline cache only |
| `SeasonDetail` | `src/types/index.ts` | `@sidetrack_detail_cache_season_{tvId}_{season}` | Read (getCachedSeasonDetail), Write (cacheSeasonDetail) — offline cache only |

---

### Persistence Layer Summary

All persistence is via `@react-native-async-storage/async-storage`. No MMKV, SecureStore, or SQLite in use.

| Key | Shape | Notes |
|---|---|---|
| `@sidetrack_watched` | `Record<number, WatchedEpisode>` | Legacy; superseded by v2 partitions |
| `@sidetrack_watched_v2:{seriesId}` | `WatchedEpisode[]` | One key per show (partitioned) |
| `@sidetrack_favorites` | `Record<number, boolean>` | Episode-level favorites only |
| `@sidetrack_watchlist` | `Record<string, QueuedItem>` | Key format: `{itemType}_{itemId}` |
| `@sidetrack_watched_movies` | `Record<string, WatchedMovie>` | Key format: `{movieId}_{watchedDate}` (supports rewatches) |
| `@sidetrack_favorite_movies` | `Record<number, FavoriteMovie>` | |
| `@sidetrack_currently_watching` | `CurrentlyWatchingItem[]` | |
| `@sidetrack_search_history` | `SearchResult[]` | Capped at 10 entries |
| `@sidetrack_onboarding_complete` | `'true'` string | |
| `@sidetrack_consent_given` | `'true'` \| `'false'` string | GDPR consent |
| `@tmdb_api_key` | string | User-supplied TMDB API key |
| `@cache_trending_tv` | `SearchResult[]` | Discovery screen offline cache |
| `@cache_trending_movie` | `SearchResult[]` | Discovery screen offline cache |
| `@cache_top_rated_movie` | `SearchResult[]` | Discovery screen offline cache |
| `@sidetrack_detail_cache_{kind}_{id}` | `CacheEnvelope<TVShowDetail\|MovieDetail\|SeasonDetail>` | 7-day TTL, max 50 entries; evicted on startup |
| `@sidetrack_partition_migrated` | `'true'` flag | One-time migration marker |

---

### Business Logic (Zustand Store — `src/store/appStore.ts`)

| Action | Reads | Writes | Notes |
|---|---|---|---|
| `hydrate()` | All storage keys | In-memory state | Called once at app start |
| `addWatchedMovie` | — | `watchedMovies[]` + storage | Optimistic with rollback |
| `updateWatchedMovie` | `watchedMovies[]` | `watchedMovies[]` + storage | Matches by `movieId + watchedDate` |
| `removeWatchedMovie` | `watchedMovies[]` | `watchedMovies[]` + storage | Matches by `movieId + watchedDate` |
| `markEpisodeWatched` | `watchedEpisodes[]` | `watchedEpisodes[]` + storage | Upsert by `episodeId` |
| `removeEpisode` | `watchedEpisodes[]` | `watchedEpisodes[]` + storage | |
| `toggleFavoriteMovie` | `favoriteMovieIds` | `favoriteMovieIds` set + storage | Optimistic with rollback |
| `toggleFavoriteEpisode` | `favoriteEpisodeIds` | `favoriteEpisodeIds` set + storage | Optimistic with rollback |
| `addToWatchlist` | `watchlist[]` | `watchlist[]` + storage | De-dupes by `itemId + itemType` |
| `removeFromWatchlist` | `watchlist[]` | `watchlist[]` + storage | |
| `addToCurrentlyWatching` | `currentlyWatching[]` | `currentlyWatching[]` + storage | Upserts; stamps `lastUpdated` |
| `removeFromCurrentlyWatching` | `currentlyWatching[]` | `currentlyWatching[]` + storage | |
| `setConsentGiven` | — | `consentGiven` + storage | |
| `setTmdbApiKey` | — | `tmdbApiKey` + storage | |
| `setIsOffline` | — | `isOffline` (in-memory only) | |

> **Derived state**: `WrappedStats` is computed on-demand by `StatsService.computeWrapped()` from `watchedMovies` + `watchedEpisodes` stored in AsyncStorage; it is never persisted.

---

## Step 2 · Architecture Proposal

### 1. MongoDB Collections

#### `users`

Minimal user model — expand when auth is added.

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `email` | `String` | unique, required |
| `passwordHash` | `String` | required |
| `createdAt` | `Date` | auto |

---

#### `watched_episodes`

Stores one document per watched-episode log (supports rewatches via `episodeId`).

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `episodeId` | `Number` | required |
| `seriesId` | `Number` | required |
| `seriesName` | `String` | |
| `episodeName` | `String` | |
| `stillPath` | `String` | nullable |
| `seasonNumber` | `Number` | required |
| `episodeNumber` | `Number` | required |
| `rating` | `Number` | nullable, min 0 max 5 |
| `watchedDate` | `Date` | required |
| `liked` | `Boolean` | default false |
| `review` | `String` | |
| `tags` | `[String]` | default [] |
| `rewatch` | `Boolean` | default false |
| `noSpoilers` | `Boolean` | default false |
| `runtime` | `Number` | minutes |
| `genres` | `[String]` | |
| `createdAt` | `Date` | auto |
| `updatedAt` | `Date` | auto |

**Indexes**: `{ userId, seriesId }`, `{ userId, episodeId }`, `{ userId, watchedDate: -1 }`

---

#### `watched_movies`

One document per watch-log entry (supports rewatches via composite key).

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `movieId` | `Number` | required |
| `title` | `String` | required |
| `posterPath` | `String` | nullable |
| `backdropPath` | `String` | nullable |
| `rating` | `Number` | nullable, min 0 max 5 |
| `watchedDate` | `Date` | required |
| `runtime` | `Number` | required (minutes) |
| `releaseDate` | `String` | |
| `genres` | `[String]` | |
| `overview` | `String` | |
| `liked` | `Boolean` | default false |
| `review` | `String` | |
| `tags` | `[String]` | default [] |
| `rewatch` | `Boolean` | default false |
| `noSpoilers` | `Boolean` | default false |
| `createdAt` | `Date` | auto |
| `updatedAt` | `Date` | auto |

**Indexes**: `{ userId, movieId, watchedDate }` (unique composite to prevent accidental duplicate logs), `{ userId, watchedDate: -1 }`

---

#### `watchlist`

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `itemId` | `Number` | required |
| `itemType` | `String` | required, enum `['tv', 'movie']` |
| `name` | `String` | required |
| `posterPath` | `String` | nullable |
| `addedDate` | `Date` | required |

**Indexes**: `{ userId, itemId, itemType }` (unique), `{ userId, addedDate: -1 }`

---

#### `favorite_movies`

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `movieId` | `Number` | required |
| `title` | `String` | required |
| `posterPath` | `String` | nullable |
| `addedDate` | `Date` | required |

**Indexes**: `{ userId, movieId }` (unique)

---

#### `favorite_episodes`

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `episodeId` | `Number` | required |

**Indexes**: `{ userId, episodeId }` (unique)

---

#### `currently_watching`

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `userId` | `ObjectId` | required, ref `users` |
| `seriesId` | `Number` | required |
| `name` | `String` | required |
| `posterPath` | `String` | nullable |
| `lastUpdated` | `Date` | required |

**Indexes**: `{ userId, seriesId }` (unique), `{ userId, lastUpdated: -1 }`

---

### 2. REST API Surface

#### Auth

| Method | Route | Description | Auth required? |
|---|---|---|---|
| POST | `/api/auth/register` | Create user account | No |
| POST | `/api/auth/login` | Return JWT | No |
| POST | `/api/auth/logout` | Invalidate token | Yes |

---

#### Watched Episodes

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/episodes/watched` | All watched episodes (paginated, sorted by date desc) | Yes |
| GET | `/api/episodes/watched/series/:seriesId` | All watched episodes for a show | Yes |
| GET | `/api/episodes/watched/:episodeId` | Single watch log | Yes |
| POST | `/api/episodes/watched` | Log a watched episode (upsert by `episodeId`) | Yes |
| PUT | `/api/episodes/watched/:episodeId` | Update rating/review/tags etc. | Yes |
| DELETE | `/api/episodes/watched/:episodeId` | Remove from history | Yes |

---

#### Watched Movies

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/movies/watched` | All watched movies (paginated, sorted by date desc) | Yes |
| GET | `/api/movies/watched/:movieId` | Get most recent log for a movie | Yes |
| POST | `/api/movies/watched` | Log a watched movie | Yes |
| PUT | `/api/movies/watched/:movieId` | Update rating/review (`watchedDate` in body for rewatch disambiguation) | Yes |
| DELETE | `/api/movies/watched/:movieId` | Remove from history (`watchedDate` as query param for rewatch disambiguation) | Yes |

---

#### Watchlist

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/watchlist` | Get all watchlist items | Yes |
| POST | `/api/watchlist` | Add item (`itemId`, `itemType`, metadata) | Yes |
| DELETE | `/api/watchlist/:itemType/:itemId` | Remove item | Yes |

---

#### Favorites — Movies

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/favorites/movies` | List all favorite movies | Yes |
| POST | `/api/favorites/movies/:movieId` | Add to favorites | Yes |
| DELETE | `/api/favorites/movies/:movieId` | Remove from favorites | Yes |

---

#### Favorites — Episodes

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/favorites/episodes` | List all favorite episode IDs | Yes |
| POST | `/api/favorites/episodes/:episodeId` | Add to favorites | Yes |
| DELETE | `/api/favorites/episodes/:episodeId` | Remove from favorites | Yes |

---

#### Currently Watching

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/currently-watching` | List in-progress shows | Yes |
| POST | `/api/currently-watching` | Add/update a show | Yes |
| DELETE | `/api/currently-watching/:seriesId` | Remove from list | Yes |

---

#### Stats (Wrapped)

| Method | Route | Description | Auth required? |
|---|---|---|---|
| GET | `/api/stats/wrapped?year=2025` | Compute and return `WrappedStats` for a given year | Yes |

---

### 3. Migration Notes

| Item | Storage key | Recommendation |
|---|---|---|
| **TMDB API Key** | `@tmdb_api_key` | **Do not migrate to backend user documents.** This is a user-supplied credential for the external TMDB API. In a backend, it should either be a single server-side env var or, if the app remains user-key-based, stored as an encrypted user setting — never in a plain DB field. |
| **GDPR Consent flag** | `@sidetrack_consent_given` | **Do not migrate as structured data.** Store as a user profile field (`consentGiven: boolean`, `consentDate: Date`) for audit purposes if legally required, otherwise keep client-side. |
| **Onboarding complete flag** | `@sidetrack_onboarding_complete` | **Do not migrate.** Purely ephemeral UI state; can remain in AsyncStorage or be derived from whether the user has any watch history. |
| **Discovery cache** | `@cache_trending_tv`, `@cache_trending_movie`, `@cache_top_rated_movie` | **Do not migrate.** These are short-lived offline caches of TMDB API responses. In a backend architecture, the server can proxy/cache TMDB calls server-side with a TTL; the client does not need to persist these. |
| **Detail page cache** | `@sidetrack_detail_cache_*` | **Do not migrate.** These are offline fallback caches for TMDB detail data. Should be replaced by server-side TMDB proxying with HTTP caching headers (`Cache-Control`, ETags). |
| **`isOffline` flag** | Zustand in-memory only | **Do not migrate.** Pure transient UI state. |
| **`WrappedStats`** | Never persisted | **Computed on the server** via `/api/stats/wrapped` endpoint, aggregating from `watched_episodes` + `watched_movies`. No migration needed. |
| **Legacy storage keys** (`@sidetrack_watched`, `@sidetrack_partition_migrated`) | AsyncStorage | **Do not migrate.** These are migration-era artifacts from the local partitioning refactor; irrelevant once data is loaded into MongoDB. |
| **Search history** | `@sidetrack_search_history` | **Optional migration.** This is UI-convenience state (recently tapped search results). Could be migrated as a lightweight user preference, but the value is low and it can safely remain client-side. |
