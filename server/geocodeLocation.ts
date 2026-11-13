import { setTimeout as wait } from 'node:timers/promises';
import { z } from 'zod';
import { LocationQuerySchema, MapLocationSchema, type MapLocation } from '../shared/map.js';
import { PlannerError } from './generateItinerary.js';

const PhotonResponseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal('Point'),
          coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
        }),
        properties: z.object({
          name: z.string().max(200).optional(),
          city: z.string().max(120).optional(),
          country: z.string().max(120).optional(),
        }),
      }),
    )
    .max(10),
});

// shortcut: process-only cache, use a shared persistent cache for a hosted app.
const cache = new Map<string, MapLocation | null>();
let lookupQueue: Promise<void> = Promise.resolve();
let lastLookupStartedAt = 0;

export async function geocodeLocation(
  query: string,
  signal: AbortSignal,
): Promise<MapLocation | null> {
  const checkedQuery = LocationQuerySchema.safeParse(query);
  if (!checkedQuery.success) {
    throw new PlannerError(400, 'INVALID_LOCATION', 'Enter a valid location.');
  }
  let endpoint: URL;
  try {
    endpoint = new URL(process.env.PHOTON_ENDPOINT || 'https://photon.komoot.io/api/');
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      throw new Error('Use a complete HTTPS Photon search endpoint.');
    }
  } catch (error) {
    throw new PlannerError(
      503,
      'MAP_CONFIGURATION',
      'The map lookup service needs a valid endpoint.',
      { cause: error },
    );
  }

  const cacheKey = `${endpoint.href}:${checkedQuery.data}`;
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
  const lookup = lookupQueue.then(async () => {
    requestSignal.throwIfAborted();
    const cachedLocation = cache.get(cacheKey);
    if (cachedLocation !== undefined) return cachedLocation;
    // Serialize across all browser requests and keep a modest rate on the public demo.
    await wait(Math.max(0, 1100 - (Date.now() - lastLookupStartedAt)), undefined, {
      signal: requestSignal,
    });
    requestSignal.throwIfAborted();
    lastLookupStartedAt = Date.now();
    endpoint.searchParams.set('q', checkedQuery.data);
    endpoint.searchParams.set('limit', '1');
    endpoint.searchParams.set('lang', 'en');
    const response = await fetch(endpoint.href, {
      signal: requestSignal,
      headers: { 'User-Agent': 'Wanderlux-Local-Trip-Planner/0.1', Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Map provider HTTP status ${response.status}`);
    const payload = PhotonResponseSchema.parse(await response.json());
    const match = payload.features[0];
    let location: MapLocation | null = null;
    if (match) {
      // GeoJSON uses longitude first; the client receives explicitly named fields.
      const [longitude, latitude] = match.geometry.coordinates;
      const label =
        [match.properties.name, match.properties.city, match.properties.country]
          .filter(Boolean)
          .join(', ') || checkedQuery.data;
      location = MapLocationSchema.parse({ latitude, longitude, label });
    }
    const oldestKey = cache.keys().next().value;
    if (cache.size >= 256 && oldestKey !== undefined) cache.delete(oldestKey);
    cache.set(cacheKey, location);
    return location;
  });
  // One failed/cancelled lookup must not poison later requests in the queue.
  lookupQueue = lookup.then(
    () => undefined,
    () => undefined,
  );
  try {
    return await lookup;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PlannerError(
      503,
      'MAP_LOOKUP_FAILED',
      'Map locations could not be loaded. Try again.',
      { cause: error },
    );
  }
}
