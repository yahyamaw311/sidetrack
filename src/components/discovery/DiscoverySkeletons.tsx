import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';
import { BORDER_RADIUS, SPACING } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { styles, skeletonStyles } from '../../screens/DiscoveryScreen.styles';

export const useDiscoveryDimensions = () => {
  const { width } = useWindowDimensions();
  return {
    spotlightWidth: width * CONFIG.LAYOUT.SPOTLIGHT_WIDTH_RATIO,
    posterWidth: (width - SPACING.m * 2 - SPACING.s * 2) / 3,
  };
};

export const SpotlightSkeleton = () => {
  const { spotlightWidth } = useDiscoveryDimensions();
  return (
    <View style={skeletonStyles.spotlightRow}>
      {[0, 1].map(i => (
        <View key={i} style={[skeletonStyles.spotlightCard, { width: spotlightWidth, height: spotlightWidth * CONFIG.LAYOUT.BACKDROP_HEIGHT_RATIO_LOW }]}>
          <SkeletonBox style={skeletonStyles.spotlightImage} />
          <View style={skeletonStyles.spotlightTextArea}>
            <SkeletonBox style={skeletonStyles.titleBar} />
            <SkeletonBox style={skeletonStyles.ratingBar} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const PosterSkeleton = () => {
  const { posterWidth } = useDiscoveryDimensions();
  return (
    <View style={skeletonStyles.posterRow}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[skeletonStyles.posterCard, { width: posterWidth }]}>
          <SkeletonBox style={[skeletonStyles.posterImage, { width: posterWidth }]} />
          <SkeletonBox style={skeletonStyles.posterTitleBar} />
        </View>
      ))}
    </View>
  );
};

export const SearchResultSkeleton = () => (
  <View>
    {[0, 1, 2, 3, 4].map(i => (
      <View key={i} style={skeletonStyles.searchRow}>
        <SkeletonBox style={skeletonStyles.searchPoster} />
        <View style={skeletonStyles.searchTextArea}>
          <SkeletonBox style={skeletonStyles.searchTitleBar} />
          <SkeletonBox style={skeletonStyles.searchMetaBar} />
          <SkeletonBox style={skeletonStyles.searchRatingBar} />
        </View>
      </View>
    ))}
  </View>
);

export const DiscoverySkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SkeletonBox style={{ width: 6, height: 6, borderRadius: 3 }} />
        <SkeletonBox style={{ width: 80, height: 14, borderRadius: BORDER_RADIUS.xs }} />
      </View>
      <SpotlightSkeleton />
    </View>
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <SkeletonBox style={{ width: 6, height: 6, borderRadius: 3 }} />
        <SkeletonBox style={{ width: 60, height: 14, borderRadius: BORDER_RADIUS.xs }} />
      </View>
      <PosterSkeleton />
    </View>
  </ScrollView>
);
