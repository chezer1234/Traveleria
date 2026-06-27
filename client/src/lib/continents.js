// Maps UN M.49 subregion names (stored in countries.subregion) to the 7
// British-school continents used in the group battle bar chart.

export const SUBREGION_TO_CONTINENT = {
  'Northern Europe': 'Europe',
  'Western Europe': 'Europe',
  'Southern Europe': 'Europe',
  'Eastern Europe': 'Europe',
  'Western Asia': 'Asia',
  'Central Asia': 'Asia',
  'Southern Asia': 'Asia',
  'South-Eastern Asia': 'Asia',
  'Eastern Asia': 'Asia',
  'Northern Africa': 'Africa',
  'Western Africa': 'Africa',
  'Middle Africa': 'Africa',
  'Eastern Africa': 'Africa',
  'Southern Africa': 'Africa',
  'Northern America': 'North America',
  'Central America': 'North America',
  'Caribbean': 'North America',
  'South America': 'South America',
  'Australia and New Zealand': 'Oceania',
  'Melanesia': 'Oceania',
  'Micronesia': 'Oceania',
  'Polynesia': 'Oceania',
};

export const CONTINENTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];

export function getContinent(subregion) {
  return SUBREGION_TO_CONTINENT[subregion] || null;
}
