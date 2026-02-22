import { StorageProvider } from './StorageProvider';
import { WatchedMovie, WatchedEpisode, FavoriteMovie } from '../types';

// ── Types ──

export interface WrappedStats {
    // Volume
    totalMovies: number;
    totalEpisodes: number;
    totalHoursWatched: number;
    longestMovie: { title: string; runtime: number } | null;
    busiestDay: { date: string; count: number } | null;
    busiestMonth: { month: string; count: number } | null;
    avgPerWeek: number;
    // Ratings
    avgMovieRating: number;
    avgEpisodeRating: number;
    ratingDistribution: Record<string, number>; // "0.5" -> count, "1" -> count, etc.
    highestRatedMovies: { title: string; rating: number; posterPath: string | null }[];
    lowestRatedMovies: { title: string; rating: number; posterPath: string | null }[];
    highestRatedShows: { name: string; avgRating: number; posterPath: string | null; episodeCount: number }[];
    // Genres
    topGenres: { genre: string; count: number }[];
    genreByAvgRating: { genre: string; avgRating: number }[];
    // Timeline
    longestStreak: number;
    busiestDayOfWeek: { day: string; count: number } | null;
    firstLog: { title: string; date: string } | null;
    lastLog: { title: string; date: string } | null;
    monthlyActivity: Record<string, number>; // "2026-01" -> count
    // TV-specific
    uniqueShowsWatched: number;
    showsWithMostEpisodes: { name: string; count: number }[];
    fastestBinge: { name: string; days: number; episodes: number } | null;
    totalSeasonsCompleted: number;
    // Movie-specific
    decadeBreakdown: Record<string, number>; // "2020s" -> count
    oldestMovie: { title: string; year: number } | null;
    newestMovie: { title: string; year: number } | null;
    avgMovieRuntime: number;
    rewatchCount: number;
    // Social / engagement
    totalLikes: number;
    totalFavorites: number;
    likeRatio: number;
    totalReviews: number;
    avgReviewLength: number;
    topTags: { tag: string; count: number }[];
    // Personality
    personalityType: { label: string; emoji: string; description: string };
    // Fun facts
    funTimeEquivalent: string;
    totalEntries: number;
}

// ── Helpers ──

const getDayOfWeek = (dateStr: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(dateStr).getDay()];
};

const getMonthKey = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthName = (key: string): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [year, month] = key.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
};

const getDateKey = (dateStr: string): string => {
    return new Date(dateStr).toISOString().split('T')[0];
};

const getDecade = (year: number): string => {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
};

const computeStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    const uniqueDays = [...new Set(dates.map(d => getDateKey(d)))].sort();
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diffMs = curr.getTime() - prev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    return maxStreak;
};

const determinePersonality = (stats: Partial<WrappedStats>, movies: WatchedMovie[], episodes: WatchedEpisode[]): { label: string; emoji: string; description: string } => {
    const totalEntries = movies.length + episodes.length;
    if (totalEntries === 0) return { label: 'The Newcomer', emoji: '🌱', description: "You're just getting started! Log some watches and come back." };

    const avgRating = movies.length > 0 ? movies.reduce((s, m) => s + m.rating, 0) / movies.length : 0;
    const epAvg = episodes.length > 0 ? episodes.reduce((s, e) => s + e.rating, 0) / episodes.length : 0;
    const combinedAvg = (avgRating + epAvg) / (movies.length > 0 && episodes.length > 0 ? 2 : 1);
    const rewatches = movies.filter(m => m.watchedDate).length; // approximate
    const reviewCount = [...movies.filter(m => (m as any).review), ...episodes.filter(e => e.review)].length;

    // Check for patterns
    if (episodes.length > movies.length * 3) {
        return { label: 'The Binger', emoji: '📺', description: "You live for the next episode. TV shows are your comfort zone and you can't hit 'Next' fast enough." };
    }
    if (combinedAvg < 2.5 && totalEntries > 10) {
        return { label: 'The Critic', emoji: '🎭', description: "Not easily impressed. You have high standards and aren't afraid to rate honestly." };
    }
    if (combinedAvg > 4.0 && totalEntries > 10) {
        return { label: 'The Enthusiast', emoji: '🤩', description: "You love almost everything you watch! Your positive energy is contagious." };
    }
    if (stats.topGenres && stats.topGenres.length > 5) {
        return { label: 'The Explorer', emoji: '🧭', description: "Always diving into new genres. Your taste is eclectic and your watchlist is diverse." };
    }
    if (reviewCount > totalEntries * 0.3) {
        return { label: 'The Reviewer', emoji: '✍️', description: "You don't just watch — you reflect. Your reviews help you process what you've seen." };
    }
    if ((stats.totalHoursWatched || 0) > 200) {
        return { label: 'The Marathon Runner', emoji: '🏃', description: "Hundreds of hours watched. You've turned watching into an endurance sport." };
    }
    if (movies.length > episodes.length) {
        return { label: 'The Cinephile', emoji: '🎬', description: "Movies are your thing. You appreciate the art of a complete story in one sitting." };
    }
    return { label: 'The Balanced Viewer', emoji: '⚖️', description: "A healthy mix of movies and shows. You enjoy the best of both worlds." };
};

