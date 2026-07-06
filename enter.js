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

// Preorder interest form → Cloudflare Worker → Resend email.
// ENDPOINT is set to the deployed Worker URL. Until it is deployed the form
// falls back to a mailto so no interest is ever lost.
const INTEREST_ENDPOINT = "https://phantombugz-preorder.blackops-97e.workers.dev";

const interestForm = document.getElementById("interest");
if (interestForm) {
  const statusEl = interestForm.querySelector(".interest-status");
  const submitBtn = interestForm.querySelector(".interest-submit");

  // "Register interest" buttons on each piece: focus the form + preselect piece.
  document.querySelectorAll(".vault-piece .request[data-piece]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const piece = btn.getAttribute("data-piece");
      const box = interestForm.querySelector(`input[name="pieces"][value="${piece}"]`);
      if (box) box.checked = true;
      interestForm.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" });
      const nameField = interestForm.querySelector('input[name="name"]');
      if (nameField) setTimeout(() => nameField.focus(), reduced.matches ? 0 : 400);
    });
  });

  interestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = interestForm.name.value.trim();
    const email = interestForm.email.value.trim();
    const note = interestForm.note.value.trim();
    const pieces = Array.from(interestForm.querySelectorAll('input[name="pieces"]:checked')).map((c) => c.value);
    const company = interestForm.company.value; // honeypot

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      statusEl.textContent = "Please enter your name and a valid email.";
      statusEl.className = "interest-status err";
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = "Sending…";
    statusEl.className = "interest-status";

    try {
      const res = await fetch(INTEREST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, note, pieces, company }),
      });
      if (!res.ok) throw new Error("bad status " + res.status);
      interestForm.reset();
      statusEl.textContent = "You're on the list. We reach out to selected members directly.";
      statusEl.className = "interest-status ok";
    } catch (err) {
      // Never lose an interested person: fall back to a prefilled email.
      // Built with DOM methods (no innerHTML) so user input can't inject markup.
      const subject = encodeURIComponent("Ghost Series preorder interest");
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPieces: ${pieces.join(", ") || "(any)"}\nNote: ${note}`
      );
      statusEl.textContent = "Couldn't submit automatically. ";
      const link = document.createElement("a");
      link.href = `mailto:founder@phantombugz.com?subject=${subject}&body=${body}`;
      link.textContent = "Send it as an email instead";
      statusEl.appendChild(link);
      statusEl.className = "interest-status err";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Technical spec lightbox.
const specOpen = document.getElementById("spec-open");
const specModal = document.getElementById("spec-modal");
if (specOpen && specModal) {
  const specClose = specModal.querySelector(".spec-close");
  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    specModal.hidden = false;
    document.body.style.overflow = "hidden";
    specClose.focus();
  };
  const close = () => {
    specModal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };
  specOpen.addEventListener("click", open);
  specClose.addEventListener("click", close);
  specModal.addEventListener("click", (e) => {
    // Click on the backdrop (not the image/inner) closes.
    if (e.target === specModal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !specModal.hidden) close();
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
