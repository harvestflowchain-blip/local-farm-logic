// Auto light/dark theme based on local time of day.
// Dark from 19:00 to 06:59, light otherwise. Re-checks every minute.

const isNightHour = (h: number) => h >= 19 || h < 7;

function apply() {
  const hour = new Date().getHours();
  const root = document.documentElement;
  if (isNightHour(hour)) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function startAutoTheme() {
  apply();
  // Re-evaluate every minute so the transition near 07:00 / 19:00 happens automatically.
  setInterval(apply, 60_000);
  // Also re-check when the tab becomes visible again.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") apply();
  });
}
