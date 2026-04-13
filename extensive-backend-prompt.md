# BUILD THE SIDETRACK BACKEND

You are building a **complete, production-ready Node.js backend** from scratch. Generate **every file** with fully working code — no placeholders, no TODOs, no "implement later" comments.

---

## YOUR TASK

Build a REST API backend for **Sidetrack**, a React Native app that tracks movies and TV shows. The app currently stores everything locally on-device. You are building the server that will replace that.

**You must build:**

1. A **JWT-authenticated REST API** with 40+ endpoints across 11 route groups
2. A **TMDB/IMDb proxy layer** so the API key stays server-side (the app currently calls TMDB directly — you are moving those calls to the backend)
3. A **Wrapped stats engine** that computes ~50 year-in-review analytics from the user's watch history
4. A **migration endpoint** for bulk-importing existing on-device data
5. **Comprehensive tests** (unit + integration)

**You must NOT:**
- Modify any frontend code
- Use placeholder implementations
- Skip any endpoint listed below

---

## TECH STACK (use exactly these)

| Layer | Technology |
|---|---|
| Runtime | Node.js v20+, TypeScript (strict mode) |
| Framework | Express.js |
| Database | MongoDB + Mongoose ODM |
| Auth | JWT (access + refresh token rotation) + bcryptjs (12 rounds) |
| Validation | Zod (every endpoint, every request body/param/query) |
| HTTP client | Axios (for TMDB/IMDb proxy) |
| Caching | node-cache (in-memory, for TMDB proxy) |
| Rate limiting | express-rate-limit (3 tiers: auth, general, TMDB) |
| Security | helmet, cors |
| Logging | winston (structured logs) |
| Testing | Jest + supertest + mongodb-memory-server |
| Config | dotenv |

---

## FILE STRUCTURE (generate every file)

```
backend/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.ts
├── src/
│   ├── index.ts                          # Express app bootstrap, middleware, route mounting
│   ├── config/
│   │   ├── database.ts                   # Mongoose connection
│   │   ├── env.ts                        # Env var validation with Zod
│   │   └── logger.ts                     # Winston setup
│   ├── middleware/
│   │   ├── auth.ts                       # JWT verification → req.user
│   │   ├── validate.ts                   # Zod middleware factory
│   │   ├── rateLimiter.ts                # 3 rate-limit tiers
│   │   └── errorHandler.ts              # Global error handler
│   ├── models/
│   │   ├── User.ts
│   │   ├── WatchedEpisode.ts
│   │   ├── WatchedMovie.ts
│   │   ├── Watchlist.ts
│   │   ├── FavoriteMovie.ts
│   │   ├── FavoriteEpisode.ts
│   │   ├── CurrentlyWatching.ts
│   │   └── SearchHistory.ts
│   ├── schemas/                          # Zod request validation schemas
│   │   ├── auth.schema.ts
│   │   ├── episode.schema.ts
│   │   ├── movie.schema.ts
│   │   ├── watchlist.schema.ts
│   │   ├── favorite.schema.ts
│   │   ├── currentlyWatching.schema.ts
│   │   ├── searchHistory.schema.ts
│   │   └── common.schema.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── episode.routes.ts
│   │   ├── movie.routes.ts
│   │   ├── watchlist.routes.ts
│   │   ├── favorite.routes.ts
│   │   ├── currentlyWatching.routes.ts
│   │   ├── searchHistory.routes.ts
│   │   ├── stats.routes.ts
│   │   ├── tmdb.routes.ts
│   │   └── migrate.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── episode.controller.ts
│   │   ├── movie.controller.ts
│   │   ├── watchlist.controller.ts
│   │   ├── favorite.controller.ts
│   │   ├── currentlyWatching.controller.ts
│   │   ├── searchHistory.controller.ts
│   │   ├── stats.controller.ts
│   │   ├── tmdb.controller.ts
│   │   └── migrate.controller.ts
│   ├── services/
│   │   ├── auth.service.ts               # Password hashing, JWT sign/verify, refresh rotation
│   │   ├── tmdb.service.ts               # TMDB/IMDb proxy with cache + dedup + concurrency limiter
│   │   ├── stats.service.ts              # Full Wrapped computation (ported from frontend)
│   │   └── migration.service.ts          # Bulk import logic
│   ├── types/
│   │   └── index.ts                      # All TypeScript interfaces
│   ├── utils/
│   │   ├── asyncHandler.ts               # try/catch wrapper for async route handlers
│   │   └── concurrencyLimiter.ts         # Generic promise-based concurrency limiter
│   └── scripts/
│       └── seed.ts                       # Dev seed script
├── tests/
│   ├── setup.ts                          # mongodb-memory-server setup/teardown
│   ├── helpers/
│   │   ├── auth.helper.ts               # createTestUser(), getAuthToken(), etc.
│   │   └── fixtures.ts                   # Reusable test data
│   ├── unit/
│   │   ├── stats.service.test.ts
│   │   ├── auth.service.test.ts
│   │   └── validation.test.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── episodes.test.ts
│       ├── movies.test.ts
│       ├── watchlist.test.ts
│       ├── favorites.test.ts
│       ├── currentlyWatching.test.ts
│       ├── searchHistory.test.ts
│       ├── stats.test.ts
│       ├── tmdb.test.ts
│       └── migrate.test.ts
```

