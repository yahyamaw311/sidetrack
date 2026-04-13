# UI & UX Quality Audit

---

## VISUAL CONSISTENCY

1. **DiscoveryScreen.tsx** — Duplicated `SkeletonBox` component. A local `SkeletonBox` is redefined inside `DiscoveryScreen.tsx` (line ~30) with its own independent animation loop, despite a shared, optimized `SkeletonBox` already existing in `src/components/SkeletonBox.tsx`. This creates two slightly different skeleton implementations with different animation lifecycles.

2. **DiscoveryScreen.tsx** — Duplicated `PopcornLoader` component. A local `PopcornLoader` is redefined inline (line ~79) using emoji characters (`🍿🎬`), while `src/components/discovery/PopcornLoader.tsx` exists as a separate component using Ionicons. Two versions of the same loader exist with different visuals.

3. **DiscoveryScreen.tsx** — Duplicated `SpotlightSkeleton`, `PosterSkeleton`, `SearchResultSkeleton`, and `DiscoverySkeleton` components. These are redefined locally despite identical extracted versions in `src/components/discovery/DiscoverySkeletons.tsx`. The extracted versions use `useWindowDimensions` for responsive sizing; the inline versions use a static `Dimensions.get('window')` constant.

4. **WrappedScreen.tsx** — Hardcoded hex gradient colors scattered across `CARD_GRADIENTS` array (lines 16–26): `#1a1a2e`, `#16213e`, `#0f3460`, `#e94560`, `#533483`, `#0d0d0d`, `#141E30`, `#243B55`, `#302b63`. These are not sourced from `COLORS` or `GRADIENTS` in theme.ts and cannot be centrally updated.

5. **WrappedScreen.tsx** — Hardcoded `rgba(255,255,255,0.06)`, `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.1)`, `rgba(255,255,255,0.2)`, `rgba(25,25,35,0.8)` used across multiple styles (lines 630, 705, 713, 776, 816, 865, 867, 885). These translucent whites/darks are not defined as theme tokens.

6. **MainNavigation.tsx** — Hardcoded `rgba(7, 7, 11, 0.94)` for `navBar` background (line 413) and `rgba(25, 25, 35, 0.8)` for close button (line 464), `rgba(255,255,255,0.06)` for overlay borders (lines 493, 499). Not sourced from theme constants.

7. **EpisodeDetail.styles.ts / MovieDetail.styles.ts** — Hardcoded `rgba(25,25,35,0.7)` for `backButton` background and `rgba(7,7,11,0.8)` for rating circle background. These translucent overlays are duplicated between both style files and not centralized.

8. **MovieDetail.styles.ts** — Hardcoded `rgba(245,197,24,0.3)` for IMDb badge border, `rgba(200, 165, 85, 0.9)` for trailer play button background. These are color+opacity variants of theme colors but not defined as tokens.

9. **ScreenErrorFallback.tsx** — Hardcoded `rgba(239, 100, 97, 0.1)` for the error icon background (line 58). This is `COLORS.coral` at 10% opacity but constructed manually.

10. **ProfileScreen.tsx** — Hardcoded `rgba(200,165,85,0.08)` for personality gradient (line 232), `rgba(200, 165, 85, 0.2)` for personality card border (line 364), `rgba(239, 100, 97, 0.2)` and `rgba(239, 100, 97, 0.12)` for streak elements (lines 401, 408), `rgba(255,255,255,0.08)` and `rgba(255,255,255,0.06)` for wrapped card and menu styles (lines 510, 535). All constructed from theme colors but not tokenized.

11. **GDPRConsentModal.tsx** — Hardcoded `rgba(255, 255, 255, 0.1)` for icon container background (line 95) and `rgba(0, 0, 0, 0.2)` for provider box background (line 119).

12. **ApiKeyModal.tsx / DatePicker.tsx** — Hardcoded `rgba(0,0,0,0.85)` for overlay background. The same overlay opacity value appears in both files but is not a shared token.

13. **Snackbar.tsx** — Hardcoded `rgba(255,255,255,0.06)` for border (line 91) and `rgba(45, 212, 168, 0.12)`, `rgba(239, 100, 97, 0.12)`, `rgba(200, 165, 85, 0.12)` for type-based background colors (lines 24–26). These derive from theme colors but are constructed inline.

