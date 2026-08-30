import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

/*
  How long the session is going to be.

  A row of preset buttons made the lengths look like nine equal options to read
  through. They are really one number that goes up and down, so this is a dial:
  the value sits where the time will sit once the session starts, and the
  arrows step it.

  It selects and nothing more. It never starts, times or saves anything.
*/

// The lengths worth one click each. Anything else is typed.
const PRESET_MINUTES = [15, 25, 30, 45, 50, 60, 70, 90, 120];

// The same bounds the old picker enforced, so a typed length cannot be zero,
// negative, or long enough to be a mistake.
const MIN_MINUTES = 1;
const MAX_MINUTES = 600;

// A typed length is not on the preset ladder, so the arrows step it evenly
// instead of jumping to the nearest preset and losing what was typed.
const CUSTOM_STEP_MINUTES = 5;

/** Clamps a length to the range the timer will accept. */
function clampMinutes(minutes) {
  return Math.min(Math.max(minutes, MIN_MINUTES), MAX_MINUTES);
}

/**
 * Chooses the planned length of a focus session.
 *
 * The value shown here is the session about to be started, never a countdown:
 * once it is running, the clock shows the time left instead and this control
 * is gone.
 */
function DurationPicker({ minutes, onChange }) {
  // A length that is not on the ladder can only have been typed, so the
  // control opens in the state that matches the value it was given.
  const isCustomValue = !PRESET_MINUTES.includes(minutes);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const isCustom = isCustomOpen || isCustomValue;

  const presetIndex = PRESET_MINUTES.indexOf(minutes);
  const canIncrease = isCustom
    ? minutes < MAX_MINUTES
    : presetIndex < PRESET_MINUTES.length - 1;
  const canDecrease = isCustom
    ? minutes > MIN_MINUTES
    : presetIndex > 0;

  /** Moves the selected focus duration to the next preset value. */
  function handleIncreaseDuration() {
    if (isCustom) {
      onChange(clampMinutes(minutes + CUSTOM_STEP_MINUTES));
      return;
    }
    // Stops at the longest rather than wrapping round to the shortest, which
    // would be a surprise every time somebody clicked once too often.
    if (presetIndex < PRESET_MINUTES.length - 1) {
      onChange(PRESET_MINUTES[presetIndex + 1]);
    }
  }

  /** Moves the selected focus duration to the previous preset value. */
  function handleDecreaseDuration() {
    if (isCustom) {
      onChange(clampMinutes(minutes - CUSTOM_STEP_MINUTES));
      return;
    }
    if (presetIndex > 0) {
      onChange(PRESET_MINUTES[presetIndex - 1]);
    }
  }

  function handleCustomDurationChange(event) {
    const typed = Number(event.target.value);

    // An empty or half-typed box is left alone rather than corrected under the
    // cursor; the length only moves once it is a number that makes sense.
    if (Number.isFinite(typed) && typed >= MIN_MINUTES) {
      onChange(clampMinutes(typed));
    }
  }

  function handleUsePresets() {
    setIsCustomOpen(false);
    // Back onto the ladder at the nearest rung, so the arrows have somewhere
    // to step from.
    const nearest = PRESET_MINUTES.reduce((closest, preset) =>
      Math.abs(preset - minutes) < Math.abs(closest - minutes) ? preset : closest
    );
    onChange(nearest);
  }

  // Both arrows are one shape, split down the middle, so they read as a single
  // control rather than two buttons that happen to sit next to each other.
  const arrowClasses =
    "flex h-7 w-10 items-center justify-center text-ink-muted transition-all " +
    "hover:bg-surface-sunken hover:text-ink active:scale-95 active:bg-brass-wash " +
    "disabled:cursor-not-allowed disabled:opacity-30 " +
    "disabled:hover:bg-transparent disabled:hover:text-ink-muted disabled:active:scale-100";

  return (
    <div className="flex flex-col items-center">
      {/* A fixed height for the value, so switching between the number and the
          typed field never nudges everything below it. */}
      <div className="flex h-11 items-center justify-center">
        {isCustom ? (
          <>
            <label className="sr-only" htmlFor="custom-duration">
              Focus length in minutes
            </label>
            <input
              id="custom-duration"
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={minutes}
              onChange={handleCustomDurationChange}
              // A hairline and the page's own paper, rather than a browser
              // input dropped into the middle of a clock. The native spinners
              // are hidden because the chevrons below already do that job.
              className="w-[4.5rem] rounded-md border border-rule bg-transparent py-0.5
                         text-center text-[2.25rem] leading-none text-ink tabular-nums font-display
                         transition-colors hover:border-rule-strong
                         [appearance:textfield]
                         [&::-webkit-inner-spin-button]:appearance-none
                         [&::-webkit-outer-spin-button]:appearance-none"
            />
          </>
        ) : (
          <p className="text-[2.25rem] leading-none text-ink tabular-nums font-display">
            {minutes}
          </p>
        )}
      </div>

      {/* Tight to the number on purpose: it is the unit of the value above it,
          not a line of its own. */}
      <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.16em] text-ink-faint">
        mins
      </p>

      <div className="mt-3 inline-flex overflow-hidden rounded-md border border-rule bg-surface-raised">
        <button
          type="button"
          onClick={handleDecreaseDuration}
          disabled={!canDecrease}
          aria-label="Decrease focus duration"
          className={`${arrowClasses} border-r border-rule`}
        >
          <ChevronDown size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleIncreaseDuration}
          disabled={!canIncrease}
          aria-label="Increase focus duration"
          className={arrowClasses}
        >
          <ChevronUp size={15} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={isCustom ? handleUsePresets : () => setIsCustomOpen(true)}
        className="mt-3 text-[0.6875rem] text-ink-faint underline underline-offset-2
                   transition-colors hover:text-ink-muted"
      >
        {isCustom ? "Use presets" : "Custom"}
      </button>
    </div>
  );
}

export default DurationPicker;
