import React, { useEffect } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

// Single shared animation value — all SkeletonBox instances pulse in sync
// without each creating its own Animated.Value + loop.
const sharedOpacity = new Animated.Value(0.3);
let refCount = 0;
let sharedLoop: Animated.CompositeAnimation | null = null;

function retain() {
  refCount++;
  if (refCount === 1) {
    sharedLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sharedOpacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(sharedOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    sharedLoop.start();
  }
}

function release() {
  refCount--;
  if (refCount <= 0) {
    refCount = 0;
    sharedLoop?.stop();
    sharedLoop = null;
    sharedOpacity.setValue(0.3);
  }
}

interface SkeletonBoxProps {
  style?: StyleProp<ViewStyle>;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ style }) => {
  useEffect(() => {
    retain();
    return release;
  }, []);

  return <Animated.View style={[{ backgroundColor: COLORS.card, opacity: sharedOpacity }, style]} />;
};
