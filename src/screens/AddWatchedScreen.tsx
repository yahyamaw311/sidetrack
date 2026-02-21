import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  Modal,
  ActivityIndicator,
  InteractionManager,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { StorageProvider } from '../services/StorageProvider';
import { SearchResult, WatchedMovie, MovieDetail } from '../types';
import { DatePickerModal } from '../components/DatePicker';

interface AddWatchedScreenProps {
  onClose: () => void;
}

export const AddWatchedScreen: React.FC<AddWatchedScreenProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(7);
  const [watchedDate, setWatchedDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingEntry, setExistingEntry] = useState<WatchedMovie | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      searchInputRef.current?.focus();
    });
    return () => task.cancel();
  }, []);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    const data = await tmdbService.search(text);
    setResults(data.filter((item: SearchResult) => item.media_type === 'movie'));
    setLoading(false);
  }, []);

  const handleSelectMovie = async (item: SearchResult) => {
    setLoading(true);
    const movieDetails = await tmdbService.getMovieDetails(item.id);
    if (movieDetails) {
      // Check if already logged
      const existing = await StorageProvider.isMovieWatched(item.id);
      if (existing) {
        setExistingEntry(existing);
        setSelectedMovie(movieDetails);
        setSelectedRating(existing.rating);
        setIsEditMode(true);
        setRatingModalVisible(true);
      } else {
        setExistingEntry(null);
        setSelectedMovie(movieDetails);
        setSelectedRating(7);
        setWatchedDate(new Date());
        setIsEditMode(false);
        setRatingModalVisible(true);
      }
    }
    setLoading(false);
  };

  const handleConfirmWatched = async () => {
    if (!selectedMovie) return;

    if (isEditMode) {
      // Only update the rating
      await StorageProvider.updateWatchedMovieRating(selectedMovie.id, selectedRating);
    } else {
      const watchedMovie: WatchedMovie = {
        movieId: selectedMovie.id,
        title: selectedMovie.title,
        posterPath: selectedMovie.poster_path,
        backdropPath: selectedMovie.backdrop_path,
        rating: selectedRating,
        watchedDate: watchedDate.toISOString(),
        runtime: selectedMovie.runtime,
        releaseDate: selectedMovie.release_date,
        genres: selectedMovie.genres.map(g => g.name),
        overview: selectedMovie.overview,
      };
      await StorageProvider.addToWatchedMovies(watchedMovie);
    }

    setRatingModalVisible(false);
    setSelectedMovie(null);
    setIsEditMode(false);
    setExistingEntry(null);
    setQuery('');
    setResults([]);
    onClose();
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => handleSelectMovie(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: tmdbService.getImageUrl(item.poster_path) }}
        style={styles.poster}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.resultMeta}>
          {item.release_date?.split('-')[0] || 'N/A'}
        </Text>
        <View style={styles.resultRating}>
          <View style={[styles.ratingDot, { backgroundColor: getRatingColor(item.vote_average) }]} />
          <Text style={styles.resultRatingText}>{item.vote_average.toFixed(1)}</Text>
        </View>
      </View>
      <View style={styles.addIcon}>
        <Ionicons name="add" size={18} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Movie</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.text.muted} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search for a movie..."
          placeholderTextColor={COLORS.text.muted}
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading && results.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : results.length === 0 && query.length > 1 ? (
        <View style={styles.centered}>
          <Ionicons name="film-outline" size={40} color={COLORS.text.muted} />
          <Text style={styles.emptyText}>No movies found</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="videocam-outline" size={36} color={COLORS.text.muted} />
          </View>
          <Text style={styles.emptyText}>Search for a movie to log</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <Text style={styles.modalTitle}>{isEditMode ? 'Update Rating' : 'Rate'}</Text>
            {selectedMovie && (
              <Text style={styles.modalSubtitle}>{selectedMovie.title}</Text>
            )}

            {/* Already logged notice */}
            {isEditMode && existingEntry && (
              <View style={styles.editNotice}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                <Text style={styles.editNoticeText}>
                  Logged on {new Date(existingEntry.watchedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}

            {/* Date picker — only for new entries */}
            {!isEditMode && (
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.text.secondary} />
                <Text style={styles.dateText}>
                  {watchedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
              </TouchableOpacity>
            )}

            {/* Large rating display */}
            <Text style={[styles.ratingDisplay, { color: getRatingColor(selectedRating) }]}>
              {selectedRating}
            </Text>
            
            {/* Rating selector */}
            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.ratingOption,
                    selectedRating === num && { 
                      backgroundColor: getRatingColor(num),
                      borderColor: getRatingColor(num),
                    }
                  ]}
                  onPress={() => setSelectedRating(num)}
                >
                  <Text style={[
                    styles.ratingOptionText,
                    selectedRating === num && styles.ratingOptionTextActive
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmWatched}
              >
                <Text style={styles.confirmButtonText}>{isEditMode ? 'Update' : 'Log Movie'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Date picker modal */}
      <DatePickerModal
        visible={datePickerVisible}
        date={watchedDate}
        onConfirm={(d) => { setWatchedDate(d); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    paddingTop: Platform.OS === 'android' ? SPACING.xl : SPACING.s,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 17,
  },
  searchContainer: {
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.m,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.xxl,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.m,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: COLORS.card,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  resultMeta: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  resultRatingText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 12,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.m,
  },
  modalTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 22,
    marginBottom: 2,
  },
  modalSubtitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.m,
    width: '100%',
  },
  dateText: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  editNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: 'rgba(45, 212, 168, 0.1)',
    marginBottom: SPACING.m,
    width: '100%',
    justifyContent: 'center',
  },
  editNoticeText: {
    color: COLORS.teal,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  ratingDisplay: {
    fontFamily: FONTS.display,
    fontSize: 56,
    marginBottom: SPACING.s,
  },
  ratingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.l,
  },
  ratingOption: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingOptionText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.mono,
    fontSize: 14,
  },
  ratingOptionTextActive: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.s,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
});
