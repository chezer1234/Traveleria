/**
 * Provinces V1.4 — expand province coverage to Canada, Australia, and all of Europe.
 *
 * Province codes follow ISO 3166-2 where available.
 * Population figures: World Bank / census estimates (2020).
 * Areas in km² from CIA World Factbook / Wikipedia.
 *
 * Only runs on existing databases (countries table already populated).
 * Fresh databases are handled by seeds.
 */

// ── CANADA ───────────────────────────────────────────────────────────────────
const CA_PROVINCES = [
  { code: 'CA-AB', country_code: 'CA', name: 'Alberta',                      population:  4262635, area_km2:   661848, disputed: false },
  { code: 'CA-BC', country_code: 'CA', name: 'British Columbia',              population:  5000879, area_km2:   944735, disputed: false },
  { code: 'CA-MB', country_code: 'CA', name: 'Manitoba',                      population:  1360396, area_km2:   647797, disputed: false },
  { code: 'CA-NB', country_code: 'CA', name: 'New Brunswick',                 population:   776827, area_km2:    72908, disputed: false },
  { code: 'CA-NL', country_code: 'CA', name: 'Newfoundland and Labrador',     population:   521542, area_km2:   405212, disputed: false },
  { code: 'CA-NS', country_code: 'CA', name: 'Nova Scotia',                   population:   971395, area_km2:    55284, disputed: false },
  { code: 'CA-NT', country_code: 'CA', name: 'Northwest Territories',         population:    44904, area_km2:  1346106, disputed: false },
  { code: 'CA-NU', country_code: 'CA', name: 'Nunavut',                       population:    38780, area_km2:  2093190, disputed: false },
  { code: 'CA-ON', country_code: 'CA', name: 'Ontario',                       population: 14223942, area_km2:  1076395, disputed: false },
  { code: 'CA-PE', country_code: 'CA', name: 'Prince Edward Island',          population:   154331, area_km2:     5660, disputed: false },
  { code: 'CA-QC', country_code: 'CA', name: 'Quebec',                        population:  8484965, area_km2:  1542056, disputed: false },
  { code: 'CA-SK', country_code: 'CA', name: 'Saskatchewan',                  population:  1174462, area_km2:   651036, disputed: false },
  { code: 'CA-YT', country_code: 'CA', name: 'Yukon',                         population:    40232, area_km2:   482443, disputed: false },
];

// ── AUSTRALIA ────────────────────────────────────────────────────────────────
const AU_PROVINCES = [
  { code: 'AU-NSW', country_code: 'AU', name: 'New South Wales',              population:  8166369, area_km2:   800642, disputed: false },
  { code: 'AU-QLD', country_code: 'AU', name: 'Queensland',                   population:  5185673, area_km2:  1730648, disputed: false },
  { code: 'AU-SA',  country_code: 'AU', name: 'South Australia',              population:  1771290, area_km2:   983482, disputed: false },
  { code: 'AU-TAS', country_code: 'AU', name: 'Tasmania',                     population:   534281, area_km2:    68401, disputed: false },
  { code: 'AU-VIC', country_code: 'AU', name: 'Victoria',                     population:  6680629, area_km2:   237629, disputed: false },
  { code: 'AU-WA',  country_code: 'AU', name: 'Western Australia',            population:  2620247, area_km2:  2527013, disputed: false },
  { code: 'AU-ACT', country_code: 'AU', name: 'Australian Capital Territory', population:   426704, area_km2:     2358, disputed: false },
  { code: 'AU-NT',  country_code: 'AU', name: 'Northern Territory',           population:   245869, area_km2:  1349129, disputed: false },
];

// ── ALBANIA ──────────────────────────────────────────────────────────────────
const AL_PROVINCES = [
  { code: 'AL-BR', country_code: 'AL', name: 'Berat',        population:  141714, area_km2:  4014, disputed: false },
  { code: 'AL-DI', country_code: 'AL', name: 'Dibër',        population:  115968, area_km2:  2586, disputed: false },
  { code: 'AL-DU', country_code: 'AL', name: 'Durrës',       population:  387736, area_km2:   766, disputed: false },
  { code: 'AL-EL', country_code: 'AL', name: 'Elbasan',      population:  274756, area_km2:  3199, disputed: false },
  { code: 'AL-FI', country_code: 'AL', name: 'Fier',         population:  289067, area_km2:  1206, disputed: false },
  { code: 'AL-GJ', country_code: 'AL', name: 'Gjirokastër', population:   75444, area_km2:  4687, disputed: false },
  { code: 'AL-KO', country_code: 'AL', name: 'Korçë',        population:  214866, area_km2:  3711, disputed: false },
  { code: 'AL-KU', country_code: 'AL', name: 'Kukës',        population:   82647, area_km2:  2373, disputed: false },
  { code: 'AL-LE', country_code: 'AL', name: 'Lezhë',        population:  134248, area_km2:  1229, disputed: false },
  { code: 'AL-SH', country_code: 'AL', name: 'Shkodër',      population:  218780, area_km2:  5188, disputed: false },
  { code: 'AL-TI', country_code: 'AL', name: 'Tiranë',       population:  763634, area_km2:  1029, disputed: false },
  { code: 'AL-VL', country_code: 'AL', name: 'Vlorë',        population:  178887, area_km2:  2706, disputed: false },
];

// ── BELARUS ──────────────────────────────────────────────────────────────────
const BY_PROVINCES = [
  { code: 'BY-BR', country_code: 'BY', name: 'Brest Oblast',   population: 1378900, area_km2: 32786, disputed: false },
  { code: 'BY-HO', country_code: 'BY', name: 'Gomel Oblast',   population: 1397200, area_km2: 40372, disputed: false },
  { code: 'BY-HR', country_code: 'BY', name: 'Grodno Oblast',  population: 1040600, area_km2: 25127, disputed: false },
  { code: 'BY-HM', country_code: 'BY', name: 'Minsk',          population: 1982444, area_km2:   409, disputed: false },
  { code: 'BY-MI', country_code: 'BY', name: 'Minsk Oblast',   population: 1494200, area_km2: 39848, disputed: false },
  { code: 'BY-MA', country_code: 'BY', name: 'Mogilev Oblast', population: 1046800, area_km2: 29062, disputed: false },
  { code: 'BY-VI', country_code: 'BY', name: 'Vitebsk Oblast', population: 1140400, area_km2: 40048, disputed: false },
];

// ── BELGIUM ──────────────────────────────────────────────────────────────────
const BE_PROVINCES = [
  { code: 'BE-BRU', country_code: 'BE', name: 'Brussels-Capital Region', population: 1208542, area_km2:   161, disputed: false },
  { code: 'BE-VAN', country_code: 'BE', name: 'Antwerp Province',        population: 1857986, area_km2:  2867, disputed: false },
  { code: 'BE-VBR', country_code: 'BE', name: 'Flemish Brabant',         population: 1128952, area_km2:  2106, disputed: false },
  { code: 'BE-VLI', country_code: 'BE', name: 'Limburg Province',        population:  878530, area_km2:  2427, disputed: false },
  { code: 'BE-VOV', country_code: 'BE', name: 'East Flanders',           population: 1516969, area_km2:  2982, disputed: false },
  { code: 'BE-VWV', country_code: 'BE', name: 'West Flanders',           population: 1187996, area_km2:  3144, disputed: false },
  { code: 'BE-WAB', country_code: 'BE', name: 'Walloon Brabant',         population:  403600, area_km2:  1097, disputed: false },
  { code: 'BE-WHT', country_code: 'BE', name: 'Hainaut Province',        population: 1344242, area_km2:  3786, disputed: false },
  { code: 'BE-WLG', country_code: 'BE', name: 'Liège Province',          population: 1106992, area_km2:  3862, disputed: false },
  { code: 'BE-WLX', country_code: 'BE', name: 'Luxembourg Province',     population:  277729, area_km2:  4440, disputed: false },
  { code: 'BE-WNA', country_code: 'BE', name: 'Namur Province',          population:  495797, area_km2:  3666, disputed: false },
];

