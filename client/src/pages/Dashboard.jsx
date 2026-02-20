import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserScore, getUserCountries, removeUserCountry } from '../api/client';

const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' }, { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' }, { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' }, { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
];

function HomeCountryModal({ onConfirm }) {
  const [selected, setSelected] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (selected) onConfirm(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to TravelPoints</h2>
        <p className="text-gray-600 text-sm mb-6">
          To calculate your travel points accurately, we need to know where you live.
          This information is only used during your current session and is not saved.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="homeCountry" className="block text-sm font-medium text-gray-700 mb-1">
              Where do you live?
            </label>
            <select
              id="homeCountry"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a country...</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!selected}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { sessionId, homeCountry, setHomeCountry } = useAuth();
  const [score, setScore] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (homeCountry) {
      loadData();
    }
  }, [homeCountry]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [scoreData, countriesData] = await Promise.all([
        getUserScore(sessionId, homeCountry),
        getUserCountries(sessionId, homeCountry),
      ]);
      setScore(scoreData);
      setCountries(countriesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveCountry(code, name) {
    if (!confirm(`Remove ${name} from your visited countries? This will also remove all city visits.`)) {
      return;
    }
    setRemoving(code);
    try {
      await removeUserCountry(sessionId, code);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  if (!homeCountry) {
    return <HomeCountryModal onConfirm={setHomeCountry} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-gray-500 text-sm">Loading your travel data...</p>
      </div>
    );
  }

  if (error && countries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="ml-4 text-red-700 underline hover:no-underline text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalPoints = score ? Math.round(score.totalPoints * 10) / 10 : 0;
  const countryCount = countries.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Score header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Your Travel Points</p>
        <p className="text-4xl sm:text-5xl font-bold text-indigo-600">{totalPoints.toLocaleString()}</p>
        <p className="text-gray-500 mt-2">
          {countryCount} {countryCount === 1 ? 'country' : 'countries'} visited
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Visited Countries</h2>
        <Link
          to="/add-countries"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Countries
        </Link>
      </div>

      {/* Countries list */}
      {countries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">You haven't logged any countries yet.</p>
          <Link
            to="/add-countries"
            className="text-indigo-600 font-medium hover:underline"
          >
            Start adding countries
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {countries.map((c) => {
            const explored = Math.round((c.explored || 0) * 100);
            return (
              <div
                key={c.country_code}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      to={`/countries/${c.country_code}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {c.country_name}
                    </Link>
                    <span className="text-xs text-gray-400">{c.region}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>{Math.round(c.total * 10) / 10} pts</span>
                    <span className="hidden sm:inline">Baseline: {Math.round(c.baseline * 10) / 10}</span>
                    <span>{c.cities_visited} {c.cities_visited === 1 ? 'city' : 'cities'}</span>
                  </div>
                  {/* Exploration bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs" role="progressbar" aria-valuenow={explored} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.country_name} exploration`}>
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(explored, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{explored}% explored</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveCountry(c.country_code, c.country_name)}
                  disabled={removing === c.country_code}
                  className="ml-4 text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Remove ${c.country_name}`}
                >
                  {removing === c.country_code ? '...' : 'Remove'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
