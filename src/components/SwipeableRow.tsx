import React, { useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const REVEAL_THRESHOLD = -70;

interface SwipeableRowProps {
    children: React.ReactNode;
    onDelete: () => void;
    height?: number;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete, height = 120 }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [revealed, setRevealed] = useState(false);
    const isDeleting = useRef(false);

    const snapTo = (value: number) => {
        Animated.spring(translateX, {
            toValue: value,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
        }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => {
                return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy * 1.5);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dx > 0 && !revealed) {
                    translateX.setValue(gesture.dx * 0.2);
                    return;
                }
                const base = revealed ? REVEAL_THRESHOLD : 0;
                translateX.setValue(base + gesture.dx);
            },
            onPanResponderRelease: (_, gesture) => {
                if (revealed) {
                    // If already revealed, allow closing on right swipe
                    if (gesture.dx > 30) {
                        setRevealed(false);
                        snapTo(0);
                    } else {
                        snapTo(REVEAL_THRESHOLD);
                    }
                    return;
                }

                if (gesture.dx <= REVEAL_THRESHOLD) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRevealed(true);
                    snapTo(REVEAL_THRESHOLD);
                } else {
                    snapTo(0);
                }
            },
        })
    ).current;

    const handleConfirmDelete = () => {
        if (isDeleting.current) return;
        isDeleting.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(translateX, {
            toValue: -500,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onDelete();
        });
    };

    const deleteOpacity = translateX.interpolate({
        inputRange: [REVEAL_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { height }]}>
            {/* Delete button background */}
            <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleConfirmDelete}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Swipeable content */}
            <Animated.View
                style={[styles.content, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    deleteBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.coral,
        borderRadius: BORDER_RADIUS.m,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 0,
    },
    deleteButton: {
        width: 70,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    deleteText: {
        color: '#fff',
        fontFamily: FONTS.bodyMedium,
        fontSize: 11,
    },
    content: {
        flex: 1,
    },
});
