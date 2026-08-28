const BASE_BUTTON = "rounded px-5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-brass";
const PRIMARY_BUTTON = `${BASE_BUTTON} bg-ink text-parchment disabled:opacity-50`;
const SECONDARY_BUTTON = `${BASE_BUTTON} border border-rule text-ink-muted hover:bg-surface-sunken hover:text-ink`;

/**
 * The Start / Pause / Resume / Reset / Finish buttons.
 *
 * Kept apart from FocusTimer so the compact popup and Focus Mode can show the
 * same controls later without any of them owning timer logic.
 */
function TimerControls({
  isRunning,
  isPaused,
  canStart,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
}) {
  const isIdle = !isRunning && !isPaused;

  if (isIdle) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
      >
        Start focus
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {isRunning ? (
        <button type="button" onClick={onPause} className={PRIMARY_BUTTON}>
          Pause
        </button>
      ) : (
        <button type="button" onClick={onResume} className={PRIMARY_BUTTON}>
          Resume
        </button>
      )}

      <button type="button" onClick={onReset} className={SECONDARY_BUTTON}>
        Reset
      </button>

      <button type="button" onClick={onFinish} className={SECONDARY_BUTTON}>
        Finish session
      </button>
    </div>
  );
}

export default TimerControls;
