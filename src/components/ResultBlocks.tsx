import { Check, Lightbulb } from 'lucide-react';
import type { Itinerary } from '../../shared/itinerary.js';
import { formatDuration } from '../lib/itinerary.js';

type ResultBlocksProps = {
  itinerary: Itinerary;
  checkedItemIds: string[];
  onToggleItem: (itemId: string) => void;
};

export function ResultBlocks({ itinerary, checkedItemIds, onToggleItem }: ResultBlocksProps) {
  const dayTotals = itinerary.days.map((day) => ({
    dayNumber: day.dayNumber,
    minutes: day.stops.reduce((total, stop) => total + stop.durationMinutes, 0),
  }));
  const largestTotal = Math.max(1, ...dayTotals.map((day) => day.minutes));

  return (
    <div className="result-blocks">
      {itinerary.blocks.map((block) => {
        if (block.type === 'card') {
          return (
            <section className="tip-block" key={block.id}>
              <Lightbulb size={20} aria-hidden="true" />
              <div>
                <h3>{block.title}</h3>
                <p>{block.text}</p>
              </div>
            </section>
          );
        }
        if (block.type === 'checklist') {
          const completed = block.items.filter((item) => checkedItemIds.includes(item.id)).length;
          return (
            <section className="checklist-block" key={block.id}>
              <div className="block-heading">
                <h3>{block.title}</h3>
                <span>
                  {completed} / {block.items.length} packed
                </span>
              </div>
              <div className="checklist-items">
                {block.items.map((item) => (
                  <label key={item.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={checkedItemIds.includes(item.id)}
                      onChange={() => onToggleItem(item.id)}
                    />
                    <span>{item.label}</span>
                    {checkedItemIds.includes(item.id) ? (
                      <Check size={15} aria-hidden="true" />
                    ) : null}
                  </label>
                ))}
              </div>
            </section>
          );
        }
        // This final variant is guaranteed by the runtime union, not guessed from arbitrary JSON.
        return (
          <section className="chart-block" key={block.id}>
            <h3>{block.title}</h3>
            <p className="small-copy">Activity time only; travel and breaks are not included.</p>
            <div className="time-chart">
              {dayTotals.map((day) => (
                <div className="chart-row" key={day.dayNumber}>
                  <span>Day {day.dayNumber}</span>
                  <div className="chart-track" aria-hidden="true">
                    <div
                      className="chart-bar"
                      style={{ width: `${(day.minutes / largestTotal) * 100}%` }}
                    />
                  </div>
                  <span>{formatDuration(day.minutes)}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
