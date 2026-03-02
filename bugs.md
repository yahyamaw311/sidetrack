# Sidetrack — Bugs, Missing Features & Must-Haves

## 🐛 Bugs

1. **API keys exposed in `app.json`** — TMDB key (`602bfe1cf36c39a33dd747b1cd8495d4`) and OMDB key (`986d085`) are hardcoded in plain text and committed to source control. Should use environment variables or a secrets manager.

8. **`updateWatchedMovieRating` only updates the first matching entry** — In `StorageProvider.ts`, this method uses `.find()` which returns the first match by `movieId`. If a movie was logged multiple times (rewatches), only the first entry's rating gets updated. The user has no control over which one.

10. **Search placeholder says "Movies, shows, people…" but people results are filtered out** — `DiscoveryScreen.tsx` filters out `media_type === 'person'` from search results, but the search bar placeholder implies people search is supported.

17. **Missing `ios` configuration in `app.json`** — There's an `android` block but no `ios` block (no `bundleIdentifier`). iOS builds will require manual configuration.

---

## 🚨 Missing Basic Features / Must-Haves

2. **`AddWatchedScreen` is orphaned / unreachable** — The component exists but is never rendered or navigated to from any screen or navigation route. There is no FAB, button, or menu that opens it. Users have no way to log movies at all through normal navigation.


5. **No confirmation dialog for destructive actions in Watchlist** — Swiping to delete in `WatchlistScreen` calls `handleRemove` immediately without any confirmation. History movie deletions also lack confirmation (episode deletions in `SeasonBrowser` do use `Alert`).



7. **No accessibility support** — The entire app lacks `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` props on interactive elements (buttons, cards, inputs). The app is unusable for screen reader users.

8. **No keyboard dismiss on scroll** — FlatLists and ScrollViews don't set `keyboardDismissMode`, so the keyboard stays visible when scrolling through search results on both Discovery and History screens.

9. **No sort/filter options in History** — The Watch Log only sorts by date (most recent first). There are no options to sort by rating, title, genre, or media type.

10. **No pagination for search results** — Search uses a single TMDB API call returning ~20 results. There's no infinite scroll or "load more" to see additional results.

11. **No cast & crew information on detail pages** — Neither `MovieDetail` nor `EpisodeDetail` show cast, director, or crew information, despite the `CreditPerson` type being defined and the TMDB API supporting it.

12. **No way to manually remove a show from "Currently Watching"** — Shows are auto-added when an episode is logged and auto-removed when fully watched. There's no manual remove button for shows the user dropped or doesn't want visible.

13. **No pull-to-refresh on `EpisodeDetail` screen** — Unlike other screens, the EpisodeDetail has no refresh mechanism. If data loads partially or a network error occurs, the user can only use the Retry button on full failure.

14. **No empty state CTA on Watchlist** — The empty watchlist shows "Your watchlist is empty" with static text but doesn't guide the user to the Explore tab or provide an actionable button.

15. **No data backup / export** — All data is stored in AsyncStorage with no export/import functionality. If the user clears app data or switches devices, all watch history is permanently lost.

16. **No loading indicator during watchlist item removal** — Swiping to delete in the watchlist does async storage operations with no visual feedback during the operation.

17. **`HistoryScreen` loading state is a plain "Loading…" text** — Unlike other screens that use skeleton shimmer loaders, History shows bare text, which is inconsistent with the rest of the app's loading UX.
  