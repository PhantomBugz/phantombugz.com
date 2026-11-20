const severities = ["critical", "high", "medium", "low"];

export async function initTelemetry(root) {
  if (!root) return;

  try {
    const response = await fetch("./data/bugbounty-public.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const total = data.allTimeReports;
    const breakdown = severities.map((severity) => data.allTimeBySeverity?.[severity]);
    if (![total, ...breakdown].every((count) => Number.isSafeInteger(count) && count >= 0)) return;
    if (breakdown.reduce((sum, count) => sum + count, 0) !== total) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.lastUpdated)) return;
    const date = new Date(data.lastUpdated);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.lastUpdated) return;

    const counts = root.querySelector("[data-signal-counts]");
    const dateNote = root.querySelector("[data-signal-date]");
    const timestamp = dateNote.querySelector("time");
    timestamp.dateTime = data.lastUpdated;
    timestamp.textContent = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(date);
    counts.querySelector('[data-k="reports"]').textContent = total;
    severities.forEach((severity, index) => {
      counts.querySelector(`[data-k="${severity}"]`).textContent = breakdown[index];
    });
    dateNote.hidden = false;
    counts.hidden = false;
    root.querySelector("[data-signal-status]").hidden = true;
  } catch {
    // Keep the unavailable message when there is no usable snapshot.
  }
}
