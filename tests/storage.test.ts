import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readSessions, saveSession, sessionsStorageKey } from '../src/lib/storage.js';
import { createItinerary } from './fixtures/itineraries.js';
import type { SavedSession } from '../shared/itinerary.js';

function session(id = 'session-1'): SavedSession {
  const itinerary = createItinerary();
  itinerary.days[0].stops.reverse();
  itinerary.days[1].stops = [];
  return {
    version: 1,
    id,
    savedAt: '2026-11-13T00:00:00Z',
    prompt: 'Jaipur',
    itinerary,
    checkedItemIds: ['water'],
  };
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('local saved sessions', () => {
  it('starts with no saved sessions', () => {
    expect(readSessions()).toEqual([]);
  });
  it('preserves reordered stops, empty days, and checked items', () => {
    saveSession(session());
    expect(readSessions()).toEqual([session()]);
  });
  it('updates an existing session and keeps the five latest saves', () => {
    for (let index = 0; index < 6; index += 1) saveSession(session(`session-${index}`));
    expect(readSessions()).toHaveLength(5);
    expect(readSessions().some((saved) => saved.id === 'session-0')).toBe(false);
    saveSession({ ...session('session-3'), prompt: 'Updated trip' });
    expect(readSessions()[0].prompt).toBe('Updated trip');
    expect(readSessions()).toHaveLength(5);
  });
  it.each(['{broken json', '[{"version":2}]', '{"unexpected":true}'])(
    'reports corrupted data without deleting it: %s',
    (stored) => {
      localStorage.setItem(sessionsStorageKey, stored);
      expect(() => readSessions()).toThrow('Saved trips could not be read.');
      expect(localStorage.getItem(sessionsStorageKey)).toBe(stored);
    },
  );
  it('rejects invalid sessions before changing storage', () => {
    expect(() => saveSession({ ...session(), prompt: '' })).toThrow(
      'This trip could not be saved.',
    );
    expect(localStorage.getItem(sessionsStorageKey)).toBeNull();
  });
  it('explains denied writes without destroying the working input', () => {
    const input = session();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'QuotaExceededError');
    });
    expect(() => saveSession(input)).toThrow('Your browser could not save this trip.');
    expect(input.itinerary.days[0].stops[0].id).toBe('stop-market');
  });
});
