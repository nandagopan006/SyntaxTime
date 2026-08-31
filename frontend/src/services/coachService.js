import api from "./api";

/*
  The focus coach.

  React talks to Django and Django talks to the AI provider. Nothing in the
  browser knows which provider it is or holds a key for it, which is the whole
  reason this goes through the backend at all.

  It asks for a sentence or two of advice. It never pauses, finishes or saves
  anything - the caller does that, after the user has decided.
*/

/**
 * Asks for contextual coaching about a pause or a finish.
 *
 * `reason` is the message being sent now; `history` is what has already been
 * said, as `[{ role: "user" | "coach", content }]`.
 *
 * Today's totals are deliberately not sent: the server reads those from the
 * database, so the coach cannot be told about a study day that did not happen.
 *
 * Returns the message to show. Never throws - a coach that cannot answer must
 * not stop somebody pausing, so a failure comes back as a quiet fallback and
 * the interruption carries on.
 */
export async function getFocusCoachResponse({
  event,
  reason,
  history = [],
  pauseCount,
  subject,
  topic,
  plannedMinutes,
  elapsedMinutes,
  remainingMinutes,
}) {
  try {
    const response = await api.post("/coach/focus/", {
      event,
      reason,
      // Everything said so far, oldest first. The conversation lives in the
      // browser only: nothing about it is stored, so it has to be sent back
      // each time for the coach to remember it.
      history,
      pause_count: pauseCount,
      subject,
      topic,
      planned_minutes: plannedMinutes,
      elapsed_minutes: elapsedMinutes,
      remaining_minutes: remainingMinutes,
    });

    return {
      message: response.data?.message ?? "",
      isFallback: Boolean(response.data?.is_fallback),
    };
  } catch {
    // Rate limited, offline, signed out, provider down: from here they are the
    // same thing, which is that there is no advice this time. The dialog still
    // offers both actions.
    return { message: "", isFallback: true, hasFailed: true };
  }
}
