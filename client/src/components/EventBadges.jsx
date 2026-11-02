import React from 'react';
import { getTimeBadge, googleCalendarUrl, downloadIcs } from '../utils/eventUtils';

// "Starts in 2 days" / "Closing soon" / "Ongoing" / "Completed"
export function TimeBadge({ event }) {
  const badge = getTimeBadge(event);
  if (!badge) return null;
  return <span className={`badge-time ${badge.cls}`}>{badge.label}</span>;
}

// Google Calendar link and .ics download; hidden once the event is over
export function CalendarLinks({ event }) {
  const url = googleCalendarUrl(event);
  const badge = getTimeBadge(event);
  if (!url || (badge && badge.cls === 'done')) return null;

  return (
    <div className="cal-links">
      <a className="cal-link" href={url} target="_blank" rel="noopener noreferrer">
        📅 Google Calendar
      </a>
      <button type="button" className="cal-link" onClick={() => downloadIcs(event)}>
        ⬇ .ics
      </button>
    </div>
  );
}

export function BookmarkButton({ saved, onToggle }) {
  const label = saved ? 'Remove bookmark' : 'Save event';
  return (
    <button
      type="button"
      className={`bookmark-btn ${saved ? 'saved' : ''}`}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {saved ? '★' : '☆'}
    </button>
  );
}
