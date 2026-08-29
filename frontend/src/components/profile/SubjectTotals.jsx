import { formatStudyMinutes } from "../../utils/formatTime";

// Enough to see where the time goes without listing every subject ever typed.
const VISIBLE_SUBJECTS = 5;

// Subject is optional in SyntaxTime. This is the same label History and the
// dashboard use for time recorded without one.
const NO_SUBJECT_LABEL = "General Study";

/**
 * Trims the list to the busiest few, gathering the rest into one "Other" row.
 *
 * "Other" is the tail of named subjects; it is not the same as General Study,
 * which is time saved without any subject at all.
 */
function summariseSubjects(subjects) {
  const rows = subjects.map((row) => ({
    name: row.subject || NO_SUBJECT_LABEL,
    focusedMinutes: row.focused_minutes,
  }));

  if (rows.length <= VISIBLE_SUBJECTS + 1) {
    return rows;
  }

  const visible = rows.slice(0, VISIBLE_SUBJECTS);
  const remainder = rows.slice(VISIBLE_SUBJECTS);

  return [
    ...visible,
    {
      name: "Other",
      focusedMinutes: remainder.reduce(
        (total, row) => total + row.focusedMinutes,
        0
      ),
    },
  ];
}

/*
  Where the study time has actually gone.

  A list with bars rather than a chart: the numbers are the point, the bars only
  show the shape, and this stays readable at any width without a chart library.
*/
function SubjectTotals({ subjects, mostStudiedSubject }) {
  if (subjects.length === 0) {
    return (
      <section aria-labelledby="subjects-heading">
        <h2
          id="subjects-heading"
          className="text-xs uppercase tracking-[0.15em] text-brass"
        >
          Subjects
        </h2>

        <p className="mt-4 border-t border-rule pt-5 text-sm text-ink-muted">
          No subject data yet. Record a session with a subject and it will
          appear here.
        </p>
      </section>
    );
  }

  const rows = summariseSubjects(subjects);
  // The longest bar sets the scale, so the rows compare against each other
  // rather than against an invisible maximum.
  const largestMinutes = Math.max(...rows.map((row) => row.focusedMinutes), 1);

  return (
    <section aria-labelledby="subjects-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="subjects-heading"
          className="text-xs uppercase tracking-[0.15em] text-brass"
        >
          Subjects
        </h2>

        {mostStudiedSubject && (
          <p className="text-sm text-ink-muted">
            Most studied: <span className="text-ink">{mostStudiedSubject}</span>
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-4 border-t border-rule pt-5">
        {rows.map((row) => (
          <li key={row.name}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate text-ink">{row.name}</span>
              <span className="shrink-0 text-ink-muted tabular-nums">
                {formatStudyMinutes(row.focusedMinutes)}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="mt-1.5 h-1.5 overflow-hidden rounded bg-surface-sunken"
            >
              <div
                className="h-full bg-brass-soft"
                style={{
                  width: `${(row.focusedMinutes / largestMinutes) * 100}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SubjectTotals;
