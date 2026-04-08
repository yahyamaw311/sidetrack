### 🟡 Partially Fixed

| 9 | Zero test coverage | Code Quality | 🔴 Critical | Hard | Core services tested (Mutex, DetailCache, StorageProvider, StatsService, appStore, config, theme). **No tests** for screens, components, hooks, or tmdbService. |

| 23 | God components (1,000+ line screens) | Code Quality | 🟠 High | Hard | No files exceed 1,000 lines (improved), but 8+ files are 400–878 lines. `WrappedScreen` (878), `AddWatchedScreen` (572), `SeasonBrowser` (535). |


| **No data export feature** — Users cannot export their watch history, ratings, or reviews in any format. | Nowhere in codebase | 🟠 High |



when clicking on explore even after being on explore, it should redirect me to the main explore page instead of doing nothing. This is a common pattern in mobile apps where tapping the active tab resets the navigation stack to the root of that tab. Currently, if I'm on a nested screen within Explore (like MovieDetail) and tap the Explore tab again, it does nothing instead of taking me back to the main Discovery screen.



search for all irrelevant code snippets or files that are not related to the above two features and remove them. This includes any code related to the Watchlist, History, WrappedScreen, and any other screens or components that are not directly involved in the Explore search functionality. The goal is to declutter the codebase and focus on implementing the new search features without distractions from unrelated code. also remove all the code that is unsuded by the app anymore, such as the AddWatchedScreen which is currently unreachable. This will help reduce maintenance overhead and potential confusion for future developers working on the codebase.

when opening a tv show the details are the ones of the first episode and the overview are the ones of the first episode instead of the show. The details screen for a TV show should display the show's overall information (like the show's overview, genres, etc.) rather than defaulting to the first episode's details. Currently, when I tap on a TV show from the search results, it takes me to the EpisodeDetail screen showing the first episode's info instead of a ShowDetail screen with the show's info. This is confusing and not the expected behavior for users looking for show-level information.

find all the hardcoded values in the app and put them in a file called hardcoded.md to be able to change them later.