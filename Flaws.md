# 🔥 SIDETRACK — Comprehensive Flaw Audit

> **Auditor**: Senior Principal Engineer & Lead Product Architect  
> **Date**: 2026-03-22  
> **Scope**: Full codebase review — React Native (Expo 54), 7 screens, 10 components, 3 services  
> **Verdict**: This app has a charming foundation but is held together with duct tape. Ship-blocking issues across security, data integrity, and scalability.

---

## 1. UX Friction & "Death by 1,000 Clicks"

### Information Architecture




### Micro-interactions

| Issue | Location | Impact |
|-------|----------|--------|
| **No image loading states on posters** — `<Image>` components have no `onLoadStart`/`onLoadEnd` handlers and no fallback placeholder animation while loading. Images just pop in from nothing, causing layout shifts. | All screens with `<Image>` | 🟡 Medium |



### Onboarding Friction

| Issue | Location | Impact |
|-------|----------|--------|
| **Zero onboarding flow** — A new user opens the app and sees the Explore tab with trending shows. There is no tutorial, no "Welcome" flow, no explanation of how to log watched content, and no prompt to start adding shows. | `App.tsx` / `DiscoveryScreen.tsx` | 🟠 High |

| **No accessibility support whatsoever** — The entire app lacks `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` props on all interactive elements. Completely unusable for screen reader users. | All files | 🔴 Critical |

---

## 2. The "Invisible" Performance Bottlenecks

### Payload Bloat

| Issue | Location | Severity |
|-------|----------|----------|
| **`react-native-webview` loaded globally for YouTube trailers** — The `YoutubePlayer` component (which wraps a WebView) is imported at the top of both `EpisodeDetail.tsx` and `MovieDetail.tsx`. Even if the user never watches a trailer, the WebView bridge is bundled. No lazy loading. | `EpisodeDetail.tsx:7` / `MovieDetail.tsx:7` | 🟡 Medium |
| **Full `w780` images loaded for compact poster grids** — The Explore screen loads `w780` (780px wide) backdrops for the Spotlight carousel, which is only ~75% of screen width. Poster grids load `w500` images for tiles that are ~33% screen width. Severe over-fetching of image data. | `DiscoveryScreen.tsx:296,510` | 🟠 High |
| **`StatsService.ts` is a 21 KB monolith** — All stats computation logic is bundled even if the user never opens the Wrapped screen. | `StatsService.ts` | 🟡 Medium |
| **Google Fonts in devDependencies** — `@expo-google-fonts/dm-sans` and `@expo-google-fonts/outfit` are in `devDependencies` but never imported anywhere. They're dead weight. | `package.json:38-39` | 🟢 Low |

### Memory Leaks

| Issue | Location | Severity |
|-------|----------|----------|
| **In-memory TMDB cache has no upper bound on individual entry size** — The `cache` Map in `tmdbService.ts` stores arbitrary `any` data and only evicts by count (100 entries). A single cached TV show response can be very large (hundreds of episodes with full metadata). | `tmdbService.ts:29-50` | 🟠 High |
| **Module-level global state in tmdbService** — `cache`, `activeCount`, and `queue` are module-level singletons. In Expo, the module may persist across hot reloads, accumulating stale references. | `tmdbService.ts:32,54-55` | 🟡 Medium |
| **Animated values created in render functions** — `SkeletonBox` creates `new Animated.Value(0.3)` in a `useRef` inside a component that's rendered dozens of times (every skeleton placeholder). These accumulate in the animation driver. | `DiscoveryScreen.tsx:22` / `HistoryScreen.tsx:24` | 🟡 Medium |
| **`shimmerAnim` loop never stopped on loading = false** — In `EpisodeDetail.tsx` and `MovieDetail.tsx`, the shimmer animation `Animated.loop` is started when `loading` is true, but there's no cleanup — it's only stopped when the component unmounts. If `loading` flips to `false`, the animation keeps running in the background. | `EpisodeDetail.tsx:275-284` / `MovieDetail.tsx:204-214` | 🟡 Medium |

### Rendering Efficiency

