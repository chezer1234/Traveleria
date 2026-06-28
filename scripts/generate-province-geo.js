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
  // Tier 2 additions
  'AT', 'NL', 'CZ', 'NZ', 'RO', 'PE',
  // V1.4: Canada, Australia, all Europe
  'CA', 'AU',
  'AL', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'DK', 'EE', 'FI',
  'GR', 'HR', 'HU', 'IE', 'IS', 'LT', 'LU', 'LV', 'MD', 'ME',
  'MK', 'MT', 'NO', 'PL', 'PT', 'RS', 'SE', 'SI', 'SK', 'UA', 'XK',
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

// Turkey: 81 provinces → 12 NUTS-1 regions (using our DB alphabetic codes)
const TR_PROV_TO_NUTS1 = {};
const TR_NUTS1 = {
  'TR-IST': { name: 'Istanbul',             codes: ['TR-34'] },
  'TR-WMA': { name: 'West Marmara',         codes: ['TR-10','TR-17','TR-22','TR-39','TR-59','TR-11','TR-14'] },
  'TR-AEG': { name: 'Aegean',               codes: ['TR-03','TR-09','TR-20','TR-35','TR-45','TR-48','TR-64','TR-15'] },
  'TR-EMA': { name: 'East Marmara',         codes: ['TR-16','TR-26','TR-41','TR-43','TR-53','TR-77','TR-81','TR-74'] },
  'TR-WAN': { name: 'West Anatolia',        codes: ['TR-06','TR-42','TR-05','TR-68','TR-70','TR-71','TR-25'] },
  'TR-MED': { name: 'Mediterranean',        codes: ['TR-07','TR-32','TR-33','TR-01','TR-31','TR-80','TR-46'] },
  'TR-CAN': { name: 'Central Anatolia',     codes: ['TR-18','TR-19','TR-37','TR-40','TR-50','TR-51','TR-52','TR-55','TR-58','TR-60','TR-66','TR-72','TR-38'] },
  'TR-WBS': { name: 'West Black Sea',       codes: ['TR-28','TR-61','TR-67','TR-78'] },
  'TR-EBS': { name: 'East Black Sea',       codes: ['TR-08','TR-29','TR-36','TR-53','TR-54','TR-62'] },
  'TR-NEA': { name: 'Northeast Anatolia',   codes: ['TR-04','TR-24','TR-25','TR-44','TR-46','TR-49','TR-69','TR-75'] },
  'TR-CEA': { name: 'Central East Anatolia',codes: ['TR-12','TR-13','TR-23','TR-76','TR-02','TR-21','TR-30','TR-79','TR-65'] },
  'TR-SEA': { name: 'Southeast Anatolia',   codes: ['TR-27','TR-47','TR-56','TR-63','TR-73'] },
};
for (const [nutsCode, { codes }] of Object.entries(TR_NUTS1)) {
  for (const provCode of codes) TR_PROV_TO_NUTS1[provCode] = nutsCode;
}

// Norway: 19 pre-2018 counties → 11 post-2018 regions (our DB codes)
const NO_OLD_TO_NEW = {};
const NO_REGIONS = {
  'NO-03': { name: 'Oslo',                  codes: ['NO-03'] },
  'NO-11': { name: 'Rogaland',              codes: ['NO-11'] },
  'NO-15': { name: 'Møre og Romsdal',       codes: ['NO-15'] },
  'NO-18': { name: 'Nordland',              codes: ['NO-18'] },
  'NO-30': { name: 'Viken',                 codes: ['NO-01','NO-02','NO-06'] },
  'NO-34': { name: 'Innlandet',             codes: ['NO-04','NO-05'] },
  'NO-38': { name: 'Vestfold og Telemark',  codes: ['NO-07','NO-08'] },
  'NO-42': { name: 'Agder',                 codes: ['NO-09','NO-10'] },
  'NO-46': { name: 'Vestland',              codes: ['NO-12','NO-14'] },
  'NO-50': { name: 'Trøndelag',             codes: ['NO-16','NO-17'] },
  'NO-54': { name: 'Troms og Finnmark',     codes: ['NO-19','NO-20'] },
  // NO-21 (Svalbard) and NO-X01~ (Bouvet Island) are intentionally excluded
};
for (const [regionCode, { codes }] of Object.entries(NO_REGIONS)) {
  for (const oldCode of codes) NO_OLD_TO_NEW[oldCode] = regionCode;
}

