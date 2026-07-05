// The Signal: fills the public bounty telemetry strip from the public-safe JSON
// and runs a live clock. Money figures only; no goals or private amounts.

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function set(root, key, value) {
  const node = root.querySelector(`[data-k="${key}"]`);
  if (node) node.textContent = value;
}

function formatCycle(month) {
  if (!month) return "—";
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
}

function startClock(root) {
  const tick = () => {
    const now = new Date();
    set(root, "clock", now.toLocaleTimeString([], { hour12: false }));
  };
  tick();
  setInterval(tick, 1000);
}

export function initTelemetry(root) {
  if (!root) return;
  startClock(root);

  fetch("./data/bugbounty-public.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`signal ${res.status}`);
      return res.json();
    })
    .then((data) => {
      set(root, "submitted", money.format(Number(data.submittedThisMonthUsd || 0)));
      set(root, "lastMonth", money.format(Number(data.lastMonthMadeUsd || 0)));
      set(root, "total", money.format(Number(data.totalMadeSinceLaunchUsd || 0)));
      set(root, "lanes", String(data.activeLaneCount || 0));
      set(root, "cycle", formatCycle(data.month));
    })
    .catch(() => {
      // Leave the seeded dashes; only the cycle gets a static fallback.
      set(root, "cycle", "Current");
    });
}
