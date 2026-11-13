import { ArrowRight, Bookmark } from 'lucide-react';
import type { SavedSession } from '../../shared/itinerary.js';

type SavedTripsProps = {
  trips: SavedSession[];
  error: string;
  onLoad: (session: SavedSession) => void;
  onReset: () => void;
};

// Storage and loading decisions belong to App; this component only renders their state.
export function SavedTrips({ trips, error, onLoad, onReset }: SavedTripsProps) {
  return (
    <section
      className="mt-[26px] border-t border-line pt-6 tablet:mt-[34px]"
      aria-labelledby="saved-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <Bookmark size={17} aria-hidden="true" />
        <h2 className="text-sm font-semibold" id="saved-heading">
          Saved trips
        </h2>
        <span className="ml-auto text-[11px] text-muted">{trips.length} / 5</span>
      </div>
      {trips.length === 0 ? (
        <p className="small-copy">Your saved plans will stay in this browser.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {trips.map((session) => (
            <li key={session.id}>
              <button
                className="flex min-h-11 w-full items-center justify-between gap-3.5 border-0 border-b border-line bg-transparent py-3 text-left text-xs hover:text-accent"
                onClick={() => onLoad(session)}
                aria-label={`Load ${session.itinerary.title}`}
              >
                <span className="min-w-0 wrap-anywhere">{session.itinerary.title}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <div className="mt-3.5 text-[13px] leading-[1.6] text-danger" role="alert">
          <p>{error}</p>
          <button className="text-button mt-1.5 pl-0 text-danger" onClick={onReset}>
            Reset saved trips
          </button>
        </div>
      ) : null}
    </section>
  );
}