---

## WHAT THE APP DOES (context for building the right API)

Users log watched movies and TV episodes with rich metadata: 0-5 star rating (half-star increments), text review (max 2000 chars), comma-separated tags, liked boolean, rewatch boolean, no-spoilers boolean, and a watched date. They maintain a watchlist of movies/shows to watch, favorite individual movies and episodes, and track which TV shows they're "currently watching." The app computes ~50 year-in-review stats ("Wrapped") from the user's history. It also fetches movie/TV data from TMDB and IMDb ratings from IMDb's GraphQL API.

Currently the app does all this client-side with AsyncStorage. Your backend replaces that entirely.

---

## DATA MODELS

These are the exact TypeScript types from the frontend. Your Mongoose schemas and Zod validators must match these field-for-field. Add `userId` (ObjectId ref) to every user-data schema.

### User data types the backend must store:

```typescript
// Logged when a user marks an episode as watched
interface WatchedEpisode {
  episodeId: number;        // TMDB episode ID — unique per user (upsert key)
  seriesId: number;         // TMDB TV show ID
  seriesName?: string;
  episodeName?: string;
  stillPath?: string | null;
  seasonNumber: number;
  episodeNumber: number;
  rating: number | null;    // null = unrated, 0–5 stars (half-star increments)
  watchedDate: string;      // ISO 8601
  liked?: boolean;
  review?: string;
  tags?: string[];
  rewatch?: boolean;
  noSpoilers?: boolean;
  runtime?: number;         // minutes
  genres?: string[];        // show genres at time of logging
}

// Logged when a user marks a movie as watched
// Supports rewatches: same movieId with different watchedDate = separate entries
interface WatchedMovie {
  movieId: number;          // TMDB movie ID
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;    // null = unrated, 0–5 stars
  watchedDate: string;      // ISO 8601 — part of composite unique key with movieId
  runtime: number;          // minutes
  releaseDate: string;
  genres: string[];
  overview: string;
  liked?: boolean;
  review?: string;
  tags?: string[];
  rewatch?: boolean;
  noSpoilers?: boolean;
}

// A show the user is actively binging (auto-managed)
interface CurrentlyWatchingItem {
  seriesId: number;
  name: string;
  posterPath: string | null;
  lastUpdated: string;      // ISO date — updated on every episode log for this show
}

// A movie or show the user wants to watch later
interface QueuedItem {
  itemId: number;           // TMDB ID
  name: string;
  posterPath: string | null;
  addedDate: string;
  itemType: 'tv' | 'movie'; // part of composite unique key with itemId
}

// A favorited movie (with metadata for display)
interface FavoriteMovie {
  movieId: number;
  title: string;
  posterPath: string | null;
  addedDate: string;
}

// A favorited episode (just the ID, no metadata)
// Stored as: { episodeId: number } per document
```

### TMDB response types (returned by your proxy endpoints — pass through as-is from TMDB):

