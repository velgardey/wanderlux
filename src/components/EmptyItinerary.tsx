import { Bookmark, ListChecks, Route } from 'lucide-react';

export function EmptyItinerary({ busy }: { busy: boolean }) {
  return (
    <div className="flex min-h-[370px] flex-col items-center justify-center text-center tablet:min-h-[550px]">
      <div className="mb-[26px] w-[220px] text-accent" aria-hidden="true">
        <svg className="w-full fill-accent" viewBox="0 0 240 140">
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
      <h2 className="max-w-[20ch] font-display text-[25px] leading-[1.25] font-normal phone:text-[28px]">
        {busy ? 'Finding a good way to spend your days.' : 'Your itinerary starts here.'}
      </h2>
      <p className="mt-4 max-w-[44ch] text-sm leading-[1.75] text-muted">
        Tell us where you want to go and what you enjoy.
        <br className="hidden phone:block" /> We’ll turn it into a plan you can make your own.
      </p>
      <ul className="my-9 flex list-none flex-col items-center gap-3.5 p-0 text-[11px] text-muted phone:flex-row phone:gap-5 tablet:flex-col tablet:gap-3.5 wide:flex-row wide:gap-5">
        <li className="flex items-center gap-[7px]">
          <Route size={17} aria-hidden="true" />A day-by-day route
        </li>
        <li className="flex items-center gap-[7px]">
          <ListChecks size={17} aria-hidden="true" />
          Stops you can change
        </li>
        <li className="flex items-center gap-[7px]">
          <Bookmark size={17} aria-hidden="true" />
          Saved for another day
        </li>
      </ul>
      <span className="font-display text-sm text-muted italic">
        A starting point, with room to wander.
      </span>
    </div>
  );
}
