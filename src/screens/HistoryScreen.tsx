import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { CONFIG } from '../constants/config';

import { WatchedEpisodeModal } from '../components/WatchedEpisodeModal';
import { Snackbar, SnackbarConfig } from '../components/Snackbar';
import { WatchedEpisode, Episode } from '../types';

import { useHistoryData, UnifiedItem, HistoryMediaType, HistorySortBy } from '../hooks/useHistoryData';
import { useAppStore } from '../store/appStore';
import { HistorySkeleton } from '../components/history/HistorySkeletons';
import {
  HistoryMovieRow,
  HistoryShowCard,
  HistoryEpisodeRow
} from '../components/history/HistoryItemCards';
import { styles, tvStyles } from './HistoryScreen.styles';

interface HistoryScreenProps {
  onSelectMovie?: (id: number) => void;
  onSelectShow?: (id: number) => void;
  onOpenWrapped?: () => void;
  onBackRef?: (fn: (() => boolean) | null) => void;
  refreshRef?: (fn: (() => void) | null) => void;
  onNavigateToExplore?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onSelectMovie,
  onSelectShow,
  onBackRef,
  refreshRef,
  onNavigateToExplore
}) => {
  const {
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    favoriteMovieIds,
    favoriteEpisodeIds,
    tvLevel,
    selectedShow,
    selectedShowEpisodes,
    unifiedItems,
    hasMore,
    loadMore,
    totalCount,
    handleRefresh,
    handleRemoveMovie,
    handleRemoveEpisode,
    drillIntoShow,
    drillBack,
    fetchAndSetHistoryData,
    deletingIds,
    sortBy,
    setSortBy,
    filterMediaType,
    setFilterMediaType,
    filterGenre,
    setFilterGenre,
    allAvailableGenres,
  } = useHistoryData();

  const storeMarkEpisodeWatched = useAppStore(s => s.markEpisodeWatched);

  // Edit episode modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editEpisode, setEditEpisode] = useState<Episode | null>(null);
  const [editShow, setEditShow] = useState<{ name: string } | null>(null);
  const [editInitialData, setEditInitialData] = useState<{
    rating?: number | null; liked?: boolean; review?: string; tags?: string;
    rewatch?: boolean; noSpoilers?: boolean; watchedDate?: Date;
  } | null>(null);
  const [editWatchedEntry, setEditWatchedEntry] = useState<WatchedEpisode | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarConfig | null>(null);

  const silentRefreshRef = useRef(fetchAndSetHistoryData);
  silentRefreshRef.current = fetchAndSetHistoryData;

  useEffect(() => {
    if (refreshRef) refreshRef(() => { silentRefreshRef.current(); });
    return () => { refreshRef?.(null); };
  }, [refreshRef]);

  useEffect(() => {
    if (onBackRef) {
      onBackRef(() => {
        if (tvLevel === 'episodes') {
          drillBack();
          return true;
        }
        return false;
      });
    }
    return () => { onBackRef?.(null); };
  }, [tvLevel, onBackRef, drillBack]);

  const query = searchQuery.trim().toLowerCase();

  const renderUnifiedItem = useCallback(({ item }: { item: UnifiedItem }) => {
    if (item.type === 'movie') {
      return (
        <HistoryMovieRow
          item={item.data}
          onSelectMovie={onSelectMovie}
          onRemoveMovie={handleRemoveMovie}
          favoriteMovieIds={favoriteMovieIds}
          isLoading={deletingIds.has(`movie_${item.data.movieId}_${item.data.watchedDate}`)}
        />
      );
    }
    return (
      <HistoryShowCard
        item={item.data}
        drillIntoShow={drillIntoShow}
      />
    );
  }, [onSelectMovie, handleRemoveMovie, favoriteMovieIds, deletingIds, drillIntoShow]);

  const openEpisodeEdit = useCallback((item: WatchedEpisode) => {
    const ep: Episode = {
      id: item.episodeId,
      name: item.episodeName || `Episode ${item.episodeNumber}`,
      episode_number: item.episodeNumber,
      season_number: item.seasonNumber,
      still_path: item.stillPath ?? null,
      air_date: '',
      overview: '',
      vote_average: 0,
      runtime: item.runtime,
    };
    setEditEpisode(ep);
    setEditShow({ name: item.seriesName || 'Unknown Show' });
    setEditInitialData({
      rating: item.rating,
      liked: item.liked,
      review: item.review ?? '',
      tags: item.tags?.join(', ') ?? '',
      rewatch: item.rewatch,
      noSpoilers: item.noSpoilers,
      watchedDate: new Date(item.watchedDate),
    });
    setEditWatchedEntry(item);
    setEditModalVisible(true);
  }, []);

  const handleConfirmEpisodeEdit = useCallback(async (data: {
    rating: number | null; liked: boolean; review: string; tags: string;
    rewatch: boolean; noSpoilers: boolean; watchedDate: Date;
  }) => {
    if (!editWatchedEntry) return;

    const updated: WatchedEpisode = {
      ...editWatchedEntry,
      rating: data.rating,
      liked: data.liked,
      review: data.review.trim() || undefined,
      tags: data.tags.trim() ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      rewatch: data.rewatch,
      noSpoilers: data.noSpoilers,
      watchedDate: data.watchedDate.toISOString(),
    };

    // Route through the Zustand store for optimistic update + automatic rollback on failure
    await storeMarkEpisodeWatched(updated);
    setEditModalVisible(false);
    setEditEpisode(null);
    setEditShow(null);
    setEditInitialData(null);
    setEditWatchedEntry(null);
    setSnackbar({ message: `Updated S${updated.seasonNumber}E${updated.episodeNumber}` });
  }, [editWatchedEntry, storeMarkEpisodeWatched]);

  const renderBreadcrumb = () => {
    if (tvLevel === 'shows' || !selectedShow) return null;

    return (
      <View style={tvStyles.breadcrumb}>
        <TouchableOpacity onPress={drillBack} style={tvStyles.breadcrumbBack} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY} accessibilityRole="button" accessibilityLabel="Go back to shows list">
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={tvStyles.breadcrumbContent}>
          <Text style={tvStyles.breadcrumbTitle} numberOfLines={1}>{selectedShow.seriesName}</Text>
          <Text style={tvStyles.breadcrumbSub}>
            {selectedShowEpisodes.length} episode{selectedShowEpisodes.length !== 1 ? 's' : ''}{showFavoritesOnly ? ' favorited' : ' watched'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onSelectShow?.(selectedShow.seriesId)}
          style={tvStyles.infoButton}
          activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${selectedShow.seriesName}`}
        >
          <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Watch Log</Text>
          </View>
          <HistorySkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (tvLevel === 'episodes') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{showFavoritesOnly ? 'Favorites' : 'Watch Log'}</Text>
          </View>
          {renderBreadcrumb()}
          <FlatList
            data={selectedShowEpisodes}
            renderItem={({ item }) => (
              <HistoryEpisodeRow
                item={item}
                onRemoveEpisode={handleRemoveEpisode}
                openEpisodeEdit={openEpisodeEdit}
                favoriteEpisodeIds={favoriteEpisodeIds}
                isLoading={deletingIds.has(`episode_${item.episodeId}`)}
              />
            )}
            keyExtractor={item => `ep_${item.episodeId}_${item.watchedDate}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        </View>
        <WatchedEpisodeModal
          visible={editModalVisible}
          episode={editEpisode}
          show={editShow as any}
          onClose={() => { setEditModalVisible(false); setEditEpisode(null); setEditShow(null); setEditInitialData(null); setEditWatchedEntry(null); }}
          onConfirm={handleConfirmEpisodeEdit}
          initialData={editInitialData}
        />
        <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{showFavoritesOnly ? 'Favorites' : 'Watch Log'}</Text>
          {!showFavoritesOnly && totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowFavoritesOnly(!showFavoritesOnly);
            }}
            style={[styles.favFilterBtn, showFavoritesOnly && styles.favFilterBtnActive]}
            activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={showFavoritesOnly ? "Show all items" : "Show favorites only"}
            accessibilityState={{ selected: showFavoritesOnly }}
          >
            <Ionicons
              name={showFavoritesOnly ? 'star' : 'star-outline'}
              size={18}
              color={showFavoritesOnly ? COLORS.primary : COLORS.text.muted}
            />
          </TouchableOpacity>
        </View>


        {/* Filters and Sorts */}
        {!searchQuery.trim() && tvLevel === 'shows' && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {/* Media Type Filter */}
              {(['all', 'movie', 'show'] as HistoryMediaType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, filterMediaType === type && styles.filterChipActive]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setFilterMediaType(type);
                  }}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
                >
                  <Text style={[styles.filterChipText, filterMediaType === type && styles.filterChipTextActive]}>
                    {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'Shows'}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.filterDivider} />

              {/* Sort By */}
              {(['date', 'rating', 'title'] as HistorySortBy[]).map(sort => (
                <TouchableOpacity
                  key={sort}
                  style={[styles.filterChip, sortBy === sort && styles.filterChipActive]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSortBy(sort);
                  }}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
                >
                  <Ionicons
                    name={sort === 'date' ? 'calendar-outline' : sort === 'rating' ? 'star-outline' : 'text-outline'}
                    size={12}
                    color={sortBy === sort ? COLORS.primary : COLORS.text.muted}
                  />
                  <Text style={[styles.filterChipText, sortBy === sort && styles.filterChipTextActive]}>
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Genre Filter Scroll */}
            {allAvailableGenres.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, { marginTop: SPACING.s }]}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterGenre && styles.filterChipActive]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setFilterGenre(null);
                  }}
                  activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
                >
                  <Text style={[styles.filterChipText, !filterGenre && styles.filterChipTextActive]}>All Genres</Text>
                </TouchableOpacity>
                {allAvailableGenres.map(genre => (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.filterChip, filterGenre === genre && styles.filterChipActive]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setFilterGenre(genre);
                    }}
                    activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY}
                  >
                    <Text style={[styles.filterChipText, filterGenre === genre && styles.filterChipTextActive]}>{genre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & shows..."
            placeholderTextColor={COLORS.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search watch log"
            accessibilityHint="Type to filter movies and shows"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={COLORS.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {unifiedItems.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={showFavoritesOnly ? 'star-outline' : query ? 'search-outline' : 'albums-outline'} size={48} color={COLORS.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {showFavoritesOnly ? 'No favorites yet' : query ? 'No results' : 'Nothing logged yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {showFavoritesOnly
                ? 'Favorite movies and episodes will appear here'
                : query
                  ? `No movies or shows matching "${searchQuery}"`
                  : 'Movies and TV shows you watch will appear here'}
            </Text>
            {!showFavoritesOnly && !query && onNavigateToExplore && (
              <TouchableOpacity style={styles.ctaButton} onPress={onNavigateToExplore} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD} accessibilityRole="button" accessibilityLabel="Browse Explore" accessibilityHint="Double tap to navigate to Explore">
                <Ionicons name="compass-outline" size={18} color={COLORS.background} />
                <Text style={styles.ctaText}>Browse Explore</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={unifiedItems}
            renderItem={renderUnifiedItem}
            keyExtractor={(item) =>
              item.type === 'movie'
                ? `m_${item.data.movieId}_${item.data.watchedDate}`
                : `s_${item.data.seriesId}`
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </View>
      <WatchedEpisodeModal
        visible={editModalVisible}
        episode={editEpisode}
        show={editShow as any}
        onClose={() => { setEditModalVisible(false); setEditEpisode(null); setEditShow(null); setEditInitialData(null); setEditWatchedEntry(null); }}
        onConfirm={handleConfirmEpisodeEdit}
        initialData={editInitialData}
      />
      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
    </SafeAreaView>
  );
};
