// The corridor: four canvas surfaces (floor, ceiling, two walls) form a tunnel in
// CSS 3D. Each surface runs its own binary swarm. Scrolling dollies the camera
// toward the emblem glowing at the vanishing point.

import { Bug, makeRng } from "./bugs.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

function isMobile() {
  return window.innerWidth < 720;
}

// Build the swarm for one surface, sized to its canvas. Dense enough to read as
// an infestation, not scattered specks.
function spawnSwarm(canvas, seed) {
  const rng = makeRng(seed);
  const area = canvas.width * canvas.height;
  // One bug per ~46k px on desktop; sparser on mobile for battery. Tuned so the
  // swarm reads as an infestation while holding a smooth frame rate.
  const density = isMobile() ? 90000 : 46000;
  const count = Math.min(180, Math.max(18, Math.round(area / density)));
  const bounds = { w: canvas.width, h: canvas.height };
  const bugs = [];
  const baseScale = isMobile() ? 1 : 1.35;
  for (let i = 0; i < count; i += 1) {
    const kind = rng() < 0.5 ? "centipede" : "roach";
    // Depth: 0 = far (top edge / vanishing point), 1 = near (bottom edge).
    // Bias slightly toward the far half so the swarm reads as pouring out of
    // the tunnel toward the viewer, and scale bugs by depth for staging.
    const depth = Math.pow(rng(), 0.8);
    const y = depth * bounds.h;
    const depthScale = 0.55 + depth * 0.95; // far bugs small, near bugs large
    bugs.push(
      new Bug({
        kind,
        x: rng() * bounds.w,
        y,
        angle: rng() * Math.PI * 2,
        speed: (kind === "roach" ? 40 : 24) + rng() * 20,
        length: kind === "roach" ? 5 + Math.floor(rng() * 4) : 12 + Math.floor(rng() * 12),
        scale: baseScale * depthScale * (0.9 + rng() * 0.35),
        rng,
        bounds,
      })
    );
  }
  return bugs;
}

export function initCorridor(root) {
  if (!root) return;
  const space = root.querySelector(".corridor-space");
  const surfaces = Array.from(root.querySelectorAll(".surface")).map((el, i) => {
    const canvas = el.querySelector("canvas");
    return { el, canvas, ctx: canvas.getContext("2d"), seed: 101 + i * 977, bugs: [] };
  });

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function sizeSurfaces() {
    const ratio = dpr();
    for (const s of surfaces) {
      const rect = s.el.getBoundingClientRect();
      // Fall back to the CSS pixel size when the plane is rotated out of the layout box.
      const w = Math.max(2, Math.round((s.el.offsetWidth || rect.width) * ratio));
      const h = Math.max(2, Math.round((s.el.offsetHeight || rect.height) * ratio));
      s.canvas.width = w;
      s.canvas.height = h;
      s.bugs = spawnSwarm(s.canvas, s.seed);
    }
  }

  // Emblem light lives at the far (deep) end of each surface, centered across it.
  function emblemFor(canvas) {
    return {
      x: canvas.width * 0.5,
      y: canvas.height * 0.12, // far end of each plane maps to the top edge
      radius: Math.min(canvas.width, canvas.height) * 0.6,
    };
  }

  let progress = 0;
  function updateDolly() {
    const scrollable = root.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-root.getBoundingClientRect().top, 0), Math.max(scrollable, 1));
    progress = scrollable > 0 ? scrolled / scrollable : 0;
    // Travel the camera into the tunnel and brighten the emblem as we approach.
    const depth = 120 + progress * 620;
    space.style.setProperty("--dolly", depth.toFixed(1) + "px");
    root.style.setProperty("--approach", progress.toFixed(3));
  }

  function drawFrame() {
    for (const s of surfaces) {
      const { ctx, canvas } = s;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const em = emblemFor(canvas);
      for (const bug of s.bugs) bug.draw(ctx, em);
    }
  }

  function stepFrame(dt) {
    for (const s of surfaces) {
      const em = emblemFor(s.canvas);
      for (const bug of s.bugs) bug.step(dt, em);
    }
  }

  let last = 0;
  let running = false;
  function loop(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    stepFrame(dt);
    drawFrame();
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
  }

  // Setup.
  sizeSurfaces();
  updateDolly();

  window.addEventListener("scroll", updateDolly, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeSurfaces();
      updateDolly();
      if (REDUCED.matches) drawFrame();
    }, 160);
  });

  if (REDUCED.matches) {
    // One static frame, no animation, no dolly travel.
    stepFrame(0.5); // let bodies form a trail
    drawFrame();
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}
