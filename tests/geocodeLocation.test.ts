// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function photonResponse(longitude = 75.8237, latitude = 26.9258) {
  return new Response(
    JSON.stringify({
      features: [
        {
          geometry: { type: 'Point', coordinates: [longitude, latitude] },
          properties: { name: 'City Palace', city: 'Jaipur', country: 'India' },
        },
      ],
    }),
  );
}

describe('Photon lookup', () => {
  it('converts GeoJSON longitude/latitude and caches the matched result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(photonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    const signal = new AbortController().signal;
    const location = await geocodeLocation('City Palace, Jaipur', signal);
    expect(location).toEqual({
      latitude: 26.9258,
      longitude: 75.8237,
      label: 'City Palace, Jaipur, India',
    });
    expect(await geocodeLocation('City Palace, Jaipur', signal)).toEqual(location);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('City Palace, Jaipur');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('caches missing locations without inventing a coordinate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ features: [] })));
    vi.stubGlobal('fetch', fetchMock);
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    const signal = new AbortController().signal;
    expect(await geocodeLocation('Unknown place', signal)).toBeNull();
    expect(await geocodeLocation('Unknown place', signal)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects out-of-range coordinates with a safe error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(photonResponse(190, 95)));
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    await expect(geocodeLocation('Jaipur', new AbortController().signal)).rejects.toMatchObject({
      code: 'MAP_LOOKUP_FAILED',
    });
  });

  it('rejects invalid query/configuration before contacting Photon', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    await expect(geocodeLocation(' ', new AbortController().signal)).rejects.toMatchObject({
      status: 400,
    });
    vi.stubEnv('PHOTON_ENDPOINT', 'https://user:password@example.com/api');
    await expect(geocodeLocation('Jaipur', new AbortController().signal)).rejects.toMatchObject({
      code: 'MAP_CONFIGURATION',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serializes concurrent uncached queries at least one second apart', async () => {
    const starts: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        starts.push(Date.now());
        return photonResponse();
      }),
    );
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    const signal = new AbortController().signal;
    await Promise.all([
      geocodeLocation('City Palace, Jaipur', signal),
      geocodeLocation('Hawa Mahal, Jaipur', signal),
    ]);
    expect(starts).toHaveLength(2);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000);
  });

  it('cancels queued work without contacting the service', async () => {
    const fetchMock = vi.fn().mockResolvedValue(photonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { geocodeLocation } = await import('../server/geocodeLocation.js');
    await geocodeLocation('City Palace, Jaipur', new AbortController().signal);
    const controller = new AbortController();
    const pending = geocodeLocation('Hawa Mahal, Jaipur', controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
