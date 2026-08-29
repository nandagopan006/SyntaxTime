import { useState } from "react";

import Button from "../ui/Button";

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
      <p className="text-lg text-ink font-display">Take a break?</p>
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
                "rounded-md border px-4 py-2 text-sm transition-colors",
                selectedMinutes === minutes
                  ? "border-brass bg-brass-wash font-medium text-ink"
                  : "border-rule bg-surface-raised text-ink-muted hover:border-rule-strong hover:text-ink",
              ].join(" ")}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => onStartBreak(selectedMinutes)}>
          Start break
        </Button>

        <Button variant="secondary" onClick={onSkipBreak}>
          Skip break
        </Button>
      </div>
    </div>
  );
}

export default BreakOffer;
