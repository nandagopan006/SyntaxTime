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
    <div className="space-y-6">
      <DashboardHero />

      {/* The timer is the reason to be here, so it gets the wider column and
          sits above everything that only reports on it. */}
      {/* The timer and today's figures sit side by side, so the two questions
          a returning user has are answered in one screenful. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <FocusTimer />
        <TodayFocusStat />
      </div>

      {/* Everything below the timer reports on it, so it is set apart by a
          rule and given a slower rhythm of its own. */}
      <div className="space-y-10 border-t border-rule pt-8">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WeeklyStudyChart />
          <SubjectBreakdown />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <RecentSessions />
          <LeaderboardPreview />
        </div>
      </div>
    </div>
  );
}

export default Home;
