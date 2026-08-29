import { Pencil } from "lucide-react";

import { formatFullDate, formatSessionTime } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";

/** One label-and-value row in the detail panel. */
function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/*
  Everything recorded about one study session.

  This is the page's whole point: the full note is here, not truncated, because
  what the user wrote down is the part worth coming back for.
*/
function SessionDetails({ session, onEdit }) {
  const finishedAt = session.completed_at || session.started_at;

  return (
    <div>
      <h2 className="font-display text-2xl text-ink">
        {session.subject || "General Study"}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {session.topic || "No topic added"}
      </p>

      <dl className="mt-6 border-t border-rule pt-4 text-sm">
        <DetailRow
          label="Focused"
          value={formatStudyMinutes(session.focused_minutes)}
        />
        <DetailRow
          label="Planned"
          value={formatStudyMinutes(session.planned_minutes)}
        />
        <DetailRow label="Date" value={formatFullDate(finishedAt)} />
        <DetailRow label="Started" value={formatSessionTime(session.started_at)} />
        <DetailRow
          label="Finished"
          value={formatSessionTime(session.completed_at)}
        />
      </dl>

      <div className="mt-6 border-t border-rule pt-4">
        <h3 className="text-xs uppercase tracking-[0.15em] text-brass">
          What you learned
        </h3>

        {session.notes ? (
          // whitespace-pre-line keeps the paragraphs the user typed.
          <p className="mt-3 whitespace-pre-line text-sm text-ink">
            {session.notes}
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">
            Nothing written down for this session yet. You can add it now.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="mt-6 flex items-center gap-2 rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
      >
        <Pencil size={16} aria-hidden="true" />
        Edit details
      </button>
    </div>
  );
}

export default SessionDetails;