// North Macedonia: 84 municipalities → 8 planning regions (our DB codes)
const MK_MUN_TO_REGION = {
  // Vardar Region (MK-01)
  'MK-13':'MK-01','MK-20':'MK-01','MK-24':'MK-01','MK-36':'MK-01',
  'MK-49':'MK-01','MK-54':'MK-01','MK-67':'MK-01','MK-69':'MK-01','MK-80':'MK-01',
  // East Region (MK-02)
  'MK-03':'MK-02','MK-14':'MK-02','MK-23':'MK-02','MK-33':'MK-02','MK-37':'MK-02',
  'MK-42':'MK-02','MK-51':'MK-02','MK-60':'MK-02','MK-63':'MK-02','MK-81':'MK-02','MK-83':'MK-02',
  // Southwest Region (MK-03)
  'MK-12':'MK-03','MK-15':'MK-03','MK-21':'MK-03','MK-22':'MK-03','MK-28':'MK-03',
  'MK-31':'MK-03','MK-40':'MK-03','MK-50':'MK-03','MK-52':'MK-03','MK-57':'MK-03',
  'MK-58':'MK-03','MK-61':'MK-03','MK-72':'MK-03','MK-78':'MK-03',
  // Southeast Region (MK-04)
  'MK-05':'MK-04','MK-07':'MK-04','MK-10':'MK-04','MK-11':'MK-04','MK-18':'MK-04',
  'MK-26':'MK-04','MK-41':'MK-04','MK-56':'MK-04','MK-64':'MK-04','MK-73':'MK-04',
  // Pelagonia Region (MK-05)
  'MK-04':'MK-05','MK-25':'MK-05','MK-27':'MK-05','MK-45':'MK-05','MK-46':'MK-05',
  'MK-53':'MK-05','MK-55':'MK-05','MK-62':'MK-05','MK-66':'MK-05',
  // Polog Region (MK-06)
  'MK-06':'MK-06','MK-08':'MK-06','MK-16':'MK-06','MK-19':'MK-06',
  'MK-30':'MK-06','MK-35':'MK-06','MK-75':'MK-06','MK-76':'MK-06',
  // Northeast Region (MK-07)
  'MK-43':'MK-07','MK-44':'MK-07','MK-47':'MK-07','MK-48':'MK-07','MK-65':'MK-07','MK-71':'MK-07',
  // Skopje Region (MK-08)
  'MK-01':'MK-08','MK-02':'MK-08','MK-09':'MK-08','MK-17':'MK-08','MK-29':'MK-08',
  'MK-32':'MK-08','MK-34':'MK-08','MK-38':'MK-08','MK-39':'MK-08','MK-68':'MK-08',
  'MK-70':'MK-08','MK-74':'MK-08','MK-77':'MK-08','MK-79':'MK-08','MK-82':'MK-08',
  'MK-84':'MK-08','MK-85':'MK-08',
};
const MK_REGION_NAMES = {
  'MK-01':'Vardar Region','MK-02':'East Region','MK-03':'Southwest Region',
  'MK-04':'Southeast Region','MK-05':'Pelagonia Region','MK-06':'Polog Region',
  'MK-07':'Northeast Region','MK-08':'Skopje Region',
};

// UK: counties/regions → 4 nations
const GB_NAME_TO_NATION = {};
// Will use the 'region' property from NE data

const GB_NATIONS = { 'GB-ENG': 'England', 'GB-SCT': 'Scotland', 'GB-WLS': 'Wales', 'GB-NIR': 'Northern Ireland' };

// Philippines: NE has many sub-provinces — we use 82 province codes (ISO 3166-2)
// These should match directly since NE iso_3166_2 matches our codes

