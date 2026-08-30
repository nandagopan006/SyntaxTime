import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchTodayStatistics } from "../../features/statistics/statisticsSlice";
import { getErrorMessage } from "../../services/api";
import { updateTodayGoal } from "../../services/studyService";
import { calculateProgressPercent, formatStudyMinutes } from "../../utils/formatTime";
import Button from "../ui/Button";

/*
  Today's study target and how close the user is to it.

  The target is a saved DailyGoal, so editing it goes to the API and then
  reloads today's statistics. That keeps one source of truth: the component
  never remembers a target it has not confirmed with the server.
*/
function DailyTargetProgress({ focusedSeconds }) {
  const dispatch = useDispatch();
  const targetMinutes = useSelector((state) => state.statistics.dailyTargetMinutes);

  // Only relevant while the small form is open, so it stays out of Redux.
  const [isEditing, setIsEditing] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const progressPercent = calculateProgressPercent(focusedSeconds, targetMinutes);
  const hasTarget = targetMinutes > 0;
  const hasPassedTarget = hasTarget && focusedSeconds > targetMinutes * 60;

  function startEditing() {
    setDraftMinutes(hasTarget ? String(targetMinutes) : "");
    setSaveError("");
    setIsEditing(true);
  }

  /** Saves today's target, then reloads the statistics that report it. */
  async function handleSubmit(event) {
    event.preventDefault();

    const minutes = Number(draftMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) {
      setSaveError("Enter the number of minutes you want to study today.");
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await updateTodayGoal(Math.round(minutes));
    } catch (error) {
      setSaveError(getErrorMessage(error, "Unable to save your target."));
      setIsSaving(false);
      return;
    }

    await dispatch(fetchTodayStatistics());
    setIsSaving(false);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="mt-5 border-t border-rule pt-4">
        <label
          className="block text-sm font-medium text-ink-muted"
          htmlFor="daily-target"
        >
          Today&apos;s target, in minutes
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            id="daily-target"
            type="number"
            min="0"
            max="1440"
            value={draftMinutes}
            onChange={(event) => setDraftMinutes(event.target.value)}
            placeholder="240"
            disabled={isSaving}
            className="field-control w-24"
          />

          <Button type="submit" variant="primary" isBusy={isSaving} busyLabel="Saving...">
            Save
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>

        {saveError && (
          <p className="mt-2 text-sm text-burgundy" role="alert">
            {saveError}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">
          Target{" "}
          <span className="text-ink">
            {hasTarget ? formatStudyMinutes(targetMinutes) : "not set"}
          </span>
        </span>

        <Button variant="quiet" size="sm" onClick={startEditing}>
          {hasTarget ? "Edit" : "Set target"}
        </Button>
      </div>

      {hasTarget && (
        <>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward today's study target"
          >
            <div
              className="h-full rounded-full bg-brass transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* The bar stops at full, but the number must not pretend the user
              only just reached the target when they went past it. */}
          <p className="mt-2 text-sm text-ink-muted tabular-nums">
            {hasPassedTarget ? "100%+ · target passed" : `${progressPercent}%`}
          </p>
        </>
      )}
    </div>
  );
}

export default DailyTargetProgress;
