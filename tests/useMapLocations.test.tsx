import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestLocation } from '../src/lib/locations.js';
import { useMapLocations } from '../src/hooks/useMapLocations.js';
import { createItinerary } from './fixtures/itineraries.js';
import { StrictMode } from 'react';

vi.mock('../src/lib/locations.js', () => ({ requestLocation: vi.fn() }));
beforeEach(() => vi.mocked(requestLocation).mockReset());
const matchedLocation = { latitude: 26.92, longitude: 75.82, label: 'Jaipur, India' };

describe('map locations', () => {
  it('does not issue duplicate lookups during the development effect check', async () => {
    vi.mocked(requestLocation).mockResolvedValue(matchedLocation);
    const itinerary = createItinerary();
    const { result } = renderHook(() => useMapLocations(itinerary), { wrapper: StrictMode });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestLocation).toHaveBeenCalledTimes(3);
  });
  it('deduplicates queries, exposes progressive results and reuses results after edits', async () => {
    let finishMarket: ((location: typeof matchedLocation) => void) | undefined;
    vi.mocked(requestLocation).mockImplementation(async (query) => {
      if (query === 'Johari Bazaar')
        return new Promise((resolve) => {
          finishMarket = resolve;
        });
      return matchedLocation;
    });
    const itinerary = createItinerary();
    const { result, rerender } = renderHook(({ trip }) => useMapLocations(trip), {
      initialProps: { trip: itinerary },
    });
    await waitFor(() =>
      expect(result.current.locations.get('Old Jaipur')).toEqual(matchedLocation),
    );
    expect(result.current.loading).toBe(true);
    expect(requestLocation).toHaveBeenCalledTimes(2);
    await act(async () => finishMarket?.(matchedLocation));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestLocation).toHaveBeenCalledTimes(3);
    const edited = createItinerary();
    edited.days[0].stops.reverse();
    rerender({ trip: edited });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestLocation).toHaveBeenCalledTimes(3);
  });

  it('aborts stale lookups and ignores their late result after loading another trip', async () => {
    let finishOld: ((location: typeof matchedLocation) => void) | undefined;
    let oldSignal: AbortSignal | undefined;
    vi.mocked(requestLocation).mockImplementation(async (query, signal) => {
      if (query === 'Old Jaipur') {
        oldSignal = signal;
        return new Promise((resolve) => {
          finishOld = resolve;
        });
      }
      return null;
    });
    const { result, rerender, unmount } = renderHook(({ trip }) => useMapLocations(trip), {
      initialProps: { trip: createItinerary() },
    });
    await waitFor(() => expect(oldSignal).toBeDefined());
    const nextTrip = createItinerary();
    nextTrip.days = [
      { ...nextTrip.days[0], stops: [{ ...nextTrip.days[0].stops[0], location: 'Kyoto' }] },
    ];
    rerender({ trip: nextTrip });
    await waitFor(() => expect(result.current.locations.has('Kyoto')).toBe(true));
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => finishOld?.(matchedLocation));
    expect(result.current.locations.has('Old Jaipur')).toBe(false);
    expect(result.current.error).toBe('');
    const newestSignal = vi.mocked(requestLocation).mock.calls.at(-1)![1];
    unmount();
    expect(newestSignal.aborted).toBe(true);
  });

  it('retries a transient failure without repeating successful queries', async () => {
    vi.mocked(requestLocation)
      .mockResolvedValue(matchedLocation)
      .mockResolvedValueOnce(matchedLocation)
      .mockRejectedValueOnce(new Error('Map locations could not be loaded. Try again.'));
    const itinerary = createItinerary();
    const { result } = renderHook(() => useMapLocations(itinerary));
    await waitFor(() => expect(result.current.error).toContain('Try again'));
    expect(result.current.locations.get('Old Jaipur')).toEqual(matchedLocation);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('');
    expect(
      vi.mocked(requestLocation).mock.calls.filter(([query]) => query === 'Old Jaipur'),
    ).toHaveLength(1);
  });
});