```typescript
interface SearchResult {
  id: number;
  name?: string;           // TV shows
  title?: string;          // Movies
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
  media_type: 'tv' | 'movie' | 'person';
}

interface TVShowDetail {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  seasons: { air_date: string; episode_count: number; id: number; name: string; overview: string; poster_path: string | null; season_number: number }[];
  status: string;
  genres: { id: number; name: string }[];
  external_ids?: { imdb_id?: string };
  credits?: { cast: CreditPerson[]; crew: CreditPerson[] };
}

interface MovieDetail {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  status: string;
  imdb_id?: string;
  credits?: { cast: CreditPerson[]; crew: CreditPerson[] };
}

interface SeasonDetail {
  air_date: string; episode_count: number; id: number; name: string;
  overview: string; poster_path: string | null; season_number: number;
  episodes: {
    air_date: string; episode_number: number; id: number; name: string;
    overview: string; still_path: string | null; vote_average: number;
    season_number: number; runtime?: number;
  }[];
}

interface EpisodeDetailData {
  air_date: string; episode_number: number; id: number; name: string;
  overview: string; still_path: string | null; vote_average: number;
  season_number: number; runtime?: number; vote_count?: number;
  crew?: CreditPerson[]; guest_stars?: CreditPerson[];
  credits?: { cast: CreditPerson[]; crew: CreditPerson[] };
  images?: { stills: { file_path: string; width: number; height: number }[] };
}

interface CreditPerson {
  id: number; name: string; character?: string;
  profile_path: string | null; job?: string; department?: string;
}
```

### Wrapped stats type (computed and returned by `GET /api/stats/wrapped`):

```typescript
interface WrappedStats {
  totalMovies: number;
  totalEpisodes: number;
  totalHoursWatched: number;
  longestMovie: { title: string; runtime: number } | null;
  busiestDay: { date: string; count: number } | null;
  busiestMonth: { month: string; count: number } | null;
  avgPerWeek: number;
  avgMovieRating: number;
  avgEpisodeRating: number;
  ratingDistribution: Record<string, number>;
  highestRatedMovies: { title: string; rating: number; posterPath: string | null }[];
  lowestRatedMovies: { title: string; rating: number; posterPath: string | null }[];
  highestRatedShows: { name: string; avgRating: number; posterPath: string | null; episodeCount: number }[];
  topGenres: { genre: string; count: number }[];
  genreByAvgRating: { genre: string; avgRating: number }[];
  longestStreak: number;
  busiestDayOfWeek: { day: string; count: number } | null;
  firstLog: { title: string; date: string } | null;
  lastLog: { title: string; date: string } | null;
  monthlyActivity: Record<string, number>;
  uniqueShowsWatched: number;
  showsWithMostEpisodes: { name: string; count: number }[];
  fastestBinge: { name: string; days: number; episodes: number } | null;
  totalSeasonsStarted: number;
  decadeBreakdown: Record<string, number>;
  oldestMovie: { title: string; year: number } | null;
  newestMovie: { title: string; year: number } | null;
  avgMovieRuntime: number;
  rewatchCount: number;
  totalLikes: number;
  totalFavorites: number;
  likeRatio: number;
  totalReviews: number;
  avgReviewLength: number;
  topTags: { tag: string; count: number }[];
  personalityType: { label: string; emoji: string; description: string };
  funTimeEquivalent: string;
  totalEntries: number;
}
```

---

## MONGODB SCHEMAS TO CREATE

Create these 8 Mongoose models. Every user-data model has a `userId` field (ObjectId, required, ref 'User'). Use `{ timestamps: true }` on all.

### 1. `User`
Fields: `email` (unique, lowercase, trimmed), `username` (unique, 3-30 chars), `passwordHash`, `refreshTokens: [{ token: String, expiresAt: Date }]`, `consentGiven` (Boolean), `consentDate` (Date).

### 2. `WatchedEpisode`
All fields from the `WatchedEpisode` type above, plus `userId`.
**Indexes**: `{ userId, episodeId }` unique, `{ userId, seriesId }`, `{ userId, watchedDate: -1 }`.
The `rating` field is nullable (null = unrated), min 0, max 5. `review` maxlength 2000.

