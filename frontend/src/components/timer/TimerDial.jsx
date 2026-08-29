import { formatTime } from "../../utils/formatTime";

// A thin ring, drawn once and rotated so it starts at the top.
const RADIUS = 92;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/*
  The countdown itself: a large serif number inside a quiet brass ring.

  The ring is the only thing on the page that moves, which is what makes the
  timer the obvious subject without needing colour or weight anywhere else. It
  is decorative - the time is written in the middle and announced to assistive
  technology - so it is hidden from screen readers.
*/
function TimerDial({ remainingSeconds, durationSeconds, status, isBreak }) {
  const elapsed = Math.max(durationSeconds - remainingSeconds, 0);
  const progress = durationSeconds > 0 ? Math.min(elapsed / durationSeconds, 1) : 0;

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth="3"
        />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={isBreak ? "var(--color-brass-soft)" : "var(--color-brass)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          // Matches the quarter-second tick, so the ring creeps rather than
          // stepping.
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>

      <div className="relative text-center">
        <p
          role="timer"
          aria-live="off"
          className="font-display text-6xl leading-none text-ink tabular-nums"
        >
          {formatTime(remainingSeconds)}
        </p>

        <p className="mt-3 section-eyebrow">{status}</p>
      </div>
    </div>
  );
}

export default TimerDial;
