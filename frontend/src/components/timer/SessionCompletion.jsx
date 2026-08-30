import { useState } from "react";

import { formatStudyTime } from "../../utils/formatTime";
import { SUBJECT_MAX_LENGTH, TOPIC_MAX_LENGTH } from "../../utils/studySession";
import Button from "../ui/Button";
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
  breakMinutes,
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
    <section className="surface-card p-8">
      <p className="section-eyebrow">Session complete</p>

      <p className="mt-4 text-sm text-ink-muted">You focused for</p>
      <p className="mt-1 text-5xl leading-none text-ink tabular-nums font-display">
        {formatStudyTime(focusedSeconds)}
      </p>

      {isSaved ? (
        <div className="mt-8 border-t border-rule pt-6">
          <p className="text-sm text-forest">Session saved.</p>
          <p className="mt-1 text-sm text-ink-muted">
            You can add or change the details later from History.
          </p>

          {/* Zero means the user turned breaks off while setting the session
              up. Offering one anyway would be asking a question they have
              already answered. */}
          {breakMinutes > 0 ? (
            <BreakOffer
              defaultMinutes={breakMinutes}
              onStartBreak={onStartBreak}
              onSkipBreak={onSkipBreak}
            />
          ) : (
            <Button variant="primary" className="mt-6" onClick={onSkipBreak}>
              Done
            </Button>
          )}
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
                  maxLength={SUBJECT_MAX_LENGTH}
                  className="field-control mt-1.5"
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
                  maxLength={TOPIC_MAX_LENGTH}
                  className="field-control mt-1.5"
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
                className="field-control mt-1.5"
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
            <Button
              type="submit"
              variant="primary"
              isBusy={isSaving}
              busyLabel="Saving session..."
            >
              Save session
            </Button>

            <Button variant="secondary" onClick={onSkip} disabled={isSaving}>
              Skip
            </Button>

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
