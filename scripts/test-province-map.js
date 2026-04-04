#!/usr/bin/env node
/**
 * Test script for ProvinceMap projection logic.
 * Runs the same d3-geo code as the React component to verify projections fill the canvas.
 */
const { geoMercator, geoPath } = require('../client/node_modules/d3-geo');
const fs = require('fs');
const path = require('path');

const GEO_DIR = path.join(__dirname, '../client/public/geo');
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function loadGeo(cc) {
  return JSON.parse(fs.readFileSync(path.join(GEO_DIR, `${cc}.json`), 'utf8'));
}

function getCentroid(feature) {
  let s0 = 0, s1 = 0, n = 0;
  function walk(c) { if (typeof c[0] === 'number') { s0 += c[0]; s1 += c[1]; n++; return; } c.forEach(walk); }
  walk(feature.geometry.coordinates);
  return n > 0 ? [s0 / n, s1 / n] : null;
}

function clusterFeatures(features) {
  if (features.length <= 4) return { main: features, outliers: [] };

  const wideFeatures = [];
  const normalItems = [];
  for (const f of features) {
    let minLon = 999, maxLon = -999;
    function walk(c) { if (typeof c[0] === 'number') { minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]); return; } c.forEach(walk); }
    walk(f.geometry.coordinates);
    if (maxLon - minLon > 40) { wideFeatures.push(f); }
    else { const c = getCentroid(f); if (c) normalItems.push({ feature: f, c }); }
  }
  if (normalItems.length === 0) return { main: features, outliers: [] };

  const sorted = [...normalItems].sort((a, b) => a.c[0] - b.c[0]);
  let bestStart = 0, bestCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j < sorted.length && sorted[j].c[0] - sorted[i].c[0] <= 60) j++;
    if (j - i > bestCount) { bestCount = j - i; bestStart = i; }
  }
  let cluster = sorted.slice(bestStart, bestStart + bestCount);

  if (cluster.length > 4) {
    const lats = cluster.map(x => x.c[1]).sort((a, b) => a - b);
    const medLat = lats[Math.floor(lats.length / 2)];
    const latFiltered = cluster.filter(x => Math.abs(x.c[1] - medLat) <= 20);
    if (latFiltered.length >= Math.floor(cluster.length * 0.6)) cluster = latFiltered;
  }

  const mainSet = new Set(cluster.map(x => x.feature));
  return {
    main: features.filter(f => mainSet.has(f)),
    outliers: [...wideFeatures, ...features.filter(f => !mainSet.has(f) && !wideFeatures.includes(f))],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log('\n=== Antimeridian ===');
{
  const geo = loadGeo('US');
  const ak = geo.features.find(f => f.properties.code === 'US-AK');
  let hasPos = false, hasNeg = false;
  function walk(c) { if (typeof c[0] === 'number') { if (c[0] > 0) hasPos = true; if (c[0] < 0) hasNeg = true; return; } c.forEach(walk); }
  walk(ak.geometry.coordinates);
  assert(!(hasPos && hasNeg), 'US-AK does not cross antimeridian');
}

console.log('\n=== Clustering ===');
{
  const geo = loadGeo('US');
  const { main, outliers } = clusterFeatures(geo.features);
  const mainCodes = new Set(main.map(f => f.properties.code));
  const outlierCodes = new Set(outliers.map(f => f.properties.code));

  assert(!mainCodes.has('US-AK'), 'US-AK is NOT in main cluster');
  assert(outlierCodes.has('US-AK'), 'US-AK IS in outliers');
  assert(outlierCodes.has('US-HI'), 'US-HI IS in outliers');
  assert(mainCodes.has('US-CA'), 'US-CA is in main cluster');
  assert(mainCodes.has('US-NY'), 'US-NY is in main cluster');
  assert(mainCodes.has('US-DC'), 'US-DC is in main cluster');
  assert(main.length >= 49, `Main cluster has ≥49 features (got ${main.length})`);
  console.log(`  Main: ${main.length}, Outliers: ${outliers.length} (${outliers.map(f=>f.properties.code).join(', ')})`);
}
{
  const geo = loadGeo('FR');
  const { main, outliers } = clusterFeatures(geo.features);
  const mainCodes = new Set(main.map(f => f.properties.code));
  const outlierCodes = new Set(outliers.map(f => f.properties.code));
  assert(mainCodes.has('FR-IDF'), 'FR-IDF is in main');
  assert(outlierCodes.has('FR-GF'), 'FR-GF (Guyane) is outlier');
  assert(outlierCodes.has('FR-RE'), 'FR-RE (Réunion) is outlier');
  console.log(`  Main: ${main.length}, Outliers: ${outliers.length}`);
}

console.log('\n=== Projection fitting ===');
function testProjectionFill(cc, provinceCodeSet, label) {
  const geo = loadGeo(cc);
  const { main } = clusterFeatures(geo.features);
  const matched = main.filter(f => provinceCodeSet.has(f.properties.code));
  const fitTo = matched.length > 0 ? matched : main;

  // Test with canvas=2000 (what MapPanel does)
  const canvas = 2000, padding = 20;
  const collection = { type: 'FeatureCollection', features: fitTo };
  const proj = geoMercator().fitExtent([[padding, padding], [canvas - padding, canvas - padding]], collection);
  const pg = geoPath().projection(proj);
  const b = pg.bounds(collection);
  const cw = b[1][0] - b[0][0];
  const ch = b[1][1] - b[0][1];
  const fillX = cw / (canvas - 2 * padding);
  const fillY = ch / (canvas - 2 * padding);
  const fillMax = Math.max(fillX, fillY);

  console.log(`  ${label}: bounds=[${b[0].map(v=>v.toFixed(0))}, ${b[1].map(v=>v.toFixed(0))}] content=${cw.toFixed(0)}x${ch.toFixed(0)} fill=${(fillMax*100).toFixed(1)}%`);
  assert(fillMax > 0.8, `${label} fills >80% of canvas (got ${(fillMax*100).toFixed(1)}%)`);

  // Cropped viewBox
  const vx = Math.max(0, Math.floor(b[0][0]) - padding);
  const vy = Math.max(0, Math.floor(b[0][1]) - padding);
  const vw = Math.ceil(b[1][0] - b[0][0]) + padding * 2;
  const vh = Math.ceil(b[1][1] - b[0][1]) + padding * 2;
  console.log(`  ${label}: viewBox="${vx} ${vy} ${vw} ${vh}" (${vw}x${vh})`);
  assert(vw <= canvas && vh <= canvas, `${label} viewBox fits within canvas`);
}

const US_CODES = new Set('US-AL,US-AZ,US-AR,US-CA,US-CO,US-CT,US-DE,US-DC,US-FL,US-GA,US-ID,US-IL,US-IN,US-IA,US-KS,US-KY,US-LA,US-ME,US-MD,US-MA,US-MI,US-MN,US-MS,US-MO,US-MT,US-NE,US-NV,US-NH,US-NJ,US-NM,US-NY,US-NC,US-ND,US-OH,US-OK,US-OR,US-PA,US-RI,US-SC,US-SD,US-TN,US-TX,US-UT,US-VT,US-VA,US-WA,US-WV,US-WI,US-WY'.split(','));
const FR_CODES = new Set('FR-ARA,FR-BFC,FR-BRE,FR-CVL,FR-COR,FR-GES,FR-HDF,FR-IDF,FR-NOR,FR-NAQ,FR-OCC,FR-PDL,FR-PAC'.split(','));
const DE_CODES = new Set(loadGeo('DE').features.map(f => f.properties.code));
const GB_CODES = new Set('GB-ENG,GB-SCT,GB-WLS,GB-NIR'.split(','));

testProjectionFill('US', US_CODES, 'US contiguous');
testProjectionFill('FR', FR_CODES, 'FR mainland');
testProjectionFill('DE', DE_CODES, 'DE');
testProjectionFill('GB', GB_CODES, 'GB');

console.log('\n=== Winding order (no globe-sized features) ===');
const ALL_COUNTRIES = ['CN','IN','US','ID','PK','BR','NG','BD','RU','MX','JP','ET','PH','EG','VN','CD','TR','IR','DE','TH','GB','FR','IT','TZ','ZA','MM','KE','KR','CO','ES'];
for (const cc of ALL_COUNTRIES) {
  const geo = loadGeo(cc);
  const codes = new Set(geo.features.map(f => f.properties.code));
  const collection = { type: 'FeatureCollection', features: geo.features };
  const proj = geoMercator().fitExtent([[20, 20], [1980, 1980]], collection);
  const pg = geoPath().projection(proj);

  let hugeCount = 0;
  geo.features.forEach(f => {
    const b = pg.bounds(f);
    if (b[1][0] - b[0][0] > 1900 && b[1][1] - b[0][1] > 1900) hugeCount++;
  });
  assert(hugeCount === 0, `${cc}: no globe-sized features (${hugeCount} found)`);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
