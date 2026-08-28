import { useState } from "react";

const PRESET_MINUTES = [25, 50, 90];

/**
 * Chooses the focus length. This is the only required input before starting,
 * which is why it sits above the optional subject and topic fields.
 */
function DurationSelector({ selectedMinutes, onSelect, disabled }) {
  const [customMinutes, setCustomMinutes] = useState("");

  const isCustomSelected =
    selectedMinutes > 0 && !PRESET_MINUTES.includes(selectedMinutes);

  function handleCustomChange(event) {
    const value = event.target.value;
    setCustomMinutes(value);

    const minutes = Number(value);
    if (minutes > 0) {
      onSelect(minutes);
    }
  }

  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium text-ink-muted mb-2">Focus time</legend>

      <div className="flex flex-wrap items-center gap-2">
        {PRESET_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onSelect(minutes)}
            aria-pressed={selectedMinutes === minutes}
            className={[
              "rounded border px-4 py-2 text-sm",
              selectedMinutes === minutes
                ? "border-brass bg-surface-sunken text-ink font-medium"
                : "border-rule text-ink-muted hover:text-ink hover:bg-surface-sunken/60",
              "disabled:opacity-50",
            ].join(" ")}
          >
            {minutes} min
          </button>
        ))}

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="sr-only">Custom focus length in minutes</span>
          <input
            type="number"
            min="1"
            max="600"
            value={customMinutes}
            onChange={handleCustomChange}
            placeholder="Custom"
            className={[
              "w-24 rounded border px-3 py-2 text-sm",
              isCustomSelected ? "border-brass bg-surface-sunken" : "border-rule",
              "disabled:opacity-50",
            ].join(" ")}
          />
          min
        </label>
      </div>
    </fieldset>
  );
}

export default DurationSelector;
