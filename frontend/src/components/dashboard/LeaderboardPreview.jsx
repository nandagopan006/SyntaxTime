import { Link } from "react-router-dom";

import DashboardSection from "./DashboardSection";

/*
  Where the weekly friend leaderboard will sit.

  Friends and the leaderboard have no backend yet, so this says so plainly.
  Inventing names and hours here would be the one thing a study tracker must
  never do: show the user numbers that are not theirs and are not true.
*/
function LeaderboardPreview() {
  return (
    <DashboardSection title="Weekly leaderboard">
      <p className="text-sm text-ink-muted">
        Add friends to compare study time. The leaderboard will appear here once
        friends are available.
      </p>

      <Link
        to="/friends"
        className="mt-4 inline-block rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
      >
        Go to Friends
      </Link>
    </DashboardSection>
  );
}

export default LeaderboardPreview;
