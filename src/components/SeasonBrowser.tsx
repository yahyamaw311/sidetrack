import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, LayoutAnimation, FlatList, RefreshControlProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, getRatingColor } from '../constants/theme';
import { tmdbService } from '../services/tmdbService';
import { Episode, SeasonSummary, EpisodeDetailData } from '../types';
import { FadeImage } from './FadeImage';
import { useAppStore } from '../store/appStore';

interface SeasonBrowserProps {
    tvId: number;
    displaySeasons: SeasonSummary[];
    currentEpisode: Episode;
    watchedEpisodeIds: Set<number>;
    onSelectEpisode: (ep: Episode) => void;
    onOpenWatchedModal: (ep: Episode) => void;
    onEditWatchedEntry: (ep: Episode) => void;
    ListHeaderComponent?: React.ReactElement;
    refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const SeasonBrowser: React.FC<SeasonBrowserProps> = ({
    tvId,
    displaySeasons,
    currentEpisode,
    watchedEpisodeIds,
    onSelectEpisode,
    onOpenWatchedModal,
    onEditWatchedEntry,
    ListHeaderComponent,
    refreshControl,
}) => {
    const storeRemoveEpisode = useAppStore(s => s.removeEpisode);
    const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
    const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, Episode[]>>({});
    const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
    const [episodeImdbRatings, setEpisodeImdbRatings] = useState<Record<string, { rating: string; votes: string }>>({});
    const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | null>(null);
    const [episodeDetails, setEpisodeDetails] = useState<Record<number, EpisodeDetailData>>({});
    const [loadingEpisodeDetail, setLoadingEpisodeDetail] = useState<number | null>(null);

    const toggleSeason = useCallback(async (seasonNumber: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (expandedSeason === seasonNumber) {
            setExpandedSeason(null);
            return;
        }
        setExpandedSeason(seasonNumber);
        setExpandedEpisodeId(null);

        if (!seasonEpisodes[seasonNumber]) {
            setLoadingSeason(seasonNumber);
            const data = await tmdbService.getSeasonDetails(tvId, seasonNumber);
            if (data?.episodes) {
                setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: data.episodes }));
                fetchEpisodeImdbRatings(seasonNumber, data.episodes);
            }
            setLoadingSeason(null);
        }
    }, [expandedSeason, seasonEpisodes, tvId]);

    const fetchEpisodeImdbRatings = useCallback(async (seasonNumber: number, episodes: Episode[]) => {
        const ratings: Record<string, { rating: string; votes: string }> = {};
        await Promise.all(
            episodes.map(async (ep) => {
                const result = await tmdbService.getIMDbEpisodeRating(tvId, seasonNumber, ep.episode_number);
                if (result) {
                    const key = `${seasonNumber}-${ep.episode_number}`;
                    ratings[key] = { rating: result.imdbRating, votes: result.imdbVotes };
                }
            })
        );
        setEpisodeImdbRatings(prev => ({ ...prev, ...ratings }));
    }, [tvId]);

    const toggleEpisodeExpand = useCallback(async (ep: Episode) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (expandedEpisodeId === ep.id) {
            setExpandedEpisodeId(null);
            onSelectEpisode(ep);
            return;
        }
        setExpandedEpisodeId(ep.id);
        onSelectEpisode(ep);

        if (!episodeDetails[ep.id]) {
            setLoadingEpisodeDetail(ep.id);
            const detail = await tmdbService.getEpisodeDetails(tvId, ep.season_number, ep.episode_number);
            if (detail) {
                setEpisodeDetails(prev => ({ ...prev, [ep.id]: detail }));
            }
            setLoadingEpisodeDetail(null);
        }
    }, [expandedEpisodeId, episodeDetails, tvId, onSelectEpisode]);

    const listData = React.useMemo(() => {
        const data: any[] = [];
        data.push({ type: 'TITLE' });
        displaySeasons.forEach(season => {
            data.push({ type: 'SEASON', item: season });
            if (expandedSeason === season.season_number && seasonEpisodes[season.season_number]) {
                seasonEpisodes[season.season_number].forEach(ep => {
                    data.push({ type: 'EPISODE', item: ep });
                });
            }
        });
        return data;
    }, [displaySeasons, expandedSeason, seasonEpisodes]);

    return (
        <FlatList
            data={listData}
            extraData={[
                loadingSeason,
                loadingEpisodeDetail,
                currentEpisode.id,
                watchedEpisodeIds,
                expandedEpisodeId,
                episodeImdbRatings,
                episodeDetails,
            ]}
            keyExtractor={(item) => item.type === 'TITLE' ? 'title' : item.type === 'SEASON' ? `s-${item.item.id}` : `e-${item.item.id}`}
            ListHeaderComponent={ListHeaderComponent}
            refreshControl={refreshControl}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
                if (item.type === 'TITLE') {
                    return <Text style={[styles.sectionLabel, { marginTop: SPACING.m, paddingHorizontal: SPACING.m }]}>SEASONS & EPISODES</Text>;
                }

                if (item.type === 'SEASON') {
                    const season = item.item;
                    const isExpanded = expandedSeason === season.season_number;
                    const isLoading = loadingSeason === season.season_number;
                    return (
                        <View style={[styles.seasonBlock, { marginHorizontal: SPACING.m }]}>
                            <TouchableOpacity
                                style={styles.seasonHeader}
                                onPress={() => toggleSeason(season.season_number)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`${season.name}, ${season.episode_count} episode${season.episode_count !== 1 ? 's' : ''}`}
                                accessibilityHint={isExpanded ? 'Double tap to collapse' : 'Double tap to expand'}
                                accessibilityState={{ expanded: isExpanded }}
                            >
                                <View style={styles.seasonHeaderLeft}>
                                    <Text style={styles.seasonTitle}>{season.name}</Text>
                                    <Text style={styles.seasonMeta}>
                                        {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
                                        {season.air_date ? ` · ${season.air_date.split('-')[0]}` : ''}
                                    </Text>
                                </View>
                                <View style={styles.seasonChevron}>
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    ) : (
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color={COLORS.text.muted}
                                        />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                }

                if (item.type === 'EPISODE') {
                    const ep = item.item;
                    const isSelected = currentEpisode.id === ep.id;
                    const isEpExpanded = expandedEpisodeId === ep.id;
                    const epDetail = episodeDetails[ep.id];
                    const isLoadingDetail = loadingEpisodeDetail === ep.id;
                    const imdbKey = `${ep.season_number}-${ep.episode_number}`;
                    const epImdb = episodeImdbRatings[imdbKey];
                    const ratingVal = parseFloat(epImdb?.rating || String(ep.vote_average));

                    return (
                        <View style={[styles.episodeRow, { marginHorizontal: SPACING.m }, isSelected && styles.episodeRowActive]}>
                            <TouchableOpacity
                                style={styles.epTouchArea}
                                onPress={() => toggleEpisodeExpand(ep)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`Episode ${ep.episode_number}, ${ep.name}`}
                                accessibilityHint="Double tap to expand or collapse details"
                            >
                                <View style={styles.epTopRow}>
                                    <View style={styles.episodeNumberWrap}>
                                        <Text style={[styles.episodeNumber, isSelected && styles.episodeNumberActive]}>
                                            {ep.episode_number}
                                        </Text>
                                    </View>
                                    {!isEpExpanded && (
                                        ep.still_path ? (
                                            <FadeImage
                                                source={tmdbService.getImageSource(ep.still_path, 'w300')}
                                                style={styles.episodeThumb}
                                            />
                                        ) : (
                                            <View style={[styles.episodeThumb, styles.episodeThumbPlaceholder]}>
                                                <Ionicons name="image-outline" size={16} color={COLORS.text.muted} />
                                            </View>
                                        )
                                    )}
                                    <View style={styles.episodeInfo}>
                                        <Text style={[styles.episodeTitle, isSelected && styles.episodeTitleActive]} numberOfLines={isEpExpanded ? undefined : 2}>
                                            {ep.name}
                                        </Text>
                                        {!isEpExpanded && (
                                            <View style={styles.episodeMetaRow}>
                                                {ep.air_date ? <Text style={styles.episodeMetaText}>{ep.air_date}</Text> : null}
                                                {ep.runtime ? (
                                                    <><View style={styles.epMetaDot} /><Text style={styles.episodeMetaText}>{ep.runtime}m</Text></>
                                                ) : null}
                                                {(epImdb || ep.vote_average > 0) && (
                                                    <>
                                                        <View style={styles.epMetaDot} />
                                                        <View style={styles.episodeRatingRow}>
                                                            <Ionicons name="star" size={10} color={getRatingColor(ratingVal)} />
                                                            <Text style={[styles.episodeMetaText, { color: getRatingColor(ratingVal) }]}>
                                                                {epImdb?.rating || ep.vote_average.toFixed(1)}
                                                            </Text>
                                                        </View>
                                                    </>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                    <Ionicons
                                        name={isEpExpanded ? "chevron-up" : "chevron-down"}
                                        size={14}
                                        color={COLORS.text.muted}
                                        style={{ marginLeft: 2 }}
                                    />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.epWatchButton,
                                    watchedEpisodeIds.has(ep.id) && styles.epWatchButtonDone,
                                ]}
                                onPress={() => {
                                    if (watchedEpisodeIds.has(ep.id)) {
                                        Alert.alert(
                                            ep.name,
                                            'What would you like to do?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Edit', onPress: () => onEditWatchedEntry(ep) },
                                                {
                                                    text: 'Remove',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        await storeRemoveEpisode(ep.seriesId, ep.id);
                                                    },
                                                },
                                            ]
                                        );
                                    } else {
                                        onOpenWatchedModal(ep);
                                    }
                                }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel={watchedEpisodeIds.has(ep.id) ? `Episode ${ep.episode_number} watched, double tap for options` : `Mark episode ${ep.episode_number} as watched`}
                            >
                                <Ionicons
                                    name={watchedEpisodeIds.has(ep.id) ? "checkmark" : "add"}
                                    size={14}
                                    color={watchedEpisodeIds.has(ep.id) ? COLORS.teal : COLORS.text.muted}
                                />
                            </TouchableOpacity>
                            {isEpExpanded && (
                                <View style={styles.epExpandedWrap}>
                                    {isLoadingDetail ? (
                                        <View style={styles.epExpandedLoading}>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                        </View>
                                    ) : epDetail ? (
                                        <>
                                            {ep.still_path && (
                                                <View style={styles.epExpandedImageWrap}>
                                                    <FadeImage
                                                        source={tmdbService.getImageSource(ep.still_path, 'w780')}
                                                        style={styles.epExpandedImage}
                                                    />
                                                </View>
                                            )}
                                            <View style={styles.epExpandedStats}>
                                                {(epImdb || ep.vote_average > 0) && (
                                                    <View style={styles.epStatItem}>
                                                        <Ionicons name="star" size={14} color={getRatingColor(ratingVal)} />
                                                        <Text style={[styles.epStatValue, { color: getRatingColor(ratingVal) }]}>
                                                            {epImdb?.rating || ep.vote_average.toFixed(1)}
                                                        </Text>
                                                        {(epImdb?.votes || epDetail.vote_count) && (
                                                            <Text style={styles.epStatLabel}>
                                                                ({epImdb?.votes || epDetail.vote_count?.toLocaleString()})
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                                {ep.runtime ? (
                                                    <View style={styles.epStatItem}>
                                                        <Ionicons name="time-outline" size={13} color={COLORS.text.muted} />
                                                        <Text style={styles.epStatLabel}>{ep.runtime} min</Text>
                                                    </View>
                                                ) : null}
                                                {ep.air_date ? (
                                                    <View style={styles.epStatItem}>
                                                        <Ionicons name="calendar-outline" size={13} color={COLORS.text.muted} />
                                                        <Text style={styles.epStatLabel}>{ep.air_date}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                            {ep.overview ? (
                                                <Text style={styles.epExpandedOverview}>{ep.overview}</Text>
                                            ) : null}
                                        </>
                                    ) : (
                                        <Text style={styles.epExpandedOverview}>No additional details available.</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }

                return null;
            }}
        />
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: SPACING.l,
    },
    sectionLabel: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: SPACING.s,
    },
    seasonBlock: {
        marginBottom: SPACING.xs,
        borderRadius: BORDER_RADIUS.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.card,
    },
    seasonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: 14,
    },
    seasonHeaderLeft: {
        flex: 1,
        gap: 2,
    },
    seasonTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
    seasonMeta: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 12,
    },
    seasonChevron: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodesList: {
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    episodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    episodeRowActive: {
        backgroundColor: COLORS.primaryMuted,
    },
    epTouchArea: {
        flex: 1,
    },
    epTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    episodeNumberWrap: {
        width: 24,
        alignItems: 'center',
    },
    episodeNumber: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 13,
    },
    episodeNumberActive: {
        color: COLORS.primary,
        fontFamily: FONTS.heading,
    },
    episodeThumb: {
        width: 80,
        height: 45,
        borderRadius: BORDER_RADIUS.xs,
        backgroundColor: COLORS.surface,
    },
    episodeThumbPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    episodeInfo: {
        flex: 1,
        gap: 2,
    },
    episodeTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 13,
    },
    episodeTitleActive: {
        color: COLORS.primary,
        fontFamily: FONTS.heading,
    },
    episodeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 2,
    },
    episodeMetaText: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 11,
    },
    epMetaDot: {
        width: 3,
        height: 3,
        borderRadius: 2,
        backgroundColor: COLORS.text.muted,
    },
    episodeRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    epWatchButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    epWatchButtonDone: {
        borderColor: COLORS.teal,
        backgroundColor: 'rgba(45,212,168,0.12)',
    },
    epExpandedWrap: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    epExpandedLoading: {
        paddingVertical: SPACING.l,
        alignItems: 'center',
    },
    epExpandedImageWrap: {
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    epExpandedImage: {
        width: '100%',
        height: 180,
        borderRadius: BORDER_RADIUS.s,
        backgroundColor: COLORS.card,
    },
    epExpandedStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.m,
        marginBottom: SPACING.m,
    },
    epStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    epStatValue: {
        fontFamily: FONTS.heading,
        fontSize: 14,
    },
    epStatLabel: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 12,
    },
    epExpandedOverview: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: SPACING.m,
    },
});
