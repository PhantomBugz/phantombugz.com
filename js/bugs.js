// Binary insect engine. Draws crawling glyph-bugs (centipedes + roaches) made of
// 1s and 0s onto a 2D canvas. Each bug follows a wandering head; the body trails
// behind it. Bugs brighten as they pass the emblem's light at the vanishing point.

export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// "Phantom" in hex, revealed by a small fraction of bugs near the emblem.
export const HEX_PHANTOM = ["50", "68", "61", "6e", "74", "6f", "6d"];

const TAU = Math.PI * 2;

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export class Bug {
  // opts: { kind:'centipede'|'roach', x, y, angle, speed, length, scale, rng, bounds:{w,h} }
  constructor(opts) {
    Object.assign(this, opts);
    this.phase = this.rng() * TAU;
    this.wander = this.rng() * TAU;
    this.trail = [{ x: this.x, y: this.y }];
    this.segGap = (this.kind === "roach" ? 5 : 9) * this.scale;
    this.burstTimer = this.rng() * 1.2;
    this.moving = true;
    // A few roaches spell hex near the emblem instead of raw bits.
    this.hex = this.kind === "roach" && this.rng() < 0.16;
    // Pre-roll each segment's glyph so the body reads as a stable string, not TV static.
    this.glyphs = [];
    for (let i = 0; i < this.length; i += 1) {
      this.glyphs.push(this.rng() > 0.5 ? "1" : "0");
    }
    // Occasional single glyph flip keeps it alive without flickering.
    this.flipEvery = 0.22 + this.rng() * 0.4;
    this.flipTimer = this.rng() * this.flipEvery;
  }

  step(dt, emblem) {
    // Roaches move in nervous bursts; centipedes flow steadily.
    if (this.kind === "roach") {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.moving = !this.moving;
        this.burstTimer = this.moving ? 0.25 + this.rng() * 0.6 : 0.15 + this.rng() * 0.5;
        if (this.moving) this.wander += (this.rng() - 0.5) * 1.6;
      }
    } else {
      this.moving = true;
    }

    // Gentle course wander; centipedes curve smoothly, roaches jitter.
    const wanderRate = this.kind === "roach" ? 3.2 : 0.9;
    this.wander += (this.rng() - 0.5) * wanderRate * dt;
    this.angle += Math.sin(this.wander) * (this.kind === "roach" ? 0.9 : 0.4) * dt;

    const v = this.moving ? this.speed : 0;
    this.x += Math.cos(this.angle) * v * dt;
    this.y += Math.sin(this.angle) * v * dt;

    // Wrap around the surface so the swarm never depletes.
    const m = 40 * this.scale;
    if (this.x < -m) this.x = this.bounds.w + m;
    if (this.x > this.bounds.w + m) this.x = -m;
    if (this.y < -m) this.y = this.bounds.h + m;
    if (this.y > this.bounds.h + m) this.y = -m;

    // Record head trail for the body to follow.
    this.trail.unshift({ x: this.x, y: this.y });
    const maxTrail = Math.ceil(this.length * this.segGap) + 6;
    if (this.trail.length > maxTrail) this.trail.length = maxTrail;

    this.phase += dt * (this.kind === "roach" ? 10 : 5);

    this.flipTimer -= dt;
    if (this.flipTimer <= 0) {
      this.flipTimer = this.flipEvery;
      const idx = Math.floor(this.rng() * this.glyphs.length);
      this.glyphs[idx] = this.glyphs[idx] === "1" ? "0" : "1";
    }
  }

  // Sample the trail at a given pixel distance back from the head.
  _sampleTrail(backDist) {
    let acc = 0;
    for (let i = 1; i < this.trail.length; i += 1) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const d = dist(a.x, a.y, b.x, b.y);
      if (acc + d >= backDist) {
        const t = d === 0 ? 0 : (backDist - acc) / d;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      acc += d;
    }
    return this.trail[this.trail.length - 1] || { x: this.x, y: this.y };
  }

  draw(ctx, emblem) {
    const fontPx = (this.kind === "roach" ? 14 : 15) * this.scale;
    ctx.font = `700 ${fontPx}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Emblem light: bugs near the vanishing point flare brighter.
    const flareR = emblem.radius;
    const headDist = dist(this.x, this.y, emblem.x, emblem.y);
    const flare = Math.max(0, 1 - headDist / flareR);

    // Travel direction, for perpendicular undulation of the body.
    const px = -Math.sin(this.angle);
    const py = Math.cos(this.angle);

    // Additive blending makes overlapping glyphs bloom like real light. The
    // soft halo comes from a CSS blur layer on a second canvas (see corridor.js),
    // so this hot loop stays free of the very expensive canvas shadowBlur.
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < this.length; i += 1) {
      const p = this._sampleTrail(i * this.segGap);
      const wave = Math.sin(this.phase - i * 0.55) * (this.kind === "roach" ? 1.2 : 2.4) * this.scale;
      const sx = p.x + px * wave;
      const sy = p.y + py * wave;

      // Head bright, tail dim.
      const ramp = 1 - i / this.length;
      let alpha = 0.34 + ramp * 0.62;
      alpha = Math.min(1, alpha + flare * 0.5);

      let glyph = this.glyphs[i];
      if (this.hex && flare > 0.35) {
        glyph = HEX_PHANTOM[i % HEX_PHANTOM.length];
      }

      // Head segment leans cyan-white; body is phantom cyan. Brighter near the emblem.
      if (i === 0) {
        ctx.fillStyle = "rgba(225, 254, 255, " + Math.min(1, alpha + flare * 0.3).toFixed(3) + ")";
      } else {
        ctx.fillStyle = "rgba(70, 224, 255, " + alpha.toFixed(3) + ")";
      }
      ctx.fillText(glyph, sx, sy);
    }

    // Roach antennae: two short strokes off the head.
    if (this.kind === "roach") {
      const h = this.trail[0];
      ctx.strokeStyle = "rgba(120, 245, 255, " + (0.5 + flare * 0.4).toFixed(3) + ")";
      ctx.lineWidth = 1.2 * this.scale;
      ctx.beginPath();
      const a1 = this.angle - 0.5;
      const a2 = this.angle + 0.5;
      const al = 8 * this.scale;
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.x + Math.cos(a1) * al, h.y + Math.sin(a1) * al);
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.x + Math.cos(a2) * al, h.y + Math.sin(a2) * al);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = prevOp;
  }
}
