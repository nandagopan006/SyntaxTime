import { toApiDate } from "./formatDate";

/*
  Turning the History page's filters into API query parameters.

  Kept here rather than inside the page so the buttons and the request agree on
  what "This week" means, and so the date arithmetic is in one readable place.
*/

// The order these appear in is the order the buttons are drawn.
export const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

export const DEFAULT_FILTERS = {
  subject: "",
  dateRange: "all",
  startDate: "",
  endDate: "",
};

/** Returns the first and last day a named range covers, as Date objects. */
function getRangeDates(dateRange) {
  const today = new Date();

  if (dateRange === "today") {
    return { from: today, to: today };
  }

  if (dateRange === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { from: yesterday, to: yesterday };
  }

  if (dateRange === "week") {
    // getDay() calls Sunday 0, but a study week starts on Monday.
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: monday, to: today };
  }

  if (dateRange === "month") {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstOfMonth, to: today };
  }

  return null;
}

/**
 * Builds the query parameters for one history request.
 *
 * Empty filters are left out entirely rather than sent as blank values, so the
 * backend only applies the filters the user actually chose.
 */
export function buildHistoryParams(filters, search) {
  const params = {};

  if (search.trim()) {
    params.search = search.trim();
  }

  if (filters.subject) {
    params.subject = filters.subject;
  }

  if (filters.dateRange === "custom") {
    // Either end of a custom range can be left blank, which reads naturally as
    // "everything before" or "everything since".
    if (filters.startDate) {
      params.start_date = filters.startDate;
    }
    if (filters.endDate) {
      params.end_date = filters.endDate;
    }
    return params;
  }

  const range = getRangeDates(filters.dateRange);
  if (range) {
    params.start_date = toApiDate(range.from);
    params.end_date = toApiDate(range.to);
  }

  return params;
}