### 3. `WatchedMovie`
All fields from `WatchedMovie` type, plus `userId`.
**Indexes**: `{ userId, movieId, watchedDate }` unique (enables rewatches with different dates), `{ userId, watchedDate: -1 }`.

### 4. `Watchlist`
Fields: `userId`, `itemId` (Number), `itemType` ('tv' | 'movie'), `name`, `posterPath`, `addedDate`.
**Indexes**: `{ userId, itemId, itemType }` unique, `{ userId, addedDate: -1 }`.

### 5. `FavoriteMovie`
Fields: `userId`, `movieId`, `title`, `posterPath`, `addedDate`.
**Indexes**: `{ userId, movieId }` unique.

### 6. `FavoriteEpisode`
Fields: `userId`, `episodeId`.
**Indexes**: `{ userId, episodeId }` unique.

### 7. `CurrentlyWatching`
Fields: `userId`, `seriesId`, `name`, `posterPath`, `lastUpdated`.
**Indexes**: `{ userId, seriesId }` unique, `{ userId, lastUpdated: -1 }`.

### 8. `SearchHistory`
Fields: `userId`, `itemId` (Number), `mediaType` ('tv' | 'movie'), `name`, `posterPath`, `addedAt`.
**Indexes**: `{ userId, itemId, mediaType }` unique, `{ userId, addedAt: -1 }`.

---

## AUTHENTICATION SYSTEM TO BUILD

### Endpoints

**`POST /api/auth/register`** — `{ email, username, password }` → hash password (bcrypt, 12 rounds), create user, return `{ user, accessToken, refreshToken }`. 400 on validation fail, 409 if email/username taken.

**`POST /api/auth/login`** — `{ email, password }` → find user, compare hash, issue tokens. 401 on bad credentials.

**`POST /api/auth/refresh`** — `{ refreshToken }` → verify, rotate (invalidate old, issue new pair). 401 on invalid/expired.

**`POST /api/auth/logout`** — `{ refreshToken }` (auth required) → remove refresh token from user document.

### Token rules
- Access token: 15 min expiry, payload: `{ userId, email }`
- Refresh token: 30 day expiry, stored hashed in user.refreshTokens array
- Rotation: every refresh invalidates the old token and issues a new pair

### Auth middleware
Extract `Authorization: Bearer <token>`, verify JWT, attach `req.user = { userId, email }`. Return 401 on failure. Apply to all routes except auth and public TMDB proxy endpoints.

---

## ALL REST ENDPOINTS TO BUILD

Every endpoint below requires auth (`Authorization: Bearer <token>`) unless marked "public". Every request body/params/query must be validated with Zod. All responses use consistent JSON structure.

### Watched Episodes — CRUD + business logic

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/episodes/watched` | List all, sorted by watchedDate desc. Query: `page`, `limit` (default 50), `seriesId` (optional filter). Response: `{ data, total, page, totalPages }` |
| `GET` | `/api/episodes/watched/:episodeId` | Get one. 404 if not found. |
| `GET` | `/api/episodes/watched/series/:seriesId` | All episodes for one show, sorted by date desc. |
| `POST` | `/api/episodes/watched` | **Upsert** by userId+episodeId. Body: full WatchedEpisode. Response: `{ data, created: boolean }`. **CRITICAL SIDE EFFECT**: after upserting, auto-upsert the show into `currently_watching` (update lastUpdated to now). |
| `PUT` | `/api/episodes/watched/:episodeId` | Partial update. 404 if not found. |
| `DELETE` | `/api/episodes/watched/:episodeId` | Remove. 404 if not found. |

### Watched Movies — CRUD with rewatch support

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/movies/watched` | List all, sorted by date desc. Query: `page`, `limit`. Response: `{ data, total, page, totalPages }` |
| `GET` | `/api/movies/watched/:movieId` | Get most recent entry for this movie. 404 if never watched. |
| `POST` | `/api/movies/watched` | Create new entry. Composite unique key: userId+movieId+watchedDate. 409 on duplicate. |
| `PUT` | `/api/movies/watched/:movieId` | Update entry. Query: `watchedDate` (required for rewatch disambiguation). Body: `oldWatchedDate` if changing the date. |
| `DELETE` | `/api/movies/watched/:movieId` | Remove entry. Query: `watchedDate` for disambiguation. |

