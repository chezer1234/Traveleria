/**
 * Unit tests for the Trophy Cabinet 1.6 evaluator (issue #52). Pure
 * definitions + evaluator, no DB — stats objects are built by hand in the
 * same shape getTrophyStatusLocal returns.
 */
import { describe, it, expect } from 'vitest';
import {
  TROPHIES,
  TIERS,
  LADDERS,
  evaluateTrophies,
  evaluateCabinet,
  ISLAND_NATIONS,
} from '../trophies.js';
import { CONTINENTS } from '../continents.js';

// Minimal country row. Subregion defaults to Western Europe (→ Europe).
function country(code, over = {}) {
  return {
    code,
    name: over.name || code,
    region: 'Europe',
    subregion: 'Western Europe',
    population: 10_000_000,
    annual_tourists: 5_000_000,
    area_km2: 100_000,
    lat: 48,
    lng: 2,
    distanceKm: 500,
    ...over,
  };
}

// A stats object with nothing logged; override per test.
function stats(over = {}) {
  return {
    home: null,
    allCountries: [country('FR'), country('DE'), country('JP', { subregion: 'Eastern Asia' })],
    visited: [],
    subregions: [],
    continents: [],
    experiencesCompleted: 0,
    citiesVisited: 0,
    totalPoints: 0,
    countryPoints: [],
    totalAccounts: 1,
    visitorsByCountry: {},
    ...over,
  };
}

function get(evaluated, id) {
  const t = evaluated.find((x) => x.id === id);
  expect(t, `trophy ${id} exists`).toBeTruthy();
  return t;
}

describe('the cabinet roster', () => {
  it('holds 46 trophies: 7 ladders × 5 tiers + 6 conquests + 5 specials', () => {
    expect(TROPHIES).toHaveLength(7 * 5 + CONTINENTS.length + 5);
  });

  it('has unique ids', () => {
    const ids = TROPHIES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every 1.5 trophy id so earned history survives', () => {
    const ids = new Set(TROPHIES.map((t) => t.id));
    for (const legacy of [
      'first-stamp', 'island-hopper', 'continental', 'regional-scout',
      'regional-ranger', 'regional-legend', 'experience-collector',
      'ten-thousand-km-club', 'hard-mode', 'five-hundred-club',
    ]) {
      expect(ids.has(legacy), `legacy id ${legacy}`).toBe(true);
    }
  });

  it('uses the issue-specified points targets', () => {
    const points = LADDERS.find((l) => l.key === 'points');
    expect(points.targets).toEqual({
      bronze: 100, silver: 500, gold: 1000, diamond: 2000, platinum: 3000,
    });
  });

  it('every ladder climbs strictly in difficulty', () => {
    for (const ladder of LADDERS) {
      for (let i = 1; i < TIERS.length; i++) {
        expect(
          ladder.targets[TIERS[i]],
          `${ladder.key}: ${TIERS[i]} > ${TIERS[i - 1]}`,
        ).toBeGreaterThan(ladder.targets[TIERS[i - 1]]);
      }
    }
  });
});

describe('ladder evaluation', () => {
  it('a fresh account earns nothing and every locked trophy shows progress or detail', () => {
    const evaluated = evaluateTrophies(stats());
    expect(evaluated.filter((t) => t.earned)).toHaveLength(0);
    for (const t of evaluated) {
      expect(typeof t.detail, t.id).toBe('string');
      expect(t.detail.length, t.id).toBeGreaterThan(0);
    }
  });

  it('points rungs unlock in order as points cross thresholds', () => {
    const evaluated = evaluateTrophies(stats({ totalPoints: 1200 }));
    expect(get(evaluated, 'points-bronze').earned).toBe(true);
    expect(get(evaluated, 'five-hundred-club').earned).toBe(true);
    expect(get(evaluated, 'points-gold').earned).toBe(true);
    const diamond = get(evaluated, 'points-diamond');
    expect(diamond.earned).toBe(false);
    expect(diamond.progress).toEqual({ current: 1200, target: 2000 });
  });

  it('countries bronze dates its earnedAt from the fifth visit', () => {
    const visited = ['A', 'B', 'C', 'D', 'E'].map((code, i) =>
      country(code, { visited_at: `2025-0${i + 1}-01` }));
    const evaluated = evaluateTrophies(stats({ visited }));
    const bronze = get(evaluated, 'countries-bronze');
    expect(bronze.earned).toBe(true);
    expect(bronze.earnedAt).toBe('2025-05-01');
  });

  it('cities and experiences ladders read their counters', () => {
    const evaluated = evaluateTrophies(stats({ citiesVisited: 30, experiencesCompleted: 5 }));
    expect(get(evaluated, 'cities-gold').earned).toBe(true);
    expect(get(evaluated, 'cities-diamond').earned).toBe(false);
    expect(get(evaluated, 'experience-collector').earned).toBe(true);
    expect(get(evaluated, 'experiences-gold').earned).toBe(false);
  });

  it('island rungs count only island nations', () => {
    const visited = [
      country('FR'),
      country('JP', { subregion: 'Eastern Asia', visited_at: '2024-06-01' }),
      country('IS', { subregion: 'Northern Europe', visited_at: '2024-08-01' }),
      country('MT', { subregion: 'Southern Europe', visited_at: '2024-09-01' }),
    ];
    expect(ISLAND_NATIONS.has('JP')).toBe(true);
    const evaluated = evaluateTrophies(stats({ visited }));
    const silver = get(evaluated, 'islands-silver'); // target 3: JP, IS, MT
    expect(silver.earned).toBe(true);
    expect(silver.earnedAt).toBe('2024-09-01');
    expect(get(evaluated, 'islands-gold').progress).toEqual({ current: 3, target: 5 });
  });

  it('continents platinum needs all six', () => {
    const evaluated = evaluateTrophies(stats({
      continents: ['Europe', 'Asia', 'Africa', 'North America', 'South America'],
    }));
    expect(get(evaluated, 'continental').earned).toBe(true); // diamond, 5
    const plat = get(evaluated, 'continents-platinum');
    expect(plat.earned).toBe(false);
    expect(plat.progress).toEqual({ current: 5, target: 6 });
  });
});

