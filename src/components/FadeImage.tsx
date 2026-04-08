import React, { useState, useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, ImageProps } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

interface FadeImageProps extends Omit<ImageProps, 'onLoad'> {
  // If true, shows a SkeletonBox while loading
  showSkeleton?: boolean;
}

export const FadeImage = React.memo<FadeImageProps>(({ style, showSkeleton = true, source, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  // Reset state when source changes
  useEffect(() => {
    setLoaded(false);
    opacity.setValue(0);
    return () => opacity.stopAnimation();
  }, [source, opacity]);

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {showSkeleton && !loaded && (
        <View style={StyleSheet.absoluteFill}>
          <SkeletonBox style={StyleSheet.absoluteFill} />
        </View>
      )}
      <Animated.Image
        {...props}
        source={source}
        style={[style, { opacity }, StyleSheet.absoluteFill]}
        onLoad={onLoad}
      />
    </View>
  );
});
