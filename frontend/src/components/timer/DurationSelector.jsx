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
      <legend className="mb-2 text-sm font-medium text-ink-muted">
        Focus time
      </legend>

      <div className="flex flex-wrap items-center gap-2">
        {PRESET_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onSelect(minutes)}
            aria-pressed={selectedMinutes === minutes}
            className={[
              "rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-50",
              selectedMinutes === minutes
                ? "border-brass bg-brass-wash font-medium text-ink"
                : "border-rule bg-surface-raised text-ink-muted hover:border-rule-strong hover:text-ink",
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
              "field-control w-24",
              isCustomSelected ? "border-brass bg-brass-wash" : "",
            ].join(" ")}
          />
          min
        </label>
      </div>
    </fieldset>
  );
}

export default DurationSelector;
