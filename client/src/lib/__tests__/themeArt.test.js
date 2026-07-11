import { describe, it, expect } from 'vitest';
import {
  hashCode,
  stampDesign,
  barcodeBars,
  STAMP_SHAPES,
  STAMP_INKS,
  STAMP_WORDS,
  STAMP_SUBS,
} from '../themeArt';

// A representative spread of real ISO codes — the countries Charlie actually
// browses, including neighbours that must not all look the same.
const SAMPLE_CODES = [
  'JP', 'FR', 'DE', 'ES', 'IT', 'GB', 'US', 'CA', 'MX', 'BR',
  'AR', 'CL', 'AU', 'NZ', 'CN', 'IN', 'TH', 'VN', 'LA', 'KH',
  'MN', 'KZ', 'TM', 'MA', 'EG', 'ZA', 'KE', 'TZ', 'NG', 'GH',
  'BE', 'NL', 'LU', 'CH', 'AT', 'PL', 'CZ', 'SK', 'HU', 'RO',
  'PT', 'GR', 'TR', 'IS', 'NO', 'SE', 'FI', 'DK', 'IE', 'PG',
];

describe('hashCode', () => {
  it('is deterministic and non-negative', () => {
    expect(hashCode('JP')).toBe(hashCode('JP'));
    for (const code of SAMPLE_CODES) {
      expect(hashCode(code)).toBeGreaterThanOrEqual(0);
    }
  });

  it('distinguishes all two-letter codes', () => {
    const seen = new Set();
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        seen.add(hashCode(String.fromCharCode(a, b)));
      }
    }
    expect(seen.size).toBe(26 * 26);
  });
});

describe('stampDesign', () => {
  it('is deterministic — same country, same stamp, always', () => {
    expect(stampDesign('JP')).toEqual(stampDesign('JP'));
    expect(stampDesign('fr')).toEqual(stampDesign('FR')); // case-insensitive
  });

  it('always yields valid design fields', () => {
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const d = stampDesign(String.fromCharCode(a, b));
        expect(STAMP_SHAPES).toContain(d.shape);
        expect(STAMP_INKS).toContain(d.ink);
        expect(STAMP_WORDS).toContain(d.word);
        expect(STAMP_SUBS).toContain(d.sub);
        expect(d.rotation).toBeGreaterThanOrEqual(-6);
        expect(d.rotation).toBeLessThanOrEqual(6);
        expect(d.rotation).not.toBe(0); // hand-stamped, never dead straight
        expect(d.serial).toMatch(/^\d{4}$/);
      }
    }
  });

  it('gives countries varied stamps — at least 20 distinct shape+ink designs in use', () => {
    const combos = new Set(SAMPLE_CODES.map((c) => {
      const d = stampDesign(c);
      return `${d.shape}/${d.ink.id}`;
    }));
    expect(combos.size).toBeGreaterThanOrEqual(20);
  });

  it('uses the whole design vocabulary across all codes', () => {
    const shapes = new Set();
    const inks = new Set();
    const words = new Set();
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const d = stampDesign(String.fromCharCode(a, b));
        shapes.add(d.shape);
        inks.add(d.ink.id);
        words.add(d.word);
      }
    }
    expect(shapes.size).toBe(STAMP_SHAPES.length);
    expect(inks.size).toBe(STAMP_INKS.length);
    expect(words.size).toBe(STAMP_WORDS.length);
  });
});

describe('barcodeBars', () => {
  it('is deterministic per country', () => {
    expect(barcodeBars('JP')).toEqual(barcodeBars('JP'));
    expect(barcodeBars('jp')).toEqual(barcodeBars('JP'));
  });

  it('differs between countries', () => {
    expect(barcodeBars('JP')).not.toEqual(barcodeBars('FR'));
  });

  it('produces a plausible barcode: in-bounds, non-overlapping, dense enough', () => {
    for (const code of SAMPLE_CODES) {
      const bars = barcodeBars(code);
      expect(bars.length).toBeGreaterThanOrEqual(15);
      let prevEnd = -1;
      for (const { y, h } of bars) {
        expect(y).toBeGreaterThan(prevEnd); // gap before each bar
        expect(h).toBeGreaterThanOrEqual(2);
        expect(y + h).toBeLessThanOrEqual(200);
        prevEnd = y + h;
      }
    }
  });
});
