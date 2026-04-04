#!/usr/bin/env node
/**
 * Download Natural Earth admin-1 boundaries and split into per-country GeoJSON files.
 * Output: client/public/geo/{CC}.json for each of our 30 Tier 1/2 countries.
 *
 * Some countries need merging because our province codes use larger groupings
 * than Natural Earth's admin-1 boundaries (e.g. French regions vs departments).
 */

const fs = require('fs');
const path = require('path');

const NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

const COUNTRIES = [
  'CN', 'IN', 'US', 'ID', 'PK', 'BR', 'NG', 'BD', 'RU', 'MX',
  'JP', 'ET', 'PH', 'EG', 'VN', 'CD', 'TR', 'IR', 'DE', 'TH',
  'GB', 'FR', 'IT', 'TZ', 'ZA', 'MM', 'KE', 'KR', 'CO', 'ES',
];

// ── Merge maps ───────────────────────────────────────────────────────────────
// Map NE department codes → our province codes for countries that use grouped regions

// France: departments → regions
const FR_DEPT_TO_REGION = {
  'FR-01':'FR-ARA','FR-03':'FR-ARA','FR-07':'FR-ARA','FR-15':'FR-ARA','FR-26':'FR-ARA',
  'FR-38':'FR-ARA','FR-42':'FR-ARA','FR-43':'FR-ARA','FR-63':'FR-ARA','FR-69':'FR-ARA',
  'FR-73':'FR-ARA','FR-74':'FR-ARA',
  'FR-21':'FR-BFC','FR-25':'FR-BFC','FR-39':'FR-BFC','FR-58':'FR-BFC','FR-70':'FR-BFC',
  'FR-71':'FR-BFC','FR-89':'FR-BFC','FR-90':'FR-BFC',
  'FR-22':'FR-BRE','FR-29':'FR-BRE','FR-35':'FR-BRE','FR-56':'FR-BRE',
  'FR-18':'FR-CVL','FR-28':'FR-CVL','FR-36':'FR-CVL','FR-37':'FR-CVL','FR-41':'FR-CVL','FR-45':'FR-CVL',
  'FR-2A':'FR-COR','FR-2B':'FR-COR','FR-20':'FR-COR',
  'FR-08':'FR-GES','FR-10':'FR-GES','FR-51':'FR-GES','FR-52':'FR-GES','FR-54':'FR-GES',
  'FR-55':'FR-GES','FR-57':'FR-GES','FR-67':'FR-GES','FR-68':'FR-GES','FR-88':'FR-GES',
  'FR-02':'FR-HDF','FR-59':'FR-HDF','FR-60':'FR-HDF','FR-62':'FR-HDF','FR-80':'FR-HDF',
  'FR-75':'FR-IDF','FR-77':'FR-IDF','FR-78':'FR-IDF','FR-91':'FR-IDF','FR-92':'FR-IDF',
  'FR-93':'FR-IDF','FR-94':'FR-IDF','FR-95':'FR-IDF',
  'FR-14':'FR-NOR','FR-27':'FR-NOR','FR-50':'FR-NOR','FR-61':'FR-NOR','FR-76':'FR-NOR',
  'FR-16':'FR-NAQ','FR-17':'FR-NAQ','FR-19':'FR-NAQ','FR-23':'FR-NAQ','FR-24':'FR-NAQ',
  'FR-33':'FR-NAQ','FR-40':'FR-NAQ','FR-47':'FR-NAQ','FR-64':'FR-NAQ','FR-79':'FR-NAQ',
  'FR-86':'FR-NAQ','FR-87':'FR-NAQ',
  'FR-09':'FR-OCC','FR-11':'FR-OCC','FR-12':'FR-OCC','FR-30':'FR-OCC','FR-31':'FR-OCC',
  'FR-32':'FR-OCC','FR-34':'FR-OCC','FR-46':'FR-OCC','FR-48':'FR-OCC','FR-65':'FR-OCC','FR-66':'FR-OCC','FR-81':'FR-OCC','FR-82':'FR-OCC',
  'FR-44':'FR-PDL','FR-49':'FR-PDL','FR-53':'FR-PDL','FR-72':'FR-PDL','FR-85':'FR-PDL',
  'FR-04':'FR-PAC','FR-05':'FR-PAC','FR-06':'FR-PAC','FR-13':'FR-PAC','FR-83':'FR-PAC','FR-84':'FR-PAC',
  // Overseas
  'FR-GP':'FR-GP','FR-MQ':'FR-MQ','FR-GF':'FR-GF','FR-RE':'FR-RE','FR-YT':'FR-YT',
};