| Issue | Location | Severity |
|-------|----------|----------|
| **Backdrop image height uses `Dimensions.get('window')` directly in styles** — `LAYOUT.window` calls `Dimensions.get('window')` via a getter on every access. This is evaluated once at module load time and never updates on rotation or window resize. | `theme.ts:56` / `EpisodeDetail.tsx:591` | 🟠 High |
| **`SeasonBrowser` renders ALL episodes for an expanded season at once** — For a show like The Simpsons (750+ episodes per season concept), every episode row is rendered in a flat `map()` inside a `ScrollView`, not a virtualized `FlatList`. | `SeasonBrowser.tsx:132-305` | 🟠 High |
| **Discovery scroll is a `ScrollView`, not a `FlatList`** — The main Discovery browse uses a `ScrollView` with `.map()` for spotlight, popular, and trending sections. This means all poster images are mounted simultaneously, even off-screen ones. | `DiscoveryScreen.tsx:476-632` | 🟡 Medium |
| **Layout shifts on "Currently Watching"** — The section conditionally renders (`currentlyWatching.length > 0`), causing the entire scroll content to shift when the section appears/disappears. No `LayoutAnimation` is used. | `DiscoveryScreen.tsx:534-577` | 🟡 Medium |

---

## 3. State Management & Data Integrity

### Race Conditions

| Issue | Location | Severity |
|-------|----------|----------|
| **Search debounce doesn't cancel stale responses** — `handleSearch` debounces the API call by 500ms, but if the user types "Breaking" and then "Breaking Bad" in quick succession, both requests fire and the first response may arrive *after* the second, showing wrong results. There is no request cancellation or sequence tracking. | `DiscoveryScreen.tsx:243-253` | 🔴 Critical |
| **Rapid favorite/watchlist toggles can corrupt state** — Tapping the Watchlist or Favorite button rapidly calls `StorageProvider.addToWatchlist` / `removeFromWatchlist` multiple times. Each call does a full read-modify-write of the entire JSON blob. Concurrent writes will clobber each other. | `EpisodeDetail.tsx:236-261` / `MovieDetail.tsx:90-106` | 🔴 Critical |
| **Movie update is delete + add (not atomic)** — `handleConfirmLog` in `MovieDetail.tsx` does `removeFromWatchedMovies` then `addToWatchedMovies` as two separate async operations. If the app crashes between them, the entry is lost. | `MovieDetail.tsx:174-178` | 🟠 High |

### Local vs. Server State

| Issue | Location | Severity |
|-------|----------|----------|
| **Zero single source of truth** — Watch history, favorites, and watchlist state are each loaded independently by every screen that needs them. There is no React Context, no global store, no event bus. Each screen maintains its own copy. When `EpisodeDetail` marks an episode as watched, `HistoryScreen` won't know until it manually re-fetches on focus. | All screens / `StorageProvider.ts` | 🔴 Critical |
| **Watchlist has a naming collision** — `QueuedItem` uses `seriesId` for both TV shows and movies. When a movie with the same TMDB ID as a TV show exists, they would overwrite each other in storage. | `StorageProvider.ts:87-89` / `types/index.ts:128-134` | 🟠 High |
| **Rating scale inconsistency** — Episodes use a 0–5 star scale. Movies *appear* to use 0–5 stars, but `HistoryScreen` has a `movieStars` normalizer (`r > 5 ? r / 2 : r`) implying legacy entries used a 1–10 scale. No migration was performed. | `HistoryScreen.tsx:297-298` | 🟠 High |

---

## 4. Edge Case & Error Resilience




### Validation Gaps

| Issue | Location | Severity |
|-------|----------|----------|
| **No input validation on reviews or tags** — The review `TextInput` has no character limit. A user could paste a 50,000-character review and it would be stored in `AsyncStorage` without sanitization or truncation. | `WatchedEpisodeModal.tsx:185-193` / `MovieDetail.tsx:513-521` | 🟡 Medium |
| **Tags are comma-separated strings** — Users type tags as free-text with commas. No validation, no deduplication, no max count. Tags like `"  , , , ,  "` produce empty array entries after split. | `WatchedEpisodeModal.tsx:197-203` | 🟡 Medium |
| **Future dates are allowed for "watched date"** — The date picker has no maximum date constraint. A user can log a movie as "watched" on a date in 2030. | `DatePicker.tsx` / `WatchedEpisodeModal.tsx` | 🟡 Medium |
| **Rating of 0 is submittable** — The "I Watched" modal allows confirming with a 0 star rating. This is ambiguous — does 0 stars mean "unrated" or "zero stars"? The UI treats it as unrated but stores it as 0. | `WatchedEpisodeModal.tsx:75-85` | 🟡 Medium |

---

## 5. Security & Compliance (Deep Tier)

### Token Handling

