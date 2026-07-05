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

function goToMain(sling) {
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
  const corridor = document.getElementById("corridor");
  const space = corridor && corridor.querySelector(".corridor-space");
  const sling = document.getElementById("sling");
  if (!corridor || !space) {
    window.location.href = "./enter.html";
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

  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", check, { passive: true });
  }
}
