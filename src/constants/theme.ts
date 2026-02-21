import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  background: '#07070B',
  surface: '#111118',
  card: '#191923',
  elevated: '#22222E',

  primary: '#C8A555',
  primaryLight: '#DFC07A',
  primaryMuted: 'rgba(200, 165, 85, 0.12)',

  accent: '#7C6AEF',
  accentMuted: 'rgba(124, 106, 239, 0.12)',

  teal: '#2DD4A8',
  coral: '#EF6461',

  text: {
    primary: '#EDEBE4',
    secondary: '#8C897F',
    muted: '#4F4D46',
    inverse: '#07070B',
  },

  border: '#262633',
  borderLight: '#1A1A25',

  rating: {
    great: '#2DD4A8',
    good: '#C8A555',
    mid: '#F7A44C',
    low: '#EF6461',
  },
};

export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  heading: 'SpaceGrotesk_600SemiBold',
  mono: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const LAYOUT = {
  window: { width, height },
  isSmallDevice: width < 375,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const BORDER_RADIUS = {
  xs: 6,
  s: 10,
  m: 14,
  l: 20,
  xl: 28,
  round: 999,
};

export const getRatingColor = (rating: number) => {
  if (rating >= 8) return COLORS.rating.great;
  if (rating >= 6.5) return COLORS.rating.good;
  if (rating >= 5) return COLORS.rating.mid;
  return COLORS.rating.low;
};
