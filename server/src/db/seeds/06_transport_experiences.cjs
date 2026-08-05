/**
 * Seed: transport_experiences
 * Experience Update (issue #74). A starter catalog of real, named,
 * country-specific transport routes — not exhaustive (the doc scopes this
 * at ~25-50 total); more routes get added incrementally. Real
 * distance/duration figures; significance_band derived by hand from
 * getRouteSignificance in points.js (kept in sync manually, same as the
 * landmark significance_pct — seed data is static, not computed at insert
 * time).
 */

const routes = [
  {
    name: 'Trans-Siberian Railway (Moscow–Vladivostok, full route)',
    host_country_code: 'RU',
    description: 'The longest railway line in the world, crossing eight time zones.',
    distance_km: 9289, duration: '~7 days', significance_band: 3.0,
  },
  {
    name: 'Reunification Express (Hanoi–Ho Chi Minh City)',
    host_country_code: 'VN',
    description: "Vietnam's north-south line, connecting the two largest cities.",
    distance_km: 1726, duration: '~30-36 hours', significance_band: 2.0,
  },
  {
    name: 'The Ghan (Adelaide–Darwin)',
    host_country_code: 'AU',
    description: 'Transcontinental route through the Australian outback.',
    distance_km: 2979, duration: '~3 days', significance_band: 2.0,
  },
  {
    name: 'Shinkansen (Tokyo–Shin-Osaka, Tokaido Line)',
    host_country_code: 'JP',
    description: "Japan's original bullet train line.",
    distance_km: 515, duration: '~2.5 hours', significance_band: 1.5,
  },
  {
    name: 'Eurostar (London–Paris)',
    host_country_code: 'FR',
    description: 'High-speed rail through the Channel Tunnel.',
    distance_km: 495, duration: '~2h15', significance_band: 1.0,
  },
  {
    name: 'Rocky Mountaineer (Vancouver–Banff)',
    host_country_code: 'CA',
    description: 'Scenic daylight rail through the Canadian Rockies.',
    distance_km: 950, duration: '~2 days', significance_band: 1.5,
  },
  {
    name: 'Glacier Express (Zermatt–St. Moritz)',
    host_country_code: 'CH',
    description: "The world's slowest express train, across the Swiss Alps.",
    distance_km: 291, duration: '~8 hours', significance_band: 1.0,
  },
  {
    name: 'TranzAlpine (Christchurch–Greymouth)',
    host_country_code: 'NZ',
    description: 'Crosses the Southern Alps via Arthur\'s Pass.',
    distance_km: 223, duration: '~5 hours', significance_band: 1.0,
  },
  {
    name: 'Blue Train (Pretoria–Cape Town)',
    host_country_code: 'ZA',
    description: 'Luxury train across South Africa.',
    distance_km: 1600, duration: '~27 hours', significance_band: 2.0,
  },
  {
    name: 'Palace on Wheels (Delhi loop, Rajasthan)',
    host_country_code: 'IN',
    description: 'Week-long luxury circuit through Rajasthan.',
    distance_km: 2200, duration: '~7 days', significance_band: 2.0,
  },
];

exports.seed = async function (knex) {
  const crypto = require('crypto');

  const existing = await knex('transport_experiences').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    console.log('Transport experiences already seeded, skipping.');
    return;
  }

  const rows = routes.map(r => ({ id: crypto.randomUUID(), ...r }));
  await knex('transport_experiences').insert(rows);
  console.log(`Seeded ${rows.length} transport experiences.`);
};

exports.routes = routes;
