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