const FR_REGION_NAMES = {
  'FR-ARA': 'Auvergne-Rhône-Alpes', 'FR-BFC': 'Bourgogne-Franche-Comté',
  'FR-BRE': 'Bretagne', 'FR-CVL': 'Centre-Val de Loire', 'FR-COR': 'Corse',
  'FR-GES': 'Grand Est', 'FR-HDF': 'Hauts-de-France', 'FR-IDF': 'Île-de-France',
  'FR-NOR': 'Normandie', 'FR-NAQ': 'Nouvelle-Aquitaine', 'FR-OCC': 'Occitanie',
  'FR-PDL': 'Pays de la Loire', 'FR-PAC': "Provence-Alpes-Côte d'Azur",
  'FR-GP': 'Guadeloupe', 'FR-MQ': 'Martinique', 'FR-GF': 'Guyane',
  'FR-RE': 'La Réunion', 'FR-YT': 'Mayotte',
};

// Italy: provinces → regions
const IT_PROV_TO_REGION = {};
const IT_REGIONS = {
  'IT-21': { name: 'Piemonte', codes: ['IT-AL','IT-AT','IT-BI','IT-CN','IT-NO','IT-TO','IT-VB','IT-VC'] },
  'IT-23': { name: "Valle d'Aosta", codes: ['IT-AO'] },
  'IT-25': { name: 'Lombardia', codes: ['IT-BG','IT-BS','IT-CO','IT-CR','IT-LC','IT-LO','IT-MN','IT-MI','IT-MB','IT-PV','IT-SO','IT-VA'] },
  'IT-32': { name: 'Trentino-Alto Adige', codes: ['IT-BZ','IT-TN'] },
  'IT-34': { name: 'Veneto', codes: ['IT-BL','IT-PD','IT-RO','IT-TV','IT-VE','IT-VI','IT-VR'] },
  'IT-36': { name: 'Friuli Venezia Giulia', codes: ['IT-GO','IT-PN','IT-TS','IT-UD'] },
  'IT-42': { name: 'Liguria', codes: ['IT-GE','IT-IM','IT-SP','IT-SV'] },
  'IT-45': { name: 'Emilia-Romagna', codes: ['IT-BO','IT-FC','IT-FE','IT-MO','IT-PC','IT-PR','IT-RA','IT-RE','IT-RN'] },
  'IT-52': { name: 'Toscana', codes: ['IT-AR','IT-FI','IT-GR','IT-LI','IT-LU','IT-MS','IT-PI','IT-PO','IT-PT','IT-SI'] },
  'IT-55': { name: 'Umbria', codes: ['IT-PG','IT-TR'] },
  'IT-57': { name: 'Marche', codes: ['IT-AN','IT-AP','IT-FM','IT-MC','IT-PU'] },
  'IT-62': { name: 'Lazio', codes: ['IT-FR','IT-LT','IT-RI','IT-RM','IT-VT'] },
  'IT-65': { name: 'Abruzzo', codes: ['IT-AQ','IT-CH','IT-PE','IT-TE'] },
  'IT-67': { name: 'Molise', codes: ['IT-CB','IT-IS'] },
  'IT-72': { name: 'Campania', codes: ['IT-AV','IT-BN','IT-CE','IT-NA','IT-SA'] },
  'IT-75': { name: 'Puglia', codes: ['IT-BA','IT-BR','IT-BT','IT-FG','IT-LE','IT-TA'] },
  'IT-77': { name: 'Basilicata', codes: ['IT-MT','IT-PZ'] },
  'IT-78': { name: 'Calabria', codes: ['IT-CS','IT-CZ','IT-KR','IT-RC','IT-VV'] },
  'IT-82': { name: 'Sicilia', codes: ['IT-AG','IT-CL','IT-CT','IT-EN','IT-ME','IT-PA','IT-RG','IT-SR','IT-TP'] },
  'IT-88': { name: 'Sardegna', codes: ['IT-CA','IT-CI','IT-MD','IT-NU','IT-OG','IT-OR','IT-OT','IT-SS','IT-VS','IT-SU'] },
};
for (const [regionCode, { codes }] of Object.entries(IT_REGIONS)) {
  for (const provCode of codes) IT_PROV_TO_REGION[provCode] = regionCode;
}

