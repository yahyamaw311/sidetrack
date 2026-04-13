import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Animated, View, StyleSheet, ImageProps, ImageSourcePropType } from 'react-native';
import { SkeletonBox } from './SkeletonBox';

interface FadeImageProps extends Omit<ImageProps, 'onLoad'> {
  // If true, shows a SkeletonBox while loading
  showSkeleton?: boolean;
}

/** Extract a stable string key from an ImageSource so we only reset on actual URI changes. */
const getSourceKey = (source: ImageSourcePropType | undefined): string | number | undefined => {
  if (!source) return undefined;
  if (typeof source === 'number') return source; // require() asset
  if (Array.isArray(source)) return source.map(s => s.uri).join(',');
  return (source as { uri?: string }).uri;
};

export const FadeImage = React.memo<FadeImageProps>(({ style, showSkeleton = true, source, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const sourceKey = useMemo(() => getSourceKey(source), [source]);

  // Reset state only when the actual URI changes, not on object reference changes
  useEffect(() => {
    setLoaded(false);
    anim.setValue(0);
    return () => anim.stopAnimation();
  }, [sourceKey, anim]);

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Derive both opacity and a subtle scale from a single animated value
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
  });

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
        style={[style, { opacity: anim, transform: [{ scale }] }, StyleSheet.absoluteFill]}
        onLoad={onLoad}
      />
    </View>
  );
});
