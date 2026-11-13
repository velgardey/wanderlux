import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlanner } from '../src/hooks/usePlanner.js';
import { requestItinerary } from '../src/lib/api.js';
import { createItinerary } from './fixtures/itineraries.js';
import type { Itinerary, SavedSession } from '../shared/itinerary.js';

vi.mock('../src/lib/api.js', () => ({ requestItinerary: vi.fn() }));
const mockedRequest = vi.mocked(requestItinerary);
function deferred() {
  let resolve!: (itinerary: Itinerary) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Itinerary>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
function savedSession(): SavedSession {
  return {
    version: 1,
    id: 'saved',
    savedAt: '2026-11-13T00:00:00Z',
    prompt: 'Jaipur',
    itinerary: createItinerary(),
    checkedItemIds: ['water'],
  };
}
beforeEach(() => mockedRequest.mockReset());

describe('planner request lifecycle', () => {
  it('commits a validated result and the successful prompt', async () => {
    mockedRequest.mockResolvedValue(createItinerary());
    const { result } = renderHook(() => usePlanner());
    await act(async () => {
      await result.current.generate('Jaipur');
    });
    expect(result.current.itinerary).toEqual(createItinerary());
    expect(result.current.prompt).toBe('Jaipur');
    expect(result.current.status).toBe('success');
  });

  it('rejects blank input without calling the API', async () => {
    const { result } = renderHook(() => usePlanner());
    await act(async () => {
      await result.current.generate('   ');
    });
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('ignores an old result when a newer request finishes first', async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    mockedRequest.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const { result } = renderHook(() => usePlanner());
    act(() => {
      void result.current.generate('old');
      void result.current.generate('new');
    });
    const newer = { ...createItinerary(), title: 'New trip' };
    await act(async () => {
      newRequest.resolve(newer);
    });
    await act(async () => {
      oldRequest.resolve(createItinerary());
    });
    expect(result.current.itinerary?.title).toBe('New trip');
    expect(result.current.prompt).toBe('new');
  });

  it('does not let an obsolete error or cleanup clear the newer loading state', async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    mockedRequest.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const { result } = renderHook(() => usePlanner());
    act(() => {
      void result.current.generate('old');
      void result.current.generate('new');
    });
    await act(async () => {
      oldRequest.reject(new Error('Old failure'));
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.error).toBe('');
    await act(async () => {
      newRequest.resolve(createItinerary());
    });
  });

  it('ignores a result that arrives just after cancellation', async () => {
    const pending = deferred();
    mockedRequest.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePlanner());
    act(() => {
      void result.current.generate('Jaipur');
      result.current.cancel();
    });
    await act(async () => {
      pending.resolve(createItinerary());
    });
    expect(result.current.itinerary).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('preserves the previous itinerary on failure and retries the failed snapshot', async () => {
    mockedRequest
      .mockResolvedValueOnce(createItinerary())
      .mockRejectedValueOnce(new Error('Try again'))
      .mockResolvedValueOnce(createItinerary());
    const { result } = renderHook(() => usePlanner());
    await act(async () => {
      await result.current.generate('Jaipur');
    });
    await act(async () => {
      await result.current.generate('Delhi');
    });
    expect(result.current.itinerary?.title).toBe('Three days in Jaipur');
    expect(result.current.canRetry).toBe(true);
    await act(async () => {
      await result.current.retry();
    });
    expect(mockedRequest.mock.calls[2][0]).toEqual({ mode: 'generate', prompt: 'Delhi' });
  });

  it('refines the edited itinerary and invalidates retry after another edit', async () => {
    mockedRequest
      .mockResolvedValueOnce(createItinerary())
      .mockRejectedValueOnce(new Error('Refinement failed'));
    const { result } = renderHook(() => usePlanner());
    await act(async () => {
      await result.current.generate('Jaipur');
    });
    act(() => result.current.removeStop('stop-lunch'));
    await act(async () => {
      await result.current.refine('less walking');
    });
    const refinement = mockedRequest.mock.calls[1][0];
    expect(refinement.mode).toBe('refine');
    if (refinement.mode === 'refine') expect(refinement.itinerary.days[0].stops).toHaveLength(2);
    expect(result.current.itinerary?.days[0].stops).toHaveLength(2);
    act(() => result.current.removeStop('stop-market'));
    expect(result.current.canRetry).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('loads a saved trip and ignores an in-flight result', async () => {
    const pending = deferred();
    mockedRequest.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePlanner());
    act(() => {
      void result.current.generate('other');
      result.current.loadSession(savedSession());
    });
    await act(async () => {
      pending.resolve({ ...createItinerary(), title: 'Obsolete trip' });
    });
    expect(result.current.itinerary?.title).toBe('Three days in Jaipur');
    expect(result.current.checkedItemIds).toEqual(['water']);
    expect(result.current.canRetry).toBe(false);
  });

  it('preserves surviving expansion and checklist state after refinement', async () => {
    mockedRequest.mockResolvedValue(createItinerary());
    const { result } = renderHook(() => usePlanner());
    await act(async () => {
      await result.current.generate('Jaipur');
    });
    act(() => {
      result.current.toggleExpanded('stop-palace');
      result.current.toggleChecklistItem('water');
    });
    await act(async () => {
      await result.current.refine('Keep this plan');
    });
    expect(result.current.expandedStopIds).toEqual(['stop-palace']);
    expect(result.current.checkedItemIds).toEqual(['water']);
  });
});