14. **SeasonBrowser.tsx** — Hardcoded `rgba(45,212,168,0.12)` for watched button background (line 530). This duplicates the value from `COLORS.teal` at 0.12 opacity, already used in Snackbar and MovieDetail.

15. **Multiple files** — Inconsistent spacing values that bypass the SPACING scale. Arbitrary `gap` values of `1`, `2`, `3`, `4`, `6`, `10` are used extensively: `CreditList.tsx` (gap 2 at line ~139), `SeasonBrowser.tsx` (gap 2, 10, 14), `HistoryScreen.styles.ts` (gap 1, 2, 3, 4), `MovieDetail.styles.ts` (gap 2, 6, 8), `EpisodeDetail.styles.ts` (gap 2, 6, 8), `WatchedEpisodeModal.tsx` (gap 2, 6, 8, 10), `WatchedMovieModal.tsx` (gap 2, 6, 8, 10), `WrappedScreen.tsx` (gap 2, 6), `WatchlistScreen.tsx` (gap 4). The theme defines a scale of 4/8/16/24/32/48 but these values fall outside it.

16. **SeasonBrowser.tsx** — `paddingVertical: 14` (line 414) and `paddingVertical: 12` (line 444) do not align to the SPACING scale (xs:4, s:8, m:16).

17. **WatchlistScreen.tsx** — `paddingHorizontal: 8, paddingVertical: 2` for `typeBadge` (lines 296–297). The value `2` is not in the SPACING scale.

18. **HistoryScreen.styles.ts** — `paddingVertical: 12` for `episodeRow` (line 342), `padding: 4` for breadcrumb (line 408). The value `12` is between SPACING.s (8) and SPACING.m (16) and not on the scale.

19. **CreditList.tsx** — `marginTop: 2` used for `castCharacter` and `crewName` styles. Not on the SPACING scale.

20. **CreditList.tsx** — `letterSpacing: 0.5` for `crewLabel` (line ~149). The theme defines `LETTER_SPACING` tokens but this value doesn't match any (tight: -0.5, normal: 0, wide: 1).

21. **WatchedEpisodeModal.tsx / WatchedMovieModal.tsx** — Nearly identical 400+ line components with duplicated styles, state management, and layout. These are two slightly different versions of the same modal (one for episodes, one for movies) that should likely share a base component.

22. **MovieDetail.styles.ts / EpisodeDetail.styles.ts** — Near-identical style objects for `backButton`, `backdrop`, `content`, `title`, `metaRow`, `actionButton`, `divider`, `section`, `sectionLabel`, `overview`, `readMore`, `imdbBadge`, `ratingCircle`, and skeleton styles. These are duplicated rather than shared.

23. **ApiKeyModal.tsx** — `marginTop: -8` for `errorText` (line 129). Negative arbitrary pixel value not on the spacing scale.

24. **ApiKeyModal.tsx** — `fontWeight: '600'` on `linkText` while also using `fontFamily: FONTS.bodyMedium`. Mixing fontWeight with a font family that already encodes weight (Inter_500Medium) creates potential inconsistency.

---

## LAYOUT & RESPONSIVENESS

25. **DiscoveryScreen.tsx** — `Dimensions.get('window')` used at module scope (line 17) to derive `SCREEN_WIDTH`, `SPOTLIGHT_WIDTH`, and `POSTER_WIDTH` as static constants. These will not update on orientation change or split-screen mode. The extracted `DiscoverySkeletons.tsx` correctly uses `useWindowDimensions()` for responsive values, but the main screen does not.

26. **DiscoveryScreen.tsx** — `SPOTLIGHT_WIDTH` and `POSTER_WIDTH` are computed once at import time. On foldable devices or when the window resizes, these values become stale, causing incorrect card sizes.

27. **CreditList.tsx** — `castCard` has a fixed `width: 100` and `castImage` has `width: 100, height: 120` (lines ~124–128). These hardcoded pixel dimensions do not adapt to different screen sizes — on small screens the cards may be too wide, and on tablets they will appear undersized.

