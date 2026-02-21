import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default',
}) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
  },
  default: {
    backgroundColor: COLORS.card,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  elevated: {
    backgroundColor: COLORS.elevated,
    ...SHADOWS.medium,
  },
});
