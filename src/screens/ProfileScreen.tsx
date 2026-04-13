import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Alert, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../constants/theme';
import { CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { LegalModal } from '../components/LegalModal';

interface ProfileScreenProps {
  onOpenWrapped: () => void;
}

const PERSONALITY_ICONS: Record<string, string> = {
  'The Newcomer': 'leaf-outline',
  'The Binger': 'tv-outline',
  'The Critic': 'eye-outline',
  'The Enthusiast': 'sparkles-outline',
  'The Explorer': 'compass-outline',
  'The Reviewer': 'create-outline',
  'The Marathon Runner': 'speedometer-outline',
  'The Cinephile': 'film-outline',
  'The Balanced Viewer': 'scale-outline',
};

// ── Quick Stat Pill ──
const StatPill: React.FC<{ icon: string; label: string; value: string; color: string; grow?: boolean }> = ({ icon, label, value, color, grow }) => {
  const { width } = useWindowDimensions();
  const pillWidth = (width - SPACING.m * 2 - SPACING.s) / 2 - 1;

  return (
    <View style={[statStyles.pill, { width: pillWidth }, grow && { width: undefined, flex: 1 }]} accessibilityRole="text" accessibilityLabel={`${value} ${label}`}>
      <View style={[statStyles.pillIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={statStyles.pillText}>
        <Text style={statStyles.pillValue}>{value}</Text>
        <Text style={statStyles.pillLabel}>{label}</Text>
      </View>
    </View>
  );
};

// ── Wrapped CTA Card ──
const WrappedCard: React.FC<{ onPress: () => void; year: number }> = ({ onPress, year }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY_CARD} style={wrappedCardStyles.wrap} accessibilityRole="button" accessibilityLabel={`View Sidetrack Wrapped for ${year}`} accessibilityHint="Double tap to see your year in review">
      <LinearGradient
        colors={GRADIENTS.wrapped}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={wrappedCardStyles.gradient}
      >
        <Animated.View style={[wrappedCardStyles.emojiCircle, { opacity: shimmerOpacity }]}>
          <Ionicons name="videocam" size={24} color={COLORS.primary} />
        </Animated.View>
        <View style={wrappedCardStyles.textWrap}>
          <Text style={wrappedCardStyles.title}>Sidetrack Wrapped</Text>
          <Text style={wrappedCardStyles.subtitle}>
            Your {year} year in movies & TV
          </Text>
        </View>
        <View style={wrappedCardStyles.arrow}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.secondary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ── Menu Row ──
const MenuRow: React.FC<{ icon: string; label: string; sublabel?: string; color?: string; onPress: () => void; destructive?: boolean }> = ({
  icon, label, sublabel, color = COLORS.text.secondary, onPress, destructive,
}) => (
  <TouchableOpacity style={menuStyles.row} onPress={onPress} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY} accessibilityRole="button" accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}>
    <View style={[menuStyles.rowIcon, { backgroundColor: (destructive ? COLORS.coral : color) + '1A' }]}>
      <Ionicons name={icon as any} size={17} color={destructive ? COLORS.coral : color} />
    </View>
    <View style={menuStyles.rowTextWrap}>
      <Text style={[menuStyles.rowLabel, destructive && { color: COLORS.coral }]}>{label}</Text>
      {sublabel && <Text style={menuStyles.rowSublabel}>{sublabel}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
  </TouchableOpacity>
);

// ── Main Screen ──
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenWrapped }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [movieCount, setMovieCount] = useState(0);
  const [episodeCount, setEpisodeCount] = useState(0);
  const [hoursWatched, setHoursWatched] = useState(0);
  const [personality, setPersonality] = useState<{ label: string; emoji: string; description: string } | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Store slices — declared before loadStats so useCallback can close over them
  const watchedMovies = useAppStore(s => s.watchedMovies);
  const watchedEpisodes = useAppStore(s => s.watchedEpisodes);
  const favoriteMovieIds = useAppStore(s => s.favoriteMovieIds);
  const favoriteEpisodeIds = useAppStore(s => s.favoriteEpisodeIds);
  const watchlist = useAppStore(s => s.watchlist);

  const loadStats = useCallback(async () => {
    try {
      setLoadError(false);
      const { StatsService } = await import('../services/StatsService');
      const stats = await StatsService.computeWrapped(undefined, {
        movies: watchedMovies,
        episodes: watchedEpisodes,
        favoriteMovieCount: favoriteMovieIds.size,
        favoriteEpisodeCount: favoriteEpisodeIds.size,
        watchlistCount: watchlist.length,
      });
      setMovieCount(stats.totalMovies);
      setEpisodeCount(stats.totalEpisodes);
      setHoursWatched(stats.totalHoursWatched);
      setPersonality(stats.personalityType);
      setFavCount(stats.totalFavorites);
      setWatchlistCount(watchlist.length);
      setStreak(stats.longestStreak);
      setLoaded(true);
    } catch {
      setLoadError(true);
      setLoaded(true);
    }
  }, [watchedMovies, watchedEpisodes, favoriteMovieIds, favoriteEpisodeIds, watchlist]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const wrappedYear = (() => {
    const now = new Date();
    return now >= new Date(now.getFullYear(), 11, 15) ? now.getFullYear() : now.getFullYear() - 1;
  })();

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove cached show and movie data. Your watch history, watchlist, and favorites will NOT be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const keys = (await (await import('@react-native-async-storage/async-storage')).default.getAllKeys()).filter(k => k.startsWith('@sidetrack_detail_cache_'));
            if (keys.length > 0) {
              await (await import('@react-native-async-storage/async-storage')).default.multiRemove(keys);
            }
            const { tmdbService } = require('../services/tmdbService');
            tmdbService.clearCache();
          }
        }
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete your watch history, watchlist, favorites, and all other data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.clear();
            // Reset the Zustand store so in-memory state reflects the cleared storage immediately
            await useAppStore.getState().hydrate();
          }
        }
      ]
    );
  };

  const formatTime = (totalHours: number) => {
    const totalMin = Math.round(totalHours * 60);
    if (totalMin < 60) return `${totalMin}m`;
    const days = Math.floor(totalMin / 1440);
    const hrs = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) return `${days}d ${hrs}h`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>You</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          {/* Personality Badge — Hero card */}
          {!loaded && (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          {loaded && loadError && (
            <View style={styles.loadingStats}>
              <Ionicons name="alert-circle-outline" size={32} color={COLORS.text.muted} />
              <Text style={{ color: COLORS.text.muted, fontFamily: FONTS.body, marginTop: SPACING.s }}>Couldn't load stats</Text>
              <TouchableOpacity onPress={handleRefresh} style={{ marginTop: SPACING.s }}>
                <Text style={{ color: COLORS.primary, fontFamily: FONTS.bodySemiBold }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {loaded && personality && (
            <View style={styles.personalityCard}>
              <LinearGradient
                colors={['rgba(200,165,85,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.personalityGradient}
              />
              <View style={styles.personalityIconWrap}>
                <Ionicons name={(PERSONALITY_ICONS as any)[personality.label] || 'person-outline'} size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.personalityLabel}>{personality.label}</Text>
              <Text style={styles.personalityDesc}>{personality.description}</Text>
            </View>
          )}

          {/* Streak Hero */}
          {loaded && streak > 0 && (
            <View style={styles.streakHero}>
              <View style={styles.streakIconWrap}>
                <Ionicons name="flame" size={28} color={COLORS.coral} />
              </View>
              <View style={styles.streakTextWrap}>
                <Text style={styles.streakValue}>{streak} day streak</Text>
                <Text style={styles.streakLabel}>Your longest watching streak</Text>
              </View>
            </View>
          )}

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <StatPill icon="film-outline" label="Movies" value={movieCount.toString()} color={COLORS.primary} />
            <StatPill icon="tv-outline" label="Episodes" value={episodeCount.toString()} color={COLORS.accent} />
            <StatPill icon="time-outline" label="Watched" value={formatTime(hoursWatched)} color={COLORS.teal} />
            <StatPill icon="heart-outline" label="Favorites" value={favCount.toString()} color={COLORS.favorite} />
            <StatPill icon="bookmark-outline" label="Watchlist" value={watchlistCount.toString()} color={COLORS.primaryLight} grow />
          </View>

          {/* Wrapped CTA */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.sectionTitle}>Year in Review</Text>
            </View>
            <WrappedCard onPress={onOpenWrapped} year={wrappedYear} />
          </View>

          {/* About */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <View style={menuStyles.card}>
              <MenuRow
                icon="document-text-outline"
                label="Legal & Privacy"
                sublabel="Terms, privacy policy, data disclosure"
                color={COLORS.text.secondary}
                onPress={() => setShowLegal(true)}
              />
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Settings</Text>
            </View>
            <View style={menuStyles.card}>
              <MenuRow
                icon="trash-outline"
                label="Clear Cache"
                sublabel="Remove cached API data"
                color={COLORS.text.secondary}
                onPress={handleClearCache}
              />
              <View style={menuStyles.divider} />
              <MenuRow
                icon="nuclear-outline"
                label="Clear All Data"
                sublabel="Delete watch history & favorites"
                onPress={handleClearAllData}
                destructive
              />
            </View>
          </View>

          {/* Bottom spacer for tab bar */}
          <View style={styles.tabBarSpacer} />
        </ScrollView>
      </SafeAreaView>

      <LegalModal visible={showLegal} onClose={() => setShowLegal(false)} />
    </View>
  );
};

// ── Styles ──

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
  scrollContent: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
  },
  loadingStats: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  personalityCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.l,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  personalityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  personalityIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  personalityLabel: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  personalityDesc: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.coralBorder,
    gap: SPACING.m,
  },
  streakIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.coralMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextWrap: {
    flex: 1,
    gap: SPACING.xxs,
  },
  streakValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.text.primary,
  },
  streakLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
    marginBottom: SPACING.l,
  },
  tabBarSpacer: {
    height: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
  },
  section: {
    marginBottom: SPACING.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
});

const statStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.m,
    gap: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    flex: 1,
  },
  pillValue: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.text.primary,
  },
  pillLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 1,
  },
});

const wrappedCardStyles = StyleSheet.create({
  wrap: {
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.l,
    paddingHorizontal: SPACING.m,
    gap: SPACING.m,
    borderRadius: BORDER_RADIUS.l,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white.alpha08,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 17,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white.alpha06,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const menuStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    gap: SPACING.s,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  rowSublabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: SPACING.m + 32 + SPACING.s,
  },
});
