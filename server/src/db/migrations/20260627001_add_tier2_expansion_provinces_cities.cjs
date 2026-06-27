/**
 * Data migration: insert provinces and cities for AT, NL, CZ, NZ, RO, PE.
 * These countries were added to TIER_2_CODES but their reference data was only
 * in the seed file (which skips if any provinces/cities already exist).
 * Running this migration backfills existing databases.
 */

const PROVINCES = [
  // Austria — 9 Bundesländer
  { code: 'AT-1', country_code: 'AT', name: 'Burgenland',       population:  296010, area_km2:  3962, disputed: false },
  { code: 'AT-2', country_code: 'AT', name: 'Carinthia',        population:  561293, area_km2: 10018, disputed: false },
  { code: 'AT-3', country_code: 'AT', name: 'Lower Austria',    population: 1690879, area_km2: 19186, disputed: false },
  { code: 'AT-4', country_code: 'AT', name: 'Upper Austria',    population: 1495608, area_km2: 11982, disputed: false },
  { code: 'AT-5', country_code: 'AT', name: 'Salzburg',         population:  558410, area_km2:  7154, disputed: false },
  { code: 'AT-6', country_code: 'AT', name: 'Styria',           population: 1247077, area_km2: 16392, disputed: false },
  { code: 'AT-7', country_code: 'AT', name: 'Tyrol',            population:  757634, area_km2: 12648, disputed: false },
  { code: 'AT-8', country_code: 'AT', name: 'Vorarlberg',       population:  397153, area_km2:  2601, disputed: false },
  { code: 'AT-9', country_code: 'AT', name: 'Vienna',           population: 1897491, area_km2:   415, disputed: false },

  // Netherlands — 12 mainland provinces
  { code: 'NL-DR', country_code: 'NL', name: 'Drenthe',         population:  496487, area_km2:  2651, disputed: false },
  { code: 'NL-FL', country_code: 'NL', name: 'Flevoland',       population:  422411, area_km2:  1419, disputed: false },
  { code: 'NL-FR', country_code: 'NL', name: 'Friesland',       population:  651073, area_km2:  3341, disputed: false },
  { code: 'NL-GE', country_code: 'NL', name: 'Gelderland',      population: 2085952, area_km2:  5136, disputed: false },
  { code: 'NL-GR', country_code: 'NL', name: 'Groningen',       population:  585612, area_km2:  2325, disputed: false },
  { code: 'NL-LI', country_code: 'NL', name: 'Limburg',         population: 1115800, area_km2:  2209, disputed: false },
  { code: 'NL-NB', country_code: 'NL', name: 'North Brabant',   population: 2562265, area_km2:  5082, disputed: false },
  { code: 'NL-NH', country_code: 'NL', name: 'North Holland',   population: 2879528, area_km2:  2671, disputed: false },
  { code: 'NL-OV', country_code: 'NL', name: 'Overijssel',      population: 1162406, area_km2:  3421, disputed: false },
  { code: 'NL-UT', country_code: 'NL', name: 'Utrecht',         population: 1353699, area_km2:  1449, disputed: false },
  { code: 'NL-ZE', country_code: 'NL', name: 'Zeeland',         population:  383488, area_km2:  1784, disputed: false },
  { code: 'NL-ZH', country_code: 'NL', name: 'South Holland',   population: 3708696, area_km2:  3403, disputed: false },

  // Czechia — 14 regions
  { code: 'CZ-JC', country_code: 'CZ', name: 'South Bohemian',    population:  644887, area_km2: 10057, disputed: false },
  { code: 'CZ-JM', country_code: 'CZ', name: 'South Moravian',    population: 1195327, area_km2:  7194, disputed: false },
  { code: 'CZ-KA', country_code: 'CZ', name: 'Karlovy Vary',      population:  296165, area_km2:  3315, disputed: false },
  { code: 'CZ-KR', country_code: 'CZ', name: 'Hradec Králové',    population:  552804, area_km2:  4758, disputed: false },
  { code: 'CZ-LI', country_code: 'CZ', name: 'Liberec',           population:  444618, area_km2:  3163, disputed: false },
  { code: 'CZ-MO', country_code: 'CZ', name: 'Moravian-Silesian', population: 1185927, area_km2:  5427, disputed: false },
  { code: 'CZ-OL', country_code: 'CZ', name: 'Olomouc',           population:  632121, area_km2:  5267, disputed: false },
  { code: 'CZ-PA', country_code: 'CZ', name: 'Pardubice',         population:  521836, area_km2:  4519, disputed: false },
  { code: 'CZ-PL', country_code: 'CZ', name: 'Pilsen',            population:  580990, area_km2:  7561, disputed: false },
  { code: 'CZ-PR', country_code: 'CZ', name: 'Prague',            population: 1308632, area_km2:   496, disputed: false },
  { code: 'CZ-SC', country_code: 'CZ', name: 'Central Bohemian',  population: 1380127, area_km2: 11014, disputed: false },
  { code: 'CZ-US', country_code: 'CZ', name: 'Ústí nad Labem',    population:  822856, area_km2:  5335, disputed: false },
  { code: 'CZ-VY', country_code: 'CZ', name: 'Vysočina',          population:  511594, area_km2:  6925, disputed: false },
  { code: 'CZ-ZL', country_code: 'CZ', name: 'Zlín',              population:  582921, area_km2:  3963, disputed: false },

  // New Zealand — 16 standard regions
  { code: 'NZ-NTL', country_code: 'NZ', name: 'Northland',          population:  193400, area_km2: 12500, disputed: false },
  { code: 'NZ-AUK', country_code: 'NZ', name: 'Auckland',           population: 1695200, area_km2:  4941, disputed: false },
  { code: 'NZ-WKO', country_code: 'NZ', name: 'Waikato',            population:  479900, area_km2: 25598, disputed: false },
  { code: 'NZ-BOP', country_code: 'NZ', name: 'Bay of Plenty',      population:  337000, area_km2: 12231, disputed: false },
  { code: 'NZ-GIS', country_code: 'NZ', name: 'Gisborne',           population:   51000, area_km2:  8351, disputed: false },
  { code: 'NZ-HKB', country_code: 'NZ', name: "Hawke's Bay",        population:  164100, area_km2: 14137, disputed: false },
  { code: 'NZ-TKI', country_code: 'NZ', name: 'Taranaki',           population:  123100, area_km2:  7258, disputed: false },
  { code: 'NZ-MWT', country_code: 'NZ', name: 'Manawatū-Whanganui', population:  246200, area_km2: 22220, disputed: false },
  { code: 'NZ-WGN', country_code: 'NZ', name: 'Wellington',         population:  433300, area_km2:  8048, disputed: false },
  { code: 'NZ-TAS', country_code: 'NZ', name: 'Tasman',             population:   56100, area_km2:  9786, disputed: false },
  { code: 'NZ-NSN', country_code: 'NZ', name: 'Nelson',             population:   53200, area_km2:   424, disputed: false },
  { code: 'NZ-MBH', country_code: 'NZ', name: 'Marlborough',        population:   47100, area_km2: 10458, disputed: false },
  { code: 'NZ-WTC', country_code: 'NZ', name: 'West Coast',         population:   31800, area_km2: 23245, disputed: false },
  { code: 'NZ-CAN', country_code: 'NZ', name: 'Canterbury',         population:  594200, area_km2: 45346, disputed: false },
  { code: 'NZ-OTA', country_code: 'NZ', name: 'Otago',              population:  234800, area_km2: 31186, disputed: false },
  { code: 'NZ-STL', country_code: 'NZ', name: 'Southland',          population:   99000, area_km2: 28111, disputed: false },

  // Romania — 8 development regions
  { code: 'RO-NW', country_code: 'RO', name: 'North-West',           population: 2669942, area_km2: 34159, disputed: false },
  { code: 'RO-CE', country_code: 'RO', name: 'Centre',               population: 2387476, area_km2: 34100, disputed: false },
  { code: 'RO-NE', country_code: 'RO', name: 'North-East',           population: 3302953, area_km2: 36850, disputed: false },
  { code: 'RO-SE', country_code: 'RO', name: 'South-East',           population: 2545923, area_km2: 35762, disputed: false },
  { code: 'RO-SM', country_code: 'RO', name: 'South Muntenia',       population: 3136417, area_km2: 34453, disputed: false },
  { code: 'RO-BU', country_code: 'RO', name: 'Bucharest-Ilfov',      population: 2272163, area_km2:  1821, disputed: false },
  { code: 'RO-SW', country_code: 'RO', name: 'South-West Oltenia',   population: 1997862, area_km2: 29212, disputed: false },
  { code: 'RO-WS', country_code: 'RO', name: 'West',                 population: 1825920, area_km2: 32034, disputed: false },

  // Peru — 25 regions + Callao + Lima Province
  { code: 'PE-AMA', country_code: 'PE', name: 'Amazonas',      population:  379384, area_km2:  39249, disputed: false },
  { code: 'PE-ANC', country_code: 'PE', name: 'Áncash',        population: 1083519, area_km2:  35915, disputed: false },
  { code: 'PE-APU', country_code: 'PE', name: 'Apurímac',      population:  430736, area_km2:  20896, disputed: false },
  { code: 'PE-ARE', country_code: 'PE', name: 'Arequipa',      population: 1301298, area_km2:  63345, disputed: false },
  { code: 'PE-AYA', country_code: 'PE', name: 'Ayacucho',      population:  616176, area_km2:  43815, disputed: false },
  { code: 'PE-CAJ', country_code: 'PE', name: 'Cajamarca',     population: 1341012, area_km2:  33318, disputed: false },
  { code: 'PE-CUS', country_code: 'PE', name: 'Cusco',         population: 1205527, area_km2:  71987, disputed: false },
  { code: 'PE-HUV', country_code: 'PE', name: 'Huancavelica',  population:  347639, area_km2:  22131, disputed: false },
  { code: 'PE-HUC', country_code: 'PE', name: 'Huánuco',       population:  721047, area_km2:  35000, disputed: false },
  { code: 'PE-ICA', country_code: 'PE', name: 'Ica',           population:  975182, area_km2:  21328, disputed: false },
  { code: 'PE-JUN', country_code: 'PE', name: 'Junín',         population: 1246038, area_km2:  44197, disputed: false },
  { code: 'PE-LAL', country_code: 'PE', name: 'La Libertad',   population: 1778080, area_km2:  25500, disputed: false },
  { code: 'PE-LAM', country_code: 'PE', name: 'Lambayeque',    population: 1260650, area_km2:  14231, disputed: false },
  { code: 'PE-LIM', country_code: 'PE', name: 'Lima Region',   population:  944333, area_km2:  32127, disputed: false },
  { code: 'PE-LOR', country_code: 'PE', name: 'Loreto',        population:  883510, area_km2: 368852, disputed: false },
  { code: 'PE-MDD', country_code: 'PE', name: 'Madre de Dios', population:  141070, area_km2:  85301, disputed: false },
  { code: 'PE-MOQ', country_code: 'PE', name: 'Moquegua',      population:  192740, area_km2:  15734, disputed: false },
  { code: 'PE-PAS', country_code: 'PE', name: 'Pasco',         population:  254065, area_km2:  25320, disputed: false },
  { code: 'PE-PIU', country_code: 'PE', name: 'Piura',         population: 1856809, area_km2:  35892, disputed: false },
  { code: 'PE-PUN', country_code: 'PE', name: 'Puno',          population: 1172697, area_km2:  67000, disputed: false },
  { code: 'PE-SAM', country_code: 'PE', name: 'San Martín',    population:  813381, area_km2:  51253, disputed: false },
  { code: 'PE-TAC', country_code: 'PE', name: 'Tacna',         population:  346013, area_km2:  16076, disputed: false },
  { code: 'PE-TUM', country_code: 'PE', name: 'Tumbes',        population:  224863, area_km2:   4669, disputed: false },
  { code: 'PE-UCA', country_code: 'PE', name: 'Ucayali',       population:  495522, area_km2: 102411, disputed: false },
  { code: 'PE-CAL', country_code: 'PE', name: 'Callao',        population: 1085827, area_km2:    147, disputed: false },
  { code: 'PE-LMA', country_code: 'PE', name: 'Lima Province', population: 9674755, area_km2:   2672, disputed: false },
];

