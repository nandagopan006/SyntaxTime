import TodayFocusStat from "../components/dashboard/TodayFocusStat";
import FocusTimer from "../components/timer/FocusTimer";

function Home() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
      <FocusTimer />
      <TodayFocusStat />
    </div>
  );
}

export default Home;