const getFunTimeEquivalent = (hours: number): string => {
    if (hours < 1) return "barely a bathroom break";
    if (hours < 10) return `${Math.round(hours)} hours — about a road trip to the next state`;
    if (hours < 24) return `${Math.round(hours)} hours — almost a full day without sleep`;
    const days = Math.round(hours / 24);
    if (days === 1) return "a full 24-hour day of non-stop watching";
    if (days < 7) return `${days} full days — a vacation's worth of content`;
    if (days < 30) return `${days} days — that's ${Math.round(hours / 12)} flights from New York to Tokyo`;
    const months = Math.round(days / 30);
    return `${days} days (${months} months!) — you could've driven around the world ${Math.round(hours / 480)} times`;
};

// ── Main computation ──

export const StatsService = {
    computeWrapped: async (): Promise<WrappedStats> => {
        const movies = await StorageProvider.getWatchedMovies();
        const episodes = await StorageProvider.getAllWatchedEpisodes();
        const favoriteMovies = await StorageProvider.getAllFavoriteMovies();
        const favoriteEpisodes = await StorageProvider.getAllFavorites();

        const allDates = [
            ...movies.map(m => m.watchedDate),
            ...episodes.map(e => e.watchedDate),
        ].filter(Boolean);

        // ── Volume ──
        const totalMovies = movies.length;
        const totalEpisodes = episodes.length;
        const movieHours = movies.reduce((sum, m) => sum + (m.runtime || 0), 0) / 60;
        const episodeHours = episodes.reduce((sum, e) => sum + (e.runtime || 0), 0) / 60;
        const totalHoursWatched = Math.round((movieHours + episodeHours) * 10) / 10;

        const longestMovie = movies.length > 0
            ? movies.reduce((prev, curr) => (curr.runtime > prev.runtime ? curr : prev))
            : null;

        // Busiest day
        const dayCounts: Record<string, number> = {};
        allDates.forEach(d => { const key = getDateKey(d); dayCounts[key] = (dayCounts[key] || 0) + 1; });
        const busiestDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        const busiestDay = busiestDayEntry ? { date: busiestDayEntry[0], count: busiestDayEntry[1] } : null;

        // Busiest month
        const monthCounts: Record<string, number> = {};
        allDates.forEach(d => { const key = getMonthKey(d); monthCounts[key] = (monthCounts[key] || 0) + 1; });
        const busiestMonthEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
        const busiestMonth = busiestMonthEntry ? { month: getMonthName(busiestMonthEntry[0]), count: busiestMonthEntry[1] } : null;

        // Avg per week
        const sortedDates = allDates.sort();
        let avgPerWeek = 0;
        if (sortedDates.length >= 2) {
            const first = new Date(sortedDates[0]);
            const last = new Date(sortedDates[sortedDates.length - 1]);
            const weeks = Math.max(1, (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 7));
            avgPerWeek = Math.round((allDates.length / weeks) * 10) / 10;
        }

        // ── Ratings ──
        const movieRatings = movies.filter(m => m.rating > 0).map(m => m.rating);
        const avgMovieRating = movieRatings.length > 0 ? Math.round((movieRatings.reduce((s, r) => s + r, 0) / movieRatings.length) * 10) / 10 : 0;

        const epRatings = episodes.filter(e => e.rating > 0).map(e => e.rating);
        const avgEpisodeRating = epRatings.length > 0 ? Math.round((epRatings.reduce((s, r) => s + r, 0) / epRatings.length) * 10) / 10 : 0;

        // Rating distribution (all ratings combined, movie ratings 1-10 normalized to 0.5-5)
        const ratingDistribution: Record<string, number> = {};
        // Episode ratings are 0-5 scale, movie ratings are 1-10, normalize movies to 5-star
        movies.forEach(m => {
            if (m.rating > 0) {
                const normalized = Math.round((m.rating / 2) * 2) / 2; // round to nearest 0.5
                const key = normalized.toString();
                ratingDistribution[key] = (ratingDistribution[key] || 0) + 1;
            }
        });
        episodes.forEach(e => {
            if (e.rating > 0) {
                const key = e.rating.toString();
                ratingDistribution[key] = (ratingDistribution[key] || 0) + 1;
            }
        });

        // Highest/lowest rated movies
        const ratedMovies = movies.filter(m => m.rating > 0).sort((a, b) => b.rating - a.rating);
        const highestRatedMovies = ratedMovies.slice(0, 5).map(m => ({
            title: m.title, rating: m.rating, posterPath: m.posterPath,
        }));
        const lowestRatedMovies = ratedMovies.slice(-5).reverse().map(m => ({
            title: m.title, rating: m.rating, posterPath: m.posterPath,
        }));

        // Highest-rated shows (by average episode rating)
        const showEpMap: Record<number, { name: string; ratings: number[]; posterPath: string | null }> = {};
        episodes.forEach(e => {
            if (!showEpMap[e.seriesId]) {
                showEpMap[e.seriesId] = { name: e.seriesName || `Show ${e.seriesId}`, ratings: [], posterPath: e.stillPath || null };
            }
            if (e.rating > 0) showEpMap[e.seriesId].ratings.push(e.rating);
        });
        const highestRatedShows = Object.entries(showEpMap)
            .filter(([, v]) => v.ratings.length >= 1)
            .map(([, v]) => ({
                name: v.name,
                avgRating: Math.round((v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length) * 10) / 10,
                posterPath: v.posterPath,
                episodeCount: v.ratings.length,
            }))
            .sort((a, b) => b.avgRating - a.avgRating)
            .slice(0, 5);

        // ── Genres ──
        const genreCountMap: Record<string, number> = {};
        const genreRatingMap: Record<string, number[]> = {};
        movies.forEach(m => {
            (m.genres || []).forEach(g => {
                genreCountMap[g] = (genreCountMap[g] || 0) + 1;
                if (m.rating > 0) {
                    if (!genreRatingMap[g]) genreRatingMap[g] = [];
                    genreRatingMap[g].push(m.rating / 2); // normalize to 5-star
                }
            });
        });
        episodes.forEach(e => {
            (e.genres || []).forEach(g => {
                genreCountMap[g] = (genreCountMap[g] || 0) + 1;
                if (e.rating > 0) {
                    if (!genreRatingMap[g]) genreRatingMap[g] = [];
                    genreRatingMap[g].push(e.rating);
                }
            });
        });
        const topGenres = Object.entries(genreCountMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([genre, count]) => ({ genre, count }));

        const genreByAvgRating = Object.entries(genreRatingMap)
            .filter(([, ratings]) => ratings.length >= 2)
            .map(([genre, ratings]) => ({
                genre,
                avgRating: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
            }))
            .sort((a, b) => b.avgRating - a.avgRating);

        // ── Timeline ──
        const longestStreak = computeStreak(allDates);

        const dayOfWeekCounts: Record<string, number> = {};
        allDates.forEach(d => {
            const day = getDayOfWeek(d);
            dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
        });
        const busiestDowEntry = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
        const busiestDayOfWeek = busiestDowEntry ? { day: busiestDowEntry[0], count: busiestDowEntry[1] } : null;

        // First and last logs
        const allEntries = [
            ...movies.map(m => ({ title: m.title, date: m.watchedDate })),
            ...episodes.map(e => ({ title: `${e.seriesName} S${e.seasonNumber}E${e.episodeNumber}`, date: e.watchedDate })),
        ].filter(e => e.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstLog = allEntries.length > 0 ? allEntries[0] : null;
        const lastLog = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;

        // Monthly activity heatmap
        const monthlyActivity: Record<string, number> = {};
        allDates.forEach(d => {
            const key = getMonthKey(d);
            monthlyActivity[key] = (monthlyActivity[key] || 0) + 1;
        });

        // ── TV-specific ──
        const showCounts: Record<number, { name: string; count: number; firstDate: string; lastDate: string }> = {};
        episodes.forEach(e => {
            if (!showCounts[e.seriesId]) {
                showCounts[e.seriesId] = { name: e.seriesName || `Show ${e.seriesId}`, count: 0, firstDate: e.watchedDate, lastDate: e.watchedDate };
            }
            showCounts[e.seriesId].count++;
            if (new Date(e.watchedDate) < new Date(showCounts[e.seriesId].firstDate)) showCounts[e.seriesId].firstDate = e.watchedDate;
            if (new Date(e.watchedDate) > new Date(showCounts[e.seriesId].lastDate)) showCounts[e.seriesId].lastDate = e.watchedDate;
        });

        const uniqueShowsWatched = Object.keys(showCounts).length;
        const showsWithMostEpisodes = Object.values(showCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(s => ({ name: s.name, count: s.count }));

        // Fastest binge (show with most episodes in fewest days)
        let fastestBinge: { name: string; days: number; episodes: number } | null = null;
        Object.values(showCounts).forEach(show => {
            if (show.count >= 3) {
                const days = Math.max(1, Math.ceil((new Date(show.lastDate).getTime() - new Date(show.firstDate).getTime()) / (1000 * 60 * 60 * 24)));
                if (!fastestBinge || (show.count / days) > (fastestBinge.episodes / fastestBinge.days)) {
                    fastestBinge = { name: show.name, days, episodes: show.count };
                }
            }
        });

        // Total completed seasons
        const seasonSet = new Set<string>();
        episodes.forEach(e => seasonSet.add(`${e.seriesId}-S${e.seasonNumber}`));
        const totalSeasonsCompleted = seasonSet.size;

        // ── Movie-specific ──
        const decadeBreakdown: Record<string, number> = {};
        let oldestMovie: { title: string; year: number } | null = null;
        let newestMovie: { title: string; year: number } | null = null;
        movies.forEach(m => {
            if (m.releaseDate) {
                const year = parseInt(m.releaseDate.split('-')[0]);
                if (!isNaN(year)) {
                    const decade = getDecade(year);
                    decadeBreakdown[decade] = (decadeBreakdown[decade] || 0) + 1;
                    if (!oldestMovie || year < oldestMovie.year) oldestMovie = { title: m.title, year };
                    if (!newestMovie || year > newestMovie.year) newestMovie = { title: m.title, year };
                }
            }
        });

        const movieRuntimes = movies.filter(m => m.runtime > 0).map(m => m.runtime);
        const avgMovieRuntime = movieRuntimes.length > 0 ? Math.round(movieRuntimes.reduce((s, r) => s + r, 0) / movieRuntimes.length) : 0;

        // Rewatch detection: same movieId appearing multiple times
        const movieIdCounts: Record<number, number> = {};
        movies.forEach(m => { movieIdCounts[m.movieId] = (movieIdCounts[m.movieId] || 0) + 1; });
        const rewatchCount = Object.values(movieIdCounts).filter(c => c > 1).reduce((sum, c) => sum + c - 1, 0);

        // ── Social / engagement ──
        const totalLikes = episodes.filter(e => e.liked).length;
        const totalFavorites = favoriteMovies.length + favoriteEpisodes.length;
        const totalEntries = totalMovies + totalEpisodes;
        const likeRatio = totalEntries > 0 ? Math.round((totalLikes / totalEntries) * 100) : 0;

        const allReviews = episodes.filter(e => e.review && e.review.trim().length > 0);
        const totalReviews = allReviews.length;
        const avgReviewLength = totalReviews > 0 ? Math.round(allReviews.reduce((s, e) => s + (e.review?.length || 0), 0) / totalReviews) : 0;

        const tagCountMap: Record<string, number> = {};
        episodes.forEach(e => {
            (e.tags || []).forEach(t => { tagCountMap[t] = (tagCountMap[t] || 0) + 1; });
        });
        const topTags = Object.entries(tagCountMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

        // ── Build partial stats for personality ──
        const partialStats: Partial<WrappedStats> = { topGenres, totalHoursWatched };
        const personalityType = determinePersonality(partialStats, movies, episodes);

        const funTimeEquivalent = getFunTimeEquivalent(totalHoursWatched);

        return {
            totalMovies, totalEpisodes, totalHoursWatched,
            longestMovie: longestMovie ? { title: longestMovie.title, runtime: longestMovie.runtime } : null,
            busiestDay, busiestMonth, avgPerWeek,
            avgMovieRating, avgEpisodeRating, ratingDistribution,
            highestRatedMovies, lowestRatedMovies, highestRatedShows,
            topGenres, genreByAvgRating,
            longestStreak, busiestDayOfWeek, firstLog, lastLog, monthlyActivity,
            uniqueShowsWatched, showsWithMostEpisodes, fastestBinge, totalSeasonsCompleted,
            decadeBreakdown, oldestMovie, newestMovie, avgMovieRuntime, rewatchCount,
            totalLikes, totalFavorites, likeRatio, totalReviews, avgReviewLength, topTags,
            personalityType, funTimeEquivalent, totalEntries,
        };
    },
};
