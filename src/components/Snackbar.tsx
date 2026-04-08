import React, { useEffect, useRef, useCallback } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export interface SnackbarConfig {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
}

interface SnackbarProps {
    config: SnackbarConfig | null;
    onDismiss: () => void;
}

const ICON_MAP = {
    success: { name: 'checkmark-circle' as const, color: COLORS.teal },
    error: { name: 'alert-circle' as const, color: COLORS.coral },
    info: { name: 'information-circle' as const, color: COLORS.primary },
};

const BG_MAP = {
    success: 'rgba(45, 212, 168, 0.12)',
    error: 'rgba(239, 100, 97, 0.12)',
    info: 'rgba(200, 165, 85, 0.12)',
};

export const Snackbar: React.FC<SnackbarProps> = ({ config, onDismiss }) => {
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const hide = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: 80, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onDismiss());
    }, [onDismiss, translateY, opacity]);

    useEffect(() => {
        if (!config) return;

        // Reset & slide up from bottom
        translateY.setValue(80);
        opacity.setValue(0);
        const animation = Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]);
        animation.start();

        // Auto-dismiss
        timer.current = setTimeout(hide, config.duration ?? 2200);
        return () => { 
            if (timer.current) clearTimeout(timer.current); 
            animation.stop();
        };
    }, [config, hide, translateY, opacity]);

    if (!config) return null;

    const type = config.type ?? 'success';
    const icon = ICON_MAP[type];
    const bg = BG_MAP[type];

    return (
        <Animated.View
            style={[styles.container, { backgroundColor: bg, transform: [{ translateY }], opacity }]}
            pointerEvents="none"
        >
            <Ionicons name={icon.name} size={20} color={icon.color} />
            <Text style={[styles.message, { color: icon.color }]}>{config.message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 72 : 88,
        left: SPACING.m,
        right: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s + 2,
        borderRadius: BORDER_RADIUS.m,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        zIndex: 9999,
        elevation: 10,
    },
    message: {
        fontFamily: FONTS.bodyMedium,
        fontSize: 14,
        flex: 1,
    },
});
