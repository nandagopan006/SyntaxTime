import { useState } from "react";

import { formatStudyTime } from "../../utils/formatTime";
import { SUBJECT_MAX_LENGTH, TOPIC_MAX_LENGTH } from "../../utils/studySession";
import Button from "../ui/Button";
import BreakOffer from "./BreakOffer";

/*
  Shown once a focus session ends.

  The session has already saved itself by the time this appears, so nothing
  here is holding the record hostage: the form only invites the user to say
  what they studied, which is what turns History into a memory rather than a
  list of durations. Writing details updates the saved session; skipping
  leaves it exactly as it is.

  The break is offered only once the user is finished with the details, and
  never while the session failed to reach the database - that would look like
  the work had been recorded when it had not.
*/
function SessionCompletion({
  focusedSeconds,
  defaultSubject,
  defaultTopic,
  saveState,
  errorMessage,
  detailsState,
  detailsError,
  isDetailsDone,
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

  const isSaved = saveState === "saved";
  const hasFailed = saveState === "failed";

  // Either request being in flight closes the form to editing: the first is
  // the session recording itself, the second is these details reaching it.
  const isBusy = saveState === "saving" || detailsState === "saving";

  // The break follows the details step, and only once the session is safely
  // recorded.
  const isFinished = isDetailsDone && isSaved;

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

      {isFinished ? (
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
          {/* Said before the fields, not after them, because the reason the
              form is relaxed about being ignored is that the work is already
              recorded. */}
          {isSaved && (
            <p className="text-sm text-forest">
              Saved automatically. Nothing here is required.
            </p>
          )}

          <p className={`text-sm text-ink-muted${isSaved ? " mt-1" : ""}`}>
            Want to record what you studied? All of this is optional.
          </p>

          <fieldset disabled={isBusy} className="mt-5 space-y-4">
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

          {hasFailed && (
            <div className="mt-5" role="alert">
              <p className="text-sm text-burgundy">{errorMessage}</p>
              <p className="mt-1 text-sm text-ink-muted">
                This session is not in your history yet. It is still counted in
                today&apos;s total, and nothing you typed has been lost.
              </p>
            </div>
          )}

          {/* The session is safe; only these details failed to reach it. Said
              differently from the message above on purpose, because the two
              are not the same kind of loss. */}
          {detailsState === "failed" && (
            <div className="mt-5" role="alert">
              <p className="text-sm text-burgundy">{detailsError}</p>
              <p className="mt-1 text-sm text-ink-muted">
                The session itself is saved. Only these details did not reach
                it, and they can be added later from History.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isBusy={isBusy}
              busyLabel={hasFailed ? "Saving session..." : "Saving details..."}
            >
              {hasFailed ? "Save session" : "Save details"}
            </Button>

            <Button variant="secondary" onClick={onSkip} disabled={isBusy}>
              {hasFailed ? "Skip" : "Done"}
            </Button>

            <span className="text-sm text-ink-faint">
              {hasFailed
                ? "Skip still saves the session, just without these details."
                : "The session is already saved either way."}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}

export default SessionCompletion;
