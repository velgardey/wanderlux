import { Clock3 } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';
import { formatDuration } from '../lib/itinerary.js';
import { StopCard } from './StopCard.js';

type ItineraryProps = {
  itinerary: Itinerary;
  expandedStopIds: string[];
  busy: boolean;
  onToggle: (stopId: string) => void;
  onRemove: (stopId: string) => void;
  onMove: (stopId: string, direction: -1 | 1) => void;
};

export function ItineraryView({
  itinerary,
  expandedStopIds,
  busy,
  onToggle,
  onRemove,
  onMove,
}: ItineraryProps) {
  function removeAndRestoreFocus(stopId: string, dayNumber: number) {
    onRemove(stopId);
    // A removed button cannot keep focus. A day heading is a predictable fallback.
    requestAnimationFrame(() => document.getElementById(`day-heading-${dayNumber}`)?.focus());
  }

  return (
    <div className="day-list">
      {itinerary.days.map((day) => {
        const activityMinutes = day.stops.reduce((total, stop) => total + stop.durationMinutes, 0);
        return (
          <section
            className="day-section"
            key={day.dayNumber}
            aria-labelledby={`day-heading-${day.dayNumber}`}
          >
            <div className="day-header">
              <div className="day-heading-group">
                <span className="day-label">Day {day.dayNumber}</span>
                <h3 id={`day-heading-${day.dayNumber}`} tabIndex={-1}>
                  {day.title}
                </h3>
              </div>
              <span className="day-total">
                <Clock3 size={14} aria-hidden="true" />
                {formatDuration(activityMinutes)} of activities
              </span>
            </div>
            {day.stops.length > 0 ? (
              <ol className="stop-list">
                {day.stops.map((stop, index) => (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    index={index}
                    stopCount={day.stops.length}
                    expanded={expandedStopIds.includes(stop.id)}
                    busy={busy}
                    onToggle={() => onToggle(stop.id)}
                    onRemove={() => removeAndRestoreFocus(stop.id, day.dayNumber)}
                    onMove={(direction) => onMove(stop.id, direction)}
                  />
                ))}
              </ol>
            ) : (
              <p className="empty-day">
                No stops left for this day. Leave it open, or use a refinement to add something new.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
