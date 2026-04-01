import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { StorageProvider } from '../services/StorageProvider';

import { WatchedEpisodeModal } from '../components/WatchedEpisodeModal';
import { Snackbar, SnackbarConfig } from '../components/Snackbar';
import { WatchedEpisode, Episode } from '../types';
import { AddWatchedScreen } from './AddWatchedScreen';

import { useHistoryData, UnifiedItem } from '../hooks/useHistoryData';
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
    movies,
    episodes,
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
    handleRefresh,
    handleRemoveMovie,
    handleRemoveEpisode,
    drillIntoShow,
    drillBack,
    loadHistory,
    fetchAndSetHistoryData
  } = useHistoryData();

  // Add Movie Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Edit episode modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editEpisode, setEditEpisode] = useState<Episode | null>(null);
  const [editShow, setEditShow] = useState<{ name: string } | null>(null);
  const [editInitialData, setEditInitialData] = useState<{
    rating?: number; liked?: boolean; review?: string; tags?: string;
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

  const totalCount = movies.length + episodes.length;
  const query = searchQuery.trim().toLowerCase();

  const renderUnifiedItem = ({ item }: { item: UnifiedItem }) => {
    if (item.type === 'movie') {
      return (
        <HistoryMovieRow
          item={item.data}
          onSelectMovie={onSelectMovie}
          onRemoveMovie={handleRemoveMovie}
          favoriteMovieIds={favoriteMovieIds}
        />
      );
    }
    return (
      <HistoryShowCard
        item={item.data}
        drillIntoShow={drillIntoShow}
      />
    );
  };

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
    rating: number; liked: boolean; review: string; tags: string;
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

    await StorageProvider.markEpisodeAsWatched(updated);
    setEditModalVisible(false);
    setEditEpisode(null);
    setEditShow(null);
    setEditInitialData(null);
    setEditWatchedEntry(null);

    fetchAndSetHistoryData();
    setSnackbar({ message: `Updated S${updated.seasonNumber}E${updated.episodeNumber}` });
  }, [editWatchedEntry, fetchAndSetHistoryData]);

  const renderBreadcrumb = () => {
    if (tvLevel === 'shows' || !selectedShow) return null;

    return (
      <View style={tvStyles.breadcrumb}>
        <TouchableOpacity onPress={drillBack} style={tvStyles.breadcrumbBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back to shows list">
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
          activeOpacity={0.7}
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
              />
            )}
            keyExtractor={item => `ep_${item.episodeId}`}
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
            onPress={() => setAddModalVisible(true)}
            style={styles.favFilterBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add watched movie"
          >
            <Ionicons name="add" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowFavoritesOnly(!showFavoritesOnly);
            }}
            style={[styles.favFilterBtn, showFavoritesOnly && styles.favFilterBtnActive]}
            activeOpacity={0.7}
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
              <TouchableOpacity style={styles.ctaButton} onPress={onNavigateToExplore} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Browse Explore" accessibilityHint="Double tap to navigate to Explore">
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
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <AddWatchedScreen onClose={() => { setAddModalVisible(false); loadHistory(); }} />
      </Modal>
      <Snackbar config={snackbar} onDismiss={() => setSnackbar(null)} />
    </SafeAreaView>
  );
};