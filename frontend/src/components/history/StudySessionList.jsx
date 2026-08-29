import { getDateGroupLabel } from "../../utils/formatDate";
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
          <h3 className="text-xs uppercase tracking-[0.15em] text-brass">
            {group.label}
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