### Watchlist — deduplicated by itemId+itemType

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/watchlist` | List all, sorted by addedDate desc. Query: `type` ('tv' \| 'movie') optional filter. |
| `POST` | `/api/watchlist` | Add item. Body: `{ itemId, name, posterPath, addedDate, itemType }`. Idempotent — if exists, return it. Response: `{ data, created }`. |
| `DELETE` | `/api/watchlist/:itemType/:itemId` | Remove. 404 if not found. |

### Favorite Movies

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/favorites/movies` | List all. |
| `POST` | `/api/favorites/movies` | Add. Body: `{ movieId, title, posterPath, addedDate }`. Idempotent. |
| `DELETE` | `/api/favorites/movies/:movieId` | Remove. |

### Favorite Episodes

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/favorites/episodes` | Return `{ episodeIds: number[] }`. |
| `POST` | `/api/favorites/episodes` | Add. Body: `{ episodeId }`. Idempotent. |
| `DELETE` | `/api/favorites/episodes/:episodeId` | Remove. |

### Currently Watching — auto-managed, also manually controllable

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/currently-watching` | List all, sorted by lastUpdated desc. |
| `POST` | `/api/currently-watching` | Upsert by seriesId. Body: `{ seriesId, name, posterPath }`. Sets lastUpdated to now. |
| `DELETE` | `/api/currently-watching/:seriesId` | Remove. |

### Search History — capped at 10

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/search-history` | Return max 10, most recent first. |
| `POST` | `/api/search-history` | Add item. Dedupes by itemId+mediaType. If >10 entries, delete oldest. Body: `{ id, name?, title?, poster_path, backdrop_path, overview, first_air_date?, release_date?, vote_average, media_type }` |
| `DELETE` | `/api/search-history/:mediaType/:itemId` | Remove one. |
| `DELETE` | `/api/search-history` | Clear all. |

### Stats

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/stats/wrapped` | Compute full WrappedStats. Query: `year` (optional, defaults to current year). See "WRAPPED COMPUTATION" section. |
| `GET` | `/api/stats/quick` | Return: `{ totalMovies, totalEpisodes, totalHoursWatched, totalFavorites, watchlistCount, longestStreak, personalityType }` |

### Migration

| Method | Route | What it does |
|---|---|---|
| `POST` | `/api/migrate/import` | Bulk import from AsyncStorage format. Body shape and logic detailed in "MIGRATION" section. |

### TMDB Proxy (public endpoints — no auth, just rate limiting)

| Method | Route | Proxies to |
|---|---|---|
| `GET` | `/api/tmdb/search?q=...&page=1` | `GET /search/multi` → filter out `person`, return `{ results, hasNextPage }` |
| `GET` | `/api/tmdb/trending/tv` | `GET /trending/tv/week` |
| `GET` | `/api/tmdb/trending/movies` | `GET /trending/movie/week` |
| `GET` | `/api/tmdb/top-rated/movies` | `GET /movie/top_rated` → inject `media_type: 'movie'` on each result |
| `GET` | `/api/tmdb/discover/genre/:genreId?page=1` | `GET /discover/movie?with_genres={id}&sort_by=popularity.desc` |
| `GET` | `/api/tmdb/tv/:tvId` | `GET /tv/{id}?append_to_response=credits` + `GET /tv/{id}/external_ids` → merge |
| `GET` | `/api/tmdb/movie/:movieId` | `GET /movie/{id}?append_to_response=credits` |
| `GET` | `/api/tmdb/tv/:tvId/season/:seasonNumber` | `GET /tv/{id}/season/{n}` |
| `GET` | `/api/tmdb/tv/:tvId/season/:s/episode/:e` | `GET /tv/{id}/season/{s}/episode/{e}?append_to_response=credits,images` |
| `GET` | `/api/tmdb/tv/:tvId/season/:s/episode/:e/external-ids` | `GET /tv/{id}/season/{s}/episode/{e}/external_ids` → `{ imdb_id }` |
| `GET` | `/api/tmdb/imdb/:imdbId/rating` | `POST https://graphql.imdb.com` with query `{ title(id:$id) { ratingsSummary { aggregateRating voteCount } } }` → `{ imdbRating, imdbVotes }` |
| `GET` | `/api/tmdb/movie/:movieId/trailer` | `GET /movie/{id}/videos` → filter YouTube+Trailer, prefer official → `{ key }` |
| `GET` | `/api/tmdb/tv/:tvId/trailer` | `GET /tv/{id}/videos` → same filter → `{ key }` |

