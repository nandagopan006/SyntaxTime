import { Outlet } from "react-router-dom";

import { useTimer } from "../../hooks/useTimer";

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

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
