import { useEffect, useMemo, useRef, useState } from 'react';
import type { Itinerary } from '../../shared/itinerary.js';
import type { MapLocation } from '../../shared/map.js';
import { requestLocation } from '../lib/locations.js';

export function useMapLocations(itinerary: Itinerary) {
  const queries = useMemo(
    () => [...new Set(itinerary.days.flatMap((day) => day.stops.map((stop) => stop.location)))],
    [itinerary],
  );
  const cache = useRef(new Map<string, MapLocation | null>());
  const [locations, setLocations] = useState(new Map<string, MapLocation | null>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(queries.length > 0);
    setError('');
    async function loadLocations() {
      try {
        for (const query of queries) {
          controller.signal.throwIfAborted();
          if (cache.current.has(query)) continue;
          const location = await requestLocation(query, controller.signal);
          // An old response must not populate a newly loaded trip or an unmounted map.
          controller.signal.throwIfAborted();
          cache.current.set(query, location);
          setLocations(new Map(cache.current));
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Map locations could not be loaded. Try again.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    // Let React's development setup/cleanup check finish before starting network work.
    queueMicrotask(() => void loadLocations());
    return () => controller.abort();
  }, [queries, attempt]);

  return { locations, loading, error, retry: () => setAttempt((current) => current + 1) };
}