---

## TMDB PROXY SERVICE TO BUILD

Build `src/services/tmdb.service.ts` with these requirements:

1. **Single server-side TMDB API key** from env var `TMDB_API_KEY`. Attach via Axios interceptor — if key > 50 chars, use `Authorization: Bearer`, otherwise `?api_key=`.
2. **In-memory caching** (node-cache):
   - 5 min TTL for trending, search, discover
   - 30 min TTL for detail endpoints (TV, movie, season, episode)
   - 24 hour TTL for IMDb ratings and trailers
   - Max 500 entries
3. **Request deduplication**: if identical request is in-flight, return same promise.
4. **Concurrency limiter**: max 3 concurrent IMDb GraphQL calls.
5. **Error sanitization**: never leak API key in logs or responses.
6. **Retry**: retry 429/5xx up to 2 times with exponential backoff.

The Axios client setup:
```typescript
axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 10000,
  params: { language: 'en-US' },
});
```

IMDb GraphQL call:
```typescript
POST https://graphql.imdb.com
Body: { query: "query { title(id: \"$imdbId\") { ratingsSummary { aggregateRating voteCount } } }", variables: { id: imdbId } }
Headers: { Content-Type: application/json, User-Agent: Sidetrack/1.0 }
```

---

## WRAPPED COMPUTATION TO BUILD

Build `src/services/stats.service.ts` that computes all ~50 `WrappedStats` fields. This is the most complex piece — port it exactly.

### Input
Query from MongoDB for the authenticated user:
- All `watched_movies` filtered to requested year (by watchedDate)
- All `watched_episodes` filtered to requested year
- Count of favorite_movies + favorite_episodes
- Count of watchlist items

### Computation rules (implement exactly)

**Volume**: `totalMovies`, `totalEpisodes`, `totalHoursWatched` (sum of all runtimes ÷ 60, rounded to 1 decimal), `longestMovie` (max runtime), `avgPerWeek` (total entries ÷ weeks between first and last date).

**Busiest day/month**: Group all watchedDates by YYYY-MM-DD and YYYY-MM, find max count. Format month as "Jan 2025".

**Rating normalization** (CRITICAL): Legacy movies have ratings 1-10. Normalize: `r > 5 ? r / 2 : r`. Episodes always use 0-5.

**Rating distribution**: Count each rating value (rounded to nearest 0.5) across normalized movies + episodes.

**highestRatedMovies/lowestRatedMovies**: Top/bottom 5 by rating. `highestRatedShows`: Group episodes by seriesId, avg rating per show (min 1 rated ep), top 5.

**Genres**: Count occurrences across movies+episodes → top 10. Also compute avg rating per genre (min 2 rated entries).

**Streak**: Get unique YYYY-MM-DD dates from all entries, sort, count longest consecutive run.

**Busiest day of week**: Count by Sunday–Saturday, find max.

**First/last log**: Earliest/latest entry. For episodes: title = `{seriesName} S{seasonNumber}E{episodeNumber}`.

**Monthly activity**: Map of "YYYY-MM" → count.

**TV stats**: `uniqueShowsWatched` (unique seriesIds), `showsWithMostEpisodes` (top 5), `totalSeasonsStarted` (unique `{seriesId}-S{seasonNumber}` combos), `fastestBinge` (show with highest episodes/days ratio, min 3 episodes, days = max(1, ceil(lastDate-firstDate))).

**Movie stats**: `decadeBreakdown` (group by release decade like "2020s"), `oldestMovie`/`newestMovie` by release year, `avgMovieRuntime` (avg runtime where > 0), `rewatchCount` (sum of count-1 for each movieId appearing multiple times).

