import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { FONTS, SPACING } from '../constants/theme';

export const NetworkBanner = () => {
  const isOffline = useAppStore(s => s.isOffline);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -100,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={18} color="#FFF" />
        <Text style={styles.text}>You're offline — showing cached data</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0, // Adjust for status bar
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: '#E67E22', // Vibrant orange for warning
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
  },
  text: {
    color: '#FFF',
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },
});
