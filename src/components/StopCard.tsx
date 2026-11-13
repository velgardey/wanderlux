import { useId } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Clock3, MapPin, Trash2 } from 'lucide-react';
import type { Stop } from '../../shared/itinerary.js';
import { formatDuration } from '../lib/itinerary.js';

type StopCardProps = {
  stop: Stop;
  index: number;
  stopCount: number;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
};

export function StopCard({
  stop,
  index,
  stopCount,
  expanded,
  busy,
  onToggle,
  onRemove,
  onMove,
}: StopCardProps) {
  // DOM IDs come from React, not untrusted model text.
  const detailsId = useId();
  return (
    <li className="border-b border-line pt-3 pb-1.5 first:border-t">
      <div className="flex items-center gap-[9px] phone:gap-[18px]">
        <button
          className="flex min-w-0 flex-1 items-center gap-[9px] rounded-md border-0 bg-transparent py-[7px] text-left phone:gap-3"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${stop.title}`}
        >
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-[11px] text-muted phone:size-7"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span
              className="text-sm leading-[1.4] font-semibold wrap-anywhere"
              data-testid="stop-title"
            >
              {stop.title}
            </span>
            <span className="flex items-center gap-1 text-[10px] leading-[1.4] text-muted wrap-anywhere phone:text-[11px]">
              <MapPin size={13} aria-hidden="true" />
              {stop.location}
            </span>
          </span>
          {expanded ? (
            <ChevronUp className="ml-auto text-muted" size={18} aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-auto text-muted" size={18} aria-hidden="true" />
          )}
        </button>
        <span className="flex items-center gap-[5px] text-[10px] whitespace-nowrap text-muted tabular-nums phone:text-[11px]">
          <Clock3 size={14} aria-hidden="true" />
          {formatDuration(stop.durationMinutes)}
        </span>
      </div>
      {expanded ? (
        <div
          className="pt-3 pb-[9px] pl-[33px] text-[13px] leading-[1.7] text-muted wrap-anywhere phone:pl-10"
          id={detailsId}
        >
          <p>{stop.description}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-[5px]">
        <button
          className="icon-button"
          onClick={() => onMove(-1)}
          disabled={busy || index === 0}
          aria-label={`Move ${stop.title} up`}
          title="Move up"
        >
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          onClick={() => onMove(1)}
          disabled={busy || index === stopCount - 1}
          aria-label={`Move ${stop.title} down`}
          title="Move down"
        >
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <button
          className="text-button ml-2 text-muted enabled:hover:text-danger"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${stop.title}`}
        >
          <Trash2 size={14} aria-hidden="true" />
          Remove
        </button>
      </div>
    </li>
  );
}