// Romania: 42 county features → 8 development regions
const RO_COUNTY_TO_REGION = {
  'RO-BH':'RO-NW','RO-BN':'RO-NW','RO-CJ':'RO-NW','RO-MM':'RO-NW','RO-SM':'RO-NW','RO-SJ':'RO-NW',
  'RO-AB':'RO-CE','RO-BV':'RO-CE','RO-CV':'RO-CE','RO-HR':'RO-CE','RO-MS':'RO-CE','RO-SB':'RO-CE',
  'RO-BC':'RO-NE','RO-BT':'RO-NE','RO-IS':'RO-NE','RO-NT':'RO-NE','RO-SV':'RO-NE','RO-VS':'RO-NE','RO-VN':'RO-NE',
  'RO-BR':'RO-SE','RO-BZ':'RO-SE','RO-CT':'RO-SE','RO-GL':'RO-SE','RO-TL':'RO-SE',
  'RO-AG':'RO-SM','RO-CL':'RO-SM','RO-DB':'RO-SM','RO-GR':'RO-SM','RO-IL':'RO-SM','RO-PH':'RO-SM','RO-TR':'RO-SM',
  'RO-B':'RO-BU','RO-IF':'RO-BU',
  'RO-DJ':'RO-SW','RO-GJ':'RO-SW','RO-MH':'RO-SW','RO-OT':'RO-SW','RO-VL':'RO-SW',
  'RO-AR':'RO-WS','RO-CS':'RO-WS','RO-HD':'RO-WS','RO-TM':'RO-WS',
};
const RO_REGION_NAMES = {
  'RO-NW':'North-West','RO-CE':'Centre','RO-NE':'North-East','RO-SE':'South-East',
  'RO-SM':'South Muntenia','RO-BU':'Bucharest-Ilfov','RO-SW':'South-West Oltenia','RO-WS':'West',
};

// Bulgaria: 28 oblasts → 6 NUTS-2 planning regions
const BG_OBLAST_TO_REGION = {
  'BG-24':'BG-NW','BG-09':'BG-NW','BG-26':'BG-NW','BG-08':'BG-NW','BG-12':'BG-NW',
  'BG-15':'BG-NC','BG-14':'BG-NC','BG-23':'BG-NC','BG-04':'BG-NC','BG-25':'BG-NC',
  'BG-03':'BG-NE','BG-05':'BG-NE','BG-16':'BG-NE','BG-17':'BG-NE',
  'BG-02':'BG-SE','BG-27':'BG-SE','BG-18':'BG-SE','BG-22':'BG-SE',
  'BG-13':'BG-SC','BG-06':'BG-SC','BG-19':'BG-SC','BG-28':'BG-SC','BG-10':'BG-SC',
  'BG-20':'BG-SW','BG-21':'BG-SW','BG-01':'BG-SW','BG-11':'BG-SW','BG-07':'BG-SW',
};
const BG_REGION_NAMES = {
  'BG-NW':'Northwest','BG-NC':'North-Central','BG-NE':'Northeast',
  'BG-SE':'Southeast','BG-SC':'South-Central','BG-SW':'Southwest',
};

// Ireland: 26 counties → 4 historical provinces
const IE_COUNTY_TO_PROVINCE = {
  // Connacht
  'IE-G':'IE-C','IE-LM':'IE-C','IE-MO':'IE-C','IE-RN':'IE-C','IE-SO':'IE-C',
  // Leinster
  'IE-CW':'IE-L','IE-D':'IE-L','IE-KE':'IE-L','IE-KK':'IE-L','IE-LS':'IE-L',
  'IE-LD':'IE-L','IE-LH':'IE-L','IE-MH':'IE-L','IE-OY':'IE-L','IE-WH':'IE-L',
  'IE-WX':'IE-L','IE-WW':'IE-L',
  // Munster
  'IE-CE':'IE-M','IE-CO':'IE-M','IE-KY':'IE-M','IE-LK':'IE-M','IE-TA':'IE-M','IE-WD':'IE-M',
  // Ulster (Republic counties only)
  'IE-CN':'IE-U','IE-DL':'IE-U','IE-MN':'IE-U',
};
const IE_PROVINCE_NAMES = {
  'IE-C':'Connacht','IE-L':'Leinster','IE-M':'Munster','IE-U':'Ulster',
};

