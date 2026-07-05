import { initGate } from "./js/gate.js";
import { initCorridor } from "./js/corridor.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// The corridor is built once, when the visitor crosses the gate.
let corridorStarted = false;
function startCorridor() {
  if (corridorStarted) return;
  corridorStarted = true;
  initCorridor(document.getElementById("corridor"));
  watchForSling();
}

// The gate owns the first screen; entering starts the corridor.
initGate(startCorridor);

// When the dolly reaches the end of the corridor, sling into the main page.
function watchForSling() {
  const corridor = document.getElementById("corridor");
  const sling = document.getElementById("sling");
  if (!corridor) return;
  let slung = false;

  function fireSling() {
    if (slung) return;
    slung = true;
    if (reduced.matches) {
      window.location.href = "./enter.html";
      return;
    }
    if (sling) sling.classList.add("fire");
    // Let the cyan flood + forward rush play, then hand off to the main page.
    setTimeout(() => {
      window.location.href = "./enter.html";
    }, 720);
  }

  // Mobile-safe progress: measure against the real scrollable range using
  // documentElement, not vh math (which breaks with the mobile URL bar). Require
  // the visitor to actually reach the very bottom so a flick can't skip through.
  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    return Math.min(Math.max(y / max, 0), 1);
  }

  // Only sling once the user is essentially at the bottom AND has actually
  // scrolled a meaningful distance (guards against instant-fire on load/flick).
  let maxSeen = 0;
  function check() {
    const p = progress();
    if (p > maxSeen) maxSeen = p;
    if (p >= 0.995 && maxSeen >= 0.995) fireSling();
  }

  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", check, { passive: true });
    window.visualViewport.addEventListener("scroll", check, { passive: true });
  }
}
