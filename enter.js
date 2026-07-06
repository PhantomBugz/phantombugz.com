import { initRoam } from "./js/roam.js";
import { initTelemetry } from "./js/telemetry.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

initRoam(document.getElementById("roam"));
initTelemetry(document.getElementById("signal"));

// Ghost Series "In Motion": the poster sits idle (no video decoding, so it never
// competes with the corridor/beetles for frames). Clicking plays it fullscreen
// with sound. This keeps the page smooth until the visitor chooses to watch.
const motionStage = document.querySelector(".motion-stage");
if (motionStage) {
  motionStage.addEventListener("click", () => {
    const video = document.createElement("video");
    video.className = "motion-fullscreen";
    video.setAttribute("playsinline", "");
    video.controls = true;
    video.loop = true;
    video.preload = "auto";
    const webm = motionStage.getAttribute("data-video-webm");
    const mp4 = motionStage.getAttribute("data-video-mp4");
    if (mp4) {
      const s = document.createElement("source");
      s.src = mp4;
      s.type = "video/mp4";
      video.appendChild(s);
    }
    if (webm) {
      const s = document.createElement("source");
      s.src = webm;
      s.type = "video/webm";
      video.appendChild(s);
    }
    document.body.appendChild(video);

    const cleanup = () => {
      try { video.pause(); } catch (e) {}
      video.remove();
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
    const onFsChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) cleanup();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    const play = () => {
      video.muted = false;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };

    // Try true fullscreen; iOS Safari uses the video's own webkit fullscreen.
    const req =
      video.requestFullscreen ||
      video.webkitRequestFullscreen ||
      video.webkitEnterFullscreen;
    if (req) {
      try {
        const r = req.call(video);
        if (r && r.then) r.then(play).catch(play);
        else play();
      } catch (e) {
        play();
      }
    } else {
      play();
    }
    // iOS <video> exits fullscreen via its own event.
    video.addEventListener("webkitendfullscreen", cleanup);
    video.addEventListener("ended", () => { if (!video.loop) cleanup(); });
  });
}

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
