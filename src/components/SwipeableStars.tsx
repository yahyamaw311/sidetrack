import React, { useRef, useCallback } from 'react';
import { View, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';

const STAR_SIZE = 40;
const STAR_GAP = 4;
const STAR_COUNT = 5;
const STAR_TOTAL_WIDTH = STAR_COUNT * STAR_SIZE + (STAR_COUNT - 1) * STAR_GAP;

interface SwipeableStarsProps {
    value: number;
    onChange: (val: number) => void;
}

export const SwipeableStars: React.FC<SwipeableStarsProps> = ({ value, onChange }) => {
    const containerRef = useRef<View>(null);
    const containerX = useRef(0);
    const lastHapticValue = useRef(0);

    const calcRating = useCallback((pageX: number) => {
        const x = pageX - containerX.current;
        if (x <= 0) return 0;
        if (x >= STAR_TOTAL_WIDTH) return 5;
        const starSlot = STAR_SIZE + STAR_GAP;
        const starIndex = Math.floor(x / starSlot);
        const withinStar = x - starIndex * starSlot;
        if (withinStar <= STAR_SIZE / 2) {
            return starIndex + 0.5;
        }
        return starIndex + 1;
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                containerRef.current?.measureInWindow((x) => {
                    containerX.current = x;
                    const newVal = calcRating(evt.nativeEvent.pageX);
                    lastHapticValue.current = newVal;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange(newVal);
                });
            },
            onPanResponderMove: (evt) => {
                const newVal = calcRating(evt.nativeEvent.pageX);
                if (newVal !== lastHapticValue.current) {
                    lastHapticValue.current = newVal;
                    Haptics.selectionAsync();
                }
                onChange(newVal);
            },
        })
    ).current;

    const renderStar = (index: number) => {
        const starNum = index + 1;
        let name: 'star' | 'star-half' | 'star-outline' = 'star-outline';
        if (value >= starNum) {
            name = 'star';
        } else if (value >= starNum - 0.5) {
            name = 'star-half';
        }
        const filled = value >= starNum - 0.5;
        return (
            <Ionicons
                key={index}
                name={name}
                size={STAR_SIZE}
                color={filled ? '#4ADE80' : COLORS.text.muted}
            />
        );
    };

    return (
        <View
            ref={containerRef}
            style={{ flexDirection: 'row', gap: STAR_GAP }}
            {...panResponder.panHandlers}
        >
            {[0, 1, 2, 3, 4].map(renderStar)}
        </View>
    );
};
