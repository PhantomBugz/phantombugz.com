import { initRoam } from "./js/roam.js";
import { initTelemetry } from "./js/telemetry.js";
import { initHallOfFame } from "./js/hall-of-fame.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

initRoam(document.getElementById("roam"));
initTelemetry(document.getElementById("signal"));

initHallOfFame(document.getElementById("hall-of-fame"), { limit: 6 });

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
    { threshold: 0.2 }
  );
  reveals.forEach((el) => observer.observe(el));
}

window.clearTimeout(window.__phantombugzRevealFallback);
delete window.__phantombugzRevealFallback;