| Issue | Location | Severity |
|-------|----------|----------|
| **API keys committed to source control in plaintext** — Both `TMDB_API_KEY` (602bfe1cf36c39a33dd747b1cd8495d4) and `OMDB_API_KEY` (986d085) are in `.env` AND `app.json`. The `.env` file is NOT in `.gitignore`. These keys are in the git history. | `.env` / `app.json` | 🔴 Critical |
| **API keys bundled into the client binary** — Because this is a React Native app, the `EXPO_PUBLIC_` environment variables and `Constants.expoConfig.extra` values are embedded in the JavaScript bundle. Anyone decompiling the APK can extract them. | `tmdbService.ts:5-7` | 🟠 High |
| **IMDb GraphQL query uses string interpolation (injection risk)** — The IMDb rating query interpolates the `imdbId` directly into a GraphQL string: `` `{ title(id: "${imdbId}") { ... } }` ``. If `imdbId` is ever tampered with (e.g., from corrupted cache or malicious storage), this is a GraphQL injection vector. | `tmdbService.ts:209` | 🟠 High |

### Privacy Gaps

| Issue | Location | Severity |
|-------|----------|----------|
| **`console.error` logs full error objects** — Every API failure logs the full error (including request URLs with API keys) to the console. In production, these can leak into crash reporting tools. | `tmdbService.ts` (12+ instances) | 🟡 Medium |
| **Watch history has no privacy controls** — All watched content, ratings, and reviews are stored in plain text in AsyncStorage. There's no PIN/biometric lock, no private mode, no way to hide entries. | `StorageProvider.ts` | 🟡 Medium |
| **TMDB API requests include user-agent and device info** — Axios sends default headers that may include device-identifying information to a third-party API. No custom user-agent is set. | `tmdbService.ts:14-27` | 🟢 Low |

### Compliance Debt

| Issue | Location | Severity |
|-------|----------|----------|
| **No data export feature** — Users cannot export their watch history, ratings, or reviews in any format. All data is trapped in AsyncStorage. Device wipe = permanent data loss. | Nowhere in codebase | 🟠 High |
| **No "Delete All Data" option** — There is no settings screen, and no way for a user to purge all personal data from the app. | Nowhere in codebase | 🟠 High |
| **No privacy policy, terms of service, or data disclosure** — For app store submission, these are mandatory. | Nowhere in codebase | 🟡 Medium |
| **No GDPR-style consent flow** — The app hits TMDB, IMDb GraphQL, and YouTube APIs without any data collection disclosure. | `tmdbService.ts` | 🟡 Medium |

---

## 6. Technical Debt & Maintainability

### Scalability Walls

| Issue | Location | Severity |
|-------|----------|----------|
| **StorageProvider reads/writes ENTIRE JSON blobs on every operation** — `markEpisodeAsWatched` reads the *entire* watched history object, adds one entry, then writes the *entire* object back. At 1,000 watched episodes, every single "mark as watched" action serializes/deserializes the entire 1,000-entry object. This is O(n) for every mutation. | `StorageProvider.ts:38-42` (and every other method) | 🔴 Critical |
| **No pagination on search results** — Search returns a single page (~20 results) from TMDB. The `total_pages` and `total_results` fields from the API response are available in the TypeScript types but never used. | `tmdbService.ts:77-87` / `DiscoveryScreen.tsx:228-241` | 🟠 High |
| **No pagination on History screen** — The entire watch history (movies + episodes) is loaded into memory at once, sorted, and rendered. At 5,000+ entries, this will cause significant jank. | `HistoryScreen.tsx:194-206,330-342` | 🟠 High |
| **`HistoryScreen` computes `showGroups` and `unifiedItems` in `useMemo` but with broad deps** — Any change to `movies`, `showGroups`, or `query` re-computes the entire unified list. `showGroups` iterates all episodes to group by show on every re-render where `episodes` changes. | `HistoryScreen.tsx:301-342` | 🟡 Medium |
| **Season episodes IMDb ratings fetched in parallel without throttling** — `fetchEpisodeImdbRatings` fires `Promise.all` for every episode in a season simultaneously. A 24-episode season generates 24 near-simultaneous API round trips (TMDB external IDs + IMDb GraphQL = 48 requests). Only the IMDb call has a concurrency limiter of 3. | `SeasonBrowser.tsx:58-70` | 🟠 High |

### Hard-coded Fragility

