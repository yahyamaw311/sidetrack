import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SwipeableRow } from '../components/SwipeableRow';
import { QueuedItem } from '../types';

interface WatchlistScreenProps {
  onSelectShow: (id: number, type: 'tv' | 'movie') => void;
}

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({ onSelectShow }) => {
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    const data = await StorageProvider.getWatchlist();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleRemove = async (seriesId: number) => {
    await StorageProvider.removeFromWatchlist(seriesId);
    await loadWatchlist();
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: QueuedItem }) => (
    <SwipeableRow onDelete={() => handleRemove(item.seriesId)}>
      <TouchableOpacity
        onPress={() => onSelectShow(item.seriesId, item.itemType || 'tv')}
        style={styles.card}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: tmdbService.getImageUrl(item.posterPath) }}
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
    </SwipeableRow>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="bookmark-outline" size={48} color={COLORS.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add movies and shows you want to watch next
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watchlist</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          )}
        </View>

        {items.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={items}
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
});
