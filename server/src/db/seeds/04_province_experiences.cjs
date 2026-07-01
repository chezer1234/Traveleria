/**
 * Seed: province_experiences
 * Tier 0 (issue #46) Phase 1 pilot — real, well-known, verifiable landmarks
 * for California, Texas, Wyoming, Rhode Island, Beijing, and Hong Kong.
 * All experiences within a province are worth equal points (see
 * calculateTier0ProvinceExploration in points.js); the full list is
 * intentionally scoped to the pilot set before expanding to every Tier 0
 * state/province. See docs/features/tier-0-nations.md.
 */

const experiences = [
  // California
  { province_code: 'US-CA', name: 'Golden Gate Bridge' },
  { province_code: 'US-CA', name: 'Alcatraz Island' },
  { province_code: 'US-CA', name: 'Hollywood Walk of Fame' },
  { province_code: 'US-CA', name: 'Yosemite National Park' },
  { province_code: 'US-CA', name: 'Disneyland Park' },
  { province_code: 'US-CA', name: 'Griffith Observatory' },
  { province_code: 'US-CA', name: 'Balboa Park' },
  { province_code: 'US-CA', name: 'Sequoia National Park' },
  // Texas
  { province_code: 'US-TX', name: 'The Alamo' },
  { province_code: 'US-TX', name: 'San Antonio River Walk' },
  { province_code: 'US-TX', name: 'Space Center Houston' },
  { province_code: 'US-TX', name: 'Reunion Tower' },
  { province_code: 'US-TX', name: 'AT&T Stadium' },
  { province_code: 'US-TX', name: 'Texas State Capitol' },
  { province_code: 'US-TX', name: 'Big Bend National Park' },
  { province_code: 'US-TX', name: 'Fort Worth Stockyards' },
  // Wyoming
  { province_code: 'US-WY', name: 'Yellowstone National Park' },
  { province_code: 'US-WY', name: 'Grand Teton National Park' },
  { province_code: 'US-WY', name: 'Devils Tower National Monument' },
  { province_code: 'US-WY', name: 'Wyoming State Capitol' },
  { province_code: 'US-WY', name: 'Fort Laramie National Historic Site' },
  // Rhode Island
  { province_code: 'US-RI', name: 'The Breakers' },
  { province_code: 'US-RI', name: 'Newport Cliff Walk' },
  { province_code: 'US-RI', name: 'Rhode Island State House' },
  { province_code: 'US-RI', name: 'Beavertail Lighthouse' },
  { province_code: 'US-RI', name: 'Roger Williams Park Zoo' },
  // Beijing
  { province_code: 'CN-BJ', name: 'Forbidden City' },
  { province_code: 'CN-BJ', name: 'Great Wall at Badaling' },
  { province_code: 'CN-BJ', name: 'Temple of Heaven' },
  { province_code: 'CN-BJ', name: 'Tiananmen Square' },
  { province_code: 'CN-BJ', name: 'Summer Palace' },
  { province_code: 'CN-BJ', name: "Beijing National Stadium (Bird's Nest)" },
  // Hong Kong (no cities — experiences only, per issue #46)
  { province_code: 'CN-HK', name: 'Victoria Peak' },
  { province_code: 'CN-HK', name: 'Star Ferry Harbour Crossing' },
  { province_code: 'CN-HK', name: 'Tian Tan Buddha' },
  { province_code: 'CN-HK', name: 'Hong Kong Disneyland' },
  { province_code: 'CN-HK', name: 'Ocean Park Hong Kong' },
];

exports.seed = async function (knex) {
  const crypto = require('crypto');

  const existing = await knex('province_experiences').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    console.log('Province experiences already seeded, skipping.');
    return;
  }

  const rows = experiences.map(e => ({ id: crypto.randomUUID(), ...e }));
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    await knex('province_experiences').insert(rows.slice(i, i + batchSize));
  }
  console.log(`Seeded ${rows.length} province experiences.`);
};
