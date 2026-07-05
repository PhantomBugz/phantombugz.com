// The corridor: four canvas surfaces (floor, ceiling, two walls) form a tunnel in
// CSS 3D. Each surface runs its own binary swarm. Scrolling dollies the camera
// toward the emblem glowing at the vanishing point.

import { Bug, makeRng } from "./bugs.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

function isMobile() {
  return window.innerWidth < 720;
}

// Build the swarm for one surface. These are large, detailed binary beetles, so
// counts are modest; each one has weight and presence.
function spawnSwarm(canvas, seed) {
  const rng = makeRng(seed);
  const area = canvas.width * canvas.height;
  // One beetle per ~230k px on desktop; sparser on mobile.
  const density = isMobile() ? 340000 : 230000;
  const count = Math.min(28, Math.max(4, Math.round(area / density)));
  const bounds = { w: canvas.width, h: canvas.height };
  const bugs = [];
  const baseSize = isMobile() ? 20 : 26;
  for (let i = 0; i < count; i += 1) {
    // Depth: 0 = far (top edge / vanishing point), 1 = near (bottom edge).
    // Bias toward the far half so beetles read as pouring out of the tunnel,
    // and scale by depth so far ones are small, near ones large.
    const depth = Math.pow(rng(), 0.8);
    const y = depth * bounds.h;
    const depthSize = 0.5 + depth * 1.1;
    bugs.push(
      new Bug({
        kind: "beetle",
        x: rng() * bounds.w,
        y,
        angle: rng() * Math.PI * 2,
        speed: 16 + rng() * 20,
        size: baseSize * depthSize * (0.85 + rng() * 0.4),
        rng,
        bounds,
      })
    );
  }
  return bugs;
}

// A faint field of falling binary digits behind the beetles, so the bugs blend
// into the system but stay readable.
function makeRain(canvas, seed) {
  const rng = makeRng(seed);
  const colW = 18 * (canvas.width > 1600 ? 1.3 : 1);
  const cols = Math.max(6, Math.floor(canvas.width / colW));
  const drops = [];
  for (let c = 0; c < cols; c += 1) {
    drops.push({
      x: (c + 0.5) * (canvas.width / cols),
      y: rng() * canvas.height,
      speed: 30 + rng() * 70,
      glyphs: Array.from({ length: 10 + Math.floor(rng() * 14) }, () => (rng() > 0.5 ? "1" : "0")),
      gap: 15 + rng() * 6,
      rng,
    });
  }
  return { drops, colW };
}

function stepRain(rain, dt, h) {
  for (const d of rain.drops) {
    d.y += d.speed * dt;
    if (d.y - d.glyphs.length * d.gap > h) d.y = -d.rng() * h * 0.4;
    if (d.rng() < 0.04) {
      const i = Math.floor(d.rng() * d.glyphs.length);
      d.glyphs[i] = d.glyphs[i] === "1" ? "0" : "1";
    }
  }
}

function drawRain(ctx, rain) {
  ctx.save();
  ctx.font = `700 12px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of rain.drops) {
    for (let i = 0; i < d.glyphs.length; i += 1) {
      const y = d.y - i * d.gap;
      if (y < -20 || y > ctx.canvas.height + 20) continue;
      // Head of the column brightest, trailing digits fade out. Kept dim overall.
      const a = Math.max(0, (1 - i / d.glyphs.length)) * 0.16;
      ctx.fillStyle = "rgba(0, 231, 255, " + a.toFixed(3) + ")";
      ctx.fillText(d.glyphs[i], d.x, y);
    }
  }
  ctx.restore();
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
      s.rain = makeRain(s.canvas, s.seed + 7);
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
      if (s.rain) drawRain(ctx, s.rain); // faint rain behind the beetles
      for (const bug of s.bugs) bug.draw(ctx, em);
    }
  }

  function stepFrame(dt) {
    for (const s of surfaces) {
      const em = emblemFor(s.canvas);
      if (s.rain) stepRain(s.rain, dt, s.canvas.height);
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
