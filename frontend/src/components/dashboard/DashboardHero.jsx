import { useSelector } from "react-redux";

import { useAuth } from "../../context/AuthContext";
import StudyDeskIllustration from "./StudyDeskIllustration";

/** Returns the greeting that fits the time of day: morning, afternoon or evening. */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** Describes what the user is doing right now, in one short line. */
function getStatusLine(timer) {
  if (timer.mode === "break") {
    return "On a break. The timer will let you know.";
  }
  if (timer.isPaused) {
    return "Focus session paused.";
  }
  if (timer.isRunning) {
    return "Focus session in progress.";
  }
  if (timer.isCompleted) {
    return "Session finished. Record it whenever you are ready.";
  }
  return "Ready for your next session?";
}

/*
  The top of the dashboard: who is here, and what is happening.

  Deliberately short and low-contrast. It sets the tone of a study desk and
  then gets out of the way, so the timer below it is still the first thing the
  user reaches for.
*/
function DashboardHero() {
  const { user } = useAuth();
  const timer = useSelector((state) => state.timer);

  return (
    <section className="relative overflow-hidden rounded-lg border border-rule bg-surface-raised">
      {/* A warm wash from the lamp side of the drawing, so the panel reads as
          lit rather than flat. Kept faint enough to write over. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-brass-wash"
      />

      <div className="relative flex items-center justify-between gap-6 px-6 py-5 sm:px-8">
        <div>
          <h1 className="text-2xl text-ink sm:text-3xl">
            {getGreeting()}, {user.username}.
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Stay focused. Keep building.
          </p>
          <p className="mt-1 text-sm text-brass">{getStatusLine(timer)}</p>
        </div>

        <StudyDeskIllustration className="hidden h-24 w-48 shrink-0 sm:block" />
      </div>
    </section>
  );
}

export default DashboardHero;