// ── BOSNIA AND HERZEGOVINA ───────────────────────────────────────────────────
const BA_PROVINCES = [
  { code: 'BA-BRC', country_code: 'BA', name: 'Brčko District',                          population:   83516, area_km2:   493, disputed: false },
  { code: 'BA-FBH', country_code: 'BA', name: 'Federation of Bosnia and Herzegovina',    population: 2219220, area_km2: 26110, disputed: false },
  { code: 'BA-SRP', country_code: 'BA', name: 'Republika Srpska',                        population: 1228423, area_km2: 24594, disputed: false },
];

// ── BULGARIA ─────────────────────────────────────────────────────────────────
// 6 NUTS-2 planning regions (merged from 28 oblasts in geo script)
const BG_PROVINCES = [
  { code: 'BG-NW', country_code: 'BG', name: 'Northwest',      population:  647201, area_km2: 19765, disputed: false },
  { code: 'BG-NC', country_code: 'BG', name: 'North-Central',  population:  635000, area_km2: 14798, disputed: false },
  { code: 'BG-NE', country_code: 'BG', name: 'Northeast',      population:  913000, area_km2: 14741, disputed: false },
  { code: 'BG-SE', country_code: 'BG', name: 'Southeast',      population:  867000, area_km2: 19380, disputed: false },
  { code: 'BG-SC', country_code: 'BG', name: 'South-Central',  population: 1398000, area_km2: 15703, disputed: false },
  { code: 'BG-SW', country_code: 'BG', name: 'Southwest',      population: 2488244, area_km2: 26492, disputed: false },
];

// ── CROATIA ──────────────────────────────────────────────────────────────────
const HR_PROVINCES = [
  { code: 'HR-01', country_code: 'HR', name: 'Bjelovar-Bilogora County',    population:  119764, area_km2: 2652, disputed: false },
  { code: 'HR-02', country_code: 'HR', name: 'Brod-Posavina County',        population:  158575, area_km2: 2030, disputed: false },
  { code: 'HR-03', country_code: 'HR', name: 'Dubrovnik-Neretva County',    population:  122783, area_km2: 1783, disputed: false },
  { code: 'HR-04', country_code: 'HR', name: 'Istria County',               population:  208055, area_km2: 2813, disputed: false },
  { code: 'HR-05', country_code: 'HR', name: 'Karlovac County',             population:  128899, area_km2: 3626, disputed: false },
  { code: 'HR-06', country_code: 'HR', name: 'Koprivnica-Križevci County',  population:  115584, area_km2: 1746, disputed: false },
  { code: 'HR-07', country_code: 'HR', name: 'Krapina-Zagorje County',      population:  132892, area_km2: 1229, disputed: false },
  { code: 'HR-08', country_code: 'HR', name: 'Lika-Senj County',            population:   50927, area_km2: 5350, disputed: false },
  { code: 'HR-09', country_code: 'HR', name: 'Međimurje County',            population:  113804, area_km2:  730, disputed: false },
  { code: 'HR-10', country_code: 'HR', name: 'Osijek-Baranja County',       population:  305032, area_km2: 4155, disputed: false },
  { code: 'HR-11', country_code: 'HR', name: 'Požega-Slavonia County',      population:   78034, area_km2: 1823, disputed: false },
  { code: 'HR-12', country_code: 'HR', name: 'Primorje-Gorski Kotar County',population:  296195, area_km2: 3588, disputed: false },
  { code: 'HR-13', country_code: 'HR', name: 'Šibenik-Knin County',         population:  109375, area_km2: 2994, disputed: false },
  { code: 'HR-14', country_code: 'HR', name: 'Sisak-Moslavina County',      population:  172439, area_km2: 4468, disputed: false },
  { code: 'HR-15', country_code: 'HR', name: 'Split-Dalmatia County',       population:  454798, area_km2: 4540, disputed: false },
  { code: 'HR-16', country_code: 'HR', name: 'Varaždin County',             population:  175951, area_km2: 1262, disputed: false },
  { code: 'HR-17', country_code: 'HR', name: 'Virovitica-Podravina County', population:   84836, area_km2: 2024, disputed: false },
  { code: 'HR-18', country_code: 'HR', name: 'Vukovar-Srijem County',       population:  179521, area_km2: 2454, disputed: false },
  { code: 'HR-19', country_code: 'HR', name: 'Zadar County',                population:  170017, area_km2: 3646, disputed: false },
  { code: 'HR-20', country_code: 'HR', name: 'Zagreb County',               population:  317606, area_km2: 3060, disputed: false },
  { code: 'HR-21', country_code: 'HR', name: 'City of Zagreb',              population:  790017, area_km2:  641, disputed: false },
];

// ── CYPRUS ───────────────────────────────────────────────────────────────────
const CY_PROVINCES = [
  { code: 'CY-01', country_code: 'CY', name: 'Nicosia',    population: 354674, area_km2: 2717, disputed: false },
  { code: 'CY-02', country_code: 'CY', name: 'Limassol',   population: 239842, area_km2: 1394, disputed: false },
  { code: 'CY-03', country_code: 'CY', name: 'Larnaca',    population: 144234, area_km2:  868, disputed: false },
  { code: 'CY-04', country_code: 'CY', name: 'Famagusta',  population:  46000, area_km2: 1979, disputed: false },
  { code: 'CY-05', country_code: 'CY', name: 'Paphos',     population: 107640, area_km2: 1395, disputed: false },
  { code: 'CY-06', country_code: 'CY', name: 'Kyrenia',    population:  87830, area_km2:  597, disputed: false },
];

// ── DENMARK ──────────────────────────────────────────────────────────────────
const DK_PROVINCES = [
  { code: 'DK-01', country_code: 'DK', name: 'Capital Region',       population: 1848023, area_km2:  2561, disputed: false },
  { code: 'DK-81', country_code: 'DK', name: 'North Denmark',        population:  591901, area_km2:  7928, disputed: false },
  { code: 'DK-82', country_code: 'DK', name: 'Zealand',              population:  841717, area_km2:  7273, disputed: false },
  { code: 'DK-84', country_code: 'DK', name: 'Central Denmark',      population: 1313596, area_km2: 13142, disputed: false },
  { code: 'DK-85', country_code: 'DK', name: 'Southern Denmark',     population: 1223316, area_km2: 12191, disputed: false },
];

// ── ESTONIA ──────────────────────────────────────────────────────────────────
// 15 counties (maakonnad)
const EE_PROVINCES = [
  { code: 'EE-37', country_code: 'EE', name: 'Harju',       population:  613782, area_km2:  4333, disputed: false },
  { code: 'EE-39', country_code: 'EE', name: 'Hiiu',        population:   10023, area_km2:  1023, disputed: false },
  { code: 'EE-44', country_code: 'EE', name: 'Ida-Viru',    population:  140000, area_km2:  3364, disputed: false },
  { code: 'EE-49', country_code: 'EE', name: 'Jõgeva',      population:   30000, area_km2:  2604, disputed: false },
  { code: 'EE-51', country_code: 'EE', name: 'Järva',       population:   31000, area_km2:  2623, disputed: false },
  { code: 'EE-57', country_code: 'EE', name: 'Lääne',       population:   22000, area_km2:  2383, disputed: false },
  { code: 'EE-59', country_code: 'EE', name: 'Lääne-Viru',  population:   58000, area_km2:  3465, disputed: false },
  { code: 'EE-65', country_code: 'EE', name: 'Põlva',       population:   27000, area_km2:  2165, disputed: false },
  { code: 'EE-67', country_code: 'EE', name: 'Pärnu',       population:   85000, area_km2:  4807, disputed: false },
  { code: 'EE-70', country_code: 'EE', name: 'Rapla',       population:   34000, area_km2:  2980, disputed: false },
  { code: 'EE-74', country_code: 'EE', name: 'Saare',       population:   34000, area_km2:  2922, disputed: false },
  { code: 'EE-78', country_code: 'EE', name: 'Tartu',       population:  152000, area_km2:  2993, disputed: false },
  { code: 'EE-82', country_code: 'EE', name: 'Valga',       population:   30000, area_km2:  2044, disputed: false },
  { code: 'EE-84', country_code: 'EE', name: 'Viljandi',    population:   46000, area_km2:  3589, disputed: false },
  { code: 'EE-86', country_code: 'EE', name: 'Võru',        population:   36000, area_km2:  2305, disputed: false },
];

