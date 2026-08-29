import { useEffect } from "react";
import { useDispatch } from "react-redux";

import DashboardHero from "../components/dashboard/DashboardHero";
import LeaderboardPreview from "../components/dashboard/LeaderboardPreview";
import RecentSessions from "../components/dashboard/RecentSessions";
import SubjectBreakdown from "../components/dashboard/SubjectBreakdown";
import TodayFocusStat from "../components/dashboard/TodayFocusStat";
import WeeklyStudyChart from "../components/dashboard/WeeklyStudyChart";
import FocusTimer from "../components/timer/FocusTimer";
import {
  fetchRecentSessions,
  fetchWeeklyStatistics,
} from "../features/statistics/statisticsSlice";

/*
  The study dashboard.

  Home composes the sections and asks for the data they need; each section
  reads it from Redux and decides how to draw itself. Today's totals are
  already loaded by AppShell, because the popup and Focus Mode need them on
  every page, so only the two dashboard-only requests are made here.
*/
function Home() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchWeeklyStatistics());
    dispatch(fetchRecentSessions());
  }, [dispatch]);

  return (
    <div className="space-y-8">
      <DashboardHero />

      {/* The timer is the reason to be here, so it gets the wider column and
          sits above everything that only reports on it. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <FocusTimer />
        <TodayFocusStat />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <WeeklyStudyChart />
        <SubjectBreakdown />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <RecentSessions />
        <LeaderboardPreview />
      </div>
    </div>
  );
}

export default Home;
