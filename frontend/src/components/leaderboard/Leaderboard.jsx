import { useEffect, useState } from "react";

import { getErrorMessage } from "../../services/api";
import {
  getMonthlyLeaderboard,
  getWeeklyLeaderboard,
} from "../../services/leaderboardService";
import { formatMonthLabel, formatShortDate } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";
import Button from "../ui/Button";
import LoadingState from "../ui/LoadingState";
import LeaderboardEntry from "./LeaderboardEntry";
import LeaderboardPeriodToggle from "./LeaderboardPeriodToggle";

// How many places are shown before the board is folded down. Enough to see
// the top of the table and where you sit in it, without turning a study page
// into a scoreboard.
const VISIBLE_PLACES = 10;

/** Describes the stretch of time being ranked, as "24 Aug - 30 Aug" or "August 2026". */
function getPeriodLabel(period, startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  if (period === "monthly") {
    return formatMonthLabel(startDate);
  }

  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

/*
  How the user and their study friends compare over a week or a month.

  The ranking is worked out by Django and arrives finished, so this component
  only decides how to show it. Nothing here adds any minutes up, which is why
  the number beside a name can never disagree with the server's ordering.

  The board is server data that no other page needs, so it lives in local state
  rather than Redux.
*/
function Leaderboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("weekly");
  // A board only gets long once somebody has a lot of friends, so it starts
  // folded and opens on request rather than paging.
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [errorMessage, setErrorMessage] = useState("");
  // Bumped by Try again, so the effect below runs a second time.
  const [reloadCount, setReloadCount] = useState(0);

  // Runs on first load and whenever the period changes - never on a timer.
  // A leaderboard reflects saved sessions, so there is nothing to poll for.
  useEffect(() => {
    // Stops a slow weekly response from landing after a newer monthly one.
    let isCurrent = true;

    async function loadBoard() {
      setStatus("loading");

      try {
        const data =
          selectedPeriod === "monthly"
            ? await getMonthlyLeaderboard()
            : await getWeeklyLeaderboard();

        if (!isCurrent) {
          return;
        }

        setBoard(data);
        setStatus("ready");
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(getErrorMessage(error, "Unable to load the leaderboard."));
          setStatus("failed");
        }
      }
    }

    loadBoard();

    return () => {
      isCurrent = false;
    };
  }, [selectedPeriod, reloadCount]);

  /** Switches period, and folds the board back down for the new one. */
  function handlePeriodChange(period) {
    setSelectedPeriod(period);
    setIsShowingAll(false);
  }

  const entries = board?.entries ?? [];
  const you = entries.find((entry) => entry.is_current_user);
  // Folding is only about how much is drawn: the ranking itself is the
  // server's, and every place is still counted in it.
  const visibleEntries =
    isShowingAll || entries.length <= VISIBLE_PLACES
      ? entries
      : entries.slice(0, VISIBLE_PLACES);
  const hiddenCount = entries.length - visibleEntries.length;
  const isYourRankHidden =
    Boolean(you) && !visibleEntries.some((entry) => entry.is_current_user);

  const periodLabel = getPeriodLabel(selectedPeriod, board?.startDate, board?.endDate);

  return (
    <section aria-labelledby="leaderboard-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 id="leaderboard-heading" className="section-eyebrow font-sans">
            Study leaderboard
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Focused study time, compared with your friends.
          </p>
        </div>

        <LeaderboardPeriodToggle
          selectedPeriod={selectedPeriod}
          onSelect={handlePeriodChange}
          disabled={status === "loading"}
        />
      </div>

      <div className="mt-4 border-t border-rule pt-5">
        {status === "loading" && (
          <LoadingState label="Loading leaderboard" lines={4} />
        )}

        {status === "failed" && (
          <div role="alert">
            <p className="text-sm text-burgundy">{errorMessage}</p>
            <Button
              variant="secondary"
              onClick={() => setReloadCount((count) => count + 1)}
              className="mt-3"
            >
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && (
          <>
            {/* Where the user stands, before the list they would have to scan
                to work it out for themselves. */}
            {you && (
              <p className="text-sm text-ink-muted">
                You are <span className="text-ink">#{you.rank}</span> of{" "}
                <span className="text-ink tabular-nums">{entries.length}</span> with{" "}
                <span className="text-ink tabular-nums">
                  {formatStudyMinutes(you.focused_minutes)}
                </span>
                {periodLabel && <span className="text-ink-faint"> · {periodLabel}</span>}
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {visibleEntries.map((entry) => (
                <LeaderboardEntry key={entry.user_id} entry={entry} />
              ))}
            </ul>

            {/* Somebody outside the top places still gets their own row, so
                the board never hides the one position they came to see. */}
            {isYourRankHidden && (
              <ul className="mt-2 border-t border-rule pt-2">
                <LeaderboardEntry entry={you} />
              </ul>
            )}

            {hiddenCount > 0 && (
              <Button
                variant="quiet"
                size="sm"
                className="mt-3 -ml-3"
                onClick={() => setIsShowingAll(true)}
              >
                Show all {entries.length}
              </Button>
            )}

            {entries.length === 1 && (
              <p className="mt-4 text-sm text-ink-muted">
                You are the only one here so far. Add friends below to compare
                your focused study time.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default Leaderboard;
