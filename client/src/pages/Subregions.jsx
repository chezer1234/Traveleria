import { useState, useEffect, useCallback } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { getSubregionsLocal } from '../lib/queries';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 numeric → alpha-2 (same mapping as Map.jsx)
const NUM_TO_ALPHA2 = {
  '004':'AF','008':'AL','012':'DZ','020':'AD','024':'AO','028':'AG','032':'AR','036':'AU',
  '040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','060':'BM',
  '064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN',
  '100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','132':'CV',
  '140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','158':'TW','170':'CO','174':'KM',
  '178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ',
  '208':'DK','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE',
  '242':'FJ','246':'FI','250':'FR','258':'PF','262':'DJ','266':'GA','268':'GE','270':'GM',
  '275':'PS','276':'DE','288':'GH','300':'GR','308':'GD','320':'GT','324':'GN','328':'GY',
  '332':'HT','340':'HN','348':'HU','352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ',
  '372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO',
  '404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS',
  '428':'LV','430':'LR','434':'LY','440':'LT','442':'LU','450':'MG','454':'MW','458':'MY',
  '462':'MV','466':'ML','470':'MT','478':'MR','480':'MU','484':'MX','496':'MN','498':'MD',
  '499':'ME','504':'MA','508':'MZ','512':'OM','516':'NA','520':'NR','524':'NP','528':'NL',
  '540':'NC','548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','578':'NO','586':'PK',
  '591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','624':'GW',
  '626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','682':'SA','686':'SN',
  '688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA',
  '716':'ZW','724':'ES','728':'SS','729':'SD','740':'SR','748':'SZ','752':'SE','756':'CH',
  '760':'SY','762':'TJ','764':'TH','768':'TG','776':'TO','780':'TT','784':'AE','788':'TN',
  '792':'TR','795':'TM','798':'TV','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB',
  '834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
  '732':'EH','736':'SD',
};

// Distinct colour per subregion, grouped loosely by continent family
export const SUBREGION_COLORS = {
  'Northern Europe':          '#16a34a',
  'Western Europe':           '#15803d',
  'Southern Europe':          '#4d7c0f',
  'Eastern Europe':           '#365314',
  'Western Asia':             '#7c3aed',
  'Central Asia':             '#6d28d9',
  'Southern Asia':            '#9333ea',
  'South-Eastern Asia':       '#c026d3',
  'Eastern Asia':             '#be185d',
  'Northern Africa':          '#d97706',
  'Western Africa':           '#f97316',
  'Middle Africa':            '#ef4444',
  'Eastern Africa':           '#dc2626',
  'Southern Africa':          '#9f1239',
  'Northern America':         '#1d4ed8',
  'Central America':          '#0284c7',
  'Caribbean':                '#0e7490',
  'South America':            '#0f766e',
  'Australia and New Zealand':'#a16207',
  'Melanesia':                '#92400e',
  'Micronesia':               '#78350f',
  'Polynesia':                '#713f12',
};

const CONTINENT_ORDER = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];

const SUBREGION_CONTINENT = {
  'Northern Europe': 'Europe',   'Western Europe': 'Europe',
  'Southern Europe': 'Europe',   'Eastern Europe': 'Europe',
  'Western Asia': 'Asia',        'Central Asia': 'Asia',
  'Southern Asia': 'Asia',       'South-Eastern Asia': 'Asia',
  'Eastern Asia': 'Asia',
  'Northern Africa': 'Africa',   'Western Africa': 'Africa',
  'Middle Africa': 'Africa',     'Eastern Africa': 'Africa',
  'Southern Africa': 'Africa',
  'Northern America': 'Americas','Central America': 'Americas',
  'Caribbean': 'Americas',       'South America': 'Americas',
  'Australia and New Zealand': 'Oceania',
  'Melanesia': 'Oceania',        'Micronesia': 'Oceania',
  'Polynesia': 'Oceania',
};

function flag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

