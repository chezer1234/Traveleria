// A single country's outline, drawn from the shared world-atlas TopoJSON
// (lib/geo.js). Used on the Experiences tab's US/China section: black (ink)
// outline that lifts and turns Seven Wonders purple on hover, and links to
// the country page on click.
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import CountryLink from './CountryLink';
import { GEO_URL, getAlpha2 } from '../lib/geo';

// Projection per country, tuned for a 400x250 viewBox. US uses Albers USA so
// Alaska and Hawaii sit as insets instead of stretching the map.
const PROJECTIONS = {
  US: { projection: 'geoAlbersUsa', projectionConfig: { scale: 470 } },
  CN: { projection: 'geoMercator', projectionConfig: { center: [104, 37.5], scale: 285 } },
};

const WIDTH = 400;
const HEIGHT = 250;

export default function CountryOutline({ code, name }) {
  const config = PROJECTIONS[code] || { projection: 'geoMercator', projectionConfig: {} };

  return (
    <CountryLink
      code={code}
      className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-wonder"
    >
      <span className="sr-only">Go to {name}</span>
      <div className="transition-transform duration-200 ease-out group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
        <ComposableMap
          width={WIDTH}
          height={HEIGHT}
          projection={config.projection}
          projectionConfig={config.projectionConfig}
          style={{ width: '100%', height: 'auto' }}
          aria-hidden="true"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter((geo) => getAlpha2(geo) === code)
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className="fill-transparent stroke-ink group-hover:stroke-wonder group-focus-visible:stroke-wonder transition-colors duration-200"
                    style={{
                      default: { outline: 'none', strokeWidth: 1.5 },
                      hover: { outline: 'none', strokeWidth: 1.5 },
                      pressed: { outline: 'none', strokeWidth: 1.5 },
                    }}
                  />
                ))
            }
          </Geographies>
        </ComposableMap>
      </div>
    </CountryLink>
  );
}
