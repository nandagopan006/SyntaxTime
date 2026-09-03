import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDailyStatistics } from "../../services/studyService";
import { formatStudyMinutes } from "../../utils/formatTime";
import LoadingState from "../ui/LoadingState";

/*
  The shape of a month's study, beside the numbers that summarise it.

  "18h 42m over 18 study days" says how much; this says when. A run of empty
  bars in the middle of a month is the thing worth seeing, and no total can
  show it.

  The daily figures come from the API rather than from the sessions on screen,
  because history arrives a page at a time - adding up what the browser holds
  would chart the first twenty sessions and label it the month.
*/

/** Weekday initials, so a month of bars still has readable labels. */
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** Reads an API date (YYYY-MM-DD) as a local date, not a UTC instant. */
function parseApiDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** The label under each bar, and the reading beside the axis. */
function formatAxisMinutes(minutes) {
  return minutes === 0 ? "0" : formatStudyMinutes(minutes);
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const bar = payload[0].payload;

  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2 text-sm shadow-panel">
      <p className="text-ink">{bar.tooltipLabel}</p>
      <p className="text-ink-muted tabular-nums">
        {formatStudyMinutes(bar.focusedMinutes)}
      </p>
    </div>
  );
}

/**
 * Groups days into calendar weeks, Monday first.
 *
 * A month of daily bars answers "which days did I study"; the same month by
 * week answers "was I steady or was it one heavy weekend". Both are worth
 * having, and neither costs another request - the weeks are folded from the
 * days already fetched.
 */
function groupIntoWeeks(days) {
  const weeks = [];
  let current = null;

  for (const day of days) {
    const date = parseApiDate(day.date);
    // Monday starts a week. getDay() calls Sunday 0, so it is shifted to 6.
    const weekday = (date.getDay() + 6) % 7;

    if (current === null || weekday === 0) {
      current = { start: date, focusedMinutes: 0 };
      weeks.push(current);
    }

    current.focusedMinutes += day.focused_minutes;
  }

  return weeks.map((week) => ({
    label: `${week.start.getDate()} ${week.start.toLocaleDateString(undefined, { month: "short" })}`,
    tooltipLabel: `Week of ${week.start.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`,
    focusedMinutes: week.focusedMinutes,
  }));
}

/** One bar per day, labelled by weekday initial. */
function toDailyBars(days) {
  return days.map((day) => {
    const date = parseApiDate(day.date);

    return {
      label: WEEKDAY_INITIALS[date.getDay()],
      tooltipLabel: date.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      focusedMinutes: day.focused_minutes,
    };
  });
}

/*
  Mounted with a key of the month it draws, so changing month gives a fresh
  component rather than one that has to reset itself. That is why nothing here
  clears its own state when the dates change: there is never a stale month to
  clear. The daily/weekly choice is held by the page above for the same
  reason - it should survive a change of month, and remounting would lose it.
*/
function StudyChart({ startDate, endDate, title, grouping, onGroupingChange }) {
  const [days, setDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      return undefined;
    }

    let isCurrent = true;

    getDailyStatistics({ start_date: startDate, end_date: endDate })
      .then((result) => {
        if (isCurrent) {
          setDays(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setHasFailed(true);
          setIsLoading(false);
        }
      });

    // A slow answer for last month must not overwrite the month now on screen.
    return () => {
      isCurrent = false;
    };
  }, [startDate, endDate]);

  const bars = grouping === "weekly" ? groupIntoWeeks(days) : toDailyBars(days);
  const totalMinutes = days.reduce((total, day) => total + day.focused_minutes, 0);

  if (hasFailed) {
    return (
      <section className="mt-6 border-t border-rule pt-5">
        <p className="text-sm text-burgundy" role="alert">
          Unable to load the chart for {title}.
        </p>
      </section>
    );
  }

  if (isLoading && days.length === 0) {
    return (
      <section className="mt-6 border-t border-rule pt-5">
        <LoadingState label={`Loading the chart for ${title}`} lines={3} />
      </section>
    );
  }

  // An empty month is said in a sentence rather than drawn as a row of nothing.
  if (totalMinutes === 0) {
    return (
      <section className="mt-6 border-t border-rule pt-5">
        <p className="text-sm text-ink-muted">
          No study time recorded in {title}.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 border-t border-rule pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="section-eyebrow">When you studied</p>

        {/* Two readings of the same data, folded in the browser from the days
            already fetched - switching never costs another request. */}
        <div
          className="inline-flex overflow-hidden rounded-md border border-rule"
          role="group"
          aria-label="Group the chart by"
        >
          {[
            ["daily", "Daily"],
            ["weekly", "Weekly"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onGroupingChange(value)}
              aria-pressed={grouping === value}
              className={[
                "px-3 py-1.5 text-sm transition-colors",
                grouping === value
                  ? "bg-brass-wash text-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              interval={0}
              // A month has thirty-one bars; the initials stay readable, but
              // a narrow window is allowed to drop some rather than overlap.
              minTickGap={-8}
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
            <Bar
              dataKey="focusedMinutes"
              fill="var(--color-brass)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The chart is a picture; this is the same data for a screen reader. */}
      <ul className="sr-only">
        {bars.map((bar) => (
          <li key={bar.tooltipLabel}>
            {bar.tooltipLabel}: {formatStudyMinutes(bar.focusedMinutes)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default StudyChart;
