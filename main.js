import { initGate } from "./js/gate.js";
import { initCorridor } from "./js/corridor.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
// Touch / small screens get the auto-play corridor. iOS Safari can't reliably
// drive the scroll-based sticky-3D dolly, so we animate it instead of scrolling.
const isMobile =
  window.matchMedia("(hover: none), (pointer: coarse)").matches || window.innerWidth < 720;

// The corridor is built once, when the visitor crosses the gate.
let corridorStarted = false;
function startCorridor() {
  if (corridorStarted) return;
  corridorStarted = true;
  initCorridor(document.getElementById("corridor"));
  if (isMobile) autoDolly();
  else watchForSling();
}

// The gate owns the first screen; entering starts the corridor.
initGate(startCorridor);

// Single guard so no path (scroll-sling, auto-dolly, or backstop timeout) can
// navigate twice or fight another in-flight transition.
let navigating = false;
function goToMain(sling) {
  if (navigating) return;
  navigating = true;
  if (reduced.matches) {
    window.location.href = "./enter.html";
    return;
  }
  if (sling) sling.classList.add("fire");
  setTimeout(() => {
    window.location.href = "./enter.html";
  }, 720);
}

// MOBILE: fly the camera down the corridor automatically, then sling to main.
function autoDolly() {
  if (navigating) return;
  const corridor = document.getElementById("corridor");
  const space = corridor && corridor.querySelector(".corridor-space");
  const sling = document.getElementById("sling");
  if (!corridor || !space) {
    goToMain(null);
    return;
  }
  if (reduced.matches) {
    // No animation preference: brief pause on the static corridor, then go.
    setTimeout(() => goToMain(null), 900);
    return;
  }

  const DURATION = 4200; // ms of cinematic travel
  let start = 0;
  let done = false;
  function frame(now) {
    if (!start) start = now;
    const t = Math.min((now - start) / DURATION, 1);
    // Ease-in so it accelerates into the emblem.
    const eased = t * t * (3 - 2 * t);
    space.style.setProperty("--dolly", (120 + eased * 620).toFixed(1) + "px");
    corridor.style.setProperty("--approach", eased.toFixed(3));
    if (t < 1) {
      requestAnimationFrame(frame);
    } else if (!done) {
      done = true;
      goToMain(sling);
    }
  }
  requestAnimationFrame(frame);
}

// DESKTOP: sling once the dolly scroll reaches the end of the corridor.
function watchForSling() {
  const corridor = document.getElementById("corridor");
  const sling = document.getElementById("sling");
  if (!corridor) return;
  let slung = false;

  function fireSling() {
    if (slung) return;
    slung = true;
    goToMain(sling);
  }

  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    return Math.min(Math.max(y / max, 0), 1);
  }

  let maxSeen = 0;
  function check() {
    const p = progress();
    if (p > maxSeen) maxSeen = p;
    if (p >= 0.995 && maxSeen >= 0.995) fireSling();
  }

  // Check immediately (next frame) to catch non-scrollable pages.
  requestAnimationFrame(check);

  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", check, { passive: true });
  }

  // If the visitor hasn't started scrolling shortly after entering, play the same
  // cinematic dolly the mobile path uses, then navigate — so a desktop user who never
  // scrolls gets an intentional fly-through instead of a stuck-looking corridor.
  // Scrolling before then cancels the auto-dolly (the scroll-sling takes over).
  const AUTO_DOLLY_AFTER = 1500; // ms of "did they scroll?" grace
  setTimeout(() => {
    if (slung || maxSeen > 0.02) return; // user is scrolling — let them drive
    autoDolly();
  }, AUTO_DOLLY_AFTER);

  // Absolute backstop: never let a visitor hang on the corridor.
  setTimeout(fireSling, 8000);
}
