// The Signal: fills the public bounty telemetry strip from the public-safe JSON
// and runs a live clock. All-time report counts by severity; no dollar amounts.

function set(root, key, value) {
  const node = root.querySelector(`[data-k="${key}"]`);
  if (node) node.textContent = value;
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
      const sev = data.allTimeBySeverity || {};
      const n = (v) => Number(v || 0);
      const total = ["critical", "high", "medium", "low"].reduce((s, k) => s + n(sev[k]), 0);
      set(root, "reports", String(n(data.allTimeReports) || total));
      for (const k of ["critical", "high", "medium", "low"]) set(root, k, String(n(sev[k])));
      set(root, "lanes", String(data.activeLaneCount || 0));
    })
    .catch(() => {
      // Leave the seeded zeros on fetch failure.
    });
}
