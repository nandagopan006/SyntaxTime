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
 * How many whole days ago a timestamp falls: 0 is today, 1 is yesterday.
 *
 * Both date labels below are built on this, so "Yesterday" means the same thing
 * on the dashboard and in History. It compares calendar days in the browser's
 * own timezone, so the boundary is the user's midnight rather than UTC's.
 */
function getDaysAgo(isoTimestamp) {
  const sessionDate = toDateOnly(new Date(isoTimestamp));
  const today = toDateOnly(new Date());

  return Math.round((today - sessionDate) / (24 * 60 * 60 * 1000));
}

/**
 * Formats when a study session happened, as "Today", "Yesterday" or "24 Aug".
 * The short form, for the dashboard list where space is tight.
 */
export function formatSessionDate(isoTimestamp) {
  const daysApart = getDaysAgo(isoTimestamp);

  if (daysApart === 0) {
    return "Today";
  }
  if (daysApart === 1) {
    return "Yesterday";
  }

  return new Date(isoTimestamp).toLocaleDateString(undefined, {
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

/**
 * The heading a session is filed under in History: "Today", "Yesterday", or a
 * full date such as "27 August 2026".
 *
 * Grouping by this label is what turns a flat list of repeated dates into
 * something the eye can skim.
 */
export function getDateGroupLabel(isoTimestamp) {
  const daysApart = getDaysAgo(isoTimestamp);

  if (daysApart === 0) {
    return "Today";
  }
  if (daysApart === 1) {
    return "Yesterday";
  }

  return formatFullDate(isoTimestamp);
}

/** Formats the clock time a session started or finished, such as "8:30 PM". */
export function formatSessionTime(isoTimestamp) {
  if (!isoTimestamp) {
    return "—";
  }

  return new Date(isoTimestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Formats a full calendar date for the session detail panel, "29 August 2026". */
export function formatFullDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Returns a date as the "YYYY-MM-DD" string the API expects. */
export function toApiDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
