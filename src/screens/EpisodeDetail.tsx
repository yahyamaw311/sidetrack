import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ImageBackground, Platform, ActivityIndicator, Modal, TextInput, Keyboard, PanResponder, GestureResponderEvent, LayoutChangeEvent, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, LAYOUT, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { Episode, TVShowDetail, SeasonDetail, SeasonSummary, WatchedEpisode, EpisodeDetailData } from '../types';
import { DatePickerModal } from '../components/DatePicker';

interface EpisodeDetailProps {
  route?: { params: { tvId: number; seasonNumber: number; episodeNumber: number } };
  onBack?: () => void;
}

const STAR_SIZE = 40;
const STAR_GAP = 4;
const STAR_COUNT = 5;
const STAR_TOTAL_WIDTH = STAR_COUNT * STAR_SIZE + (STAR_COUNT - 1) * STAR_GAP;

const SwipeableStars: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const containerRef = useRef<View>(null);
  const containerX = useRef(0);

  const calcRating = useCallback((pageX: number) => {
    const x = pageX - containerX.current;
    if (x <= 0) return 0;
    if (x >= STAR_TOTAL_WIDTH) return 5;
    // Each star occupies STAR_SIZE + STAR_GAP (except the last)
    const starSlot = STAR_SIZE + STAR_GAP;
    const starIndex = Math.floor(x / starSlot);
    const withinStar = x - starIndex * starSlot;
    if (withinStar <= STAR_SIZE / 2) {
      return starIndex + 0.5;
    }
    return starIndex + 1;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        containerRef.current?.measureInWindow((x) => {
          containerX.current = x;
          onChange(calcRating(evt.nativeEvent.pageX));
        });
      },
      onPanResponderMove: (evt) => {
        onChange(calcRating(evt.nativeEvent.pageX));
      },
    })
  ).current;

  const renderStar = (index: number) => {
    const starNum = index + 1;
    let name: 'star' | 'star-half' | 'star-outline' = 'star-outline';
    if (value >= starNum) {
      name = 'star';
    } else if (value >= starNum - 0.5) {
      name = 'star-half';
    }
    const filled = value >= starNum - 0.5;
    return (
      <Ionicons
        key={index}
        name={name}
        size={STAR_SIZE}
        color={filled ? '#4ADE80' : COLORS.text.muted}
      />
    );
  };

  return (
    <View
      ref={containerRef}
      style={{ flexDirection: 'row', gap: STAR_GAP }}
      {...panResponder.panHandlers}
    >
      {[0, 1, 2, 3, 4].map(renderStar)}
    </View>
  );
};

