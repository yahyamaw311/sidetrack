import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
    ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, GRADIENTS, LETTER_SPACING } from '../constants/theme';
import { CONFIG } from '../constants/config';
import type { WrappedStats } from '../services/StatsService';

const CARD_PADDING = SPACING.l;

// Card gradient palettes
const CARD_GRADIENTS: [string, string, string][] = [
    ['#1a1a2e', '#16213e', '#0f3460'], // deep blue
    GRADIENTS.wrapped,                  // purple haze
    ['#1a1a2e', '#e94560', '#533483'], // magenta burst
    ['#0d0d0d', '#1a1a2e', COLORS.primary], // gold
    ['#141E30', '#243B55', COLORS.teal], // teal
    ['#1a1a2e', '#16213e', COLORS.accent], // violet
    ['#0f0c29', '#302b63', COLORS.coral], // coral
    ['#141E30', '#1a1a2e', COLORS.rating.mid], // amber
    ['#0d0d0d', '#1a1a2e', COLORS.teal], // mint
    ['#1a1a2e', '#0f3460', COLORS.primary], // navy gold
    ['#0f0c29', '#1a1a2e', COLORS.accent], // deep violet
];

interface WrappedScreenProps {
    year: number;
    onClose: () => void;
}

export const WrappedScreen: React.FC<WrappedScreenProps> = ({ year, onClose }) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<WrappedStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        return () => fadeAnim.stopAnimation();
    }, [fadeAnim]);
    
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const loadStatsAsync = async () => {
            try {
                const { StatsService } = await import('../services/StatsService');
                const data = await StatsService.computeWrapped(year);
                if (!isMounted.current) return;
                setStats(data);
            } catch {
                // If stats fail to compute, show the empty state
                if (!isMounted.current) return;
                setStats(null);
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
                }
            }
        };
        loadStatsAsync();
    }, [year, fadeAnim]);

    const handleScroll = (event: any) => {
        const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentPage(page);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient colors={GRADIENTS.wrapped} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Crunching your stats...</Text>
            </View>
        );
    }

    if (!stats || stats.totalEntries === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient colors={GRADIENTS.wrapped} style={StyleSheet.absoluteFill} />
                <Ionicons name="film-outline" size={64} color={COLORS.text.muted} />
                <Text style={styles.emptyTitle}>Nothing to Wrap for {year}!</Text>
                <Text style={styles.emptySubtitle}>Log some movies and episodes, then come back.</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Go back">
                    <Text style={styles.closeBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const cards = buildCards(stats, year, SCREEN_WIDTH);
    const totalPages = cards.length;

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    decelerationRate="fast"
                >
                    {cards.map((card, index) => (
                        <View key={index} style={[styles.cardWrapper, { width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT }]}>
                            <LinearGradient
                                colors={CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <ScrollView
                                style={styles.cardScrollContent}
                                contentContainerStyle={[styles.cardContentContainer, { minHeight: SCREEN_HEIGHT }]}
                                showsVerticalScrollIndicator={false}
                            >
                                {card.content}
                            </ScrollView>
                        </View>
                    ))}
                </ScrollView>

                {/* Close button */}
                <TouchableOpacity style={[styles.closeButton, { top: insets.top + SPACING.s }]} onPress={onClose} activeOpacity={CONFIG.LAYOUT.ACTIVE_OPACITY} accessibilityRole="button" accessibilityLabel="Close Wrapped">
                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>

                {/* Page dots */}
                <View style={[styles.dotsContainer, { bottom: insets.bottom + SPACING.m }]}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === currentPage && styles.dotActive]}
                        />
                    ))}
                </View>

                {/* Page counter */}
                <View style={[styles.pageCounter, { top: insets.top + SPACING.s }]}>
                    <Text style={styles.pageCounterText}>{currentPage + 1} / {totalPages}</Text>
                </View>
            </Animated.View>
        </View>
    );
};

// â”€â”€ Card builders â”€â”€

interface CardData {
    content: React.ReactNode;
}

