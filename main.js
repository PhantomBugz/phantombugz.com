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

  window.addEventListener(
    "scroll",
    () => {
      const scrollable = corridor.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-corridor.getBoundingClientRect().top, 0), Math.max(scrollable, 1));
      const progress = scrollable > 0 ? scrolled / scrollable : 0;
      if (progress >= 0.985) fireSling();
    },
    { passive: true }
  );
}
