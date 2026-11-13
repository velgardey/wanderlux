import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestItinerary } from '../src/lib/api.js';
import { createItinerary } from './fixtures/itineraries.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('client API boundary', () => {
  it('ends a slow request with a safe timeout message', async () => {
    const deadline = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      ),
    );
    const pending = requestItinerary(
      { mode: 'generate', prompt: 'Jaipur' },
      new AbortController().signal,
    );
    expect(timeoutSpy).toHaveBeenCalledWith(35_000);
    deadline.abort();
    await expect(pending).rejects.toThrow('This is taking too long. Try again.');
  });
  it('returns only a validated successful itinerary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: createItinerary() }))),
    );
    await expect(
      requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).resolves.toEqual(createItinerary());
  });
  it('rejects a malformed successful envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: {} }))),
    );
    await expect(
      requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toThrow('The server returned an itinerary we could not use.');
  });
  it('handles a proxy HTML error without showing raw HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>private diagnostics</html>', { status: 502 })),
    );
    await expect(
      requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toThrow('The request failed. Please try again.');
  });
  it('shows a validated server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'RATE_LIMIT', message: 'Please try again later.' } }),
            { status: 429 },
          ),
        ),
    );
    await expect(
      requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toThrow('Please try again later.');
  });
  it('handles offline/network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(
      requestItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toThrow('Could not reach the server. Check your connection and try again.');
  });
});
