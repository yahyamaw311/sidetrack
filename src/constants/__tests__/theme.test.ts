import { getRatingColor, COLORS } from '../theme';

describe('getRatingColor', () => {
  it('returns great color for rating >= 8', () => {
    expect(getRatingColor(8)).toBe(COLORS.rating.great);
    expect(getRatingColor(9.5)).toBe(COLORS.rating.great);
    expect(getRatingColor(10)).toBe(COLORS.rating.great);
  });

  it('returns good color for rating >= 6.5 and < 8', () => {
    expect(getRatingColor(6.5)).toBe(COLORS.rating.good);
    expect(getRatingColor(7)).toBe(COLORS.rating.good);
    expect(getRatingColor(7.9)).toBe(COLORS.rating.good);
  });

  it('returns mid color for rating >= 5 and < 6.5', () => {
    expect(getRatingColor(5)).toBe(COLORS.rating.mid);
    expect(getRatingColor(6)).toBe(COLORS.rating.mid);
    expect(getRatingColor(6.4)).toBe(COLORS.rating.mid);
  });

  it('returns low color for rating < 5', () => {
    expect(getRatingColor(0)).toBe(COLORS.rating.low);
    expect(getRatingColor(2)).toBe(COLORS.rating.low);
    expect(getRatingColor(4.9)).toBe(COLORS.rating.low);
  });
});
