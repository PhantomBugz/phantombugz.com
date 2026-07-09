import { initGate } from "./js/gate.js";
import { initCorridor } from "./js/corridor.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// Entering ALWAYS navigates to the main page, immediately, on click. The gate's own
// cyan flash (in gate.js) fires on the same click for the visual transition; navigation
// does not wait on it. No scroll, no timer, no corridor dependency can block entry.
let navigating = false;
function enterSite() {
  if (navigating) return;
  navigating = true;
  // Navigate immediately — do NOT depend on a setTimeout firing (some environments
  // throttle/defer timers, which would leave the visitor stuck on the gate).
  window.location.href = "./enter.html";
}

let corridorStarted = false;
function startCorridor() {
  if (corridorStarted) return;
  corridorStarted = true;
  // Fire the guaranteed navigation immediately on entry.
  enterSite();
  // Best-effort: start the corridor visuals for the brief moment before navigation.
  // Wrapped so any corridor failure can never prevent entry.
  try {
    initCorridor(document.getElementById("corridor"));
  } catch (e) {
    /* corridor is decorative only; ignore failures */
  }
}

// The gate owns the first screen; entering starts the (guaranteed) navigation.
initGate(startCorridor);

// Safety net: if for any reason the gate handler doesn't run, the plain <a href> links
// ("Skip intro", header "Enter") still work. Entry never depends on scroll or timers.