const CITIES = [
  // Austria
  { country_code: 'AT', name: 'Vienna',       population: 1897491 },
  { country_code: 'AT', name: 'Graz',         population:  291072 },
  { country_code: 'AT', name: 'Linz',         population:  204846 },
  { country_code: 'AT', name: 'Salzburg',     population:  154211 },
  { country_code: 'AT', name: 'Innsbruck',    population:  132493 },
  { country_code: 'AT', name: 'Klagenfurt',   population:  101403 },
  { country_code: 'AT', name: 'Villach',      population:   61354 },
  // Netherlands
  { country_code: 'NL', name: 'Amsterdam',    population:  872680 },
  { country_code: 'NL', name: 'Rotterdam',    population:  651446 },
  { country_code: 'NL', name: 'The Hague',    population:  548320 },
  { country_code: 'NL', name: 'Utrecht',      population:  357276 },
  { country_code: 'NL', name: 'Eindhoven',    population:  234456 },
  { country_code: 'NL', name: 'Groningen',    population:  232723 },
  { country_code: 'NL', name: 'Tilburg',      population:  222977 },
  { country_code: 'NL', name: 'Almere',       population:  213909 },
  { country_code: 'NL', name: 'Breda',        population:  183704 },
  { country_code: 'NL', name: 'Maastricht',   population:  122486 },
  // Czechia
  { country_code: 'CZ', name: 'Prague',       population: 1308632 },
  { country_code: 'CZ', name: 'Brno',         population:  381346 },
  { country_code: 'CZ', name: 'Ostrava',      population:  284982 },
  { country_code: 'CZ', name: 'Plzeň',        population:  174149 },
  { country_code: 'CZ', name: 'Liberec',      population:  104802 },
  { country_code: 'CZ', name: 'Olomouc',      population:  100514 },
  { country_code: 'CZ', name: 'České Budějovice', population:  94229 },
  { country_code: 'CZ', name: 'Hradec Králové',   population:  91448 },
  { country_code: 'CZ', name: 'Karlovy Vary',      population:  49304 },
  // New Zealand
  { country_code: 'NZ', name: 'Auckland',          population:  467000 },
  { country_code: 'NZ', name: 'Christchurch',      population:  381800 },
  { country_code: 'NZ', name: 'Wellington',        population:  215100 },
  { country_code: 'NZ', name: 'Hamilton',          population:  169300 },
  { country_code: 'NZ', name: 'Tauranga',          population:  143000 },
  { country_code: 'NZ', name: 'Dunedin',           population:  126300 },
  { country_code: 'NZ', name: 'Palmerston North',  population:   88100 },
  { country_code: 'NZ', name: 'Queenstown',        population:   16600 },
  // Romania
  { country_code: 'RO', name: 'Bucharest',    population: 1883425 },
  { country_code: 'RO', name: 'Cluj-Napoca',  population:  324576 },
  { country_code: 'RO', name: 'Timișoara',    population:  319279 },
  { country_code: 'RO', name: 'Iași',         population:  290422 },
  { country_code: 'RO', name: 'Constanța',    population:  283872 },
  { country_code: 'RO', name: 'Craiova',      population:  269506 },
  { country_code: 'RO', name: 'Brașov',       population:  253200 },
  { country_code: 'RO', name: 'Galați',       population:  249432 },
  { country_code: 'RO', name: 'Sibiu',        population:  147245 },
  { country_code: 'RO', name: 'Sinaia',       population:   11000 },
  // Peru
  { country_code: 'PE', name: 'Lima',         population: 9562280 },
  { country_code: 'PE', name: 'Arequipa',     population:  869351 },
  { country_code: 'PE', name: 'Trujillo',     population:  799550 },
  { country_code: 'PE', name: 'Chiclayo',     population:  552508 },
  { country_code: 'PE', name: 'Iquitos',      population:  437376 },
  { country_code: 'PE', name: 'Piura',        population:  424759 },
  { country_code: 'PE', name: 'Huancayo',     population:  336280 },
  { country_code: 'PE', name: 'Cusco',        population:  428450 },
  { country_code: 'PE', name: 'Puno',         population:  125663 },
  { country_code: 'PE', name: 'Tacna',        population:  329705 },
];

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  const crypto = require('crypto');

  // --- Provinces ---
  // The `code` column has a UNIQUE constraint, so we batch-insert and ignore
  // any rows that already exist (safe to re-run).
  const existingCodes = new Set(
    (await knex('provinces').whereIn('code', PROVINCES.map(p => p.code)).select('code'))
      .map(r => r.code),
  );
  const newProvinces = PROVINCES
    .filter(p => !existingCodes.has(p.code))
    .map(p => ({ id: crypto.randomUUID(), ...p }));

  if (newProvinces.length > 0) {
    const batchSize = 50;
    await knex.transaction(async (trx) => {
      for (let i = 0; i < newProvinces.length; i += batchSize) {
        await trx('provinces').insert(newProvinces.slice(i, i + batchSize));
      }
    });
    console.log(`Migration: inserted ${newProvinces.length} provinces for AT/NL/CZ/NZ/RO/PE.`);
  } else {
    console.log('Migration: all AT/NL/CZ/NZ/RO/PE provinces already present, skipping.');
  }

  // --- Cities ---
  // No unique constraint on (country_code, name), so check per country to avoid duplicates.
  const targetCountryCodes = [...new Set(CITIES.map(c => c.country_code))];
  const existingCountries = new Set(
    (await knex('cities').whereIn('country_code', targetCountryCodes).distinct('country_code').select('country_code'))
      .map(r => r.country_code),
  );
  const newCities = CITIES
    .filter(c => !existingCountries.has(c.country_code))
    .map(c => ({ id: crypto.randomUUID(), ...c }));

  if (newCities.length > 0) {
    const batchSize = 50;
    await knex.transaction(async (trx) => {
      for (let i = 0; i < newCities.length; i += batchSize) {
        await trx('cities').insert(newCities.slice(i, i + batchSize));
      }
    });
    console.log(`Migration: inserted ${newCities.length} cities for AT/NL/CZ/NZ/RO/PE.`);
  } else {
    console.log('Migration: all AT/NL/CZ/NZ/RO/PE cities already present, skipping.');
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  const codes = PROVINCES.map(p => p.code);
  await knex('provinces').whereIn('code', codes).delete();

  const countryCodes = [...new Set(CITIES.map(c => c.country_code))];
  for (const cc of countryCodes) {
    const names = CITIES.filter(c => c.country_code === cc).map(c => c.name);
    await knex('cities').where('country_code', cc).whereIn('name', names).delete();
  }
};
