import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, LETTER_SPACING } from '../constants/theme';
import { CONFIG } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.m,
  },
  loadingText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: SPACING.s,
  },
  retryButton: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: SPACING.s,
  },
  retryText: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  backdrop: {
    justifyContent: 'flex-end',
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backSafe: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 32 : 0,
    left: 0,
    right: 0,
  },
  backButton: {
    margin: SPACING.m,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  backdropRating: {
    position: 'absolute',
    bottom: SPACING.l,
    right: SPACING.m,
  },
  ratingCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
    backgroundColor: COLORS.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingCircleText: {
    fontFamily: FONTS.display,
    fontSize: 16,
  },
  imdbBadge: {
    backgroundColor: COLORS.overlay.dark,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.s,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.imdbBorder,
    gap: SPACING.xxs,
  },
  imdbLabel: {
    color: COLORS.imdb,
    fontFamily: FONTS.heading,
    fontSize: 11,
    letterSpacing: LETTER_SPACING.wide,
  },
  imdbScore: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },
  imdbVotes: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 9,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingBottom: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
    marginTop: -SPACING.m,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: SPACING.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  metaText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.text.muted,
  },
  statusText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wide,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
    marginBottom: SPACING.l,
  },
  genreTag: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.s,
  },
  logButtonWatched: {
    backgroundColor: COLORS.tealMuted,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  logButtonText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  logButtonTextWatched: {
    color: COLORS.teal,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.l,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  actionButtonActive: {
    borderColor: COLORS.primaryMuted,
    backgroundColor: COLORS.primaryMuted,
  },
  actionText: {
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  actionTextActive: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.l,
  },
  section: {
    marginBottom: SPACING.l,
  },
  sectionLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: LETTER_SPACING.widest,
    marginBottom: SPACING.s,
  },
  overview: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 24,
  },
  readMore: {
    color: COLORS.primary,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  trailerContainer: {
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    aspectRatio: CONFIG.LAYOUT.TRAILER_ASPECT_RATIO,
  },
  trailerThumbnail: {
    width: '100%',
    height: '100%',
  },
  trailerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  trailerPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.trailerButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ── Skeleton loader styles ──
export const skelStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: COLORS.card,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.l,
    gap: SPACING.m,
  },
  titleLine: {
    height: 28,
    width: '70%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  subtitleLine: {
    height: 16,
    width: '45%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  metaRow: {
    flexDirection: 'row' as const,
    gap: SPACING.s,
  },
  metaChip: {
    height: 28,
    width: 72,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.round,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: SPACING.s,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.s,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.card,
  },
  textBlock: {
    height: 14,
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
  textBlockShort: {
    height: 14,
    width: '65%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xs,
  },
});
