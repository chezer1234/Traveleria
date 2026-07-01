/**
 * Data migration for Tier 0 Nations (issue #46). Backfills existing databases
 * that already had US/China provinces + cities seeded before this feature
 * existed. See docs/features/tier-0-nations.md.
 *
 * - Sets `subregion` on every US/China province (Census Bureau's 4 regions;
 *   China's 4 official economic zones). Hong Kong/Macau are excluded — they
 *   sit outside the zone system and outside the sub-region bonus.
 * - Backfills `province_code` + `city_type: 'major'` on the cities that
 *   already existed prior to this migration.
 * - Adds the "additional" cities needed so Wyoming and Rhode Island (which
 *   had zero pre-existing major cities) reach the 4-city minimum.
 * - Beijing is a direct-administered municipality, not a province containing
 *   separate cities, so its "additional" cities are real, well-known
 *   districts (Chaoyang, Haidian, Fengtai) rather than distinct municipalities.
 * - Inserts the Phase 1 pilot `province_experiences`: California, Texas,
 *   Wyoming, Rhode Island, Beijing, Hong Kong.
 */

const US_SUBREGIONS = {
  // Northeast
  'US-CT': 'Northeast', 'US-ME': 'Northeast', 'US-MA': 'Northeast', 'US-NH': 'Northeast',
  'US-RI': 'Northeast', 'US-VT': 'Northeast', 'US-NJ': 'Northeast', 'US-NY': 'Northeast',
  'US-PA': 'Northeast',
  // Midwest
  'US-IL': 'Midwest', 'US-IN': 'Midwest', 'US-MI': 'Midwest', 'US-OH': 'Midwest',
  'US-WI': 'Midwest', 'US-IA': 'Midwest', 'US-KS': 'Midwest', 'US-MN': 'Midwest',
  'US-MO': 'Midwest', 'US-NE': 'Midwest', 'US-ND': 'Midwest', 'US-SD': 'Midwest',
  // South
  'US-DE': 'South', 'US-FL': 'South', 'US-GA': 'South', 'US-MD': 'South',
  'US-NC': 'South', 'US-SC': 'South', 'US-VA': 'South', 'US-DC': 'South',
  'US-WV': 'South', 'US-AL': 'South', 'US-KY': 'South', 'US-MS': 'South',
  'US-TN': 'South', 'US-AR': 'South', 'US-LA': 'South', 'US-OK': 'South',
  'US-TX': 'South',
  // West
  'US-AZ': 'West', 'US-CO': 'West', 'US-ID': 'West', 'US-MT': 'West',
  'US-NV': 'West', 'US-NM': 'West', 'US-UT': 'West', 'US-WY': 'West',
  'US-AK': 'West', 'US-CA': 'West', 'US-HI': 'West', 'US-OR': 'West',
  'US-WA': 'West',
};

const CN_ZONES = {
  // Eastern
  'CN-BJ': 'Eastern', 'CN-TJ': 'Eastern', 'CN-HE': 'Eastern', 'CN-SH': 'Eastern',
  'CN-JS': 'Eastern', 'CN-ZJ': 'Eastern', 'CN-FJ': 'Eastern', 'CN-SD': 'Eastern',
  'CN-GD': 'Eastern', 'CN-HI': 'Eastern',
  // Central
  'CN-SX': 'Central', 'CN-AH': 'Central', 'CN-JX': 'Central', 'CN-HA': 'Central',
  'CN-HB': 'Central', 'CN-HN': 'Central',
  // Western
  'CN-NM': 'Western', 'CN-GX': 'Western', 'CN-CQ': 'Western', 'CN-SC': 'Western',
  'CN-GZ': 'Western', 'CN-YN': 'Western', 'CN-XZ': 'Western', 'CN-SN': 'Western',
  'CN-GS': 'Western', 'CN-QH': 'Western', 'CN-NX': 'Western', 'CN-XJ': 'Western',
  // Northeastern
  'CN-LN': 'Northeastern', 'CN-JL': 'Northeastern', 'CN-HL': 'Northeastern',
};

// Existing cities (name, country_code) → province code they belong to.
const CITY_PROVINCE_MAP = {
  'US|New York City': 'US-NY',
  'US|Los Angeles': 'US-CA',
  'US|Chicago': 'US-IL',
  'US|Houston': 'US-TX',
  'US|Phoenix': 'US-AZ',
  'US|Philadelphia': 'US-PA',
  'US|San Antonio': 'US-TX',
  'US|San Diego': 'US-CA',
  'US|Dallas': 'US-TX',
  'US|San Jose': 'US-CA',
  'US|Austin': 'US-TX',
  'US|Jacksonville': 'US-FL',
  'US|San Francisco': 'US-CA',
  'US|Seattle': 'US-WA',
  'US|Denver': 'US-CO',
  'US|Washington D.C.': 'US-DC',
  'US|Nashville': 'US-TN',
  'US|Boston': 'US-MA',
  'US|Las Vegas': 'US-NV',
  'US|Miami': 'US-FL',
  'CN|Shanghai': 'CN-SH',
  'CN|Beijing': 'CN-BJ',
  'CN|Chongqing': 'CN-CQ',
  'CN|Guangzhou': 'CN-GD',
  'CN|Shenzhen': 'CN-GD',
  'CN|Tianjin': 'CN-TJ',
  'CN|Chengdu': 'CN-SC',
  'CN|Wuhan': 'CN-HB',
  'CN|Hangzhou': 'CN-ZJ',
  'CN|Nanjing': 'CN-JS',
  "CN|Xi'an": 'CN-SN',
  'CN|Suzhou': 'CN-JS',
  'CN|Harbin': 'CN-HL',
  'CN|Dalian': 'CN-LN',
  'CN|Qingdao': 'CN-SD',
};

