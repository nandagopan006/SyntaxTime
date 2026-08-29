import Button from "../ui/Button";

/*
  The Start / Pause / Resume / Reset / Finish buttons.

  Shared by the Home card, the compact popup and Focus Mode. All three look
  different, but every one dispatches the same timer actions, so none of them
  owns any timer behaviour. `compact` only changes the arrangement.
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
  const isIdle = !isRunning && !isPaused;

  if (isIdle) {
    return (
      <Button
        variant="primary"
        onClick={onStart}
        disabled={!canStart}
        fullWidth={compact}
        className={compact ? "" : "px-8"}
      >
        Start focus
      </Button>
    );
  }

  // Pausing and resuming are the same button in two states, so it keeps the
  // same position and the mouse never has to move between them.
  const pauseOrResume = isRunning ? (
    <Button variant="primary" onClick={onPause} fullWidth={compact}>
      Pause
    </Button>
  ) : (
    <Button variant="primary" onClick={onResume} fullWidth={compact}>
      Resume
    </Button>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {pauseOrResume}
          <Button variant="secondary" onClick={onReset} fullWidth>
            Reset
          </Button>
        </div>

        <Button variant="secondary" onClick={onFinish} fullWidth>
          Finish session
        </Button>
      </div>
    );
  }

  return (
    <>
      {pauseOrResume}
      <Button variant="secondary" onClick={onReset}>
        Reset
      </Button>
      <Button variant="secondary" onClick={onFinish}>
        Finish session
      </Button>
    </>
  );
}

export default TimerControls;
