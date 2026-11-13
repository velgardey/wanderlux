import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestLocation } from '../src/lib/locations.js';

afterEach(() => vi.unstubAllGlobals());

describe('browser map boundary', () => {
  it('encodes the query and validates coordinates', async () => {
    const location = { latitude: 26.92, longitude: 75.82, label: 'Jaipur, India' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ location })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await requestLocation('Jaipur & market', new AbortController().signal)).toEqual(
      location,
    );
    expect(fetchMock.mock.calls[0][0]).toBe('/api/location?query=Jaipur+%26+market');
  });

  it('accepts no match and rejects malformed/proxy responses with a safe message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ location: null }))),
    );
    expect(await requestLocation('Unknown', new AbortController().signal)).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>PRIVATE_PROXY_TEXT</html>', { status: 502 })),
    );
    await expect(requestLocation('Unknown', new AbortController().signal)).rejects.toThrow(
      'Map locations could not be loaded. Try again.',
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ location: { latitude: 100, longitude: 0, label: 'Bad' } })),
        ),
    );
    await expect(requestLocation('Unknown', new AbortController().signal)).rejects.toThrow(
      'Map locations could not be loaded. Try again.',
    );
  });
});
