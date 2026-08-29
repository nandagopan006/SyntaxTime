import { useState } from "react";

import { formatStudyTime } from "../../utils/formatTime";
import BreakOffer from "./BreakOffer";

/*
  Shown once a focus session ends.

  The session is already finished and its focused time is already measured, so
  nothing here is required. The form only invites the user to record what they
  studied, which is what turns History into a memory rather than a list of
  durations. Skip saves the session too.

  The break is offered only from the saved state below. A break must never
  follow a session that failed to reach the database, because that would look
  like the work had been recorded when it had not.
*/
function SessionCompletion({
  focusedSeconds,
  defaultSubject,
  defaultTopic,
  saveState,
  errorMessage,
  onSave,
  onSkip,
  onStartBreak,
  onSkipBreak,
}) {
  // These values only matter inside this form until it is submitted, so they
  // stay in local state. The timer itself remains the shared Redux state.
  const [subject, setSubject] = useState(defaultSubject);
  const [topic, setTopic] = useState(defaultTopic);
  const [notes, setNotes] = useState("");

  const isSaving = saveState === "saving";
  const isSaved = saveState === "saved";

  function handleSubmit(event) {
    event.preventDefault();
    onSave({ subject, topic, notes });
  }

  return (
    <section className="bg-surface border border-rule rounded-lg p-8">
      <h2 className="font-display text-2xl text-ink">Session complete</h2>

      <p className="mt-6 text-sm text-ink-muted">Focused</p>
      <p className="font-display text-5xl text-ink tabular-nums">
        {formatStudyTime(focusedSeconds)}
      </p>

      {isSaved ? (
        <div className="mt-8 border-t border-rule pt-6">
          <p className="text-sm text-forest">Session saved.</p>
          <p className="mt-1 text-sm text-ink-muted">
            You can add or change the details later from History.
          </p>

          <BreakOffer onStartBreak={onStartBreak} onSkipBreak={onSkipBreak} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 border-t border-rule pt-6">
          <p className="text-sm text-ink-muted">
            Want to record what you studied? All of this is optional.
          </p>

          <fieldset disabled={isSaving} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="block text-sm font-medium text-ink-muted"
                  htmlFor="completion-subject"
                >
                  Subject
                </label>
                <input
                  id="completion-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Python"
                  className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-ink-muted"
                  htmlFor="completion-topic"
                >
                  Topic
                </label>
                <input
                  id="completion-topic"
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Django REST authentication"
                  className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-ink-muted"
                htmlFor="completion-notes"
              >
                What did you learn?
              </label>
              <textarea
                id="completion-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Learned how JWT refresh tokens work."
                className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </fieldset>

          {saveState === "failed" && (
            <div className="mt-5" role="alert">
              <p className="text-sm text-burgundy">{errorMessage}</p>
              <p className="mt-1 text-sm text-ink-muted">
                This session is not in your history yet. It is still counted in
                today&apos;s total, and nothing you typed has been lost.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-ink px-5 py-2.5 text-sm text-parchment disabled:opacity-50"
            >
              {isSaving ? "Saving session..." : "Save session"}
            </button>

            <button
              type="button"
              onClick={onSkip}
              disabled={isSaving}
              className="rounded border border-rule px-5 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
            >
              Skip
            </button>

            <span className="text-sm text-ink-faint">
              Skip still saves the session, just without these details.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}

export default SessionCompletion;
