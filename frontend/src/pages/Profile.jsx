import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileStats from "../components/profile/ProfileStats";
import SubjectTotals from "../components/profile/SubjectTotals";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";
import { getProfileStatistics } from "../services/profileService";

/*
  The personal study overview.

  Home answers "how am I doing today?", History answers "what did I study?",
  and the leaderboard answers "how do I compare?". This page answers the
  remaining question: what does the whole journey look like.

  Everything shown here is saved history from the database. The timer running
  in Redux right now is deliberately not part of it - those minutes join the
  overview once the session is finished and saved, not before.

  The statistics are server data no other page needs, so they live in local
  state rather than a Redux slice.
*/
function Profile() {
  const { user } = useAuth();

  const [statistics, setStatistics] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [errorMessage, setErrorMessage] = useState("");
  // Bumped by Try again, so the effect below runs a second time.
  const [reloadCount, setReloadCount] = useState(0);

  // Loaded when the page opens, and on retry. Never on a timer: this is a
  // record of what has already happened.
  useEffect(() => {
    let isCurrent = true;

    async function loadStatistics() {
      setStatus("loading");

      try {
        const profile = await getProfileStatistics();
        if (!isCurrent) {
          return;
        }
        setStatistics(profile);
        setStatus("ready");
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(
            getErrorMessage(error, "Unable to load your study overview.")
          );
          setStatus("failed");
        }
      }
    }

    loadStatistics();

    return () => {
      isCurrent = false;
    };
  }, [reloadCount]);

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <header className="border-b border-rule pb-6">
          <h1 className="font-display text-3xl text-ink">{user.username}</h1>
          <p className="mt-1 text-sm text-ink-muted">Your study journey so far</p>
        </header>

        <p className="text-sm text-ink-faint">Loading your study overview...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="space-y-8">
        <header className="border-b border-rule pb-6">
          <h1 className="font-display text-3xl text-ink">{user.username}</h1>
        </header>

        <div role="alert">
          <p className="text-sm text-burgundy">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-3 rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // A brand new account is not an error. It gets the same page, with the
  // figures honestly at zero, and somewhere to start.
  const hasStudied = statistics.totalSessions > 0;

  return (
    <div className="space-y-8">
      <ProfileHeader
        username={user.username}
        totalFocusedMinutes={statistics.totalFocusedMinutes}
      />

      <ProfileStats statistics={statistics} />

      <div className="border-t border-rule pt-6">
        <SubjectTotals
          subjects={statistics.subjects}
          mostStudiedSubject={statistics.mostStudiedSubject}
        />
      </div>

      {!hasStudied && (
        <div className="border-t border-rule pt-6">
          <p className="text-sm text-ink-muted">
            No study data yet. Your first finished session starts the record.
          </p>

          <Link
            to="/"
            className="mt-4 inline-block rounded bg-ink px-5 py-2.5 text-sm text-parchment focus-visible:outline-2 focus-visible:outline-brass"
          >
            Start studying
          </Link>
        </div>
      )}
    </div>
  );
}

export default Profile;
