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

  Deliberately short. It sets the tone of a study desk and then gets out of the
  way, so the timer below it is still the first thing the user reaches for.
*/
function DashboardHero() {
  const { user } = useAuth();
  const timer = useSelector((state) => state.timer);

  return (
    <section className="flex items-center justify-between gap-6 border-b border-rule pb-6">
      <div>
        <h1 className="font-display text-3xl text-ink">
          {getGreeting()}, {user.username}.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Stay focused. Keep building.
        </p>
        <p className="mt-1 text-sm text-brass">{getStatusLine(timer)}</p>
      </div>

      <StudyDeskIllustration className="hidden h-24 w-48 shrink-0 sm:block" />
    </section>
  );
}

export default DashboardHero;
