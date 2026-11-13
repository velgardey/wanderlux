import { useEffect, useMemo, useState } from 'react';
import { divIcon, latLngBounds } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Itinerary, Stop } from '../../shared/itinerary.js';
import type { MapLocation } from '../../shared/map.js';
import { useMapLocations } from '../hooks/useMapLocations.js';
import { formatDuration } from '../lib/itinerary.js';

const dayColors = ['#1f4d40', '#9a3412', '#155e75', '#1d4ed8', '#9f1239', '#475569', '#854d0e'];
type PlottedStop = { stop: Stop; number: string; color: string; location: MapLocation };

function FitMap({ stops }: { stops: PlottedStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    map.fitBounds(
      latLngBounds(stops.map(({ location }) => [location.latitude, location.longitude])),
      {
        padding: [28, 28],
        maxZoom: 15,
        animate: false,
      },
    );
  }, [map, stops]);
  return null;
}

export default function MapView({ itinerary }: { itinerary: Itinerary }) {
  const { locations, loading, error, retry } = useMapLocations(itinerary);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const plottedStops = useMemo(
    () =>
      itinerary.days.flatMap((day) =>
        day.stops.flatMap((stop, index) => {
          const location = locations.get(stop.location);
          return location
            ? [
                {
                  stop,
                  location,
                  number: `${day.dayNumber}.${index + 1}`,
                  color: dayColors[day.dayNumber - 1],
                },
              ]
            : [];
        }),
      ),
    [itinerary, locations],
  );

  // Area-level matches can coincide: one pin lists every stop at that point.
  const groups = new Map<string, PlottedStop[]>();
  for (const plotted of plottedStops) {
    const key = `${plotted.location.latitude},${plotted.location.longitude}`;
    const group = groups.get(key) ?? [];
    group.push(plotted);
    groups.set(key, group);
  }
  const missingStops = itinerary.days
    .flatMap((day) => day.stops)
    .filter((stop) => locations.get(stop.location) === null);

  function retryMap() {
    setTilesFailed(false);
    setTileAttempt((current) => current + 1);
    retry();
  }

  return (
    <div className="mt-4 min-w-0">
      <ul
        className="mb-3 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-xs"
        aria-label="Map day colors"
      >
        {itinerary.days.map((day) => (
          <li className="flex items-center gap-2" key={day.dayNumber}>
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: dayColors[day.dayNumber - 1] }}
              aria-hidden="true"
            />
            Day {day.dayNumber}
          </li>
        ))}
      </ul>
      {plottedStops.length > 0 ? (
        <div
          className="isolate overflow-hidden rounded-xl border border-line"
          role="region"
          aria-label="Itinerary map"
        >
          <MapContainer
            className="h-[360px] w-full phone:h-[420px]"
            center={[plottedStops[0].location.latitude, plottedStops[0].location.longitude]}
            zoom={13}
            scrollWheelZoom={false}
            zoomAnimation={false}
            fadeAnimation={false}
          >
            <TileLayer
              key={tileAttempt}
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              eventHandlers={{ tileerror: () => setTilesFailed(true) }}
            />
            <FitMap stops={plottedStops} />
            {[...groups.entries()].map(([key, group]) => {
              const first = group[0];
              const markerLabel = `${first.number}${group.length > 1 ? '+' : ''}`;
              const markerTitle = group
                .map(({ number, stop }) => `${number} ${stop.title}`)
                .join('; ');
              // Only validated numeric labels and our fixed colors enter Leaflet's icon HTML.
              const icon = divIcon({
                className: 'trip-map-pin',
                html: `<span style="background:${first.color}">${markerLabel}</span>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              });
              return (
                <Marker
                  // Leaflet's title is creation-only; recreate the pin when its label changes.
                  key={`${key}:${markerTitle}`}
                  position={[first.location.latitude, first.location.longitude]}
                  icon={icon}
                  title={markerTitle}
                  eventHandlers={{
                    // Div icons need an explicit name; their visible number is not enough.
                    add: (event) =>
                      event.target.getElement()?.setAttribute('aria-label', markerTitle),
                  }}
                >
                  <Popup maxWidth={180} maxHeight={200}>
                    {group.map(({ number, stop, location }) => (
                      <div key={stop.id}>
                        <strong>
                          {number} · {stop.title}
                        </strong>
                        <p>
                          {location.label}
                          <br />
                          {formatDuration(stop.durationMinutes)}
                        </p>
                      </div>
                    ))}
                  </Popup>
                </Marker>
              );
            })}
            {itinerary.days.flatMap((day) =>
              day.stops.slice(1).map((stop, index) => {
                const previous = locations.get(day.stops[index].location);
                const current = locations.get(stop.location);
                if (!previous || !current) return null;
                return (
                  <Polyline
                    key={`${day.dayNumber}-${stop.id}`}
                    positions={[
                      [previous.latitude, previous.longitude],
                      [current.latitude, current.longitude],
                    ]}
                    pathOptions={{
                      color: dayColors[day.dayNumber - 1],
                      weight: 3,
                      dashArray: '6 6',
                    }}
                  />
                );
              }),
            )}
          </MapContainer>
        </div>
      ) : (
        <p className="grid min-h-[140px] place-items-center rounded-xl border border-line bg-page p-5 text-center text-sm text-muted">
          {loading ? 'Finding map locations…' : 'No locations to display on the map.'}
        </p>
      )}
      <p className="small-copy mt-3" role="status">
        {loading ? 'Finding locations… ' : ''}
        {plottedStops.length} stops located. Lines show visit order, not road directions. Pins may
        show an approximate area.
      </p>
      {missingStops.length > 0 ? (
        <p className="small-copy mt-2">
          Could not locate: {missingStops.map((stop) => stop.title).join(', ')}.
        </p>
      ) : null}
      {error || tilesFailed ? (
        <div className="mt-3 text-xs text-danger" role="alert">
          <p>{error || 'The map background could not load. Located stops are still available.'}</p>
          <button className="text-button mt-2" type="button" onClick={retryMap}>
            Retry map
          </button>
        </div>
      ) : null}
      <p className="small-copy mt-2">
        Place lookup by{' '}
        <a className="underline" href="https://photon.komoot.io">
          Photon
        </a>
        , using OpenStreetMap data.
      </p>
    </div>
  );
}
