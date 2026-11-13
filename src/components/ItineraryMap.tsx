import { useEffect, useState, type ComponentType } from 'react';
import { Map } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';

export function ItineraryMap({ itinerary }: { itinerary: Itinerary }) {
  const [open, setOpen] = useState(false);
  const [MapView, setMapView] = useState<ComponentType<{ itinerary: Itinerary }> | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!open || MapView) return;
    let active = true;
    setLoadError('');
    async function loadMap() {
      try {
        const module = await import('./MapView.js');
        if (active) setMapView(() => module.default);
      } catch {
        // A failed optional download must not throw through React and clear the trip.
        if (active)
          setLoadError(
            'The map could not open. Save your trip, then reload the page to try again.',
          );
      }
    }
    void loadMap();
    return () => {
      active = false;
    };
  }, [open, MapView]);
  return (
    <section className="mt-7 border-t border-line pt-5" aria-labelledby="trip-map-heading">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold" id="trip-map-heading">
          <Map size={18} aria-hidden="true" />
          Trip map
        </h3>
        <button
          className="button button-secondary"
          type="button"
          aria-expanded={open}
          aria-controls="trip-map"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Hide map' : 'Show map'}
        </button>
      </div>
      <div id="trip-map" hidden={!open}>
        {open && loadError ? (
          <p className="mt-4 text-xs text-danger" role="alert">
            {loadError}
          </p>
        ) : null}
        {open && !loadError && MapView ? <MapView itinerary={itinerary} /> : null}
        {open && !loadError && !MapView ? (
          <p className="small-copy mt-4" role="status">
            Opening map…
          </p>
        ) : null}
      </div>
    </section>
  );
}
