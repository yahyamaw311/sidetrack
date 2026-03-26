import React, { useEffect, useRef } from 'react';
import { View, Animated, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { skelStyles, styles } from '../../screens/EpisodeDetail.styles';

interface EpisodeDetailSkeletonProps {
  onBack?: () => void;
}

export const EpisodeDetailSkeleton: React.FC<EpisodeDetailSkeletonProps> = ({ onBack }) => {
  const { height } = useWindowDimensions();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <View style={styles.container}>
      {onBack && (
        <SafeAreaView style={styles.backSafe}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </SafeAreaView>
      )}
      <View style={skelStyles.wrapper}>
        <Animated.View style={[skelStyles.backdrop, { opacity: shimmerOpacity, height: height * 0.35 }]} />
        <View style={skelStyles.content}>
          <Animated.View style={[skelStyles.titleLine, { opacity: shimmerOpacity }]} />
          <Animated.View style={[skelStyles.subtitleLine, { opacity: shimmerOpacity }]} />
          <View style={skelStyles.metaRow}>
            <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.metaChip, { opacity: shimmerOpacity }]} />
          </View>
          <View style={skelStyles.actionRow}>
            <Animated.View style={[skelStyles.actionBtn, { opacity: shimmerOpacity }]} />
            <Animated.View style={[skelStyles.actionBtn, { opacity: shimmerOpacity }]} />
          </View>
          <Animated.View style={[skelStyles.divider, { opacity: shimmerOpacity }]} />
          <Animated.View style={[skelStyles.textBlock, { opacity: shimmerOpacity }]} />
          <Animated.View style={[skelStyles.textBlockShort, { opacity: shimmerOpacity }]} />
        </View>
      </View>
    </View>
  );
};
