// Binary insect engine. Each bug is a recognizable beetle silhouette (head,
// thorax, abdomen, six legs, antennae) whose body is FILLED with a grid of
// glowing binary digits, matching the "binary bug" reference art. Bugs crawl
// with weight and brighten as they near the emblem's light.

export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// "Phantom" in hex, revealed inside a few bugs near the emblem.
export const HEX_PHANTOM = ["50", "68", "61", "6e", "74", "6f", "6d"];

const TAU = Math.PI * 2;

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// Trace a beetle body into the current path, centered at origin, facing up (-y),
// sized by `s` (body half-length in px). Shared by clip + outline.
// Returns nothing; caller fills/clips/strokes.
function traceBeetle(ctx, s) {
  const w = s * 0.62; // body half-width

  // Abdomen (large teardrop, rear = +y).
  ctx.moveTo(0, s * 1.15);
  ctx.bezierCurveTo(w * 1.15, s * 0.95, w * 1.2, -s * 0.05, w * 0.62, -s * 0.15);
  ctx.bezierCurveTo(w * 0.2, -s * 0.2, -w * 0.2, -s * 0.2, -w * 0.62, -s * 0.15);
  ctx.bezierCurveTo(-w * 1.2, -s * 0.05, -w * 1.15, s * 0.95, 0, s * 1.15);
  ctx.closePath();

  // Thorax (rounded trapezoid).
  ctx.moveTo(0, -s * 0.1);
  ctx.bezierCurveTo(w * 0.72, -s * 0.15, w * 0.66, -s * 0.6, w * 0.34, -s * 0.66);
  ctx.bezierCurveTo(w * 0.12, -s * 0.7, -w * 0.12, -s * 0.7, -w * 0.34, -s * 0.66);
  ctx.bezierCurveTo(-w * 0.66, -s * 0.6, -w * 0.72, -s * 0.15, 0, -s * 0.1);
  ctx.closePath();

  // Head (small dome).
  ctx.moveTo(0, -s * 0.6);
  ctx.bezierCurveTo(w * 0.34, -s * 0.62, w * 0.36, -s * 0.95, 0, -s * 0.98);
  ctx.bezierCurveTo(-w * 0.36, -s * 0.95, -w * 0.34, -s * 0.62, 0, -s * 0.6);
  ctx.closePath();
}

// Legs + antennae as stroked lines (drawn separately from the glyph fill).
function drawBeetleLimbs(ctx, s, alpha, phase) {
  const w = s * 0.62;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(70, 224, 255, " + alpha.toFixed(3) + ")";
  ctx.lineWidth = Math.max(1, s * 0.05);

  // Three leg pairs off the thorax/abdomen sides, with a gentle walking wiggle.
  const pairs = [
    { y: -s * 0.5, len: s * 0.85, spread: 0.5 },
    { y: -s * 0.15, len: s * 1.0, spread: 0.15 },
    { y: s * 0.25, len: s * 0.95, spread: -0.2 },
  ];
  for (let i = 0; i < pairs.length; i += 1) {
    const p = pairs[i];
    const wig = Math.sin(phase * 2 + i) * 0.12;
    for (const side of [-1, 1]) {
      const bx = side * w * 0.6;
      const midx = side * (w * 0.6 + p.len * 0.55);
      const midy = p.y - p.len * (0.12 + p.spread) + wig * s;
      const tipx = side * (w * 0.6 + p.len);
      const tipy = p.y + p.len * (0.32 - p.spread) - wig * s;
      ctx.beginPath();
      ctx.moveTo(bx, p.y);
      ctx.quadraticCurveTo(midx, midy, tipx, tipy);
      ctx.stroke();
    }
  }

  // Antennae off the head.
  ctx.lineWidth = Math.max(1, s * 0.04);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * w * 0.18, -s * 0.92);
    ctx.quadraticCurveTo(side * w * 0.7, -s * 1.3, side * w * 0.5, -s * 1.6);
    ctx.stroke();
  }
}

export class Bug {
  // opts: { kind:'beetle'|'roach', x, y, angle, speed, size, rng, bounds:{w,h} }
  constructor(opts) {
    Object.assign(this, opts);
    if (!this.size) this.size = 22;
    this.phase = this.rng() * TAU;
    this.wander = this.rng() * TAU;
    this.turnTimer = this.rng() * 1.5;
    this.hex = this.rng() < 0.16;
    // Pre-roll a stable binary grid so the body reads as digits, not static.
    this.cols = 5;
    this.rows = 9;
    this.grid = [];
    for (let i = 0; i < this.cols * this.rows; i += 1) {
      this.grid.push(this.rng() > 0.5 ? "1" : "0");
    }
    this.flipTimer = this.rng() * 0.5;
    // Per-beetle sprite: rendered once, blitted each frame. Re-rendered only when
    // the binary grid flips (on a slow timer), which keeps the frame loop cheap.
    this.spriteDirty = true;
    this._buildSprite();
  }

