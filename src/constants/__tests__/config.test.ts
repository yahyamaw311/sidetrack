import { getWrappedUnlockDate, CONFIG } from '../config';

describe('getWrappedUnlockDate', () => {
  it('returns December 15 for any given year', () => {
    const date = getWrappedUnlockDate(2025);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('works for different years', () => {
    const d2024 = getWrappedUnlockDate(2024);
    const d2026 = getWrappedUnlockDate(2026);

    expect(d2024.getFullYear()).toBe(2024);
    expect(d2026.getFullYear()).toBe(2026);
    expect(d2024.getMonth()).toBe(CONFIG.WRAPPED_UNLOCK_MONTH);
    expect(d2026.getDate()).toBe(CONFIG.WRAPPED_UNLOCK_DAY);
  });
});
