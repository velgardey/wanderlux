import { Bookmark, Check } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';
import { formatDuration } from '../lib/itinerary.js';

type TripSummaryProps = {
  itinerary: Itinerary;
  busy: boolean;
  saveNotice: string;
  onSave: () => void;
};

export function TripSummary({ itinerary, busy, saveNotice, onSave }: TripSummaryProps) {
  const stopCount = itinerary.days.reduce((total, day) => total + day.stops.length, 0);
  const activityMinutes = itinerary.days.reduce(
    (total, day) => total + day.stops.reduce((minutes, stop) => minutes + stop.durationMinutes, 0),
    0,
  );

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 phone:flex-row phone:gap-5">
        <h2 className="font-display text-[28px] leading-[1.2] font-normal tracking-[-0.025em] wrap-anywhere phone:text-[32px]">
          {itinerary.title}
        </h2>
        <button
          className="button button-secondary w-full shrink-0 phone:w-auto"
          onClick={onSave}
          disabled={busy}
        >
          <Bookmark size={16} aria-hidden="true" />
          Save trip
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2.5 text-xs text-muted">
        <span>
          {itinerary.days.length} {itinerary.days.length === 1 ? 'day' : 'days'}
        </span>
        <span className="trip-fact">
          {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
        </span>
        <span className="trip-fact">{formatDuration(activityMinutes)} of activities</span>
      </div>
      {itinerary.assumptions.length > 0 ? (
        <ul className="mt-4 list-disc pl-4 text-xs leading-[1.7] text-muted">
          {itinerary.assumptions.map((assumption, index) => (
            <li key={index}>{assumption}</li>
          ))}
        </ul>
      ) : null}
      <p
        className="mt-[13px] flex items-center gap-1.5 text-xs text-accent empty:hidden"
        role="status"
      >
        {saveNotice ? (
          <>
            <Check size={14} aria-hidden="true" />
            {saveNotice}
          </>
        ) : null}
      </p>
    </div>
  );
}
