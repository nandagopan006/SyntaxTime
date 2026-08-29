const BASE_BUTTON =
  "rounded text-sm focus-visible:outline-2 focus-visible:outline-brass disabled:opacity-50";

/**
 * The Start / Pause / Resume / Reset / Finish buttons.
 *
 * Shared by the Home card and the compact popup. The two look different, but
 * both dispatch the same timer actions, so neither owns any timer behaviour.
 * `compact` only changes spacing and arrangement.
 */
function TimerControls({
  isRunning,
  isPaused,
  canStart,
  compact = false,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
}) {
  const padding = compact ? "px-3 py-2" : "px-5 py-2.5";
  const primaryButton = `${BASE_BUTTON} ${padding} bg-ink text-parchment`;
  const secondaryButton = `${BASE_BUTTON} ${padding} border border-rule text-ink-muted hover:bg-surface-sunken hover:text-ink`;

  const isIdle = !isRunning && !isPaused;

  if (isIdle) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className={`${primaryButton} w-full sm:w-auto`}
      >
        Start focus
      </button>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {isRunning ? (
            <button type="button" onClick={onPause} className={primaryButton}>
              Pause
            </button>
          ) : (
            <button type="button" onClick={onResume} className={primaryButton}>
              Resume
            </button>
          )}

          <button type="button" onClick={onReset} className={secondaryButton}>
            Reset
          </button>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className={`${secondaryButton} w-full`}
        >
          Finish session
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {isRunning ? (
        <button type="button" onClick={onPause} className={primaryButton}>
          Pause
        </button>
      ) : (
        <button type="button" onClick={onResume} className={primaryButton}>
          Resume
        </button>
      )}

      <button type="button" onClick={onReset} className={secondaryButton}>
        Reset
      </button>

      <button type="button" onClick={onFinish} className={secondaryButton}>
        Finish session
      </button>
    </div>
  );
}

export default TimerControls;
