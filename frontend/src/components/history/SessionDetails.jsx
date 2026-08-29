import { Pencil } from "lucide-react";

import { formatFullDate, formatSessionTime } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";
import { NO_SUBJECT_LABEL, NO_TOPIC_LABEL } from "../../utils/studySession";
import Button from "../ui/Button";

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
      <h2 className="text-2xl text-ink break-words">
        {session.subject || NO_SUBJECT_LABEL}
      </h2>
      <p className="mt-1 text-sm text-ink-muted break-words">
        {session.topic || NO_TOPIC_LABEL}
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
        <h3 className="section-eyebrow font-sans">What you learned</h3>

        {session.notes ? (
          // whitespace-pre-line keeps the paragraphs the user typed.
          <p className="mt-3 whitespace-pre-line break-words text-sm text-ink">
            {session.notes}
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-faint">
            Nothing written down for this session yet. You can add it now.
          </p>
        )}
      </div>

      <Button variant="secondary" onClick={onEdit} className="mt-6">
        <Pencil size={15} aria-hidden="true" />
        Edit details
      </Button>
    </div>
  );
}

export default SessionDetails;