// ── FINLAND ──────────────────────────────────────────────────────────────────
// 19 regions (maakunta)
const FI_PROVINCES = [
  { code: 'FI-01', country_code: 'FI', name: 'Åland',                   population:   30129, area_km2:  1553, disputed: false },
  { code: 'FI-02', country_code: 'FI', name: 'South Karelia',           population:  129397, area_km2:  5613, disputed: false },
  { code: 'FI-03', country_code: 'FI', name: 'South Ostrobothnia',      population:  193748, area_km2:  13444, disputed: false },
  { code: 'FI-04', country_code: 'FI', name: 'South Savo',              population:  147983, area_km2:  14257, disputed: false },
  { code: 'FI-05', country_code: 'FI', name: 'Kainuu',                  population:   74208, area_km2:  21500, disputed: false },
  { code: 'FI-06', country_code: 'FI', name: 'Tavastia Proper',         population:  174753, area_km2:   5124, disputed: false },
  { code: 'FI-07', country_code: 'FI', name: 'Central Ostrobothnia',    population:   68719, area_km2:   5027, disputed: false },
  { code: 'FI-08', country_code: 'FI', name: 'Central Finland',         population:  276906, area_km2:  16703, disputed: false },
  { code: 'FI-09', country_code: 'FI', name: 'Kymenlaakso',             population:  175755, area_km2:   5148, disputed: false },
  { code: 'FI-10', country_code: 'FI', name: 'Lapland',                 population:  182840, area_km2:  98984, disputed: false },
  { code: 'FI-11', country_code: 'FI', name: 'Pirkanmaa',               population:  524493, area_km2:  12446, disputed: false },
  { code: 'FI-12', country_code: 'FI', name: 'Ostrobothnia',            population:  181754, area_km2:   7750, disputed: false },
  { code: 'FI-13', country_code: 'FI', name: 'North Karelia',           population:  165754, area_km2:  17761, disputed: false },
  { code: 'FI-14', country_code: 'FI', name: 'North Ostrobothnia',      population:  413044, area_km2:  36785, disputed: false },
  { code: 'FI-15', country_code: 'FI', name: 'North Savo',              population:  249002, area_km2:  16769, disputed: false },
  { code: 'FI-16', country_code: 'FI', name: 'Päijät-Häme',             population:  201964, area_km2:   5125, disputed: false },
  { code: 'FI-17', country_code: 'FI', name: 'Satakunta',               population:  220398, area_km2:   7956, disputed: false },
  { code: 'FI-18', country_code: 'FI', name: 'Uusimaa',                 population: 1694119, area_km2:   9097, disputed: false },
  { code: 'FI-19', country_code: 'FI', name: 'Southwest Finland',       population:  476000, area_km2:  10662, disputed: false },
];

// ── GREECE ───────────────────────────────────────────────────────────────────
// 13 peripheries
const GR_PROVINCES = [
  { code: 'GR-A', country_code: 'GR', name: 'East Macedonia and Thrace', population:  609365, area_km2: 14157, disputed: false },
  { code: 'GR-B', country_code: 'GR', name: 'Central Macedonia',         population: 1882108, area_km2: 18811, disputed: false },
  { code: 'GR-C', country_code: 'GR', name: 'West Macedonia',            population:  283689, area_km2:  9451, disputed: false },
  { code: 'GR-D', country_code: 'GR', name: 'Epirus',                    population:  336856, area_km2:  9203, disputed: false },
  { code: 'GR-E', country_code: 'GR', name: 'Thessaly',                  population:  732762, area_km2: 14037, disputed: false },
  { code: 'GR-F', country_code: 'GR', name: 'Ionian Islands',            population:  207855, area_km2:  2307, disputed: false },
  { code: 'GR-G', country_code: 'GR', name: 'West Greece',               population:  679796, area_km2: 11350, disputed: false },
  { code: 'GR-H', country_code: 'GR', name: 'Central Greece',            population:  547390, area_km2: 15549, disputed: false },
  { code: 'GR-I', country_code: 'GR', name: 'Attica',                    population: 3752554, area_km2:  3809, disputed: false },
  { code: 'GR-J', country_code: 'GR', name: 'Peloponnese',               population:  578903, area_km2: 15490, disputed: false },
  { code: 'GR-K', country_code: 'GR', name: 'North Aegean',              population:  200164, area_km2:  3836, disputed: false },
  { code: 'GR-L', country_code: 'GR', name: 'South Aegean',              population:  337636, area_km2:  5286, disputed: false },
  { code: 'GR-M', country_code: 'GR', name: 'Crete',                     population:  623065, area_km2:  8336, disputed: false },
];

// ── HUNGARY ──────────────────────────────────────────────────────────────────
// 19 counties + Budapest
const HU_PROVINCES = [
  { code: 'HU-BA', country_code: 'HU', name: 'Baranya County',             population:  381673, area_km2: 4430, disputed: false },
  { code: 'HU-BE', country_code: 'HU', name: 'Békés County',               population:  361802, area_km2: 5631, disputed: false },
  { code: 'HU-BK', country_code: 'HU', name: 'Bács-Kiskun County',        population:  515786, area_km2: 8445, disputed: false },
  { code: 'HU-BZ', country_code: 'HU', name: 'Borsod-Abaúj-Zemplén County', population: 689710, area_km2: 7247, disputed: false },
  { code: 'HU-BU', country_code: 'HU', name: 'Budapest',                   population: 1752286, area_km2:  525, disputed: false },
  { code: 'HU-CS', country_code: 'HU', name: 'Csongrád-Csanád County',    population:  419844, area_km2: 4261, disputed: false },
  { code: 'HU-FE', country_code: 'HU', name: 'Fejér County',              population:  427206, area_km2: 4359, disputed: false },
  { code: 'HU-GS', country_code: 'HU', name: 'Győr-Moson-Sopron County',  population:  456716, area_km2: 4208, disputed: false },
  { code: 'HU-HB', country_code: 'HU', name: 'Hajdú-Bihar County',        population:  551272, area_km2: 6211, disputed: false },
  { code: 'HU-HE', country_code: 'HU', name: 'Heves County',              population:  306024, area_km2: 3637, disputed: false },
  { code: 'HU-JN', country_code: 'HU', name: 'Jász-Nagykun-Szolnok County', population: 386752, area_km2: 5582, disputed: false },
  { code: 'HU-KE', country_code: 'HU', name: 'Komárom-Esztergom County',  population:  316269, area_km2: 2265, disputed: false },
  { code: 'HU-NO', country_code: 'HU', name: 'Nógrád County',             population:  201919, area_km2: 2544, disputed: false },
  { code: 'HU-PE', country_code: 'HU', name: 'Pest County',               population: 1268834, area_km2: 6394, disputed: false },
  { code: 'HU-SO', country_code: 'HU', name: 'Somogy County',             population:  320596, area_km2: 6036, disputed: false },
  { code: 'HU-SZ', country_code: 'HU', name: 'Szabolcs-Szatmár-Bereg County', population: 568218, area_km2: 5936, disputed: false },
  { code: 'HU-TE', country_code: 'HU', name: 'Tolna County',              population:  233078, area_km2: 3703, disputed: false },
  { code: 'HU-VA', country_code: 'HU', name: 'Vas County',                population:  257266, area_km2: 3336, disputed: false },
  { code: 'HU-VE', country_code: 'HU', name: 'Veszprém County',           population:  357699, area_km2: 4493, disputed: false },
  { code: 'HU-ZA', country_code: 'HU', name: 'Zala County',               population:  283609, area_km2: 3784, disputed: false },
];

// ── ICELAND ──────────────────────────────────────────────────────────────────
// 8 regions
const IS_PROVINCES = [
  { code: 'IS-1', country_code: 'IS', name: 'Capital Region',       population: 233034, area_km2:   785, disputed: false },
  { code: 'IS-2', country_code: 'IS', name: 'Southern Peninsula',   population:  24848, area_km2:   829, disputed: false },
  { code: 'IS-3', country_code: 'IS', name: 'West',                 population:  16180, area_km2:  9519, disputed: false },
  { code: 'IS-4', country_code: 'IS', name: 'Westfjords',           population:   7158, area_km2:  9470, disputed: false },
  { code: 'IS-5', country_code: 'IS', name: 'Northwest',            population:  20680, area_km2: 14139, disputed: false },
  { code: 'IS-6', country_code: 'IS', name: 'Northeast',            population:  31222, area_km2: 21991, disputed: false },
  { code: 'IS-7', country_code: 'IS', name: 'East',                 population:  14139, area_km2: 22721, disputed: false },
  { code: 'IS-8', country_code: 'IS', name: 'South',                population:  27726, area_km2: 24948, disputed: false },
];

