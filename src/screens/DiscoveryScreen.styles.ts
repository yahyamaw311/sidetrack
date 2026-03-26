import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { CONFIG } from '../constants/config';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    paddingTop: CONFIG.LAYOUT.SAFE_AREA_PADDING_TOP,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
  },
  headerTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    paddingHorizontal: SPACING.m,
    height: 48,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.s,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearches: {
    flex: 1,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  recentTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentClear: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.primary,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  recentPoster: {
    width: 36,
    height: 54,
    borderRadius: BORDER_RADIUS.xs,
    marginRight: SPACING.s,
    backgroundColor: COLORS.surface,
  },
  recentPosterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
    marginRight: SPACING.s,
  },
  recentItemTitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  recentItemMeta: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  searchList: {
    paddingHorizontal: SPACING.m,
    paddingBottom: 100,
  },
  searchResultCard: {
    flexDirection: 'row',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.m,
  },
  searchPoster: {
    width: 56,
    height: 84,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  searchTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  searchMeta: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  searchRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchRatingText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 120, // Keep this for now or find SPACING match
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    gap: SPACING.s,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  spotlightList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  spotlightCard: {
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  spotlightGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    justifyContent: 'flex-end',
    padding: SPACING.m,
  },
  spotlightInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  spotlightTitle: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    marginRight: SPACING.s,
  },
  spotlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightRating: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  ratingDot: {
    width: SPACING.s,
    height: SPACING.s,
    borderRadius: 4,
  },
  posterList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  posterCard: {
    gap: SPACING.xs,
  },
  posterImage: {
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.card,
  },
  posterTitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
  },
  genreChipList: {
    paddingLeft: SPACING.m,
    gap: SPACING.s,
    paddingRight: SPACING.m,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  genreChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  genreChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  genreChipTextActive: {
    color: COLORS.primary,
  },
});

export const skeletonStyles = StyleSheet.create({
  spotlightRow: {
    flexDirection: 'row',
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  spotlightCard: {
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.l,
  },
  spotlightTextArea: {
    position: 'absolute',
    bottom: SPACING.m,
    left: SPACING.m,
    right: SPACING.m,
    gap: SPACING.xs,
  },
  titleBar: {
    width: '60%',
    height: 16,
    borderRadius: BORDER_RADIUS.xs,
  },
  ratingBar: {
    width: 40,
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
  posterRow: {
    flexDirection: 'row',
    paddingLeft: SPACING.m,
    gap: SPACING.s,
  },
  posterCard: {
    gap: SPACING.xs,
  },
  posterImage: {
    aspectRatio: 2 / 3,
    borderRadius: BORDER_RADIUS.s,
  },
  posterTitleBar: {
    width: '70%',
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.m,
  },
  searchPoster: {
    width: 56,
    height: 84,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchTextArea: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.s,
  },
  searchTitleBar: {
    width: '65%',
    height: 15,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchMetaBar: {
    width: '40%',
    height: 13,
    borderRadius: BORDER_RADIUS.xs,
  },
  searchRatingBar: {
    width: 30,
    height: 12,
    borderRadius: BORDER_RADIUS.xs,
  },
});