**Social**: `totalLikes` (episodes where liked=true), `likeRatio` (round(likes/total*100)), `totalReviews` (episodes with non-empty review), `avgReviewLength`, `topTags` (top 10 by frequency across episodes).

**Personality type** — deterministic cascade (first match wins):
1. totalEntries === 0 → `{ label: "The Newcomer", emoji: "🌱", description: "You're just getting started! Log some watches and come back." }`
2. episodes > movies × 3 → `{ label: "The Binger", emoji: "📺", description: "You live for the next episode. TV shows are your comfort zone and you can't hit 'Next' fast enough." }`
3. combinedAvgRating < 2.5 AND totalEntries > 10 → `{ label: "The Critic", emoji: "🎭", description: "Not easily impressed. You have high standards and aren't afraid to rate honestly." }`
4. combinedAvgRating > 4.0 AND totalEntries > 10 → `{ label: "The Enthusiast", emoji: "🤩", description: "You love almost everything you watch! Your positive energy is contagious." }`
5. topGenres.length > 5 → `{ label: "The Explorer", emoji: "🧭", description: "Always diving into new genres. Your taste is eclectic and your watchlist is diverse." }`
6. reviewCount > totalEntries × 0.3 → `{ label: "The Reviewer", emoji: "✍️", description: "You don't just watch — you reflect. Your reviews help you process what you've seen." }`
7. totalHoursWatched > 200 → `{ label: "The Marathon Runner", emoji: "🏃", description: "Hundreds of hours watched. You've turned watching into an endurance sport." }`
8. movies > episodes → `{ label: "The Cinephile", emoji: "🎬", description: "Movies are your thing. You appreciate the art of a complete story in one sitting." }`
9. default → `{ label: "The Balanced Viewer", emoji: "⚖️", description: "A healthy mix of movies and shows. You enjoy the best of both worlds." }`

**Fun time equivalent**:
```
hours < 1   → "barely a bathroom break"
hours < 10  → "{hours} hours — about a road trip to the next state"
hours < 24  → "{hours} hours — almost a full day without sleep"
days === 1  → "a full 24-hour day of non-stop watching"
days < 7    → "{days} full days — a vacation's worth of content"
days < 30   → "{days} days — that's {floor(hours/12)} flights from New York to Tokyo"
days >= 30  → "{days} days ({round(days/30)} months!) — you could've driven around the world {floor(hours/480)} times"
```

### Quick stats endpoint
`GET /api/stats/quick` returns a subset: `totalMovies`, `totalEpisodes`, `totalHoursWatched`, `totalFavorites` (movies+episodes), `watchlistCount`, `longestStreak`, `personalityType`. Compute this from the same data but skip the expensive deep stats.

---

## MIGRATION ENDPOINT TO BUILD

`POST /api/migrate/import` (auth required) accepts a JSON blob matching the shape of the app's AsyncStorage and bulk-imports everything. This is one-time migration for existing users.

**Request body**:
```json
{
  "watchedEpisodes": { "12345": { ...WatchedEpisode }, ... },
  "watchedMovies": { "678_2025-01-15": { ...WatchedMovie }, ... },
  "watchlist": { "tv_456": { ...QueuedItem }, ... },
  "favoriteMovies": { "789": { ...FavoriteMovie }, ... },
  "favoriteEpisodes": { "111": true, "222": true, ... },
  "currentlyWatching": [ ...CurrentlyWatchingItem[] ],
  "searchHistory": [ ...SearchResult[] ]
}
```