// Spain: NE has provinces → we use autonomous communities
const ES_PROV_TO_COMMUNITY = {};
const ES_COMMUNITIES = {
  'ES-AN': { name: 'Andalucía', codes: ['ES-AL','ES-CA','ES-CO','ES-GR','ES-H','ES-J','ES-MA','ES-SE'] },
  'ES-AR': { name: 'Aragón', codes: ['ES-HU','ES-TE','ES-Z'] },
  'ES-AS': { name: 'Asturias', codes: ['ES-O'] },
  'ES-IB': { name: 'Illes Balears', codes: ['ES-PM'] },
  'ES-CN': { name: 'Canarias', codes: ['ES-GC','ES-TF'] },
  'ES-CB': { name: 'Cantabria', codes: ['ES-S'] },
  'ES-CL': { name: 'Castilla y León', codes: ['ES-AV','ES-BU','ES-LE','ES-P','ES-SA','ES-SG','ES-SO','ES-VA','ES-ZA'] },
  'ES-CM': { name: 'Castilla-La Mancha', codes: ['ES-AB','ES-CR','ES-CU','ES-GU','ES-TO'] },
  'ES-CT': { name: 'Catalunya', codes: ['ES-B','ES-GI','ES-L','ES-T'] },
  'ES-EX': { name: 'Extremadura', codes: ['ES-BA','ES-CC'] },
  'ES-GA': { name: 'Galicia', codes: ['ES-C','ES-LU','ES-OR','ES-PO'] },
  'ES-MD': { name: 'Comunidad de Madrid', codes: ['ES-M'] },
  'ES-MC': { name: 'Región de Murcia', codes: ['ES-MU'] },
  'ES-NC': { name: 'Comunidad Foral de Navarra', codes: ['ES-NA'] },
  'ES-PV': { name: 'País Vasco', codes: ['ES-BI','ES-SS','ES-VI'] },
  'ES-LO': { name: 'La Rioja', codes: ['ES-LO'] },
  'ES-VC': { name: 'Comunitat Valenciana', codes: ['ES-A','ES-CS','ES-V'] },
  'ES-CE': { name: 'Ceuta', codes: ['ES-CE'] },
  'ES-ML': { name: 'Melilla', codes: ['ES-ML'] },
};
for (const [commCode, { codes }] of Object.entries(ES_COMMUNITIES)) {
  for (const provCode of codes) ES_PROV_TO_COMMUNITY[provCode] = commCode;
}

// Thailand: provinces → 6 geographic groups
const TH_PROV_TO_GROUP = {};
const TH_GROUPS = {
  'TH-N': { name: 'North', codes: ['TH-50','TH-57','TH-58','TH-52','TH-54','TH-55','TH-51','TH-53','TH-56'] },
  'TH-NE': { name: 'Northeast', codes: ['TH-30','TH-31','TH-32','TH-33','TH-34','TH-35','TH-36','TH-37','TH-38','TH-39','TH-40','TH-41','TH-42','TH-43','TH-44','TH-45','TH-46','TH-47','TH-48','TH-49'] },
  'TH-C': { name: 'Central', codes: ['TH-10','TH-11','TH-12','TH-13','TH-14','TH-15','TH-16','TH-17','TH-18','TH-19','TH-60','TH-61','TH-26','TH-24','TH-25'] },
  'TH-E': { name: 'East', codes: ['TH-20','TH-21','TH-22','TH-23','TH-27'] },
  'TH-W': { name: 'West', codes: ['TH-62','TH-63','TH-64','TH-65','TH-66','TH-70','TH-71','TH-72','TH-73','TH-74','TH-75','TH-76','TH-77'] },
  'TH-S': { name: 'South', codes: ['TH-80','TH-81','TH-82','TH-83','TH-84','TH-85','TH-86','TH-90','TH-91','TH-92','TH-93','TH-94','TH-95','TH-96'] },
};
for (const [groupCode, { codes }] of Object.entries(TH_GROUPS)) {
  for (const provCode of codes) TH_PROV_TO_GROUP[provCode] = groupCode;
}

