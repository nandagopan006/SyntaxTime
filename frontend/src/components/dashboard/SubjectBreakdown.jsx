import { useSelector } from "react-redux";

import { formatStudyMinutes } from "../../utils/formatTime";
import { NO_SUBJECT_LABEL } from "../../utils/studySession";
import DashboardSection from "./DashboardSection";



/*
  How today's focused time was split between subjects.

  Only saved sessions are counted. The session running right now is not added
  here, because nothing about it is recorded yet - the subject can still be
  changed on the completion form before it is saved.
*/
function SubjectBreakdown() {
  const { subjects, isLoading, hasFailed } = useSelector((state) => state.statistics);

  if (hasFailed) {
    return (
      <DashboardSection title="Subjects today">
        <p className="text-sm text-burgundy" role="alert">
          Unable to load your subject breakdown.
        </p>
      </DashboardSection>
    );
  }

  if (isLoading && subjects.length === 0) {
    return (
      <DashboardSection title="Subjects today">
        <p className="text-sm text-ink-faint">Loading subjects...</p>
      </DashboardSection>
    );
  }

  if (subjects.length === 0) {
    return (
      <DashboardSection title="Subjects today">
        <p className="text-sm text-ink-muted">
          Subject data will appear after a session is recorded.
        </p>
      </DashboardSection>
    );
  }

  // The largest subject sets the width of every bar, so the rows compare
  // against each other rather than against an invisible maximum.
  const largestMinutes = subjects[0].focused_minutes;

  return (
    <DashboardSection title="Subjects today">
      <ul className="space-y-3">
        {subjects.map((subject) => {
          const name = subject.subject || NO_SUBJECT_LABEL;
          const widthPercent =
            largestMinutes > 0 ? (subject.focused_minutes / largestMinutes) * 100 : 0;

          return (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">{name}</span>
                <span className="text-ink-muted tabular-nums">
                  {formatStudyMinutes(subject.focused_minutes)}
                </span>
              </div>

              <div
                aria-hidden="true"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
              >
                <div
                  className="h-full rounded-full bg-brass-soft"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}

export default SubjectBreakdown;
