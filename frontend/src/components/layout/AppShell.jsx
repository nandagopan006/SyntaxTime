import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";

import { fetchTodayStatistics } from "../../features/statistics/statisticsSlice";
import { useTimer } from "../../hooks/useTimer";
import FocusMode from "../timer/FocusMode";
import FocusTimerPopup from "../timer/FocusTimerPopup";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/*
  The frame every signed-in page sits inside.

  Sidebar and TopBar are rendered once here rather than by each page, so they
  stay mounted while React Router swaps the page shown in <Outlet />.
*/
function AppShell() {
  // Driven here, once, so the countdown keeps running while the user moves
  // between pages and no second interval can ever be created.
  useTimer();

  const dispatch = useDispatch();
  const isFocusPopupOpen = useSelector((state) => state.ui.isFocusPopupOpen);
  const isFocusModeActive = useSelector((state) => state.ui.isFocusModeActive);

  // Loaded once here rather than in Home, so today's total is already
  // available to the compact popup and to Focus Mode.
  useEffect(() => {
    dispatch(fetchTodayStatistics());
  }, [dispatch]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Rendered by the shell rather than a page, so it floats above the
          application and survives moving between routes. */}
      {isFocusPopupOpen && <FocusTimerPopup />}

      {/* Covers the whole application, including the popup above. It is only
          another view of the same timer, so mounting and unmounting it here
          leaves the running session completely untouched. */}
      {isFocusModeActive && <FocusMode />}
    </div>
  );
}

export default AppShell;
