import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { EpisodeDetail } from '../screens/EpisodeDetail';
import { MovieDetail } from '../screens/MovieDetail';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { WatchlistScreen } from '../screens/WatchlistScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { WrappedScreen } from '../screens/WrappedScreen';
import { SearchResult } from '../types';

type TabRoute = 'Explore' | 'Watchlist' | 'Log';
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const MainNavigation = () => {
  const [activeTab, setActiveTab] = useState<TabRoute>('Explore');
  const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
  const [visibleDetail, setVisibleDetail] = useState<SearchResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedLocked, setWrappedLocked] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<TabRoute>>(new Set(['Explore']));
  const isAnimating = useRef(false);

  // Detail transition animation
  const detailAnim = useRef(new Animated.Value(0)).current;

  // Navigation history stack for back button
  const navHistory = useRef<Array<{ tab: TabRoute; show: SearchResult | null }>>([]);

  // Ref for the HistoryScreen back handler
  const historyBackRef = useRef<(() => boolean) | null>(null);
  // Ref for the DiscoveryScreen back handler
  const discoveryBackRef = useRef<(() => boolean) | null>(null);

  const animateDetailIn = useCallback((show: SearchResult) => {
    setSelectedShow(show);
    setVisibleDetail(show);
    isAnimating.current = true;
    detailAnim.setValue(0);
    // Defer animation to next frame so the component mounts first
    requestAnimationFrame(() => {
      Animated.spring(detailAnim, {
        toValue: 1,
        damping: 28,
        stiffness: 400,
        mass: 0.6,
        useNativeDriver: true,
      }).start(() => { isAnimating.current = false; });
    });
  }, [detailAnim]);

  const animateDetailOut = useCallback((callback?: () => void) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Animated.timing(detailAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisibleDetail(null);
      setSelectedShow(null);
      isAnimating.current = false;
      callback?.();
    });
  }, [detailAnim]);

  const handleOpenWrapped = () => {
    const now = new Date();
    const unlockDate = new Date(now.getFullYear(), 11, 15); // Dec 15
    if (now >= unlockDate) {
      setWrappedLocked(false);
      setShowWrapped(true);
    } else {
      setWrappedLocked(true);
      setShowWrapped(true);
    }
  };

  const pushHistory = useCallback(() => {
    navHistory.current.push({ tab: activeTab, show: selectedShow });
  }, [activeTab, selectedShow]);

  const handleTabChange = (tab: TabRoute) => {
    if (tab === activeTab && !selectedShow) return;
    // Lazy-mount the tab on first visit
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    if (visibleDetail) {
      animateDetailOut(() => setActiveTab(tab));
      return;
    }
    setActiveTab(tab);
    if (tab !== 'Explore') {
      setSelectedShow(null);
    }
  };

  const handleSelectShow = (show: SearchResult) => {
    if (show.media_type === 'person') return;
    pushHistory();
    animateDetailIn(show);
  };

  const handleSelectFromWatchlist = (id: number, type: 'tv' | 'movie') => {
    pushHistory();
    const show: SearchResult = {
      id,
      media_type: type,
      name: type === 'tv' ? '' : undefined,
      title: type === 'movie' ? '' : undefined,
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    };
    animateDetailIn(show);
  };

  const handleSelectFromHistory = (id: number) => {
    pushHistory();
    animateDetailIn({
      id,
      media_type: 'movie',
      title: '',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    });
  };

  const handleSelectShowFromHistory = (id: number) => {
    pushHistory();
    animateDetailIn({
      id,
      media_type: 'tv',
      name: '',
      poster_path: null,
      backdrop_path: null,
      overview: '',
      vote_average: 0,
    });
  };

  const handleBack = () => {
    const prev = navHistory.current.pop();
    animateDetailOut(() => {
      if (prev) {
        setActiveTab(prev.tab);
        if (prev.show) {
          // Going back to another detail — animate it in
          setTimeout(() => animateDetailIn(prev.show!), 50);
        }
      }
    });
  };

  // Android back button handler
  useEffect(() => {
    const onBackPress = () => {
      // 1. Close Wrapped overlay first
      if (showWrapped) {
        setShowWrapped(false);
        return true;
      }

      // 2. Let child screens handle their own internal back (drill-down, search, etc.)
      if (activeTab === 'Log' && historyBackRef.current?.()) {
        return true;
      }
      if (activeTab === 'Explore' && !selectedShow && discoveryBackRef.current?.()) {
        return true;
      }

      // 3. Pop from navigation history with animation
      if (navHistory.current.length > 0) {
        const prev = navHistory.current.pop()!;
        animateDetailOut(() => {
          setActiveTab(prev.tab);
          if (prev.show) {
            setTimeout(() => animateDetailIn(prev.show!), 50);
          }
        });
        return true;
      }

      // 4. If we're on a detail view, animate out
      if (visibleDetail) {
        animateDetailOut();
        return true;
      }

      // 5. If on a non-Explore tab, go back to Explore
      if (activeTab !== 'Explore') {
        setActiveTab('Explore');
        return true;
      }

      // 6. Let the system handle it (exit app)
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showWrapped, activeTab, selectedShow, visibleDetail, animateDetailOut, animateDetailIn]);

  // ── Compute countdown for locked screen ──
  const getCountdownText = () => {
    const now = new Date();
    const unlockDate = new Date(now.getFullYear(), 11, 15);
    const diff = unlockDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Available now!';
    if (days === 1) return '1 day to go';
    return `${days} days to go`;
  };

  return (
    <View style={styles.container}>
      {/* Tab screens — lazy mounted */}
      <View style={[styles.tabScreen, activeTab !== 'Explore' && styles.tabScreenHidden]}>
        <DiscoveryScreen onSelectShow={handleSelectShow} onBackRef={(fn: (() => boolean) | null) => { discoveryBackRef.current = fn; }} />
      </View>
      {mountedTabs.has('Watchlist') && (
        <View style={[styles.tabScreen, activeTab !== 'Watchlist' && styles.tabScreenHidden]}>
          <WatchlistScreen onSelectShow={handleSelectFromWatchlist} />
        </View>
      )}
      {mountedTabs.has('Log') && (
        <View style={[styles.tabScreen, activeTab !== 'Log' && styles.tabScreenHidden]}>
          <HistoryScreen key={historyKey} onSelectMovie={handleSelectFromHistory} onSelectShow={handleSelectShowFromHistory} onOpenWrapped={handleOpenWrapped} onBackRef={(fn: (() => boolean) | null) => { historyBackRef.current = fn; }} />
        </View>
      )}

      {/* Detail overlay — animated slide-up */}
      {visibleDetail && (
        <Animated.View
          style={[
            styles.detailOverlay,
            {
              opacity: detailAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] }),
              transform: [{
                translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.15, 0] }),
              }, {
                scale: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
              }],
            },
          ]}
        >
          {visibleDetail.media_type === 'movie'
            ? <MovieDetail route={{ params: { movieId: visibleDetail.id } }} onBack={handleBack} />
            : <EpisodeDetail route={{ params: { tvId: visibleDetail.id, seasonNumber: 1, episodeNumber: 1 } }} onBack={handleBack} />
          }
        </Animated.View>
      )}

      <BlurView intensity={80} tint="dark" style={styles.navBar}>
        <View style={styles.navInner}>
          <TabButton
            icon="compass-outline"
            activeIcon="compass"
            label="Explore"
            isActive={activeTab === 'Explore'}
            onPress={() => handleTabChange('Explore')}
          />

          <TabButton
            icon="bookmark-outline"
            activeIcon="bookmark"
            label="Watchlist"
            isActive={activeTab === 'Watchlist'}
            onPress={() => handleTabChange('Watchlist')}
          />

          <TabButton
            icon="journal-outline"
            activeIcon="journal"
            label="Log"
            isActive={activeTab === 'Log'}
            onPress={() => handleTabChange('Log')}
          />
        </View>
      </BlurView>

      {/* Wrapped Overlay */}
      {showWrapped && (
        wrappedLocked ? (
          <View style={wrappedOverlayStyles.container}>
            <LinearGradient
              colors={['#0f0c29', '#302b63', '#24243e']}
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity
              style={wrappedOverlayStyles.closeButton}
              onPress={() => setShowWrapped(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <View style={wrappedOverlayStyles.content}>
              <Text style={wrappedOverlayStyles.lockEmoji}>🔒</Text>
              <Text style={wrappedOverlayStyles.lockTitle}>Not Yet!</Text>
              <Text style={wrappedOverlayStyles.lockSubtitle}>
                Your Sidetrack Wrapped will be available on December 15th so we can gather more data on your watching habits.
              </Text>
              <View style={wrappedOverlayStyles.countdownBox}>
                <Text style={wrappedOverlayStyles.countdownValue}>{getCountdownText()}</Text>
                <Text style={wrappedOverlayStyles.countdownLabel}>until your Wrapped is ready</Text>
              </View>
              <Text style={wrappedOverlayStyles.encourageText}>
                Keep logging movies & shows — the more you watch, the better your Wrapped will be! 🍿
              </Text>
            </View>
          </View>
        ) : (
          <WrappedScreen onClose={() => setShowWrapped(false)} />
        )
      )}
    </View>
  );
};

const TabButton = ({ icon, activeIcon, label, isActive, onPress }: { icon: any, activeIcon: any, label: string, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.tabButton} activeOpacity={0.7}>
    {isActive && <View style={styles.activeIndicatorLine} />}
    <Ionicons name={isActive ? activeIcon : icon} size={21} color={isActive ? COLORS.primary : COLORS.text.muted} />
    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabScreen: {
    flex: 1,
  },
  tabScreenHidden: {
    display: 'none' as const,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: COLORS.background,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  navInner: {
    flexDirection: 'row',
    paddingTop: SPACING.s,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    paddingTop: 6,
  },
  activeIndicatorLine: {
    position: 'absolute',
    top: -SPACING.s,
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});

// ── Wrapped Overlay Styles ──
const wrappedOverlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: SPACING.m,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 25, 35, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.m,
  },
  lockEmoji: {
    fontSize: 72,
    marginBottom: SPACING.s,
  },
  lockTitle: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 32,
  },
  lockSubtitle: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  countdownBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: SPACING.s,
  },
  countdownValue: {
    color: COLORS.primary,
    fontFamily: FONTS.display,
    fontSize: 24,
  },
  countdownLabel: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 4,
  },
  encourageText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.s,
  },
});
