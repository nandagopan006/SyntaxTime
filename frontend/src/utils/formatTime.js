/**
 * Formats a number of seconds as MM:SS for the focus timer.
 * Minutes are not wrapped at 60, so a 90 minute session reads 90:00.
 */
export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Converts focused seconds into the whole minutes stored by the API.
 * Never returns more than the planned length, which the API rejects.
 */
export function toFocusedMinutes(elapsedSeconds, plannedMinutes) {
  return Math.min(Math.round(elapsedSeconds / 60), plannedMinutes);
}

/**
 * Formats focused study seconds as a readable duration, such as "2h 43m".
 * Used for daily totals, where seconds are noise rather than information.
 */
export function formatStudyTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Formats saved study minutes from the API as a readable duration.
 * The API counts in whole minutes; every display goes through the same
 * formatter as the live timer, so the two can never drift apart in wording.
 */
export function formatStudyMinutes(totalMinutes) {
  return formatStudyTime(totalMinutes * 60);
}

/** Percentage of the daily target reached, safely handling a target of zero. */
export function calculateProgressPercent(focusedSeconds, targetMinutes) {
  if (targetMinutes <= 0) {
    return 0;
  }
  const percent = (focusedSeconds / (targetMinutes * 60)) * 100;
  return Math.min(Math.round(percent), 100);
}
