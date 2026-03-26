import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SwipeableRow } from '../components/SwipeableRow';
import { SkeletonBox } from '../components/SkeletonBox';
import { FadeImage } from '../components/FadeImage';
import { QueuedItem } from '../types';
import { useDataEvent } from '../hooks/useDataEvent';

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

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({ onSelectShow, refreshRef, onNavigateToExplore }) => {
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchlistFilter>('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    const data = await StorageProvider.getWatchlist();
    setItems(data);
    setLoading(false);
  }, []);

  // Silent refresh — updates data without showing loading spinner
  const silentRefresh = useCallback(async () => {
    const data = await StorageProvider.getWatchlist();
    setItems(data);
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useDataEvent('watchlist', silentRefresh);

  // Expose refresh to parent so it can trigger reload when detail closes
  const refreshFnRef = useRef(silentRefresh);
  refreshFnRef.current = silentRefresh;

  useEffect(() => {
    if (refreshRef) refreshRef(() => { refreshFnRef.current(); });
    return () => { refreshRef?.(null); };
  }, []);  // Run once — stable callback via ref

  const handleRemove = async (seriesId: number, itemType: 'tv' | 'movie') => {
    const key = `${itemType}_${seriesId}`;
    setDeletingIds(prev => new Set(prev).add(key));
    try {
      await StorageProvider.removeFromWatchlist(seriesId, itemType);
      // Wait a fraction of a second to show the spinner before disappearing
      await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.PULL_TO_REFRESH_DELAY));
      setItems(prev => prev.filter(i => !(i.seriesId === seriesId && (i.itemType || 'tv') === itemType)));
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: QueuedItem }) => {
    const key = `${item.itemType || 'tv'}_${item.seriesId}`;
    const isDeleting = deletingIds.has(key);
    return (
      <SwipeableRow onDelete={() => handleRemove(item.seriesId, item.itemType || 'tv')}>
        <View>
          <TouchableOpacity
            onPress={() => onSelectShow(item.seriesId, item.itemType || 'tv')}
            style={[styles.card, isDeleting && { opacity: 0.6 }]}
            activeOpacity={0.7}
            disabled={isDeleting}
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
          {isDeleting && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10, 10, 20, 0.4)', borderRadius: BORDER_RADIUS.m }]}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          )}
        </View>
      </SwipeableRow>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="bookmark-outline" size={48} color={COLORS.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add movies and shows you want to watch next
      </Text>
      {onNavigateToExplore && (
        <TouchableOpacity style={styles.ctaButton} onPress={onNavigateToExplore} activeOpacity={0.8}>
          <Ionicons name="compass-outline" size={18} color={COLORS.background} />
          <Text style={styles.ctaText}>Browse Explore</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filteredItems = filter === 'all' ? items : items.filter(i => (i.itemType || 'tv') === filter);

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
            keyExtractor={(item) => item.seriesId.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadWatchlist}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
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
    paddingTop: CONFIG.LAYOUT.SAFE_AREA_PADDING_TOP,
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
    paddingHorizontal: SPACING.s + 2,
    paddingVertical: 3,
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
    paddingVertical: SPACING.xs + 2,
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
    paddingBottom: 120,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBadgeText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 1,
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
    gap: 4,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
