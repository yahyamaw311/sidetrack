import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export const NetworkBanner: React.FC = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-50));

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const offline = !(state.isConnected && state.isInternetReachable !== false);
            setIsOffline(offline);

            Animated.timing(slideAnim, {
                toValue: offline ? 0 : -50,
                duration: 300,
                useNativeDriver: true,
            }).start();
        });

        return () => unsubscribe();
    }, [slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name="cloud-offline-outline" size={14} color={COLORS.text.inverse} />
            <Text style={styles.text}>No internet connection</Text>
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
