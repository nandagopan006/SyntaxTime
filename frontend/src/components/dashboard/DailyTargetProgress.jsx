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
  //
  // Hours and minutes are kept apart here and joined on save. A single box
  // counted in minutes reads as a small number and invites a large one: "7"
  // meaning seven hours becomes seven minutes, and 446 gets typed to mean the
  // afternoon. The database still stores minutes.
  const [isEditing, setIsEditing] = useState(false);
  const [draftHours, setDraftHours] = useState("");
  const [draftMinutes, setDraftMinutes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const progressPercent = calculateProgressPercent(focusedSeconds, targetMinutes);
  const hasTarget = targetMinutes > 0;
  const hasPassedTarget = hasTarget && focusedSeconds > targetMinutes * 60;

  function startEditing() {
    setDraftHours(hasTarget ? String(Math.floor(targetMinutes / 60)) : "");
    setDraftMinutes(hasTarget ? String(targetMinutes % 60) : "");
    setSaveError("");
    setIsEditing(true);
  }

  /** Saves today's target, then reloads the statistics that report it. */
  async function handleSubmit(event) {
    event.preventDefault();

    // An empty box means none of that unit rather than an error, so "2 hours"
    // can be typed without also typing a zero.
    const hours = draftHours.trim() === "" ? 0 : Number(draftHours);
    const minutes = draftMinutes.trim() === "" ? 0 : Number(draftMinutes);

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      hours < 0 ||
      minutes < 0
    ) {
      setSaveError("Enter how long you want to study today.");
      return;
    }

    const totalMinutes = Math.round(hours) * 60 + Math.round(minutes);

    if (totalMinutes > 24 * 60) {
      setSaveError("A daily target cannot be longer than a day.");
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await updateTodayGoal(totalMinutes);
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
        <p className="text-sm font-medium text-ink-muted">
          How long do you want to study today?
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="daily-target-hours">
            Target hours
          </label>
          <input
            id="daily-target-hours"
            type="number"
            min="0"
            max="24"
            value={draftHours}
            onChange={(event) => setDraftHours(event.target.value)}
            placeholder="2"
            disabled={isSaving}
            className="field-control w-16"
          />
          <span className="text-sm text-ink-muted">h</span>

          <label className="sr-only" htmlFor="daily-target-minutes">
            Target minutes
          </label>
          <input
            id="daily-target-minutes"
            type="number"
            min="0"
            max="59"
            value={draftMinutes}
            onChange={(event) => setDraftMinutes(event.target.value)}
            placeholder="30"
            disabled={isSaving}
            className="field-control w-16"
          />
          <span className="text-sm text-ink-muted">m</span>

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
