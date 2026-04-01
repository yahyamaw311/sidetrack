import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { MovieDetail } from '../types';
import { SwipeableStars } from './SwipeableStars';
import { DatePickerModal } from './DatePicker';
import { FadeImage } from './FadeImage';

interface InitialData {
    rating?: number;
    liked?: boolean;
    review?: string;
    tags?: string;
    rewatch?: boolean;
    noSpoilers?: boolean;
    watchedDate?: Date;
}

interface WatchedMovieModalProps {
    visible: boolean;
    movie: MovieDetail | null;
    onClose: () => void;
    onConfirm: (data: {
        rating: number;
        liked: boolean;
        review: string;
        tags: string;
        rewatch: boolean;
        noSpoilers: boolean;
        watchedDate: Date;
    }) => void;
    initialData?: InitialData | null;
}

export const WatchedMovieModal: React.FC<WatchedMovieModalProps> = ({
    visible,
    movie,
    onClose,
    onConfirm,
    initialData,
}) => {
    const [rating, setRating] = useState(0);
    const [liked, setLiked] = useState(false);
    const [review, setReview] = useState('');
    const [tags, setTags] = useState('');
    const [rewatch, setRewatch] = useState(false);
    const [noSpoilers, setNoSpoilers] = useState(false);
    const [watchedDate, setWatchedDate] = useState<Date>(new Date());
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    // Pre-fill from initialData when modal opens
    useEffect(() => {
        if (visible && initialData) {
            setRating(initialData.rating ?? 0);
            setLiked(initialData.liked ?? false);
            setReview(initialData.review ?? '');
            setTags(initialData.tags ?? '');
            setRewatch(initialData.rewatch ?? false);
            setNoSpoilers(initialData.noSpoilers ?? false);
            const d = initialData.watchedDate ?? new Date();
            setWatchedDate(d > new Date() ? new Date() : d);
        } else if (visible) {
            setRating(0);
            setLiked(false);
            setReview('');
            setTags('');
            setRewatch(false);
            setNoSpoilers(false);
            setWatchedDate(new Date());
        }
    }, [visible]);

    const handleConfirm = () => {
        if (rating === 0) return;
        const cleanTags = Array.from(new Set(tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))).join(', ');
        const clampedDate = watchedDate > new Date() ? new Date() : watchedDate;
        onConfirm({ rating, liked, review: review.trim(), tags: cleanTags, rewatch, noSpoilers, watchedDate: clampedDate });
        // Reset state
        setRating(0);
        setLiked(false);
        setReview('');
        setTags('');
        setRewatch(false);
        setNoSpoilers(false);
        setWatchedDate(new Date());
    };

    const handleClose = () => {
        setRating(0);
        setLiked(false);
        setReview('');
        setTags('');
        setRewatch(false);
        setNoSpoilers(false);
        setWatchedDate(new Date());
        onClose();
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Close">
                            <Ionicons name="close" size={22} color={COLORS.text.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{initialData ? 'Edit Entry' : 'I Watched'}</Text>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={styles.headerBtn}
                            disabled={rating === 0}
                            accessibilityRole="button"
                            accessibilityLabel="Save"
                            accessibilityState={{ disabled: rating === 0 }}
                        >
                            <Ionicons name="checkmark" size={22} color={rating === 0 ? COLORS.text.muted : COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Movie info */}
                        {movie && (
                            <View style={styles.episodeInfo}>
                                {movie.poster_path ? (
                                    <FadeImage
                                        source={tmdbService.getImageSource(movie.poster_path, 'w300')}
                                        style={styles.episodeThumb}
                                    />
                                ) : (
                                    <View style={[styles.episodeThumb, styles.thumbPlaceholder]}>
                                        <Ionicons name="film-outline" size={20} color={COLORS.text.muted} />
                                    </View>
                                )}
                                <View style={styles.episodeText}>
                                    <Text style={styles.episodeTitle} numberOfLines={2}>
                                        {movie.title}
                                    </Text>
                                    <Text style={styles.episodeSub} numberOfLines={1}>
                                        {movie.release_date?.split('-')[0]} · {movie.runtime}m
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Date */}
                        <TouchableOpacity style={styles.row} onPress={() => setDatePickerVisible(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Watched date: ${formatDate(watchedDate)}`} accessibilityHint="Double tap to change date">
                            <Text style={styles.rowLabel}>Date</Text>
                            <View style={styles.dateRight}>
                                <Ionicons name="calendar-outline" size={16} color={COLORS.text.secondary} />
                                <Text style={styles.dateText}>{formatDate(watchedDate)}</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.text.muted} />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.separator} />

                        <DatePickerModal
                            visible={datePickerVisible}
                            date={watchedDate}
                            onConfirm={(d) => { setWatchedDate(d); setDatePickerVisible(false); }}
                            onCancel={() => setDatePickerVisible(false)}
                        />

                        {/* Star rating + Like */}
                        <View style={styles.ratingLikeRow}>
                            <View style={styles.starsWrap}>
                                <SwipeableStars value={rating} onChange={setRating} />
                                <Text style={styles.starsLabel}>{rating > 0 ? 'Rated' : 'Rate'}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.likeWrap}
                                onPress={() => setLiked(!liked)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={liked ? 'Unlike' : 'Like'}
                                accessibilityState={{ selected: liked }}
                            >
                                <Ionicons
                                    name={liked ? "heart" : "heart-outline"}
                                    size={36}
                                    color={liked ? COLORS.coral : COLORS.text.muted}
                                />
                                <Text style={styles.likeLabel}>Like</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.separator} />

                        {/* Review */}
                        <TextInput
                            style={styles.reviewInput}
                            placeholder="Add review..."
                            placeholderTextColor={COLORS.text.muted}
                            value={review}
                            onChangeText={setReview}
                            multiline
                            textAlignVertical="top"
                            maxLength={2000}
                            accessibilityLabel="Add review"
                        />
                        <View style={styles.separator} />

                        {/* Tags */}
                        <TextInput
                            style={styles.tagsInput}
                            placeholder="Add tags..."
                            placeholderTextColor={COLORS.text.muted}
                            value={tags}
                            onChangeText={setTags}
                            maxLength={100}
                            accessibilityLabel="Add tags, comma separated"
                        />
                        <View style={styles.separator} />

                        {/* Toggles */}
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={styles.toggleItem}
                                onPress={() => setRewatch(!rewatch)}
                                activeOpacity={0.7}
                                accessibilityRole="switch"
                                accessibilityLabel="I've seen this before"
                                accessibilityState={{ checked: rewatch }}
                            >
                                <View style={styles.toggleIconWrap}>
                                    {rewatch && (
                                        <View style={styles.toggleCheck}>
                                            <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                                        </View>
                                    )}
                                    <Ionicons name="eye-outline" size={28} color={rewatch ? COLORS.text.primary : COLORS.text.muted} />
                                </View>
                                <Text style={[styles.toggleLabel, rewatch && styles.toggleLabelActive]}>
                                    I've seen this{'\n'}before
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.toggleItem}
                                onPress={() => setNoSpoilers(!noSpoilers)}
                                activeOpacity={0.7}
                                accessibilityRole="switch"
                                accessibilityLabel="No spoilers"
                                accessibilityState={{ checked: noSpoilers }}
                            >
                                <View style={styles.toggleIconWrap}>
                                    {noSpoilers && (
                                        <View style={styles.toggleCheck}>
                                            <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} />
                                        </View>
                                    )}
                                    <Ionicons name="shield-outline" size={28} color={noSpoilers ? COLORS.text.primary : COLORS.text.muted} />
                                </View>
                                <Text style={[styles.toggleLabel, noSpoilers && styles.toggleLabelActive]}>
                                    No spoilers
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        paddingTop: Platform.OS === 'android' ? 40 : 54,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 20,
    },
    body: {
        flex: 1,
        paddingHorizontal: SPACING.m,
    },
    episodeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
        paddingVertical: SPACING.m,
    },
    episodeThumb: {
        width: 45,
        height: 68,
        borderRadius: BORDER_RADIUS.xs,
        backgroundColor: COLORS.card,
    },
    thumbPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeText: {
        flex: 1,
        gap: 2,
    },
    episodeTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
    episodeSub: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 13,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.m,
    },
    rowLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 15,
    },
    dateRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateText: {
        color: COLORS.text.primary,
        fontFamily: FONTS.body,
        fontSize: 14,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.primary,
        opacity: 0.25,
    },
    ratingLikeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.l,
    },
    starsWrap: {
        alignItems: 'flex-start',
        gap: 6,
    },
    starsLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 13,
    },
    likeWrap: {
        alignItems: 'center',
        gap: 6,
    },
    likeLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 13,
    },
    reviewInput: {
        color: COLORS.text.primary,
        fontFamily: FONTS.body,
        fontSize: 15,
        paddingVertical: SPACING.m,
        minHeight: 100,
    },
    tagsInput: {
        color: COLORS.text.primary,
        fontFamily: FONTS.body,
        fontSize: 15,
        paddingVertical: SPACING.m,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: SPACING.xl,
    },
    toggleItem: {
        alignItems: 'center',
        gap: 8,
    },
    toggleIconWrap: {
        position: 'relative',
    },
    toggleCheck: {
        position: 'absolute',
        top: -6,
        left: -6,
        zIndex: 1,
    },
    toggleLabel: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 12,
        textAlign: 'center',
    },
    toggleLabelActive: {
        color: COLORS.text.secondary,
    },
});