28. **SeasonBrowser.tsx** — `episodeThumb` has a fixed `width: 80, height: 45` (line ~460). This does not scale with screen size.

29. **WatchedEpisodeModal.tsx** — `episodeThumb` has a fixed `width: 50, height: 50` (line ~282). Hardcoded pixel dimensions.

30. **WatchedMovieModal.tsx** — `episodeThumb` has a fixed `width: 45, height: 68` (line ~282). Hardcoded pixel dimensions.

31. **WatchlistScreen.tsx** — `card` has a fixed `height: 120` and `poster` has `width: 80` (lines ~280, ~287). These fixed values don't adapt to screen size or dynamic type settings.

32. **HistoryScreen.styles.ts** — `showPoster` fixed at `width: 64, height: 48` (line ~276), `epStill` fixed at `width: 72, height: 42` (line ~321). Hardcoded pixel dimensions.

33. **HistoryScreen.styles.ts** — `poster` fixed at `width: 48, height: 72` (line ~120). Hardcoded pixel dimensions.

34. **SwipeableStars.tsx** — `STAR_SIZE = 40`, `STAR_GAP = 4`, `STAR_TOTAL_WIDTH` all computed statically (lines 8–10). On very small screens the star row may not fit; on large screens/tablets the stars may appear small.

35. **DiscoveryScreen.styles.ts** — `searchBar` has a fixed `height: 48` (line 55). This doesn't adapt to dynamic text scaling.

36. **HistoryScreen.styles.ts** — `searchWrap` has a fixed `height: 40` (line ~48). This doesn't adapt to dynamic type sizing.

37. **Config.ts** — `SAFE_AREA_PADDING_TOP: Platform.OS === 'android' ? 44 : 0` hardcodes 44px for Android status bar height. This doesn't account for devices with taller or shorter status bars (e.g., devices with punch-hole cameras) and should use `react-native-safe-area-context` insets instead.

38. **Config.ts** — `MODAL_PADDING_TOP: Platform.OS === 'android' ? 40 : 54` hardcodes platform-specific values that don't use SafeAreaView insets. Will be incorrect on devices with non-standard notch sizes.

39. **DiscoveryScreen.styles.ts** — `safeArea` uses `paddingTop: CONFIG.LAYOUT.SAFE_AREA_PADDING_TOP` instead of SafeAreaView insets. On the DiscoveryScreen, this means the hardcoded 44px will not be correct on all Android devices.

40. **HistoryScreen.styles.ts / WatchlistScreen.tsx / ProfileScreen.tsx** — All use `paddingTop: CONFIG.LAYOUT.SAFE_AREA_PADDING_TOP` on their safe areas. Same hardcoded value issue as DiscoveryScreen.

41. **NetworkBanner.tsx** — `top: Platform.OS === 'ios' ? 44 : 0` hardcodes the iOS status bar offset (line ~43). Should use SafeAreaView insets for robust positioning across devices.

---

## FEEDBACK & LOADING STATES

42. **ApiKeyModal.tsx** — The "Save Key" button (`handleSave`) has no loading/disabled state. If `setTmdbApiKey` is slow, the user can tap multiple times with no visual feedback that submission is in progress.

43. **GDPRConsentModal.tsx** — The "I Understand and Accept" button has no disabled/loading state while `handleConsent` awaits `setConsentGiven`. Multiple rapid taps are not guarded.

44. **EpisodeDetail.tsx / MovieDetail.tsx** — `toggleWatchlist` and `toggleFavorite` buttons have no in-flight guard or loading indicator. Rapid tapping can fire multiple async store operations before the first completes.

45. **SeasonBrowser.tsx** — Episode watch/edit action (`onPress` handler for `epWatchButton`) shows a system `Alert.alert` for edit/remove actions on already-watched episodes (line ~232). Using a native alert for the primary edit flow feels disconnected from the custom UI of the app.

46. **ProfileScreen.tsx** — `handleClearCache` and `handleClearAllData` use `Alert.alert` for confirmation and provide no inline UI feedback after the destructive action completes. The user has no visual confirmation that the cache was cleared or data was deleted beyond the alert dismissal.