**Implementation**:
1. Validate each entry with Zod (skip invalid ones, don't reject the whole batch)
2. Use `bulkWrite` with `updateOne({ userId, [uniqueKey] }, { $set: doc }, { upsert: true })` for each collection
3. For search history, cap at 10 most recent after import
4. Return `{ imported: { episodes: N, movies: N, watchlist: N, favoriteMovies: N, favoriteEpisodes: N, currentlyWatching: N, searchHistory: N }, skipped: N, errors: string[] }`

---

## ERROR HANDLING TO IMPLEMENT

### Zod validation middleware
Create a factory: `validate(schema)` → middleware that parses `req.body`/`req.query`/`req.params` and calls `next()` or returns 400.

### Consistent error response shape
```json
{ "error": "ERROR_CODE", "message": "Human-readable", "details": [...] }
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `DUPLICATE_ENTRY` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

### Global error handler
Catch all unhandled errors. Map ZodError → 400, MongoServerError code 11000 → 409, everything else → 500. Log with winston. Never leak stack traces in production.

---

## RATE LIMITING TO IMPLEMENT

Three tiers:
- **Auth endpoints** (`/api/auth/*`): 20 requests per 15 min per IP
- **General API**: 300 requests per 15 min per IP
- **TMDB proxy** (`/api/tmdb/*`): 60 requests per 1 min per IP

---

## SECURITY REQUIREMENTS

- `helmet()` for security headers
- `cors()` with configurable origins from env var `ALLOWED_ORIGINS`
- bcrypt 12 rounds for password hashing
- Never return `passwordHash` in any response
- Never log API keys
- Strip HTML/script from reviews and tags
- All TMDB IDs validated as positive integers
- Minimum password length: 8 characters

---

## ENVIRONMENT VARIABLES

Create `.env.example` with:
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sidetrack
MONGODB_URI_TEST=mongodb://localhost:27017/sidetrack_test
JWT_SECRET=change-me-to-a-random-256-bit-hex
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
TMDB_API_KEY=your-tmdb-key-or-bearer-token
TMDB_BASE_URL=https://api.themoviedb.org/3
IMDB_GRAPHQL_URL=https://graphql.imdb.com
TMDB_IMAGE_BASE=https://image.tmdb.org/t/p/
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
ALLOWED_ORIGINS=http://localhost:19006,exp://localhost:19000
LOG_LEVEL=info
```

Validate all env vars at startup with Zod in `src/config/env.ts`. Crash immediately if required vars are missing.

---

## TESTING REQUIREMENTS

### Unit tests
- `stats.service.ts` — test every stat computation with known input data and expected output
- `auth.service.ts` — token generation, verification, password hashing
- All Zod schemas — valid/invalid input cases

### Integration tests (supertest + mongodb-memory-server)
- Full auth flow: register → login → use token → refresh → logout
- CRUD for every collection (create, read, update, delete, edge cases)
- Watchlist deduplication (POST same item twice → idempotent)
- Episode upsert (POST same episodeId twice → updates)
- Movie rewatch (POST same movieId with different dates → two entries)
- Currently watching auto-add on episode log
- Search history cap enforcement (add 12, verify only 10 remain)
- Wrapped stats with fixture data
- Bulk migration happy path and partial failure
- 404/409/401 error cases

### Test setup
Use `mongodb-memory-server` for isolated in-memory MongoDB per test suite. Clear collections between tests.

---

## NPM SCRIPTS

```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest --runInBand",
  "test:watch": "jest --watch",
  "lint": "eslint src/",
  "seed": "tsx src/scripts/seed.ts"
}
```

---

## DO NOT BUILD THESE

These stay client-side only. Do **not** create endpoints or storage for:
- `@tmdb_api_key` — server owns the TMDB key now (env var)
- `@sidetrack_onboarding_complete` — ephemeral UI state
- `@cache_trending_*`, `@sidetrack_detail_cache_*` — replaced by server-side TMDB proxy cache
- `isOffline` — transient client flag
- WrappedStats persistence — it's computed on-demand, never stored
- GDPR consent as a separate endpoint — `consentGiven` is just a field on the User model (set during registration or profile update)

---

## FINAL CHECKLIST

Before you're done, verify:
- [ ] Every file in the file structure is generated with complete code
- [ ] Every endpoint in the API table is implemented and tested
- [ ] Mongoose schemas match the TypeScript types field-for-field
- [ ] Zod validation exists on every route
- [ ] TMDB proxy caches responses and deduplicates in-flight requests
- [ ] Wrapped stats computation matches every rule in the computation section
- [ ] JWT auth with refresh token rotation works end-to-end
- [ ] Rate limiting has 3 separate tiers
- [ ] All tests pass
- [ ] No TODOs, no placeholders, no "implement later" comments