// Portugal: 18 districts + 2 autonomous regions → 7 NUTS-2 regions
// NE uses district-level ISO 3166-2 codes; our provinces use custom NUTS-2 codes
const PT_DISTRICT_TO_PROVINCE = {
  // Norte (PT-01)
  'PT-16':'PT-01','PT-03':'PT-01','PT-13':'PT-01','PT-17':'PT-01','PT-04':'PT-01',
  // Centro (PT-02)
  'PT-01':'PT-02','PT-06':'PT-02','PT-10':'PT-02','PT-18':'PT-02','PT-09':'PT-02','PT-05':'PT-02',
  // Lisboa (PT-06)
  'PT-11':'PT-06','PT-15':'PT-06',
  // Alentejo (PT-07)
  'PT-07':'PT-07','PT-02':'PT-07','PT-12':'PT-07','PT-14':'PT-07',
  // Algarve (PT-08)
  'PT-08':'PT-08',
  // Azores (PT-20) and Madeira (PT-30) match directly
  'PT-20':'PT-20','PT-30':'PT-30',
};
const PT_PROVINCE_NAMES = {
  'PT-01':'Norte','PT-02':'Centro','PT-06':'Lisboa (Área Metropolitana)',
  'PT-07':'Alentejo','PT-08':'Algarve','PT-20':'Azores','PT-30':'Madeira',
};

// ── Merge config: which countries need feature merging? ──────────────────────

const MERGE_CONFIGS = {
  FR: { map: FR_DEPT_TO_REGION, names: FR_REGION_NAMES },
  IT: { map: IT_PROV_TO_REGION, names: Object.fromEntries(Object.entries(IT_REGIONS).map(([k,v]) => [k, v.name])) },
  ES: { map: ES_PROV_TO_COMMUNITY, names: Object.fromEntries(Object.entries(ES_COMMUNITIES).map(([k,v]) => [k, v.name])) },
  TH: { map: TH_PROV_TO_GROUP, names: Object.fromEntries(Object.entries(TH_GROUPS).map(([k,v]) => [k, v.name])) },
  TR: { map: TR_PROV_TO_NUTS1, names: Object.fromEntries(Object.entries(TR_NUTS1).map(([k,v]) => [k, v.name])) },
  NO: { map: NO_OLD_TO_NEW, names: Object.fromEntries(Object.entries(NO_REGIONS).map(([k,v]) => [k, v.name])) },
  MK: { map: MK_MUN_TO_REGION, names: MK_REGION_NAMES },
  RO: { map: RO_COUNTY_TO_REGION, names: RO_REGION_NAMES },
  BG: { map: BG_OBLAST_TO_REGION, names: BG_REGION_NAMES },
  IE: { map: IE_COUNTY_TO_PROVINCE, names: IE_PROVINCE_NAMES },
  PT: { map: PT_DISTRICT_TO_PROVINCE, names: PT_PROVINCE_NAMES },
};

