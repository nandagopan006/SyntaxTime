import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  MONTH_NAMES,
  formatMonthLabel,
  getCurrentMonth,
  getNextMonth,
  getPreviousMonth,
  getSelectableYears,
  isCurrentOrFutureMonth,
} from "../../utils/historyFilters";

/*
  Moving through the archive a month at a time.

  Arrows for the common case - looking at the month before this one - and two
  selects for jumping further back, so reaching last March is two clicks rather
  than five presses of an arrow.
*/

/**
 * Chooses which month of history is shown.
 *
 * Holds no state: the selected month lives on the History page, so the
 * navigator and the request being made can never disagree.
 */
function MonthNavigator({ month, earliestYear, onChange }) {
  // There is no study history in a month that has not happened, and offering
  // it would only produce an empty page.
  const nextMonth = getNextMonth(month);
  const canGoForward = !isCurrentOrFutureMonth(nextMonth) || false;
  const isViewingCurrentMonth = isCurrentOrFutureMonth(month);

  const arrowClasses =
    "flex h-9 w-9 items-center justify-center rounded-md border border-rule " +
    "bg-surface-raised text-ink-muted transition-colors " +
    "hover:border-rule-strong hover:bg-surface-sunken hover:text-ink " +
    "disabled:cursor-not-allowed disabled:opacity-35 " +
    "disabled:hover:border-rule disabled:hover:bg-surface-raised disabled:hover:text-ink-muted";

  return (
    <section aria-label="Choose a month" className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(getPreviousMonth(month))}
        aria-label="Previous month"
        className={arrowClasses}
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </button>

      <p className="min-w-[9.5rem] text-center text-xl text-ink font-display">
        {formatMonthLabel(month)}
      </p>

      <button
        type="button"
        onClick={() => onChange(nextMonth)}
        disabled={!canGoForward}
        aria-label="Next month"
        className={arrowClasses}
      >
        <ChevronRight size={17} aria-hidden="true" />
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="history-month">
          Month
        </label>
        <select
          id="history-month"
          value={month.month}
          onChange={(event) =>
            onChange({ ...month, month: Number(event.target.value) })
          }
          className="field-control w-auto"
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="history-year">
          Year
        </label>
        <select
          id="history-year"
          value={month.year}
          onChange={(event) =>
            onChange({ ...month, year: Number(event.target.value) })
          }
          className="field-control w-auto"
        >
          {getSelectableYears(earliestYear).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {!isViewingCurrentMonth && (
          <button
            type="button"
            onClick={() => onChange(getCurrentMonth())}
            className="rounded-md px-3 py-1.5 text-sm text-brass transition-colors hover:bg-brass-wash"
          >
            Today
          </button>
        )}
      </div>
    </section>
  );
}

export default MonthNavigator;