47. **DiscoveryScreen.tsx** — Spotlight, Popular, Currently Watching, and Trending Movies sections all use raw `<Image>` instead of `<FadeImage>`. This means there is no skeleton/placeholder while poster images load; images pop in abruptly instead of fading in like they do elsewhere in the app.

48. **DiscoveryScreen.tsx** — Search results also use raw `<Image>` for posters (`renderSearchResult`, line ~286). No loading skeleton or fade-in, unlike the detail screens.

49. **DiscoveryScreen.tsx** — Recent search history item posters use raw `<Image>` (line ~432). Same missing loading feedback.

50. **WatchlistScreen.tsx** — `handleRemove` includes an artificial `setTimeout` delay of 300ms (line ~76) after removal before clearing the deleting state, but there is no snackbar or toast confirming the removal to the user.

51. **DiscoveryScreen.tsx** — The pull-to-refresh operation (`handleRefresh`) has no error handling. If `tmdbService.getTrending()` fails, `setRefreshing(false)` may never be called, leaving the refresh indicator spinning indefinitely (no try/finally).

52. **DiscoveryScreen.tsx** — `loadTrending` also lacks error handling (no try/catch). If the API call fails on initial load, `setLoading(false)` is still called but the screen shows no error state — it would render empty sections with no explanation.

53. **ProfileScreen.tsx** — Stats computation (`loadStats`) catches no errors. If `StatsService.computeWrapped` throws, the profile screen remains in its un-loaded state with no error feedback.

---

## INTERACTION & GESTURES

54. **DiscoveryScreen.tsx** — Spotlight cards, poster cards, and search result cards use `TouchableOpacity` but have no haptic feedback on tap, unlike filter buttons and tab switches which do use haptics. This creates inconsistent tactile feedback across the discovery flow.

55. **WatchlistScreen.tsx** — Watchlist item cards have no haptic feedback on tap, while filter tabs do have haptics. Inconsistent within the same screen.

56. **HistoryScreen.tsx** — Movie and show cards tapped from the history list provide no haptic feedback, while filter chips and the favorites toggle do. Inconsistent tactile response.

57. **WatchedEpisodeModal.tsx / WatchedMovieModal.tsx** — The Like button toggle, toggle switches (Rewatch, No Spoilers), and star rating all lack haptic feedback on the button press itself. The `SwipeableStars` component provides haptics during swipe but the surrounding toggles do not.

58. **Snackbar.tsx** — `pointerEvents="none"` is set on the container (line ~83), which means the snackbar cannot be tapped to dismiss. The user must wait for auto-dismiss — there is no swipe-to-dismiss or tap-to-dismiss interaction.

59. **SwipeableRow.tsx** — Custom `PanResponder` implementation for swipe-to-delete. The `panResponder` is created once in a `useRef` and never re-created, so the closure captures the initial `revealed` value. The `revealed` state inside the responder may become stale if React re-renders between gesture start and release.

60. **WrappedScreen.tsx** — Horizontal paging ScrollView for Wrapped cards. No gesture hint (drag handle, peek of next card, or edge gradient) indicates to the user that horizontal swiping is possible. The only hint is the text "Swipe to explore →" on the hero card, which disappears after scrolling past it.

61. **WrappedScreen.tsx** — Vertical ScrollView nested inside horizontal paging ScrollView (lines ~112–120). The inner vertical ScrollView allows scrolling within a card, but this creates gesture ambiguity: the user may intend a horizontal swipe to page but accidentally scroll vertically, or vice versa. No scroll lock or direction detection is in place.

62. **SeasonBrowser.tsx** — `LayoutAnimation.configureNext` is called on `toggleSeason` and `toggleEpisodeExpand`. On Android, this can cause visual glitches if the experimental `UIManager.setLayoutAnimationEnabledExperimental` flag hasn't been set.

---

## EMPTY, ERROR & EDGE STATES

63. **DiscoveryScreen.tsx** — When search returns no results, the empty state shows a generic `film-outline` icon and "No results found" text with no suggestion to refine the search or check spelling.

64. **DiscoveryScreen.tsx** — If trending data loads but returns an empty array (e.g., API returns zero results), the screen renders empty section containers with headers ("Spotlight", "Popular") but no content inside — no "No trending items" message.