| Issue | Location | Severity |
|-------|----------|----------|
| **Hard-coded API URLs** — `https://api.themoviedb.org/3` and `https://graphql.imdb.com` are string literals in `tmdbService.ts`. No environment variable, no config file. | `tmdbService.ts:8-9` | 🟡 Medium |
| **Hard-coded placeholder image URL** — `getImageUrl` falls back to `https://via.placeholder.com/500x750?text=No+Image`, an external service that could go down. | `tmdbService.ts:195` | 🟡 Medium |
| **Magic numbers everywhere** — `44` (Android padding), `500` (debounce ms), `50` (setTimeout delay), `100` (cache max), `10` (search history max), `12` (trending movies slice), `0.52` (trailer aspect ratio), `0.75` (spotlight width), `0.35`/`0.55` (backdrop heights), `999` (border radius "round"). None are named constants. | Throughout codebase | 🟡 Medium |
| **Wrapped unlock date hard-coded to December 15** — `handleOpenWrapped` checks `new Date(now.getFullYear(), 11, 15)`. This isn't configurable. | `MainNavigation.tsx:83` | 🟢 Low |
| **Platform padding hard-coded** — `paddingTop: Platform.OS === 'android' ? 44 : 0` is duplicated across multiple screens instead of using `SafeAreaView` consistently. | `DiscoveryScreen.tsx:646` / `HistoryScreen.tsx:760` | 🟡 Medium |

### Code Quality

| Issue | Location | Severity |
|-------|----------|----------|
| **God components** — `DiscoveryScreen.tsx` (1,009 lines), `HistoryScreen.tsx` (1,129 lines), `EpisodeDetail.tsx` (864 lines), `MovieDetail.tsx` (1,052 lines). These files each contain rendering, business logic, API calls, storage operations, animations, and styles in one massive file. | All major screens | 🟠 High |
| **Duplicated skeleton components** — `SkeletonBox` is copy-pasted identically in `DiscoveryScreen.tsx` and `HistoryScreen.tsx`. | `DiscoveryScreen.tsx:21-36` / `HistoryScreen.tsx:23-38` | 🟡 Medium |
| **Duplicated log modal UI** — `MovieDetail.tsx` has ~150 lines of inline Modal JSX that duplicates the `WatchedEpisodeModal` component's pattern. | `MovieDetail.tsx:430-575` | 🟡 Medium |
| **`contexts/` directory is empty** — There's a `src/contexts/` directory that is completely empty, suggesting abandoned plans for React Context-based state management. | `src/contexts/` | 🟢 Low |
| **Zero test files** — No unit tests, no integration tests, no E2E tests. No testing framework is installed. The TODO mentions Detox/Maestro but nothing exists. | Entire project | 🔴 Critical |
| **TypeScript not in strict mode** — `tsconfig.json` doesn't enable `strict: true`. This allows implicit `any`, unchecked null access, and other type-safety holes. | `tsconfig.json` | 🟡 Medium |
| **Font packages in wrong dependency category** — `@expo-google-fonts/dm-sans` and `@expo-google-fonts/outfit` are in `devDependencies`. If they were ever needed at runtime, the production build would fail. | `package.json:38-39` | 🟢 Low |

---

## 7. Severity Matrix & Action Plan

### Complete Flaw Index

