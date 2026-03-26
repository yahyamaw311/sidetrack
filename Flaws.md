# 🔥 SIDETRACK — Comprehensive Flaw Audit

## 1. UX Friction & "Death by 1,000 Clicks"

| **No accessibility support whatsoever** — The entire app lacks `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` props on all interactive elements. Completely unusable for screen reader users. | All files | 🔴 Critical |

## 5. Security & Compliance (Deep Tier)

### Privacy Gaps

| Issue | Location | Severity |
|-------|----------|----------|
| **`console.error` logs full error objects** — Every API failure logs the full error (including request URLs with API keys) to the console. In production, these can leak into crash reporting tools. | `tmdbService.ts` (12+ instances) | 🟡 Medium |


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
| **`HistoryScreen` computes `showGroups` and `unifiedItems` in `useMemo` but with broad deps** — Any change to `movies`, `showGroups`, or `query` re-computes the entire unified list. `showGroups` iterates all episodes to group by show on every re-render where `episodes` changes. | `HistoryScreen.tsx:301-342` | 🟡 Medium |
| **Season episodes IMDb ratings fetched in parallel without throttling** — `fetchEpisodeImdbRatings` fires `Promise.all` for every episode in a season simultaneously. A 24-episode season generates 24 near-simultaneous API round trips (TMDB external IDs + IMDb GraphQL = 48 requests). Only the IMDb call has a concurrency limiter of 3. | `SeasonBrowser.tsx:58-70` | 🟠 High |

### Code Quality

| Issue | Location | Severity |
|-------|----------|----------|



---

## 7. Severity Matrix & Action Plan



> *"The best code is the code that never surprises you. This codebase is a surprise party."*
### Complete Flaw Index

| # | Flaw | Category | Severity | Fix Difficulty |
|---|------|----------|----------|----------------|
| 5 | No single source of truth for app state | State | 🔴 Critical | Hard |
| 8 | Zero accessibility support | UX | 🔴 Critical | Medium |
| 9 | Zero test coverage | Code Quality | 🔴 Critical | Hard |
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
| 45 | Detail transition uses setTimeout hack | UX | 🟡 Medium | Easy |
| 46 | Cache not invalidated on pull-to-refresh | State | 🟡 Medium | Easy |
| 47 | No optimistic updates | UX | 🟡 Medium | Medium |
| 48 | 0 star rating is ambiguous | Validation | 🟡 Medium | Easy |