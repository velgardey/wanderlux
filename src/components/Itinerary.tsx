import { Clock3 } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';
import { formatDuration, getTotalDurationMinutes } from '../lib/itinerary.js';
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
    <div className="mt-[34px] space-y-8">
      {itinerary.days.map((day) => {
        const activityMinutes = getTotalDurationMinutes(day.stops);
        return (
          <section key={day.dayNumber} aria-labelledby={`day-heading-${day.dayNumber}`}>
            <div className="mb-[13px] flex flex-col items-start justify-between gap-2 phone:flex-row tablet:flex-col wide:flex-row wide:items-center wide:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-md bg-tint px-2.5 py-[7px] text-[11px] font-bold whitespace-nowrap text-accent">
                  Day {day.dayNumber}
                </span>
                <h3
                  className="text-[17px] leading-[1.4] font-semibold wrap-anywhere"
                  id={`day-heading-${day.dayNumber}`}
                  tabIndex={-1}
                >
                  {day.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-[5px] text-[11px] whitespace-nowrap text-muted">
                <Clock3 size={14} aria-hidden="true" />
                {formatDuration(activityMinutes)} of activities
              </span>
            </div>
            {day.stops.length > 0 ? (
              <ol className="m-0 list-none p-0">
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
              <p className="border-y border-line py-[22px] text-[13px] leading-[1.65] text-muted">
                No stops left for this day. Leave it open, or use a refinement to add something new.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
