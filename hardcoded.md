# Sidetrack — Hardcoded Values Audit

This document serves as a centralized reference for various hardcoded values, fallbacks, and magic numbers scattered throughout the Sidetrack codebase. This helps provide transparency for future refactoring, testing, and localization efforts.

## Application State & Defaults
- **Default TV Show ID**: `1399` (Game of Thrones) - Used as a fallback inside `EpisodeDetail.tsx` routing if no `tvId` is provided.
- **Default Season & Episode**: Season `1`, Episode `1` - Used as the fallback in routing parameters when navigating to show details without a specific episode selected.
- **Minimum Search Length**: `2` characters - Hardcoded in `CONFIG.LIMITS.MIN_SEARCH_LENGTH` to prevent thrashing the TMDB API with 1-character queries.

## API Limits & Performance constraints
- **Trending / Top Rated Slide Limits**: `CONFIG.LIMITS.TRENDING_SLICE_LIMIT` dictates the UI will only slice the first 10 items for horizontal lists.
- **Cache TTL**: `300000` ms (5 minutes) - The maximum allowed time-to-live for `tmdbService` internal memory caching.
- **Offline / Local Storage Schema Sizes**: Unbounded, but bounded by typical `AsyncStorage` 50MB internal caps on iOS/Android.

## Genres (Movie centric)
The Discovery Explore tab uses a hardcoded subset of TMDB Genre IDs explicitly tuned to `/discover/movie`:
- Action: `28`
- Comedy: `35`
- Drama: `18`
- Horror: `27`
- Sci-Fi: `878`
- Romance: `10749`
- Thriller: `53`
- Animation: `16`
- Documentary: `99`
*Note: Because TMDB separates TV and Movie genre catalogs, TV shows are not currently queried in the genre browsing feed using these IDs.*

## Colors and Themes
The application uses a strict theme dictionary (`theme.ts`) but the following semantic rules are hardcoded in views:
- **Rating Colors**:
  - `> 8.0`: Teal (`COLORS.teal`)
  - `> 6.0`: Yellow (`COLORS.accent`)
  - `< 6.0`: Red 

## Time and Dates
- **Sidetrack Wrapped Unlock Date**: December 15th of the current year (Logic located in `getWrappedUnlockDate()`). If the current date is before Dec 15th, it defaults to the *previous* year's wrapped data.

## Missing Resources
- **Missing Poster Image**: `require('../../assets/no-poster.png')` is hardcoded as the fallback asset when tmdb `poster_path` fails to resolve.
