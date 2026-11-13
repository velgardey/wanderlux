import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestItinerary } from '../src/lib/api.js';
import { createItinerary } from './fixtures/itineraries.js';

afterEach(() => vi.unstubAllGlobals());
describe('client API boundary', () => {
  it('returns only a validated successful itinerary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: createItinerary() }))));
    await expect(requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal)).resolves.toEqual(createItinerary());
  });
  it('rejects a malformed successful envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: {} }))));
    await expect(requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal)).rejects.toThrow('The server returned an itinerary we could not use.');
  });
  it('handles a proxy HTML error without showing raw HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>private diagnostics</html>', { status: 502 })));
    await expect(requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal)).rejects.toThrow('The request failed. Please try again.');
  });
  it('shows a validated server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'RATE_LIMIT', message: 'Please try again later.' } }), { status: 429 })));
    await expect(requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal)).rejects.toThrow('Please try again later.');
  });
  it('handles offline/network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal)).rejects.toThrow('Could not reach the server. Check your connection and try again.');
  });
});
