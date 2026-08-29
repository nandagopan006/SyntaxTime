import { useState } from "react";

const BREAK_MINUTES = [5, 10, 15];
const DEFAULT_BREAK_MINUTES = 10;

/*
  The break invitation, shown once a session is safely in the database.

  It only offers; it never starts anything by itself. The chosen length lives in
  local state because it means nothing until Start break is pressed, and only
  the running timer belongs in Redux.
*/
function BreakOffer({ onStartBreak, onSkipBreak }) {
  const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_BREAK_MINUTES);

  return (
    <div className="mt-6 border-t border-rule pt-6">
      <p className="font-display text-lg text-ink">Take a break?</p>
      <p className="mt-1 text-sm text-ink-muted">
        A break is a timer only. It is never added to your study time.
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Break length</legend>

        <div className="flex flex-wrap gap-2">
          {BREAK_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setSelectedMinutes(minutes)}
              aria-pressed={selectedMinutes === minutes}
              className={[
                "rounded border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brass",
                selectedMinutes === minutes
                  ? "border-brass bg-surface-sunken text-ink font-medium"
                  : "border-rule text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
              ].join(" ")}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onStartBreak(selectedMinutes)}
          className="rounded bg-ink px-5 py-2.5 text-sm text-parchment focus-visible:outline-2 focus-visible:outline-brass"
        >
          Start break
        </button>

        <button
          type="button"
          onClick={onSkipBreak}
          className="rounded border border-rule px-5 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
        >
          Skip break
        </button>
      </div>
    </div>
  );
}

export default BreakOffer;
