// ========================================================
// CampusHub - Event timing helpers
// Event dates are stored as "YYYY-MM-DD" and times as free text
// (e.g. "10:00 AM" or "9:00 AM – 9:00 AM (24 hrs)"). The first
// clock time in the text is the start time.
// ========================================================

function getEventStart(event) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(event.date || '');
  if (!dateMatch) return null;

  const [, y, m, d] = dateMatch.map(Number);
  let hours = 23;
  let minutes = 59; // no readable start time: the event runs until the end of that day

  const timeMatch = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(event.time || '');
  if (timeMatch) {
    hours = Number(timeMatch[1]) % 12;
    minutes = Number(timeMatch[2]);
    if (timeMatch[3].toUpperCase() === 'PM') hours += 12;
  }

  return new Date(y, m - 1, d, hours, minutes);
}

// End time: the second clock time in the text if present (e.g. "9:00 AM - 5:00 PM"),
// otherwise start + 2 hours. Rolls over to the next day if it is earlier than the start.
function getEventEnd(event) {
  const start = getEventStart(event);
  if (!start) return null;

  const times = [...(event.time || '').matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
  if (times.length >= 2) {
    const [, h, min, ap] = times[1];
    let hours = Number(h) % 12;
    if (ap.toUpperCase() === 'PM') hours += 12;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hours, Number(min));
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

// Local date-time without a zone ("YYYY-MM-DDTHH:mm:ss"); clients parse it as their own local time
function toLocalIso(d) {
  if (!d) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// True once the event's start time has passed (server local time)
function hasEventStarted(event, now = new Date()) {
  const start = getEventStart(event);
  return start !== null && start <= now;
}

// Stored status, but events that already started are reported as Completed
function effectiveStatus(event, now = new Date()) {
  if (event.status === 'Upcoming' && hasEventStarted(event, now)) return 'Completed';
  return event.status;
}

module.exports = { getEventStart, getEventEnd, toLocalIso, hasEventStarted, effectiveStatus };
