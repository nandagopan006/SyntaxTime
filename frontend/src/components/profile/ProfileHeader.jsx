import { formatStudyMinutes } from "../../utils/formatTime";

/*
  Who this study record belongs to, and the one number that sums it up.

  Compact on purpose. The profile is a ledger, not a hero banner, so the
  statistics below it should be visible without scrolling.
*/
function ProfileHeader({ username, totalFocusedMinutes }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div>
        <h1 className="font-display text-3xl text-ink">{username}</h1>
        <p className="mt-1 text-sm text-ink-muted">Your study journey so far</p>
      </div>

      <div className="text-left sm:text-right">
        <p className="text-xs uppercase tracking-[0.15em] text-brass">
          Total focused
        </p>
        <p className="mt-1 font-display text-4xl text-ink tabular-nums">
          {formatStudyMinutes(totalFocusedMinutes)}
        </p>
      </div>
    </header>
  );
}

export default ProfileHeader;
