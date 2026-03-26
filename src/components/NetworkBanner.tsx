import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useNetwork } from '../contexts/NetworkContext';

export const NetworkBanner: React.FC = () => {
    const { isOffline } = useNetwork();
    const [slideAnim] = useState(new Animated.Value(-50));

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -50,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isOffline, slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name="cloud-offline-outline" size={14} color={COLORS.text.inverse} />
            <Text style={styles.text}>No internet connection — cached data may be shown</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.xs + 2,
        backgroundColor: COLORS.coral,
    },
    text: {
        color: COLORS.text.inverse,
        fontFamily: FONTS.bodyMedium,
        fontSize: 12,
    },
});
