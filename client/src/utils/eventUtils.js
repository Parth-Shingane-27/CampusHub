// ========================================================
// CampusHub - Event helpers
// Time-status badges, "Add to Calendar" links (Google Calendar)
// and a hook for live updates. Events carry startsAt / endsAt as
// local "YYYY-MM-DDTHH:mm:ss" strings.
// ========================================================

import { useEffect, useRef } from 'react';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (n) => String(n).padStart(2, '0');

// "20261105T090000": floating local time, so calendar apps use the viewer's time zone
const calStamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

function getRange(event) {
  if (!event || !event.startsAt) return null;
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 2 * HOUR);
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end };
}

// { label, cls } describing where the event is in time, or null if its time is unknown
export function getTimeBadge(event, now = new Date()) {
  const range = getRange(event);
  if (!range) return null;

  if (now >= range.end) return { label: 'Completed', cls: 'done' };
  if (now >= range.start) return { label: 'Ongoing', cls: 'ongoing' };

  const diff = range.start - now;
  let when;
  if (diff < HOUR) when = `${Math.max(1, Math.ceil(diff / MINUTE))} min`;
  else if (diff < DAY) when = `${Math.floor(diff / HOUR)} hr`;
  else {
    const days = Math.floor(diff / DAY);
    when = `${days} ${days === 1 ? 'day' : 'days'}`;
  }

  // Registration closes when the event starts, so the last 24 hours are "closing soon"
  if (diff < DAY && event.status === 'Upcoming') {
    return { label: `Closing soon · starts in ${when}`, cls: 'soon' };
  }
  return { label: `Starts in ${when}`, cls: 'upcoming' };
}

export function googleCalendarUrl(event) {
  const range = getRange(event);
  if (!range) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${calStamp(range.start)}/${calStamp(range.end)}`,
    details: event.description || '',
    location: event.venue || ''
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Calls onChange (debounced) whenever the server reports that events or seats changed
export function useLiveEvents(onChange) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });

  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    let timer;
    const source = new EventSource('/api/events/stream');
    source.addEventListener('events-changed', () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 300);
    });
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, []);
}

// Re-renders every minute so countdown badges stay current
export function useMinuteTick(setTick) {
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), MINUTE);
    return () => clearInterval(id);
  }, [setTick]);
}
