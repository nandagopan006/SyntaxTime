import { formatTime } from "../../utils/formatTime";

/*
  The focus clock.

  A study instrument rather than a dashboard widget: a paper face, one brass
  ring that fills as the session is worked through, and the time set in the
  same serif the rest of SyntaxTime uses for numbers that matter.

  The middle and the ring answer two different questions on purpose. The
  numerals say how much time is left; the ring says how much of the session is
  behind you. Watching a ring drain is watching something run out, which is the
  opposite of the feeling this application is for.

  It shows the timer and nothing else. It never starts, pauses, resets or
  saves anything, and it holds no timing of its own - the countdown lives in
  useTimer, and everything here is worked out from the seconds it is handed.
  That is why the same component can appear on Home, in the popup and in focus
  mode without those three views ever disagreeing.
*/

// Geometry in the 200x200 viewBox. One progress ring and one hairline, which
// is as much structure as a clock needs to be read at a glance.
const RING_RADIUS = 82;
const RING_WIDTH = 7;
const HAIRLINE_RADIUS = 94;

const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Matches the quarter-second tick, so the ring creeps rather than stepping.
const TICK_TRANSITION = "250ms linear";

// How the clock is dressed in each state. Colour alone never carries the
// meaning - the status is written across the face either way - but it lets a
// glance tell a paused session from a running one.
const PHASE_STYLES = {
  ready: { accent: "var(--color-brass-soft)", label: "text-ink-faint" },
  running: { accent: "var(--color-brass)", label: "text-brass" },
  // Toned down rather than recoloured. Pausing is not an error.
  paused: { accent: "var(--color-brass-soft)", label: "text-ink-faint" },
  complete: { accent: "var(--color-forest)", label: "text-forest" },
  break: { accent: "var(--color-forest)", label: "text-forest" },
};

// Three sizes of one clock. Home wants the largest thing on the page, the
// popup has a couple of hundred pixels to work with, and focus mode has the
// whole screen.
const SIZES = {
  sm: {
    frame: "w-[10.5rem]",
    time: "text-[2.5rem]",
    label: "text-[0.625rem] tracking-[0.16em]",
  },
  md: {
    frame: "w-[clamp(15rem,34vmin,23rem)]",
    time: "text-[clamp(2.75rem,7.5vmin,4rem)]",
    label: "text-xs tracking-[0.16em]",
  },
  lg: {
    frame: "w-[clamp(17rem,44vmin,32rem)]",
    time: "text-[clamp(3.5rem,11vmin,6rem)]",
    label: "text-sm tracking-[0.18em]",
  },
  // For the desktop focus window, which the user can resize. Measured against
  // the window itself rather than a fixed size, so the clock shrinks and grows
  // with it instead of overflowing or leaving the middle empty.
  //
  // Every value is clamped at both ends. Plain viewport units alone put the
  // status label at about six pixels in a small window, which is a label
  // nobody can read.
  fluid: {
    frame: "w-[min(78vw,46vh)]",
    time: "text-[clamp(1.25rem,12vmin,3.5rem)]",
    label: "text-[clamp(0.5rem,2.2vmin,0.6875rem)] tracking-[0.12em]",
  },
};

/**
 * Displays the remaining focus time and shows completed session progress as a
 * clockwise-filling circular ring.
 *
 * Purely presentational: hand it the seconds and the phase, and it draws them.
 * It holds no timing of its own and never counts anything.
 *
 * Anything passed as children takes the place of the countdown in the middle.
 * That is how the setup screen puts the length picker inside the dial: the
 * clock still owns the face and the ring, and knows nothing about choosing a
 * duration.
 */
function FocusClock({
  remainingSeconds,
  durationSeconds,
  elapsedSeconds = 0,
  status,
  phase = "ready",
  size = "md",
  children,
}) {
  const { accent, label } = PHASE_STYLES[phase] ?? PHASE_STYLES.ready;
  const sizeStyles = SIZES[size] ?? SIZES.md;

  // The ring shows what has been done, so it starts empty and fills as the
  // session is worked through. A planned session is not completed work: at
  // rest this is zero, whatever length was chosen.
  //
  // Derived from the timer's own seconds. Nothing here counts, and there is no
  // second measurement of the time anywhere.
  const progress =
    durationSeconds > 0
      ? Math.min(Math.max(elapsedSeconds / durationSeconds, 0), 1)
      : 0;

  return (
    <div
      className={`relative mx-auto flex aspect-square items-center justify-center ${sizeStyles.frame}`}
    >
      {/* The face. A sheet of paper under glass, not a glowing panel. */}
      <div
        aria-hidden="true"
        className="absolute inset-[10%] rounded-full bg-surface-raised shadow-[inset_0_1px_3px_rgb(62_50_30/0.07)]"
      />

      {/* Only while running, and slow enough that it is felt rather than
          seen. Anything faster would compete with the studying. */}
      {phase === "running" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border animate-clock-breathe"
          style={{ borderColor: accent }}
        />
      )}

      {/* One pulse when the session lands, then nothing. */}
      {phase === "complete" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 animate-clock-complete"
          style={{ borderColor: accent }}
        />
      )}

      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        // Turned so the ring starts and ends at twelve o'clock.
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="100"
          cy="100"
          r={HAIRLINE_RADIUS}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="1"
        />

        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={RING_WIDTH}
        />

        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          stroke={accent}
          strokeWidth={RING_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          // Full offset hides the ring entirely; none of it shows the whole
          // circle. The -90 turn on the svg above starts it at twelve
          // o'clock, and an SVG circle is drawn clockwise from there.
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          // Dimmed while paused, so a stopped session looks stopped.
          opacity={phase === "paused" ? 0.5 : 1}
          style={{
            transition: `stroke-dashoffset ${TICK_TRANSITION}, opacity 200ms ease-out, stroke 300ms ease-out`,
          }}
        />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        <p className={`font-sans font-medium uppercase ${sizeStyles.label} ${label}`}>
          {status}
        </p>

        {children ? (
          // The same gap the countdown gets, so whatever sits in the middle
          // keeps one rhythm with the status above it.
          <div className="mt-2">{children}</div>
        ) : (
          <p
            role="timer"
            // Deliberately silent. A countdown that announced itself every
            // second would make the application unusable with a screen reader.
            aria-live="off"
            className={`mt-2.5 leading-none text-ink tabular-nums font-display ${sizeStyles.time}`}
          >
            {formatTime(remainingSeconds)}
          </p>
        )}
      </div>

      {/* The state changes are worth hearing; the seconds are not. This only
          speaks when the status word itself changes. */}
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export default FocusClock;
