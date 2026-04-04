# Sidetrack — Flaw Tracker

> *Last audited: April 1, 2026*

## Remaining Flaws

### 🔴 Still Open

| # | Flaw | Category | Severity | Fix Difficulty | Notes |
|---|------|----------|----------|----------------|-------|
| 12 | No data export / backup | Compliance | 🟠 High | Medium | No way to export watch history, ratings, or reviews. Device wipe = permanent data loss. |
| 15 | No search pagination | UX / Scalability | 🟠 High | Medium | Only the first page of TMDB results is ever fetched. |
| 20 | Rating scale inconsistency (0–5 vs 0–10) | Data Integrity | 🟠 High | Medium | User ratings are 0–5 half-star, TMDB/IMDb are 0–10. Displayed side-by-side with no normalization. |
| 21 | NetworkBanner detects offline but changes nothing | Error | 🟠 High | Medium | Banner shows but app doesn't disable API calls, queue actions, or switch to offline mode. |
| 24 | No genre/category browsing | UX | 🟠 High | Medium | `discoverByGenre` exists in the service but no UI consumes it. |
| 26 | API keys embedded in JS bundle (decompilable) | Security | 🟠 High | Hard | `TMDB_API_KEY` read from env/constants and embedded in Axios config. Extractable from bundle. |
| 46 | Cache not invalidated on pull-to-refresh | State | 🟡 Medium | Easy | Pull-to-refresh doesn't call `clearCache()` / `invalidatePrefix()` — only the Profile "Clear Cache" button does. |
| 48 | 0 star rating is ambiguous | Validation | 🟡 Medium | Easy | No distinction between "unrated" and "rated 0 stars". Type uses `number` with no `null` option. |

### 🟡 Partially Fixed

| # | Flaw | Category | Severity | Fix Difficulty | Status |
|---|------|----------|----------|----------------|--------|
| 9 | Zero test coverage | Code Quality | 🔴 Critical | Hard | Core services tested (Mutex, DetailCache, StorageProvider, StatsService, appStore, config, theme). **No tests** for screens, components, hooks, or tmdbService. |
| 16 | No History pagination — all data loaded at once | Scalability | 🟠 High | Medium | Now uses `FlatList` (virtualized rendering), but all data is still loaded into memory at once from AsyncStorage. |
| 19 | `QueuedItem.seriesId` naming collision for movies | Data Integrity | 🟠 High | Medium | Watchlist uses composite keys (`${itemType}_${seriesId}`) preventing collisions, but field is still named `seriesId` for movies — semantically wrong. |
| 22 | API errors silently return null/[] | Error | 🟠 High | Medium | Some methods now call `notifyErrorGlobal()` (search, trending, details), but many still return silently (top rated, discover genre, season detail, episode detail, trailers, IMDb). Error objects are now sanitized. |
| 23 | God components (1,000+ line screens) | Code Quality | 🟠 High | Hard | No files exceed 1,000 lines (improved), but 8+ files are 400–878 lines. `WrappedScreen` (878), `AddWatchedScreen` (572), `SeasonBrowser` (535). |

---

## Compliance Debt (Non-Code)

| Issue | Location | Severity |
|-------|----------|----------|
| **No data export feature** — Users cannot export their watch history, ratings, or reviews in any format. | Nowhere in codebase | 🟠 High |
| **No privacy policy, terms of service, or data disclosure** — Required for app store submission. | Nowhere in codebase | 🟡 Medium |
| **No GDPR-style consent flow** — App hits TMDB, IMDb GraphQL, and YouTube APIs without data collection disclosure. | `tmdbService.ts` | 🟡 Medium |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Fixed | 9 |
| 🟡 Partially fixed | 5 |
| 🔴 Still open | 8 |
| **Total tracked** | **22** |