import { describe, expect, it } from 'vitest';
import { removeStop, moveStop, formatDuration } from '../src/lib/itinerary.js';
import { createItinerary } from './fixtures/itineraries.js';

describe('local itinerary edits', () => {
  it('removes only the selected stop without changing the original', () => {
    const original = createItinerary();
    const changed = removeStop(original, 'stop-lunch');
    expect(changed.days[0].stops.map((stop) => stop.id)).toEqual(['stop-palace', 'stop-market']);
    expect(original.days[0].stops).toHaveLength(3);
    expect(changed.days[1]).toEqual(original.days[1]);
  });
  it('keeps the day after its last stop is removed', () => {
    expect(removeStop(createItinerary(), 'stop-garden').days[1].stops).toEqual([]);
  });
  it('moves a middle stop in either direction without mutating the original', () => {
    const original = createItinerary();
    expect(moveStop(original, 'stop-lunch', -1).days[0].stops.map((stop) => stop.id)).toEqual(['stop-lunch', 'stop-palace', 'stop-market']);
    expect(moveStop(original, 'stop-lunch', 1).days[0].stops.map((stop) => stop.id)).toEqual(['stop-palace', 'stop-market', 'stop-lunch']);
    expect(original.days[0].stops[1].id).toBe('stop-lunch');
  });
  it('does nothing for a missing stop or a move past a day boundary', () => {
    const original = createItinerary();
    expect(moveStop(original, 'stop-palace', -1)).toBe(original);
    expect(moveStop(original, 'unknown', 1)).toBe(original);
    expect(removeStop(original, 'unknown')).toEqual(original);
  });
  it.each([[0, '0 min'], [45, '45 min'], [60, '1h'], [90, '1h 30m']])('formats %i minutes as %s', (minutes, label) => {
    expect(formatDuration(minutes as number)).toBe(label);
  });
});
