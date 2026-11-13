import { Bookmark, ListChecks, Route } from 'lucide-react';

export function EmptyItinerary({ busy }: { busy: boolean }) {
  return (
    <div className="empty-itinerary">
      <div className="route-illustration" aria-hidden="true">
        <svg viewBox="0 0 240 140">
          <path
            d="M30 103C46 23 142 129 149 53S218 20 207 91"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5 7"
          />
          <circle cx="30" cy="103" r="8" />
          <circle cx="149" cy="53" r="6" />
          <circle cx="207" cy="91" r="9" />
          <circle cx="207" cy="91" r="17" fill="none" stroke="currentColor" opacity=".25" />
        </svg>
      </div>
      <h2>{busy ? 'Finding a good way to spend your days.' : 'Your itinerary starts here.'}</h2>
      <p>
        Tell us where you want to go and what you enjoy.
        <br className="desktop-break" /> We’ll turn it into a plan you can make your own.
      </p>
      <ul className="empty-features">
        <li>
          <Route size={17} aria-hidden="true" />A day-by-day route
        </li>
        <li>
          <ListChecks size={17} aria-hidden="true" />
          Stops you can change
        </li>
        <li>
          <Bookmark size={17} aria-hidden="true" />
          Saved for another day
        </li>
      </ul>
      <span className="empty-footnote">A starting point, with room to wander.</span>
    </div>
  );
}
