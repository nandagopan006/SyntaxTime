import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

import FocusClock from "../components/timer/FocusClock";
import Button from "../components/ui/Button";
import {
  TIMER_COMMANDS,
  listenForTimerState,
  requestTimerState,
  sendTimerCommand,
} from "../desktop/desktopEvents";
import { hideCurrentWindow, showMainWindow } from "../desktop/focusWindow";
import { formatStudyTime } from "../utils/formatTime";
import { NO_SUBJECT_LABEL, NO_TOPIC_LABEL } from "../utils/studySession";

/*
  The compact always-on-top window, shown over whatever the user is working in.

  It contains no timer. There is no interval here, no countdown, and no Redux:
  the main window owns the session and sends what this should draw, and the
  buttons send an intention back. That is the whole reason two windows can
  never disagree about how long a session has left.

  The user can resize it, so nothing here is a fixed size. Every measurement
  scales with the window and is clamped at both ends: a control that stays one
  size while its window halves ends up swallowing the window, and a label sized
  in raw viewport units ends up too small to read.
*/

// The window is its own viewport, so vmin is simply "the short side of this
// window". One spacing scale, used everywhere, so the whole thing grows and
// shrinks together instead of drifting apart.
//
// Deliberately tight: the clock is what the window is for, and every pixel
// spent on padding or on a taller button is a pixel it does not get.
const CONTENT_PADDING = "p-[clamp(0.375rem,2.2vmin,0.75rem)]";
const CONTENT_GAP = "gap-[clamp(0.1875rem,1.3vmin,0.5rem)]";

// Both header buttons share one shape, so they read as a pair rather than two
// unrelated controls.
const HEADER_BUTTON =
  "flex h-5 w-5 items-center justify-center rounded-md text-ink-faint " +
  "transition-colors hover:bg-surface-sunken hover:text-ink";

/**
 * Starts a native window drag when the header bar is pressed.
 *
 * Only when the bar itself is pressed. The close button sits inside the
 * header, and starting a drag on mouse-down swallows the mouse-up that would
 * have completed the click - so without this check the button is unclickable
 * and looks broken. Anything interactive in the header is left alone.
 */
