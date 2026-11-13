import {
  SavedSessionSchema,
  SavedSessionsSchema,
  type SavedSession,
} from '../../shared/itinerary.js';

export const sessionsStorageKey = 'trip-planner:sessions:v1';
export function readSessions(): SavedSession[] {
  try {
    const storedText = localStorage.getItem(sessionsStorageKey);
    if (!storedText) return [];
    return SavedSessionsSchema.parse(JSON.parse(storedText));
  } catch (error) {
    // Do not silently delete corrupted data: the user may want to recover it.
    throw new Error('Saved trips could not be read.', { cause: error });
  }
}
export function saveSession(session: SavedSession): SavedSession[] {
  const checkedSession = SavedSessionSchema.safeParse(session);
  if (!checkedSession.success)
    throw new Error('This trip could not be saved.', { cause: checkedSession.error });
  const previousSessions = readSessions();
  const otherSessions = previousSessions.filter((saved) => saved.id !== session.id);
  const nextSessions = [checkedSession.data, ...otherSessions].slice(0, 5);
  try {
    localStorage.setItem(sessionsStorageKey, JSON.stringify(nextSessions));
    return nextSessions;
  } catch (error) {
    throw new Error('Your browser could not save this trip.', { cause: error });
  }
}
