import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { StorageProvider } from '../services/StorageProvider';

const { width: SW, height: SH } = Dimensions.get('window');

const HEADER_Y = Platform.OS === 'ios' ? 85 : 72;
const CONTENT_Y = Platform.OS === 'ios' ? 235 : 215;
const TAB_Y = SH - (Platform.OS === 'ios' ? 48 : 33);

interface TourStep {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  target: { x: number; y: number } | null;
  tooltipPosition: 'above' | 'below' | 'center';
  highlightRadius: number;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Sidetrack',
    description: "Let's take a quick tour to show you everything you can do.",
    icon: 'film',
    iconColor: COLORS.primary,
    target: null,
    tooltipPosition: 'center',
    highlightRadius: 0,
  },
  {
    title: 'Search Anything',
    description: 'Tap here to search for any movie or TV show instantly.',
    icon: 'search',
    iconColor: COLORS.accent,
    target: { x: SW - 36, y: HEADER_Y },
    tooltipPosition: 'below',
    highlightRadius: 28,
  },
  {
    title: 'Trending & Spotlight',
    description: "Swipe through what's trending right now and discover top-rated content.",
    icon: 'trending-up',
    iconColor: COLORS.primary,
    target: { x: SW / 2, y: CONTENT_Y },
    tooltipPosition: 'below',
    highlightRadius: 70,
  },
  {
    title: 'Your Watchlist',
    description: 'Save shows and movies you want to watch later.',
    icon: 'bookmark',
    iconColor: COLORS.primary,
    target: { x: SW * 0.375, y: TAB_Y },
    tooltipPosition: 'above',
    highlightRadius: 30,
  },
  {
    title: 'Watch Log',
    description: "Log everything you've watched, give it a star rating, and track your history.",
    icon: 'journal',
    iconColor: COLORS.teal,
    target: { x: SW * 0.625, y: TAB_Y },
    tooltipPosition: 'above',
    highlightRadius: 30,
  },
  {
    title: 'Your Profile',
    description: 'View your watching stats, favorites, and get your annual Wrapped recap.',
    icon: 'person',
    iconColor: COLORS.coral,
    target: { x: SW * 0.875, y: TAB_Y },
    tooltipPosition: 'above',
    highlightRadius: 30,
  },
  {
    title: "You're All Set!",
    description: 'Start exploring and discover your next favorite watch.',
    icon: 'checkmark-circle',
    iconColor: COLORS.teal,
    target: null,
    tooltipPosition: 'center',
    highlightRadius: 0,
  },
];

