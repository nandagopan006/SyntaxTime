import { toFocusedMinutes } from "./formatTime";

/**
 * Builds the payload that saves a completed study session.
 *
 * Subject, topic and notes are optional throughout SyntaxTime, so anything the
 * user left blank is sent as an empty string rather than being omitted.
 * The owner is not included: Django takes it from the request's JWT.
 */
export function buildSessionPayload(timer, details) {
  const plannedMinutes = Math.round(timer.durationSeconds / 60);

  return {
    planned_minutes: plannedMinutes,
    focused_minutes: toFocusedMinutes(timer.elapsedFocusSeconds, plannedMinutes),
    subject: details.subject.trim(),
    topic: details.topic.trim(),
    notes: details.notes.trim(),
    started_at: timer.startedAt,
    completed_at: new Date().toISOString(),
    status: "completed",
  };
}
