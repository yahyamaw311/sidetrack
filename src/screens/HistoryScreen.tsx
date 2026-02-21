import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SectionList,
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { WatchedMovie, WatchedEpisode } from '../types';

type HistoryTab = 'movies' | 'tvshows';

interface ShowSection {
  seriesId: number;
  seriesName: string;
  data: WatchedEpisode[];
}

interface HistoryScreenProps {
  onSelectMovie?: (id: number) => void;
  onSelectShow?: (id: number) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectMovie, onSelectShow }) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>('movies');
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [episodes, setEpisodes] = useState<WatchedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const [movieData, episodeData] = await Promise.all([
      StorageProvider.getWatchedMovies(),
      StorageProvider.getAllWatchedEpisodes(),
    ]);
    setMovies(movieData);
    setEpisodes(episodeData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRemoveMovie = (movieId: number, title: string, watchedDate: string) => {
    Alert.alert(
      'Remove Entry',
      `Remove "${title}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            await StorageProvider.removeFromWatchedMovies(movieId, watchedDate);
            loadHistory();
          }
        },
      ]
    );
  };

  const handleRemoveEpisode = (episodeId: number, name: string) => {
    Alert.alert(
      'Remove Entry',
      `Remove "${name}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await StorageProvider.removeWatchedEpisode(episodeId);
            loadHistory();
          }
        },
      ]
    );
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  const renderHalfStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<Ionicons key={i} name="star" size={12} color={COLORS.primary} />);
      } else if (rating >= i - 0.5) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color={COLORS.primary} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color={COLORS.text.muted} />);
      }
    }
    return stars;
  };

  const renderMovieItem = ({ item, index }: { item: WatchedMovie; index: number }) => (
    <TouchableOpacity 
      style={styles.row}
      onPress={() => onSelectMovie?.(item.movieId)}
      onLongPress={() => handleRemoveMovie(item.movieId, item.title, item.watchedDate)}
      activeOpacity={0.7}
    >
      {/* Timeline indicator */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: getRatingColor(item.rating) }]} />
        {index < movies.length - 1 && <View style={styles.timelineLine} />}
      </View>

      {/* Poster */}
      <Image 
        source={{ uri: tmdbService.getImageUrl(item.posterPath) }}
        style={styles.poster}
      />
      
      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.releaseDate?.split('-')[0]} · {item.runtime}m
        </Text>
        <View style={styles.bottomRow}>
          <View style={styles.genreRow}>
            {item.genres.slice(0, 2).map((genre, idx) => (
              <Text key={idx} style={styles.genreText}>{genre}</Text>
            ))}
          </View>
          <Text style={styles.dateText}>{formatDate(item.watchedDate)}</Text>
        </View>
      </View>

      {/* Rating */}
      <View style={styles.ratingCol}>
        <Text style={[styles.ratingValue, { color: getRatingColor(item.rating) }]}>
          {item.rating}
        </Text>
        <Text style={styles.ratingMax}>/10</Text>
      </View>
    </TouchableOpacity>
  );

  const totalCount = movies.length + episodes.length;

  // Filter by search query
  const query = searchQuery.trim().toLowerCase();
  const filteredMovies = React.useMemo(() => {
    if (!query) return movies;
    return movies.filter(m => m.title.toLowerCase().includes(query));
  }, [movies, query]);

  // Group episodes by TV show
  const showSections: ShowSection[] = React.useMemo(() => {
    const grouped: Record<number, ShowSection> = {};
    for (const ep of episodes) {
      if (!grouped[ep.seriesId]) {
        grouped[ep.seriesId] = {
          seriesId: ep.seriesId,
          seriesName: ep.seriesName || 'Unknown show',
          data: [],
        };
      }
      grouped[ep.seriesId].data.push(ep);
    }
    // Sort sections by most recent episode watched
    return Object.values(grouped).sort((a, b) => {
      const aLatest = new Date(a.data[0].watchedDate).getTime();
      const bLatest = new Date(b.data[0].watchedDate).getTime();
      return bLatest - aLatest;
    });
  }, [episodes]);

  const filteredSections = React.useMemo(() => {
    if (!query) return showSections;
    return showSections
      .map(section => ({
        ...section,
        data: section.data.filter(ep =>
          (ep.episodeName || '').toLowerCase().includes(query) ||
          section.seriesName.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.data.length > 0);
  }, [showSections, query]);

  // Drill-down: selected show's episodes
  const selectedSection = React.useMemo(() => {
    if (selectedShowId === null) return null;
    return showSections.find(s => s.seriesId === selectedShowId) ?? null;
  }, [showSections, selectedShowId]);

  const drillIntoShow = (seriesId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedShowId(seriesId);
  };

  const drillBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedShowId(null);
  };

  const switchTab = (tab: HistoryTab) => {
    setActiveTab(tab);
    pagerRef.current?.scrollTo({ x: tab === 'movies' ? 0 : screenWidth, animated: true });
  };

  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    const newTab = page === 0 ? 'movies' : 'tvshows';
    if (newTab !== activeTab) setActiveTab(newTab);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Watch Log</Text>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          )}
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={COLORS.text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'movies' ? 'Search movies...' : 'Search TV shows...'}
            placeholderTextColor={COLORS.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'movies' && styles.tabActive]}
            onPress={() => switchTab('movies')}
            activeOpacity={0.7}
          >
            <Ionicons name="film-outline" size={14} color={activeTab === 'movies' ? COLORS.primary : COLORS.text.muted} />
            <Text style={[styles.tabText, activeTab === 'movies' && styles.tabTextActive]}>
              Movies{movies.length > 0 ? ` (${movies.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tvshows' && styles.tabActive]}
            onPress={() => switchTab('tvshows')}
            activeOpacity={0.7}
          >
            <Ionicons name="tv-outline" size={14} color={activeTab === 'tvshows' ? COLORS.primary : COLORS.text.muted} />
            <Text style={[styles.tabText, activeTab === 'tvshows' && styles.tabTextActive]}>
              TV Shows{episodes.length > 0 ? ` (${episodes.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable pager */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPagerScroll}
          scrollEventThrottle={16}
          style={styles.pager}
        >
          {/* Movies page */}
          <View style={{ width: screenWidth }}>
            {filteredMovies.length === 0 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name={query ? 'search-outline' : 'film-outline'} size={48} color={COLORS.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>{query ? 'No results' : 'No movies logged'}</Text>
                <Text style={styles.emptySubtitle}>
                  {query ? `No movies matching "${searchQuery}"` : "Tap the + button to log movies you've watched"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredMovies}
                renderItem={renderMovieItem}
                keyExtractor={item => `m_${item.movieId}_${item.watchedDate}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* TV Shows page */}
          <View style={{ width: screenWidth }}>
            {selectedSection ? (
              /* ── Drill-down: single show's episodes ── */
              <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.drillHeader} onPress={drillBack} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                  <Text style={styles.drillTitle} numberOfLines={1}>{selectedSection.seriesName}</Text>
                  <Text style={styles.sectionCount}>
                    {selectedSection.data.length} episode{selectedSection.data.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
                <FlatList
                  data={selectedSection.data}
                  keyExtractor={item => `e_${item.episodeId}`}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => {
                    const starRating = item.rating || 0;
                    return (
                      <TouchableOpacity
                        style={styles.row}
                        onLongPress={() => handleRemoveEpisode(item.episodeId, item.episodeName || 'this episode')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.timeline}>
                          <View style={[styles.timelineDot, { backgroundColor: starRating > 0 ? COLORS.primary : COLORS.text.muted }]} />
                          {index < selectedSection.data.length - 1 && <View style={styles.timelineLine} />}
                        </View>

                        {item.stillPath ? (
                          <Image
                            source={{ uri: tmdbService.getImageUrl(item.stillPath, 'w300') }}
                            style={styles.episodeStill}
                          />
                        ) : (
                          <View style={[styles.episodeStill, styles.episodeStillPlaceholder]}>
                            <Ionicons name="tv-outline" size={18} color={COLORS.text.muted} />
                          </View>
                        )}

                        <View style={styles.info}>
                          <Text style={styles.title} numberOfLines={1}>
                            {item.episodeName || `Episode ${item.episodeNumber}`}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            S{item.seasonNumber}E{item.episodeNumber}
                          </Text>
                          <View style={styles.bottomRow}>
                            {starRating > 0 ? (
                              <View style={styles.starsRow}>
                                {renderHalfStars(starRating)}
                              </View>
                            ) : (
                              <Text style={styles.genreText}>Not rated</Text>
                            )}
                            <Text style={styles.dateText}>{formatDate(item.watchedDate)}</Text>
                          </View>
                        </View>

                        {item.liked && (
                          <View style={styles.likedCol}>
                            <Ionicons name="heart" size={16} color={COLORS.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : filteredSections.length === 0 ? (
              <View style={styles.centered}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name={query ? 'search-outline' : 'tv-outline'} size={48} color={COLORS.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>{query ? 'No results' : 'No episodes logged'}</Text>
                <Text style={styles.emptySubtitle}>
                  {query ? `No shows matching "${searchQuery}"` : 'Mark episodes as watched from the show detail page'}
                </Text>
              </View>
            ) : (
              <SectionList
                sections={filteredSections}
                renderSectionHeader={({ section }) => (
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => drillIntoShow(section.seriesId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionTitle}>{section.seriesName}</Text>
                    <Text style={styles.sectionCount}>
                      {section.data.length} episode{section.data.length !== 1 ? 's' : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.text.muted} />
                  </TouchableOpacity>
                )}
                renderItem={({ item, index, section }) => {
                  const starRating = item.rating || 0;
                  return (
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => drillIntoShow(item.seriesId)}
                      onLongPress={() => handleRemoveEpisode(item.episodeId, item.episodeName || 'this episode')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timeline}>
                        <View style={[styles.timelineDot, { backgroundColor: starRating > 0 ? COLORS.primary : COLORS.text.muted }]} />
                        {index < section.data.length - 1 && <View style={styles.timelineLine} />}
                      </View>

                      {item.stillPath ? (
                        <Image
                          source={{ uri: tmdbService.getImageUrl(item.stillPath, 'w300') }}
                          style={styles.episodeStill}
                        />
                      ) : (
                        <View style={[styles.episodeStill, styles.episodeStillPlaceholder]}>
                          <Ionicons name="tv-outline" size={18} color={COLORS.text.muted} />
                        </View>
                      )}

                      <View style={styles.info}>
                        <Text style={styles.title} numberOfLines={1}>
                          {item.episodeName || `Episode ${item.episodeNumber}`}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          S{item.seasonNumber}E{item.episodeNumber}
                        </Text>
                        <View style={styles.bottomRow}>
                          {starRating > 0 ? (
                            <View style={styles.starsRow}>
                              {renderHalfStars(starRating)}
                            </View>
                          ) : (
                            <Text style={styles.genreText}>Not rated</Text>
                          )}
                          <Text style={styles.dateText}>{formatDate(item.watchedDate)}</Text>
                        </View>
                      </View>

                      {item.liked && (
                        <View style={styles.likedCol}>
                          <Ionicons name="heart" size={16} color={COLORS.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={item => `e_${item.episodeId}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.card,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.xs,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  pager: {
    flex: 1,
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
  episodeStill: {
    width: 80,
    height: 45,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  episodeStillPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  likedCol: {
    alignItems: 'center',
    minWidth: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.m,
    marginBottom: SPACING.xs,
    gap: SPACING.s,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 16,
    flex: 1,
  },
  sectionCount: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    gap: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    marginBottom: SPACING.xs,
  },
  drillTitle: {
    flex: 1,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    fontSize: 17,
  },
});
