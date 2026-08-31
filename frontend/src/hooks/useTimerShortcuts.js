import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useFocusCoach } from "../context/useFocusCoach";
import { resumeTimer } from "../features/timer/timerSlice";

// Anything the browser already gives a meaning to when Space is pressed.
const INTERACTIVE = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"];

/**
 * True when the key press belongs to something else on the page.
 *
 * Space types a space in a text field and activates a focused button, so the
 * shortcut has to stand aside in both cases - otherwise typing "Promise all"
 * would pause the session, and pressing Pause with the keyboard would toggle
 * it twice.
 */
function isSomeoneElsesKeypress(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return true;
  }

  const target = event.target;
  return (
    target?.isContentEditable || INTERACTIVE.includes(target?.tagName ?? "")
  );
}

/**
 * Space pauses and resumes the running session, from anywhere in the app.
 *
 * Mounted once, beside the countdown itself, so there is only ever one
 * listener and it works the same on Home, in the popup and in Focus Mode.
 */
export function useTimerShortcuts() {
  const dispatch = useDispatch();
  // Space is a pause like any other, so it asks why like any other. Resuming
  // is not an interruption and goes straight through.
  const { openPauseCoach } = useFocusCoach();
  const isRunning = useSelector((state) => state.timer.isRunning);
  const isPaused = useSelector((state) => state.timer.isPaused);

  useEffect(() => {
    // Nothing to pause or resume, so the key keeps its usual meaning.
    if (!isRunning && !isPaused) {
      return;
    }

    function handleKeyDown(event) {
      if (event.code !== "Space" || isSomeoneElsesKeypress(event)) {
        return;
      }

      // Space scrolls the page by default, which would be a surprise.
      event.preventDefault();

      if (isRunning) {
        openPauseCoach();
        return;
      }
      dispatch(resumeTimer(Date.now()));
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, isPaused, dispatch, openPauseCoach]);
}
