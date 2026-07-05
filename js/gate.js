// The enter gate: a full-screen threshold. A large binary beetle crawls the
// backdrop; clicking (or Enter/Space) fires a forceful transition into the site.

import { Bug, makeRng } from "./bugs.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initGate(onEnter) {
  const gate = document.getElementById("gate");
  const canvas = document.getElementById("gate-canvas");
  if (!gate || !canvas) {
    if (onEnter) onEnter();
    return;
  }

  document.body.classList.add("gate-open");
  const ctx = canvas.getContext("2d");
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  let bugs = [];

  // Keep beetles out of a central "safe zone" so the emblem + wordmark stay clear.
  const mobile = () => window.innerWidth < 720;

  function size() {
    const ratio = dpr();
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    const rng = makeRng(4242);
    const count = mobile() ? 9 : 18;
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.46;
    const safe = Math.min(canvas.width, canvas.height) * (mobile() ? 0.42 : 0.3);
    bugs = [];
    let guard = 0;
    while (bugs.length < count && guard < count * 40) {
      guard += 1;
      const x = rng() * canvas.width;
      const y = rng() * canvas.height;
      // Reject spawns inside the central safe zone.
      if (Math.hypot(x - cx, y - cy) < safe) continue;
      bugs.push(
        new Bug({
          kind: "beetle",
          x,
          y,
          angle: rng() * Math.PI * 2,
          speed: 14 + rng() * 16,
          size: 24 * (0.85 + rng() * 0.5) * (mobile() ? 0.8 : 1),
          rng,
          bounds: { w: canvas.width, h: canvas.height },
        })
      );
    }
  }

  // Emblem light pushed off the canvas so beetles are gently steered outward from center.
  const emblem = () => ({ x: canvas.width * 0.5, y: canvas.height * 0.46, radius: canvas.height * 0.5 });

  let running = true;
  let last = 0;
  function loop(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const em = emblem();
    for (const b of bugs) {
      b.step(dt, em);
      b.draw(ctx, em);
    }
    requestAnimationFrame(loop);
  }

  size();
  if (REDUCED.matches) {
    for (const b of bugs) {
      b.step(0.3, emblem());
      b.draw(ctx, emblem());
    }
  } else {
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    if (running) size();
  });

  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    running = false;

    // Cyan flash flood.
    const flash = document.createElement("div");
    flash.className = "gate-flash";
    document.body.appendChild(flash);
    // reflow then fire the animation
    void flash.offsetWidth;
    flash.classList.add("fire");

    gate.classList.add("entering");
    gate.style.pointerEvents = "none"; // stop any further taps immediately
    document.body.classList.remove("gate-open");
    if (onEnter) onEnter();

    const cleanup = () => {
      gate.classList.add("gone");
      flash.remove();
    };
    if (REDUCED.matches) {
      cleanup();
    } else {
      setTimeout(cleanup, 1000);
    }
  }

  // Fire on the first tap/click. Listen to several events (iOS Safari can drop
  // one or another); the `entered` guard makes extras harmless. No preventDefault
  // on the pointer events — that interferes with iOS tap recognition.
  gate.addEventListener("click", enter);
  gate.addEventListener("touchend", enter);
  gate.addEventListener("pointerup", enter);
  gate.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      enter();
    }
  });
}