// ── IRELAND ──────────────────────────────────────────────────────────────────
// 4 historical provinces (merged from 26 counties in geo script)
const IE_PROVINCES = [
  { code: 'IE-C', country_code: 'IE', name: 'Connacht',  population:  542546, area_km2: 17713, disputed: false },
  { code: 'IE-L', country_code: 'IE', name: 'Leinster',  population: 2630720, area_km2: 19753, disputed: false },
  { code: 'IE-M', country_code: 'IE', name: 'Munster',   population: 1280020, area_km2: 24675, disputed: false },
  { code: 'IE-U', country_code: 'IE', name: 'Ulster',    population:  483500, area_km2:  8013, disputed: false },
];

// ── KOSOVO ───────────────────────────────────────────────────────────────────
// 7 administrative districts
const XK_PROVINCES = [
  { code: 'XK-PR', country_code: 'XK', name: 'Pristina',   population: 477038, area_km2: 2053, disputed: false },
  { code: 'XK-MR', country_code: 'XK', name: 'Mitrovica',  population: 268518, area_km2: 2081, disputed: false },
  { code: 'XK-PE', country_code: 'XK', name: 'Peja',       population: 177781, area_km2: 1365, disputed: false },
  { code: 'XK-GJ', country_code: 'XK', name: 'Gjakova',    population: 194672, area_km2: 1129, disputed: false },
  { code: 'XK-FE', country_code: 'XK', name: 'Ferizaj',    population: 209858, area_km2: 1030, disputed: false },
  { code: 'XK-GI', country_code: 'XK', name: 'Gjilan',     population: 191103, area_km2: 1208, disputed: false },
  { code: 'XK-PZ', country_code: 'XK', name: 'Prizren',    population: 302000, area_km2: 1397, disputed: false },
];

// ── LATVIA ───────────────────────────────────────────────────────────────────
// 6 planning regions
const LV_PROVINCES = [
  { code: 'LV-RIX', country_code: 'LV', name: 'Riga',        population: 632614, area_km2:   308, disputed: false },
  { code: 'LV-PIE', country_code: 'LV', name: 'Pierīga',     population: 329979, area_km2:  6601, disputed: false },
  { code: 'LV-VID', country_code: 'LV', name: 'Vidzeme',     population: 237000, area_km2: 15569, disputed: false },
  { code: 'LV-KUR', country_code: 'LV', name: 'Kurzeme',     population: 261000, area_km2: 13617, disputed: false },
  { code: 'LV-ZEM', country_code: 'LV', name: 'Zemgale',     population: 232000, area_km2:  9263, disputed: false },
  { code: 'LV-LAT', country_code: 'LV', name: 'Latgale',     population: 272000, area_km2: 14521, disputed: false },
];

// ── LITHUANIA ────────────────────────────────────────────────────────────────
// 10 counties (apskritys)
const LT_PROVINCES = [
  { code: 'LT-AL', country_code: 'LT', name: 'Alytus County',       population: 150000, area_km2:  5425, disputed: false },
  { code: 'LT-KL', country_code: 'LT', name: 'Klaipėda County',     population: 368000, area_km2:  5209, disputed: false },
  { code: 'LT-KU', country_code: 'LT', name: 'Kaunas County',       population: 637000, area_km2:  8089, disputed: false },
  { code: 'LT-MR', country_code: 'LT', name: 'Marijampolė County',  population: 166000, area_km2:  4463, disputed: false },
  { code: 'LT-PN', country_code: 'LT', name: 'Panevėžys County',    population: 231000, area_km2:  7881, disputed: false },
  { code: 'LT-SA', country_code: 'LT', name: 'Šiauliai County',     population: 290000, area_km2:  8540, disputed: false },
  { code: 'LT-TA', country_code: 'LT', name: 'Tauragė County',      population: 121000, area_km2:  4350, disputed: false },
  { code: 'LT-TE', country_code: 'LT', name: 'Telšiai County',      population: 155000, area_km2:  4350, disputed: false },
  { code: 'LT-UT', country_code: 'LT', name: 'Utena County',        population: 155000, area_km2:  7201, disputed: false },
  { code: 'LT-VL', country_code: 'LT', name: 'Vilnius County',      population: 868000, area_km2:  9731, disputed: false },
];

// ── LUXEMBOURG ───────────────────────────────────────────────────────────────
// 3 districts
const LU_PROVINCES = [
  { code: 'LU-D', country_code: 'LU', name: 'Diekirch District',     population: 136000, area_km2: 1157, disputed: false },
  { code: 'LU-G', country_code: 'LU', name: 'Grevenmacher District', population:  78000, area_km2:  525, disputed: false },
  { code: 'LU-L', country_code: 'LU', name: 'Luxembourg District',   population: 411978, area_km2:  904, disputed: false },
];

// ── MOLDOVA ──────────────────────────────────────────────────────────────────
// 5 development regions + Transnistria (disputed)
const MD_PROVINCES = [
  { code: 'MD-CH', country_code: 'MD', name: 'Chișinău',     population:  795000, area_km2:   635, disputed: false },
  { code: 'MD-N',  country_code: 'MD', name: 'North Moldova', population:  595000, area_km2: 12320, disputed: false },
  { code: 'MD-C',  country_code: 'MD', name: 'Central Moldova',population: 595000, area_km2: 10650, disputed: false },
  { code: 'MD-S',  country_code: 'MD', name: 'South Moldova', population:  478000, area_km2:  8650, disputed: false },
  { code: 'MD-GA', country_code: 'MD', name: 'Gagauzia',      population:  134000, area_km2:  1832, disputed: false },
  { code: 'MD-SN', country_code: 'MD', name: 'Transnistria',  population:  460637, area_km2:  4163, disputed: true  },
];

// ── MONTENEGRO ───────────────────────────────────────────────────────────────
// 4 statistical regions
const ME_PROVINCES = [
  { code: 'ME-N',  country_code: 'ME', name: 'Northern Montenegro',    population: 150000, area_km2:  9750, disputed: false },
  { code: 'ME-C',  country_code: 'ME', name: 'Central Montenegro',     population: 217000, area_km2:  3960, disputed: false },
  { code: 'ME-SO', country_code: 'ME', name: 'Southern Montenegro',    population: 148000, area_km2:  5516, disputed: false },
  { code: 'ME-SE', country_code: 'ME', name: 'Southeastern Montenegro',population: 113066, area_km2:  7586, disputed: false },
];

// ── NORTH MACEDONIA ──────────────────────────────────────────────────────────
// 8 statistical regions
const MK_PROVINCES = [
  { code: 'MK-01', country_code: 'MK', name: 'Vardar Region',    population: 155000, area_km2: 4079, disputed: false },
  { code: 'MK-02', country_code: 'MK', name: 'East Region',      population: 174000, area_km2: 3537, disputed: false },
  { code: 'MK-03', country_code: 'MK', name: 'Southwest Region', population: 218000, area_km2: 3800, disputed: false },
  { code: 'MK-04', country_code: 'MK', name: 'Southeast Region', population: 172000, area_km2: 4716, disputed: false },
  { code: 'MK-05', country_code: 'MK', name: 'Pelagonia Region', population: 239000, area_km2: 4717, disputed: false },
  { code: 'MK-06', country_code: 'MK', name: 'Polog Region',     population: 317000, area_km2: 2416, disputed: false },
  { code: 'MK-07', country_code: 'MK', name: 'Northeast Region', population: 185000, area_km2: 2683, disputed: false },
  { code: 'MK-08', country_code: 'MK', name: 'Skopje Region',    population: 621374, area_km2: 1818, disputed: false },
];

