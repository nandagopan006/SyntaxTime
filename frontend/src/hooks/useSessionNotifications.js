import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import {
  notify,
  requestNotificationPermission,
} from "../desktop/notifications";
import { formatStudyTime } from "../utils/formatTime";

/**
 * Tells the user when a focus session or a break has ended.
 *
 * Mounted once, in the window that owns the timer, so one ending produces one
 * notification however many views of that timer happen to be open.
 *
 * It only watches. Nothing here starts, stops or saves anything, so a refused
 * permission or a missing notification cannot affect the session it was
 * reporting on.
 */
export function useSessionNotifications() {
  const mode = useSelector((state) => state.timer.mode);
  const isRunning = useSelector((state) => state.timer.isRunning);
  const isCompleted = useSelector((state) => state.timer.isCompleted);
  const elapsedFocusSeconds = useSelector(
    (state) => state.timer.elapsedFocusSeconds
  );
  const startedAt = useSelector((state) => state.timer.startedAt);
  const durationSeconds = useSelector((state) => state.timer.durationSeconds);

  // Permission is asked for when a session starts, not when the application
  // opens: a prompt from something you have not used yet is usually refused.
  useEffect(() => {
    if (isRunning) {
      requestNotificationPermission();
    }
  }, [isRunning]);

  // The completion flag stays true while the user fills in the completion
  // form, so the effect below would fire again on every unrelated re-render.
  //
  // What is remembered is which ending was announced, not merely that one was.
  // A plain flag has to see the timer pass through "not finished" to clear
  // itself, and React batches dispatches: closing one session and starting the
  // next in a single handler can hide that moment entirely, after which no
  // session would ever be announced again. Identifying the session cannot
  // fail that way.
  const announcedSession = useRef(null);

  useEffect(() => {
    if (!isCompleted) {
      announcedSession.current = null;
      return;
    }

    const session = `${mode}:${startedAt ?? "break"}:${durationSeconds}`;
    if (announcedSession.current === session) {
      return;
    }
    announcedSession.current = session;

    if (mode === "break") {
      notify("Break over", "Ready for another session?");
      return;
    }

    notify(
      "Session complete",
      `You focused for ${formatStudyTime(elapsedFocusSeconds)}. Record it whenever you are ready.`
    );
    // elapsedFocusSeconds is deliberately not a dependency: it is read at the
    // moment of the ending, and listing it would re-run this every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, mode, startedAt, durationSeconds]);
}
