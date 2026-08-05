/**
 * Seed: country_disaster_rarity
 * Experience Update (issue #74), v1 = earthquakes only. Real per-country M6+
 * annual frequency, secondary-sourced (VolcanoDiscovery / worlddata.info /
 * British Geological Survey) since the live USGS catalog API isn't reachable
 * from this dev environment — see "Sourced rarity data" in
 * docs/features/experience-update.md for the full citation table and the
 * bucketing rule used to derive rarity_multiplier:
 *   >=10/yr -> 0.5, 3-9.9/yr -> 0.75, 1-2.9/yr -> 1.0, 0.3-0.9/yr -> 1.5,
 *   <0.3/yr (historically rare) -> 2.5
 *
 * Coverage is intentionally partial — only the 8 countries actually sourced
 * so far. US, Mexico, Nepal, and everyone else need a real sourced pull
 * before disaster logging opens for them; flagged provisional the same way
 * advisory_level is. One-time seed, not a scheduled refresh — earthquake
 * frequency is a geological base rate, not a live-events signal.
 */

const rarity = [
  { country_code: 'ID', disaster_type: 'earthquake', avg_events_per_year: 12.5, rarity_multiplier: 0.5, source: 'VolcanoDiscovery' },
  { country_code: 'JP', disaster_type: 'earthquake', avg_events_per_year: 10.7, rarity_multiplier: 0.5, source: 'VolcanoDiscovery' },
  { country_code: 'CL', disaster_type: 'earthquake', avg_events_per_year: 6.1, rarity_multiplier: 0.75, source: 'VolcanoDiscovery' },
  { country_code: 'NZ', disaster_type: 'earthquake', avg_events_per_year: 2.5, rarity_multiplier: 1.0, source: 'VolcanoDiscovery' },
  { country_code: 'GR', disaster_type: 'earthquake', avg_events_per_year: 1.51, rarity_multiplier: 1.0, source: 'VolcanoDiscovery' },
  { country_code: 'TR', disaster_type: 'earthquake', avg_events_per_year: 1.0, rarity_multiplier: 1.0, source: 'VolcanoDiscovery / Statista' },
  { country_code: 'IT', disaster_type: 'earthquake', avg_events_per_year: 0.77, rarity_multiplier: 1.5, source: 'VolcanoDiscovery' },
  { country_code: 'GB', disaster_type: 'earthquake', avg_events_per_year: 0.05, rarity_multiplier: 2.5, source: 'British Geological Survey (no M6+ in the historical catalogue; M5.5 ~once/century)' },
];

exports.seed = async function (knex) {
  const crypto = require('crypto');

  const existing = await knex('country_disaster_rarity').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    console.log('Disaster rarity data already seeded, skipping.');
    return;
  }

  const rows = rarity.map(r => ({ id: crypto.randomUUID(), ...r }));
  await knex('country_disaster_rarity').insert(rows);
  console.log(`Seeded ${rows.length} country disaster rarity rows.`);
};

exports.rarity = rarity;
