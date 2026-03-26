import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { wrappedStyles } from '../../screens/HistoryScreen.styles';

export const WrappedBanner: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={wrappedStyles.bannerWrap}>
      <LinearGradient
        colors={['#1a1a2e', '#302b63', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={wrappedStyles.bannerGradient}
      >
        <Animated.View style={[wrappedStyles.bannerContent, { opacity: shimmerOpacity }]}>
          <Ionicons name="videocam" size={24} color={COLORS.primary} />
        </Animated.View>
        <View style={wrappedStyles.bannerTextWrap}>
          <Text style={wrappedStyles.bannerTitle}>Your Sidetrack Wrapped</Text>
          <Text style={wrappedStyles.bannerSubtitle}>See your year in movies & TV</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
      </LinearGradient>
    </TouchableOpacity>
  );
};
