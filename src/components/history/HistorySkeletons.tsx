import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';
import { SPACING, BORDER_RADIUS } from '../../constants/theme';

export const HistorySkeleton = () => (
  <View style={skelStyles.wrapper}>
    {/* Fake search bar */}
    <SkeletonBox style={skelStyles.searchBar} />
    {/* Fake cards */}
    {[0, 1, 2, 3, 4, 5].map(i => (
      <View key={i} style={skelStyles.card}>
        <SkeletonBox style={skelStyles.poster} />
        <View style={skelStyles.textArea}>
          <SkeletonBox style={skelStyles.titleBar} />
          <SkeletonBox style={skelStyles.metaBar} />
          <SkeletonBox style={skelStyles.ratingBar} />
        </View>
      </View>
    ))}
  </View>
);

const skelStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s
  },
  searchBar: {
    height: 40,
    borderRadius: BORDER_RADIUS.s,
    marginBottom: SPACING.s
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.s,
    marginTop: SPACING.s,
    gap: SPACING.s
  },
  poster: {
    width: 64,
    height: 48,
    borderRadius: BORDER_RADIUS.xs
  },
  textArea: {
    flex: 1,
    gap: 6
  },
  titleBar: {
    height: 14,
    borderRadius: BORDER_RADIUS.xs,
    width: '70%'
  },
  metaBar: {
    height: 10,
    borderRadius: BORDER_RADIUS.xs,
    width: '45%'
  },
  ratingBar: {
    height: 10,
    borderRadius: BORDER_RADIUS.xs,
    width: '30%'
  }
});
