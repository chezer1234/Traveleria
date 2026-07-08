import { describe, test, expect } from 'vitest';
import { countryFlag } from '../flag.js';

describe('countryFlag', () => {
  test('renders a normal country as regional-indicator flag emoji', () => {
    expect(countryFlag('GB')).toBe('🇬🇧');
    expect(countryFlag('FR')).toBe('🇫🇷');
  });

  test('is case-insensitive', () => {
    expect(countryFlag('gb')).toBe('🇬🇧');
  });

  test('flies a penguin for Antarctica (issue #59)', () => {
    expect(countryFlag('AQ')).toBe('🐧');
    expect(countryFlag('aq')).toBe('🐧');
  });

  test('returns empty string for missing/invalid codes', () => {
    expect(countryFlag('')).toBe('');
    expect(countryFlag(null)).toBe('');
    expect(countryFlag('X')).toBe('');
  });
});
