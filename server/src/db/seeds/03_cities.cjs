/**
 * Seed: cities
 * Major cities with population data for exploration percentage calculation.
 * Includes 10-30 cities per major country, fewer for smaller nations.
 *
 * city_percentage = city.population / country.population
 */

const cities = [
  // United States (US) - population: 331,002,651
  // Tier 0 (issue #46): province_code links each city to its state; city_type
  // 'major' = pre-existing (0.5 pts), 'additional' = new (0.25 pts).
  { country_code: 'US', name: 'New York City', population: 8336817, province_code: 'US-NY', city_type: 'major' },
  { country_code: 'US', name: 'Los Angeles', population: 3979576, province_code: 'US-CA', city_type: 'major' },
  { country_code: 'US', name: 'Chicago', population: 2693976, province_code: 'US-IL', city_type: 'major' },
  { country_code: 'US', name: 'Houston', population: 2320268, province_code: 'US-TX', city_type: 'major' },
  { country_code: 'US', name: 'Phoenix', population: 1680992, province_code: 'US-AZ', city_type: 'major' },
  { country_code: 'US', name: 'Philadelphia', population: 1603797, province_code: 'US-PA', city_type: 'major' },
  { country_code: 'US', name: 'San Antonio', population: 1547253, province_code: 'US-TX', city_type: 'major' },
  { country_code: 'US', name: 'San Diego', population: 1423851, province_code: 'US-CA', city_type: 'major' },
  { country_code: 'US', name: 'Dallas', population: 1343573, province_code: 'US-TX', city_type: 'major' },
  { country_code: 'US', name: 'San Jose', population: 1021795, province_code: 'US-CA', city_type: 'major' },
  { country_code: 'US', name: 'Austin', population: 978908, province_code: 'US-TX', city_type: 'major' },
  { country_code: 'US', name: 'Jacksonville', population: 949611, province_code: 'US-FL', city_type: 'major' },
  { country_code: 'US', name: 'San Francisco', population: 873965, province_code: 'US-CA', city_type: 'major' },
  { country_code: 'US', name: 'Seattle', population: 737015, province_code: 'US-WA', city_type: 'major' },
  { country_code: 'US', name: 'Denver', population: 715522, province_code: 'US-CO', city_type: 'major' },
  { country_code: 'US', name: 'Washington D.C.', population: 689545, province_code: 'US-DC', city_type: 'major' },
  { country_code: 'US', name: 'Nashville', population: 689447, province_code: 'US-TN', city_type: 'major' },
  { country_code: 'US', name: 'Boston', population: 675647, province_code: 'US-MA', city_type: 'major' },
  { country_code: 'US', name: 'Las Vegas', population: 641903, province_code: 'US-NV', city_type: 'major' },
  { country_code: 'US', name: 'Miami', population: 442241, province_code: 'US-FL', city_type: 'major' },
  // Wyoming and Rhode Island had no pre-existing major cities — these 4 each
  // are new "additional" cities bringing them to the Tier 0 4-city minimum.
  { country_code: 'US', name: 'Cheyenne', population: 65132, province_code: 'US-WY', city_type: 'additional' },
  { country_code: 'US', name: 'Casper', population: 57461, province_code: 'US-WY', city_type: 'additional' },
  { country_code: 'US', name: 'Laramie', population: 32158, province_code: 'US-WY', city_type: 'additional' },
  { country_code: 'US', name: 'Gillette', population: 33403, province_code: 'US-WY', city_type: 'additional' },
  { country_code: 'US', name: 'Providence', population: 190934, province_code: 'US-RI', city_type: 'additional' },
  { country_code: 'US', name: 'Cranston', population: 82934, province_code: 'US-RI', city_type: 'additional' },
  { country_code: 'US', name: 'Warwick', population: 82823, province_code: 'US-RI', city_type: 'additional' },
  { country_code: 'US', name: 'Pawtucket', population: 75604, province_code: 'US-RI', city_type: 'additional' },

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
  { country_code: 'CN', name: 'Shanghai', population: 27058000, province_code: 'CN-SH', city_type: 'major' },
  { country_code: 'CN', name: 'Beijing', population: 21540000, province_code: 'CN-BJ', city_type: 'major' },
  { country_code: 'CN', name: 'Chongqing', population: 16382000, province_code: 'CN-CQ', city_type: 'major' },
  { country_code: 'CN', name: 'Guangzhou', population: 13501000, province_code: 'CN-GD', city_type: 'major' },
  { country_code: 'CN', name: 'Shenzhen', population: 12529000, province_code: 'CN-GD', city_type: 'major' },
  { country_code: 'CN', name: 'Tianjin', population: 11210000, province_code: 'CN-TJ', city_type: 'major' },
  { country_code: 'CN', name: 'Chengdu', population: 10110000, province_code: 'CN-SC', city_type: 'major' },
  { country_code: 'CN', name: 'Wuhan', population: 9785000, province_code: 'CN-HB', city_type: 'major' },
  { country_code: 'CN', name: 'Hangzhou', population: 7236000, province_code: 'CN-ZJ', city_type: 'major' },
  { country_code: 'CN', name: 'Nanjing', population: 6500000, province_code: 'CN-JS', city_type: 'major' },
  { country_code: 'CN', name: "Xi'an", population: 6320000, province_code: 'CN-SN', city_type: 'major' },
  { country_code: 'CN', name: 'Suzhou', population: 5345000, province_code: 'CN-JS', city_type: 'major' },
  { country_code: 'CN', name: 'Harbin', population: 5242000, province_code: 'CN-HL', city_type: 'major' },
  { country_code: 'CN', name: 'Dalian', population: 4490000, province_code: 'CN-LN', city_type: 'major' },
  { country_code: 'CN', name: 'Qingdao', population: 4360000, province_code: 'CN-SD', city_type: 'major' },
  // Beijing is a direct-administered municipality (it IS a city, not a
  // province containing separate cities), so its "additional" cities toward
  // the Tier 0 4-city minimum are real districts, not distinct municipalities.
  { country_code: 'CN', name: 'Chaoyang District', population: 3452000, province_code: 'CN-BJ', city_type: 'additional' },
  { country_code: 'CN', name: 'Haidian District', population: 3133000, province_code: 'CN-BJ', city_type: 'additional' },
  { country_code: 'CN', name: 'Fengtai District', population: 2201000, province_code: 'CN-BJ', city_type: 'additional' },

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

  // Pakistan (PK) - population: 220,892,340
  { country_code: 'PK', name: 'Karachi',      population: 14910352 },
  { country_code: 'PK', name: 'Lahore',       population: 11126285 },
  { country_code: 'PK', name: 'Faisalabad',   population:  3203846 },
  { country_code: 'PK', name: 'Rawalpindi',   population:  2098231 },
  { country_code: 'PK', name: 'Gujranwala',   population:  2027001 },
  { country_code: 'PK', name: 'Peshawar',     population:  1970042 },
  { country_code: 'PK', name: 'Multan',       population:  1871843 },
  { country_code: 'PK', name: 'Islamabad',    population:  1015000 },
  { country_code: 'PK', name: 'Hyderabad',    population:  1732693 },
  { country_code: 'PK', name: 'Quetta',       population:   909010 },

  // Bangladesh (BD) - population: 164,689,383
  { country_code: 'BD', name: 'Dhaka',        population: 8906039 },
  { country_code: 'BD', name: 'Chittagong',   population: 2592439 },
  { country_code: 'BD', name: 'Sylhet',       population:  526412 },
  { country_code: 'BD', name: 'Rajshahi',     population:  700133 },
  { country_code: 'BD', name: 'Khulna',       population:  663342 },
  { country_code: 'BD', name: 'Barisal',      population:  202242 },
  { country_code: 'BD', name: 'Cumilla',      population:  358691 },
  { country_code: 'BD', name: 'Narayanganj',  population:  222989 },

  // Ethiopia (ET) - population: 114,963,588
  { country_code: 'ET', name: 'Addis Ababa',  population: 3352000 },
  { country_code: 'ET', name: 'Dire Dawa',    population:  491000 },
  { country_code: 'ET', name: 'Mekelle',      population:  323700 },
  { country_code: 'ET', name: 'Gondar',       population:  323900 },
  { country_code: 'ET', name: 'Hawassa',      population:  358100 },
  { country_code: 'ET', name: 'Bahir Dar',    population:  343374 },
  { country_code: 'ET', name: 'Jimma',        population:  207905 },
  { country_code: 'ET', name: 'Adama',        population:  324000 },

  // Philippines (PH) - population: 109,581,078
  { country_code: 'PH', name: 'Manila',       population: 1780148 },
  { country_code: 'PH', name: 'Quezon City',  population: 2960048 },
  { country_code: 'PH', name: 'Caloocan',     population: 1583978 },
  { country_code: 'PH', name: 'Davao',        population: 1632991 },
  { country_code: 'PH', name: 'Cebu City',    population:  964169 },
  { country_code: 'PH', name: 'Zamboanga',    population:  977234 },
  { country_code: 'PH', name: 'Antipolo',     population:  776386 },
  { country_code: 'PH', name: 'Taguig',       population:  886722 },
  { country_code: 'PH', name: 'Cagayan de Oro', population: 675950 },
  { country_code: 'PH', name: 'Pasig',        population:  755300 },

  // Vietnam (VN) - population: 97,338,579
  { country_code: 'VN', name: 'Ho Chi Minh City', population: 9166793 },
  { country_code: 'VN', name: 'Hanoi',         population: 8053663 },
  { country_code: 'VN', name: 'Da Nang',       population: 1134310 },
  { country_code: 'VN', name: 'Can Tho',       population: 1235171 },
  { country_code: 'VN', name: 'Haiphong',      population: 2028514 },
  { country_code: 'VN', name: 'Bien Hoa',      population:  798020 },
  { country_code: 'VN', name: 'Hue',           population:  340000 },
  { country_code: 'VN', name: 'Nha Trang',     population:  392000 },
  { country_code: 'VN', name: 'Hoi An',        population:   93200 },

  // DR Congo (CD) - population: 89,561,403
  { country_code: 'CD', name: 'Kinshasa',      population: 14342439 },
  { country_code: 'CD', name: 'Lubumbashi',    population:  2590000 },
  { country_code: 'CD', name: 'Mbuji-Mayi',   population:  2600000 },
  { country_code: 'CD', name: 'Kananga',       population:  1072893 },
  { country_code: 'CD', name: 'Kisangani',     population:   939000 },
  { country_code: 'CD', name: 'Goma',          population:   670000 },
  { country_code: 'CD', name: 'Bukavu',        population:   835605 },
  { country_code: 'CD', name: 'Kolwezi',       population:   453000 },

  // Tanzania (TZ) - population: 59,734,218
  { country_code: 'TZ', name: 'Dar es Salaam',population: 3133000 },
  { country_code: 'TZ', name: 'Dodoma',       population:  410956 },
  { country_code: 'TZ', name: 'Mwanza',       population:  706453 },
  { country_code: 'TZ', name: 'Arusha',       population:  416442 },
  { country_code: 'TZ', name: 'Mbeya',        population:  385279 },
  { country_code: 'TZ', name: 'Morogoro',     population:  315866 },
  { country_code: 'TZ', name: 'Zanzibar',     population:  501312 },
  { country_code: 'TZ', name: 'Tanga',        population:  273332 },

  // Myanmar (MM) - population: 54,409,800
  { country_code: 'MM', name: 'Yangon',       population: 5209541 },
  { country_code: 'MM', name: 'Mandalay',     population: 1225546 },
  { country_code: 'MM', name: 'Naypyidaw',    population:  924608 },
  { country_code: 'MM', name: 'Mawlamyine',   population:  289044 },
  { country_code: 'MM', name: 'Bago',         population:  244376 },
  { country_code: 'MM', name: 'Pathein',      population:  169773 },
  { country_code: 'MM', name: 'Taunggyi',     population:  143272 },

  // Kenya (KE) - population: 53,771,296
  { country_code: 'KE', name: 'Nairobi',      population: 4397073 },
  { country_code: 'KE', name: 'Mombasa',      population: 1208333 },
  { country_code: 'KE', name: 'Kisumu',       population:  409928 },
  { country_code: 'KE', name: 'Nakuru',       population:  570674 },
  { country_code: 'KE', name: 'Eldoret',      population:  475716 },
  { country_code: 'KE', name: 'Thika',        population:  139853 },
  { country_code: 'KE', name: 'Malindi',      population:  119859 },

  // Iran (IR) - population: 83,992,949
  { country_code: 'IR', name: 'Tehran',       population: 9259000 },
  { country_code: 'IR', name: 'Mashhad',      population: 3372660 },
  { country_code: 'IR', name: 'Isfahan',      population: 2220000 },
  { country_code: 'IR', name: 'Karaj',        population: 1592492 },
  { country_code: 'IR', name: 'Shiraz',       population: 1565572 },
  { country_code: 'IR', name: 'Tabriz',       population: 1558693 },
  { country_code: 'IR', name: 'Qom',          population: 1201158 },
  { country_code: 'IR', name: 'Ahvaz',        population: 1136989 },
  { country_code: 'IR', name: 'Kerman',       population:  821374 },
  { country_code: 'IR', name: 'Yazd',         population:  529673 },

  // Colombia (CO) - population: 50,882,891
  { country_code: 'CO', name: 'Bogotá',       population: 7412566 },
  { country_code: 'CO', name: 'Medellín',     population: 2529403 },
  { country_code: 'CO', name: 'Cali',         population: 2227642 },
  { country_code: 'CO', name: 'Barranquilla', population: 1232766 },
  { country_code: 'CO', name: 'Cartagena',    population: 1028736 },
  { country_code: 'CO', name: 'Cúcuta',       population:  742679 },
  { country_code: 'CO', name: 'Bucaramanga',  population:  528763 },
  { country_code: 'CO', name: 'Ibagué',       population:  562114 },

  // Austria (AT) - population: 9,006,398
  { country_code: 'AT', name: 'Vienna',       population: 1897491 },
  { country_code: 'AT', name: 'Graz',         population:  291072 },
  { country_code: 'AT', name: 'Linz',         population:  204846 },
  { country_code: 'AT', name: 'Salzburg',     population:  154211 },
  { country_code: 'AT', name: 'Innsbruck',    population:  132493 },
  { country_code: 'AT', name: 'Klagenfurt',   population:  101403 },
  { country_code: 'AT', name: 'Villach',      population:   61354 },

  // Netherlands (NL) - population: 17,134,872
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

  // Czech Republic (CZ) - population: 10,708,981
  { country_code: 'CZ', name: 'Prague',       population: 1308632 },
  { country_code: 'CZ', name: 'Brno',         population:  381346 },
  { country_code: 'CZ', name: 'Ostrava',      population:  284982 },
  { country_code: 'CZ', name: 'Plzeň',        population:  174149 },
  { country_code: 'CZ', name: 'Liberec',      population:  104802 },
  { country_code: 'CZ', name: 'Olomouc',      population:  100514 },
  { country_code: 'CZ', name: 'České Budějovice', population: 94229 },
  { country_code: 'CZ', name: 'Hradec Králové', population: 91448 },
  { country_code: 'CZ', name: 'Karlovy Vary',  population:  49304 },

  // New Zealand (NZ) - population: 4,822,233
  { country_code: 'NZ', name: 'Auckland',     population:  467000 },
  { country_code: 'NZ', name: 'Christchurch', population:  381800 },
  { country_code: 'NZ', name: 'Wellington',   population:  215100 },
  { country_code: 'NZ', name: 'Hamilton',     population:  169300 },
  { country_code: 'NZ', name: 'Tauranga',     population:  143000 },
  { country_code: 'NZ', name: 'Dunedin',      population:  126300 },
  { country_code: 'NZ', name: 'Palmerston North', population: 88100 },
  { country_code: 'NZ', name: 'Queenstown',   population:   16600 },

  // Romania (RO) - population: 19,237,691
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

  // Peru (PE) - population: 32,971,854
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

  // Albania (AL) - population: 2,877,797
  { country_code: 'AL', name: 'Tirana',    population: 418495 },
  { country_code: 'AL', name: 'Durrës',    population: 175110 },
  { country_code: 'AL', name: 'Vlorë',     population:  79513 },
  { country_code: 'AL', name: 'Shkodër',   population:  77075 },
  { country_code: 'AL', name: 'Elbasan',   population:  78703 },
  { country_code: 'AL', name: 'Korçë',     population:  51152 },

  // Bosnia and Herzegovina (BA) - population: 3,280,819
  { country_code: 'BA', name: 'Sarajevo',   population: 275524 },
  { country_code: 'BA', name: 'Banja Luka', population: 185042 },
  { country_code: 'BA', name: 'Tuzla',      population:  110979 },
  { country_code: 'BA', name: 'Zenica',     population:  70553 },
  { country_code: 'BA', name: 'Mostar',     population:  96828 },

  // Belgium (BE) - population: 11,589,623
  { country_code: 'BE', name: 'Brussels',  population: 1208542 },
  { country_code: 'BE', name: 'Antwerp',   population:  529247 },
  { country_code: 'BE', name: 'Ghent',     population:  263815 },
  { country_code: 'BE', name: 'Charleroi', population:  201816 },
  { country_code: 'BE', name: 'Liège',     population:  197013 },
  { country_code: 'BE', name: 'Bruges',    population:  118708 },
  { country_code: 'BE', name: 'Namur',     population:  112097 },
  { country_code: 'BE', name: 'Leuven',    population:  101960 },

  // Bulgaria (BG) - population: 6,519,789
  { country_code: 'BG', name: 'Sofia',        population: 1241675 },
  { country_code: 'BG', name: 'Plovdiv',      population:  346893 },
  { country_code: 'BG', name: 'Varna',        population:  336505 },
  { country_code: 'BG', name: 'Burgas',       population:  211599 },
  { country_code: 'BG', name: 'Stara Zagora', population:  138272 },
  { country_code: 'BG', name: 'Ruse',         population:  134657 },
  { country_code: 'BG', name: 'Pleven',       population:  100848 },

  // Belarus (BY) - population: 9,449,323
  { country_code: 'BY', name: 'Minsk',     population: 1982444 },
  { country_code: 'BY', name: 'Gomel',     population:  480951 },
  { country_code: 'BY', name: 'Mogilev',   population:  360918 },
  { country_code: 'BY', name: 'Vitebsk',   population:  366350 },
  { country_code: 'BY', name: 'Grodno',    population:  373547 },
  { country_code: 'BY', name: 'Brest',     population:  340141 },
  { country_code: 'BY', name: 'Baranavichy', population: 168800 },

  // Switzerland (CH) - population: 8,654,622
  { country_code: 'CH', name: 'Zurich',    population: 434335 },
  { country_code: 'CH', name: 'Geneva',    population: 201818 },
  { country_code: 'CH', name: 'Basel',     population: 178120 },
  { country_code: 'CH', name: 'Bern',      population: 134591 },
  { country_code: 'CH', name: 'Lausanne',  population: 145000 },
  { country_code: 'CH', name: 'Winterthur',population: 115000 },
  { country_code: 'CH', name: 'Lucerne',   population:  81691 },
  { country_code: 'CH', name: 'St. Gallen',population:  75833 },

  // Cyprus (CY) - population: 1,207,359
  { country_code: 'CY', name: 'Nicosia',   population: 200452 },
  { country_code: 'CY', name: 'Limassol',  population: 101000 },
  { country_code: 'CY', name: 'Larnaca',   population:  51468 },
  { country_code: 'CY', name: 'Paphos',    population:  32814 },
  { country_code: 'CY', name: 'Famagusta', population:  42526 },

  // Denmark (DK) - population: 5,792,202
  { country_code: 'DK', name: 'Copenhagen', population: 794128 },
  { country_code: 'DK', name: 'Aarhus',     population: 285273 },
  { country_code: 'DK', name: 'Odense',     population: 180863 },
  { country_code: 'DK', name: 'Aalborg',    population: 115908 },
  { country_code: 'DK', name: 'Esbjerg',    population:  71609 },
  { country_code: 'DK', name: 'Randers',    population:  62730 },

  // Estonia (EE) - population: 1,326,535
  { country_code: 'EE', name: 'Tallinn',  population: 437619 },
  { country_code: 'EE', name: 'Tartu',    population:  97000 },
  { country_code: 'EE', name: 'Narva',    population:  58000 },
  { country_code: 'EE', name: 'Pärnu',    population:  51000 },
  { country_code: 'EE', name: 'Kohtla-Järve', population: 35000 },

  // Finland (FI) - population: 5,540,720
  { country_code: 'FI', name: 'Helsinki',  population: 655281 },
  { country_code: 'FI', name: 'Espoo',     population: 292913 },
  { country_code: 'FI', name: 'Tampere',   population: 238140 },
  { country_code: 'FI', name: 'Vantaa',    population: 232620 },
  { country_code: 'FI', name: 'Oulu',      population: 207993 },
  { country_code: 'FI', name: 'Turku',     population: 193150 },
  { country_code: 'FI', name: 'Jyväskylä',population: 141305 },
  { country_code: 'FI', name: 'Rovaniemi', population:  63164 },

  // Greece (GR) - population: 10,423,054
  { country_code: 'GR', name: 'Athens',       population: 664046 },
  { country_code: 'GR', name: 'Thessaloniki', population: 325182 },
  { country_code: 'GR', name: 'Patras',       population: 167446 },
  { country_code: 'GR', name: 'Piraeus',      population: 163688 },
  { country_code: 'GR', name: 'Heraklion',    population: 140730 },
  { country_code: 'GR', name: 'Larissa',      population: 144651 },
  { country_code: 'GR', name: 'Volos',        population:  86046 },
  { country_code: 'GR', name: 'Rhodes',       population:  50636 },

  // Croatia (HR) - population: 4,047,200
  { country_code: 'HR', name: 'Zagreb',    population: 790017 },
  { country_code: 'HR', name: 'Split',     population: 178102 },
  { country_code: 'HR', name: 'Rijeka',    population: 128624 },
  { country_code: 'HR', name: 'Osijek',    population: 108048 },
  { country_code: 'HR', name: 'Zadar',     population:  75062 },
  { country_code: 'HR', name: 'Dubrovnik', population:  42615 },

  // Hungary (HU) - population: 9,660,351
  { country_code: 'HU', name: 'Budapest',   population: 1752286 },
  { country_code: 'HU', name: 'Debrecen',   population:  202214 },
  { country_code: 'HU', name: 'Miskolc',    population:  158178 },
  { country_code: 'HU', name: 'Szeged',     population:  161879 },
  { country_code: 'HU', name: 'Pécs',       population:  145347 },
  { country_code: 'HU', name: 'Győr',       population:  127132 },
  { country_code: 'HU', name: 'Nyíregyháza',population:  118590 },
  { country_code: 'HU', name: 'Kecskemét', population:  111961 },

  // Iceland (IS) - population: 341,243
  { country_code: 'IS', name: 'Reykjavik',  population: 123000 },
  { country_code: 'IS', name: 'Kópavogur',  population:  36000 },
  { country_code: 'IS', name: 'Hafnarfjörður', population: 29000 },
  { country_code: 'IS', name: 'Akureyri',   population:  18000 },

  // Ireland (IE) - population: 4,937,786
  { country_code: 'IE', name: 'Dublin',     population: 1173179 },
  { country_code: 'IE', name: 'Cork',       population:  210000 },
  { country_code: 'IE', name: 'Limerick',   population:   94192 },
  { country_code: 'IE', name: 'Galway',     population:   80976 },
  { country_code: 'IE', name: 'Waterford',  population:   53504 },
  { country_code: 'IE', name: 'Kilkenny',   population:   26512 },

  // Kosovo (XK) - population: 1,810,366
  { country_code: 'XK', name: 'Pristina',  population: 210040 },
  { country_code: 'XK', name: 'Prizren',   population:  85000 },
  { country_code: 'XK', name: 'Ferizaj',   population:  70000 },
  { country_code: 'XK', name: 'Peja',      population:  64000 },
  { country_code: 'XK', name: 'Gjakova',   population:  60000 },

  // Latvia (LV) - population: 1,886,198
  { country_code: 'LV', name: 'Riga',      population: 632614 },
  { country_code: 'LV', name: 'Daugavpils',population:  80914 },
  { country_code: 'LV', name: 'Liepāja',   population:  68945 },
  { country_code: 'LV', name: 'Jelgava',   population:  56978 },
  { country_code: 'LV', name: 'Jūrmala',   population:  47831 },

  // Lithuania (LT) - population: 2,722,289
  { country_code: 'LT', name: 'Vilnius',   population: 574147 },
  { country_code: 'LT', name: 'Kaunas',    population: 289380 },
  { country_code: 'LT', name: 'Klaipėda', population: 149269 },
  { country_code: 'LT', name: 'Šiauliai',  population:  99233 },
  { country_code: 'LT', name: 'Panevėžys', population:  90376 },

  // Luxembourg (LU) - population: 625,978
  { country_code: 'LU', name: 'Luxembourg City', population: 122273 },
  { country_code: 'LU', name: 'Esch-sur-Alzette', population: 35000 },
  { country_code: 'LU', name: 'Differdange',      population: 27000 },
  { country_code: 'LU', name: 'Diekirch',         population:  7000 },

  // Moldova (MD) - population: 2,657,637
  { country_code: 'MD', name: 'Chișinău',  population: 532513 },
  { country_code: 'MD', name: 'Tiraspol',  population: 129500 },
  { country_code: 'MD', name: 'Bălți',     population:  97988 },
  { country_code: 'MD', name: 'Bender',    population:  91882 },

  // Montenegro (ME) - population: 628,066
  { country_code: 'ME', name: 'Podgorica', population: 150977 },
  { country_code: 'ME', name: 'Nikšić',    population:  56970 },
  { country_code: 'ME', name: 'Herceg Novi', population: 20000 },
  { country_code: 'ME', name: 'Bar',       population:  17000 },

  // North Macedonia (MK) - population: 2,083,459
  { country_code: 'MK', name: 'Skopje',   population: 506926 },
  { country_code: 'MK', name: 'Bitola',   population:  74550 },
  { country_code: 'MK', name: 'Kumanovo', population:  70842 },
  { country_code: 'MK', name: 'Tetovo',   population:  52915 },
  { country_code: 'MK', name: 'Ohrid',    population:  42000 },

  // Malta (MT) - population: 441,543
  { country_code: 'MT', name: 'Valletta',  population:  5827 },
  { country_code: 'MT', name: 'Birkirkara',population: 24000 },
  { country_code: 'MT', name: 'Mosta',     population: 20000 },
  { country_code: 'MT', name: 'St. Julian\'s', population: 18000 },
  { country_code: 'MT', name: 'Victoria',  population: 6500 },

  // Norway (NO) - population: 5,421,241
  { country_code: 'NO', name: 'Oslo',      population: 693491 },
  { country_code: 'NO', name: 'Bergen',    population: 285911 },
  { country_code: 'NO', name: 'Stavanger', population: 144031 },
  { country_code: 'NO', name: 'Trondheim', population: 207595 },
  { country_code: 'NO', name: 'Tromsø',    population:  77432 },
  { country_code: 'NO', name: 'Fredrikstad', population: 84530 },
  { country_code: 'NO', name: 'Kristiansand', population: 63469 },

  // Poland (PL) - population: 37,950,802
  { country_code: 'PL', name: 'Warsaw',    population: 1790658 },
  { country_code: 'PL', name: 'Kraków',   population:  779115 },
  { country_code: 'PL', name: 'Łódź',     population:  672185 },
  { country_code: 'PL', name: 'Wrocław',  population:  641607 },
  { country_code: 'PL', name: 'Poznań',   population:  538633 },
  { country_code: 'PL', name: 'Gdańsk',   population:  470907 },
  { country_code: 'PL', name: 'Szczecin', population:  401907 },
  { country_code: 'PL', name: 'Bydgoszcz',population:  352313 },
  { country_code: 'PL', name: 'Lublin',   population:  339784 },
  { country_code: 'PL', name: 'Katowice', population:  291000 },

  // Portugal (PT) - population: 10,196,709
  { country_code: 'PT', name: 'Lisbon',    population: 505526 },
  { country_code: 'PT', name: 'Porto',     population: 231800 },
  { country_code: 'PT', name: 'Braga',     population: 193333 },
  { country_code: 'PT', name: 'Amadora',   population: 175136 },
  { country_code: 'PT', name: 'Coimbra',   population: 143052 },
  { country_code: 'PT', name: 'Funchal',   population:  111892 },
  { country_code: 'PT', name: 'Setúbal',   population:  89303 },
  { country_code: 'PT', name: 'Faro',      population:  64560 },

  // Serbia (RS) - population: 6,804,596
  { country_code: 'RS', name: 'Belgrade',  population: 1694000 },
  { country_code: 'RS', name: 'Novi Sad',  population:  277522 },
  { country_code: 'RS', name: 'Niš',       population:  260237 },
  { country_code: 'RS', name: 'Subotica',  population:  141554 },
  { country_code: 'RS', name: 'Zemun',     population:  155000 },
  { country_code: 'RS', name: 'Čačak',     population:  73331 },

  // Sweden (SE) - population: 10,099,265
  { country_code: 'SE', name: 'Stockholm', population: 975904 },
  { country_code: 'SE', name: 'Gothenburg',population: 590580 },
  { country_code: 'SE', name: 'Malmö',     population: 351749 },
  { country_code: 'SE', name: 'Uppsala',   population: 233839 },
  { country_code: 'SE', name: 'Västerås',  population: 154049 },
  { country_code: 'SE', name: 'Örebro',    population: 155101 },
  { country_code: 'SE', name: 'Linköping', population: 163051 },
  { country_code: 'SE', name: 'Helsingborg',population: 147643 },
  { country_code: 'SE', name: 'Umeå',      population: 130224 },
  { country_code: 'SE', name: 'Kiruna',    population:  23167 },

  // Slovakia (SK) - population: 5,459,642
  { country_code: 'SK', name: 'Bratislava', population: 475503 },
  { country_code: 'SK', name: 'Košice',     population: 238593 },
  { country_code: 'SK', name: 'Prešov',     population:  91782 },
  { country_code: 'SK', name: 'Žilina',     population:  81104 },
  { country_code: 'SK', name: 'Banská Bystrica', population: 78327 },
  { country_code: 'SK', name: 'Nitra',      population:  77095 },

  // Slovenia (SI) - population: 2,100,126
  { country_code: 'SI', name: 'Ljubljana', population: 295504 },
  { country_code: 'SI', name: 'Maribor',   population: 111497 },
  { country_code: 'SI', name: 'Celje',     population:  49669 },
  { country_code: 'SI', name: 'Kranj',     population:  56132 },
  { country_code: 'SI', name: 'Koper',     population:  25000 },

  // Ukraine (UA) - population: 43,733,762
  { country_code: 'UA', name: 'Kyiv',         population: 2967360 },
  { country_code: 'UA', name: 'Kharkiv',      population: 1443210 },
  { country_code: 'UA', name: 'Odessa',       population: 1015826 },
  { country_code: 'UA', name: 'Dnipro',       population: 993094 },
  { country_code: 'UA', name: 'Donetsk',      population: 929063 },
  { country_code: 'UA', name: 'Zaporizhzhia', population: 722713 },
  { country_code: 'UA', name: 'Lviv',         population: 724314 },
  { country_code: 'UA', name: 'Mykolaiv',     population: 476101 },
  { country_code: 'UA', name: 'Mariupol',     population: 431859 },
  { country_code: 'UA', name: 'Vinnytsia',    population: 370606 },
  { country_code: 'UA', name: 'Cherkasy',     population: 279915 },
  { country_code: 'UA', name: 'Poltava',      population: 288674 },
];

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  const crypto = require('crypto');

  // Only seed if cities table is empty (idempotent — won't wipe user data on restart)
  const existing = await knex('cities').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    console.log('Cities already seeded, skipping.');
    return;
  }

  // Generate UUIDs for each city (SQLite has no built-in uuid()).
  // province_code/city_type must be explicit on every row (not just Tier 0
  // ones) — the libsql dialect's batch insert can't fill in missing keys
  // across a mixed-shape array the way some SQL dialects do.
  const citiesWithIds = cities.map(c => ({
    id: crypto.randomUUID(),
    province_code: null,
    city_type: 'major',
    ...c,
  }));

  const batchSize = 50;
  await knex.transaction(async (trx) => {
    for (let i = 0; i < citiesWithIds.length; i += batchSize) {
      await trx('cities').insert(citiesWithIds.slice(i, i + batchSize));
    }
  });
};

exports.cities = cities;
