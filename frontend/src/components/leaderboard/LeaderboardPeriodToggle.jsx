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
            "rounded border px-4 py-2 text-sm disabled:opacity-50",
            "focus-visible:outline-2 focus-visible:outline-brass",
            selectedPeriod === period.value
              ? "border-brass bg-surface-sunken text-ink font-medium"
              : "border-rule text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

export default LeaderboardPeriodToggle;