export const EpisodeDetail: React.FC<EpisodeDetailProps> = ({ route, onBack }) => {
  const { tvId, seasonNumber: initialSeason, episodeNumber: initialEpisode } = route?.params || { tvId: 1399, seasonNumber: 1, episodeNumber: 1 };

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [show, setShow] = useState<TVShowDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imdbRating, setImdbRating] = useState<string | null>(null);
  const [imdbVotes, setImdbVotes] = useState<string | null>(null);
  const [showImdbRating, setShowImdbRating] = useState<string | null>(null);
  const [showImdbVotes, setShowImdbVotes] = useState<string | null>(null);

  // Season/Episode browser state
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, Episode[]>>({});
  const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
  const [episodeImdbRatings, setEpisodeImdbRatings] = useState<Record<string, { rating: string; votes: string }>>({});

  // Expanded episode detail state
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | null>(null);
  const [episodeDetails, setEpisodeDetails] = useState<Record<number, EpisodeDetailData>>({});
  const [loadingEpisodeDetail, setLoadingEpisodeDetail] = useState<number | null>(null);
  // Watched episode dialog state
  const [watchedModalVisible, setWatchedModalVisible] = useState(false);
  const [watchedEpisode, setWatchedEpisode] = useState<Episode | null>(null);
  const [watchedRating, setWatchedRating] = useState(0);
  const [watchedLiked, setWatchedLiked] = useState(false);
  const [watchedReview, setWatchedReview] = useState('');
  const [watchedTags, setWatchedTags] = useState('');
  const [watchedRewatch, setWatchedRewatch] = useState(false);
  const [watchedNoSpoilers, setWatchedNoSpoilers] = useState(false);
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [watchedEpisodeIds, setWatchedEpisodeIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [tvId]);

  const loadData = async () => {
    setLoading(true);
    const [seasonData, showData] = await Promise.all([
      tmdbService.getSeasonDetails(tvId, initialSeason),
      tmdbService.getTVShowDetails(tvId)
    ]);
    
    if (showData) {
      setShow(showData);
      const watchlist = await StorageProvider.getWatchlist();
      setIsInWatchlist(!!watchlist.find(item => item.seriesId === tvId));

      // Fetch show-level IMDb rating
      const showImdbId = showData.external_ids?.imdb_id;
      if (showImdbId) {
        const showRating = await tmdbService.getIMDbRating(showImdbId);
        if (showRating) {
          setShowImdbRating(showRating.imdbRating);
          setShowImdbVotes(showRating.imdbVotes);
        }
      }
    }
    
    if (seasonData) {
      const ep = seasonData.episodes.find(e => e.episode_number === initialEpisode);
      setEpisode(ep || null);
      // Cache episodes for the initial season
      setSeasonEpisodes(prev => ({ ...prev, [initialSeason]: seasonData.episodes }));
      
      if (ep) {
        const fav = await StorageProvider.isEpisodeFavorite(ep.id);
        setIsFavorite(fav);

        // Fetch episode-specific IMDb rating
        const omdb = await tmdbService.getIMDbEpisodeRating(tvId, ep.season_number, ep.episode_number);
        if (omdb) {
          setImdbRating(omdb.imdbRating);
          setImdbVotes(omdb.imdbVotes);
        }
      }
    }
    setLoading(false);

    // Load watched episode IDs
    const allWatched = await StorageProvider.getAllWatchedEpisodes();
    const ids = new Set(allWatched.filter(w => w.seriesId === tvId).map(w => w.episodeId));
    setWatchedEpisodeIds(ids);
  };

  const toggleSeason = async (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }
    setExpandedSeason(seasonNumber);

    // Load episodes if not cached
    if (!seasonEpisodes[seasonNumber]) {
      setLoadingSeason(seasonNumber);
      const data = await tmdbService.getSeasonDetails(tvId, seasonNumber);
      if (data) {
        setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: data.episodes }));
        // Fetch IMDb ratings for all episodes in background
        fetchEpisodeImdbRatings(seasonNumber, data.episodes);
      }
      setLoadingSeason(null);
    } else if (!episodeImdbRatings[`${seasonNumber}-1`]) {
      // Episodes cached but IMDb ratings not yet fetched
      fetchEpisodeImdbRatings(seasonNumber, seasonEpisodes[seasonNumber]);
    }
  };

  const fetchEpisodeImdbRatings = async (seasonNumber: number, episodes: Episode[]) => {
    // Fetch IMDb ratings for all episodes in parallel
    const promises = episodes.map(async (ep) => {
      const key = `${seasonNumber}-${ep.episode_number}`;
      if (episodeImdbRatings[key]) return; // Already cached
      const result = await tmdbService.getIMDbEpisodeRating(tvId, seasonNumber, ep.episode_number);
      if (result) {
        setEpisodeImdbRatings(prev => ({
          ...prev,
          [key]: { rating: result.imdbRating, votes: result.imdbVotes },
        }));
      }
    });
    await Promise.all(promises);
  };

  const toggleEpisodeExpand = async (ep: Episode) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    if (expandedEpisodeId === ep.id) {
      setExpandedEpisodeId(null);
      return;
    }
    setExpandedEpisodeId(ep.id);
    // Also select this episode for the main display
    selectEpisode(ep);

    // Fetch full episode details if not cached
    if (!episodeDetails[ep.id]) {
      setLoadingEpisodeDetail(ep.id);
      const detail = await tmdbService.getEpisodeDetails(tvId, ep.season_number, ep.episode_number);
      if (detail) {
        setEpisodeDetails(prev => ({ ...prev, [ep.id]: detail }));
      }
      setLoadingEpisodeDetail(null);
    }
  };

  const openWatchedModal = (ep: Episode) => {
    setWatchedEpisode(ep);
    setWatchedRating(0);
    setWatchedLiked(false);
    setWatchedReview('');
    setWatchedTags('');
    setWatchedRewatch(false);
    setWatchedNoSpoilers(false);
    setWatchedDate(new Date());
    setWatchedModalVisible(true);
  };

  const handleConfirmWatched = async () => {
    if (!watchedEpisode || !show) return;

    const entry: WatchedEpisode = {
      episodeId: watchedEpisode.id,
      seriesId: tvId,
      seriesName: show.name,
      episodeName: watchedEpisode.name,
      stillPath: watchedEpisode.still_path,
      seasonNumber: watchedEpisode.season_number,
      episodeNumber: watchedEpisode.episode_number,
      rating: watchedRating,
      watchedDate: watchedDate.toISOString(),
      liked: watchedLiked,
      review: watchedReview.trim() || undefined,
      tags: watchedTags.trim() ? watchedTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      rewatch: watchedRewatch,
      noSpoilers: watchedNoSpoilers,
    };

    await StorageProvider.markEpisodeAsWatched(entry);
    setWatchedEpisodeIds(prev => new Set(prev).add(watchedEpisode.id));
    setWatchedModalVisible(false);
    setWatchedEpisode(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const selectEpisode = async (ep: Episode) => {
    setEpisode(ep);
    const fav = await StorageProvider.isEpisodeFavorite(ep.id);
    setIsFavorite(fav);

    // Fetch episode-specific IMDb rating
    setImdbRating(null);
    setImdbVotes(null);
    const omdb = await tmdbService.getIMDbEpisodeRating(tvId, ep.season_number, ep.episode_number);
    if (omdb) {
      setImdbRating(omdb.imdbRating);
      setImdbVotes(omdb.imdbVotes);
    }
  };

  const toggleWatchlist = async () => {
    if (!show) return;
    
    if (isInWatchlist) {
      await StorageProvider.removeFromWatchlist(tvId);
      setIsInWatchlist(false);
    } else {
      await StorageProvider.addToWatchlist({
        seriesId: tvId,
        name: show.name,
        posterPath: show.poster_path,
        addedDate: new Date().toISOString(),
        itemType: 'tv',
      });
      setIsInWatchlist(true);
    }
  };

  const toggleFavorite = async () => {
    if (episode) {
      const newState = !isFavorite;
      await StorageProvider.toggleFavoriteEpisode(episode.id, newState);
      setIsFavorite(newState);
    }
  };

  const formatRuntime = (mins?: number) => {
    if (!mins) return '45m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Filter out specials (season 0) from the seasons list
  const displaySeasons = show?.seasons.filter(s => s.season_number > 0) || [];

  if (loading || !episode || !show) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Full-bleed backdrop */}
        <ImageBackground
          source={{ uri: tmdbService.getImageUrl(episode.still_path || show.backdrop_path, 'w780') }}
          style={styles.backdrop}
        >
          <LinearGradient
            colors={['rgba(7,7,11,0.3)', 'rgba(7,7,11,0.6)', COLORS.background]}
            locations={[0, 0.6, 1]}
            style={styles.backdropGradient}
          />
          
          {/* Episode tag + rating on backdrop */}
          <View style={styles.backdropBottom}>
            <View style={styles.episodeTag}>
              <Text style={styles.episodeTagText}>S{episode.season_number} · E{episode.episode_number}</Text>
            </View>
            {imdbRating ? (
              <View style={styles.imdbBadge}>
                <Text style={styles.imdbLabel}>IMDb</Text>
                <Text style={[styles.imdbScore, { color: getRatingColor(parseFloat(imdbRating)) }]}>
                  {imdbRating}
                </Text>
                {imdbVotes && <Text style={styles.imdbVotes}>{imdbVotes}</Text>}
              </View>
            ) : (
              <View style={[styles.ratingCircle, { borderColor: getRatingColor(episode.vote_average) }]}>
                <Text style={[styles.ratingCircleText, { color: getRatingColor(episode.vote_average) }]}>
                  {episode.vote_average.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{episode.name}</Text>
          <Text style={styles.showName}>{show.name}</Text>

          {/* Meta line */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{episode.air_date}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatRuntime(episode.runtime)}</Text>
          </View>

          {/* Genres */}
          <View style={styles.genreRow}>
            {show.genres.slice(0, 3).map(g => (
              <View key={g.id} style={styles.genreTag}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, isInWatchlist && styles.actionButtonActive]}
              onPress={toggleWatchlist}
            >
              <Ionicons 
                name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
                size={18} 
                color={isInWatchlist ? COLORS.primary : COLORS.text.primary} 
              />
              <Text style={[styles.actionText, isInWatchlist && styles.actionTextActive]}>
                {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
              onPress={toggleFavorite}
            >
              <Ionicons 
                name={isFavorite ? "star" : "star-outline"} 
                size={18} 
                color={isFavorite ? COLORS.primary : COLORS.text.primary} 
              />
              <Text style={[styles.actionText, isFavorite && styles.actionTextActive]}>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EPISODE OVERVIEW</Text>
            <Text style={styles.overview}>{episode.overview || 'No overview available for this episode.'}</Text>
          </View>

          {/* Show Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT THE SHOW</Text>
            <View style={styles.showInfoRow}>
              <View style={styles.showInfoItem}>
                <Text style={styles.showInfoValue}>{show.number_of_seasons}</Text>
                <Text style={styles.showInfoLabel}>Seasons</Text>
              </View>
              <View style={styles.showInfoDivider} />
              <View style={styles.showInfoItem}>
                <Text style={[styles.showInfoValue, { color: getRatingColor(parseFloat(showImdbRating || String(show.vote_average))) }]}>
                  {showImdbRating || show.vote_average.toFixed(1)}
                </Text>
                <Text style={styles.showInfoLabel}>{showImdbRating ? 'IMDb' : 'Rating'}</Text>
              </View>
              <View style={styles.showInfoDivider} />
              <View style={styles.showInfoItem}>
                <View style={[styles.statusDot, show.status === 'Ended' && styles.statusEnded]} />
                <Text style={styles.showInfoLabel}>{show.status}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seasons & Episodes Browser */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SEASONS & EPISODES</Text>
            
            {displaySeasons.map((season) => {
              const isExpanded = expandedSeason === season.season_number;
              const episodes = seasonEpisodes[season.season_number];
              const isLoading = loadingSeason === season.season_number;

              return (
                <View key={season.id} style={styles.seasonBlock}>
                  {/* Season header */}
                  <TouchableOpacity
                    style={styles.seasonHeader}
                    onPress={() => toggleSeason(season.season_number)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.seasonHeaderLeft}>
                      <Text style={styles.seasonTitle}>{season.name}</Text>
                      <Text style={styles.seasonMeta}>
                        {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
                        {season.air_date ? ` · ${season.air_date.split('-')[0]}` : ''}
                      </Text>
                    </View>
                    <View style={styles.seasonChevron}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color={COLORS.text.muted} 
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Episodes list */}
                  {isExpanded && episodes && (
                    <View style={styles.episodesList}>
                      {episodes.map((ep) => {
                        const isSelected = episode.id === ep.id;
                        const isEpExpanded = expandedEpisodeId === ep.id;
                        const epDetail = episodeDetails[ep.id];
                        const isLoadingDetail = loadingEpisodeDetail === ep.id;
                        const imdbKey = `${ep.season_number}-${ep.episode_number}`;
                        const epImdb = episodeImdbRatings[imdbKey];
                        const ratingVal = parseFloat(epImdb?.rating || String(ep.vote_average));

                        return (
                          <View key={ep.id}>
                            <TouchableOpacity
                              style={[styles.episodeRow, isSelected && styles.episodeRowActive]}
                              onPress={() => toggleEpisodeExpand(ep)}
                              activeOpacity={0.7}
                            >
                              {/* Top row: number + thumb + title/meta */}
                              <View style={styles.epTopRow}>
                                <View style={styles.episodeNumberWrap}>
                                  <Text style={[styles.episodeNumber, isSelected && styles.episodeNumberActive]}>
                                    {ep.episode_number}
                                  </Text>
                                </View>
                                {!isEpExpanded && (
                                  ep.still_path ? (
                                    <Image
                                      source={{ uri: tmdbService.getImageUrl(ep.still_path, 'w300') }}
                                      style={styles.episodeThumb}
                                    />
                                  ) : (
                                    <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]}>
                                      <Ionicons name="image-outline" size={16} color={COLORS.text.muted} />
                                    </View>
                                  )
                                )}
                                <View style={styles.episodeInfo}>
                                  <Text style={[styles.episodeTitle, isSelected && styles.episodeTitleActive]} numberOfLines={isEpExpanded ? undefined : 2}>
                                    {ep.name}
                                  </Text>
                                  {!isEpExpanded && (
                                    <View style={styles.episodeMetaRow}>
                                      {ep.air_date ? <Text style={styles.episodeMetaText}>{ep.air_date}</Text> : null}
                                      {ep.runtime ? (
                                        <><View style={styles.epMetaDot} /><Text style={styles.episodeMetaText}>{ep.runtime}m</Text></>
                                      ) : null}
                                      {(epImdb || ep.vote_average > 0) && (
                                        <>
                                          <View style={styles.epMetaDot} />
                                          <View style={styles.episodeRatingRow}>
                                            <Ionicons name="star" size={10} color={getRatingColor(ratingVal)} />
                                            <Text style={[styles.episodeMetaText, { color: getRatingColor(ratingVal) }]}>
                                              {epImdb?.rating || ep.vote_average.toFixed(1)}
                                            </Text>
                                          </View>
                                        </>
                                      )}
                                    </View>
                                  )}
                                </View>
                                <Ionicons
                                  name={isEpExpanded ? "chevron-up" : "chevron-down"}
                                  size={14}
                                  color={COLORS.text.muted}
                                  style={{ marginLeft: 2 }}
                                />
                                <TouchableOpacity
                                  style={[
                                    styles.epWatchButton,
                                    watchedEpisodeIds.has(ep.id) && styles.epWatchButtonDone,
                                  ]}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    if (!watchedEpisodeIds.has(ep.id)) {
                                      openWatchedModal(ep);
                                    }
                                  }}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons
                                    name={watchedEpisodeIds.has(ep.id) ? "checkmark" : "add"}
                                    size={14}
                                    color={watchedEpisodeIds.has(ep.id) ? COLORS.teal : COLORS.text.muted}
                                  />
                                </TouchableOpacity>
                              </View>
                            </TouchableOpacity>

                            {/* Expanded episode detail */}
                            {isEpExpanded && (
                              <View style={styles.epExpandedWrap}>
                                {isLoadingDetail ? (
                                  <View style={styles.epExpandedLoading}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                  </View>
                                ) : epDetail ? (
                                  <>
                                    {/* Centered still image */}
                                    {ep.still_path && (
                                      <View style={styles.epExpandedImageWrap}>
                                        <Image
                                          source={{ uri: tmdbService.getImageUrl(ep.still_path, 'w780') }}
                                          style={styles.epExpandedImage}
                                        />
                                      </View>
                                    )}

                                    {/* Rating + Votes + Runtime bar */}
                                    <View style={styles.epExpandedStats}>
                                      {(epImdb || ep.vote_average > 0) && (
                                        <View style={styles.epStatItem}>
                                          <Ionicons name="star" size={14} color={getRatingColor(ratingVal)} />
                                          <Text style={[styles.epStatValue, { color: getRatingColor(ratingVal) }]}>
                                            {epImdb?.rating || ep.vote_average.toFixed(1)}
                                          </Text>
                                          {(epImdb?.votes || epDetail.vote_count) && (
                                            <Text style={styles.epStatLabel}>
                                              ({epImdb?.votes || epDetail.vote_count?.toLocaleString()})
                                            </Text>
                                          )}
                                        </View>
                                      )}
                                      {ep.runtime ? (
                                        <View style={styles.epStatItem}>
                                          <Ionicons name="time-outline" size={13} color={COLORS.text.muted} />
                                          <Text style={styles.epStatLabel}>{ep.runtime} min</Text>
                                        </View>
                                      ) : null}
                                      {ep.air_date ? (
                                        <View style={styles.epStatItem}>
                                          <Ionicons name="calendar-outline" size={13} color={COLORS.text.muted} />
                                          <Text style={styles.epStatLabel}>{ep.air_date}</Text>
                                        </View>
                                      ) : null}
                                    </View>

                                    {/* Overview */}
                                    {ep.overview ? (
                                      <Text style={styles.epExpandedOverview}>{ep.overview}</Text>
                                    ) : null}
                                  </>
                                ) : (
                                  <Text style={styles.epExpandedOverview}>No additional details available.</Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed back button – stays in place during scroll */}
      {onBack && (
        <SafeAreaView style={styles.backSafe} pointerEvents="box-none">
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Watched Episode Modal */}
      <Modal
        visible={watchedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWatchedModalVisible(false)}
      >
        <View style={watchedStyles.overlay}>
          <View style={watchedStyles.container}>
            {/* Header */}
            <View style={watchedStyles.header}>
              <TouchableOpacity onPress={() => setWatchedModalVisible(false)} style={watchedStyles.headerBtn}>
                <Ionicons name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={watchedStyles.headerTitle}>I Watched</Text>
              <TouchableOpacity onPress={handleConfirmWatched} style={watchedStyles.headerBtn}>
                <Ionicons name="checkmark" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={watchedStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Episode info */}
              {watchedEpisode && (
                <View style={watchedStyles.episodeInfo}>
                  {watchedEpisode.still_path ? (
                    <Image
                      source={{ uri: tmdbService.getImageUrl(watchedEpisode.still_path, 'w300') }}
                      style={watchedStyles.episodeThumb}
                    />
                  ) : (
                    <View style={[watchedStyles.episodeThumb, watchedStyles.thumbPlaceholder]}>
                      <Ionicons name="film-outline" size={20} color={COLORS.text.muted} />
                    </View>
                  )}
                  <View style={watchedStyles.episodeText}>
                    <Text style={watchedStyles.episodeTitle} numberOfLines={2}>
                      {show?.name} — S{watchedEpisode.season_number}E{watchedEpisode.episode_number}
                    </Text>
                    <Text style={watchedStyles.episodeSub} numberOfLines={1}>{watchedEpisode.name}</Text>
                  </View>
                </View>
              )}

              {/* Date */}
              <TouchableOpacity style={watchedStyles.row} onPress={() => setDatePickerVisible(true)} activeOpacity={0.7}>
                <Text style={watchedStyles.rowLabel}>Date</Text>
                <View style={watchedStyles.dateRight}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
                  <Text style={watchedStyles.dateText}>{formatDate(watchedDate)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
                </View>
              </TouchableOpacity>
              <View style={watchedStyles.separator} />

              <DatePickerModal
                visible={datePickerVisible}
                date={watchedDate}
                onConfirm={(d) => { setWatchedDate(d); setDatePickerVisible(false); }}
                onCancel={() => setDatePickerVisible(false)}
              />

              {/* Star rating + Like */}
              <View style={watchedStyles.ratingLikeRow}>
                <View style={watchedStyles.starsWrap}>
                  <SwipeableStars value={watchedRating} onChange={setWatchedRating} />
                  <Text style={watchedStyles.starsLabel}>{watchedRating > 0 ? 'Rated' : 'Rate'}</Text>
                </View>
                <TouchableOpacity
                  style={watchedStyles.likeWrap}
                  onPress={() => setWatchedLiked(!watchedLiked)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={watchedLiked ? "heart" : "heart-outline"}
                    size={36}
                    color={watchedLiked ? COLORS.coral : COLORS.text.muted}
                  />
                  <Text style={watchedStyles.likeLabel}>Like</Text>
                </TouchableOpacity>
              </View>
              <View style={watchedStyles.separator} />

              {/* Review */}
              <TextInput
                style={watchedStyles.reviewInput}
                placeholder="Add review..."
                placeholderTextColor={COLORS.text.muted}
                value={watchedReview}
                onChangeText={setWatchedReview}
                multiline
                textAlignVertical="top"
              />
              <View style={watchedStyles.separator} />

              {/* Tags */}
              <TextInput
                style={watchedStyles.tagsInput}
                placeholder="Add tags..."
                placeholderTextColor={COLORS.text.muted}
                value={watchedTags}
                onChangeText={setWatchedTags}
              />
              <View style={watchedStyles.separator} />

              {/* Toggles */}
              <View style={watchedStyles.toggleRow}>
                <TouchableOpacity
                  style={watchedStyles.toggleItem}
                  onPress={() => setWatchedRewatch(!watchedRewatch)}
                  activeOpacity={0.7}
                >
                  <View style={watchedStyles.toggleIconWrap}>
                    {watchedRewatch && (
                      <View style={watchedStyles.toggleCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                      </View>
                    )}
                    <Ionicons name="eye-outline" size={28} color={watchedRewatch ? COLORS.text.primary : COLORS.text.muted} />
                  </View>
                  <Text style={[watchedStyles.toggleLabel, watchedRewatch && watchedStyles.toggleLabelActive]}>
                    I've seen this{'\n'}before
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={watchedStyles.toggleItem}
                  onPress={() => setWatchedNoSpoilers(!watchedNoSpoilers)}
                  activeOpacity={0.7}
                >
                  <View style={watchedStyles.toggleIconWrap}>
                    {watchedNoSpoilers && (
                      <View style={watchedStyles.toggleCheck}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                      </View>
                    )}
                    <Ionicons name="shield-outline" size={28} color={watchedNoSpoilers ? COLORS.text.primary : COLORS.text.muted} />
                  </View>
                  <Text style={[watchedStyles.toggleLabel, watchedNoSpoilers && watchedStyles.toggleLabelActive]}>
                    No spoilers
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  scroll: {
    flex: 1,
  },
  backdrop: {
    height: LAYOUT.window.height * 0.5,
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
    zIndex: 10,
  },
  backButton: {
    margin: SPACING.m,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(25,25,35,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  backdropBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.l,
  },
  episodeTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
  },
  episodeTagText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  ratingCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 2,
    backgroundColor: 'rgba(7,7,11,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingCircleText: {
    fontFamily: FONTS.display,
    fontSize: 16,
  },
  imdbBadge: {
    backgroundColor: 'rgba(7,7,11,0.85)',
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
    gap: 2,
  },
  imdbLabel: {
    color: '#F5C518',
    fontFamily: FONTS.heading,
    fontSize: 11,
    letterSpacing: 1,
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
    paddingBottom: 120,
    marginTop: -SPACING.m,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 30,
  },
  showName: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    marginTop: 2,
    marginBottom: SPACING.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.m,
  },
  metaText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.text.muted,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.l,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
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
    gap: 6,
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
    letterSpacing: 2,
    marginBottom: SPACING.s,
  },
  overview: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 24,
  },
  showInfoRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  showInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  showInfoDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
  },
  showInfoValue: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  showInfoLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  statusEnded: {
    backgroundColor: COLORS.text.muted,
  },
  // Season & Episode browser styles
  seasonBlock: {
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: 14,
  },
  seasonHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  seasonTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  seasonMeta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  seasonChevron: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodesList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  episodeRow: {
    paddingHorizontal: SPACING.m,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  episodeRowActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  epTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeNumberWrap: {
    width: 24,
    alignItems: 'center',
  },
  episodeNumber: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
  episodeNumberActive: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  episodeThumb: {
    width: 80,
    height: 45,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.surface,
  },

  episodeThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  episodeTitleActive: {
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  episodeMetaText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  epMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.text.muted,
  },
  episodeRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  episodeDesc: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginLeft: 34,
  },
  nowPlayingBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  epWatchButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  epWatchButtonDone: {
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(45,212,168,0.12)',
  },
  // Expanded episode detail styles
  epExpandedWrap: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  epExpandedLoading: {
    paddingVertical: SPACING.l,
    alignItems: 'center',
  },
  epExpandedImageWrap: {
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  epExpandedImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.card,
  },
  epExpandedTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
    marginBottom: SPACING.xs,
  },
  epExpandedStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.m,
    marginBottom: SPACING.m,
  },
  epStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  epStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  epStatLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  epExpandedOverview: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.m,
  },
});

const watchedStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    paddingTop: Platform.OS === 'android' ? 40 : 54,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.m,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    paddingVertical: SPACING.m,
  },
  episodeThumb: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeText: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  episodeSub: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.m,
  },
  rowLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
  },
  dateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  ratingLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.l,
  },
  starsWrap: {
    alignItems: 'flex-start',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starsLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  likeWrap: {
    alignItems: 'center',
    gap: 6,
  },
  likeLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  reviewInput: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: SPACING.m,
    minHeight: 100,
  },
  tagsInput: {
    color: COLORS.text.primary,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: SPACING.m,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.xl,
  },
  toggleItem: {
    alignItems: 'center',
    gap: 8,
  },
  toggleIconWrap: {
    position: 'relative',
  },
  toggleCheck: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 1,
  },
  toggleLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: COLORS.text.secondary,
  },
});