// ── MALTA ────────────────────────────────────────────────────────────────────
// 5 regions + Gozo/Comino
const MT_PROVINCES = [
  { code: 'MT-01', country_code: 'MT', name: 'Northern Region',   population:  66000, area_km2: 100, disputed: false },
  { code: 'MT-02', country_code: 'MT', name: 'Northern Harbour',  population: 120000, area_km2:  39, disputed: false },
  { code: 'MT-03', country_code: 'MT', name: 'Southern Harbour',  population:  85000, area_km2:  56, disputed: false },
  { code: 'MT-04', country_code: 'MT', name: 'South Eastern',     population:  76000, area_km2:  97, disputed: false },
  { code: 'MT-05', country_code: 'MT', name: 'Western Region',    population:  58000, area_km2:  68, disputed: false },
  { code: 'MT-GZ', country_code: 'MT', name: 'Gozo and Comino',  population:  36543, area_km2:  68, disputed: false },
];

// ── NORWAY ───────────────────────────────────────────────────────────────────
// 11 counties (2020–2024 structure)
const NO_PROVINCES = [
  { code: 'NO-03', country_code: 'NO', name: 'Oslo',              population:  693491, area_km2:    454, disputed: false },
  { code: 'NO-11', country_code: 'NO', name: 'Rogaland',          population:  478140, area_km2:   9380, disputed: false },
  { code: 'NO-15', country_code: 'NO', name: 'Møre og Romsdal',   population:  265238, area_km2:  15104, disputed: false },
  { code: 'NO-18', country_code: 'NO', name: 'Nordland',          population:  241108, area_km2:  38455, disputed: false },
  { code: 'NO-30', country_code: 'NO', name: 'Viken',             population: 1241166, area_km2:  25280, disputed: false },
  { code: 'NO-34', country_code: 'NO', name: 'Innlandet',         population:  371385, area_km2:  49393, disputed: false },
  { code: 'NO-38', country_code: 'NO', name: 'Vestfold og Telemark', population: 421919, area_km2: 15305, disputed: false },
  { code: 'NO-42', country_code: 'NO', name: 'Agder',             population:  304611, area_km2:  16434, disputed: false },
  { code: 'NO-46', country_code: 'NO', name: 'Vestland',          population:  638460, area_km2:  33858, disputed: false },
  { code: 'NO-50', country_code: 'NO', name: 'Trøndelag',         population:  463988, area_km2:  41312, disputed: false },
  { code: 'NO-54', country_code: 'NO', name: 'Troms og Finnmark', population:  246024, area_km2:  75953, disputed: false },
];

// ── POLAND ───────────────────────────────────────────────────────────────────
// 16 voivodeships
const PL_PROVINCES = [
  { code: 'PL-02', country_code: 'PL', name: 'Lower Silesian',          population: 2901225, area_km2: 19947, disputed: false },
  { code: 'PL-04', country_code: 'PL', name: 'Kuyavian-Pomeranian',     population: 2086210, area_km2: 17971, disputed: false },
  { code: 'PL-06', country_code: 'PL', name: 'Lublin',                  population: 2117619, area_km2: 25122, disputed: false },
  { code: 'PL-08', country_code: 'PL', name: 'Lubusz',                  population: 1018074, area_km2: 13987, disputed: false },
  { code: 'PL-10', country_code: 'PL', name: 'Łódź',                   population: 2493603, area_km2: 18219, disputed: false },
  { code: 'PL-12', country_code: 'PL', name: 'Lesser Poland',           population: 3400577, area_km2: 15183, disputed: false },
  { code: 'PL-14', country_code: 'PL', name: 'Masovian',                population: 5423168, area_km2: 35558, disputed: false },
  { code: 'PL-16', country_code: 'PL', name: 'Opole',                   population:  996011, area_km2:  9412, disputed: false },
  { code: 'PL-18', country_code: 'PL', name: 'Subcarpathian',           population: 2127164, area_km2: 17845, disputed: false },
  { code: 'PL-20', country_code: 'PL', name: 'Podlaskie',               population: 1178353, area_km2: 20187, disputed: false },
  { code: 'PL-22', country_code: 'PL', name: 'Pomeranian',              population: 2333523, area_km2: 18293, disputed: false },
  { code: 'PL-24', country_code: 'PL', name: 'Silesian',                population: 4516974, area_km2: 12334, disputed: false },
  { code: 'PL-26', country_code: 'PL', name: 'Holy Cross',              population: 1257179, area_km2: 11711, disputed: false },
  { code: 'PL-28', country_code: 'PL', name: 'Warmian-Masurian',        population: 1439675, area_km2: 24173, disputed: false },
  { code: 'PL-30', country_code: 'PL', name: 'Greater Poland',          population: 3490353, area_km2: 29826, disputed: false },
  { code: 'PL-32', country_code: 'PL', name: 'West Pomeranian',         population: 1695680, area_km2: 22892, disputed: false },
];

// ── PORTUGAL ─────────────────────────────────────────────────────────────────
// 7 NUTS-2 regions + 2 autonomous regions
const PT_PROVINCES = [
  { code: 'PT-01', country_code: 'PT', name: 'Norte',                      population: 3573623, area_km2: 21286, disputed: false },
  { code: 'PT-02', country_code: 'PT', name: 'Centro',                     population: 2255737, area_km2: 28199, disputed: false },
  { code: 'PT-06', country_code: 'PT', name: 'Lisboa (Área Metropolitana)',population: 2871133, area_km2:  3015, disputed: false },
  { code: 'PT-07', country_code: 'PT', name: 'Alentejo',                   population:  757302, area_km2: 31605, disputed: false },
  { code: 'PT-08', country_code: 'PT', name: 'Algarve',                    population:  451006, area_km2:  4960, disputed: false },
  { code: 'PT-20', country_code: 'PT', name: 'Azores',                     population:  242796, area_km2:  2333, disputed: false },
  { code: 'PT-30', country_code: 'PT', name: 'Madeira',                    population:  254876, area_km2:   801, disputed: false },
];

// ── SERBIA ───────────────────────────────────────────────────────────────────
// 4 statistical regions (Kosovo excluded — separate country XK)
const RS_PROVINCES = [
  { code: 'RS-VO', country_code: 'RS', name: 'Vojvodina',                 population: 1931809, area_km2: 21506, disputed: false },
  { code: 'RS-BG', country_code: 'RS', name: 'Belgrade',                  population: 1694000, area_km2:  3234, disputed: false },
  { code: 'RS-SW', country_code: 'RS', name: 'Šumadija and Western Serbia',population: 2031697, area_km2: 26493, disputed: false },
  { code: 'RS-SE', country_code: 'RS', name: 'Southern and Eastern Serbia',population: 1563916, area_km2: 26241, disputed: false },
];

// ── SWEDEN ───────────────────────────────────────────────────────────────────
// 21 counties (lan)
const SE_PROVINCES = [
  { code: 'SE-AB', country_code: 'SE', name: 'Stockholm County',       population: 2377081, area_km2:  6519, disputed: false },
  { code: 'SE-AC', country_code: 'SE', name: 'Västerbotten County',    population:  271736, area_km2: 55185, disputed: false },
  { code: 'SE-BD', country_code: 'SE', name: 'Norrbotten County',      population:  249693, area_km2: 98244, disputed: false },
  { code: 'SE-C',  country_code: 'SE', name: 'Uppsala County',         population:  390579, area_km2:  8207, disputed: false },
  { code: 'SE-D',  country_code: 'SE', name: 'Södermanland County',    population:  303487, area_km2:  6103, disputed: false },
  { code: 'SE-E',  country_code: 'SE', name: 'Östergötland County',    population:  468963, area_km2: 10562, disputed: false },
  { code: 'SE-F',  country_code: 'SE', name: 'Jönköping County',       population:  363599, area_km2:  9944, disputed: false },
  { code: 'SE-G',  country_code: 'SE', name: 'Kronoberg County',       population:  201469, area_km2:  8457, disputed: false },
  { code: 'SE-H',  country_code: 'SE', name: 'Kalmar County',          population:  246563, area_km2: 11171, disputed: false },
  { code: 'SE-I',  country_code: 'SE', name: 'Gotland County',         population:   59686, area_km2:  3151, disputed: false },
  { code: 'SE-K',  country_code: 'SE', name: 'Blekinge County',        population:  160939, area_km2:  2941, disputed: false },
  { code: 'SE-M',  country_code: 'SE', name: 'Skåne County',           population: 1375016, area_km2: 11034, disputed: false },
  { code: 'SE-N',  country_code: 'SE', name: 'Halland County',         population:  337525, area_km2:  5452, disputed: false },
  { code: 'SE-O',  country_code: 'SE', name: 'Västra Götaland County', population: 1725881, area_km2: 23942, disputed: false },
  { code: 'SE-S',  country_code: 'SE', name: 'Värmland County',        population:  282423, area_km2: 17585, disputed: false },
  { code: 'SE-T',  country_code: 'SE', name: 'Örebro County',          population:  302258, area_km2:  8517, disputed: false },
  { code: 'SE-U',  country_code: 'SE', name: 'Västmanland County',     population:  273611, area_km2:  5144, disputed: false },
  { code: 'SE-W',  country_code: 'SE', name: 'Dalarna County',         population:  287972, area_km2: 28193, disputed: false },
  { code: 'SE-X',  country_code: 'SE', name: 'Gävleborg County',       population:  287829, area_km2: 18192, disputed: false },
  { code: 'SE-Y',  country_code: 'SE', name: 'Västernorrland County',  population:  243397, area_km2: 21684, disputed: false },
  { code: 'SE-Z',  country_code: 'SE', name: 'Jämtland County',        population:  130491, area_km2: 49443, disputed: false },
];

