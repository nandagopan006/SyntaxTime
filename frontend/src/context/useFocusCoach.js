import { useContext, useMemo } from "react";
import { useDispatch } from "react-redux";

import { finishTimer, pauseTimer } from "../features/timer/timerSlice";

import { FocusCoachContext } from "./FocusCoachContext";

/*
  Kept in its own file, like useAuth, so the context module exports only
  components and Vite's fast refresh keeps working.
*/

/**
 * Opens the focus coach for a pause or a finish.
 *
 * Both take an optional `{ afterConfirm }` for whatever the surface needs to do
 * once the user has decided - closing the popup, moving to Home. The timer
 * action itself is dispatched by the provider, so no caller pauses or finishes
 * anything twice.
 *
 * Without a provider above it - a second React tree, or a view mounted on its
 * own - these still pause and finish, immediately and without asking. The coach
 * is an addition to the timer, so its absence has to cost the question and
 * nothing else. Returning no-ops here would mean a Pause button that does
 * nothing at all, which is a far worse failure than an unasked question.
 */
export function useFocusCoach() {
  const dispatch = useDispatch();
  const coach = useContext(FocusCoachContext);

  const withoutCoach = useMemo(
    () => ({
      openPauseCoach: (options) => {
        dispatch(pauseTimer(Date.now()));
        options?.afterConfirm?.();
      },
      openFinishCoach: (options) => {
        dispatch(finishTimer(Date.now()));
        options?.afterConfirm?.();
      },
    }),
    [dispatch]
  );

  return coach ?? withoutCoach;
}
