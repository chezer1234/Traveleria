/**
 * Seed: cities
 * Major cities with population data for exploration percentage calculation.
 * Includes 10-30 cities per major country, fewer for smaller nations.
 *
 * city_percentage = city.population / country.population
 */

const cities = [
  // United States (US) - population: 331,002,651
  { country_code: 'US', name: 'New York City', population: 8336817 },
  { country_code: 'US', name: 'Los Angeles', population: 3979576 },
  { country_code: 'US', name: 'Chicago', population: 2693976 },
  { country_code: 'US', name: 'Houston', population: 2320268 },
  { country_code: 'US', name: 'Phoenix', population: 1680992 },
  { country_code: 'US', name: 'Philadelphia', population: 1603797 },
  { country_code: 'US', name: 'San Antonio', population: 1547253 },
  { country_code: 'US', name: 'San Diego', population: 1423851 },
  { country_code: 'US', name: 'Dallas', population: 1343573 },
  { country_code: 'US', name: 'San Jose', population: 1021795 },
  { country_code: 'US', name: 'Austin', population: 978908 },
  { country_code: 'US', name: 'Jacksonville', population: 949611 },
  { country_code: 'US', name: 'San Francisco', population: 873965 },
  { country_code: 'US', name: 'Seattle', population: 737015 },
  { country_code: 'US', name: 'Denver', population: 715522 },
  { country_code: 'US', name: 'Washington D.C.', population: 689545 },
  { country_code: 'US', name: 'Nashville', population: 689447 },
  { country_code: 'US', name: 'Boston', population: 675647 },
  { country_code: 'US', name: 'Las Vegas', population: 641903 },
  { country_code: 'US', name: 'Miami', population: 442241 },

  // United Kingdom (GB) - population: 67,886,011
  { country_code: 'GB', name: 'London', population: 8982000 },
  { country_code: 'GB', name: 'Birmingham', population: 1141816 },
  { country_code: 'GB', name: 'Manchester', population: 553230 },
  { country_code: 'GB', name: 'Glasgow', population: 635640 },
  { country_code: 'GB', name: 'Liverpool', population: 496784 },
  { country_code: 'GB', name: 'Edinburgh', population: 524930 },
  { country_code: 'GB', name: 'Leeds', population: 503388 },
  { country_code: 'GB', name: 'Bristol', population: 467099 },
  { country_code: 'GB', name: 'Cardiff', population: 362756 },
  { country_code: 'GB', name: 'Belfast', population: 343542 },
  { country_code: 'GB', name: 'Sheffield', population: 584853 },
  { country_code: 'GB', name: 'Newcastle', population: 300196 },
  { country_code: 'GB', name: 'Nottingham', population: 321500 },
  { country_code: 'GB', name: 'Oxford', population: 152450 },
  { country_code: 'GB', name: 'Cambridge', population: 145700 },

  // France (FR) - population: 67,390,000
  { country_code: 'FR', name: 'Paris', population: 2161000 },
  { country_code: 'FR', name: 'Marseille', population: 870018 },
  { country_code: 'FR', name: 'Lyon', population: 516092 },
  { country_code: 'FR', name: 'Toulouse', population: 479553 },
  { country_code: 'FR', name: 'Nice', population: 340017 },
  { country_code: 'FR', name: 'Nantes', population: 309346 },
  { country_code: 'FR', name: 'Strasbourg', population: 280966 },
  { country_code: 'FR', name: 'Montpellier', population: 285121 },
  { country_code: 'FR', name: 'Bordeaux', population: 257068 },
  { country_code: 'FR', name: 'Lille', population: 232787 },
  { country_code: 'FR', name: 'Rennes', population: 216815 },
  { country_code: 'FR', name: 'Reims', population: 182460 },

  // Germany (DE) - population: 83,783,942
  { country_code: 'DE', name: 'Berlin', population: 3644826 },
  { country_code: 'DE', name: 'Hamburg', population: 1841179 },
  { country_code: 'DE', name: 'Munich', population: 1471508 },
  { country_code: 'DE', name: 'Cologne', population: 1085664 },
  { country_code: 'DE', name: 'Frankfurt', population: 753056 },
  { country_code: 'DE', name: 'Stuttgart', population: 634830 },
  { country_code: 'DE', name: 'Dusseldorf', population: 619294 },
  { country_code: 'DE', name: 'Leipzig', population: 587857 },
  { country_code: 'DE', name: 'Dortmund', population: 588250 },
  { country_code: 'DE', name: 'Essen', population: 583109 },
  { country_code: 'DE', name: 'Bremen', population: 569352 },
  { country_code: 'DE', name: 'Dresden', population: 556780 },
  { country_code: 'DE', name: 'Hanover', population: 538068 },
  { country_code: 'DE', name: 'Nuremberg', population: 518365 },

  // Japan (JP) - population: 126,476,461
  { country_code: 'JP', name: 'Tokyo', population: 13960000 },
  { country_code: 'JP', name: 'Yokohama', population: 3749000 },
  { country_code: 'JP', name: 'Osaka', population: 2753000 },
  { country_code: 'JP', name: 'Nagoya', population: 2296000 },
  { country_code: 'JP', name: 'Sapporo', population: 1973000 },
  { country_code: 'JP', name: 'Fukuoka', population: 1603000 },
  { country_code: 'JP', name: 'Kobe', population: 1537000 },
  { country_code: 'JP', name: 'Kawasaki', population: 1531000 },
  { country_code: 'JP', name: 'Kyoto', population: 1475000 },
  { country_code: 'JP', name: 'Saitama', population: 1324000 },
  { country_code: 'JP', name: 'Hiroshima', population: 1200000 },
  { country_code: 'JP', name: 'Sendai', population: 1090000 },

  // Australia (AU) - population: 25,499,884
  { country_code: 'AU', name: 'Sydney', population: 5312000 },
  { country_code: 'AU', name: 'Melbourne', population: 5078000 },
  { country_code: 'AU', name: 'Brisbane', population: 2514000 },
  { country_code: 'AU', name: 'Perth', population: 2085000 },
  { country_code: 'AU', name: 'Adelaide', population: 1376000 },
  { country_code: 'AU', name: 'Gold Coast', population: 699000 },
  { country_code: 'AU', name: 'Canberra', population: 462000 },
  { country_code: 'AU', name: 'Newcastle', population: 322000 },
  { country_code: 'AU', name: 'Hobart', population: 240000 },
  { country_code: 'AU', name: 'Darwin', population: 147000 },

  // Brazil (BR) - population: 212,559,417
  { country_code: 'BR', name: 'Sao Paulo', population: 12330000 },
  { country_code: 'BR', name: 'Rio de Janeiro', population: 6748000 },
  { country_code: 'BR', name: 'Brasilia', population: 3055000 },
  { country_code: 'BR', name: 'Salvador', population: 2886000 },
  { country_code: 'BR', name: 'Fortaleza', population: 2687000 },
  { country_code: 'BR', name: 'Belo Horizonte', population: 2521000 },
  { country_code: 'BR', name: 'Manaus', population: 2219000 },
  { country_code: 'BR', name: 'Curitiba', population: 1948000 },
  { country_code: 'BR', name: 'Recife', population: 1645000 },
  { country_code: 'BR', name: 'Porto Alegre', population: 1484000 },

  // India (IN) - population: 1,380,004,385
  { country_code: 'IN', name: 'Mumbai', population: 20411000 },
  { country_code: 'IN', name: 'Delhi', population: 16787941 },
  { country_code: 'IN', name: 'Bangalore', population: 12327000 },
  { country_code: 'IN', name: 'Hyderabad', population: 10004000 },
  { country_code: 'IN', name: 'Ahmedabad', population: 8059000 },
  { country_code: 'IN', name: 'Chennai', population: 7088000 },
  { country_code: 'IN', name: 'Kolkata', population: 14850000 },
  { country_code: 'IN', name: 'Pune', population: 6987000 },
  { country_code: 'IN', name: 'Jaipur', population: 3046000 },
  { country_code: 'IN', name: 'Lucknow', population: 2902000 },
  { country_code: 'IN', name: 'Kanpur', population: 2768000 },
  { country_code: 'IN', name: 'Nagpur', population: 2406000 },
  { country_code: 'IN', name: 'Patna', population: 2049000 },
  { country_code: 'IN', name: 'Bhopal', population: 1883000 },
  { country_code: 'IN', name: 'Agra', population: 1760000 },

  // China (CN) - population: 1,439,323,776
  { country_code: 'CN', name: 'Shanghai', population: 27058000 },
  { country_code: 'CN', name: 'Beijing', population: 21540000 },
  { country_code: 'CN', name: 'Chongqing', population: 16382000 },
  { country_code: 'CN', name: 'Guangzhou', population: 13501000 },
  { country_code: 'CN', name: 'Shenzhen', population: 12529000 },
  { country_code: 'CN', name: 'Tianjin', population: 11210000 },
  { country_code: 'CN', name: 'Chengdu', population: 10110000 },
  { country_code: 'CN', name: 'Wuhan', population: 9785000 },
  { country_code: 'CN', name: 'Hangzhou', population: 7236000 },
  { country_code: 'CN', name: 'Nanjing', population: 6500000 },
  { country_code: 'CN', name: "Xi'an", population: 6320000 },
  { country_code: 'CN', name: 'Suzhou', population: 5345000 },
  { country_code: 'CN', name: 'Harbin', population: 5242000 },
  { country_code: 'CN', name: 'Dalian', population: 4490000 },
  { country_code: 'CN', name: 'Qingdao', population: 4360000 },

  // Canada (CA) - population: 37,742,154
  { country_code: 'CA', name: 'Toronto', population: 2731571 },
  { country_code: 'CA', name: 'Montreal', population: 1762949 },
  { country_code: 'CA', name: 'Vancouver', population: 631486 },
  { country_code: 'CA', name: 'Calgary', population: 1239220 },
  { country_code: 'CA', name: 'Edmonton', population: 972223 },
  { country_code: 'CA', name: 'Ottawa', population: 994837 },
  { country_code: 'CA', name: 'Winnipeg', population: 749534 },
  { country_code: 'CA', name: 'Quebec City', population: 542298 },
  { country_code: 'CA', name: 'Halifax', population: 403131 },
  { country_code: 'CA', name: 'Victoria', population: 92141 },

  // Mexico (MX) - population: 128,932,753
  { country_code: 'MX', name: 'Mexico City', population: 9209944 },
  { country_code: 'MX', name: 'Guadalajara', population: 1460148 },
  { country_code: 'MX', name: 'Monterrey', population: 1142994 },
  { country_code: 'MX', name: 'Puebla', population: 1576259 },
  { country_code: 'MX', name: 'Tijuana', population: 1810645 },
  { country_code: 'MX', name: 'Leon', population: 1578626 },
  { country_code: 'MX', name: 'Cancun', population: 888797 },
  { country_code: 'MX', name: 'Merida', population: 921771 },
  { country_code: 'MX', name: 'Queretaro', population: 878931 },
  { country_code: 'MX', name: 'Oaxaca', population: 300050 },

  // Italy (IT) - population: 60,461,826
  { country_code: 'IT', name: 'Rome', population: 2873000 },
  { country_code: 'IT', name: 'Milan', population: 1396059 },
  { country_code: 'IT', name: 'Naples', population: 959574 },
  { country_code: 'IT', name: 'Turin', population: 875698 },
  { country_code: 'IT', name: 'Palermo', population: 657561 },
  { country_code: 'IT', name: 'Genoa', population: 580097 },
  { country_code: 'IT', name: 'Bologna', population: 394463 },
  { country_code: 'IT', name: 'Florence', population: 382258 },
  { country_code: 'IT', name: 'Venice', population: 261905 },
  { country_code: 'IT', name: 'Verona', population: 257275 },

  // Spain (ES) - population: 46,754,778
  { country_code: 'ES', name: 'Madrid', population: 3223334 },
  { country_code: 'ES', name: 'Barcelona', population: 1620343 },
  { country_code: 'ES', name: 'Valencia', population: 794288 },
  { country_code: 'ES', name: 'Seville', population: 688711 },
  { country_code: 'ES', name: 'Zaragoza', population: 674997 },
  { country_code: 'ES', name: 'Malaga', population: 574654 },
  { country_code: 'ES', name: 'Bilbao', population: 345821 },
  { country_code: 'ES', name: 'Las Palmas', population: 379925 },
  { country_code: 'ES', name: 'Palma de Mallorca', population: 416065 },
  { country_code: 'ES', name: 'Granada', population: 232462 },

  // South Korea (KR) - population: 51,269,185
  { country_code: 'KR', name: 'Seoul', population: 9776000 },
  { country_code: 'KR', name: 'Busan', population: 3429000 },
  { country_code: 'KR', name: 'Incheon', population: 2957000 },
  { country_code: 'KR', name: 'Daegu', population: 2432000 },
  { country_code: 'KR', name: 'Daejeon', population: 1489000 },
  { country_code: 'KR', name: 'Gwangju', population: 1456000 },
  { country_code: 'KR', name: 'Suwon', population: 1194000 },
  { country_code: 'KR', name: 'Ulsan', population: 1136000 },
  { country_code: 'KR', name: 'Jeju', population: 486000 },
  { country_code: 'KR', name: 'Gyeongju', population: 258000 },

  // South Africa (ZA) - population: 59,308,690
  { country_code: 'ZA', name: 'Johannesburg', population: 5635000 },
  { country_code: 'ZA', name: 'Cape Town', population: 4618000 },
  { country_code: 'ZA', name: 'Durban', population: 3720000 },
  { country_code: 'ZA', name: 'Pretoria', population: 2565000 },
  { country_code: 'ZA', name: 'Port Elizabeth', population: 1263000 },
  { country_code: 'ZA', name: 'Bloemfontein', population: 556000 },
  { country_code: 'ZA', name: 'East London', population: 478000 },
  { country_code: 'ZA', name: 'Nelspruit', population: 110000 },
  { country_code: 'ZA', name: 'Kimberley', population: 97000 },
  { country_code: 'ZA', name: 'Polokwane', population: 130000 },

  // Thailand (TH) - population: 69,799,978
  { country_code: 'TH', name: 'Bangkok', population: 10539000 },
  { country_code: 'TH', name: 'Chiang Mai', population: 131091 },
  { country_code: 'TH', name: 'Pattaya', population: 119532 },
  { country_code: 'TH', name: 'Nonthaburi', population: 270609 },
  { country_code: 'TH', name: 'Hat Yai', population: 157359 },
  { country_code: 'TH', name: 'Phuket', population: 83000 },
  { country_code: 'TH', name: 'Udon Thani', population: 222425 },
  { country_code: 'TH', name: 'Khon Kaen', population: 120000 },
  { country_code: 'TH', name: 'Krabi', population: 34000 },
  { country_code: 'TH', name: 'Chiang Rai', population: 76000 },

  // Egypt (EG) - population: 102,334,404
  { country_code: 'EG', name: 'Cairo', population: 9540000 },
  { country_code: 'EG', name: 'Alexandria', population: 5200000 },
  { country_code: 'EG', name: 'Giza', population: 3628062 },
  { country_code: 'EG', name: 'Shubra El Kheima', population: 1099354 },
  { country_code: 'EG', name: 'Port Said', population: 749371 },
  { country_code: 'EG', name: 'Suez', population: 728180 },
  { country_code: 'EG', name: 'Luxor', population: 506588 },
  { country_code: 'EG', name: 'Aswan', population: 290327 },
  { country_code: 'EG', name: 'Hurghada', population: 261700 },
  { country_code: 'EG', name: 'Sharm El Sheikh', population: 73000 },

  // Russia (RU) - population: 145,934,462
  { country_code: 'RU', name: 'Moscow', population: 12615000 },
  { country_code: 'RU', name: 'Saint Petersburg', population: 5384000 },
  { country_code: 'RU', name: 'Novosibirsk', population: 1625600 },
  { country_code: 'RU', name: 'Yekaterinburg', population: 1495000 },
  { country_code: 'RU', name: 'Kazan', population: 1257000 },
  { country_code: 'RU', name: 'Nizhny Novgorod', population: 1252000 },
  { country_code: 'RU', name: 'Chelyabinsk', population: 1196680 },
  { country_code: 'RU', name: 'Samara', population: 1156000 },
  { country_code: 'RU', name: 'Omsk', population: 1154000 },
  { country_code: 'RU', name: 'Rostov-on-Don', population: 1137000 },
  { country_code: 'RU', name: 'Ufa', population: 1120000 },
  { country_code: 'RU', name: 'Krasnoyarsk', population: 1093000 },
  { country_code: 'RU', name: 'Vladivostok', population: 605000 },
  { country_code: 'RU', name: 'Sochi', population: 443000 },

  // Turkey (TR) - population: 84,339,067
  { country_code: 'TR', name: 'Istanbul', population: 15462000 },
  { country_code: 'TR', name: 'Ankara', population: 5663000 },
  { country_code: 'TR', name: 'Izmir', population: 4367000 },
  { country_code: 'TR', name: 'Bursa', population: 3056000 },
  { country_code: 'TR', name: 'Antalya', population: 2511000 },
  { country_code: 'TR', name: 'Adana', population: 2237000 },
  { country_code: 'TR', name: 'Konya', population: 2232000 },
  { country_code: 'TR', name: 'Gaziantep', population: 2085000 },
  { country_code: 'TR', name: 'Mersin', population: 1840000 },
  { country_code: 'TR', name: 'Kayseri', population: 1389000 },

  // Nigeria (NG) - population: 206,139,589
  { country_code: 'NG', name: 'Lagos', population: 14862000 },
  { country_code: 'NG', name: 'Kano', population: 3626000 },
  { country_code: 'NG', name: 'Ibadan', population: 3552000 },
  { country_code: 'NG', name: 'Abuja', population: 3464000 },
  { country_code: 'NG', name: 'Port Harcourt', population: 1865000 },
  { country_code: 'NG', name: 'Benin City', population: 1496000 },
  { country_code: 'NG', name: 'Maiduguri', population: 803000 },
  { country_code: 'NG', name: 'Zaria', population: 736000 },
  { country_code: 'NG', name: 'Aba', population: 534265 },
  { country_code: 'NG', name: 'Enugu', population: 523000 },

  // Indonesia (ID) - population: 273,523,615
  { country_code: 'ID', name: 'Jakarta', population: 10560000 },
  { country_code: 'ID', name: 'Surabaya', population: 2874000 },
  { country_code: 'ID', name: 'Bandung', population: 2510000 },
  { country_code: 'ID', name: 'Medan', population: 2210000 },
  { country_code: 'ID', name: 'Semarang', population: 1766000 },
  { country_code: 'ID', name: 'Makassar', population: 1423000 },
  { country_code: 'ID', name: 'Palembang', population: 1455000 },
  { country_code: 'ID', name: 'Denpasar', population: 725000 },
  { country_code: 'ID', name: 'Yogyakarta', population: 422732 },
  { country_code: 'ID', name: 'Malang', population: 895000 },

  // Argentina (AR) - population: 45,195,774
  { country_code: 'AR', name: 'Buenos Aires', population: 3075646 },
  { country_code: 'AR', name: 'Cordoba', population: 1535868 },
  { country_code: 'AR', name: 'Rosario', population: 1193605 },
  { country_code: 'AR', name: 'Mendoza', population: 115041 },
  { country_code: 'AR', name: 'La Plata', population: 694253 },
  { country_code: 'AR', name: 'Tucuman', population: 636667 },
  { country_code: 'AR', name: 'Mar del Plata', population: 618989 },
  { country_code: 'AR', name: 'Salta', population: 617516 },
  { country_code: 'AR', name: 'Santa Fe', population: 490171 },
  { country_code: 'AR', name: 'Bariloche', population: 133500 },
];

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('user_cities').del();
  await knex('cities').del();

  const batchSize = 50;
  for (let i = 0; i < cities.length; i += batchSize) {
    await knex('cities').insert(cities.slice(i, i + batchSize));
  }
};

exports.cities = cities;
