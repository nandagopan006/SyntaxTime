import { configureStore } from "@reduxjs/toolkit";

import statisticsReducer from "../features/statistics/statisticsSlice";
import timerReducer from "../features/timer/timerSlice";
import uiReducer from "../features/ui/uiSlice";

/*
  The single Redux store.

  Each key below becomes a branch of the state tree, so a component reads the
  timer with state.timer and the popup flag with state.ui.

  Authentication is deliberately not here. AuthContext owns the signed-in user,
  and a second copy in the store would be one more place for the answer to
  "is somebody signed in" to be wrong.
*/
export const store = configureStore({
  reducer: {
    statistics: statisticsReducer,
    timer: timerReducer,
    ui: uiReducer,
  },
});