export const OnboardingOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [idx, setIdx] = useState(0);
  const overlayFade = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0.9, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const transition = useCallback((to: number) => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: -16, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setIdx(to);
      contentSlide.setValue(16);
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [contentFade, contentSlide]);

  const dismiss = useCallback(() => {
    StorageProvider.completeOnboarding();
    Animated.timing(overlayFade, { toValue: 0, duration: 280, useNativeDriver: true }).start(onComplete);
  }, [overlayFade, onComplete]);

  const next = useCallback(() => {
    if (idx < STEPS.length - 1) transition(idx + 1);
    else dismiss();
  }, [idx, transition, dismiss]);

  const back = useCallback(() => {
    if (idx > 0) transition(idx - 1);
  }, [idx, transition]);

  const s = STEPS[idx];
  const isFirst = idx === 0;
  const isLast = idx === STEPS.length - 1;
  const hasTarget = s.target !== null;

  // Arrow horizontal alignment
  const arrowAlign = (): 'flex-start' | 'center' | 'flex-end' => {
    if (!s.target) return 'center';
    const r = s.target.x / SW;
    return r < 0.35 ? 'flex-start' : r > 0.65 ? 'flex-end' : 'center';
  };
  const arrowMargin = (): number => {
    if (!s.target) return 0;
    const align = arrowAlign();
    const tLeft = SPACING.l;
    const tWidth = SW - SPACING.l * 2;
    const rel = s.target.x - tLeft;
    if (align === 'flex-start') return Math.max(16, rel - 10);
    if (align === 'flex-end') return Math.max(16, tWidth - rel - 10);
    return 0;
  };

  const al = arrowAlign();
  const am = arrowMargin();

  // Tooltip position style
  const tooltipStyle = s.tooltipPosition === 'center'
    ? styles.tooltipCenter
    : s.tooltipPosition === 'below'
      ? { position: 'absolute' as const, top: s.target!.y + s.highlightRadius + 24, left: SPACING.l, right: SPACING.l }
      : { position: 'absolute' as const, bottom: SH - s.target!.y + s.highlightRadius + 24, left: SPACING.l, right: SPACING.l };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
      {/* Scrim — catches touches to block underlying UI */}
      <Pressable style={styles.scrim} onPress={() => {}} />

      {/* Pulsing spotlight ring */}
      {hasTarget && s.target && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.pulseRing, {
              left: s.target.x - s.highlightRadius - 10,
              top: s.target.y - s.highlightRadius - 10,
              width: (s.highlightRadius + 10) * 2,
              height: (s.highlightRadius + 10) * 2,
              borderRadius: s.highlightRadius + 10,
              borderColor: s.iconColor,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            }]}
          />
          <View
            pointerEvents="none"
            style={[styles.innerRing, {
              left: s.target.x - s.highlightRadius,
              top: s.target.y - s.highlightRadius,
              width: s.highlightRadius * 2,
              height: s.highlightRadius * 2,
              borderRadius: s.highlightRadius,
              borderColor: s.iconColor + '50',
            }]}
          />
        </>
      )}

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={dismiss} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Skip tour">
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      )}

      {/* Tooltip card with arrow */}
      <Animated.View style={[tooltipStyle, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>
        {/* Arrow UP */}
        {hasTarget && s.tooltipPosition === 'below' && (
          <View style={{ alignSelf: al, marginLeft: al === 'flex-start' ? am : 0, marginRight: al === 'flex-end' ? am : 0, marginBottom: -1 }}>
            <View style={[styles.arrowUp, { borderBottomColor: COLORS.card }]} />
          </View>
        )}

        <View style={styles.card}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: s.iconColor + '18' }]}>
              <Ionicons name={s.icon as any} size={22} color={s.iconColor} />
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{idx + 1}/{STEPS.length}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{s.title}</Text>
          <Text style={styles.cardDesc}>{s.description}</Text>

          {/* Progress dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[
                styles.dot,
                i === idx ? [styles.dotActive, { backgroundColor: s.iconColor }]
                  : i < idx ? [styles.dotDone, { backgroundColor: s.iconColor + '40' }]
                  : styles.dotInactive,
              ]} />
            ))}
          </View>

          {/* Nav buttons */}
          <View style={styles.navRow}>
            {idx > 0 ? (
              <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Previous step">
                <Ionicons name="chevron-back" size={18} color={COLORS.text.secondary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            ) : <View />}
            <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: s.iconColor }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={isLast ? 'Get Started' : isFirst ? "Let's Go" : 'Next step'}>
              <Text style={styles.nextText}>{isLast ? 'Get Started' : isFirst ? "Let's Go" : 'Next'}</Text>
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={16} color={COLORS.text.inverse} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arrow DOWN */}
        {hasTarget && s.tooltipPosition === 'above' && (
          <View style={{ alignSelf: al, marginLeft: al === 'flex-start' ? am : 0, marginRight: al === 'flex-end' ? am : 0, marginTop: -1 }}>
            <View style={[styles.arrowDown, { borderTopColor: COLORS.card }]} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    right: SPACING.l,
    zIndex: 10,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.m,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
  tooltipCenter: {
    position: 'absolute',
    top: 0,
    left: SPACING.l,
    right: SPACING.l,
    bottom: 0,
    justifyContent: 'center',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.m,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepBadgeText: {
    color: COLORS.text.muted,
    fontFamily: FONTS.mono,
    fontSize: 11,
  },
  cardTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.s,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.m,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.m,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20 },
  dotDone: { width: 6 },
  dotInactive: { width: 6, backgroundColor: 'rgba(79,77,70,0.4)' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.s,
    gap: 2,
  },
  backText: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.round,
  },
  nextText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.text.inverse,
  },
});
