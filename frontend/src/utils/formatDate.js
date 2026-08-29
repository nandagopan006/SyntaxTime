/*
  Dates as a person would say them.

  The dashboard shows when a session happened, not exactly when. "Today" and
  "Yesterday" are what the user actually recognises; anything older is more
  useful as a short calendar date.
*/

/** Returns the date part of a Date, with the time discarded, for day comparisons. */
function toDateOnly(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/**
 * Formats when a study session happened, as "Today", "Yesterday" or "24 Aug".
 * Accepts the ISO timestamps the API returns.
 */
export function formatSessionDate(isoTimestamp) {
  const sessionDate = toDateOnly(new Date(isoTimestamp));
  const today = toDateOnly(new Date());

  const daysApart = Math.round((today - sessionDate) / (24 * 60 * 60 * 1000));

  if (daysApart === 0) {
    return "Today";
  }
  if (daysApart === 1) {
    return "Yesterday";
  }

  return sessionDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Returns the short weekday name for an API date such as "2026-08-24".
 * Used for the weekly chart's axis, where "Mon" is all there is room for.
 */
export function formatWeekdayLabel(isoDate) {
  // Parsed as parts rather than passed to Date directly, because a bare
  // "2026-08-24" is read as UTC midnight and can land on the previous day.
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, { weekday: "short" });
}

/** True when an API date string is the user's current local day. */
export function isToday(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const today = new Date();

  return (
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate()
  );
}
