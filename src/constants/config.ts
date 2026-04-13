import { Platform } from 'react-native';

export const CONFIG = {
  LAYOUT: {
    ANDROID_STATUS_BAR_HEIGHT: 44,
    // Deprecated: use useSafeAreaInsets() from react-native-safe-area-context instead
    SAFE_AREA_PADDING_TOP: 0,
    BACKDROP_HEIGHT_RATIO_LOW: 0.35,
    BACKDROP_HEIGHT_RATIO_HIGH: 0.55,
    SPOTLIGHT_WIDTH_RATIO: 0.75,
    TRAILER_ASPECT_RATIO: 0.52,
    TAB_BAR_HEIGHT_IOS: 28,
    TAB_BAR_HEIGHT_ANDROID: 12,
    TAB_BAR_FULL_HEIGHT: 120,
    OVERLAY_Z_INDEX: 50,
    ROUND_BORDER_RADIUS: 999,
    ACTIVE_OPACITY: 0.7,
    ACTIVE_OPACITY_CARD: 0.8,
    ICON_SIZE: { xs: 12, s: 16, m: 20, l: 24, xl: 36, xxl: 48 },
    // Deprecated: use useSafeAreaInsets() from react-native-safe-area-context instead
    MODAL_PADDING_TOP: 0,
    WRAPPED_CONTENT_PADDING_TOP: Platform.OS === 'ios' ? 100 : 80,
    WRAPPED_CLOSE_BUTTON_TOP: Platform.OS === 'ios' ? 56 : 40,
    WRAPPED_DOTS_BOTTOM: Platform.OS === 'ios' ? 50 : 30,
    WRAPPED_COUNTER_TOP: Platform.OS === 'ios' ? 60 : 44,
  },
  TIMING: {
    DEBOUNCE_DELAY: 500,
    SET_TIMEOUT_DELAY_SHORT: 50,
    DETAIL_CLOSE_DURATION: 150,
    ANIMATION_SPRING_DAMPING: 28,
    ANIMATION_SPRING_STIFFNESS: 400,
    ANIMATION_SPRING_MASS: 0.6,
    PULL_TO_REFRESH_DELAY: 300,
    SNACKBAR_DURATION: 2200,
    ERROR_NOTIFY_DELAY: 3000,
  },
  LIMITS: {
    SEARCH_HISTORY_LIMIT: 10,
    MIN_SEARCH_LENGTH: 2,
    CACHE_MAX_ENTRIES: 100,
    TRENDING_SLICE_LIMIT: 12,
    SPOTLIGHT_LIMIT: 8,
    MAX_CONCURRENT_API_CALLS: 3,
  },
  API: {
    CACHE_TTL_MS: 5 * 60 * 1000,
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/',

  },
  WRAPPED_UNLOCK_MONTH: 11, // December (0-indexed)
  WRAPPED_UNLOCK_DAY: 15,
};

export const getWrappedUnlockDate = (year: number) => {
  return new Date(year, CONFIG.WRAPPED_UNLOCK_MONTH, CONFIG.WRAPPED_UNLOCK_DAY);
};