// ── SLOVAKIA ─────────────────────────────────────────────────────────────────
// 8 regions (kraje)
const SK_PROVINCES = [
  { code: 'SK-BC', country_code: 'SK', name: 'Banská Bystrica Region', population:  660939, area_km2:  9455, disputed: false },
  { code: 'SK-BL', country_code: 'SK', name: 'Bratislava Region',      population:  668801, area_km2:  2053, disputed: false },
  { code: 'SK-KI', country_code: 'SK', name: 'Košice Region',          population:  802092, area_km2:  6755, disputed: false },
  { code: 'SK-NI', country_code: 'SK', name: 'Nitra Region',           population:  689867, area_km2:  6344, disputed: false },
  { code: 'SK-PV', country_code: 'SK', name: 'Prešov Region',          population:  832518, area_km2:  8974, disputed: false },
  { code: 'SK-TC', country_code: 'SK', name: 'Trenčín Region',         population:  590369, area_km2:  4502, disputed: false },
  { code: 'SK-TA', country_code: 'SK', name: 'Trnava Region',          population:  566632, area_km2:  4148, disputed: false },
  { code: 'SK-ZI', country_code: 'SK', name: 'Žilina Region',          population:  694070, area_km2:  6809, disputed: false },
];

// ── SLOVENIA ─────────────────────────────────────────────────────────────────
// 12 statistical regions
const SI_PROVINCES = [
  { code: 'SI-GON', country_code: 'SI', name: 'Goriška',              population:  122947, area_km2: 2325, disputed: false },
  { code: 'SI-GOR', country_code: 'SI', name: 'Gorenjska',            population:  210250, area_km2: 2137, disputed: false },
  { code: 'SI-JVS', country_code: 'SI', name: 'Southeast Slovenia',   population:  143885, area_km2: 2675, disputed: false },
  { code: 'SI-KOR', country_code: 'SI', name: 'Carinthia',            population:   72946, area_km2: 1040, disputed: false },
  { code: 'SI-KPR', country_code: 'SI', name: 'Coastal-Karst',        population:  111978, area_km2: 1044, disputed: false },
  { code: 'SI-LJU', country_code: 'SI', name: 'Central Slovenia',     population:  556695, area_km2: 2555, disputed: false },
  { code: 'SI-PDR', country_code: 'SI', name: 'Podravska',            population:  322679, area_km2: 2170, disputed: false },
  { code: 'SI-PMR', country_code: 'SI', name: 'Pomurska',             population:  114552, area_km2: 1337, disputed: false },
  { code: 'SI-POD', country_code: 'SI', name: 'Posavska',             population:   75557, area_km2:  885, disputed: false },
  { code: 'SI-SAV', country_code: 'SI', name: 'Savinjska',            population:  260866, area_km2: 2384, disputed: false },
  { code: 'SI-SPO', country_code: 'SI', name: 'Lower Sava',           population:   70442, area_km2:  885, disputed: false },
  { code: 'SI-ZAS', country_code: 'SI', name: 'Zasavska',             population:   43814, area_km2:  264, disputed: false },
];

// ── SWITZERLAND ──────────────────────────────────────────────────────────────
// 26 cantons
const CH_PROVINCES = [
  { code: 'CH-AG', country_code: 'CH', name: 'Aargau',                  population:  694072, area_km2: 1404, disputed: false },
  { code: 'CH-AI', country_code: 'CH', name: 'Appenzell Innerrhoden',   population:   16145, area_km2:  172, disputed: false },
  { code: 'CH-AR', country_code: 'CH', name: 'Appenzell Ausserrhoden',  population:   55445, area_km2:  243, disputed: false },
  { code: 'CH-BE', country_code: 'CH', name: 'Bern',                    population: 1043132, area_km2: 5959, disputed: false },
  { code: 'CH-BL', country_code: 'CH', name: 'Basel-Landschaft',        population:  292271, area_km2:  518, disputed: false },
  { code: 'CH-BS', country_code: 'CH', name: 'Basel-Stadt',             population:  178120, area_km2:   37, disputed: false },
  { code: 'CH-FR', country_code: 'CH', name: 'Fribourg',                population:  328967, area_km2: 1671, disputed: false },
  { code: 'CH-GE', country_code: 'CH', name: 'Geneva',                  population:  504128, area_km2:  282, disputed: false },
  { code: 'CH-GL', country_code: 'CH', name: 'Glarus',                  population:   40504, area_km2:  685, disputed: false },
  { code: 'CH-GR', country_code: 'CH', name: 'Graubünden',             population:  200096, area_km2: 7105, disputed: false },
  { code: 'CH-JU', country_code: 'CH', name: 'Jura',                    population:   73584, area_km2:  838, disputed: false },
  { code: 'CH-LU', country_code: 'CH', name: 'Lucerne',                 population:  416347, area_km2: 1493, disputed: false },
  { code: 'CH-NE', country_code: 'CH', name: 'Neuchâtel',              population:  176496, area_km2:  803, disputed: false },
  { code: 'CH-NW', country_code: 'CH', name: 'Nidwalden',               population:   43223, area_km2:  276, disputed: false },
  { code: 'CH-OW', country_code: 'CH', name: 'Obwalden',                population:   37842, area_km2:  491, disputed: false },
  { code: 'CH-SG', country_code: 'CH', name: 'St. Gallen',              population:  510734, area_km2: 2026, disputed: false },
  { code: 'CH-SH', country_code: 'CH', name: 'Schaffhausen',            population:   82559, area_km2:  298, disputed: false },
  { code: 'CH-SO', country_code: 'CH', name: 'Solothurn',               population:  275247, area_km2:  791, disputed: false },
  { code: 'CH-SZ', country_code: 'CH', name: 'Schwyz',                  population:  160480, area_km2:  908, disputed: false },
  { code: 'CH-TG', country_code: 'CH', name: 'Thurgau',                 population:  279547, area_km2:  991, disputed: false },
  { code: 'CH-TI', country_code: 'CH', name: 'Ticino',                  population:  353343, area_km2: 2812, disputed: false },
  { code: 'CH-UR', country_code: 'CH', name: 'Uri',                     population:   36703, area_km2: 1077, disputed: false },
  { code: 'CH-VD', country_code: 'CH', name: 'Vaud',                    population:  805098, area_km2: 3212, disputed: false },
  { code: 'CH-VS', country_code: 'CH', name: 'Valais',                  population:  345525, area_km2: 5224, disputed: false },
  { code: 'CH-ZG', country_code: 'CH', name: 'Zug',                     population:  127642, area_km2:  239, disputed: false },
  { code: 'CH-ZH', country_code: 'CH', name: 'Zurich',                  population: 1553423, area_km2: 1729, disputed: false },
];

