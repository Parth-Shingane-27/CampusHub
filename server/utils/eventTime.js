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

module.exports = { getEventStart, hasEventStarted, effectiveStatus };
