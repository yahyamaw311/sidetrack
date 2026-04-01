// Mock ErrorNotifier to prevent @expo/vector-icons ESM crash
jest.mock('../../contexts/ErrorNotifier', () => ({
  notifyErrorGlobal: jest.fn(),
}));

import { computeStreak, getDecade, getFunTimeEquivalent, determinePersonality } from '../StatsService';
import { WatchedMovie, WatchedEpisode } from '../../types';

// ── computeStreak ──

describe('computeStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('returns 1 for a single date', () => {
    expect(computeStreak(['2025-01-15'])).toBe(1);
  });

  it('returns correct streak for consecutive days', () => {
    expect(computeStreak([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
      '2025-01-04',
    ])).toBe(4);
  });

  it('returns 1 when all dates are non-consecutive', () => {
    expect(computeStreak([
      '2025-01-01',
      '2025-01-05',
      '2025-01-10',
    ])).toBe(1);
  });

  it('finds the longest streak in mixed data', () => {
    expect(computeStreak([
      '2025-01-01',
      '2025-01-02',
      '2025-01-10',
      '2025-01-11',
      '2025-01-12',
    ])).toBe(3);
  });

  it('handles duplicate dates', () => {
    expect(computeStreak([
      '2025-02-01',
      '2025-02-01',
      '2025-02-02',
    ])).toBe(2);
  });
});

// ── getDecade ──

describe('getDecade', () => {
  it('maps 1999 → 1990s', () => {
    expect(getDecade(1999)).toBe('1990s');
  });

  it('maps 2000 → 2000s', () => {
    expect(getDecade(2000)).toBe('2000s');
  });

  it('maps 2024 → 2020s', () => {
    expect(getDecade(2024)).toBe('2020s');
  });

  it('maps 1980 → 1980s', () => {
    expect(getDecade(1980)).toBe('1980s');
  });
});

// ── getFunTimeEquivalent ──

describe('getFunTimeEquivalent', () => {
  it('returns bathroom break for <1 hour', () => {
    expect(getFunTimeEquivalent(0.5)).toContain('barely a bathroom break');
  });

  it('returns road trip for 1-10 hours', () => {
    expect(getFunTimeEquivalent(5)).toContain('road trip');
  });

  it('returns full day for hours around 24', () => {
    expect(getFunTimeEquivalent(24)).toContain('full 24-hour day');
  });

  it('returns vacation for ~5 days', () => {
    expect(getFunTimeEquivalent(120)).toContain('vacation');
  });

  it('returns months for large values', () => {
    expect(getFunTimeEquivalent(1000)).toContain('months');
  });
});

// ── determinePersonality ──

describe('determinePersonality', () => {
  const makeMovie = (overrides: Partial<WatchedMovie> = {}): WatchedMovie => ({
    movieId: 1, title: 'M', posterPath: null, backdropPath: null,
    rating: 3, watchedDate: '2025-01-01', runtime: 120,
    releaseDate: '2024-01-01', genres: [], overview: '',
    ...overrides,
  });

  const makeEpisode = (overrides: Partial<WatchedEpisode> = {}): WatchedEpisode => ({
    episodeId: 1, seriesId: 1, seasonNumber: 1, episodeNumber: 1,
    rating: 3, watchedDate: '2025-01-01',
    ...overrides,
  });

  it('returns Newcomer for empty data', () => {
    const result = determinePersonality({}, [], []);
    expect(result.label).toBe('The Newcomer');
  });

  it('returns The Binger when episodes >> movies', () => {
    const movies = [makeMovie()];
    const episodes = Array.from({ length: 10 }, (_, i) => makeEpisode({ episodeId: i }));
    const result = determinePersonality({}, movies, episodes);
    expect(result.label).toBe('The Binger');
  });

  it('returns The Critic for low average ratings', () => {
    const movies = Array.from({ length: 15 }, (_, i) =>
      makeMovie({ movieId: i, rating: 1.5 }),
    );
    const result = determinePersonality({}, movies, []);
    expect(result.label).toBe('The Critic');
  });

  it('returns The Enthusiast for high average ratings', () => {
    const movies = Array.from({ length: 15 }, (_, i) =>
      makeMovie({ movieId: i, rating: 4.5 }),
    );
    const result = determinePersonality({}, movies, []);
    expect(result.label).toBe('The Enthusiast');
  });

  it('returns The Cinephile when movies > episodes', () => {
    const movies = Array.from({ length: 5 }, (_, i) =>
      makeMovie({ movieId: i, rating: 3 }),
    );
    const episodes = [makeEpisode()];
    const result = determinePersonality({}, movies, episodes);
    expect(result.label).toBe('The Cinephile');
  });
});