describe('continental conquests', () => {
  it('completing every country in a continent earns its platinum laurel', () => {
    const all = [
      country('FR'), country('DE'),
      country('JP', { subregion: 'Eastern Asia' }),
    ];
    const visited = [
      country('FR', { visited_at: '2024-01-01' }),
      country('DE', { visited_at: '2025-03-01' }),
    ];
    const evaluated = evaluateTrophies(stats({ allCountries: all, visited }));
    const europe = get(evaluated, 'complete-europe');
    expect(europe.earned).toBe(true);
    expect(europe.earnedAt).toBe('2025-03-01'); // the visit that completed it
    expect(europe.medal).toBe('platinum');
    const asia = get(evaluated, 'complete-asia');
    expect(asia.earned).toBe(false);
    expect(asia.progress).toEqual({ current: 0, target: 1 });
    expect(asia.detail).toContain('JP');
  });

  it('there is one conquest per continent, all platinum', () => {
    const conquests = TROPHIES.filter((t) => t.group === 'conquest');
    expect(conquests).toHaveLength(CONTINENTS.length);
    expect(conquests.every((t) => t.medal === 'platinum')).toBe(true);
  });
});

describe('special honours', () => {
  it('Century Nation needs strictly over 100 points from one nation', () => {
    const at100 = evaluateTrophies(stats({
      countryPoints: [{ code: 'JP', name: 'Japan', points: 100 }],
    }));
    const locked = get(at100, 'century-nation');
    expect(locked.earned).toBe(false);
    expect(locked.progress).toEqual({ current: 100, target: 100 });

    const over = evaluateTrophies(stats({
      countryPoints: [
        { code: 'FR', name: 'France', points: 40 },
        { code: 'JP', name: 'Japan', points: 130.4 },
      ],
    }));
    const earned = get(over, 'century-nation');
    expect(earned.earned).toBe(true);
    expect(earned.detail).toContain('Japan');
  });

  it('Off the Map fires when under 5% of accounts have visited', () => {
    const evaluated = evaluateTrophies(stats({
      visited: [country('TM', { name: 'Turkmenistan', visited_at: '2025-02-01' })],
      totalAccounts: 100,
      visitorsByCountry: { TM: 4 },
    }));
    const t = get(evaluated, 'off-the-map');
    expect(t.earned).toBe(true);
    expect(t.detail).toContain('4.0%');
  });

  it('Off the Map also fires for the sole visitor while the userbase is small', () => {
    const evaluated = evaluateTrophies(stats({
      visited: [country('FR')],
      totalAccounts: 3,
      visitorsByCountry: { FR: 1 },
    }));
    expect(get(evaluated, 'off-the-map').earned).toBe(true);
    expect(get(evaluated, 'off-the-map').detail).toContain('only one');
  });

  it('Off the Map stays locked on well-trodden logs', () => {
    const evaluated = evaluateTrophies(stats({
      visited: [country('FR')],
      totalAccounts: 10,
      visitorsByCountry: { FR: 8 },
    }));
    expect(get(evaluated, 'off-the-map').earned).toBe(false);
  });

  it('First Stamp and Hard Mode still behave as in 1.5', () => {
    const evaluated = evaluateTrophies(stats({
      visited: [country('TM', {
        name: 'Turkmenistan',
        population: 6_000_000,
        annual_tourists: 0,
        visited_at: '2024-04-01',
      })],
    }));
    const stamp = get(evaluated, 'first-stamp');
    expect(stamp.earned).toBe(true);
    expect(stamp.earnedAt).toBe('2024-04-01');
    expect(get(evaluated, 'hard-mode').earned).toBe(true);
  });
});

describe('evaluateCabinet', () => {
  it('groups ladders in tier order with conquests and specials aside', () => {
    const cabinet = evaluateCabinet(stats());
    expect(cabinet.ladders).toHaveLength(7);
    for (const ladder of cabinet.ladders) {
      expect(ladder.trophies.map((t) => t.medal)).toEqual(TIERS);
    }
    expect(cabinet.conquests).toHaveLength(CONTINENTS.length);
    expect(cabinet.specials).toHaveLength(5);
    expect(cabinet.all).toHaveLength(TROPHIES.length);
  });
});
