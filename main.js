import { initGate } from "./js/gate.js";
import { initCorridor } from "./js/corridor.js";
import { initTelemetry } from "./js/telemetry.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// Telemetry can load immediately (it's below the fold).
initTelemetry(document.getElementById("signal"));

// The corridor is built once, when the visitor crosses the gate.
let corridorStarted = false;
function startCorridor() {
  if (corridorStarted) return;
  corridorStarted = true;
  initCorridor(document.getElementById("corridor"));
}

// The gate owns the first screen; entering starts the corridor and reveals the site.
initGate(startCorridor);

// Reveal sections as they enter view. Reduced motion shows them immediately.
const reveals = document.querySelectorAll("[data-reveal]");
if (reduced.matches || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("in"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.25 }
  );
  reveals.forEach((el) => observer.observe(el));
}