// ── UKRAINE ──────────────────────────────────────────────────────────────────
// 25 oblasts + Kyiv city + Sevastopol (disputed/occupied)
const UA_PROVINCES = [
  { code: 'UA-05', country_code: 'UA', name: 'Vinnytsia Oblast',        population: 1560396, area_km2: 26513, disputed: false },
  { code: 'UA-07', country_code: 'UA', name: 'Volyn Oblast',            population: 1037127, area_km2: 20144, disputed: false },
  { code: 'UA-12', country_code: 'UA', name: 'Dnipropetrovsk Oblast',   population: 3206477, area_km2: 31914, disputed: false },
  { code: 'UA-14', country_code: 'UA', name: 'Donetsk Oblast',          population: 4165901, area_km2: 26517, disputed: false },
  { code: 'UA-18', country_code: 'UA', name: 'Zhytomyr Oblast',         population: 1220193, area_km2: 29832, disputed: false },
  { code: 'UA-21', country_code: 'UA', name: 'Zakarpattia Oblast',      population: 1255759, area_km2: 12777, disputed: false },
  { code: 'UA-23', country_code: 'UA', name: 'Zaporizhzhia Oblast',     population: 1705836, area_km2: 27180, disputed: false },
  { code: 'UA-26', country_code: 'UA', name: 'Ivano-Frankivsk Oblast',  population: 1373252, area_km2: 13928, disputed: false },
  { code: 'UA-30', country_code: 'UA', name: 'Kyiv (city)',             population: 2967360, area_km2:   839, disputed: false },
  { code: 'UA-32', country_code: 'UA', name: 'Kyiv Oblast',             population: 1727561, area_km2: 28131, disputed: false },
  { code: 'UA-35', country_code: 'UA', name: 'Kirovohrad Oblast',       population: 944476,  area_km2: 24588, disputed: false },
  { code: 'UA-09', country_code: 'UA', name: 'Luhansk Oblast',          population: 2150328, area_km2: 26684, disputed: false },
  { code: 'UA-46', country_code: 'UA', name: 'Lviv Oblast',             population: 2521384, area_km2: 21833, disputed: false },
  { code: 'UA-48', country_code: 'UA', name: 'Mykolaiv Oblast',         population: 1117066, area_km2: 24598, disputed: false },
  { code: 'UA-51', country_code: 'UA', name: 'Odessa Oblast',           population: 2380308, area_km2: 33310, disputed: false },
  { code: 'UA-53', country_code: 'UA', name: 'Poltava Oblast',          population: 1400370, area_km2: 28748, disputed: false },
  { code: 'UA-56', country_code: 'UA', name: 'Rivne Oblast',            population: 1156362, area_km2: 20047, disputed: false },
  { code: 'UA-59', country_code: 'UA', name: 'Sumy Oblast',             population: 1057172, area_km2: 23834, disputed: false },
  { code: 'UA-61', country_code: 'UA', name: 'Ternopil Oblast',         population: 1041168, area_km2: 13823, disputed: false },
  { code: 'UA-63', country_code: 'UA', name: 'Kharkiv Oblast',          population: 2652440, area_km2: 31415, disputed: false },
  { code: 'UA-65', country_code: 'UA', name: 'Kherson Oblast',          population: 1017139, area_km2: 28461, disputed: false },
  { code: 'UA-68', country_code: 'UA', name: 'Khmelnytskyi Oblast',     population: 1259486, area_km2: 20645, disputed: false },
  { code: 'UA-71', country_code: 'UA', name: 'Cherkasy Oblast',         population: 1196086, area_km2: 20916, disputed: false },
  { code: 'UA-74', country_code: 'UA', name: 'Chernivtsi Oblast',       population:  899706, area_km2:  8097, disputed: false },
  { code: 'UA-77', country_code: 'UA', name: 'Chernihiv Oblast',        population: 1002895, area_km2: 31865, disputed: false },
  { code: 'UA-43', country_code: 'UA', name: 'Sevastopol (Crimea)',     population:  509992, area_km2: 27000, disputed: true  },
];

// ── Collect all new provinces ─────────────────────────────────────────────────
const PROVINCES = [
  ...CA_PROVINCES,
  ...AU_PROVINCES,
  ...AL_PROVINCES,
  ...BA_PROVINCES,
  ...BE_PROVINCES,
  ...BG_PROVINCES,
  ...BY_PROVINCES,
  ...CH_PROVINCES,
  ...CY_PROVINCES,
  ...DK_PROVINCES,
  ...EE_PROVINCES,
  ...FI_PROVINCES,
  ...GR_PROVINCES,
  ...HR_PROVINCES,
  ...HU_PROVINCES,
  ...IE_PROVINCES,
  ...IS_PROVINCES,
  ...LT_PROVINCES,
  ...LU_PROVINCES,
  ...LV_PROVINCES,
  ...MD_PROVINCES,
  ...ME_PROVINCES,
  ...MK_PROVINCES,
  ...MT_PROVINCES,
  ...NO_PROVINCES,
  ...PL_PROVINCES,
  ...PT_PROVINCES,
  ...RS_PROVINCES,
  ...SE_PROVINCES,
  ...SI_PROVINCES,
  ...SK_PROVINCES,
  ...UA_PROVINCES,
  ...XK_PROVINCES,
];