export default function Subregions() {
  const { user, db, dbStatus } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [codeToSubregion, setCodeToSubregion] = useState({});

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const result = await getSubregionsLocal(db, user.id, user.home_country);
      setData(result);
      // Build lookup: country code → subregion name
      const map = {};
      for (const sr of result.subregions) {
        for (const c of sr.countries) map[c.code] = sr.name;
      }
      setCodeToSubregion(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id, user.home_country]);

  useEffect(() => {
    if (dbStatus === 'ready') load();
  }, [dbStatus, load]);

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="text-gray-500 text-sm">Loading subregions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { subregions, totalBonusPoints } = data;

  // Build visited set for map colouring
  const visitedCodes = new Set();
  for (const sr of subregions) {
    for (const c of sr.countries) {
      if (c.visited) visitedCodes.add(c.code);
    }
  }

  // Group subregions by continent
  const byCont = {};
  for (const sr of subregions) {
    const cont = SUBREGION_CONTINENT[sr.name] || 'Other';
    (byCont[cont] ||= []).push(sr);
  }

  const subregionsEarned = subregions.filter(sr => sr.earned > 0).length;
  const subregionsCompleted = subregions.filter(sr => sr.completionBonusEarned).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subregion Bonuses</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visit a subregion to earn bonus points. Visit every country in it to double them.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{totalBonusPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Bonus points earned</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{subregionsEarned}</p>
          <p className="text-xs text-gray-500 mt-1">Subregions visited</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{subregionsCompleted}</p>
          <p className="text-xs text-gray-500 mt-1">Subregions completed</p>
        </div>
      </div>

      {/* World map */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ComposableMap
          projectionConfig={{ scale: 147 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2 = NUM_TO_ALPHA2[geo.id];
                const subregion = alpha2 ? codeToSubregion[alpha2] : null;
                const baseColor = subregion ? SUBREGION_COLORS[subregion] : '#e5e7eb';
                const isVisited = alpha2 && visitedCodes.has(alpha2);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? baseColor : (subregion ? baseColor + '55' : '#e5e7eb')}
                    stroke="#fff"
                    strokeWidth={0.4}
                    style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SUBREGION_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
      </div>

      {/* Subregion cards by continent */}
      {CONTINENT_ORDER.map((continent) => {
        const srs = byCont[continent];
        if (!srs) return null;
        return (
          <div key={continent}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">{continent}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {srs.map((sr) => {
                const color = SUBREGION_COLORS[sr.name] || '#6b7280';
                const pct = sr.totalCount > 0 ? (sr.visitedCount / sr.totalCount) * 100 : 0;
                const isExpanded = expanded === sr.name;
                const maxTotal = sr.visitBonus === 0 ? 5 : sr.visitBonus * 2;

                return (
                  <div
                    key={sr.name}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* Card header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : sr.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium text-gray-900 text-sm">{sr.name}</span>
                          {sr.completionBonusEarned && (
                            <span className="text-yellow-500 text-sm" title="Completed!">★</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-indigo-600">
                            {sr.earned > 0 ? `+${sr.earned}` : '0'} pts
                          </span>
                          <span className="text-xs text-gray-400 ml-1">/ {maxTotal} max</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {sr.visitedCount}/{sr.totalCount}
                        </span>
                      </div>

                      {/* Bonus pills */}
                      <div className="flex gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sr.visitBonusEarned
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {sr.visitBonus === 0
                            ? 'Home region'
                            : sr.visitBonusEarned
                              ? `Visit +${sr.visitBonus}`
                              : `Visit: ${sr.visitBonus} pts`}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sr.completionBonusEarned
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {sr.completionBonusEarned
                            ? `Complete +${sr.completionBonus}`
                            : `Complete: ${sr.completionBonus} pts`}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded country list */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <div className="grid grid-cols-2 gap-1">
                          {sr.countries
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((c) => (
                              <div
                                key={c.code}
                                className={`flex items-center gap-1.5 text-xs py-0.5 ${
                                  c.visited ? 'text-gray-900' : 'text-gray-400'
                                }`}
                              >
                                <span>{flag(c.code)}</span>
                                <span>{c.name}</span>
                                {c.visited && <span className="text-green-500">✓</span>}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
