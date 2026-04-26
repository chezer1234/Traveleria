/**
 * Seed: countries
 * All ~195 UN-recognised countries with ISO 3166-1 alpha-2 codes,
 * region, population, annual tourist arrivals, and area in km².
 *
 * Data sources: World Bank, UNWTO, CIA World Factbook (approximate values).
 */

const countries = [
  // Europe
  { code: 'AL', name: 'Albania', region: 'Europe', population: 2877797, annual_tourists: 6410000, area_km2: 28748, lat: 41.33, lng: 19.82 },
  { code: 'AD', name: 'Andorra', region: 'Europe', population: 77265, annual_tourists: 3000000, area_km2: 468, lat: 42.51, lng: 1.52 },
  { code: 'AT', name: 'Austria', region: 'Europe', population: 9006398, annual_tourists: 31884000, area_km2: 83871, lat: 48.21, lng: 16.37 },
  { code: 'BY', name: 'Belarus', region: 'Europe', population: 9449323, annual_tourists: 405000, area_km2: 207600, lat: 53.90, lng: 27.57 },
  { code: 'BE', name: 'Belgium', region: 'Europe', population: 11589623, annual_tourists: 9119000, area_km2: 30528, lat: 50.85, lng: 4.35 },
  { code: 'BA', name: 'Bosnia and Herzegovina', region: 'Europe', population: 3280819, annual_tourists: 1053000, area_km2: 51197, lat: 43.86, lng: 18.41 },
  { code: 'BG', name: 'Bulgaria', region: 'Europe', population: 6948445, annual_tourists: 9273000, area_km2: 110879, lat: 42.70, lng: 23.32 },
  { code: 'HR', name: 'Croatia', region: 'Europe', population: 4105267, annual_tourists: 17353000, area_km2: 56594, lat: 45.81, lng: 15.98 },
  { code: 'CY', name: 'Cyprus', region: 'Europe', population: 1207359, annual_tourists: 3939000, area_km2: 9251, lat: 35.17, lng: 33.36 },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe', population: 10708981, annual_tourists: 14300000, area_km2: 78867, lat: 50.08, lng: 14.44 },
  { code: 'DK', name: 'Denmark', region: 'Europe', population: 5818553, annual_tourists: 12749000, area_km2: 43094, lat: 55.68, lng: 12.57 },
  { code: 'EE', name: 'Estonia', region: 'Europe', population: 1326535, annual_tourists: 3245000, area_km2: 45228, lat: 59.44, lng: 24.75 },
  { code: 'FI', name: 'Finland', region: 'Europe', population: 5540720, annual_tourists: 3290000, area_km2: 338424, lat: 60.17, lng: 24.94 },
  { code: 'FR', name: 'France', region: 'Europe', population: 67390000, annual_tourists: 90000000, area_km2: 640679, lat: 48.86, lng: 2.35 },
  { code: 'DE', name: 'Germany', region: 'Europe', population: 83783942, annual_tourists: 39563000, area_km2: 357022, lat: 52.52, lng: 13.41 },
  { code: 'GR', name: 'Greece', region: 'Europe', population: 10423054, annual_tourists: 31348000, area_km2: 131957, lat: 37.98, lng: 23.73 },
  { code: 'HU', name: 'Hungary', region: 'Europe', population: 9660351, annual_tourists: 16400000, area_km2: 93028, lat: 47.50, lng: 19.04 },
  { code: 'IS', name: 'Iceland', region: 'Europe', population: 341243, annual_tourists: 2343000, area_km2: 103000, lat: 64.15, lng: -21.94 },
  { code: 'IE', name: 'Ireland', region: 'Europe', population: 4937786, annual_tourists: 10926000, area_km2: 70273, lat: 53.35, lng: -6.26 },
  { code: 'IT', name: 'Italy', region: 'Europe', population: 60461826, annual_tourists: 64513000, area_km2: 301340, lat: 41.90, lng: 12.50 },
  { code: 'XK', name: 'Kosovo', region: 'Europe', population: 1831000, annual_tourists: 200000, area_km2: 10887, lat: 42.66, lng: 21.17 },
  { code: 'LV', name: 'Latvia', region: 'Europe', population: 1886198, annual_tourists: 1946000, area_km2: 64589, lat: 56.95, lng: 24.11 },
  { code: 'LI', name: 'Liechtenstein', region: 'Europe', population: 38128, annual_tourists: 85000, area_km2: 160, lat: 47.14, lng: 9.52 },
  { code: 'LT', name: 'Lithuania', region: 'Europe', population: 2722289, annual_tourists: 2939000, area_km2: 65300, lat: 54.69, lng: 25.28 },
  { code: 'LU', name: 'Luxembourg', region: 'Europe', population: 625978, annual_tourists: 1197000, area_km2: 2586, lat: 49.61, lng: 6.13 },
  { code: 'MT', name: 'Malta', region: 'Europe', population: 441543, annual_tourists: 2770000, area_km2: 316, lat: 35.90, lng: 14.51 },
  { code: 'MD', name: 'Moldova', region: 'Europe', population: 2657637, annual_tourists: 160000, area_km2: 33851, lat: 47.01, lng: 28.86 },
  { code: 'MC', name: 'Monaco', region: 'Europe', population: 39242, annual_tourists: 355000, area_km2: 2, lat: 43.73, lng: 7.42 },
  { code: 'ME', name: 'Montenegro', region: 'Europe', population: 628066, annual_tourists: 2510000, area_km2: 13812, lat: 42.44, lng: 19.26 },
  { code: 'NL', name: 'Netherlands', region: 'Europe', population: 17134872, annual_tourists: 20100000, area_km2: 41543, lat: 52.37, lng: 4.90 },
  { code: 'MK', name: 'North Macedonia', region: 'Europe', population: 2083374, annual_tourists: 757000, area_km2: 25713, lat: 42.00, lng: 21.43 },
  { code: 'NO', name: 'Norway', region: 'Europe', population: 5421241, annual_tourists: 5880000, area_km2: 323802, lat: 59.91, lng: 10.75 },
  { code: 'PL', name: 'Poland', region: 'Europe', population: 37846611, annual_tourists: 21158000, area_km2: 312685, lat: 52.23, lng: 21.01 },
  { code: 'PT', name: 'Portugal', region: 'Europe', population: 10196709, annual_tourists: 24600000, area_km2: 92212, lat: 38.72, lng: -9.14 },
  { code: 'RO', name: 'Romania', region: 'Europe', population: 19237691, annual_tourists: 13000000, area_km2: 238397, lat: 44.43, lng: 26.10 },
  { code: 'RU', name: 'Russia', region: 'Europe', population: 145934462, annual_tourists: 24419000, area_km2: 17098242, lat: 55.76, lng: 37.62 },
  { code: 'SM', name: 'San Marino', region: 'Europe', population: 33931, annual_tourists: 60000, area_km2: 61, lat: 43.94, lng: 12.46 },
  { code: 'RS', name: 'Serbia', region: 'Europe', population: 8737371, annual_tourists: 1843000, area_km2: 77474, lat: 44.79, lng: 20.47 },
  { code: 'SK', name: 'Slovakia', region: 'Europe', population: 5459642, annual_tourists: 5900000, area_km2: 49035, lat: 48.15, lng: 17.11 },
  { code: 'SI', name: 'Slovenia', region: 'Europe', population: 2078938, annual_tourists: 4700000, area_km2: 20273, lat: 46.05, lng: 14.51 },
  { code: 'ES', name: 'Spain', region: 'Europe', population: 46754778, annual_tourists: 83700000, area_km2: 505990, lat: 40.42, lng: -3.70 },
  { code: 'SE', name: 'Sweden', region: 'Europe', population: 10099265, annual_tourists: 7440000, area_km2: 450295, lat: 59.33, lng: 18.07 },
  { code: 'CH', name: 'Switzerland', region: 'Europe', population: 8654622, annual_tourists: 11715000, area_km2: 41284, lat: 46.95, lng: 7.45 },
  { code: 'UA', name: 'Ukraine', region: 'Europe', population: 43733762, annual_tourists: 14424000, area_km2: 603500, lat: 50.45, lng: 30.52 },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', population: 67886011, annual_tourists: 39418000, area_km2: 242495, lat: 51.51, lng: -0.13 },
  { code: 'VA', name: 'Vatican City', region: 'Europe', population: 825, annual_tourists: 5000000, area_km2: 1, lat: 41.90, lng: 12.45 },

  // Asia
  { code: 'AF', name: 'Afghanistan', region: 'Asia', population: 38928346, annual_tourists: 30000, area_km2: 652230, lat: 34.53, lng: 69.17 },
  { code: 'AM', name: 'Armenia', region: 'Asia', population: 2963243, annual_tourists: 1894000, area_km2: 29743, lat: 40.18, lng: 44.51 },
  { code: 'AZ', name: 'Azerbaijan', region: 'Asia', population: 10139177, annual_tourists: 3170000, area_km2: 86600, lat: 40.41, lng: 49.87 },
  { code: 'BH', name: 'Bahrain', region: 'Middle East', population: 1701575, annual_tourists: 12045000, area_km2: 760, lat: 26.23, lng: 50.59 },
  { code: 'BD', name: 'Bangladesh', region: 'Asia', population: 164689383, annual_tourists: 323000, area_km2: 147570, lat: 23.81, lng: 90.41 },
  { code: 'BT', name: 'Bhutan', region: 'Asia', population: 771608, annual_tourists: 315000, area_km2: 38394, lat: 27.47, lng: 89.64 },
  { code: 'BN', name: 'Brunei', region: 'Asia', population: 437479, annual_tourists: 333000, area_km2: 5765, lat: 4.94, lng: 114.95 },
  { code: 'KH', name: 'Cambodia', region: 'Asia', population: 16718965, annual_tourists: 6610000, area_km2: 181035, lat: 11.56, lng: 104.92 },
  { code: 'CN', name: 'China', region: 'Asia', population: 1439323776, annual_tourists: 65700000, area_km2: 9596960, lat: 39.90, lng: 116.40 },
  { code: 'GE', name: 'Georgia', region: 'Asia', population: 3989167, annual_tourists: 9358000, area_km2: 69700, lat: 41.72, lng: 44.83 },
  { code: 'IN', name: 'India', region: 'Asia', population: 1380004385, annual_tourists: 17910000, area_km2: 3287263, lat: 28.61, lng: 77.21 },
  { code: 'ID', name: 'Indonesia', region: 'Asia', population: 273523615, annual_tourists: 16106000, area_km2: 1904569, lat: -6.21, lng: 106.85 },
  { code: 'IR', name: 'Iran', region: 'Middle East', population: 83992949, annual_tourists: 9107000, area_km2: 1648195, lat: 35.69, lng: 51.39 },
  { code: 'IQ', name: 'Iraq', region: 'Middle East', population: 40222493, annual_tourists: 892000, area_km2: 438317, lat: 33.31, lng: 44.37 },
  { code: 'IL', name: 'Israel', region: 'Middle East', population: 8655535, annual_tourists: 4550000, area_km2: 20770, lat: 31.77, lng: 35.23 },
  { code: 'JP', name: 'Japan', region: 'Asia', population: 126476461, annual_tourists: 31882000, area_km2: 377975, lat: 35.68, lng: 139.69 },
  { code: 'JO', name: 'Jordan', region: 'Middle East', population: 10203134, annual_tourists: 5360000, area_km2: 89342, lat: 31.95, lng: 35.93 },
  { code: 'KZ', name: 'Kazakhstan', region: 'Asia', population: 18776707, annual_tourists: 8789000, area_km2: 2724900, lat: 51.17, lng: 71.43 },
  { code: 'KW', name: 'Kuwait', region: 'Middle East', population: 4270571, annual_tourists: 290000, area_km2: 17818, lat: 29.38, lng: 47.99 },
  { code: 'KG', name: 'Kyrgyzstan', region: 'Asia', population: 6524195, annual_tourists: 4765000, area_km2: 199951, lat: 42.87, lng: 74.59 },
  { code: 'LA', name: 'Laos', region: 'Asia', population: 7275560, annual_tourists: 4791000, area_km2: 236800, lat: 17.97, lng: 102.63 },
  { code: 'LB', name: 'Lebanon', region: 'Middle East', population: 6825445, annual_tourists: 1964000, area_km2: 10400, lat: 33.89, lng: 35.50 },
  { code: 'MY', name: 'Malaysia', region: 'Asia', population: 32365999, annual_tourists: 26101000, area_km2: 329847, lat: 3.14, lng: 101.69 },
  { code: 'MV', name: 'Maldives', region: 'Asia', population: 540544, annual_tourists: 1703000, area_km2: 298, lat: 4.18, lng: 73.51 },
  { code: 'MN', name: 'Mongolia', region: 'Asia', population: 3278290, annual_tourists: 577000, area_km2: 1564116, lat: 47.92, lng: 106.91 },
  { code: 'MM', name: 'Myanmar', region: 'Asia', population: 54409800, annual_tourists: 4360000, area_km2: 676578, lat: 19.76, lng: 96.07 },
  { code: 'NP', name: 'Nepal', region: 'Asia', population: 29136808, annual_tourists: 1197000, area_km2: 147181, lat: 27.72, lng: 85.32 },
  { code: 'KP', name: 'North Korea', region: 'Asia', population: 25778816, annual_tourists: 5000, area_km2: 120538, lat: 39.02, lng: 125.75 },
  { code: 'OM', name: 'Oman', region: 'Middle East', population: 5106626, annual_tourists: 3500000, area_km2: 309500, lat: 23.61, lng: 58.59 },
  { code: 'PK', name: 'Pakistan', region: 'Asia', population: 220892340, annual_tourists: 965000, area_km2: 881913, lat: 33.69, lng: 73.04 },
  { code: 'PH', name: 'Philippines', region: 'Asia', population: 109581078, annual_tourists: 8261000, area_km2: 300000, lat: 14.60, lng: 120.98 },
  { code: 'QA', name: 'Qatar', region: 'Middle East', population: 2881053, annual_tourists: 2136000, area_km2: 11586, lat: 25.29, lng: 51.53 },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East', population: 34813871, annual_tourists: 24500000, area_km2: 2149690, lat: 24.69, lng: 46.72 },
  { code: 'SG', name: 'Singapore', region: 'Asia', population: 5850342, annual_tourists: 19116000, area_km2: 719, lat: 1.35, lng: 103.82 },
  { code: 'KR', name: 'South Korea', region: 'Asia', population: 51269185, annual_tourists: 17503000, area_km2: 100210, lat: 37.57, lng: 126.98 },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia', population: 21413249, annual_tourists: 2334000, area_km2: 65610, lat: 6.93, lng: 79.85 },
  { code: 'SY', name: 'Syria', region: 'Middle East', population: 17500658, annual_tourists: 100000, area_km2: 185180, lat: 33.51, lng: 36.29 },
  { code: 'TW', name: 'Taiwan', region: 'Asia', population: 23816775, annual_tourists: 11864000, area_km2: 36193, lat: 25.03, lng: 121.57 },
  { code: 'TJ', name: 'Tajikistan', region: 'Asia', population: 9537645, annual_tourists: 1037000, area_km2: 143100, lat: 38.56, lng: 68.77 },
  { code: 'TH', name: 'Thailand', region: 'Asia', population: 69799978, annual_tourists: 39916000, area_km2: 513120, lat: 13.76, lng: 100.50 },
  { code: 'TL', name: 'Timor-Leste', region: 'Asia', population: 1318445, annual_tourists: 75000, area_km2: 14874, lat: -8.56, lng: 125.57 },
  { code: 'TM', name: 'Turkmenistan', region: 'Asia', population: 6031200, annual_tourists: 15000, area_km2: 488100, lat: 37.95, lng: 58.38 },
  { code: 'TR', name: 'Turkey', region: 'Asia', population: 84339067, annual_tourists: 51192000, area_km2: 783562, lat: 39.93, lng: 32.86 },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East', population: 9890402, annual_tourists: 21000000, area_km2: 83600, lat: 24.45, lng: 54.65 },
  { code: 'UZ', name: 'Uzbekistan', region: 'Asia', population: 33469203, annual_tourists: 6749000, area_km2: 447400, lat: 41.30, lng: 69.28 },
  { code: 'VN', name: 'Vietnam', region: 'Asia', population: 97338579, annual_tourists: 18009000, area_km2: 331212, lat: 21.03, lng: 105.85 },
  { code: 'YE', name: 'Yemen', region: 'Middle East', population: 29825964, annual_tourists: 25000, area_km2: 527968, lat: 15.37, lng: 44.21 },

  // Africa
  { code: 'DZ', name: 'Algeria', region: 'Africa', population: 43851044, annual_tourists: 2657000, area_km2: 2381741, lat: 36.75, lng: 3.04 },
  { code: 'AO', name: 'Angola', region: 'Africa', population: 32866272, annual_tourists: 218000, area_km2: 1246700, lat: -8.84, lng: 13.23 },
  { code: 'BJ', name: 'Benin', region: 'Africa', population: 12123200, annual_tourists: 294000, area_km2: 112622, lat: 6.50, lng: 2.60 },
  { code: 'BW', name: 'Botswana', region: 'Africa', population: 2351627, annual_tourists: 1473000, area_km2: 581730, lat: -24.65, lng: 25.91 },
  { code: 'BF', name: 'Burkina Faso', region: 'Africa', population: 20903273, annual_tourists: 190000, area_km2: 274200, lat: 12.37, lng: -1.52 },
  { code: 'BI', name: 'Burundi', region: 'Africa', population: 11890784, annual_tourists: 100000, area_km2: 27834, lat: -3.38, lng: 29.36 },
  { code: 'CV', name: 'Cabo Verde', region: 'Africa', population: 555987, annual_tourists: 819000, area_km2: 4033, lat: 14.93, lng: -23.51 },
  { code: 'CM', name: 'Cameroon', region: 'Africa', population: 26545863, annual_tourists: 1068000, area_km2: 475442, lat: 3.87, lng: 11.52 },
  { code: 'CF', name: 'Central African Republic', region: 'Africa', population: 4829767, annual_tourists: 100000, area_km2: 622984, lat: 4.37, lng: 18.56 },
  { code: 'TD', name: 'Chad', region: 'Africa', population: 16425864, annual_tourists: 87000, area_km2: 1284000, lat: 12.13, lng: 15.05 },
  { code: 'KM', name: 'Comoros', region: 'Africa', population: 869601, annual_tourists: 45000, area_km2: 2235, lat: -11.70, lng: 43.26 },
  { code: 'CG', name: 'Congo', region: 'Africa', population: 5518087, annual_tourists: 259000, area_km2: 342000, lat: -4.27, lng: 15.28 },
  { code: 'CD', name: 'DR Congo', region: 'Africa', population: 89561403, annual_tourists: 351000, area_km2: 2344858, lat: -4.32, lng: 15.31 },
  { code: 'CI', name: "Cote d'Ivoire", region: 'Africa', population: 26378274, annual_tourists: 2070000, area_km2: 322463, lat: 6.83, lng: -5.28 },
  { code: 'DJ', name: 'Djibouti', region: 'Africa', population: 988000, annual_tourists: 51000, area_km2: 23200, lat: 11.59, lng: 43.15 },
  { code: 'EG', name: 'Egypt', region: 'Africa', population: 102334404, annual_tourists: 13026000, area_km2: 1001449, lat: 30.04, lng: 31.24 },
  { code: 'GQ', name: 'Equatorial Guinea', region: 'Africa', population: 1402985, annual_tourists: 50000, area_km2: 28051, lat: 3.75, lng: 8.78 },
  { code: 'ER', name: 'Eritrea', region: 'Africa', population: 3546421, annual_tourists: 142000, area_km2: 117600, lat: 15.34, lng: 38.93 },
  { code: 'SZ', name: 'Eswatini', region: 'Africa', population: 1160164, annual_tourists: 782000, area_km2: 17364, lat: -26.31, lng: 31.13 },
  { code: 'ET', name: 'Ethiopia', region: 'Africa', population: 114963588, annual_tourists: 812000, area_km2: 1104300, lat: 9.02, lng: 38.75 },
  { code: 'GA', name: 'Gabon', region: 'Africa', population: 2225734, annual_tourists: 206000, area_km2: 267668, lat: 0.42, lng: 9.47 },
  { code: 'GM', name: 'Gambia', region: 'Africa', population: 2416668, annual_tourists: 250000, area_km2: 11295, lat: 13.45, lng: -16.58 },
  { code: 'GH', name: 'Ghana', region: 'Africa', population: 31072940, annual_tourists: 1130000, area_km2: 238533, lat: 5.56, lng: -0.19 },
  { code: 'GN', name: 'Guinea', region: 'Africa', population: 13132795, annual_tourists: 120000, area_km2: 245857, lat: 9.64, lng: -13.58 },
  { code: 'GW', name: 'Guinea-Bissau', region: 'Africa', population: 1968001, annual_tourists: 50000, area_km2: 36125, lat: 11.86, lng: -15.60 },
  { code: 'KE', name: 'Kenya', region: 'Africa', population: 53771296, annual_tourists: 2035000, area_km2: 580367, lat: -1.29, lng: 36.82 },
  { code: 'LS', name: 'Lesotho', region: 'Africa', population: 2142249, annual_tourists: 1081000, area_km2: 30355, lat: -29.31, lng: 27.48 },
  { code: 'LR', name: 'Liberia', region: 'Africa', population: 5057681, annual_tourists: 68000, area_km2: 111369, lat: 6.31, lng: -10.80 },
  { code: 'LY', name: 'Libya', region: 'Africa', population: 6871292, annual_tourists: 50000, area_km2: 1759540, lat: 32.90, lng: 13.18 },
  { code: 'MG', name: 'Madagascar', region: 'Africa', population: 27691018, annual_tourists: 375000, area_km2: 587041, lat: -18.88, lng: 47.51 },
  { code: 'MW', name: 'Malawi', region: 'Africa', population: 19129952, annual_tourists: 849000, area_km2: 118484, lat: -13.97, lng: 33.79 },
  { code: 'ML', name: 'Mali', region: 'Africa', population: 20250833, annual_tourists: 193000, area_km2: 1240192, lat: 12.64, lng: -8.00 },
  { code: 'MR', name: 'Mauritania', region: 'Africa', population: 4649658, annual_tourists: 50000, area_km2: 1030700, lat: 18.09, lng: -15.98 },
  { code: 'MU', name: 'Mauritius', region: 'Africa', population: 1271768, annual_tourists: 1380000, area_km2: 2040, lat: -20.16, lng: 57.50 },
  { code: 'MA', name: 'Morocco', region: 'Africa', population: 36910560, annual_tourists: 12932000, area_km2: 446550, lat: 34.02, lng: -6.83 },
  { code: 'MZ', name: 'Mozambique', region: 'Africa', population: 31255435, annual_tourists: 2741000, area_km2: 801590, lat: -25.97, lng: 32.57 },
  { code: 'NA', name: 'Namibia', region: 'Africa', population: 2540905, annual_tourists: 1595000, area_km2: 824292, lat: -22.57, lng: 17.08 },
  { code: 'NE', name: 'Niger', region: 'Africa', population: 24206644, annual_tourists: 154000, area_km2: 1267000, lat: 13.51, lng: 2.11 },
  { code: 'NG', name: 'Nigeria', region: 'Africa', population: 206139589, annual_tourists: 1890000, area_km2: 923768, lat: 9.08, lng: 7.49 },
  { code: 'RW', name: 'Rwanda', region: 'Africa', population: 12952218, annual_tourists: 1633000, area_km2: 26338, lat: -1.94, lng: 29.87 },
  { code: 'ST', name: 'Sao Tome and Principe', region: 'Africa', population: 219159, annual_tourists: 34000, area_km2: 964, lat: 0.34, lng: 6.73 },
  { code: 'SN', name: 'Senegal', region: 'Africa', population: 16743927, annual_tourists: 1365000, area_km2: 196722, lat: 14.69, lng: -17.44 },
  { code: 'SC', name: 'Seychelles', region: 'Africa', population: 98347, annual_tourists: 384000, area_km2: 459, lat: -4.62, lng: 55.45 },
  { code: 'SL', name: 'Sierra Leone', region: 'Africa', population: 7976983, annual_tourists: 54000, area_km2: 71740, lat: 8.48, lng: -13.23 },
  { code: 'SO', name: 'Somalia', region: 'Africa', population: 15893222, annual_tourists: 20000, area_km2: 637657, lat: 2.05, lng: 45.34 },
  { code: 'ZA', name: 'South Africa', region: 'Africa', population: 59308690, annual_tourists: 10472000, area_km2: 1221037, lat: -33.93, lng: 18.42 },
  { code: 'SS', name: 'South Sudan', region: 'Africa', population: 11193725, annual_tourists: 12000, area_km2: 644329, lat: 4.85, lng: 31.61 },
  { code: 'SD', name: 'Sudan', region: 'Africa', population: 43849260, annual_tourists: 900000, area_km2: 1861484, lat: 15.60, lng: 32.53 },
  { code: 'TZ', name: 'Tanzania', region: 'Africa', population: 59734218, annual_tourists: 1527000, area_km2: 945087, lat: -6.79, lng: 39.28 },
  { code: 'TG', name: 'Togo', region: 'Africa', population: 8278724, annual_tourists: 573000, area_km2: 56785, lat: 6.17, lng: 1.23 },
  { code: 'TN', name: 'Tunisia', region: 'Africa', population: 11818619, annual_tourists: 9429000, area_km2: 163610, lat: 36.81, lng: 10.18 },
  { code: 'UG', name: 'Uganda', region: 'Africa', population: 45741007, annual_tourists: 1505000, area_km2: 241038, lat: 0.31, lng: 32.58 },
  { code: 'ZM', name: 'Zambia', region: 'Africa', population: 18383955, annual_tourists: 1072000, area_km2: 752618, lat: -15.39, lng: 28.32 },
  { code: 'ZW', name: 'Zimbabwe', region: 'Africa', population: 14862924, annual_tourists: 2580000, area_km2: 390757, lat: -17.83, lng: 31.05 },

  // North America
  { code: 'AG', name: 'Antigua and Barbuda', region: 'North America', population: 97929, annual_tourists: 301000, area_km2: 442, lat: 17.12, lng: -61.85 },
  { code: 'BS', name: 'Bahamas', region: 'North America', population: 393244, annual_tourists: 1812000, area_km2: 13880, lat: 25.06, lng: -77.35 },
  { code: 'BB', name: 'Barbados', region: 'North America', population: 287375, annual_tourists: 682000, area_km2: 430, lat: 13.10, lng: -59.61 },
  { code: 'BZ', name: 'Belize', region: 'North America', population: 397628, annual_tourists: 489000, area_km2: 22966, lat: 17.25, lng: -88.77 },
  { code: 'CA', name: 'Canada', region: 'North America', population: 37742154, annual_tourists: 22145000, area_km2: 9984670, lat: 45.42, lng: -75.70 },
  { code: 'CR', name: 'Costa Rica', region: 'North America', population: 5094118, annual_tourists: 3139000, area_km2: 51100, lat: 9.93, lng: -84.08 },
  { code: 'CU', name: 'Cuba', region: 'North America', population: 11326616, annual_tourists: 4275000, area_km2: 109884, lat: 23.11, lng: -82.37 },
  { code: 'DM', name: 'Dominica', region: 'North America', population: 71986, annual_tourists: 95000, area_km2: 751, lat: 15.30, lng: -61.39 },
  { code: 'DO', name: 'Dominican Republic', region: 'North America', population: 10847910, annual_tourists: 6569000, area_km2: 48671, lat: 18.47, lng: -69.90 },
  { code: 'SV', name: 'El Salvador', region: 'North America', population: 6486205, annual_tourists: 2535000, area_km2: 21041, lat: 13.69, lng: -89.22 },
  { code: 'GD', name: 'Grenada', region: 'North America', population: 112523, annual_tourists: 165000, area_km2: 344, lat: 12.06, lng: -61.75 },
  { code: 'GT', name: 'Guatemala', region: 'North America', population: 17915568, annual_tourists: 1806000, area_km2: 108889, lat: 14.63, lng: -90.51 },
  { code: 'HT', name: 'Haiti', region: 'North America', population: 11402528, annual_tourists: 938000, area_km2: 27750, lat: 18.54, lng: -72.34 },
  { code: 'HN', name: 'Honduras', region: 'North America', population: 9904607, annual_tourists: 936000, area_km2: 112492, lat: 14.07, lng: -87.19 },
  { code: 'JM', name: 'Jamaica', region: 'North America', population: 2961167, annual_tourists: 4320000, area_km2: 10991, lat: 18.00, lng: -76.79 },
  { code: 'MX', name: 'Mexico', region: 'North America', population: 128932753, annual_tourists: 45024000, area_km2: 1964375, lat: 19.43, lng: -99.13 },
  { code: 'NI', name: 'Nicaragua', region: 'North America', population: 6624554, annual_tourists: 1510000, area_km2: 130373, lat: 12.11, lng: -86.27 },
  { code: 'PA', name: 'Panama', region: 'North America', population: 4314767, annual_tourists: 2468000, area_km2: 75417, lat: 8.98, lng: -79.52 },
  { code: 'KN', name: 'Saint Kitts and Nevis', region: 'North America', population: 53199, annual_tourists: 120000, area_km2: 261, lat: 17.30, lng: -62.73 },
  { code: 'LC', name: 'Saint Lucia', region: 'North America', population: 183627, annual_tourists: 395000, area_km2: 616, lat: 14.01, lng: -61.00 },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', region: 'North America', population: 110940, annual_tourists: 95000, area_km2: 389, lat: 13.16, lng: -61.23 },
  { code: 'TT', name: 'Trinidad and Tobago', region: 'North America', population: 1399488, annual_tourists: 480000, area_km2: 5128, lat: 10.66, lng: -61.51 },
  { code: 'US', name: 'United States', region: 'North America', population: 331002651, annual_tourists: 79256000, area_km2: 9833517, lat: 38.91, lng: -77.04 },

  // South America
  { code: 'AR', name: 'Argentina', region: 'South America', population: 45195774, annual_tourists: 7399000, area_km2: 2780400, lat: -34.60, lng: -58.38 },
  { code: 'BO', name: 'Bolivia', region: 'South America', population: 11673021, annual_tourists: 1219000, area_km2: 1098581, lat: -16.49, lng: -68.12 },
  { code: 'BR', name: 'Brazil', region: 'South America', population: 212559417, annual_tourists: 6621000, area_km2: 8515767, lat: -15.79, lng: -47.88 },
  { code: 'CL', name: 'Chile', region: 'South America', population: 19116201, annual_tourists: 4518000, area_km2: 756102, lat: -33.45, lng: -70.67 },
  { code: 'CO', name: 'Colombia', region: 'South America', population: 50882891, annual_tourists: 4515000, area_km2: 1141748, lat: 4.71, lng: -74.07 },
  { code: 'EC', name: 'Ecuador', region: 'South America', population: 17643054, annual_tourists: 2428000, area_km2: 276841, lat: -0.18, lng: -78.47 },
  { code: 'GY', name: 'Guyana', region: 'South America', population: 786552, annual_tourists: 287000, area_km2: 214969, lat: 6.80, lng: -58.16 },
  { code: 'PY', name: 'Paraguay', region: 'South America', population: 7132538, annual_tourists: 1182000, area_km2: 406752, lat: -25.26, lng: -57.58 },
  { code: 'PE', name: 'Peru', region: 'South America', population: 32971854, annual_tourists: 4372000, area_km2: 1285216, lat: -12.05, lng: -77.04 },
  { code: 'SR', name: 'Suriname', region: 'South America', population: 586632, annual_tourists: 278000, area_km2: 163820, lat: 5.85, lng: -55.20 },
  { code: 'UY', name: 'Uruguay', region: 'South America', population: 3473730, annual_tourists: 3472000, area_km2: 176215, lat: -34.88, lng: -56.17 },
  { code: 'VE', name: 'Venezuela', region: 'South America', population: 28435943, annual_tourists: 427000, area_km2: 916445, lat: 10.49, lng: -66.88 },

  // Oceania
  { code: 'AU', name: 'Australia', region: 'Oceania', population: 25499884, annual_tourists: 9466000, area_km2: 7741220, lat: -35.28, lng: 149.13 },
  { code: 'FJ', name: 'Fiji', region: 'Oceania', population: 896445, annual_tourists: 894000, area_km2: 18274, lat: -18.14, lng: 178.44 },
  { code: 'KI', name: 'Kiribati', region: 'Oceania', population: 119449, annual_tourists: 6000, area_km2: 811, lat: 1.33, lng: 173.00 },
  { code: 'MH', name: 'Marshall Islands', region: 'Oceania', population: 59190, annual_tourists: 6000, area_km2: 181, lat: 7.09, lng: 171.38 },
  { code: 'FM', name: 'Micronesia', region: 'Oceania', population: 115023, annual_tourists: 18000, area_km2: 702, lat: 6.91, lng: 158.16 },
  { code: 'NR', name: 'Nauru', region: 'Oceania', population: 10824, annual_tourists: 2000, area_km2: 21, lat: -0.55, lng: 166.92 },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania', population: 4822233, annual_tourists: 3886000, area_km2: 270467, lat: -41.29, lng: 174.78 },
  { code: 'PW', name: 'Palau', region: 'Oceania', population: 18094, annual_tourists: 90000, area_km2: 459, lat: 7.34, lng: 134.47 },
  { code: 'PG', name: 'Papua New Guinea', region: 'Oceania', population: 8947024, annual_tourists: 186000, area_km2: 462840, lat: -6.21, lng: 147.85 },
  { code: 'WS', name: 'Samoa', region: 'Oceania', population: 198414, annual_tourists: 181000, area_km2: 2842, lat: -13.83, lng: -171.76 },
  { code: 'SB', name: 'Solomon Islands', region: 'Oceania', population: 686884, annual_tourists: 28000, area_km2: 28896, lat: -9.43, lng: 160.02 },
  { code: 'TO', name: 'Tonga', region: 'Oceania', population: 105695, annual_tourists: 60000, area_km2: 747, lat: -21.21, lng: -175.20 },
  { code: 'TV', name: 'Tuvalu', region: 'Oceania', population: 11792, annual_tourists: 3000, area_km2: 26, lat: -8.52, lng: 179.20 },
  { code: 'VU', name: 'Vanuatu', region: 'Oceania', population: 307145, annual_tourists: 116000, area_km2: 12189, lat: -17.73, lng: 168.32 },
];

