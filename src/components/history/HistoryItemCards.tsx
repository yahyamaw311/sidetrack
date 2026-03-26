import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { SwipeableRow } from '../SwipeableRow';
import { FadeImage } from '../FadeImage';
import { tmdbService } from '../../services/tmdbService';
import { WatchedMovie, WatchedEpisode } from '../../types';
import { ShowGroup } from '../../hooks/useHistoryData';
import { tvStyles } from '../../screens/HistoryScreen.styles';

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

interface HistoryMovieRowProps {
  item: WatchedMovie;
  onSelectMovie?: (id: number) => void;
  onRemoveMovie: (movieId: number, watchedDate: string) => void;
  favoriteMovieIds: Set<number>;
}

export const HistoryMovieRow: React.FC<HistoryMovieRowProps> = ({ item, onSelectMovie, onRemoveMovie, favoriteMovieIds }) => (
  <SwipeableRow onDelete={() => onRemoveMovie(item.movieId, item.watchedDate)}>
    <TouchableOpacity
      style={tvStyles.showCard}
      onPress={() => onSelectMovie?.(item.movieId)}
      activeOpacity={0.7}
    >
      {item.posterPath ? (
        <FadeImage
          source={tmdbService.getImageSource(item.posterPath)}
          style={tvStyles.showPoster}
        />
      ) : (
        <View style={[tvStyles.showPoster, tvStyles.posterPlaceholder]}>
          <Ionicons name="film-outline" size={20} color={COLORS.text.muted} />
        </View>
      )}

      <View style={tvStyles.showInfo}>
        <Text style={tvStyles.showName} numberOfLines={1}>{item.title}</Text>
        <Text style={tvStyles.showMeta}>
          {item.releaseDate?.split('-')[0]} · {item.runtime}m
        </Text>
        <View style={tvStyles.showBottomRow}>
          {item.rating > 0 && (
            <View style={tvStyles.avgRatingWrap}>
              <Ionicons name="star" size={11} color={COLORS.primary} />
              <Text style={tvStyles.avgRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.liked && (
            <Ionicons name="heart" size={12} color={COLORS.coral} />
          )}
          {favoriteMovieIds.has(item.movieId) && (
            <Ionicons name="star" size={12} color={COLORS.primary} />
          )}
          <Text style={tvStyles.showDate}>{formatDate(item.watchedDate)}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
    </TouchableOpacity>
  </SwipeableRow>
);

interface HistoryShowCardProps {
  item: ShowGroup;
  drillIntoShow: (seriesId: number) => void;
}

export const HistoryShowCard: React.FC<HistoryShowCardProps> = ({ item, drillIntoShow }) => {
  const ratedEps = item.episodes.filter(ep => ep.rating > 0);
  const avgRating = ratedEps.length > 0
    ? ratedEps.reduce((sum, ep) => sum + ep.rating, 0) / ratedEps.length
    : 0;
  const totalEps = item.episodes.length;
  const totalSeasons = item.seasons.length;

  return (
    <TouchableOpacity
      style={tvStyles.showCard}
      onPress={() => drillIntoShow(item.seriesId)}
      activeOpacity={0.7}
    >
      {item.episodes[0]?.stillPath ? (
        <FadeImage
          source={tmdbService.getImageSource(item.episodes[0].stillPath, 'w300')}
          style={tvStyles.showPoster}
        />
      ) : (
        <View style={[tvStyles.showPoster, tvStyles.posterPlaceholder]}>
          <Ionicons name="tv-outline" size={20} color={COLORS.text.muted} />
        </View>
      )}

      <View style={tvStyles.showInfo}>
        <Text style={tvStyles.showName} numberOfLines={1}>{item.seriesName}</Text>
        <Text style={tvStyles.showMeta}>
          {totalSeasons} season{totalSeasons !== 1 ? 's' : ''} · {totalEps} ep{totalEps !== 1 ? 's' : ''}
        </Text>
        <View style={tvStyles.showBottomRow}>
          {avgRating > 0 && (
            <View style={tvStyles.avgRatingWrap}>
              <Ionicons name="star" size={11} color={COLORS.primary} />
              <Text style={tvStyles.avgRatingText}>{avgRating.toFixed(1)}</Text>
            </View>
          )}
          <Text style={tvStyles.showDate}>{formatDate(item.latestDate)}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
    </TouchableOpacity>
  );
};

interface HistoryEpisodeRowProps {
  item: WatchedEpisode;
  onRemoveEpisode: (episodeId: number) => void;
  openEpisodeEdit: (item: WatchedEpisode) => void;
  favoriteEpisodeIds: Set<number>;
}

export const HistoryEpisodeRow: React.FC<HistoryEpisodeRowProps> = ({ item, onRemoveEpisode, openEpisodeEdit, favoriteEpisodeIds }) => {
  const starRating = item.rating || 0;
  return (
    <SwipeableRow onDelete={() => onRemoveEpisode(item.episodeId)} height={64}>
      <TouchableOpacity
        style={tvStyles.episodeRow}
        activeOpacity={0.7}
        onPress={() => openEpisodeEdit(item)}
      >
        <View style={tvStyles.epNumberWrap}>
          <Text style={tvStyles.epNumber}>{item.episodeNumber}</Text>
        </View>

        {item.stillPath ? (
          <FadeImage
            source={tmdbService.getImageSource(item.stillPath, 'w300')}
            style={tvStyles.epStill}
          />
        ) : (
          <View style={[tvStyles.epStill, tvStyles.epStillPlaceholder]}>
            <Ionicons name="image-outline" size={16} color={COLORS.text.muted} />
          </View>
        )}

        <View style={tvStyles.epInfo}>
          <Text style={tvStyles.epTitle} numberOfLines={1}>
            S{item.seasonNumber}E{item.episodeNumber} · {item.episodeName || `Episode ${item.episodeNumber}`}
          </Text>
          <View style={tvStyles.epMetaRow}>
            {starRating > 0 ? (
              <View style={tvStyles.starsRow}>
                {renderHalfStars(starRating)}
              </View>
            ) : (
              <Text style={tvStyles.epMetaText}>Not rated</Text>
            )}
            <Text style={tvStyles.epDateText}>{formatDate(item.watchedDate)}</Text>
          </View>
        </View>

        {item.liked && (
          <Ionicons name="heart" size={14} color={COLORS.coral} style={{ marginLeft: SPACING.xs }} />
        )}
        {favoriteEpisodeIds.has(item.episodeId) && (
          <Ionicons name="star" size={14} color={COLORS.primary} style={{ marginLeft: SPACING.xs }} />
        )}
      </TouchableOpacity>
    </SwipeableRow>
  );
};
