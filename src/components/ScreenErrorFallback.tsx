import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface ScreenErrorFallbackProps {
  label?: string;
  error?: Error | null;
  onRetry: () => void;
}

export const ScreenErrorFallback: React.FC<ScreenErrorFallbackProps> = ({ label, error, onRetry }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.coral} />
        </View>
        <Text style={styles.title}>
          {label ? `${label} unavailable` : 'Something went wrong'}
        </Text>
        <Text style={styles.message}>
          {error?.message || 'An unexpected error occurred while loading this screen.'}
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color={COLORS.text.inverse} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          If the problem persists, please check your network or restart the app.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(239, 100, 97, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  title: {
    color: COLORS.text.primary,
    fontFamily: FONTS.display,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  message: {
    color: COLORS.text.secondary,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.m,
  },
  actions: {
    width: '100%',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: COLORS.text.inverse,
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  footer: {
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});
