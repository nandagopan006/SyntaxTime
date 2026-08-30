import { getDateGroupLabel } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";
import StudySessionItem from "./StudySessionItem";

/**
 * Splits sessions into consecutive day groups, keeping the order they arrive in.
 *
 * The API already returns them newest first, so walking the list and starting a
 * new group whenever the day label changes is enough - no sorting needed here,
 * and none that could disagree with the server's order.
 */
function groupSessionsByDate(sessions) {
  const groups = [];

  for (const session of sessions) {
    const label = getDateGroupLabel(session.completed_at || session.started_at);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && currentGroup.label === label) {
      currentGroup.sessions.push(session);
    } else {
      groups.push({ label, sessions: [session] });
    }
  }

  // Each day's own total, so a date can be judged without adding up its rows.
  // Safe to do here: a day's sessions all arrive together, because the API
  // returns them in order.
  for (const group of groups) {
    group.focusedMinutes = group.sessions.reduce(
      (total, session) => total + (session.focused_minutes || 0),
      0
    );
  }

  return groups;
}

/*
  The study history, filed under the day each session finished.

  Repeating "29 August 2026" on every row is hard to read; a heading per day
  turns the same information into something the eye can skim.
*/
function StudySessionList({ sessions, selectedId, onSelect }) {
  const groups = groupSessionsByDate(sessions);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          {/* A date reads as a divider rather than a title: the sessions beneath
              it are the content. */}
          <h3 className="flex items-baseline gap-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {group.label}
            <span aria-hidden="true" className="h-px flex-1 self-center bg-rule" />
            <span className="shrink-0 normal-case tracking-normal tabular-nums">
              {group.sessions.length}{" "}
              {group.sessions.length === 1 ? "session" : "sessions"} ·{" "}
              {formatStudyMinutes(group.focusedMinutes)}
            </span>
          </h3>

          <ul className="mt-3 space-y-2">
            {group.sessions.map((session) => (
              <StudySessionItem
                key={session.id}
                session={session}
                isSelected={session.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default StudySessionList;
