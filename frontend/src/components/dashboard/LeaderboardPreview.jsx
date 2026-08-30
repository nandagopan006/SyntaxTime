import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../services/api";
import { getWeeklyLeaderboard } from "../../services/leaderboardService";
import { formatStudyMinutes } from "../../utils/formatTime";
import DashboardSection from "./DashboardSection";

// Enough to see who is ahead without turning Home into the Friends page.
const PREVIEW_SIZE = 3;

/*
  A glance at this week's friend leaderboard.

  The full board, with the monthly view, lives on Friends. This shows the top
  few and where the user stands, using the same endpoint, so the two can never
  tell different stories.
*/
function LeaderboardPreview() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadPreview() {
      try {
        const board = await getWeeklyLeaderboard();
        if (!isCurrent) {
          return;
        }
        setEntries(board.entries);
        setStatus("ready");
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(getErrorMessage(error, "Unable to load the leaderboard."));
          setStatus("failed");
        }
      }
    }

    loadPreview();

    return () => {
      isCurrent = false;
    };
  }, []);

  const you = entries.find((entry) => entry.is_current_user);
  const topEntries = entries.slice(0, PREVIEW_SIZE);

  // Shown under the top few when the user is further down, so they can always
  // see their own position without opening the full board.
  const showYouSeparately = you && you.rank > PREVIEW_SIZE;

  const friendsLink = (
    <Link
      to="/friends"
      className="rounded-md px-2 py-1 text-sm text-brass transition-colors hover:bg-brass-wash"
    >
      Full board
    </Link>
  );

  if (status === "loading") {
    return (
      <DashboardSection title="This week together">
        <p className="text-sm text-ink-faint">Loading leaderboard...</p>
      </DashboardSection>
    );
  }

  if (status === "failed") {
    return (
      <DashboardSection title="This week together">
        <p className="text-sm text-burgundy" role="alert">
          {errorMessage}
        </p>
      </DashboardSection>
    );
  }

  // Alone on the board means no accepted friends yet. Saying so is better than
  // showing a ranking of one.
  if (entries.length <= 1) {
    return (
      <DashboardSection title="This week together">
        <p className="text-sm text-ink-muted">
          Add friends to compare your focused study time.
        </p>

        <Link
          to="/friends"
          className="mt-4 inline-flex items-center rounded-md border border-rule bg-surface-raised px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-rule-strong hover:bg-surface-sunken hover:text-ink"
        >
          Go to Friends
        </Link>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="This week together" action={friendsLink}>
      <ol className="space-y-2">
        {topEntries.map((entry) => (
          <PreviewRow key={entry.user_id} entry={entry} />
        ))}
      </ol>

      {showYouSeparately && (
        <ol className="mt-2 border-t border-rule pt-2">
          <PreviewRow entry={you} />
        </ol>
      )}
    </DashboardSection>
  );
}

/** One compact line of the preview: position, name, focused time. */
function PreviewRow({ entry }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="min-w-0 truncate">
        <span className="text-ink-faint tabular-nums">{entry.rank}.</span>{" "}
        <span className={entry.is_current_user ? "text-ink font-medium" : "text-ink"}>
          {entry.username}
        </span>
        {entry.is_current_user && (
          <span className="ml-2 text-xs uppercase tracking-[0.15em] text-brass">
            You
          </span>
        )}
      </span>

      <span className="shrink-0 text-ink-muted tabular-nums">
        {formatStudyMinutes(entry.focused_minutes)}
      </span>
    </li>
  );
}

export default LeaderboardPreview;
