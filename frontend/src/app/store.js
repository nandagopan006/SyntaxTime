import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import timerReducer from "../features/timer/timerSlice";
import uiReducer from "../features/ui/uiSlice";

/*
  The single Redux store.

  Each key below becomes a branch of the state tree, so a component reads the
  timer with state.timer and the popup flag with state.ui.
*/
export const store = configureStore({
  reducer: {
    auth: authReducer,
    timer: timerReducer,
    ui: uiReducer,
  },
});
