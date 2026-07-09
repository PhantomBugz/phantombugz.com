import { initGate } from "./js/gate.js";
import { initCorridor } from "./js/corridor.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// Entering ALWAYS navigates to the main page. The corridor is optional eye-candy that
// plays during the brief flash; it must never be able to block or delay entry. This is
// the bulletproof entry path: click -> short flash -> enter.html, no scroll/timer race.
const ENTER_FLASH_MS = 650; // matches the gate's cyan flash so the transition feels intentional

let navigating = false;
function enterSite() {
  if (navigating) return;
  navigating = true;
  window.setTimeout(() => {
    window.location.href = "./enter.html";
  }, reduced.matches ? 0 : ENTER_FLASH_MS);
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