const StatValue: React.FC<{ value: string | number; label: string; icon?: string; color?: string }> = ({ value, label, icon, color }) => (
    <View style={cardStyles.statItem}>
        {icon && <Ionicons name={icon as any} size={20} color={color || COLORS.primary} style={{ marginBottom: 4 }} />}
        <Text style={[cardStyles.statValue, color ? { color } : {}]}>{value}</Text>
        <Text style={cardStyles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
);

const SectionTitle: React.FC<{ text: string; icon?: string }> = ({ text, icon }) => (
    <View style={cardStyles.sectionTitleRow}>
        {icon && <Ionicons name={icon as any} size={22} color={COLORS.primary} />}
        <Text style={cardStyles.sectionTitle}>{text}</Text>
    </View>
);

const RankRow: React.FC<{ rank: number; text: string; subtext?: string; color?: string }> = ({ rank, text, subtext, color }) => (
    <View style={cardStyles.rankRow}>
        <Text style={[cardStyles.rankNumber, color ? { color } : {}]}>{rank}</Text>
        <View style={cardStyles.rankTextWrap}>
            <Text style={cardStyles.rankText} numberOfLines={1}>{text}</Text>
            {subtext && <Text style={cardStyles.rankSubtext}>{subtext}</Text>}
        </View>
    </View>
);

const BarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; maxWidth: number }> = ({ data, maxWidth }) => {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
        <View style={cardStyles.barChart}>
            {data.map((d, i) => (
                <View key={i} style={cardStyles.barRow}>
                    <Text style={cardStyles.barLabel}>{d.label}</Text>
                    <View style={cardStyles.barTrack}>
                        <View style={[cardStyles.barFill, { width: Math.max(4, (d.value / maxVal) * maxWidth), backgroundColor: d.color || COLORS.primary }]} />
                    </View>
                    <Text style={cardStyles.barValue}>{d.value}</Text>
                </View>
            ))}
        </View>
    );
};