// ── CITIES ───────────────────────────────────────────────────────────────────
// Cities for countries that don't yet have any city records.
// CA and AU already have cities in the seeds.
const CITIES = [
  // Albania
  { country_code: 'AL', name: 'Tirana',    population: 763634 },
  { country_code: 'AL', name: 'Durrës',    population: 175110 },
  { country_code: 'AL', name: 'Vlorë',     population: 141714 },
  { country_code: 'AL', name: 'Shkodër',   population:  98000 },
  // Belarus
  { country_code: 'BY', name: 'Minsk',     population: 1982444 },
  { country_code: 'BY', name: 'Homel',     population:  481000 },
  { country_code: 'BY', name: 'Mahilyow',  population:  370000 },
  { country_code: 'BY', name: 'Vitebsk',   population:  364000 },
  { country_code: 'BY', name: 'Hrodna',    population:  366000 },
  // Belgium
  { country_code: 'BE', name: 'Brussels',  population: 1208542 },
  { country_code: 'BE', name: 'Antwerp',   population:  530504 },
  { country_code: 'BE', name: 'Ghent',     population:  264624 },
  { country_code: 'BE', name: 'Charleroi', population:  202598 },
  { country_code: 'BE', name: 'Liège',     population:  197013 },
  { country_code: 'BE', name: 'Bruges',    population:  119453 },
  // Bosnia and Herzegovina
  { country_code: 'BA', name: 'Sarajevo',  population:  275524 },
  { country_code: 'BA', name: 'Banja Luka',population:  185042 },
  { country_code: 'BA', name: 'Tuzla',     population:  120441 },
  // Bulgaria
  { country_code: 'BG', name: 'Sofia',     population: 1307376 },
  { country_code: 'BG', name: 'Plovdiv',   population:  346893 },
  { country_code: 'BG', name: 'Varna',     population:  336505 },
  { country_code: 'BG', name: 'Burgas',    population:  213406 },
  { country_code: 'BG', name: 'Stara Zagora', population: 138272 },
  // Croatia
  { country_code: 'HR', name: 'Zagreb',    population:  790017 },
  { country_code: 'HR', name: 'Split',     population:  167121 },
  { country_code: 'HR', name: 'Rijeka',    population:  128624 },
  { country_code: 'HR', name: 'Osijek',    population:  108048 },
  { country_code: 'HR', name: 'Dubrovnik', population:   42615 },
  // Cyprus
  { country_code: 'CY', name: 'Nicosia',   population:  269612 },
  { country_code: 'CY', name: 'Limassol',  population:  183658 },
  { country_code: 'CY', name: 'Larnaca',   population:   84591 },
  { country_code: 'CY', name: 'Paphos',    population:   36278 },
  // Denmark
  { country_code: 'DK', name: 'Copenhagen',population:  794128 },
  { country_code: 'DK', name: 'Aarhus',    population:  349983 },
  { country_code: 'DK', name: 'Odense',    population:  204895 },
  { country_code: 'DK', name: 'Aalborg',   population:  114194 },
  // Estonia
  { country_code: 'EE', name: 'Tallinn',   population:  437619 },
  { country_code: 'EE', name: 'Tartu',     population:   93865 },
  { country_code: 'EE', name: 'Narva',     population:   55462 },
  { country_code: 'EE', name: 'Pärnu',     population:   51000 },
  // Finland
  { country_code: 'FI', name: 'Helsinki',  population:  648042 },
  { country_code: 'FI', name: 'Espoo',     population:  292913 },
  { country_code: 'FI', name: 'Tampere',   population:  238140 },
  { country_code: 'FI', name: 'Vantaa',    population:  229593 },
  { country_code: 'FI', name: 'Oulu',      population:  208000 },
  { country_code: 'FI', name: 'Turku',     population:  193000 },
  // Greece
  { country_code: 'GR', name: 'Athens',    population:  664046 },
  { country_code: 'GR', name: 'Thessaloniki', population: 325182 },
  { country_code: 'GR', name: 'Patras',    population:  213984 },
  { country_code: 'GR', name: 'Heraklion', population:  173993 },
  { country_code: 'GR', name: 'Larissa',   population:  163358 },
  // Hungary
  { country_code: 'HU', name: 'Budapest',  population: 1752286 },
  { country_code: 'HU', name: 'Debrecen',  population:  202000 },
  { country_code: 'HU', name: 'Miskolc',   population:  167754 },
  { country_code: 'HU', name: 'Szeged',    population:  161879 },
  { country_code: 'HU', name: 'Pécs',      population:  145347 },
  // Iceland
  { country_code: 'IS', name: 'Reykjavik', population:  131136 },
  { country_code: 'IS', name: 'Kópavogur', population:   38000 },
  // Ireland
  { country_code: 'IE', name: 'Dublin',    population:  553165 },
  { country_code: 'IE', name: 'Cork',      population:  210000 },
  { country_code: 'IE', name: 'Limerick',  population:   94192 },
  { country_code: 'IE', name: 'Galway',    population:   80000 },
  // Kosovo
  { country_code: 'XK', name: 'Pristina',  population:  198000 },
  { country_code: 'XK', name: 'Prizren',   population:  105000 },
  // Latvia
  { country_code: 'LV', name: 'Riga',      population:  614618 },
  { country_code: 'LV', name: 'Daugavpils',population:   84267 },
  { country_code: 'LV', name: 'Liepāja',  population:   69900 },
  // Lithuania
  { country_code: 'LT', name: 'Vilnius',   population:  574147 },
  { country_code: 'LT', name: 'Kaunas',    population:  299436 },
  { country_code: 'LT', name: 'Klaipėda', population:  149257 },
  // Luxembourg
  { country_code: 'LU', name: 'Luxembourg City', population: 133690 },
  { country_code: 'LU', name: 'Esch-sur-Alzette', population: 36000 },
  // Moldova
  { country_code: 'MD', name: 'Chișinău', population:  795000 },
  { country_code: 'MD', name: 'Tiraspol',  population:  133807 },
  { country_code: 'MD', name: 'Bălți',    population:   97000 },
  // Montenegro
  { country_code: 'ME', name: 'Podgorica', population:  150977 },
  { country_code: 'ME', name: 'Nikšić',   population:   56970 },
  // North Macedonia
  { country_code: 'MK', name: 'Skopje',   population:  526502 },
  { country_code: 'MK', name: 'Bitola',   population:   95385 },
  { country_code: 'MK', name: 'Kumanovo', population:   76530 },
  // Malta
  { country_code: 'MT', name: 'Valletta', population:   5827 },
  { country_code: 'MT', name: 'Birkirkara',population: 22634 },
  { country_code: 'MT', name: 'Victoria', population:  6687 },
  // Norway
  { country_code: 'NO', name: 'Oslo',      population:  693491 },
  { country_code: 'NO', name: 'Bergen',    population:  283929 },
  { country_code: 'NO', name: 'Stavanger', population:  144996 },
  { country_code: 'NO', name: 'Trondheim', population:  205032 },
  { country_code: 'NO', name: 'Tromsø',   population:   77726 },
  // Poland
  { country_code: 'PL', name: 'Warsaw',   population: 1793579 },
  { country_code: 'PL', name: 'Kraków',   population:  779115 },
  { country_code: 'PL', name: 'Łódź',    population:  679941 },
  { country_code: 'PL', name: 'Wrocław', population:  641928 },
  { country_code: 'PL', name: 'Poznań',  population:  538633 },
  { country_code: 'PL', name: 'Gdańsk',  population:  470907 },
  { country_code: 'PL', name: 'Szczecin', population:  399000 },
  // Portugal
  { country_code: 'PT', name: 'Lisbon',    population:  505526 },
  { country_code: 'PT', name: 'Porto',     population:  237584 },
  { country_code: 'PT', name: 'Braga',     population:  193333 },
  { country_code: 'PT', name: 'Amadora',   population:  175872 },
  { country_code: 'PT', name: 'Funchal',   population:  111892 },
  // Serbia
  { country_code: 'RS', name: 'Belgrade',  population: 1694000 },
  { country_code: 'RS', name: 'Novi Sad',  population:  289128 },
  { country_code: 'RS', name: 'Niš',      population:  183164 },
  { country_code: 'RS', name: 'Kragujevac',population:  179000 },
  // Sweden
  { country_code: 'SE', name: 'Stockholm', population:  979264 },
  { country_code: 'SE', name: 'Gothenburg',population:  583056 },
  { country_code: 'SE', name: 'Malmö',    population:  347949 },
  { country_code: 'SE', name: 'Uppsala',   population:  233839 },
  { country_code: 'SE', name: 'Västerås', population:  155477 },
  // Slovakia
  { country_code: 'SK', name: 'Bratislava',population:  475503 },
  { country_code: 'SK', name: 'Košice',   population:  238593 },
  { country_code: 'SK', name: 'Prešov',   population:   92146 },
  // Slovenia
  { country_code: 'SI', name: 'Ljubljana', population:  286745 },
  { country_code: 'SI', name: 'Maribor',   population:  112325 },
  { country_code: 'SI', name: 'Celje',     population:   49708 },
  { country_code: 'SI', name: 'Kranj',     population:   56000 },
  // Ukraine
  { country_code: 'UA', name: 'Kyiv',      population: 2967360 },
  { country_code: 'UA', name: 'Kharkiv',   population: 1433886 },
  { country_code: 'UA', name: 'Odessa',    population: 1015826 },
  { country_code: 'UA', name: 'Dnipro',    population:  980948 },
  { country_code: 'UA', name: 'Donetsk',   population:  901645 },
  { country_code: 'UA', name: 'Zaporizhzhia', population: 722713 },
  { country_code: 'UA', name: 'Lviv',      population:  721301 },
];

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  const crypto = require('crypto');

  const countryCount = await knex('countries').count('* as count').first();
  if (parseInt(countryCount.count, 10) === 0) {
    console.log('Migration: countries table empty (fresh DB), seeds will handle provinces/cities.');
    return;
  }

  // ── Provinces ──────────────────────────────────────────────────────────────
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
    console.log(`Migration: inserted ${newProvinces.length} provinces for v1.4 expansion.`);
  } else {
    console.log('Migration: all v1.4 provinces already present, skipping.');
  }

  // ── Cities ─────────────────────────────────────────────────────────────────
  const targetCountryCodes = [...new Set(CITIES.map(c => c.country_code))];
  const existingCityCountries = new Set(
    (await knex('cities').whereIn('country_code', targetCountryCodes).distinct('country_code').select('country_code'))
      .map(r => r.country_code),
  );
  const newCities = CITIES
    .filter(c => !existingCityCountries.has(c.country_code))
    .map(c => ({ id: crypto.randomUUID(), ...c }));

  if (newCities.length > 0) {
    const batchSize = 50;
    await knex.transaction(async (trx) => {
      for (let i = 0; i < newCities.length; i += batchSize) {
        await trx('cities').insert(newCities.slice(i, i + batchSize));
      }
    });
    console.log(`Migration: inserted ${newCities.length} cities for v1.4 expansion.`);
  } else {
    console.log('Migration: all v1.4 cities already present, skipping.');
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