// ── UN M.49 subregion assignments ────────────────────────────────────────────
const SUBREGIONS = {
  // Northern Europe
  DK: 'Northern Europe', EE: 'Northern Europe', FI: 'Northern Europe',
  IS: 'Northern Europe', IE: 'Northern Europe', LV: 'Northern Europe',
  LT: 'Northern Europe', NO: 'Northern Europe', SE: 'Northern Europe', GB: 'Northern Europe',
  // Western Europe
  AT: 'Western Europe', BE: 'Western Europe', FR: 'Western Europe',
  DE: 'Western Europe', LI: 'Western Europe', LU: 'Western Europe',
  MC: 'Western Europe', NL: 'Western Europe', CH: 'Western Europe',
  // Southern Europe
  AL: 'Southern Europe', AD: 'Southern Europe', BA: 'Southern Europe',
  HR: 'Southern Europe', GR: 'Southern Europe', IT: 'Southern Europe',
  XK: 'Southern Europe', MT: 'Southern Europe', ME: 'Southern Europe',
  MK: 'Southern Europe', PT: 'Southern Europe', SM: 'Southern Europe',
  RS: 'Southern Europe', SI: 'Southern Europe', ES: 'Southern Europe', VA: 'Southern Europe',
  // Eastern Europe
  BY: 'Eastern Europe', BG: 'Eastern Europe', CZ: 'Eastern Europe',
  HU: 'Eastern Europe', MD: 'Eastern Europe', PL: 'Eastern Europe',
  RO: 'Eastern Europe', RU: 'Eastern Europe', SK: 'Eastern Europe', UA: 'Eastern Europe',
  // Western Asia (includes Middle East from seed + Cyprus per UN M.49)
  AM: 'Western Asia', AZ: 'Western Asia', BH: 'Western Asia', CY: 'Western Asia',
  GE: 'Western Asia', IQ: 'Western Asia', IL: 'Western Asia', JO: 'Western Asia',
  KW: 'Western Asia', LB: 'Western Asia', OM: 'Western Asia', QA: 'Western Asia',
  SA: 'Western Asia', SY: 'Western Asia', TR: 'Western Asia', AE: 'Western Asia',
  YE: 'Western Asia', IR: 'Western Asia',
  // Central Asia
  KZ: 'Central Asia', KG: 'Central Asia', TJ: 'Central Asia',
  TM: 'Central Asia', UZ: 'Central Asia',
  // Southern Asia
  AF: 'Southern Asia', BD: 'Southern Asia', BT: 'Southern Asia',
  IN: 'Southern Asia', MV: 'Southern Asia', NP: 'Southern Asia',
  PK: 'Southern Asia', LK: 'Southern Asia',
  // South-Eastern Asia
  BN: 'South-Eastern Asia', KH: 'South-Eastern Asia', ID: 'South-Eastern Asia',
  LA: 'South-Eastern Asia', MY: 'South-Eastern Asia', MM: 'South-Eastern Asia',
  PH: 'South-Eastern Asia', SG: 'South-Eastern Asia', TH: 'South-Eastern Asia',
  TL: 'South-Eastern Asia', VN: 'South-Eastern Asia',
  // Eastern Asia
  CN: 'Eastern Asia', JP: 'Eastern Asia', MN: 'Eastern Asia',
  KP: 'Eastern Asia', KR: 'Eastern Asia', TW: 'Eastern Asia',
  // Northern Africa
  DZ: 'Northern Africa', EG: 'Northern Africa', LY: 'Northern Africa',
  MA: 'Northern Africa', SD: 'Northern Africa', TN: 'Northern Africa',
  // Western Africa
  BJ: 'Western Africa', BF: 'Western Africa', CV: 'Western Africa',
  CI: 'Western Africa', GM: 'Western Africa', GH: 'Western Africa',
  GN: 'Western Africa', GW: 'Western Africa', LR: 'Western Africa',
  ML: 'Western Africa', MR: 'Western Africa', NE: 'Western Africa',
  NG: 'Western Africa', SN: 'Western Africa', SL: 'Western Africa', TG: 'Western Africa',
  // Middle Africa
  AO: 'Middle Africa', CM: 'Middle Africa', CF: 'Middle Africa',
  TD: 'Middle Africa', CG: 'Middle Africa', CD: 'Middle Africa',
  GQ: 'Middle Africa', GA: 'Middle Africa', ST: 'Middle Africa',
  // Eastern Africa
  BI: 'Eastern Africa', KM: 'Eastern Africa', DJ: 'Eastern Africa',
  ER: 'Eastern Africa', ET: 'Eastern Africa', KE: 'Eastern Africa',
  MG: 'Eastern Africa', MW: 'Eastern Africa', MU: 'Eastern Africa',
  MZ: 'Eastern Africa', RW: 'Eastern Africa', SC: 'Eastern Africa',
  SO: 'Eastern Africa', SS: 'Eastern Africa', TZ: 'Eastern Africa',
  UG: 'Eastern Africa', ZM: 'Eastern Africa', ZW: 'Eastern Africa',
  // Southern Africa
  BW: 'Southern Africa', SZ: 'Southern Africa', LS: 'Southern Africa',
  NA: 'Southern Africa', ZA: 'Southern Africa',
  // Northern America
  CA: 'Northern America', US: 'Northern America',
  // Central America
  BZ: 'Central America', CR: 'Central America', SV: 'Central America',
  GT: 'Central America', HN: 'Central America', MX: 'Central America',
  NI: 'Central America', PA: 'Central America',
  // Caribbean
  AG: 'Caribbean', BS: 'Caribbean', BB: 'Caribbean', CU: 'Caribbean',
  DM: 'Caribbean', DO: 'Caribbean', GD: 'Caribbean', HT: 'Caribbean',
  JM: 'Caribbean', KN: 'Caribbean', LC: 'Caribbean', VC: 'Caribbean', TT: 'Caribbean',
  // South America
  AR: 'South America', BO: 'South America', BR: 'South America',
  CL: 'South America', CO: 'South America', EC: 'South America',
  GY: 'South America', PY: 'South America', PE: 'South America',
  SR: 'South America', UY: 'South America', VE: 'South America',
  // Australia and New Zealand
  AU: 'Australia and New Zealand', NZ: 'Australia and New Zealand',
  // Melanesia
  FJ: 'Melanesia', PG: 'Melanesia', SB: 'Melanesia', VU: 'Melanesia',
  // Micronesia
  KI: 'Micronesia', MH: 'Micronesia', FM: 'Micronesia', NR: 'Micronesia', PW: 'Micronesia',
  // Polynesia
  WS: 'Polynesia', TO: 'Polynesia', TV: 'Polynesia',
};

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  const existing = await knex('countries').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    // Patch lat/lng on existing rows if missing
    const needsLatLng = await knex('countries').whereNull('lat').first();
    if (needsLatLng) {
      console.log('Updating countries with lat/lng coordinates...');
      for (const c of countries) {
        await knex('countries').where({ code: c.code }).update({ lat: c.lat, lng: c.lng });
      }
      console.log('Countries lat/lng updated.');
    }
    // Patch subregion on existing rows if missing
    const needsSubregion = await knex('countries').whereNull('subregion').first();
    if (needsSubregion) {
      console.log('Updating countries with subregion data...');
      await knex.transaction(async (trx) => {
        for (const [code, subregion] of Object.entries(SUBREGIONS)) {
          await trx('countries').where({ code }).update({ subregion });
        }
      });
      console.log('Countries subregion updated.');
    } else {
      console.log('Countries already seeded, skipping.');
    }
    return;
  }

  // Insert in a single transaction to avoid per-batch autocommit overhead
  const batchSize = 50;
  const countriesWithSubregion = countries.map(c => ({ ...c, subregion: SUBREGIONS[c.code] || null }));
  await knex.transaction(async (trx) => {
    for (let i = 0; i < countriesWithSubregion.length; i += batchSize) {
      await trx('countries').insert(countriesWithSubregion.slice(i, i + batchSize));
    }
  });
};

exports.countries = countries;