async function handleHeaderMouseDown(event) {
  // Left button only: a right-click should open the system menu, not drag.
  if (event.button !== 0 || event.target.closest("button")) {
    return;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}

function FocusWindow() {
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    let stopListening = () => {};

    listenForTimerState((state) => {
      if (isCurrent) {
        setTimer(state);
      }
    }).then((unlisten) => {
      if (isCurrent) {
        stopListening = unlisten;
      } else {
        unlisten();
      }
    });

    // Reopening must show the session as it is now, not as it was when the
    // window was last hidden, so it asks rather than waiting for the next
    // broadcast.
    requestTimerState();

    return () => {
      isCurrent = false;
      stopListening();
    };
  }, []);

  const isActive = Boolean(timer && (timer.isRunning || timer.isPaused));

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-parchment">
      {/* The window has no system title bar, so this is both the title and the
          handle it is moved by. Kept small: it is a grip, not a heading. */}
      <header
        onMouseDown={handleHeaderMouseDown}
        className="flex shrink-0 cursor-grab items-center justify-between border-b border-rule bg-surface px-2.5 py-1.5 active:cursor-grabbing"
      >
        <p className="text-[clamp(0.6875rem,2.6vmin,0.875rem)] text-ink font-display">
          Syntax<span className="text-brass">Time</span>
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* The main window can be hidden entirely now that the application
              lives in the notification area, so this has to be a way back to
              it rather than just a way to focus it. */}
          <button
            type="button"
            onClick={showMainWindow}
            aria-label="Open the main SyntaxTime window"
            title="Open the main window"
            className={HEADER_BUTTON}
          >
            <Maximize2 size={12} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={hideCurrentWindow}
            aria-label="Close the focus window"
            // Says what it does not do, because closing a timer window looks
            // like it should stop the timer.
            title="Close this window. The session keeps running."
            className={HEADER_BUTTON}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* min-h-0 lets this shrink below its content's natural height, which is
          what stops the controls being pushed off the bottom of a small
          window. */}
      <div
        className={`flex min-h-0 flex-1 flex-col items-center justify-center ${CONTENT_GAP} ${CONTENT_PADDING}`}
      >
        {!timer ? (
          <p className="text-[clamp(0.6875rem,2.6vmin,0.875rem)] text-ink-faint">
            Connecting to your session...
          </p>
        ) : !isActive ? (
          /* One session usually follows another, and going back to the main
             window to press Start defeats the point of a window that floats
             above the work. The length is whichever is selected on Home;
             changing it still happens there. */
          <div className={`flex w-full flex-col items-center ${CONTENT_GAP}`}>
            <p className="text-center text-[clamp(0.6875rem,2.8vmin,0.875rem)] text-ink">
              No session running.
            </p>

            {timer.durationSeconds > 0 ? (
              <>
                <Button
                  variant="primary"
                  size="fluid"
                  fullWidth
                  onClick={() => sendTimerCommand(TIMER_COMMANDS.start)}
                >
                  Start {Math.round(timer.durationSeconds / 60)} min
                </Button>
                <p className="text-center text-[clamp(0.625rem,2.2vmin,0.6875rem)] text-ink-faint">
                  Change the length in the main window.
                </p>
              </>
            ) : (
              <p className="text-center text-[clamp(0.625rem,2.4vmin,0.75rem)] text-ink-faint">
                Choose a length in the main SyntaxTime window.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* The same clock as Home and focus mode, sized from the window so
                it grows and shrinks as the user resizes it. The ring means the
                same thing in all three. */}
            <FocusClock
              remainingSeconds={timer.remainingSeconds}
              durationSeconds={timer.durationSeconds}
              elapsedSeconds={timer.elapsedFocusSeconds}
              status={timer.status}
              phase={timer.phase}
              size="fluid"
            />

            {/* The first thing dropped when the window is made small: the time
                and the controls are what it is for, and this is context. */}
            <div className="w-full shrink-0 text-center [@media(max-height:330px)]:hidden">
              <p className="truncate text-[clamp(0.75rem,2.8vmin,0.875rem)] text-ink font-display">
                {timer.subject || NO_SUBJECT_LABEL}
              </p>
              <p className="truncate text-[clamp(0.625rem,2.4vmin,0.75rem)] text-ink-faint">
                {timer.topic || NO_TOPIC_LABEL}
              </p>
              <p className="mt-1 text-[clamp(0.625rem,2.4vmin,0.75rem)] text-ink-muted">
                Today{" "}
                <span className="text-ink tabular-nums">
                  {formatStudyTime(timer.todayFocusSeconds ?? 0)}
                </span>
              </p>
            </div>

            {/* Never dropped, whatever the size. A timer window you cannot
                pause is not a timer window. */}
            <div className={`flex w-full shrink-0 flex-col ${CONTENT_GAP}`}>
              <Button
                variant="primary"
                size="fluid"
                fullWidth
                onClick={() =>
                  sendTimerCommand(
                    timer.isRunning ? TIMER_COMMANDS.pause : TIMER_COMMANDS.resume
                  )
                }
              >
                {timer.isRunning ? "Pause" : "Resume"}
              </Button>

              <div className={`grid grid-cols-2 ${CONTENT_GAP}`}>
                <Button
                  variant="secondary"
                  size="fluid"
                  fullWidth
                  onClick={() => sendTimerCommand(TIMER_COMMANDS.finish)}
                >
                  Finish
                </Button>
                <Button
                  variant="secondary"
                  size="fluid"
                  fullWidth
                  onClick={() => sendTimerCommand(TIMER_COMMANDS.reset)}
                >
                  Reset
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default FocusWindow;
