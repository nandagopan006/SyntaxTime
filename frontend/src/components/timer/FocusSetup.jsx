import { Play } from "lucide-react";

import {
  SUBJECT_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
} from "../../utils/studySession";
import Button from "../ui/Button";
import DurationPicker from "./DurationPicker";
import FocusClock from "./FocusClock";

// Lengths worth offering for a break. Anything longer stops being a pause and
// starts being the end of the study.
const BREAK_MINUTES = [5, 10, 15];

// Past this, a session is long enough that a break afterwards is worth
// mentioning while it is still being set up.
const LONG_SESSION_MINUTES = 50;

/**
 * The screen before a session starts: how long, on what, and what happens
 * afterwards.
 *
 * It configures and nothing more - it never starts, times or saves anything.
 * Pressing the button hands that decision back to FocusTimer.
 *
 * Everything except the length is optional, and the button is never blocked by
 * an empty field: somebody who just wants to study for fifty minutes should be
 * two clicks from doing it.
 */
function FocusSetup({
  selectedMinutes,
  status,
  phase,
  subject,
  topic,
  wantsBreak,
  breakMinutes,
  canStart,
  onSelectDuration,
  onSubjectChange,
  onTopicChange,
  onWantsBreakChange,
  onBreakMinutesChange,
  onStart,
}) {
  const isLongSession = selectedMinutes >= LONG_SESSION_MINUTES;

  return (
    <div className="animate-surface-in">
      <div className="text-center">
        <h2 className="text-3xl text-ink font-display">Get ready to focus</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Choose your focus time and prepare your session.
        </p>
      </div>

      {/* The dial as it will look at the moment of starting: an empty ring,
          and the length sitting exactly where the countdown will sit. Putting
          the picker in the middle is what makes the number read as this
          session rather than as a stray form field. */}
      <div className="mt-6">
        <FocusClock
          remainingSeconds={selectedMinutes * 60}
          durationSeconds={selectedMinutes * 60}
          elapsedSeconds={0}
          status={status}
          phase={phase}
        >
          <DurationPicker minutes={selectedMinutes} onChange={onSelectDuration} />
        </FocusClock>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="block text-sm font-medium text-ink-muted"
            htmlFor="subject"
          >
            Subject <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder="JavaScript"
            maxLength={SUBJECT_MAX_LENGTH}
            className="field-control mt-1.5"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-ink-muted"
            htmlFor="topic"
          >
            Topic <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(event) => onTopicChange(event.target.value)}
            placeholder="Promises"
            maxLength={TOPIC_MAX_LENGTH}
            className="field-control mt-1.5"
          />
        </div>
      </div>

      {/* Decided here rather than sprung on the user when they are tired at
          the end of a session. */}
      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink-muted">Break</legend>

        <label className="mt-2 flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={wantsBreak}
            onChange={(event) => onWantsBreakChange(event.target.checked)}
            className="h-4 w-4 rounded-sm border-rule-strong accent-brass"
          />
          Take a break afterwards
        </label>

        {wantsBreak && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {BREAK_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onBreakMinutesChange(minutes)}
                aria-pressed={breakMinutes === minutes}
                className={[
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  breakMinutes === minutes
                    ? "border-brass bg-brass-wash font-medium text-ink"
                    : "border-rule bg-surface-raised text-ink-muted hover:border-rule-strong hover:text-ink",
                ].join(" ")}
              >
                {minutes} min
              </button>
            ))}
          </div>
        )}

        {isLongSession && wantsBreak && (
          <p className="mt-3 text-xs text-ink-faint">
            You will be offered a {breakMinutes} minute break once this session
            is saved.
          </p>
        )}
      </fieldset>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!canStart}
        onClick={onStart}
        className="mt-8"
      >
        <Play size={16} aria-hidden="true" />
        Start focus session
      </Button>
    </div>
  );
}

export default FocusSetup;