65. **DiscoveryScreen.tsx** — If `loadTrending` fails silently (no try/catch), the screen passes the initial loading state but shows empty sections without explanation or retry option.

66. **EpisodeDetail.tsx** — The error state for load failure shows "Failed to load show" and a Retry button, but does not give a specific reason beyond the generic message. The same fallback is used for network errors, invalid IDs, or any other failure.

67. **MovieDetail.tsx** — Same as EpisodeDetail — generic "Failed to load movie" with a retry button but no differentiated error messaging (network vs. not found vs. other).

68. **SeasonBrowser.tsx** — When a season is expanded but episodes fail to load and the user is NOT offline, the episode list renders as completely empty (no episodes, no error message). The offline banner only appears when `isOffline` is true. An online API failure leaves the season open with no feedback.

69. **WatchlistScreen.tsx** — No onboarding guidance for first-time users. The empty state says "Add movies and shows you want to watch next" but doesn't explain where or how to add them (other than the "Browse Explore" CTA).

70. **HistoryScreen.tsx** — The empty state says "Movies and TV shows you watch will appear here" but provides no guidance on what "logging" a watch means or how to do it for first-time users.

71. **ProfileScreen.tsx** — If `loaded` is false (stats haven't loaded yet), nothing is shown above the scrollable sections — no skeleton, no loading indicator for the personality card, streak, or stats grid. The screen appears to have missing content until stats compute.

72. **CreditList.tsx** — Truncated cast/crew names use `numberOfLines={1}` with no way for the user to see the full name. For long names or character descriptions, the text is permanently cut off.

73. **DiscoveryScreen.tsx** — Poster titles use `numberOfLines={2}` with no way to expand. Long show/movie titles are truncated with ellipsis and the full title is never accessible.

74. **WatchlistScreen.tsx** — Card titles use `numberOfLines={2}` with no expansion mechanism.

75. **HistoryScreen.tsx / HistoryItemCards.tsx** — Show names and episode titles use `numberOfLines={1}` with no expansion or tooltip.

---

## TYPOGRAPHY & READABILITY

76. **WrappedScreen.tsx** — Card content fills the full screen width (`width: SCREEN_WIDTH`) with `CARD_PADDING` of `SPACING.l` (24px). On tablets or large phones, text lines can extend to 80+ characters per line, exceeding optimal readability limits (50–75 characters).

77. **LegalModal.tsx** — Body paragraphs use `fontSize: 14` with full-width content. On tablets or landscape mode, line lengths become excessive since the text fills the available width with only `SPACING.m` (16px) horizontal padding.

78. **GDPRConsentModal.tsx** — The container has `maxWidth: 400` which handles large screens well, but the text inside (`fontSize: 15, lineHeight: 22`) with the narrow padding may still yield long lines on tablets in landscape.

79. **Multiple files** — Section labels (e.g., "CAST", "ABOUT", "SEASONS & EPISODES", "SYNOPSIS") use `textTransform: 'uppercase'` or all-caps strings but with varying `letterSpacing` values: `LETTER_SPACING.wide` (1) in some, `LETTER_SPACING.widest` (2) in others, and `0.5` hardcoded in CreditList.tsx. The inconsistency makes the uppercase text treatment feel uncoordinated.

80. **DiscoveryScreen.styles.ts** — `recentTitle` uses `textTransform: 'uppercase'` with `letterSpacing: LETTER_SPACING.wide` (1), while the `sectionTitle` also uses `textTransform: 'uppercase'` with the same spacing — these are consistent. However, `sectionTitle` uses `fontSize: 14` and `recentTitle` uses `fontSize: 13`, creating an inconsistent size relationship between header labels.

81. **WatchlistScreen.tsx** — `typeBadgeText` has `letterSpacing: LETTER_SPACING.wide` for all-caps text at `fontSize: 9`. At this very small size, the extra letter spacing may harm legibility rather than help it.

82. **SeasonBrowser.tsx** — Episode meta text uses `fontSize: 10` and `fontSize: 11` in multiple places. These extremely small font sizes may be difficult to read for users with vision impairments, especially combined with `COLORS.text.muted` (a low-contrast gray).

83. **HistoryScreen.styles.ts** — `showDate` at `fontSize: 10`, `epDateText` at `fontSize: 10`, `epMetaText` at `fontSize: 11`, `epNumber` at `fontSize: 12`. This micro-cascade of font sizes in 1px increments creates an imperceptible hierarchy.

84. **CreditList.tsx** — `castCharacter` uses `fontSize: 10` and `crewLabel` uses `fontSize: 10`. Very small text on muted-color backgrounds may be illegible.

85. **MovieDetail.styles.ts** — `statusText` uses `textTransform: 'uppercase'` with `letterSpacing: LETTER_SPACING.wide` at `fontSize: 11`. The combination of small size, all-caps, and muted primary color may be hard to read.

---

## NAVIGATION & INFORMATION ARCHITECTURE

86. **MainNavigation.tsx** — Tab bar labels are present (`Explore`, `Watchlist`, `Log`, `You`) which is good. However, `fontSize: 10` for tab labels is very small and may be challenging to read, especially in bright outdoor conditions.

87. **MainNavigation.tsx** — The "Log" tab label is an abbreviated/indirect name. Users may not immediately understand that "Log" corresponds to their watch history screen. The screen itself uses "Watch Log" as its title.

88. **ProfileScreen.tsx** — The screen title is "You" which is vague and inconsistent with the tab label "You". "Profile" or "Settings" would be more descriptive of the content (stats, settings, legal info).

89. **WatchedEpisodeModal.tsx / WatchedMovieModal.tsx** — These full-screen modals use a header with close (X) and save (checkmark) icons but have no swipe-down-to-dismiss gesture. On iOS, users expect to swipe down to close a modal sheet, but `animationType="slide"` does not enable this.

90. **DatePickerModal.tsx** — Same issue: full modal with `animationType="fade"` but no swipe-to-dismiss. The only way to close is the Cancel button.

91. **GDPRConsentModal.tsx** — The modal has `onRequestClose={() => {}}` which explicitly disables the Android back button dismiss. While this is intentional (forcing consent), there is no affordance explaining why the modal cannot be dismissed, which may confuse users.

92. **LegalModal.tsx** — Uses `presentationStyle="pageSheet"` which enables swipe-to-dismiss on iOS. However, the close button is positioned on the right side of the header, while iOS convention places close/dismiss actions on the left.

93. **WrappedScreen.tsx** — Close button is positioned at `top: Platform.OS === 'ios' ? 56 : 40` using hardcoded values rather than safe area insets. On devices with non-standard notch sizes, the button may overlap with the status bar or be unreachable.

94. **MainNavigation.tsx** — Detail overlay uses a custom animated slide-up transition. There is no swipe-down-to-dismiss gesture on the detail overlay — the only way to go back is the back button, which is a small 40×40 circle in the top-left corner.

95. **EpisodeDetail.tsx** — The "Read more" link on the overview section expands the text but provides no "Read less" or collapse option once expanded. The expanded state persists until navigation away.

96. **MovieDetail.tsx** — Same "Read more" without "Read less" issue as EpisodeDetail.

97. **SeasonBrowser.tsx** — The episode watch/action button shows a system `Alert` with "Edit" and "Remove" options. This is a core user flow action (managing watched episodes) buried behind a system dialog instead of an inline UI component.

---

## SCROLL & PERFORMANCE EDGE CASES

98. **DiscoveryScreen.tsx** — The main browse view uses `ScrollView` with `RefreshControl`. Because `ScrollView` renders all children at once (not virtualized), screens with many trending items will render all spotlight and poster images eagerly, which can cause frame drops on lower-end devices.

99. **WrappedScreen.tsx** — `onMomentumScrollEnd` is used for page tracking (line ~108), but rapid swiping or interrupted scrolls may not trigger `onMomentumScrollEnd`, leaving the page indicator out of sync with the visible card.

100. **HistoryScreen.tsx** — `getItemLayout` on the episodes FlatList uses a hardcoded `length: 64` (line ~229). If the actual row height varies (due to dynamic content or text scaling), this causes scroll position jumps and incorrect fast-scroll behavior.

101. **WatchlistScreen.tsx** — `getItemLayout` uses a hardcoded `length: 128` (line ~172). Same potential mismatch if card height varies, causing scroll glitches.