// Turkey: 81 provinces → 12 NUTS-1 regions
const TR_PROV_TO_NUTS1 = {};
const TR_NUTS1 = {
  'TR-1':  { name: 'Istanbul', codes: ['TR-34'] },
  'TR-2':  { name: 'West Marmara', codes: ['TR-10','TR-17','TR-22','TR-39','TR-59','TR-11','TR-14'] },
  'TR-3':  { name: 'Aegean', codes: ['TR-03','TR-09','TR-20','TR-35','TR-45','TR-48','TR-64','TR-15'] },
  'TR-4':  { name: 'East Marmara', codes: ['TR-16','TR-26','TR-41','TR-43','TR-53','TR-77','TR-81','TR-74'] },
  'TR-5':  { name: 'West Anatolia', codes: ['TR-06','TR-42','TR-05','TR-68','TR-70','TR-71','TR-25'] },
  'TR-6':  { name: 'Mediterranean', codes: ['TR-07','TR-32','TR-33','TR-01','TR-31','TR-80','TR-46'] },
  'TR-7':  { name: 'Central Anatolia', codes: ['TR-18','TR-19','TR-37','TR-40','TR-50','TR-51','TR-52','TR-55','TR-58','TR-60','TR-66','TR-72','TR-38'] },
  'TR-8':  { name: 'West Black Sea', codes: ['TR-28','TR-61','TR-67','TR-78'] },
  'TR-9':  { name: 'East Black Sea', codes: ['TR-08','TR-29','TR-36','TR-53','TR-54','TR-62'] },
  'TR-10': { name: 'Northeast Anatolia', codes: ['TR-04','TR-24','TR-25','TR-44','TR-46','TR-49','TR-69','TR-75'] },
  'TR-11': { name: 'Central East Anatolia', codes: ['TR-12','TR-13','TR-23','TR-76','TR-02','TR-21','TR-30','TR-79','TR-65'] },
  'TR-12': { name: 'Southeast Anatolia', codes: ['TR-27','TR-47','TR-56','TR-63','TR-73'] },
};
for (const [nutsCode, { codes }] of Object.entries(TR_NUTS1)) {
  for (const provCode of codes) TR_PROV_TO_NUTS1[provCode] = nutsCode;
}

// UK: counties/regions → 4 nations
const GB_NAME_TO_NATION = {};
// Will use the 'region' property from NE data

const GB_NATIONS = { 'GB-ENG': 'England', 'GB-SCT': 'Scotland', 'GB-WLS': 'Wales', 'GB-NIR': 'Northern Ireland' };

// Philippines: NE has many sub-provinces — we use 82 province codes (ISO 3166-2)
// These should match directly since NE iso_3166_2 matches our codes

// ── Merge config: which countries need feature merging? ──────────────────────

const MERGE_CONFIGS = {
  FR: { map: FR_DEPT_TO_REGION, names: FR_REGION_NAMES },
  IT: { map: IT_PROV_TO_REGION, names: Object.fromEntries(Object.entries(IT_REGIONS).map(([k,v]) => [k, v.name])) },
  ES: { map: ES_PROV_TO_COMMUNITY, names: Object.fromEntries(Object.entries(ES_COMMUNITIES).map(([k,v]) => [k, v.name])) },
  TH: { map: TH_PROV_TO_GROUP, names: Object.fromEntries(Object.entries(TH_GROUPS).map(([k,v]) => [k, v.name])) },
  TR: { map: TR_PROV_TO_NUTS1, names: Object.fromEntries(Object.entries(TR_NUTS1).map(([k,v]) => [k, v.name])) },
};

// ── Helper functions ─────────────────────────────────────────────────────────

// Normalize coordinates that cross the antimeridian (e.g. Alaska Aleutian Islands, Russia Chukotka).
// Only triggers when coordinates exist on BOTH sides of ±180° (not for features near the prime meridian).
// Shifts positive longitudes >100° to negative so Mercator projection doesn't wrap the whole globe.
function normalizeAntimeridian(coords) {
  let hasFarPos = false, hasFarNeg = false;
  function detect(c) {
    if (typeof c[0] === 'number') {
      if (c[0] > 100) hasFarPos = true;
      if (c[0] < -100) hasFarNeg = true;
      return;
    }
    c.forEach(detect);
  }
  detect(coords);
  // Only normalize if we have coordinates on both far sides (near ±180°)
  if (!hasFarPos || !hasFarNeg) return coords;
  function shift(c) {
    if (typeof c[0] === 'number') return [c[0] > 0 ? c[0] - 360 : c[0], c[1]];
    return c.map(shift);
  }
  return shift(coords);
}