  // Render the beetle into its offscreen sprite. The canvas is allocated once;
  // subsequent rebuilds only clear + redraw (resizing a canvas is expensive).
  _buildSprite() {
    const s = this.size;
    const pad = Math.ceil(s * 0.9);
    const wpx = Math.ceil(s * 1.3) + pad * 2; // room for legs/antennae
    const hpx = Math.ceil(s * 2.7) + pad * 2;
    if (!this.sprite) {
      this.sprite = (typeof OffscreenCanvas !== "undefined")
        ? new OffscreenCanvas(wpx, hpx)
        : Object.assign(document.createElement("canvas"), { width: wpx, height: hpx });
      this.sprite.width = wpx;
      this.sprite.height = hpx;
      this.spriteCX = wpx / 2;
      this.spriteCY = hpx / 2;
      this._sctx = this.sprite.getContext("2d");
    }
    const c = this._sctx;
    c.clearRect(0, 0, wpx, hpx);
    c.save();
    c.translate(this.spriteCX, this.spriteCY);
    c.globalCompositeOperation = "lighter";

    drawBeetleLimbs(c, s, 0.85, this.phase);

    c.save();
    c.beginPath();
    traceBeetle(c, s);
    c.fillStyle = "rgba(0, 150, 180, 0.16)";
    c.fill();
    c.clip();
    const fontPx = s * 0.3;
    c.font = `700 ${fontPx}px "JetBrains Mono", monospace`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const gx0 = -s * 0.62;
    const gy0 = -s;
    const gw = (s * 1.24) / this.cols;
    const gh = (s * 2.15) / this.rows;
    for (let r = 0; r < this.rows; r += 1) {
      for (let cc = 0; cc < this.cols; cc += 1) {
        const idx = r * this.cols + cc;
        let g = this.grid[idx];
        if (this.hex) g = HEX_PHANTOM[idx % HEX_PHANTOM.length][idx % 2];
        const gxp = gx0 + gw * (cc + 0.5);
        const gyp = gy0 + gh * (r + 0.5);
        const a = 0.55 + 0.45 * Math.sin((r / this.rows) * Math.PI);
        c.fillStyle = "rgba(120, 240, 255, " + a.toFixed(3) + ")";
        c.fillText(g, gxp, gyp);
      }
    }
    c.restore();

    c.beginPath();
    traceBeetle(c, s);
    c.strokeStyle = "rgba(90, 236, 255, 0.9)";
    c.lineWidth = Math.max(1, s * 0.04);
    c.stroke();
    c.restore();

    this.spriteDirty = false;
  }

  step(dt, emblem) {
    // Occasional deliberate turns, otherwise a steady crawl.
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.turnTimer = 0.8 + this.rng() * 2.2;
      this.wander += (this.rng() - 0.5) * 1.4;
    }
    this.angle += Math.sin(this.wander) * 0.5 * dt;

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Wrap so the swarm never depletes.
    const m = this.size * 2.4;
    if (this.x < -m) this.x = this.bounds.w + m;
    if (this.x > this.bounds.w + m) this.x = -m;
    if (this.y < -m) this.y = this.bounds.h + m;
    if (this.y > this.bounds.h + m) this.y = -m;

    this.phase += dt * 3;

    this.flipTimer -= dt;
    if (this.flipTimer <= 0) {
      // Rebuild the sprite only occasionally; staggered so beetles don't rebuild
      // in sync. Digit flips are decorative, so a slow cadence is imperceptible.
      this.flipTimer = 1.6 + this.rng() * 2.4;
      const idx = Math.floor(this.rng() * this.grid.length);
      this.grid[idx] = this.grid[idx] === "1" ? "0" : "1";
      this.spriteDirty = true;
    }
  }

  draw(ctx, emblem) {
    if (this.spriteDirty) this._buildSprite();
    const flare = Math.max(0, 1 - dist(this.x, this.y, emblem.x, emblem.y) / emblem.radius);
    const prevOp = ctx.globalCompositeOperation;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, 0.72 + flare * 0.28);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2); // art faces up (-y)
    ctx.drawImage(this.sprite, -this.spriteCX, -this.spriteCY);
    ctx.restore();
    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevOp;
  }
}
