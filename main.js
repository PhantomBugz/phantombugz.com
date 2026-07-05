import { initCorridor } from "./js/corridor.js";
import { initTelemetry } from "./js/telemetry.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

initCorridor(document.getElementById("corridor"));
initTelemetry(document.getElementById("signal"));

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