// New "additional" cities (0.25 pt tier) needed to bring pilot states to the
// 4-loggable-cities minimum. Wyoming and Rhode Island had zero pre-existing
// major cities in the seed, so all 4 of theirs are "additional". Beijing is a
// municipality, so its extra "cities" are real administrative districts.
const NEW_CITIES = [
  { country_code: 'US', province_code: 'US-WY', name: 'Cheyenne', population: 65132 },
  { country_code: 'US', province_code: 'US-WY', name: 'Casper', population: 57461 },
  { country_code: 'US', province_code: 'US-WY', name: 'Laramie', population: 32158 },
  { country_code: 'US', province_code: 'US-WY', name: 'Gillette', population: 33403 },
  { country_code: 'US', province_code: 'US-RI', name: 'Providence', population: 190934 },
  { country_code: 'US', province_code: 'US-RI', name: 'Cranston', population: 82934 },
  { country_code: 'US', province_code: 'US-RI', name: 'Warwick', population: 82823 },
  { country_code: 'US', province_code: 'US-RI', name: 'Pawtucket', population: 75604 },
  { country_code: 'CN', province_code: 'CN-BJ', name: 'Chaoyang District', population: 3452000 },
  { country_code: 'CN', province_code: 'CN-BJ', name: 'Haidian District', population: 3133000 },
  { country_code: 'CN', province_code: 'CN-BJ', name: 'Fengtai District', population: 2201000 },
];

// Phase 1 pilot province_experiences — real, well-known, verifiable landmarks.
const PROVINCE_EXPERIENCES = [
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
  // Hong Kong (no cities — experiences only)
  { province_code: 'CN-HK', name: 'Victoria Peak' },
  { province_code: 'CN-HK', name: 'Star Ferry Harbour Crossing' },
  { province_code: 'CN-HK', name: 'Tian Tan Buddha' },
  { province_code: 'CN-HK', name: 'Hong Kong Disneyland' },
  { province_code: 'CN-HK', name: 'Ocean Park Hong Kong' },
];

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  const crypto = require('crypto');

  const provinceCount = await knex('provinces').count('* as count').first();
  if (parseInt(provinceCount.count, 10) === 0) {
    console.log('Migration: provinces table empty (fresh DB), seeds will handle Tier 0 data.');
    return;
  }

  // --- Subregions ---
  const subregionUpdates = { ...US_SUBREGIONS, ...CN_ZONES };
  for (const [code, subregion] of Object.entries(subregionUpdates)) {
    await knex('provinces').where({ code }).whereNull('subregion').update({ subregion });
  }
  console.log(`Migration: set subregion on ${Object.keys(subregionUpdates).length} US/China provinces.`);

  // --- Backfill province_code/city_type on existing cities ---
  let backfilled = 0;
  for (const [key, provinceCode] of Object.entries(CITY_PROVINCE_MAP)) {
    const [countryCode, name] = key.split('|');
    const updated = await knex('cities')
      .where({ country_code: countryCode, name })
      .whereNull('province_code')
      .update({ province_code: provinceCode, city_type: 'major' });
    backfilled += updated;
  }
  console.log(`Migration: backfilled province_code on ${backfilled} existing cities.`);

  // --- New additional cities (WY, RI, Beijing districts) ---
  const existingNewCities = new Set(
    (await knex('cities')
      .whereIn('name', NEW_CITIES.map(c => c.name))
      .select('name'))
      .map(r => r.name),
  );
  const citiesToInsert = NEW_CITIES
    .filter(c => !existingNewCities.has(c.name))
    .map(c => ({ id: crypto.randomUUID(), city_type: 'additional', ...c }));
  if (citiesToInsert.length > 0) {
    await knex('cities').insert(citiesToInsert);
  }
  console.log(`Migration: inserted ${citiesToInsert.length} new additional cities.`);

  // --- Pilot province_experiences ---
  const existingExperiences = new Set(
    (await knex('province_experiences')
      .whereIn('province_code', [...new Set(PROVINCE_EXPERIENCES.map(e => e.province_code))])
      .select('province_code', 'name'))
      .map(r => `${r.province_code}|${r.name}`),
  );
  const experiencesToInsert = PROVINCE_EXPERIENCES
    .filter(e => !existingExperiences.has(`${e.province_code}|${e.name}`))
    .map(e => ({ id: crypto.randomUUID(), ...e }));
  if (experiencesToInsert.length > 0) {
    await knex('province_experiences').insert(experiencesToInsert);
  }
  console.log(`Migration: inserted ${experiencesToInsert.length} pilot province experiences.`);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex('province_experiences')
    .whereIn('province_code', [...new Set(PROVINCE_EXPERIENCES.map(e => e.province_code))])
    .whereIn('name', PROVINCE_EXPERIENCES.map(e => e.name))
    .delete();

  await knex('cities').whereIn('name', NEW_CITIES.map(c => c.name)).delete();

  const subregionCodes = [...Object.keys(US_SUBREGIONS), ...Object.keys(CN_ZONES)];
  await knex('provinces').whereIn('code', subregionCodes).update({ subregion: null });
};
