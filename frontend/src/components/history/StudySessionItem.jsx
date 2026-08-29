import { formatSessionTime } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";

/*
  One session in the history list.

  It is a button rather than a div, so the whole row can be reached and opened
  with the keyboard, and the browser gives it a focus ring for free.
*/
function StudySessionItem({ session, isSelected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(session)}
        aria-current={isSelected ? "true" : undefined}
        className={[
          "w-full rounded-md border px-4 py-3 text-left transition-colors",
          isSelected
            ? "border-brass bg-brass-wash shadow-card"
            : "border-rule bg-surface-raised hover:border-rule-strong hover:bg-surface-sunken/50",
        ].join(" ")}
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            {/* Subject and topic were optional when the session started, so
                each falls back to wording that reads as an answer rather than
                a missing value. */}
            <p className="truncate text-base font-medium text-ink">
              {session.subject || "General Study"}
            </p>
            <p className="truncate text-sm text-ink-muted">
              {session.topic || "No topic added"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm text-ink tabular-nums">
              {formatStudyMinutes(session.focused_minutes)}
            </p>
            <p className="text-sm text-ink-faint tabular-nums">
              {formatSessionTime(session.completed_at || session.started_at)}
            </p>
          </div>
        </div>

        {/* A preview only. The full note lives in the detail panel, so a long
            entry cannot push the next session off the screen. */}
        {session.notes && (
          <p className="mt-2 line-clamp-2 border-t border-rule pt-2 text-sm text-ink-muted italic">
            {session.notes}
          </p>
        )}
      </button>
    </li>
  );
}

export default StudySessionItem;
