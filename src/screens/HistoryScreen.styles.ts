import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 44 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    gap: SPACING.s,
  },
  headerTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryMuted,
  },
  countText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.s,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.s,
    paddingHorizontal: SPACING.s,
    height: 40,
    gap: SPACING.xs,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.m,
    paddingBottom: 100,
  },
  loadingText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  emptyTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  emptySubtitle: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    marginTop: SPACING.l,
    gap: SPACING.xs,
  },
  ctaText: {
    color: COLORS.background,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: SPACING.m,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    gap: SPACING.m,
  },
  timeline: {
    alignItems: 'center',
    width: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.borderLight,
    position: 'absolute',
    top: 12,
    bottom: -SPACING.m,
  },
  poster: {
    width: 48,
    height: 72,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  meta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genreText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  dateText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  ratingCol: {
    alignItems: 'center',
    minWidth: 36,
  },
  ratingValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  ratingMax: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 9,
  },
  favFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  favFilterBtnActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterContainer: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.s,
  },
  filterScroll: {
    paddingHorizontal: SPACING.m,
    gap: SPACING.s,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: SPACING.m,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  filterDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
  },
});

export const wrappedStyles = StyleSheet.create({
  bannerWrap: {
    marginBottom: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    gap: SPACING.m,
  },
  bannerContent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 17,
  },
  bannerSubtitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
});

export const tvStyles = StyleSheet.create({
  // Level 1: Show cards
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.s,
    marginTop: SPACING.s,
    gap: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  showPoster: {
    width: 64,
    height: 48,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.surface,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  showInfo: {
    flex: 1,
    gap: 2,
  },
  showName: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  showMeta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  showBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginTop: 2,
  },
  avgRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  avgRatingText: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 12,
  },
  showDate: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 10,
  },

  // Level 3: Episode rows
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  epNumberWrap: {
    width: 24,
    alignItems: 'center',
  },
  epNumber: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  epStill: {
    width: 72,
    height: 42,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  epStillPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  epInfo: {
    flex: 1,
    gap: 3,
  },
  epTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 13,
  },
  epMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  epMetaText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  epDateText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 10,
  },

  // Breadcrumb navigation
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    gap: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    marginBottom: SPACING.xs,
  },
  breadcrumbBack: {
    padding: 4,
  },
  breadcrumbContent: {
    flex: 1,
    gap: 1,
  },
  breadcrumbTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  breadcrumbSub: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
