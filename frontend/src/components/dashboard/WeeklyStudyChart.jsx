import { useDispatch, useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchWeeklyStatistics,
  selectActiveSessionMinutes,
} from "../../features/statistics/statisticsSlice";
import { formatWeekdayLabel, isToday } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";
import LoadingState from "../ui/LoadingState";
import Button from "../ui/Button";
import DashboardSection from "./DashboardSection";

/** Draws the label under each bar, and the reading beside the axis. */
function formatAxisMinutes(minutes) {
  return minutes === 0 ? "0" : formatStudyMinutes(minutes);
}

/** The small panel shown when a bar is hovered or focused. */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const day = payload[0].payload;

  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2 text-sm shadow-panel">
      <p className="text-ink">{day.label}</p>
      <p className="text-ink-muted tabular-nums">
        {formatStudyMinutes(day.focusedMinutes)}
      </p>
    </div>
  );
}

/*
  Focused study time for each day of the current week.

  The seven days come from the API. Today's bar has the running session added
  to it, using the same active-session value the Today panel reads, so the
  chart never counts anything for itself.
*/
function WeeklyStudyChart() {
  const dispatch = useDispatch();
  const { weeklyDays, isWeeklyLoading, hasWeeklyFailed } = useSelector(
    (state) => state.statistics
  );
  const activeMinutes = useSelector(selectActiveSessionMinutes);

  const days = weeklyDays.map((day) => ({
    label: formatWeekdayLabel(day.date),
    isToday: isToday(day.date),
    focusedMinutes: isToday(day.date)
      ? day.focused_minutes + activeMinutes
      : day.focused_minutes,
  }));

  const weekTotalMinutes = days.reduce((total, day) => total + day.focusedMinutes, 0);

  if (hasWeeklyFailed) {
    return (
      <DashboardSection title="This week">
        <p className="text-sm text-burgundy" role="alert">
          Unable to load this week&apos;s study time.
        </p>
        <Button
          variant="secondary"
          onClick={() => dispatch(fetchWeeklyStatistics())}
          className="mt-3"
        >
          Try again
        </Button>
      </DashboardSection>
    );
  }

  if (isWeeklyLoading && days.length === 0) {
    return (
      <DashboardSection title="This week">
        <LoadingState label="Loading this week" lines={4} />
      </DashboardSection>
    );
  }

  if (weekTotalMinutes === 0) {
    return (
      <DashboardSection title="This week">
        <p className="text-sm text-ink-muted">
          No study data for this week yet. Your first session will appear here.
        </p>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="This week">
      <p className="text-sm text-ink-muted">
        Focused{" "}
        <span className="text-ink tabular-nums">
          {formatStudyMinutes(weekTotalMinutes)}
        </span>{" "}
        so far this week.
      </p>

      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-rule)"
              strokeDasharray="2 5"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--color-rule)" }}
              tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisMinutes}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--color-surface-sunken)" }}
            />
            {/* Animation is switched off deliberately: the bar for today grows
                as the session runs, and a chart that replays itself every
                minute would pull attention away from studying. */}
            <Bar dataKey="focusedMinutes" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {days.map((day) => (
                <Cell
                  key={day.label}
                  fill={
                    day.isToday ? "var(--color-brass)" : "var(--color-brass-soft)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The same figures in words, so the week can be read without seeing
          the chart. */}
      <ul className="sr-only">
        {days.map((day) => (
          <li key={day.label}>
            {day.label}: {formatStudyMinutes(day.focusedMinutes)}
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}

export default WeeklyStudyChart;