function simplifyCoords(coords, precision = 2) {
  if (typeof coords[0] === 'number') {
    return [
      Math.round(coords[0] * Math.pow(10, precision)) / Math.pow(10, precision),
      Math.round(coords[1] * Math.pow(10, precision)) / Math.pow(10, precision),
    ];
  }
  return coords.map(c => simplifyCoords(c, precision));
}

function mergeFeatures(features, codeMap, nameMap) {
  const groups = {};
  let unmapped = 0;

  for (const f of features) {
    const neCode = f.properties.iso_3166_2 || '';
    const targetCode = codeMap[neCode];
    if (!targetCode) {
      unmapped++;
      continue;
    }
    if (!groups[targetCode]) groups[targetCode] = [];
    groups[targetCode].push(f);
  }

  if (unmapped > 0) {
    // console.warn(`    ${unmapped} features could not be mapped`);
  }

  return Object.entries(groups).map(([code, feats]) => {
    const allCoords = [];
    for (const f of feats) {
      if (f.geometry.type === 'Polygon') {
        allCoords.push(f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiPolygon') {
        allCoords.push(...f.geometry.coordinates);
      }
    }

    return {
      type: 'Feature',
      properties: { code, name: nameMap[code] || code },
      geometry: {
        type: 'MultiPolygon',
        coordinates: simplifyCoords(normalizeAntimeridian(allCoords), 3),
      },
    };
  });
}

function processGB(features) {
  const nations = { 'GB-ENG': [], 'GB-SCT': [], 'GB-WLS': [], 'GB-NIR': [] };

  for (const f of features) {
    const geonunit = (f.properties.geonunit || '').toLowerCase();

    let nationCode;
    if (geonunit === 'scotland') nationCode = 'GB-SCT';
    else if (geonunit === 'wales') nationCode = 'GB-WLS';
    else if (geonunit === 'northern ireland') nationCode = 'GB-NIR';
    else nationCode = 'GB-ENG';
    nations[nationCode].push(f);
  }

  return Object.entries(nations)
    .filter(([, feats]) => feats.length > 0)
    .map(([code, feats]) => {
      const allCoords = [];
      for (const f of feats) {
        if (f.geometry.type === 'Polygon') {
          allCoords.push(f.geometry.coordinates);
        } else if (f.geometry.type === 'MultiPolygon') {
          allCoords.push(...f.geometry.coordinates);
        }
      }
      return {
        type: 'Feature',
        properties: { code, name: GB_NATIONS[code] },
        geometry: {
          type: 'MultiPolygon',
          coordinates: simplifyCoords(normalizeAntimeridian(allCoords), 3),
        },
      };
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Downloading Natural Earth admin-1 data (10m)...');
  const res = await fetch(NE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const data = await res.json();
  console.log(`Downloaded ${data.features.length} features.`);

  const outDir = path.join(__dirname, '..', 'client', 'public', 'geo');
  fs.mkdirSync(outDir, { recursive: true });

  for (const cc of COUNTRIES) {
    const features = data.features.filter(f =>
      f.properties.iso_a2 === cc ||
      (f.properties.iso_3166_2 && f.properties.iso_3166_2.startsWith(cc + '-'))
    );

    if (features.length === 0) {
      console.warn(`  ${cc}: no features found, skipping`);
      continue;
    }

    let outputFeatures;

    if (cc === 'GB') {
      outputFeatures = processGB(features);
    } else if (MERGE_CONFIGS[cc]) {
      const { map, names } = MERGE_CONFIGS[cc];
      outputFeatures = mergeFeatures(features, map, names);
    } else {
      // Standard: each NE feature = one province
      outputFeatures = features.map(f => ({
        type: 'Feature',
        properties: {
          code: f.properties.iso_3166_2 || `${cc}-${f.properties.postal || 'XX'}`,
          name: f.properties.name || f.properties.name_en || 'Unknown',
        },
        geometry: {
          type: f.geometry.type,
          coordinates: simplifyCoords(normalizeAntimeridian(f.geometry.coordinates), 3),
        },
      }));
    }

    // No explicit winding fix — preserve original Natural Earth winding order.
    // Using precision=3 in simplifyCoords to avoid flipping winding from rounding.

    const geojson = { type: 'FeatureCollection', features: outputFeatures };
    const json = JSON.stringify(geojson);
    fs.writeFileSync(path.join(outDir, `${cc}.json`), json);
    console.log(`  ${cc}: ${outputFeatures.length} features (${Math.round(json.length / 1024)}KB)`);
  }

  console.log('\nDone!');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
