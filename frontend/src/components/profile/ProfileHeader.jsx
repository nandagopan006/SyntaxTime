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
        <h1 className="text-3xl text-ink">{username}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Your study journey so far</p>
      </div>

      <div className="text-left sm:text-right">
        <p className="section-eyebrow">Total focused</p>
        <p className="mt-1 text-4xl leading-none text-ink tabular-nums font-display">
          {formatStudyMinutes(totalFocusedMinutes)}
        </p>
      </div>
    </header>
  );
}

export default ProfileHeader;