// Countries where NE codes match our codes but some features should be excluded
// (overseas territories, remote islands, etc.)
const ALLOWED_CODES = {
  NL: new Set(['NL-DR','NL-FL','NL-FR','NL-GE','NL-GR','NL-LI','NL-NB','NL-NH','NL-OV','NL-UT','NL-ZE','NL-ZH']),
  NZ: new Set(['NZ-NTL','NZ-AUK','NZ-WKO','NZ-BOP','NZ-GIS','NZ-HKB','NZ-TKI','NZ-MWT','NZ-WGN','NZ-TAS','NZ-NSN','NZ-MBH','NZ-WTC','NZ-CAN','NZ-OTA','NZ-STL']),
  AU: new Set(['AU-NSW','AU-QLD','AU-SA','AU-TAS','AU-VIC','AU-WA','AU-ACT','AU-NT']),
  // GR: exclude Mount Athos (GR-69) which NE treats as a separate entity
  GR: new Set(['GR-A','GR-B','GR-C','GR-D','GR-E','GR-F','GR-G','GR-H','GR-I','GR-J','GR-K','GR-L','GR-M']),
  // HU: NE includes county-level cities carved out of counties; only keep the 20 county regions + Budapest
  // (HU-TO is renamed to HU-TE above before this filter runs)
  HU: new Set(['HU-BA','HU-BE','HU-BK','HU-BU','HU-BZ','HU-CS','HU-FE','HU-GS','HU-HB','HU-HE',
               'HU-JN','HU-KE','HU-NO','HU-PE','HU-SO','HU-SZ','HU-TE','HU-VA','HU-VE','HU-ZA']),
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
      const allowed = ALLOWED_CODES[cc]; // undefined = allow all
      let seenLim = false;
      outputFeatures = features
        .map(f => {
          let code = f.properties.iso_3166_2 || `${cc}-${f.properties.postal || 'XX'}`;
          // CZ: NE uses CZ-ST for Central Bohemian; our seed uses CZ-SC
          if (cc === 'CZ' && code === 'CZ-ST') code = 'CZ-SC';
          // GR: NE uses GR-A1 for Attica; our seed uses GR-I
          if (cc === 'GR' && code === 'GR-A1') code = 'GR-I';
          // IS: NE has IS-0 (Reykjavík city) as separate from IS-1 (Capital Region); merge to IS-1
          if (cc === 'IS' && code === 'IS-0') code = 'IS-1';
          // PE: two NE features share code PE-LIM — Lima Province → PE-LMA
          if (cc === 'PE' && code === 'PE-LIM') {
            const name = (f.properties.name || '');
            if (name.includes('Province') || seenLim) { code = 'PE-LMA'; } else { seenLim = true; }
          }
          // AL: NE uses numeric codes (AL-01..12); our seed uses ISO alphabetic codes
          if (cc === 'AL') {
            const AL_RENAME = {
              'AL-01':'AL-BR','AL-02':'AL-DU','AL-03':'AL-EL','AL-04':'AL-FI',
              'AL-05':'AL-GJ','AL-06':'AL-KO','AL-07':'AL-KU','AL-08':'AL-LE',
              'AL-09':'AL-DI','AL-10':'AL-SH','AL-11':'AL-TI','AL-12':'AL-VL',
            };
            if (AL_RENAME[code]) code = AL_RENAME[code];
          }
          // DK: NE uses ISO-correct codes; our seed uses different codes for 4 of 5 regions
          if (cc === 'DK') {
            const DK_RENAME = {
              'DK-82':'DK-84', // Midtjylland → Central Denmark
              'DK-83':'DK-85', // Syddanmark → Southern Denmark
              'DK-84':'DK-01', // Hovedstaden → Capital Region
              'DK-85':'DK-82', // Sjælland → Zealand
            };
            if (DK_RENAME[code]) code = DK_RENAME[code];
          }
          // HU: NE uses HU-TO for Tolna County; our seed uses HU-TE
          if (cc === 'HU' && code === 'HU-TO') code = 'HU-TE';
          if (allowed && !allowed.has(code)) return null;

          // HU: strip inner rings (holes cut for county-level cities) to avoid blank spots on the map
          let coords = simplifyCoords(normalizeAntimeridian(f.geometry.coordinates), 3);
          let geomType = f.geometry.type;
          if (cc === 'HU') {
            if (geomType === 'Polygon') {
              coords = [coords[0]]; // keep only outer ring
            } else if (geomType === 'MultiPolygon') {
              coords = coords.map(poly => [poly[0]]); // outer ring only for each polygon
            }
          }

          return {
            type: 'Feature',
            properties: { code, name: f.properties.name || f.properties.name_en || 'Unknown' },
            geometry: { type: geomType, coordinates: coords },
          };
        })
        .filter(Boolean);

      // AU: NE has two features with code AU-NSW (mainland + Lord Howe Island); merge into one MultiPolygon
      if (cc === 'AU') {
        const seen = new Map();
        for (const feat of outputFeatures) {
          const c = feat.properties.code;
          if (!seen.has(c)) {
            seen.set(c, feat);
          } else {
            const existing = seen.get(c);
            const allPolys = [];
            const addPolys = (geom) => {
              if (geom.type === 'Polygon') allPolys.push([geom.coordinates[0]]);
              else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => allPolys.push([p[0]]));
            };
            addPolys(existing.geometry);
            addPolys(feat.geometry);
            existing.geometry = { type: 'MultiPolygon', coordinates: allPolys };
          }
        }
        outputFeatures = [...seen.values()];
      }
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
