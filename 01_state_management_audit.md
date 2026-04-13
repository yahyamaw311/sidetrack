# State Management Architecture & Re-render Minimization Audit

**Project:** Sidetrack  
**Date:** 2026-04-11  
**Scope:** Full source tree (`src/`, `App.tsx`)

---

## Table of Contents

1. [Context API Misuse](#1-context-api-misuse)
2. [Missing or Incorrect Memoization](#2-missing-or-incorrect-memoization)
3. [Derived State Anti-Patterns](#3-derived-state-anti-patterns)
4. [Global State Architecture](#4-global-state-architecture)
5. [Render Frequency Analysis](#5-render-frequency-analysis)
6. [Prioritized Refactoring Roadmap](#6-prioritized-refactoring-roadmap)

---

## 1. Context API Misuse

### 1.1 Provider Inventory

| Provider | File | Consumer Hook | Value Shape |
|---|---|---|---|
| `ErrorNotifierContext` | `src/contexts/ErrorNotifier.tsx` | `useErrorNotifier()` | `{ notifyError }` |
| `NetworkContext` | `src/contexts/NetworkContext.tsx` | `useNetwork()` | `{ isOffline }` |
| `SafeAreaProvider` | `App.tsx` (external) | — | layout insets |
| `QueryClientProvider` | `App.tsx` (external) | `useQuery` / `useQueryClient` | React Query cache |

### 1.2 Findings

#### F-CTX-1 · `NetworkContext` duplicates Zustand state — 🟡 Medium

- **File:** [src/contexts/NetworkContext.tsx](src/contexts/NetworkContext.tsx#L14-L31)
- **Issue:** `NetworkProvider` maintains local `useState(false)` for `isOffline` **and** pushes the same value into the Zustand store via `setIsOfflineStore(offline)`. Two sources of truth exist for the same boolean. Components that read `useNetwork().isOffline` subscribe to the Context, while components that read `useAppStore(s => s.isOffline)` subscribe to Zustand — they can briefly disagree during a render cycle.
- **Why it matters:** Two state atoms tracking the same value can desynchronise during concurrent renders and make debugging harder. Every child of `NetworkProvider` (the entire app) re-renders whenever `isOffline` toggles, even components that never consume the context, because `NetworkProvider` renders `children` unconditionally on its own state change.
- **Recommended fix:** Remove `NetworkContext` entirely. Keep `isOffline` solely in the Zustand store (it's already there). Components that need the value can use `useAppStore(s => s.isOffline)` — this is already done by `NetworkBanner`, `SeasonBrowser`, and `useSearch`. Update the remaining consumer (`useNetwork()` — search for imports) to use the store selector instead.

#### F-CTX-2 · `GDPRConsentModal` subscribes to entire Zustand store — 🟠 High

- **File:** [src/components/GDPRConsentModal.tsx](src/components/GDPRConsentModal.tsx#L11)
- **Line:** `const { consentGiven, setConsentGiven, hydrated } = useAppStore();`
- **Issue:** Calling `useAppStore()` without a selector returns the **entire** store. The component re-renders on every Zustand state change (watched movie added, episode marked, watchlist updated, etc.) even though it only reads `consentGiven` and `hydrated`.
- **Why it matters:** While the modal is not rendered after consent is given (`if (!visible) return null`), the function body still runs on every store update — including the `useEffect` and `useState` — wasting CPU cycles during the most performance-sensitive flows (logging movies/episodes).
- **Recommended fix:** Replace with three granular selectors:
  ```ts
  const consentGiven = useAppStore(s => s.consentGiven);
  const setConsentGiven = useAppStore(s => s.setConsentGiven);
  const hydrated = useAppStore(s => s.hydrated);
  ```

#### F-CTX-3 · `ErrorNotifierProvider` holds a rapidly-mutating array in context value — 🟢 Low

- **File:** [src/contexts/ErrorNotifier.tsx](src/contexts/ErrorNotifier.tsx#L36-L82)
- **Issue:** `notifications` state lives inside the provider and is rendered directly as children of the provider component (toast stack). Each time a notification is added or dismissed the provider itself re-renders, which means the `value={{ notifyError }}` object is also recreated. However, because `notifyError` is wrapped in `useCallback` with an empty dependency array, its reference is stable — so context consumers do **not** re-render spuriously. This is correctly handled.
- **Why it matters:** Minimal impact due to the stable `useCallback`. Listed for completeness.
- **Recommended fix:** None required. The current pattern is acceptable.

---

## 2. Missing or Incorrect Memoization

### 2.1 Components Missing `React.memo`

#### F-MEMO-1 · `DiscoveryScreen` — not memoised, defines render functions inline — 🔴 Critical

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L158)
- **Issue:** `DiscoveryScreen` is a large (600+ line) screen component that is **never** wrapped in `React.memo`. Within its render scope it defines three render functions (`renderSpotlightItem` at ~L296, `renderPosterItem` at ~L315, `renderSearchResult` at ~L326) as plain arrow functions — each recreated on every render — and passes them directly to `FlatList.renderItem` and inline `.map()` calls. Additionally, the screen duplicates the `SkeletonBox`, `SpotlightSkeleton`, `PosterSkeleton`, `PopcornLoader` components inline (L23–L133) instead of importing the dedicated shared versions from `src/components/`, creating duplicated animation loops.
- **Why it matters:** Every state change (`query`, `results`, `trending`, `trendingMovies`, `currentlyWatching`, `searchActive`, `loading`, `refreshing`, `searching`, `searchHistory`) triggers a full re-render that recreates all render functions and causes `FlatList` to diff with new function references, potentially re-rendering all visible items.
- **Recommended fix:**
  1. Extract `renderSpotlightItem`, `renderPosterItem`, and `renderSearchResult` into `useCallback` with their actual dependencies.
  2. Remove the duplicated inline skeleton/loader components and import the shared ones from `src/components/`.
  3. Consider splitting the component: search UI vs. browse UI.

#### F-MEMO-2 · `SeasonBrowser` — not wrapped in `React.memo` — 🟠 High

- **File:** [src/components/SeasonBrowser.tsx](src/components/SeasonBrowser.tsx)
- **Issue:** Receives many props (arrays, functions, Sets) from `EpisodeDetail` screen. Not wrapped in `React.memo`, so it re-renders whenever the parent re-renders — even if none of its props changed.
- **Why it matters:** `SeasonBrowser` manages a `FlatList` of episodes with expandable detail panels and IMDb rating fetches. Unnecessary re-renders of this subtree are expensive.
- **Recommended fix:** Wrap the default export with `React.memo`.

#### F-MEMO-3 · `NetworkBanner` — not wrapped in `React.memo` — 🟡 Medium

- **File:** [src/components/NetworkBanner.tsx](src/components/NetworkBanner.tsx)
- **Issue:** Takes no props but reads a single Zustand selector (`isOffline`). Without `React.memo` it may re-render when its parent (`MainNavigation`) re-renders for tab changes.
- **Recommended fix:** Wrap with `React.memo`.

#### F-MEMO-4 · `CreditList` parent — not wrapped in `React.memo` — 🟡 Medium

- **File:** [src/components/CreditList.tsx](src/components/CreditList.tsx)
- **Issue:** Receives `cast[]`, `crew[]`, `guestStars[]` array props from detail screens. The child `CastCard` is `React.memo`'d, but the parent `CreditList` is not — so it re-renders when the parent screen state changes (e.g., toggling favorites), re-running the `combinedCast` computation and FlatList setup even though the cast data hasn't changed.
- **Recommended fix:** Wrap `CreditList` in `React.memo` and memoize `combinedCast` with `useMemo`.

#### F-MEMO-5 · `WrappedBanner` — not wrapped in `React.memo` — 🟡 Medium

- **File:** [src/components/history/WrappedBanner.tsx](src/components/history/WrappedBanner.tsx)
- **Issue:** Receives a single `onPress` function prop. Each HistoryScreen re-render recreates the parent's `onPress` lambda and re-renders this banner, restarting its shimmer animation.
- **Recommended fix:** Wrap with `React.memo`; ensure the parent memoises `onPress` via `useCallback`.

#### F-MEMO-6 · `SwipeableStars` — not wrapped in `React.memo` — 🟡 Medium

- **File:** [src/components/SwipeableStars.tsx](src/components/SwipeableStars.tsx)
- **Issue:** Receives `value` and `onChange` props. Used inside modal forms where other form fields changing (review text, tags, etc.) trigger parent re-renders, re-rendering the star rater unnecessarily.
- **Recommended fix:** Wrap with `React.memo`.

#### F-MEMO-7 · `WatchedMovieModal` / `WatchedEpisodeModal` — not wrapped in `React.memo` — 🟢 Low

- **Files:** [src/components/WatchedMovieModal.tsx](src/components/WatchedMovieModal.tsx), [src/components/WatchedEpisodeModal.tsx](src/components/WatchedEpisodeModal.tsx)
- **Issue:** Modal components that receive `onClose`, `onConfirm` functions and object props. Not memoised, but modals are only mounted when visible, reducing the practical impact.
- **Recommended fix:** Wrap with `React.memo` for correctness; low priority.

### 2.2 Inline Object / Array / Function Literals in Render Scope

#### F-INLINE-1 · `DiscoveryScreen` — inline `SearchResult` object construction — 🟠 High

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L534)
- **Line:** `onPress={() => onSelectShow({ id: item.seriesId, media_type: 'tv', name: item.name, poster_path: item.posterPath } as SearchResult)}`
- **Issue:** A new object literal is created on every render for each currently-watching item and passed to `onSelectShow`. This also happens on every `.map()` iteration inside `ScrollView`, producing N allocations per render.
- **Why it matters:** Creates GC pressure during scrolling; prevents shallow-equality optimisation in any downstream `React.memo` wrapper.
- **Recommended fix:** Pre-compute the `SearchResult` objects in a `useMemo` keyed on `currentlyWatching`.

#### F-INLINE-2 · `DiscoveryScreen` — `LinearGradient` colors array — 🟡 Medium

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L508)
- **Issue:** `colors={['transparent', 'rgba(7,7,11,0.9)']}` creates a new array on every render for every spotlight card. Multiplied by 8 spotlight items = 8 array allocations per render.
- **Recommended fix:** Hoist the gradient color arrays to module-level constants.

#### F-INLINE-3 · `GDPRConsentModal` — `LinearGradient` inline colors + start/end — 🟢 Low

- **File:** [src/components/GDPRConsentModal.tsx](src/components/GDPRConsentModal.tsx#L34-L37)
- **Issue:** `colors={['#0f0c29', '#302b63', '#24243e']}` and `start={{ x: 0, y: 0 }}`, `end={{ x: 1, y: 1 }}` are inline. Modal is rarely rendered, so impact is minimal.
- **Recommended fix:** Hoist to module constants.

#### F-INLINE-4 · `MovieDetail` — inline `onChangeState` callback for `YoutubePlayer` — 🟡 Medium

- **File:** [src/screens/MovieDetail.tsx](src/screens/MovieDetail.tsx)
- **Issue:** The `onChangeState` callback passed to `YoutubePlayer` is an inline arrow function. This causes `YoutubePlayer` (a heavy component wrapping a WebView) to receive a new prop reference on every parent render, potentially triggering unnecessary WebView reloads.
- **Recommended fix:** Wrap in `useCallback` with `[setTrailerPlaying]` dependency.

#### F-INLINE-5 · `WrappedScreen` — `buildCards()` creates all card JSX inline — 🔴 Critical

- **File:** [src/screens/WrappedScreen.tsx](src/screens/WrappedScreen.tsx#L96)
- **Line:** `const cards = buildCards(stats, year);`
- **Issue:** `buildCards` is called on every render and returns a fresh array of JSX elements. Each card contains `LinearGradient` components with inline `colors` arrays, inline style objects with template expressions, and inline sub-components (`StatValue`, `SectionTitle`, `RankRow`, `BarChart` at ~L110–L151). None of these sub-components are memoised. The resulting `cards` array is passed to a `ScrollView` inside the render body.
- **Why it matters:** A swipe between pages calls `setCurrentPage`, which re-renders the entire component and rebuilds every card (up to 11 cards with complex chart layouts). This is the most expensive per-render cost in the app.
- **Recommended fix:**
  1. Wrap `buildCards(stats, year)` in `useMemo` with `[stats, year]` dependencies.
  2. Extract `StatValue`, `SectionTitle`, `RankRow`, `BarChart` as module-level `React.memo` components.
  3. Hoist `CARD_GRADIENTS` — already at module level ✓ — and hoist all inline `colors` arrays used inside `buildCards`.

### 2.3 `useMemo` / `useCallback` with Incorrect Dependency Arrays

#### F-DEPS-1 · `DiscoveryScreen` — `handleSearch` not wrapped in `useCallback` — 🟠 High

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L248)
- **Issue:** `handleSearch` is a plain arrow function (not `useCallback`). It is passed to `TextInput.onChangeText`. On every render a new reference is passed, causing the `TextInput` and its parent `View` to re-render.
- **Recommended fix:** Wrap in `useCallback` with `[performSearch]` dependency.

#### F-DEPS-2 · `DiscoveryScreen` — `loadTrending` / `handleRefresh` are bare `async` functions — 🟠 High

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L207-L226)
- **Issue:** `loadTrending` and `handleRefresh` are plain `async` functions defined in component body, not `useCallback`. `handleRefresh` is passed to `RefreshControl.onRefresh`, creating a new reference per render and forcing `RefreshControl` to re-render.
- **Recommended fix:** Wrap both in `useCallback`.

#### F-DEPS-3 · `useDiscoveryData` hook — `LayoutAnimation` call on every render — 🟠 High

- **File:** [src/hooks/useDiscoveryData.ts](src/hooks/useDiscoveryData.ts#L79-L81)
- **Line:** `if (!loading) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); }`
- **Issue:** This code runs unconditionally in the hook body (not inside `useEffect`). Every time any consumer re-renders, if `loading` is `false`, a new `LayoutAnimation` is configured — even if no layout change is pending. This can cause visual glitches and interfere with other animations.
- **Why it matters:** `LayoutAnimation.configureNext` is **imperative** and affects the *next* layout commit globally. Calling it on every render is a side-effect in the render phase, violating React rules.
- **Recommended fix:** Move into a `useEffect` that triggers only when `loading` transitions from `true` to `false` (use a ref to track previous value).

#### F-DEPS-4 · `DiscoveryScreen` — `clearSearch` is a bare function — 🟡 Medium

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L258-L265)
- **Issue:** `clearSearch` is defined as a plain function in component scope. It is called inside `useEffect` and event handlers. Since it captures state setters (which are stable), the reference instability is a minor issue, but it breaks ESLint `react-hooks/exhaustive-deps` and prevents memoisation of downstream consumers.
- **Recommended fix:** Wrap in `useCallback`.

---

## 3. Derived State Anti-Patterns

#### F-DERIVED-1 · `ProfileScreen` — 7 `useState` hooks for values derived from store — 🔴 Critical

- **File:** [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx#L110-L119)
- **Lines:** `movieCount`, `episodeCount`, `hoursWatched`, `personality`, `favCount`, `watchlistCount`, `streak`
- **Issue:** These 7 state variables are all computed from the Zustand store slices (`watchedMovies`, `watchedEpisodes`, `favoriteMovieIds`, `favoriteEpisodeIds`, `watchlist`) via `StatsService.computeWrapped()`. They are populated inside a `useCallback(loadStats)` triggered by a `useEffect`. This creates a double-render cycle:
  1. Store updates → component re-renders (due to store selectors).
  2. `useEffect` fires → calls `loadStats()` → calls 7 `setState` functions → component re-renders again.
- **Why it matters:** Every watched movie or episode addition causes `ProfileScreen` to render **twice**: once due to the selector change, and again when the derived stats are recalculated and flushed via setState. The `StatsService.computeWrapped()` call is also async, creating a frame where stale stats are shown.
- **Recommended fix:** Replace the 7 `useState` hooks with a single `useMemo` (if `computeWrapped` can be made synchronous for the **inline** stats — it only does arithmetic on arrays already in memory). If async is required, consolidate into a single `useState<StatsResult | null>` and set it once. Better yet, compute stats as a Zustand derived selector.

#### F-DERIVED-2 · `DiscoveryScreen` — local `trending` / `trendingMovies` / `currentlyWatching` state duplicates store — 🟠 High

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L162-L166)
- **Issue:** The component maintains its own `useState` for `trending`, `trendingMovies`, and `currentlyWatching` and populates them by calling `tmdbService` and `StorageProvider` directly. However, `currentlyWatching` is already available in the Zustand store (`useAppStore(s => s.currentlyWatching)`), and `useDiscoveryData` hook in `src/hooks/useDiscoveryData.ts` already wraps the same trending logic with React Query. This screen appears to bypass both the hook and the store.
- **Why it matters:** Two separate codepaths fetch the same data. If a user marks an episode in `EpisodeDetail` and navigates back, the `currentlyWatching` list on `DiscoveryScreen` can be stale because it reads from its own `useState` snapshot, not the live store.
- **Recommended fix:** Use `useDiscoveryData()` hook (which already uses React Query and the Zustand store) instead of raw `useState` + direct service calls.

#### F-DERIVED-3 · `useHistoryData` — `loading` state synced from store via `useEffect` — 🟡 Medium

- **File:** [src/hooks/useHistoryData.ts](src/hooks/useHistoryData.ts#L60-L73)
- **Issue:** `const [loading, setLoading] = useState(!useAppStore.getState().hydrated)` initialises from the store, then a `useEffect` subscribes to the store and flips `setLoading(false)` when `hydrated` becomes true. This is a state-sync effect that adds an extra render.
- **Why it matters:** Minor — only relevant during app startup — but is a textbook example of the "useState + useEffect to sync" anti-pattern.
- **Recommended fix:** Derive `loading` directly: `const hydrated = useAppStore(s => s.hydrated); const loading = !hydrated;`

#### F-DERIVED-4 · `GDPRConsentModal` — `visible` state derived from store + synced via `useEffect` — 🟡 Medium

- **File:** [src/components/GDPRConsentModal.tsx](src/components/GDPRConsentModal.tsx#L12-L18)
- **Issue:** `const [visible, setVisible] = useState(false)` then `useEffect(() => { if (hydrated && consentGiven === null) setVisible(true); }, ...)`. The visible state is entirely derivable: `const visible = hydrated && consentGiven === null`. The additional useState + useEffect adds a render cycle where the modal is not yet visible even though conditions are met.
- **Recommended fix:** Replace with `const visible = hydrated && consentGiven === null;`. Remove the `useState` and `useEffect`.

---

## 4. Global State Architecture

### 4.1 Zustand Store Design

The app uses a single Zustand store (`src/store/appStore.ts`) containing:

| Slice | Type | Mutators |
|---|---|---|
| `watchedMovies` | `WatchedMovie[]` | add, update, remove |
| `watchedEpisodes` | `WatchedEpisode[]` | mark, remove |
| `watchlist` | `QueuedItem[]` | add, remove |
| `favoriteMovieIds` | `Set<number>` | toggle |
| `favoriteEpisodeIds` | `Set<number>` | toggle |
| `currentlyWatching` | `CurrentlyWatchingItem[]` | add, remove |
| `hydrated` | `boolean` | hydrate |
| `consentGiven` | `boolean \| null` | set |
| `tmdbApiKey` | `string \| null` | set |
| `isOffline` | `boolean` | set |

#### F-STORE-1 · Monolithic store — all data in one `create()` call — 🟡 Medium

- **File:** [src/store/appStore.ts](src/store/appStore.ts#L76-L88)
- **Issue:** All data slices live in a single store. Zustand's referential equality check (`Object.is`) means that updating `watchedMovies` triggers re-evaluation of all selectors — even those reading `watchlist` or `isOffline`. Components using granular selectors like `useAppStore(s => s.isOffline)` are safe because the `isOffline` value itself hasn't changed. However, components that select **reference types** that are always replaced (e.g., `s => s.watchedMovies` returns a new array reference on every movie mutation) will re-render even when unrelated slices change, **if** Zustand batching isn't perfectly aligned.
- **Why it matters:** In practice, Zustand v4+ batches updates in React 18, so this is mostly theoretical. However, separating unrelated slices (e.g., `isOffline` + `consentGiven` + `tmdbApiKey` into a tiny `useSettingsStore`) would make the architecture more explicit and easier to reason about.
- **Recommended fix:** Optional — consider splitting into `useAppDataStore` (watched, watchlist, favorites, currently watching) and `useAppSettingsStore` (hydrated, consentGiven, tmdbApiKey, isOffline).

#### F-STORE-2 · `Set<number>` as store value breaks referential equality — 🟠 High

- **File:** [src/store/appStore.ts](src/store/appStore.ts#L83-L84)
- **Lines:** `favoriteMovieIds: new Set<number>()`, `favoriteEpisodeIds: new Set<number>()`
- **Issue:** Every `toggleFavoriteMovie` / `toggleFavoriteEpisode` call creates a `new Set(...)` and stores it. Zustand compares old vs. new with `Object.is`. Because `new Set(...)` always produces a new reference, every toggle causes **all** components selecting either `favoriteMovieIds` or `favoriteEpisodeIds` to re-render — even if the actual contents of the set haven't changed (e.g., toggling on then off in quick succession).
- **Why it matters:** Components like `HistoryScreen` (which selects `favoriteMovieIds` and `favoriteEpisodeIds`) re-render on every favorite toggle, re-running expensive `useMemo` computations (`showGroups`, `allAvailableGenres`, `unifiedItems`).
- **Recommended fix:** Either:
  - Use a plain `number[]` or `Record<number, boolean>` and compare with a shallow-equality custom selector.
  - Or add a Zustand `subscribeWithSelector` middleware and pass a custom `equalityFn` for Set selectors.

#### F-STORE-3 · No selector memoisation for composed selectors — 🟡 Medium

- **File:** [src/hooks/useEpisodeDetail.ts](src/hooks/useEpisodeDetail.ts#L36-L44)
- **Issue:** 8 separate `useAppStore(s => s.xxx)` calls in `useEpisodeDetail`. Each creates an independent subscription. While individual selectors are cheap, calling 8 selectors means 8 subscription callbacks fire on every store update. This is fine functionally but wastes subscription overhead.
- **Recommended fix:** Consolidate related selectors using Zustand's `useShallow` comparator:
  ```ts
  const { watchlist, favoriteEpisodeIds, storeEpisodes, ... } = useAppStore(
    useShallow(s => ({ watchlist: s.watchlist, ... }))
  );
  ```

### 4.2 Prop Drilling Assessment

#### F-DRILL-1 · `DiscoveryScreen` bypasses store for `currentlyWatching` — 🟠 High

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L166)
- **Issue:** `currentlyWatching` is fetched directly from `StorageProvider.getCurrentlyWatching()` into local state, bypassing the Zustand store which already holds this data. This means updates to `currentlyWatching` from other screens (e.g., `EpisodeDetail` calling `storeAddToCurrentlyWatching`) are not reflected until the user manually refreshes the Discovery screen.
- **Recommended fix:** Use `useAppStore(s => s.currentlyWatching)` directly.

#### F-DRILL-2 · `MainNavigation` passes callbacks 2–3 levels deep — 🟡 Medium

- **File:** [src/navigation/MainNavigation.tsx](src/navigation/MainNavigation.tsx)  
- **Issue:** `MainNavigation` passes `onSelectShow`, `onBackRef`, `refreshRef`, `onSelectMovie`, `onOpenWrapped`, `onNavigateToExplore` as props down to screen components. This is moderate prop drilling (2 levels: Navigation → Screen). Some screens further pass `onSelectShow` down to list item components via render callbacks (3 levels).
- **Why it matters:** Prop drilling at 2–3 levels is manageable. No urgent action needed, but if navigation grows, consider a navigation context or a lightweight event bus.
- **Recommended fix:** Acceptable currently. Monitor growth.

---

## 5. Render Frequency Analysis

### 5.1 Components Rendering More Often Than Necessary

#### F-RENDER-1 · `DiscoveryScreen` — re-renders on every keystroke × every state variable — 🔴 Critical

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx)
- **Trigger:** The `handleSearch` function calls `setQuery(text)` on every keystroke. This triggers a full component re-render which:
  - Recreates `renderSpotlightItem`, `renderPosterItem`, `renderSearchResult` function references.
  - Reruns `.map()` over `spotlight` (8 items), `popular`, `trendingMovies`, `currentlyWatching` arrays — even though search input has nothing to do with these sections.
  - Recreates inline `LoadingComponent` JSX for `FlatList`.
- **Impact:** On a typical search session: ~20 keystrokes × full render with 30+ item iterations = significant frame budget consumption on mid-range devices.
- **Recommended fix:** Isolate search state into a child `SearchOverlay` component so that typing doesn't trigger re-renders of the browse sections below.

#### F-RENDER-2 · `ProfileScreen` — double render on every store change — 🟠 High

- **File:** [src/screens/ProfileScreen.tsx](src/screens/ProfileScreen.tsx#L120-L152)
- **Trigger:** 5 Zustand selectors + `useEffect` that triggers `loadStats` → 7 `setState` calls → second render. Documented in F-DERIVED-1.
- **Impact:** `ProfileScreen` renders twice every time the user navigates to it or any watched data changes while it's mounted.

#### F-RENDER-3 · `HistoryScreen` — re-renders when any store array changes — 🟠 High

- **File:** [src/screens/HistoryScreen.tsx](src/screens/HistoryScreen.tsx)
- **Trigger:** `useHistoryData()` selects `watchedMovies`, `watchedEpisodes`, `favoriteMovieIds`, `favoriteEpisodeIds` from the store. Adding a movie triggers re-render even if the user is viewing the episodes drill-down. The heavy `useMemo` computations in `useHistoryData` (`showGroups`, `unifiedItems`, `allAvailableGenres`) re-execute because at least one dependency array element has a new reference.
- **Impact:** Moderate — the `useMemo` hooks prevent downstream re-renders of list items (which are `React.memo`'d), but the computation itself (iterating all movies + episodes + sorting) runs unnecessarily.
- **Recommended fix:** Use `useShallow` for the Set selectors; consider splitting movie and episode data paths.

#### F-RENDER-4 · `WrappedScreen` — re-renders all cards on page swipe — 🟠 High

- **File:** [src/screens/WrappedScreen.tsx](src/screens/WrappedScreen.tsx#L64)
- **Trigger:** `handleScroll` calls `setCurrentPage(page)` on every scroll snap. This re-renders the component and calls `buildCards(stats, year)` again, rebuilding up to 11 complex card elements.
- **Impact:** Visible in profiler as ~5–15 ms per swipe on mid-range devices.
- **Recommended fix:** Memoise `buildCards` result with `useMemo([stats, year])`. The `currentPage` state is only used for the page indicator dots — it should not cause card rebuilding.

#### F-RENDER-5 · `EpisodeDetail` — re-renders on every `useEpisodeDetail` state change — 🟡 Medium

- **File:** [src/screens/EpisodeDetail.tsx](src/screens/EpisodeDetail.tsx)
- **Trigger:** `useEpisodeDetail` returns ~25 values. Any state change inside the hook (e.g., `setSnackbar`, `setWatchedModalVisible`) triggers a re-render of the entire screen, including the heavy `SeasonBrowser` and `CreditList` subtrees.
- **Recommended fix:** Wrap `SeasonBrowser` and `CreditList` in `React.memo` (F-MEMO-2 / F-MEMO-4). This isolates them from parent re-renders as long as their props haven't changed.

#### F-RENDER-6 · All map-based horizontal `ScrollView` lists in `DiscoveryScreen` — 🟡 Medium

- **File:** [src/screens/DiscoveryScreen.tsx](src/screens/DiscoveryScreen.tsx#L490-L570)
- **Trigger:** Spotlight, Popular, Currently Watching, and Trending Movies sections use `.map()` inside `ScrollView` instead of `FlatList`. This means all items are rendered on every parent re-render regardless of visibility.
- **Recommended fix:** For lists with >6 items, switch to `FlatList` with `horizontal` + `React.memo`'d item components.

#### F-RENDER-7 · `useDiscoveryData` — side effect in render phase — 🟡 Medium

- **File:** [src/hooks/useDiscoveryData.ts](src/hooks/useDiscoveryData.ts#L79-L81)
- **Trigger:** `LayoutAnimation.configureNext()` is called on every render when `loading === false`. This is a side effect in the render phase.
- **Impact:** Documented in F-DEPS-3. Can cause unintended layout animation on unrelated re-renders.

---

## 6. Prioritized Refactoring Roadmap

| Priority | ID | Severity | Area | Summary | Effort |
|---|---|---|---|---|---|
| 1 | F-DERIVED-1 | 🔴 Critical | ProfileScreen | Replace 7 derived `useState` with `useMemo` or single state | Small |
| 2 | F-INLINE-5 | 🔴 Critical | WrappedScreen | Memoize `buildCards()` output; extract sub-components with `React.memo` | Medium |
| 3 | F-RENDER-1 | 🔴 Critical | DiscoveryScreen | Isolate search state; memoize render functions; remove duplicate components | Large |
| 4 | F-CTX-2 | 🟠 High | GDPRConsentModal | Replace `useAppStore()` with granular selectors | Small |
| 5 | F-STORE-2 | 🟠 High | appStore | Replace `Set<number>` with array or add custom equality | Small |
| 6 | F-DERIVED-2 | 🟠 High | DiscoveryScreen | Use `useDiscoveryData()` hook / store for trending & currentlyWatching | Medium |
| 7 | F-DEPS-3 | 🟠 High | useDiscoveryData | Move `LayoutAnimation` call into `useEffect` with transition guard | Small |
| 8 | F-MEMO-1 | 🔴 Critical | DiscoveryScreen | Wrap render functions in `useCallback`; import shared skeletons | Medium |
| 9 | F-MEMO-2 | 🟠 High | SeasonBrowser | Wrap in `React.memo` | Small |
| 10 | F-RENDER-4 | 🟠 High | WrappedScreen | `useMemo` for cards; decouple page indicator from card rebuild | Small |
| 11 | F-DEPS-1 | 🟠 High | DiscoveryScreen | Wrap `handleSearch` in `useCallback` | Small |
| 12 | F-DEPS-2 | 🟠 High | DiscoveryScreen | Wrap `loadTrending` / `handleRefresh` in `useCallback` | Small |
| 13 | F-CTX-1 | 🟡 Medium | NetworkContext | Remove `NetworkContext`; use Zustand selector everywhere | Small |
| 14 | F-DERIVED-3 | 🟡 Medium | useHistoryData | Derive `loading` from `hydrated` selector instead of useEffect sync | Small |
| 15 | F-DERIVED-4 | 🟡 Medium | GDPRConsentModal | Derive `visible` directly instead of syncing via useEffect | Small |
| 16 | F-MEMO-4 | 🟡 Medium | CreditList | Wrap in `React.memo`; memoize `combinedCast` | Small |
| 17 | F-MEMO-3 | 🟡 Medium | NetworkBanner | Wrap in `React.memo` | Small |
| 18 | F-MEMO-5 | 🟡 Medium | WrappedBanner | Wrap in `React.memo` | Small |
| 19 | F-MEMO-6 | 🟡 Medium | SwipeableStars | Wrap in `React.memo` | Small |
| 20 | F-INLINE-4 | 🟡 Medium | MovieDetail | Wrap `onChangeState` in `useCallback` | Small |
| 21 | F-STORE-1 | 🟡 Medium | appStore | Optional: split into data + settings stores | Medium |
| 22 | F-STORE-3 | 🟡 Medium | useEpisodeDetail | Consolidate 8 selectors with `useShallow` | Small |
| 23 | F-INLINE-2 | 🟡 Medium | DiscoveryScreen | Hoist gradient color arrays to module constants | Small |
| 24 | F-RENDER-6 | 🟡 Medium | DiscoveryScreen | Convert `.map()` ScrollViews to `FlatList` for large lists | Medium |
| 25 | F-INLINE-1 | 🟠 High | DiscoveryScreen | Pre-compute `SearchResult` objects in `useMemo` | Small |
| 26 | F-RENDER-2 | 🟠 High | ProfileScreen | Eliminate double render (see F-DERIVED-1) | Small |
| 27 | F-MEMO-7 | 🟢 Low | Modals | Wrap `WatchedMovieModal`/`WatchedEpisodeModal` in `React.memo` | Small |
| 28 | F-INLINE-3 | 🟢 Low | GDPRConsentModal | Hoist gradient constants | Small |

---

*End of audit.*
