// A few binary beetles crawling the whole main page, behind the content, to keep
// the corridor's vibe across the site.

import { Bug, makeRng } from "./bugs.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initRoam(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  let bugs = [];

  function size() {
    const ratio = dpr();
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    const rng = makeRng(9001);
    // Just a few, so they read as accents roaming the page, not an infestation.
    const count = window.innerWidth < 720 ? 4 : 7;
    bugs = [];
    for (let i = 0; i < count; i += 1) {
      bugs.push(
        new Bug({
          kind: "beetle",
          x: rng() * canvas.width,
          y: rng() * canvas.height,
          angle: rng() * Math.PI * 2,
          speed: 14 + rng() * 16,
          size: 22 * (0.85 + rng() * 0.5) * (window.innerWidth < 720 ? 0.85 : 1),
          rng,
          bounds: { w: canvas.width, h: canvas.height },
        })
      );
    }
  }

  // No emblem light on the open page; keep a neutral point so bugs render evenly.
  const emblem = () => ({ x: canvas.width * 0.5, y: canvas.height * 0.5, radius: canvas.height * 2 });

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
    clearTimeout(window.__roamResize);
    window.__roamResize = setTimeout(size, 160);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!REDUCED.matches) {
      running = true;
      last = 0;
      requestAnimationFrame(loop);
    }
  });
}
