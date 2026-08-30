import { toFocusedMinutes } from "./formatTime";

// Mirrors StudySession.subject and StudySession.topic in Django. Kept here so
// every form that writes a session agrees with the database about the limit
// rather than each one guessing.
export const SUBJECT_MAX_LENGTH = 100;
export const TOPIC_MAX_LENGTH = 200;

// Subject and topic are optional everywhere in SyntaxTime, so eight different
// screens have to say what a session with neither is called. These were
// written out by hand in each of them; naming them once means the wording can
// never drift apart.
export const NO_SUBJECT_LABEL = "General Study";
export const NO_TOPIC_LABEL = "No topic added";

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
