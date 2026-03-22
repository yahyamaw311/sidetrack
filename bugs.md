# Sidetrack — Bugs, Missing Features & Must-Haves

## 🐛 Bugs

1. **API keys exposed in `app.json`** — TMDB key (`602bfe1cf36c39a33dd747b1cd8495d4`) and OMDB key (`986d085`) are hardcoded in plain text and committed to source control. Should use environment variables or a secrets manager.

10. **Search placeholder says "Movies, shows, people…" but people results are filtered out** — `DiscoveryScreen.tsx` filters out `media_type === 'person'` from search results, but the search bar placeholder implies people search is supported.

17. **Missing `ios` configuration in `app.json`** — There's an `android` block but no `ios` block (no `bundleIdentifier`). iOS builds will require manual configuration.

---

## 🚨 Missing Basic Features / Must-Haves

2. **`AddWatchedScreen` is orphaned / unreachable** — The component exists but is never rendered or navigated to from any screen or navigation route. There is no FAB, button, or menu that opens it. Users have no way to log movies at all through normal navigation.


7. **No accessibility support** — The entire app lacks `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` props on interactive elements (buttons, cards, inputs). The app is unusable for screen reader users.



9. **No sort/filter options in History** — The Watch Log only sorts by date (most recent first). There are no options to sort by rating, title, genre, or media type.

10. **No pagination for search results** — Search uses a single TMDB API call returning ~20 results. There's no infinite scroll or "load more" to see additional results.

11. **No cast & crew information on detail pages** — Neither `MovieDetail` nor `EpisodeDetail` show cast, director, or crew information, despite the `CreditPerson` type being defined and the TMDB API supporting it.




15. **No data backup / export** — All data is stored in AsyncStorage with no export/import functionality. If the user clears app data or switches devices, all watch history is permanently lost.

16. **No loading indicator during watchlist item removal** — Swiping to delete in the watchlist does async storage operations with no visual feedback during the operation.


  