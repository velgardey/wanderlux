import type { Itinerary } from '../../shared/itinerary.js';

export function removeStop(itinerary: Itinerary, stopId: string): Itinerary {
  const days = itinerary.days.map((day) => {
    const remainingStops = day.stops.filter((stop) => stop.id !== stopId);
    return { ...day, stops: remainingStops };
  });
  return { ...itinerary, days };
}
export function moveStop(itinerary: Itinerary, stopId: string, direction: -1 | 1): Itinerary {
  const dayIndex = itinerary.days.findIndex((day) => day.stops.some((stop) => stop.id === stopId));
  if (dayIndex === -1) return itinerary;

  const day = itinerary.days[dayIndex];
  const stopIndex = day.stops.findIndex((stop) => stop.id === stopId);
  const destinationIndex = stopIndex + direction;
  if (destinationIndex < 0 || destinationIndex >= day.stops.length) return itinerary;

  // Copy before swapping: React state and saved request snapshots must stay immutable.
  const reorderedStops = [...day.stops];
  const movedStop = reorderedStops[stopIndex];
  reorderedStops[stopIndex] = reorderedStops[destinationIndex];
  reorderedStops[destinationIndex] = movedStop;
  const days = [...itinerary.days];
  days[dayIndex] = { ...day, stops: reorderedStops };
  return { ...itinerary, days };
}
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}
