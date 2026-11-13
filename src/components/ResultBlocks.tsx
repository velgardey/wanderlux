import { Check, Lightbulb } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';
import { formatDuration, getTotalDurationMinutes } from '../lib/itinerary.js';

type ResultBlocksProps = {
  itinerary: Itinerary;
  checkedItemIds: string[];
  onToggleItem: (itemId: string) => void;
};

export function ResultBlocks({ itinerary, checkedItemIds, onToggleItem }: ResultBlocksProps) {
  const dayTotals = itinerary.days.map((day) => ({
    dayNumber: day.dayNumber,
    minutes: getTotalDurationMinutes(day.stops),
  }));
  const largestTotal = Math.max(1, ...dayTotals.map((day) => day.minutes));

  return (
    <div className="[&>section]:mt-7">
      {itinerary.blocks.map((block) => {
        if (block.type === 'card') {
          return (
            <section className="flex gap-3 rounded-xl bg-warm p-[18px]" key={block.id}>
              <Lightbulb className="mt-0.5 text-accent" size={20} aria-hidden="true" />
              <div>
                <h3 className="text-[15px] font-semibold">{block.title}</h3>
                <p className="mt-1.5 text-xs leading-[1.7] text-muted wrap-anywhere">
                  {block.text}
                </p>
              </div>
            </section>
          );
        }
        if (block.type === 'checklist') {
          const completed = block.items.filter((item) => checkedItemIds.includes(item.id)).length;
          return (
            <section key={block.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 phone:flex-nowrap phone:gap-4">
                <h3 className="text-[15px] font-semibold">{block.title}</h3>
                <span className="text-[11px] whitespace-nowrap text-muted">
                  {completed} / {block.items.length} packed
                </span>
              </div>
              <div className="mt-3.5 grid grid-cols-1 gap-x-[18px] gap-y-2 phone:grid-cols-2">
                {block.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex min-h-11 cursor-pointer items-center gap-[9px] text-xs leading-[1.5] font-normal phone:min-h-9"
                  >
                    <input
                      className="peer size-[17px] shrink-0 accent-accent"
                      type="checkbox"
                      checked={checkedItemIds.includes(item.id)}
                      onChange={() => onToggleItem(item.id)}
                    />
                    <span className="peer-checked:text-muted peer-checked:line-through">
                      {item.label}
                    </span>
                    {checkedItemIds.includes(item.id) ? (
                      <Check className="ml-auto text-accent" size={15} aria-hidden="true" />
                    ) : null}
                  </label>
                ))}
              </div>
            </section>
          );
        }
        // This final variant is guaranteed by the runtime union, not guessed from arbitrary JSON.
        return (
          <section key={block.id}>
            <h3 className="text-[15px] font-semibold">{block.title}</h3>
            <p className="small-copy mt-1.5">
              Includes all planned stops; travel between stops is not included.
            </p>
            <div className="mt-4 grid gap-3">
              {dayTotals.map((day) => (
                <div
                  className="grid grid-cols-[44px_minmax(0,1fr)_70px] items-center gap-3.5 text-[11px] text-muted tabular-nums"
                  key={day.dayNumber}
                >
                  <span>Day {day.dayNumber}</span>
                  <div className="h-[9px] overflow-hidden rounded-[3px] bg-tint" aria-hidden="true">
                    <div
                      className="h-full rounded-[3px] bg-accent transition-[width] duration-200"
                      style={{ width: `${(day.minutes / largestTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-right">{formatDuration(day.minutes)}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
