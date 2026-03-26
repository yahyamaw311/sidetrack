import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export const PopcornLoader = () => {
  const bounce1 = useRef(new Animated.Value(0)).current;
  const bounce2 = useRef(new Animated.Value(0)).current;
  const bounce3 = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -12, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const spinAnim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    createBounce(bounce1, 0).start();
    createBounce(bounce2, 150).start();
    createBounce(bounce3, 300).start();
    spinAnim.start();
    return () => {
      bounce1.stopAnimation();
      bounce2.stopAnimation();
      bounce3.stopAnimation();
      spin.stopAnimation();
    };
  }, [bounce1, bounce2, bounce3, spin]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={popcornStyles.container}>
      <View style={popcornStyles.kernelRow}>
        <Animated.View style={[popcornStyles.kernel, { transform: [{ translateY: bounce1 }] }]}>
          <Ionicons name="film-outline" size={28} color={COLORS.primary} />
        </Animated.View>
        <Animated.View style={[popcornStyles.kernel, { transform: [{ translateY: bounce2 }] }]}>
          <Ionicons name="videocam-outline" size={28} color={COLORS.accent} />
        </Animated.View>
        <Animated.View style={[popcornStyles.kernel, { transform: [{ translateY: bounce3 }] }]}>
          <Ionicons name="film-outline" size={28} color={COLORS.teal} />
        </Animated.View>
      </View>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Ionicons name="film-outline" size={20} color={COLORS.primary} />
      </Animated.View>
      <Text style={popcornStyles.text}>Finding your next watch...</Text>
    </View>
  );
};

const popcornStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 1.5,
    gap: SPACING.m,
  },
  kernelRow: {
    flexDirection: 'row',
    gap: SPACING.m,
    marginBottom: SPACING.s,
  },
  kernel: {
    padding: SPACING.xs,
  },
  text: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
});
