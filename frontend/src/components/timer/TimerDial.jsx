import { formatTime } from "../../utils/formatTime";

/*
  The countdown itself: a large serif number inside a brass dial.

  Three rings, drawn from the outside in. A quiet outer band gives the dial an
  edge so it reads as an object rather than a floating number. Inside it a
  sunken track shows how far there is to go, and the brass arc over it shows how
  far you have come. The knob rides the end of that arc, which is what makes
  progress legible at a glance instead of having to read the ring's thickness.

  The rings are decorative - the time is written in the middle and announced to
  assistive technology - so the drawing is hidden from screen readers.
*/

// Radii in the 200x200 viewBox. The arc sits well inside the outer band so the
// knob has room to sit on it without touching anything.
const OUTER_RADIUS = 94;
const TRACK_RADIUS = 74;
const TRACK_WIDTH = 11;
const KNOB_RADIUS = 9;

const CIRCUMFERENCE = 2 * Math.PI * TRACK_RADIUS;

// Matches the quarter-second tick, so the ring creeps rather than stepping.
const TICK_TRANSITION = "250ms linear";

function TimerDial({ remainingSeconds, durationSeconds, status }) {
  const elapsed = Math.max(durationSeconds - remainingSeconds, 0);
  const progress = durationSeconds > 0 ? Math.min(elapsed / durationSeconds, 1) : 0;

  return (
    // Sized from the smaller viewport dimension, so a 768px-tall laptop screen
    // still shows the controls beneath it without scrolling.
    <div className="relative mx-auto flex aspect-square w-[clamp(11rem,26vmin,14rem)] items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        // Rotated so both the arc and the knob start at twelve o'clock. Inside
        // this element, angle zero points right.
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        {/* The dial's edge. */}
        <circle
          cx="100"
          cy="100"
          r={OUTER_RADIUS}
          fill="none"
          stroke="var(--color-brass-soft)"
          strokeWidth="6"
        />

        {/* How far there is left to go. */}
        <circle
          cx="100"
          cy="100"
          r={TRACK_RADIUS}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={TRACK_WIDTH}
        />

        {/* How far you have come. */}
        <circle
          cx="100"
          cy="100"
          r={TRACK_RADIUS}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          style={{ transition: `stroke-dashoffset ${TICK_TRANSITION}` }}
        />

        {/*
          The knob is drawn at the start of the arc and the whole group is
          turned to where it belongs. Rotating is smoother than moving it,
          because the browser can interpolate one transform instead of two
          coordinates.
        */}
        <g
          style={{
            transform: `rotate(${progress * 360}deg)`,
            transformOrigin: "100px 100px",
            transition: `transform ${TICK_TRANSITION}`,
          }}
        >
          <circle
            cx={100 + TRACK_RADIUS}
            cy="100"
            r={KNOB_RADIUS}
            fill="var(--color-brass-deep)"
            // A ring of page colour, so the knob sits on the arc rather than
            // merging into it.
            stroke="var(--color-surface)"
            strokeWidth="3"
          />
        </g>
      </svg>

      <div className="relative text-center">
        <p className="section-eyebrow">{status}</p>

        <p
          role="timer"
          aria-live="off"
          className="mt-2 text-[clamp(2.5rem,6.5vmin,3.5rem)] leading-none text-ink tabular-nums font-display"
        >
          {formatTime(remainingSeconds)}
        </p>
      </div>
    </div>
  );
}

export default TimerDial;
