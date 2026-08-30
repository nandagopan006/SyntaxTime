import { toApiDate } from "./formatDate";

/*
  Turning the History page's month and filters into API query parameters.

  History is an archive rather than a feed, so the month is the main way
  through it: a year of study is twelve short pages instead of one endless
  scroll. Kept here rather than inside the page so the navigator and the
  request always agree on which days a month covers.
*/

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The month containing today, as the archive's starting point. */
export function getCurrentMonth() {
  const today = new Date();

  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export const DEFAULT_FILTERS = {
  subject: "",
  ...getCurrentMonth(),
};

/** Reads a month as "August 2026". */
export function formatMonthLabel({ year, month }) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** The month before this one, rolling back into December of the previous year. */
export function getPreviousMonth({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** The month after this one, rolling forward into January of the next year. */
export function getNextMonth({ year, month }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** True when the month is this one or a later one. Nothing has been studied yet in those. */
export function isCurrentOrFutureMonth({ year, month }) {
  const current = getCurrentMonth();

  return year > current.year || (year === current.year && month >= current.month);
}

/**
 * The first and last calendar day of a month.
 *
 * Day 0 of the following month is the last day of this one, which gets the
 * length of every month right without a table of them.
 */
export function getMonthRange({ year, month }) {
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0),
  };
}

/**
 * Builds the query parameters for one history request.
 *
 * Empty filters are left out entirely rather than sent as blank values, so the
 * backend only applies the filters the user actually chose. The same
 * parameters are used for the summary, so the totals always describe exactly
 * the sessions being listed.
 */
export function buildHistoryParams(filters, search) {
  const params = {};

  if (search.trim()) {
    params.search = search.trim();
  }

  if (filters.subject) {
    params.subject = filters.subject;
  }

  const range = getMonthRange(filters);
  params.start_date = toApiDate(range.from);
  params.end_date = toApiDate(range.to);

  return params;
}

/**
 * The years worth offering, newest first.
 *
 * Built from the user's own history rather than a fixed span, so somebody who
 * started in March is not asked to choose between decades.
 */
export function getSelectableYears(earliestYear) {
  const currentYear = getCurrentMonth().year;
  const firstYear = Math.min(earliestYear || currentYear, currentYear);
  const years = [];

  for (let year = currentYear; year >= firstYear; year -= 1) {
    years.push(year);
  }

  return years;
}
