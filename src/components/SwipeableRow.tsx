import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, TouchableOpacity, LayoutAnimation, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';



const REVEAL_THRESHOLD = -70;

interface SwipeableRowProps {
    children: React.ReactNode;
    onDelete: () => void;
    height?: number;
    isLoading?: boolean;
}

export const SwipeableRow = React.memo<SwipeableRowProps>(({ children, onDelete, height, isLoading }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const revealedRef = useRef(false);
    const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(height);
    const isDeleting = useRef(false);

    useEffect(() => {
        return () => translateX.stopAnimation();
    }, [translateX]);

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
                if (gesture.dx > 0 && !revealedRef.current) {
                    translateX.setValue(gesture.dx * 0.2);
                    return;
                }
                const base = revealedRef.current ? REVEAL_THRESHOLD : 0;
                translateX.setValue(base + gesture.dx);
            },
            onPanResponderRelease: (_, gesture) => {
                if (revealedRef.current) {
                    // If already revealed, allow closing on right swipe
                    if (gesture.dx > 30) {
                        revealedRef.current = false;
                        snapTo(0);
                    } else {
                        snapTo(REVEAL_THRESHOLD);
                    }
                    return;
                }

                if (gesture.dx <= REVEAL_THRESHOLD) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    revealedRef.current = true;
                    snapTo(REVEAL_THRESHOLD);
                } else {
                    snapTo(0);
                }
            },
        })
    ).current;

    const handleConfirmDelete = () => {
        if (isDeleting.current || isLoading) return;
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
        <View style={[styles.container, measuredHeight != null && { height: measuredHeight }]}>
            {/* Delete button background */}
            <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleConfirmDelete}
                    activeOpacity={0.7}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Delete"
                    accessibilityHint="Double tap to delete this item"
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.text.primary} size="small" />
                    ) : (
                        <>
                            <Ionicons name="trash" size={18} color={COLORS.text.primary} />
                            <Text style={styles.deleteText}>Delete</Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Swipeable content */}
            <Animated.View
                style={[styles.content, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
                onLayout={height == null ? (e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && measuredHeight !== h) setMeasuredHeight(h);
                } : undefined}
                accessibilityHint="Swipe left to reveal delete button"
            >
                {children}
            </Animated.View>
        </View>
    );
});

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
        gap: SPACING.xs,
    },
    deleteText: {
        color: COLORS.text.primary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 11,
    },
    content: {
        flex: 1,
    },
});
