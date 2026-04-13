import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, LETTER_SPACING } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { SwipeableRow } from '../components/SwipeableRow';
import { SkeletonBox } from '../components/SkeletonBox';
import { FadeImage } from '../components/FadeImage';
import { Snackbar, SnackbarConfig } from '../components/Snackbar';
import { QueuedItem } from '../types';
import { useAppStore } from '../store/appStore';

const WatchlistSkeleton = () => (
  <View style={{ flex: 1, paddingHorizontal: SPACING.m, paddingTop: SPACING.s }}>
    {[0, 1, 2, 3, 4, 5].map(i => (
      <View key={i} style={styles.card}>
        <SkeletonBox style={styles.poster} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <SkeletonBox style={{ width: 50, height: 20, borderRadius: BORDER_RADIUS.xs }} />
          </View>
          <View style={styles.cardBottom}>
            <SkeletonBox style={{ width: '80%', height: 16, borderRadius: BORDER_RADIUS.xs, marginBottom: 8 }} />
            <SkeletonBox style={{ width: '40%', height: 12, borderRadius: BORDER_RADIUS.xs }} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

interface WatchlistScreenProps {
  onSelectShow: (id: number, type: 'tv' | 'movie') => void;
  refreshRef?: (fn: (() => void) | null) => void;
  onNavigateToExplore?: () => void;
}

type WatchlistFilter = 'all' | 'tv' | 'movie';

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({ onSelectShow, onNavigateToExplore }) => {
  const items = useAppStore(s => s.watchlist);
  const hydrated = useAppStore(s => s.hydrated);
  const storeRemoveFromWatchlist = useAppStore(s => s.removeFromWatchlist);
  const [filter, setFilter] = useState<WatchlistFilter>('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

  const loading = !hydrated;

  const handleRemove = useCallback(async (itemId: number, itemType: 'tv' | 'movie') => {
    const key = `${itemType}_${itemId}`;
    const item = items.find(i => i.itemId === itemId && (i.itemType || 'tv') === itemType);
    setDeletingIds(prev => new Set(prev).add(key));
    try {
      await storeRemoveFromWatchlist(itemId, itemType);
      setSnackbar({ message: `${item?.name || 'Item'} removed`, type: 'success' });
      await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.PULL_TO_REFRESH_DELAY));
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [storeRemoveFromWatchlist, items]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = useCallback(({ item }: { item: QueuedItem }) => {
    const key = `${item.itemType || 'tv'}_${item.itemId}`;
    const isDeleting = deletingIds.has(key);
    return (
      <SwipeableRow 
        onDelete={() => handleRemove(item.itemId, item.itemType || 'tv')}
        isLoading={isDeleting}
      >
        <View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectShow(item.itemId, item.itemType || 'tv');
            }}
            style={[styles.card, isDeleting && { opacity: 0.6 }]}
            activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${(item.itemType || 'tv') === 'movie' ? 'Movie' : 'Series'}`}
            accessibilityHint="Double tap to view details, swipe left to delete"
          >
            <FadeImage
              source={tmdbService.getImageSource(item.posterPath)}
              style={styles.poster}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {(item.itemType || 'tv') === 'movie' ? 'MOVIE' : 'SERIES'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
                <View style={styles.dateLine}>
                  <Ionicons name="time-outline" size={12} color={COLORS.text.muted} />
                  <Text style={styles.dateText}>Added {formatDate(item.addedDate)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </SwipeableRow>
    );
  }, [handleRemove, onSelectShow, deletingIds]);

  const renderEmpty = () => {
    const isFilteredEmpty = items.length > 0 && filteredItems.length === 0;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={isFilteredEmpty ? "filter-outline" : "bookmark-outline"} size={48} color={COLORS.text.muted} />
        </View>
        <Text style={styles.emptyTitle}>
          {isFilteredEmpty ? `No ${filter === 'movie' ? 'movies' : 'shows'} in your watchlist` : 'Your watchlist is empty'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isFilteredEmpty ? 'Try a different filter or add some' : 'Add movies and shows you want to watch next'}
        </Text>
        {!isFilteredEmpty && onNavigateToExplore && (
          <TouchableOpacity style={styles.ctaButton} onPress={onNavigateToExplore} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD} accessibilityRole="button" accessibilityLabel="Browse Explore" accessibilityHint="Double tap to navigate to Explore">
            <Ionicons name="compass-outline" size={18} color={COLORS.background} />
            <Text style={styles.ctaText}>Browse Explore</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const filteredItems = useMemo(() => 
    filter === 'all' ? items : items.filter(i => (i.itemType || 'tv') === filter),
    [items, filter]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watchlist</Text>
          {filteredItems.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredItems.length}</Text>
            </View>
          )}
        </View>

        {/* Filter Tabs */}
        {items.length > 0 && (
          <View style={styles.filterRow}>
            {(['all', 'tv', 'movie'] as WatchlistFilter[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${f === 'all' ? 'All' : f === 'tv' ? 'Shows' : 'Movies'}`}
                accessibilityState={{ selected: filter === f }}
              >
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                  {f === 'all' ? 'All' : f === 'tv' ? 'Shows' : 'Movies'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && items.length === 0 ? (
          <WatchlistSkeleton />
        ) : filteredItems.length === 0 && !loading ? (
          renderEmpty()
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.itemId.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => useAppStore.getState().hydrate()}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
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
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryMuted,
  },
  countText: {
    color: COLORS.primary,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.s,
    gap: SPACING.s,
  },
  filterTab: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
  },
  filterTabTextActive: {
    color: COLORS.primary,
  },
  list: {
    paddingHorizontal: SPACING.m,
    paddingBottom: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
    gap: SPACING.s,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    height: 120,
  },
  poster: {
    width: 80,
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.m,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBadgeText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: LETTER_SPACING.wide,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottom: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dateText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.m,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.s,
  },
  ctaText: {
    color: COLORS.background,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
});
