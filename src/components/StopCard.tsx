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
    <li className={`stop-row ${expanded ? 'is-expanded' : ''}`}>
      <div className="stop-topline">
        <button
          className="stop-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${stop.title}`}
        >
          <span className="stop-number" aria-hidden="true">
            {index + 1}
          </span>
          <span className="stop-heading">
            <span className="stop-title">{stop.title}</span>
            <span className="stop-location">
              <MapPin size={13} aria-hidden="true" />
              {stop.location}
            </span>
          </span>
          {expanded ? (
            <ChevronUp size={18} aria-hidden="true" />
          ) : (
            <ChevronDown size={18} aria-hidden="true" />
          )}
        </button>
        <span className="duration">
          <Clock3 size={14} aria-hidden="true" />
          {formatDuration(stop.durationMinutes)}
        </span>
      </div>
      {expanded ? (
        <div className="stop-details" id={detailsId}>
          <p>{stop.description}</p>
        </div>
      ) : null}
      <div className="stop-actions">
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
          className="text-button remove-button"
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
