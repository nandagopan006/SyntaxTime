import { createContext, useCallback, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import FocusCoachDialog from "../components/coach/FocusCoachDialog";
import {
  countInterruption,
  finishTimer,
  pauseTimer,
  resumeTimer,
} from "../features/timer/timerSlice";
import { getFocusCoachResponse } from "../services/coachService";

/*
  Where the focus coach lives.

  Pause and Finish appear in four places - the Home card, the compact popup,
  Focus Mode and the native focus window - and every one of them used to
  dispatch the timer action directly. They now open this instead, which asks
  the user why and then dispatches that same action once the user has decided.

  One provider rather than four dialogs, and the timer is changed in exactly
  one place in this file. That is what stops a coached pause from ever becoming
  two pauses.

  A Context rather than a Redux slice: this is a short-lived modal with a
  callback in it, which is not shared application state. The one piece that
  genuinely belongs to the session - how often it has been interrupted - lives
  in timerSlice, where it is cleared along with everything else about it.
*/

// eslint-disable-next-line react-refresh/only-export-components
export const FocusCoachContext = createContext(null);

export function FocusCoachProvider({ children }) {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.timer);
  // Read out on its own because opening the dialog depends on it, and a
  // callback that depended on the whole timer would be rebuilt on every tick.
  const isRunning = timer.isRunning;

  // Which decision is being made, or null when the dialog is closed.
  const [coachEvent, setCoachEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // The conversation, oldest first, as [{ role: "user" | "coach", content }].
  // It lives here and nowhere else: nothing is stored server-side, so closing
  // the dialog is the end of it.
  const [messages, setMessages] = useState([]);
  const [hasFailed, setHasFailed] = useState(false);

  // What the surface that opened the dialog wants doing afterwards - the popup
  // closes itself and goes to Home, Focus Mode stays where it is. Held in a
  // ref because changing it must never re-render the dialog mid-decision.
  const afterConfirm = useRef(null);

  // Answers arriving after the dialog has closed are dropped, so a slow reply
  // to a pause the user already made cannot reopen anything.
  const requestId = useRef(0);

  // Whether a question is already in flight. A ref rather than the isLoading
  // flag below, because two clicks in the same frame are batched into one
  // render: both would see isLoading still false and both would ask.
  const isAsking = useRef(false);

  // Whether the countdown was running when the dialog opened, and so whether
  // Keep focusing has something to start again. A session that was already
  // paused must not be resumed by closing a dialog.
  const wasRunning = useRef(false);

  const closeDialog = useCallback(() => {
    requestId.current += 1;
    isAsking.current = false;
    setCoachEvent(null);
    setIsLoading(false);
    setMessages([]);
    setHasFailed(false);
    afterConfirm.current = null;
  }, []);

  const openCoach = useCallback(
    (event, options = {}) => {
      // Every interruption asks again, from a clean dialog. The previous
      // reason is never reused: what pulled somebody away ten minutes ago is
      // not what is pulling them away now.
      requestId.current += 1;
      isAsking.current = false;
      setMessages([]);
      setHasFailed(false);
      setIsLoading(false);
      afterConfirm.current = options.afterConfirm ?? null;

      // Counted when the user reaches for the button, so the question reflects
      // this interruption whether or not it ends in a pause.
      if (event === "pause") {
        dispatch(countInterruption());
      }

      /*
        The countdown stops while the dialog is open.

        Talking to the coach is not studying. Leaving the timer running would
        record the conversation as focused minutes, which is inventing study
        time - the one thing the rest of SyntaxTime is careful never to do, and
        the reason a restored session comes back paused rather than resumed.

        This is a hold, not the decision. Keep focusing starts it again from
        exactly where it stopped, so a minute spent deciding costs nothing.
      */
      wasRunning.current = isRunning;
      if (isRunning) {
        dispatch(pauseTimer(Date.now()));
      }

      setCoachEvent(event);
    },
    [dispatch, isRunning]
  );

  /** Opens the coach for a pause. The timer keeps running until the user decides. */
  const openPauseCoach = useCallback(
    (options) => openCoach("pause", options),
    [openCoach]
  );

  /** Opens the coach for a finish. Nothing is finished or saved until the user decides. */
  const openFinishCoach = useCallback(
    (options) => openCoach("finish", options),
    [openCoach]
  );

  /**
   * Sends one message and adds the reply to the conversation.
   *
   * The user's own words go on screen straight away, before the request goes
   * anywhere, so the dialog never looks like it swallowed what was typed.
   */
  const requestCoachResponse = useCallback(
    async (text) => {
      if (isAsking.current) {
        return;
      }
      isAsking.current = true;

      const currentRequest = requestId.current;
      // Read from state at send time: what the coach has to remember is
      // everything before this message.
      let history = [];
      setMessages((current) => {
        history = current;
        return [...current, { role: "user", content: text }];
      });
      setIsLoading(true);
      setHasFailed(false);

      const result = await getFocusCoachResponse({
        event: coachEvent,
        reason: text,
        history,
        pauseCount: timer.pauseCount,
        subject: timer.subject,
        topic: timer.topic,
        plannedMinutes: Math.round(timer.durationSeconds / 60),
        elapsedMinutes: Math.round(timer.elapsedFocusSeconds / 60),
        remainingMinutes: Math.round(timer.remainingSeconds / 60),
      });

      isAsking.current = false;

      // The user closed the dialog, or opened a new one, while this was in
      // flight. Its answer is about a decision that has already been made.
      if (currentRequest !== requestId.current) {
        return;
      }

      setIsLoading(false);
      setHasFailed(Boolean(result.hasFailed));
      setMessages((current) => [
        ...current,
        {
          role: "coach",
          content:
            result.message ||
            (coachEvent === "finish"
              ? "Your session can end here. Your focused time will still be saved."
              : "Take the break you need. You can come back when you're ready."),
        },
      ]);
    },
    [coachEvent, timer]
  );

  /**
   * Returns to the session, starting the countdown again if it was running.
   *
   * Used by Keep focusing, by Escape and by clicking away, which all mean the
   * same thing: nothing was decided, carry on. Resuming shifts the measuring
   * point forward by however long the dialog was open, so the conversation is
   * never counted as study time.
   */
  const keepFocusing = useCallback(() => {
    const shouldResume = wasRunning.current;
    closeDialog();

    if (shouldResume) {
      dispatch(resumeTimer(Date.now()));
    }
  }, [closeDialog, dispatch]);

  /**
   * Carries out the decision.
   *
   * The timer is already held from when the dialog opened, so pausing has
   * nothing left to do; finishing ends the session and nothing more. The
   * completion flow that follows a finish is untouched.
   */
  const handleConfirm = useCallback(() => {
    const event = coachEvent;
    const afterwards = afterConfirm.current;

    // Nothing to resume: the user has decided to stop here.
    wasRunning.current = false;
    closeDialog();

    if (event === "finish") {
      dispatch(finishTimer(Date.now()));
    }

    afterwards?.();
  }, [coachEvent, closeDialog, dispatch]);

  const value = useMemo(
    () => ({ openPauseCoach, openFinishCoach }),
    [openPauseCoach, openFinishCoach]
  );

  return (
    <FocusCoachContext.Provider value={value}>
      {children}

      {coachEvent && (
        <FocusCoachDialog
          event={coachEvent}
          pauseCount={timer.pauseCount}
          subject={timer.subject}
          topic={timer.topic}
          elapsedSeconds={timer.elapsedFocusSeconds}
          remainingSeconds={timer.remainingSeconds}
          isLoading={isLoading}
          messages={messages}
          hasFailed={hasFailed}
          onAskCoach={requestCoachResponse}
          onConfirm={handleConfirm}
          onKeepFocusing={keepFocusing}
        />
      )}
    </FocusCoachContext.Provider>
  );
}