function buildCards(stats: WrappedStats, year: number, screenWidth: number): CardData[] {
    const cards: CardData[] = [];

    // 1. Hero card
    cards.push({
        content: (
            <View style={cardStyles.centered}>
                <Ionicons name="videocam" size={48} color={COLORS.primary} style={{ marginBottom: SPACING.m }} />
                <Text style={cardStyles.heroTitle}>Your {year}{`\n`}Sidetrack Wrapped</Text>
                <Text style={cardStyles.heroSubtitle}>Here's everything you watched</Text>
                <View style={cardStyles.heroStatsRow}>
                    <StatValue value={stats.totalMovies} label="Movies" icon="film-outline" />
                    <StatValue value={stats.totalEpisodes} label="Episodes" icon="tv-outline" />
                    <StatValue value={stats.totalEntries} label="Total" icon="library-outline" />
                </View>
                <Text style={cardStyles.swipeHint}>Swipe to explore â†’</Text>
            </View>
        ),
    });

    // 2. Hours card
    cards.push({
        content: (
            <View style={cardStyles.centered}>
                <Ionicons name="time-outline" size={48} color={COLORS.primary} style={{ marginBottom: SPACING.m }} />
                <Text style={cardStyles.bigNumber}>{stats.totalHoursWatched}</Text>
                <Text style={cardStyles.bigLabel}>hours watched</Text>
                <Text style={cardStyles.funFact}>{stats.funTimeEquivalent}</Text>
                {stats.longestMovie && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Longest movie</Text>
                        <Text style={cardStyles.infoBoxValue}>{stats.longestMovie.title}</Text>
                        <Text style={cardStyles.infoBoxMeta}>{stats.longestMovie.runtime} minutes</Text>
                    </View>
                )}
                {stats.avgMovieRuntime > 0 && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Average movie runtime</Text>
                        <Text style={cardStyles.infoBoxValue}>{stats.avgMovieRuntime} min</Text>
                    </View>
                )}
            </View>
        ),
    });

    // 3. Top rated movies
    if (stats.highestRatedMovies.length > 0) {
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Your Top Movies" icon="trophy-outline" />
                    {stats.highestRatedMovies.map((m, i) => (
                        <RankRow key={i} rank={i + 1} text={m.title} subtext={`${m.rating > 5 ? (m.rating / 2).toFixed(1) : m.rating}â˜…`} color={COLORS.primary} />
                    ))}
                    {stats.lowestRatedMovies.length > 0 && (
                        <>
                            <View style={{ marginTop: SPACING.l }} />
                            <SectionTitle text="Lowest Rated" icon="thumbs-down-outline" />
                            {stats.lowestRatedMovies.slice(0, 3).map((m, i) => (
                                <RankRow key={i} rank={i + 1} text={m.title} subtext={`${m.rating > 5 ? (m.rating / 2).toFixed(1) : m.rating}â˜…`} color={COLORS.coral} />
                            ))}
                        </>
                    )}
                </View>
            ),
        });
    }

    // 4. Top rated shows
    if (stats.highestRatedShows.length > 0) {
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Your Top Shows" icon="tv-outline" />
                    {stats.highestRatedShows.map((s, i) => (
                        <RankRow key={i} rank={i + 1} text={s.name} subtext={`${s.avgRating}â˜… avg Â· ${s.episodeCount} eps rated`} color={COLORS.primary} />
                    ))}
                    <View style={cardStyles.statsGrid}>
                        <StatValue value={stats.uniqueShowsWatched} label="Shows Watched" icon="tv-outline" color={COLORS.teal} />
                        <StatValue value={stats.totalSeasonsStarted} label="Seasons" icon="layers-outline" color={COLORS.accent} />
                    </View>
                </View>
            ),
        });
    }

    // 5. Genre breakdown
    if (stats.topGenres.length > 0) {
        const genreColors = [COLORS.primary, COLORS.teal, COLORS.accent, COLORS.coral, COLORS.rating.mid, COLORS.accent, COLORS.teal, COLORS.coral, COLORS.primary, COLORS.text.secondary];
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Genre Breakdown" icon="grid-outline" />
                    <BarChart
                        maxWidth={screenWidth - 120}
                        data={stats.topGenres.slice(0, 8).map((g, i) => ({
                            label: g.genre,
                            value: g.count,
                            color: genreColors[i % genreColors.length],
                        }))}
                    />
                    {stats.genreByAvgRating.length > 0 && (
                        <>
                            <View style={{ marginTop: SPACING.l }} />
                            <SectionTitle text="Genre You Rate Highest" icon="star-outline" />
                            <RankRow rank={1} text={stats.genreByAvgRating[0].genre} subtext={`${stats.genreByAvgRating[0].avgRating}â˜… average`} color={COLORS.teal} />
                            {stats.genreByAvgRating.length > 1 && (
                                <RankRow rank={2} text={stats.genreByAvgRating[1].genre} subtext={`${stats.genreByAvgRating[1].avgRating}â˜… average`} />
                            )}
                        </>
                    )}
                </View>
            ),
        });
    }

    // 6. Rating distribution
    const ratingEntries = Object.entries(stats.ratingDistribution)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    if (ratingEntries.length > 0) {
        cards.push({
            content: (
                <View>
                    <SectionTitle text="How You Rate" icon="star-outline" />
                    <BarChart
                        maxWidth={screenWidth - 120}
                        data={ratingEntries.map(([rating, count]) => ({
                            label: `${rating}â˜…`,
                            value: count,
                            color: parseFloat(rating) >= 4 ? COLORS.teal : parseFloat(rating) >= 2.5 ? COLORS.primary : COLORS.coral,
                        }))}
                    />
                    <View style={cardStyles.statsGrid}>
                        <StatValue value={stats.avgMovieRating > 0 ? `${stats.avgMovieRating}â˜…` : 'â€”'} label="Avg Movie Rating" color={COLORS.primary} />
                        <StatValue value={stats.avgEpisodeRating > 0 ? `${stats.avgEpisodeRating}â˜…` : 'â€”'} label="Avg Episode Rating" color={COLORS.teal} />
                    </View>
                </View>
            ),
        });
    }

    // 7. Streaks & timeline
    cards.push({
        content: (
            <View style={cardStyles.centered}>
                <Ionicons name="flame" size={48} color={COLORS.coral} style={{ marginBottom: SPACING.m }} />
                <Text style={cardStyles.bigNumber}>{stats.longestStreak}</Text>
                <Text style={cardStyles.bigLabel}>day streak</Text>
                {stats.busiestDayOfWeek && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Favorite day to watch</Text>
                        <Text style={cardStyles.infoBoxValue}>{stats.busiestDayOfWeek.day}</Text>
                        <Text style={cardStyles.infoBoxMeta}>{stats.busiestDayOfWeek.count} entries logged</Text>
                    </View>
                )}
                {stats.busiestDay && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Busiest single day</Text>
                        <Text style={cardStyles.infoBoxValue}>{new Date(stats.busiestDay.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                        <Text style={cardStyles.infoBoxMeta}>{stats.busiestDay.count} things watched</Text>
                    </View>
                )}
                {stats.avgPerWeek > 0 && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Average per week</Text>
                        <Text style={cardStyles.infoBoxValue}>{stats.avgPerWeek}</Text>
                    </View>
                )}
            </View>
        ),
    });

    // 8. Monthly activity
    const monthEntries = Object.entries(stats.monthlyActivity).sort((a, b) => a[0].localeCompare(b[0]));
    if (monthEntries.length > 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Monthly Activity" icon="calendar-outline" />
                    <BarChart                        maxWidth={screenWidth - 120}                        data={monthEntries.slice(-12).map(([key, count]) => ({
                            label: months[parseInt(key.split('-')[1]) - 1] || key,
                            value: count,
                            color: COLORS.teal,
                        }))}
                    />
                    {stats.busiestMonth && (
                        <View style={[cardStyles.infoBox, { marginTop: SPACING.l }]}>
                            <Text style={cardStyles.infoBoxLabel}>Your peak month</Text>
                            <Text style={cardStyles.infoBoxValue}>{stats.busiestMonth.month}</Text>
                            <Text style={cardStyles.infoBoxMeta}>{stats.busiestMonth.count} things watched</Text>
                        </View>
                    )}
                </View>
            ),
        });
    }

    // 9. TV deep-dive
    if (stats.showsWithMostEpisodes.length > 0) {
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Most Watched Shows" icon="tv-outline" />
                    {stats.showsWithMostEpisodes.map((s, i) => (
                        <RankRow key={i} rank={i + 1} text={s.name} subtext={`${s.count} episodes`} color={COLORS.teal} />
                    ))}
                    {stats.fastestBinge && (
                        <View style={[cardStyles.infoBox, { marginTop: SPACING.l }]}>
                            <Text style={cardStyles.infoBoxLabel}>Fastest binge</Text>
                            <Text style={cardStyles.infoBoxValue}>{stats.fastestBinge.name}</Text>
                            <Text style={cardStyles.infoBoxMeta}>{stats.fastestBinge.episodes} episodes in {stats.fastestBinge.days} day{stats.fastestBinge.days !== 1 ? 's' : ''}</Text>
                        </View>
                    )}
                </View>
            ),
        });
    }

    // 10. Movies deep-dive
    if (stats.totalMovies > 0) {
        const decadeEntries = Object.entries(stats.decadeBreakdown).sort((a, b) => a[0].localeCompare(b[0]));
        cards.push({
            content: (
                <View>
                    <SectionTitle text="Movie Time Machine" icon="film-outline" />
                    {decadeEntries.length > 0 && (
                        <BarChart
                            maxWidth={screenWidth - 120}
                            data={decadeEntries.map(([decade, count]) => ({
                                label: decade,
                                value: count,
                                color: COLORS.accent,
                            }))}
                        />
                    )}
                    <View style={cardStyles.statsGrid}>
                        {stats.oldestMovie && <StatValue value={stats.oldestMovie.year.toString()} label={stats.oldestMovie.title} color={COLORS.primary} />}
                        {stats.newestMovie && <StatValue value={stats.newestMovie.year.toString()} label={stats.newestMovie.title} color={COLORS.teal} />}
                    </View>
                    {stats.rewatchCount > 0 && (
                        <View style={[cardStyles.infoBox, { marginTop: SPACING.m }]}>
                            <Text style={cardStyles.infoBoxLabel}>Rewatches</Text>
                            <Text style={cardStyles.infoBoxValue}>{stats.rewatchCount} movie{stats.rewatchCount !== 1 ? 's' : ''} watched again</Text>
                        </View>
                    )}
                </View>
            ),
        });
    }

    // 11. Social / engagement
    cards.push({
        content: (
            <View>
                <SectionTitle text="Your Engagement" icon="heart-outline" />
                <View style={cardStyles.statsGrid}>
                    <StatValue value={stats.totalLikes} label="Likes Given" icon="heart" color={COLORS.coral} />
                    <StatValue value={stats.totalFavorites} label="Favorites" icon="star" color={COLORS.primary} />
                    <StatValue value={`${stats.likeRatio}%`} label="Like Ratio" icon="thumbs-up-outline" color={COLORS.teal} />
                </View>
                {stats.totalReviews > 0 && (
                    <View style={cardStyles.infoBox}>
                        <Text style={cardStyles.infoBoxLabel}>Reviews written</Text>
                        <Text style={cardStyles.infoBoxValue}>{stats.totalReviews}</Text>
                        <Text style={cardStyles.infoBoxMeta}>Average {stats.avgReviewLength} characters each</Text>
                    </View>
                )}
                {stats.topTags.length > 0 && (
                    <>
                        <View style={{ marginTop: SPACING.m }} />
                        <Text style={cardStyles.infoBoxLabel}>Your top tags</Text>
                        <View style={cardStyles.tagCloud}>
                            {stats.topTags.slice(0, 6).map((t, i) => (
                                <View key={i} style={cardStyles.tagChip}>
                                    <Text style={cardStyles.tagText}>{t.tag} ({t.count})</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </View>
        ),
    });

    // 12. Personality card
    cards.push({
        content: (
            <View style={cardStyles.centered}>
                <Ionicons name={({
                    'The Newcomer': 'leaf-outline',
                    'The Binger': 'tv-outline',
                    'The Critic': 'eye-outline',
                    'The Enthusiast': 'sparkles-outline',
                    'The Explorer': 'compass-outline',
                    'The Reviewer': 'create-outline',
                    'The Marathon Runner': 'speedometer-outline',
                    'The Cinephile': 'film-outline',
                    'The Balanced Viewer': 'scale-outline',
                } as any)[stats.personalityType.label] || 'person-outline'} size={64} color={COLORS.primary} style={{ marginBottom: SPACING.m }} />
                <Text style={cardStyles.personalityLabel}>You are</Text>
                <Text style={cardStyles.personalityTitle}>{stats.personalityType.label}</Text>
                <Text style={cardStyles.personalityDesc}>{stats.personalityType.description}</Text>
            </View>
        ),
    });

    // 13. Summary
    cards.push({
        content: (
            <View style={cardStyles.centered}>
                <Ionicons name="analytics-outline" size={48} color={COLORS.primary} style={{ marginBottom: SPACING.m }} />
                <Text style={cardStyles.sectionTitle}>Full Summary</Text>
                <View style={cardStyles.summaryGrid}>
                    <SummaryRow icon="film" label="Movies" value={stats.totalMovies.toString()} />
                    <SummaryRow icon="tv" label="Episodes" value={stats.totalEpisodes.toString()} />
                    <SummaryRow icon="time" label="Hours" value={stats.totalHoursWatched.toString()} />
                    <SummaryRow icon="flame" label="Best Streak" value={`${stats.longestStreak} days`} />
                    <SummaryRow icon="star" label="Avg Movie Rating" value={stats.avgMovieRating > 0 ? `${stats.avgMovieRating}â˜…` : 'â€”'} />
                    <SummaryRow icon="heart" label="Likes" value={stats.totalLikes.toString()} />
                    <SummaryRow icon="albums" label="Shows" value={stats.uniqueShowsWatched.toString()} />
                    <SummaryRow icon="layers" label="Seasons" value={stats.totalSeasonsStarted.toString()} />
                    {stats.topGenres.length > 0 && <SummaryRow icon="musical-notes" label="Top Genre" value={stats.topGenres[0].genre} />}
                </View>
                <Text style={[cardStyles.swipeHint, { marginTop: SPACING.l }]}>That's a wrap!</Text>
            </View>
        ),
    });

    return cards;
}

const SummaryRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <View style={cardStyles.summaryRow}>
        <Ionicons name={icon as any} size={16} color={COLORS.primary} />
        <Text style={cardStyles.summaryLabel}>{label}</Text>
        <Text style={cardStyles.summaryValue}>{value}</Text>
    </View>
);

// â”€â”€ Styles â”€â”€

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.m,
    },
    loadingText: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 16,
        marginTop: SPACING.s,
    },
    emptyTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 24,
        marginTop: SPACING.m,
    },
    emptySubtitle: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.s,
    },
    closeBtn: {
        marginTop: SPACING.l,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: COLORS.primary,
    },
    closeBtnText: {
        color: COLORS.text.inverse,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
    cardWrapper: {
        flex: 1,
    },
    cardScrollContent: {
        flex: 1,
    },
    cardContentContainer: {
        paddingHorizontal: CARD_PADDING,
        paddingTop: CONFIG.LAYOUT.WRAPPED_CONTENT_PADDING_TOP,
        paddingBottom: CONFIG.LAYOUT.TAB_BAR_FULL_HEIGHT,
    },
    closeButton: {
        position: 'absolute',
        right: SPACING.m,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.overlay.light,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    dotsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.s,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.white.alpha20,
    },
    dotActive: {
        backgroundColor: COLORS.primary,
        width: 18,
    },
    pageCounter: {
        position: 'absolute',
        left: SPACING.m,
        zIndex: 10,
    },
    pageCounterText: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 13,
    },
});

