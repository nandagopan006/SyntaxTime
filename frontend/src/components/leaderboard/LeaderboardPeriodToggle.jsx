const PERIODS = [
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
];

/*
  Choosing which stretch of time the ranking covers.

  Two buttons rather than a dropdown, because there are only ever two answers
  and both should be one click away.
*/
function LeaderboardPeriodToggle({ selectedPeriod, onSelect, disabled }) {
  return (
    <div
      role="group"
      aria-label="Leaderboard period"
      className="flex flex-wrap gap-2"
    >
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onSelect(period.value)}
          disabled={disabled}
          // aria-pressed, not colour alone, is what tells a screen reader
          // which period is showing.
          aria-pressed={selectedPeriod === period.value}
          className={[
            "rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-50",
            selectedPeriod === period.value
              ? "border-brass bg-brass-wash font-medium text-ink"
              : "border-rule bg-surface-raised text-ink-muted hover:border-rule-strong hover:text-ink",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

export default LeaderboardPeriodToggle;
