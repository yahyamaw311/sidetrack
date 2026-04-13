import {  } from 'react-native';

export const COLORS = {
  background: '#07070B',
  surface: '#111118',
  card: '#191923',
  elevated: '#22222E',

  primary: '#C8A555',
  primaryLight: '#DFC07A',
  primaryMuted: 'rgba(200, 165, 85, 0.12)',
  primarySubtle: 'rgba(200, 165, 85, 0.08)',
  primaryBorder: 'rgba(200, 165, 85, 0.2)',

  accent: '#7C6AEF',
  accentMuted: 'rgba(124, 106, 239, 0.12)',

  teal: '#2DD4A8',
  tealMuted: 'rgba(45, 212, 168, 0.12)',

  coral: '#EF6461',
  coralMuted: 'rgba(239, 100, 97, 0.12)',
  coralSubtle: 'rgba(239, 100, 97, 0.1)',
  coralBorder: 'rgba(239, 100, 97, 0.2)',

  favorite: '#E74C6F',

  imdb: '#F5C518',
  imdbBorder: 'rgba(245, 197, 24, 0.3)',
  youtube: '#FF0000',
  warning: '#E67E22',
  starFilled: '#4ADE80',

  shadow: '#000',

  text: {
    primary: '#EDEBE4',
    secondary: '#B8B5AD',
    muted: '#4F4D46',
    inverse: '#07070B',
  },

  border: '#262633',
  borderLight: '#1A1A25',

  overlay: {
    dark: 'rgba(0, 0, 0, 0.85)',
    medium: 'rgba(7, 7, 11, 0.8)',
    light: 'rgba(25, 25, 35, 0.7)',
    navBar: 'rgba(7, 7, 11, 0.94)',
    scrim: 'rgba(25, 25, 35, 0.8)',
    providerBox: 'rgba(0, 0, 0, 0.2)',
  },

  white: {
    alpha06: 'rgba(255, 255, 255, 0.06)',
    alpha08: 'rgba(255, 255, 255, 0.08)',
    alpha10: 'rgba(255, 255, 255, 0.1)',
    alpha20: 'rgba(255, 255, 255, 0.2)',
  },

  trailerButton: 'rgba(200, 165, 85, 0.9)',

  rating: {
    great: '#2DD4A8',
    good: '#C8A555',
    mid: '#F7A44C',
    low: '#EF6461',
  },
};

export const GRADIENTS = {
  cards: [
    ['#1a1a2e', '#16213e', '#0f3460'] as [string, string, string],
    ['#1a1a2e', '#e94560', '#533483'] as [string, string, string],
    ['#0d0d0d', '#1a1a2e', '#1D1D21'] as [string, string, string],
    ['#141E30', '#243B55', '#2DD4A8'] as [string, string, string]
  ],
  wrapped: ['#0f0c29', '#302b63', '#24243e'] as [string, string, string],
  wrappedBanner: ['#1a1a2e', '#302b63', '#0f3460'] as [string, string, string],
  backdrop: ['rgba(7,7,11,0.3)', 'rgba(7,7,11,0.6)', COLORS.background] as [string, string, string],
};

export const LETTER_SPACING = {
  tight: -0.5,
  normal: 0,
  half: 0.5,
  wide: 1,
  wider: 1.5,
  widest: 2,
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
  xxs: 2,
  xs: 4,
  s: 8,
  ms: 12,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const LAYOUT = {
  // Use useWindowDimensions() instead to handle split-screen/rotation
};

export const SHADOWS = {
  small: {
    shadowColor: 'rgba(200, 165, 85, 0.12)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: 'rgba(200, 165, 85, 0.15)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  large: {
    shadowColor: 'rgba(200, 165, 85, 0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
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
