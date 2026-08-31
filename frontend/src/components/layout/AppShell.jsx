import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";

import { fetchTodayStatistics } from "../../features/statistics/statisticsSlice";
import { useFocusWindowBridge } from "../../hooks/useFocusWindowBridge";
import { useSessionNotifications } from "../../hooks/useSessionNotifications";
import { useTimer } from "../../hooks/useTimer";
import { useTimerPersistence } from "../../hooks/useTimerPersistence";
import { useTimerShortcuts } from "../../hooks/useTimerShortcuts";
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
  // Space pauses and resumes wherever the user happens to be looking.
  useTimerShortcuts();
  // Beside useTimer on purpose: the window that counts the session is the
  // window that answers the focus window's buttons. Does nothing in a browser.
  useFocusWindowBridge();
  // And the window that counts the session is the one that remembers it, so a
  // session survives closing the application.
  useTimerPersistence();
  // Mounted here too, so one ending produces one notification however many
  // views of the timer are open.
  useSessionNotifications();

  const dispatch = useDispatch();
  const isFocusPopupOpen = useSelector((state) => state.ui.isFocusPopupOpen);
  const isFocusModeActive = useSelector((state) => state.ui.isFocusModeActive);

  // Loaded once here rather than in Home, so today's total is already
  // available to the compact popup and to Focus Mode.
  useEffect(() => {
    dispatch(fetchTodayStatistics());
  }, [dispatch]);

  return (
    // h-full, not h-screen: the height comes down the chain from html, so the
    // shell is always exactly as tall as the window really is.
    <div className="flex h-full overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/*
          The one scrolling region in the application, and deliberately
          `relative`.

          Without a position, this element is not a containing block, so an
          absolutely positioned descendant with no positioned ancestor of its
          own resolves against the document instead. Its overflow then escapes
          this scroller entirely and stretches the page, which puts a second
          scrollbar on the window and a band of dead space under the whole
          application. The screen-reader list beside the weekly chart is one
          such element.

          Capped in width, because a study page stretched across a wide
          monitor is harder to read, not easier.
        */}
        <main className="relative flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
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
