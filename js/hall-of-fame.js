// Hall of Fame: renders disclosed write-ups from data/hall-of-fame.json.
// Entries with status "placeholder" are shown only as subtle coming-soon cards.
const EMPTY_TEXT = "Disclosed write-ups land here once embargoes lift.";
const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

const safeUrl = (value) => {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const card = (entry, placeholder) => {
  const li = el("li", placeholder ? "hof-entry is-placeholder" : "hof-entry");
  const meta = el("p", "hof-meta");
  const severity = String(entry.severity || "").toLowerCase();
  if (SEVERITIES.has(severity)) meta.appendChild(el("span", "", severity));
  if (entry.platform) meta.appendChild(el("span", "", String(entry.platform)));
  if (entry.date) {
    const time = el("time", "", String(entry.date));
    time.dateTime = String(entry.date);
    meta.appendChild(time);
  }
  if (placeholder) meta.appendChild(el("span", "", "Coming soon"));
  li.appendChild(meta);

  const h3 = el("h3");
  const href = placeholder ? "" : safeUrl(entry.url);
  if (href) {
    const a = el("a", "", String(entry.title || "Untitled write-up"));
    a.href = href;
    a.rel = "noopener";
    h3.appendChild(a);
  } else {
    h3.textContent = String(entry.title || "Untitled write-up");
  }
  li.appendChild(h3);
  if (entry.summary) li.appendChild(el("p", "", String(entry.summary)));
  return li;
};

export async function initHallOfFame(root, { limit = Infinity } = {}) {
  if (!root) return;
  const list = root.querySelector("[data-hof-list]");
  const soonHead = root.querySelector("[data-hof-soon]");
  const soonList = root.querySelector("[data-hof-soon-list]");
  const empty = root.querySelector("[data-hof-empty]");
  const publishedHead = root.querySelector("[data-hof-published]");

  let entries = [];
  try {
    const res = await fetch("./data/hall-of-fame.json", { cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      entries = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : [];
    }
  } catch {
    entries = [];
  }

  const isPlaceholder = (e) => String(e.status || "").toLowerCase() === "placeholder";
  const published = entries
    .filter((e) => e && !isPlaceholder(e))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const placeholders = entries.filter((e) => e && isPlaceholder(e));

  list.replaceChildren(...published.slice(0, limit).map((e) => card(e, false)));
  list.hidden = published.length === 0;
  if (publishedHead) publishedHead.hidden = published.length === 0;
  if (empty) {
    empty.textContent = EMPTY_TEXT;
    empty.hidden = published.length !== 0;
  }
  if (soonList) {
    soonList.replaceChildren(...placeholders.slice(0, 3).map((e) => card(e, true)));
    soonList.hidden = placeholders.length === 0;
    if (soonHead) soonHead.hidden = placeholders.length === 0;
  }
}