const cardStyles = StyleSheet.create({
    centered: {
        alignItems: 'center',
        gap: SPACING.s,
    },
    heroEmoji: {
        fontSize: 56,
        marginBottom: SPACING.m,
    },
    heroTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 36,
        textAlign: 'center',
        lineHeight: 44,
    },
    heroSubtitle: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 16,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    heroStatsRow: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginTop: SPACING.xl,
    },
    swipeHint: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 14,
        marginTop: SPACING.xl,
    },
    bigNumber: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 72,
        lineHeight: 80,
    },
    bigLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 20,
        marginBottom: SPACING.m,
    },
    funFact: {
        color: COLORS.primary,
        fontFamily: FONTS.body,
        fontSize: 15,
        textAlign: 'center',
        marginBottom: SPACING.l,
        paddingHorizontal: SPACING.m,
        lineHeight: 22,
    },
    infoBox: {
        backgroundColor: COLORS.white.alpha06,
        borderRadius: BORDER_RADIUS.m,
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        marginTop: SPACING.s,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.white.alpha06,
    },
    infoBoxLabel: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: LETTER_SPACING.wider,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    infoBoxValue: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 20,
        textAlign: 'center',
    },
    infoBoxMeta: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 13,
        marginTop: SPACING.xxs,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.m,
    },
    emoji: {
        fontSize: 24,
    },
    sectionTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 22,
    },
    statItem: {
        alignItems: 'center',
        gap: SPACING.xxs,
    },
    statValue: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 28,
    },
    statLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 12,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.l,
        paddingVertical: SPACING.m,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.m,
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.white.alpha06,
    },
    rankNumber: {
        color: COLORS.primary,
        fontFamily: FONTS.display,
        fontSize: 24,
        width: 30,
    },
    rankTextWrap: {
        flex: 1,
        gap: SPACING.xxs,
    },
    rankText: {
        color: COLORS.text.primary,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
    rankSubtext: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 12,
    },
    barChart: {
        gap: SPACING.s,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    barLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 12,
        width: 60,
        textAlign: 'right',
    },
    barTrack: {
        flex: 1,
        height: 16,
        backgroundColor: COLORS.white.alpha06,
        borderRadius: 8,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 8,
        minWidth: 4,
    },
    barValue: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 12,
        width: 30,
    },
    personalityLabel: {
        color: COLORS.text.muted,
        fontFamily: FONTS.mono,
        fontSize: 14,
        letterSpacing: LETTER_SPACING.widest,
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    personalityTitle: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 36,
        textAlign: 'center',
        lineHeight: 44,
    },
    personalityDesc: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: SPACING.m,
        paddingHorizontal: SPACING.m,
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.s,
        marginTop: SPACING.s,
    },
    tagChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: COLORS.white.alpha08,
        borderWidth: 1,
        borderColor: COLORS.white.alpha10,
    },
    tagText: {
        color: COLORS.text.primary,
        fontFamily: FONTS.bodyMedium,
        fontSize: 13,
    },
    summaryGrid: {
        width: '100%',
        marginTop: SPACING.m,
        gap: SPACING.xs,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.white.alpha06,
    },
    summaryLabel: {
        color: COLORS.text.secondary,
        fontFamily: FONTS.body,
        fontSize: 14,
        flex: 1,
    },
    summaryValue: {
        color: COLORS.text.primary,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
});