| # | Flaw | Category | Severity | Fix Difficulty |
|---|------|----------|----------|----------------|
| 1 | API keys committed to source & bundled in client | Security | 🔴 Critical | Easy |
| 2 | `StorageProvider` read-modify-write entire blob on every op | Performance | 🔴 Critical | Hard |
| 3 | Search race condition (stale response overwrites fresh) | State | 🔴 Critical | Easy |
| 4 | Rapid toggle race condition (concurrent read-modify-write) | State | 🔴 Critical | Medium |
| 5 | No single source of truth for app state | State | 🔴 Critical | Hard |
| 6 | Single root ErrorBoundary — one error crashes entire app | Error | 🔴 Critical | Easy |
| 7 | `StorageProvider` silently returns defaults on corruption | Error | 🔴 Critical | Medium |
| 8 | Zero accessibility support | UX | 🔴 Critical | Medium |
| 9 | Zero test coverage | Code Quality | 🔴 Critical | Hard |
| 10 | `AddWatchedScreen` orphaned / unreachable | UX | 🔴 Critical | Easy |
| 11 | GraphQL string interpolation injection risk | Security | 🟠 High | Easy |
| 12 | No data export / backup | Compliance | 🟠 High | Medium |
| 13 | No "Delete All Data" option | Compliance | 🟠 High | Easy |
| 14 | Full-size images loaded for small thumbnails | Performance | 🟠 High | Easy |
| 15 | No search pagination | UX / Scalability | 🟠 High | Medium |
| 16 | No History pagination — all data loaded at once | Scalability | 🟠 High | Medium |
| 17 | `SeasonBrowser` renders all episodes flat (not virtualized) | Performance | 🟠 High | Medium |
| 18 | 48 concurrent API calls per season expand | Performance | 🟠 High | Easy |
| 19 | `QueuedItem.seriesId` naming collision for movies | Data Integrity | 🟠 High | Medium |
| 20 | Rating scale inconsistency (0–5 vs 0–10) | Data Integrity | 🟠 High | Medium |
| 21 | NetworkBanner detects offline but changes nothing | Error | 🟠 High | Medium |
| 22 | API errors silently return null/[] | Error | 🟠 High | Medium |
| 23 | God components (1,000+ line screens) | Code Quality | 🟠 High | Hard |
| 24 | No genre/category browsing | UX | 🟠 High | Medium |
| 25 | No onboarding flow | UX | 🟠 High | Medium |
| 26 | API keys embedded in JS bundle (decompilable) | Security | 🟠 High | Hard |
| 27 | Movie update is non-atomic delete+add | Data Integrity | 🟠 High | Easy |
| 28 | In-memory cache unbounded by size | Performance | 🟠 High | Easy |
| 29 | `Dimensions.get('window')` not responsive | Performance | 🟠 High | Easy |
| 30 | No loading indicator on watchlist removal | UX | 🟡 Medium | Easy |
| 31 | Skeleton loaders duplicated across screens | Code Quality | 🟡 Medium | Easy |
| 32 | Log modal duplicated in MovieDetail | Code Quality | 🟡 Medium | Medium |
| 33 | History refresh logic duplicated 3x | Code Quality | 🟡 Medium | Easy |
| 34 | No input validation on reviews/tags | Validation | 🟡 Medium | Easy |
| 35 | Future dates allowed for watched date | Validation | 🟡 Medium | Easy |
| 36 | console.error leaks API keys in production | Security | 🟡 Medium | Easy |
| 37 | TypeScript not in strict mode | Code Quality | 🟡 Medium | Medium |
| 38 | Platform padding hard-coded | Code Quality | 🟡 Medium | Easy |
| 39 | Shimmer animation not stopped on loading=false | Performance | 🟡 Medium | Easy |
| 40 | Module-level cache state persists across hot reloads | Performance | 🟡 Medium | Easy |
| 41 | UX inconsistency between movie/episode log flows | UX | 🟡 Medium | Medium |
| 42 | Empty states lack action buttons | UX | 🟡 Medium | Easy |
| 43 | No privacy policy or terms of service | Compliance | 🟡 Medium | Easy |
| 44 | Watchlist has no TV/Movie segmentation | UX | 🟡 Medium | Easy |
| 45 | Detail transition uses setTimeout hack | UX | 🟡 Medium | Easy |
| 46 | Cache not invalidated on pull-to-refresh | State | 🟡 Medium | Easy |
| 47 | No optimistic updates | UX | 🟡 Medium | Medium |
| 48 | 0 star rating is ambiguous | Validation | 🟡 Medium | Easy |

---

### 🚨 Top 3 Priorities — Fix Within 24 Hours

#### 1. 🔑 Rotate and Secure API Keys **[Severity: Critical | Time: 1 hour]**

The TMDB key `602bfe1cf36c39a33dd747b1cd8495d4` and OMDB key `986d085` are burned — they're in the git history. **Rotate them immediately on both services.** Then:

- Add `.env` to `.gitignore`
- Use `expo-constants` with `app.config.js` (not `app.json`) to inject keys at build time
- Consider proxying TMDB requests through a backend to keep keys server-side

#### 2. 🏁 Fix the Search Race Condition **[Severity: Critical | Time: 30 minutes]**

Add a request sequence counter to `performSearch`:
```typescript
const searchSeq = useRef(0);
const performSearch = useCallback(async (text: string) => {
  const seq = ++searchSeq.current;
  const results = await tmdbService.search(text);
  if (seq !== searchSeq.current) return; // Stale response
  setResults(results.filter(/* ... */));
}, []);
```

#### 3. 🛡️ Add Per-Screen Error Boundaries **[Severity: Critical | Time: 1 hour]**

Wrap each tab screen in its own `ErrorBoundary` in `MainNavigation.tsx`. Currently, if the History screen throws, the *entire app* (including Explore and Watchlist) becomes unusable. Localize the blast radius:

```tsx
<ErrorBoundary key="explore-boundary">
  <DiscoveryScreen ... />
</ErrorBoundary>
```

---

> *"The best code is the code that never surprises you. This codebase is a surprise party."*
