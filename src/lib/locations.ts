import { LocationResponseSchema, type MapLocation } from '../../shared/map.js';

export async function requestLocation(
  query: string,
  signal: AbortSignal,
): Promise<MapLocation | null> {
  try {
    const parameters = new URLSearchParams({ query });
    const response = await fetch(`/api/location?${parameters}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok) throw new Error(`Location request failed (HTTP ${response.status}).`);
    return LocationResponseSchema.parse(await response.json()).location;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Map locations could not be loaded. Try again.', { cause: error });
  }
}
