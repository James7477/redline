import type { CarSpec } from './cars';

export type CarView = {
  spec: CarSpec;
  rpm: number;
  v: number;
  spinAngle: number;
  /** 0..1 tyre slip off the line. */
  spin: number;
  nos: boolean;
  launched: boolean;
  finished: boolean;
};

export type SceneInput = {
  w: number;
  h: number;
  now: number;
  /** Accumulated track scroll in css pixels. */
  scroll: number;
  playerDist: number;
  rivalDist: number;
  player: CarView;
  rival: CarView;
};

const CITY_TILE = 2600;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Building = { x: number; w: number; h: number; lights: { x: number; y: number; warm: boolean }[] };

const STARS = (() => {
  const r = lcg(20261103);
  return Array.from({ length: 90 }, () => ({
    x: r(),
    y: r() * 0.72,
    rad: 0.4 + r() * 1.3,
    a: 0.12 + r() * 0.6,
  }));
})();

const BUILDINGS: Building[] = (() => {
  const r = lcg(9091);
  const out: Building[] = [];
  let x = 0;
  while (x < CITY_TILE) {
    const w = 54 + r() * 104;
    const h = 34 + r() * 132;
    const lights: { x: number; y: number; warm: boolean }[] = [];
    for (let i = 0; i < 9; i += 1) {
      lights.push({ x: 6 + r() * (w - 12), y: 8 + r() * (h - 16), warm: r() > 0.62 });
    }
    out.push({ x, w, h, lights });
    x += w + 10 + r() * 46;
  }
  return out;
})();

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Objects ahead compress toward the far right; past the car they slide off fast. */
function aheadX(d: number, w: number): number {
  if (d >= 0) return w * 0.62 * (1 - Math.exp(-d / 75));
  return d * 26;
}

/** Cars get a tighter compression so the gap stays readable. */
function gapX(d: number, w: number): number {
  const max = w * 0.46;
  const s = Math.sign(d) || 1;
  return s * max * (1 - Math.exp(-Math.abs(d) / 13));
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, horizon: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#05060f');
  sky.addColorStop(0.42, '#111032');
  sky.addColorStop(0.74, '#2b1642');
  sky.addColorStop(1, '#5c2547');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 1);

  const glow = ctx.createRadialGradient(w * 0.74, horizon, 4, w * 0.74, horizon, w * 0.7);
  glow.addColorStop(0, 'rgba(255,138,72,0.5)');
  glow.addColorStop(0.45, 'rgba(255,80,88,0.14)');
  glow.addColorStop(1, 'rgba(255,80,88,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon + 1);

  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#cfd8ff';
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * horizon, s.rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCity(ctx: CanvasRenderingContext2D, w: number, horizon: number, scroll: number): void {
  const off = (scroll * 0.05) % CITY_TILE;
  ctx.save();
  ctx.translate(0, horizon);
  for (let tile = -1; tile <= 1; tile += 1) {
    const base = tile * CITY_TILE - off;
    for (const b of BUILDINGS) {
      const x = base + b.x;
      if (x + b.w < -10 || x > w + 10) continue;
      ctx.fillStyle = '#0b0b1c';
      ctx.fillRect(x, -b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(120,140,255,0.08)';
      ctx.fillRect(x, -b.h, b.w, 1.4);
      for (const l of b.lights) {
        ctx.fillStyle = l.warm ? 'rgba(255,196,110,0.55)' : 'rgba(110,180,255,0.4)';
        ctx.fillRect(x + l.x, -b.h + l.y, 2.1, 2.6);
      }
    }
  }
  ctx.restore();
}

function drawStands(ctx: CanvasRenderingContext2D, w: number, horizon: number, scroll: number): void {
  const hgt = 30;
  const top = horizon - hgt;
  ctx.fillStyle = '#080812';
  ctx.fillRect(0, top, w, hgt);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, hgt);
  ctx.clip();
  const off = (scroll * 0.22) % 26;
  for (let x = -26; x < w + 26; x += 26) {
    const px = x - off;
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fillRect(px, top + 4, 1.5, hgt);
    ctx.fillStyle = 'rgba(255,190,120,0.10)';
    ctx.fillRect(px + 6, top + 6, 4, 3);
    ctx.fillStyle = 'rgba(120,200,255,0.08)';
    ctx.fillRect(px + 15, top + 8, 4, 3);
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(90,110,190,0.35)';
  ctx.fillRect(0, top, w, 1);
}

function drawBarrier(ctx: CanvasRenderingContext2D, w: number, y: number, scroll: number): void {
  const off = (scroll * 0.35) % 40;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y - 9, w, 10);
  ctx.clip();
  for (let x = -40; x < w + 40; x += 40) {
    const px = x - off;
    ctx.fillStyle = '#e3e6f2';
    ctx.fillRect(px, y - 9, 20, 10);
    ctx.fillStyle = '#c0303c';
    ctx.fillRect(px + 20, y - 9, 20, 10);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, y - 1, w, 2);
}

type WheelKind = 'slick' | 'runner' | 'street';

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  spin: number,
  accent: string,
  kind: WheelKind = 'street',
): void {
  ctx.fillStyle = '#08080e';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Slicks run a fat sidewall on a small rim, front runners a tall skinny one.
  const rimRatio = kind === 'slick' ? 0.36 : kind === 'runner' ? 0.5 : 0.56;

  if (kind === 'slick') {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius - 2.4, 0, Math.PI * 2);
    ctx.stroke();
    // Sidewall lettering
    ctx.strokeStyle = 'rgba(226,228,240,0.24)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i += 1) {
      const a0 = 0.7 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.74, a0, a0 + 0.72);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x, y, radius * rimRatio, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const hub = radius * rimRatio * 0.8;
  ctx.fillStyle = '#10101a';
  ctx.beginPath();
  ctx.arc(x, y, hub, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(10,10,18,0.85)';
  ctx.lineWidth = Math.max(1.2, radius * 0.1);
  const spokes = kind === 'runner' ? 4 : 5;
  for (let i = 0; i < spokes; i += 1) {
    const a = spin + (i * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * hub, y + Math.sin(a) * hub);
    ctx.stroke();
  }
}

/** Rear wheelie bar: rails and a roller that rides the strip. */
function drawWheelieBars(
  ctx: CanvasRenderingContext2D,
  tailX: number,
  tailY: number,
  len: number,
): void {
  const endX = tailX - len;
  ctx.strokeStyle = 'rgba(190,200,220,0.9)';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(endX, -6);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(140,150,172,0.45)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(tailX + 4, tailY - 7);
  ctx.lineTo(endX + 5, -10);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(140,150,172,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tailX + 2, tailY);
  ctx.lineTo(endX + 15, -9);
  ctx.stroke();

  ctx.fillStyle = '#16161f';
  ctx.beginPath();
  ctx.arc(endX, -6, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Cowl-induction scoop on the bonnet. */
function drawScoop(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  top: number,
  base: number,
  body: string,
  bodyDark: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.lineTo(x0 + 4, top + 3);
  ctx.quadraticCurveTo(x0 + 14, top, x0 + 30, top + 0.8);
  ctx.lineTo(x1 - 10, top + 2.6);
  ctx.quadraticCurveTo(x1, top + 5, x1, base);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, base);
  g.addColorStop(0, body);
  g.addColorStop(1, bodyDark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Light catching the crest
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + 6, top + 3.4);
  ctx.lineTo(x1 - 12, top + 3.8);
  ctx.stroke();

  // Intake mouth facing forward
  ctx.fillStyle = 'rgba(3,3,8,0.92)';
  ctx.beginPath();
  ctx.ellipse(x1 - 5, top + 7, 3.2, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Digits are drawn as paths rather than set in a system font, so the number
 * plate looks identical on every device (and in the offline renderer).
 * Grid: x 0..1 left to right, y 0..1 top to bottom.
 */
const DIGIT_LINES: Record<string, number[][]> = {
  '1': [[0.34, 0.16, 0.56, 0.03, 0.56, 0.97]],
  '2': [[0.16, 0.22, 0.32, 0.04, 0.66, 0.04, 0.82, 0.22, 0.8, 0.44, 0.16, 0.92, 0.86, 0.92]],
  '3': [[0.2, 0.07, 0.78, 0.07, 0.46, 0.42, 0.78, 0.55, 0.8, 0.8, 0.62, 0.96, 0.22, 0.96]],
  '4': [[0.7, 0.98, 0.7, 0.02, 0.14, 0.7, 0.88, 0.7]],
  '5': [[0.84, 0.05, 0.28, 0.05, 0.24, 0.44, 0.6, 0.4, 0.8, 0.58, 0.78, 0.86, 0.6, 0.96, 0.22, 0.96]],
  '6': [[0.28, 0.64, 0.33, 0.3, 0.5, 0.05, 0.74, 0.07]],
  '7': [[0.16, 0.04, 0.84, 0.04, 0.44, 0.96]],
  '9': [[0.72, 0.36, 0.74, 0.62, 0.58, 0.94, 0.4, 0.96]],
};

const DIGIT_RINGS: Record<string, number[][]> = {
  '0': [[0.5, 0.5, 0.34]],
  '6': [[0.5, 0.72, 0.25]],
  '8': [[0.5, 0.27, 0.25], [0.5, 0.73, 0.25]],
  '9': [[0.5, 0.29, 0.25]],
};

/** Competition number on the door. */
function drawDoorNumber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
): void {
  ctx.fillStyle = 'rgba(4,6,12,0.94)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const size = r;
  const advance = size * 0.7;
  const inkW = advance * (label.length - 1) + size * 0.7;
  const left = x - inkW / 2 - size * 0.15;
  const top = y - size / 2;

  ctx.strokeStyle = '#eef2ff';
  ctx.lineWidth = size * 0.24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < label.length; i += 1) {
    const ch = label[i];
    const ox = left + i * advance;

    for (const ring of DIGIT_RINGS[ch] ?? []) {
      ctx.beginPath();
      ctx.ellipse(ox + ring[0] * size, top + ring[1] * size, ring[2] * size, ring[2] * size, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const pts of DIGIT_LINES[ch] ?? []) {
      ctx.beginPath();
      ctx.moveTo(ox + pts[0] * size, top + pts[1] * size);
      for (let p = 2; p < pts.length; p += 2) {
        ctx.lineTo(ox + pts[p] * size, top + pts[p + 1] * size);
      }
      ctx.stroke();
    }
  }
}

/** Flareside pickup: long nose, single cab, gold rocker band, slicks. */
function drawTruckBody(ctx: CanvasRenderingContext2D, spec: CarSpec): void {
  const paint = ctx.createLinearGradient(0, -88, 0, -10);
  paint.addColorStop(0, spec.body);
  paint.addColorStop(0.55, spec.body);
  paint.addColorStop(1, spec.bodyDark);

  // Silhouette: low nose, raked screen, flat bed rail
  ctx.beginPath();
  ctx.moveTo(-100, -16);
  ctx.lineTo(-106, -22);
  ctx.lineTo(-106, -50);
  ctx.lineTo(-100, -56);
  ctx.lineTo(-24, -56);
  ctx.lineTo(-22, -62);
  ctx.lineTo(-14, -86);
  ctx.lineTo(14, -86);
  ctx.lineTo(30, -52);
  ctx.lineTo(96, -46);
  ctx.quadraticCurveTo(106, -45, 108, -38);
  ctx.lineTo(110, -30);
  ctx.lineTo(108, -16);
  ctx.closePath();
  ctx.fillStyle = paint;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Shadowed wheel wells, tubbed for the slicks
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.arc(-68, -30, 34, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, -21, 26, Math.PI, Math.PI * 2);
  ctx.fill();

  // Gold band: rocker stripe flowing into the front bumper
  const lower = spec.lower ?? spec.accent;
  ctx.beginPath();
  ctx.moveTo(-104, -28);
  ctx.lineTo(30, -36);
  ctx.lineTo(92, -30);
  ctx.lineTo(104, -24);
  ctx.lineTo(104, -16);
  ctx.lineTo(96, -16);
  ctx.lineTo(96, -44);
  ctx.lineTo(93, -46);
  ctx.lineTo(30, -50);
  ctx.lineTo(-104, -42);
  ctx.closePath();
  ctx.fillStyle = lower;
  ctx.fill();

  // Three stripes inside the band
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = spec.stripe ?? '#f2ecdd';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 3; i += 1) {
    const off = i * 4.2;
    ctx.beginPath();
    ctx.moveTo(-104, -41 + off);
    ctx.lineTo(30, -49 + off);
    ctx.lineTo(92, -39 + off);
    ctx.stroke();
  }
  ctx.restore();

  // Single cab glass
  ctx.beginPath();
  ctx.moveTo(-20, -60);
  ctx.lineTo(-13, -83);
  ctx.lineTo(12, -83);
  ctx.lineTo(27, -55);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,12,26,0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,255,0.28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Windscreen sheen
  ctx.beginPath();
  ctx.moveTo(6, -81);
  ctx.lineTo(22, -58);
  ctx.lineTo(13, -58);
  ctx.lineTo(-2, -80);
  ctx.closePath();
  ctx.fillStyle = 'rgba(140,190,255,0.13)';
  ctx.fill();

  // Open bed
  ctx.fillStyle = 'rgba(4,4,10,0.5)';
  ctx.fillRect(-100, -56, 76, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(-100, -52, 76, 1.4);

  // Door handle
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(8, -52, 9, 2.2);

  // Roll hoop behind the cab
  ctx.strokeStyle = 'rgba(196,206,228,0.38)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-33, -58);
  ctx.lineTo(-33, -80);
  ctx.quadraticCurveTo(-39, -86, -44, -81);
  ctx.lineTo(-44, -58);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(196,206,228,0.24)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-34, -78);
  ctx.lineTo(-43, -60);
  ctx.stroke();

  // Tail light
  ctx.fillStyle = '#ff4a3d';
  ctx.fillRect(-104, -52, 3.5, 8);

  // Drag hardware
  drawWheelieBars(ctx, -104, -16, 20);
  if (spec.number) drawDoorNumber(ctx, 2, -44, 11, spec.number);
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, v: CarView, now: number): void {
  const spec = v.spec;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();    ctx.ellipse(6, 3, 118, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Underglow
  const glow = ctx.createRadialGradient(0, -6, 4, 0, -6, 130);
  glow.addColorStop(0, `${spec.glow}66`);
  glow.addColorStop(1, `${spec.glow}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, -4, 128, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nitrous flame
  if (v.nos) {
    const flick = 0.7 + Math.abs(Math.sin(now * 42)) * 0.6;
    const len = 46 * flick;
    const flame = ctx.createLinearGradient(-104, -34, -104 - len, -34);
    flame.addColorStop(0, 'rgba(140,220,255,0.95)');
    flame.addColorStop(0.45, 'rgba(80,150,255,0.6)');
    flame.addColorStop(1, 'rgba(90,120,255,0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-104, -44);
    ctx.lineTo(-104 - len, -36 + Math.sin(now * 30) * 3);
    ctx.lineTo(-104, -26);
    ctx.closePath();
    ctx.fill();
  }

  if (spec.shape === 'truck') {
    drawTruckBody(ctx, spec);
  } else {
    // Body: long nose, low roof, kicked-up tail
    const paint = ctx.createLinearGradient(0, -92, 0, -8);
    paint.addColorStop(0, spec.body);
    paint.addColorStop(0.55, spec.body);
    paint.addColorStop(1, spec.bodyDark);
    ctx.beginPath();
    ctx.moveTo(108, -10);
    ctx.lineTo(112, -16);
    ctx.lineTo(110, -26);
    ctx.quadraticCurveTo(109, -42, 100, -48);
    ctx.lineTo(86, -52);
    ctx.lineTo(50, -54);
    ctx.lineTo(32, -55);
    ctx.lineTo(14, -88);
    ctx.quadraticCurveTo(6, -92, -8, -92);
    ctx.lineTo(-32, -90);
    ctx.lineTo(-54, -68);
    ctx.lineTo(-90, -65);
    ctx.lineTo(-104, -62);
    ctx.lineTo(-110, -36);
    ctx.lineTo(-106, -11);
    ctx.closePath();
    ctx.fillStyle = paint;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Tubbed rear arches
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.arc(-64, -30, 34, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(66, -22, 26, Math.PI, Math.PI * 2);
    ctx.fill();

    // Flared rear lip
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-64, -30, 34, Math.PI + 0.15, Math.PI * 2 - 0.15);
    ctx.stroke();

    // Greenhouse
    ctx.beginPath();
    ctx.moveTo(32, -55);
    ctx.lineTo(20, -78);
    ctx.lineTo(-6, -82);
    ctx.lineTo(-32, -80);
    ctx.lineTo(-52, -67);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,12,26,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,255,0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Windscreen sheen
    ctx.beginPath();
    ctx.moveTo(28, -58);
    ctx.lineTo(19, -76);
    ctx.lineTo(11, -77);
    ctx.lineTo(20, -59);
    ctx.closePath();
    ctx.fillStyle = 'rgba(150,196,255,0.15)';
    ctx.fill();

    // Roll cage behind the glass
    ctx.strokeStyle = 'rgba(206,216,236,0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-24, -81);
    ctx.lineTo(-34, -66);
    ctx.lineTo(-16, -81);
    ctx.stroke();

    // Cowl scoop in body colour
    drawScoop(ctx, 42, 86, -64, -54, spec.body, spec.bodyDark);

    // Rocker stripe
    ctx.strokeStyle = spec.accent;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-100, -28);
    ctx.lineTo(100, -30);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Drag wing on visible struts
    ctx.fillStyle = '#15151f';
    ctx.beginPath();
    ctx.moveTo(-114, -84);
    ctx.lineTo(-82, -87);
    ctx.lineTo(-82, -81);
    ctx.lineTo(-114, -78);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#2e2e42';
    ctx.fillRect(-63, -82, 4, 15);
    ctx.fillRect(-79, -83, 4, 17);

    // Drag hardware
    drawWheelieBars(ctx, -104, -14, 20);
    if (spec.number) drawDoorNumber(ctx, -6, -36, 14, spec.number);
  }

  // Headlight
  const lampY = spec.shape === 'truck' ? -40 : -46;
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.ellipse(96, lampY, 7, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const lamp = ctx.createRadialGradient(100, lampY, 1, 100, lampY, 44);
  lamp.addColorStop(0, 'rgba(255,246,190,0.5)');
  lamp.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(100, lampY, 44, 0, Math.PI * 2);
  ctx.fill();

  // Wheels: fat slick out back, skinny runner up front
  if (spec.shape === 'truck') {
    drawWheel(ctx, -68, -29, 29, v.spinAngle, spec.accent, 'slick');
    drawWheel(ctx, 60, -21, 21, v.spinAngle * 1.14, spec.accent, 'runner');
  } else {
    drawWheel(ctx, -64, -30, 30, v.spinAngle, spec.accent, 'slick');
    drawWheel(ctx, 66, -22, 22, v.spinAngle * 1.14, spec.accent, 'runner');
  }

  ctx.restore();

  // Tyre smoke while the launch is spinning up
  if (v.spin > 0.35) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.4, v.spin * 0.4);
    ctx.fillStyle = '#c9ccdb';
    for (let i = 0; i < 3; i += 1) {
      const p = ((now * 1.6 + i * 0.33) % 1);
      ctx.beginPath();
      ctx.arc(x - 68 * scale - p * 42, baseY - 14 - p * 26, 6 + p * 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, s: SceneInput): void {
  const { w, h, now, scroll } = s;
  const horizon = Math.round(h * 0.46);
  const laneH = h - horizon;
  const rivalBase = horizon + laneH * 0.45;
  const playerBase = horizon + laneH * 0.85;
  const dividerY = horizon + laneH * 0.55;
  const carX = w * 0.34;
  const scale = clamp(Math.min(laneH / 300, w / 540), 0.52, 1.22);

  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, horizon);
  drawCity(ctx, w, horizon, scroll);
  drawStands(ctx, w, horizon, scroll);

  // Track surface
  const asphalt = ctx.createLinearGradient(0, horizon, 0, h);
  asphalt.addColorStop(0, '#1a1a26');
  asphalt.addColorStop(0.5, '#101018');
  asphalt.addColorStop(1, '#0a0a10');
  ctx.fillStyle = asphalt;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Fine surface grain
  ctx.fillStyle = 'rgba(255,255,255,0.022)';
  const grainOff = scroll % 120;
  for (let y = horizon + 8; y < h; y += 11) {
    ctx.fillRect(-grainOff, y, w + 120, 1);
  }

  drawBarrier(ctx, w, horizon + 4, scroll);

  // Scrolling lane dashes
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3;
  ctx.setLineDash([34, 30]);
  ctx.lineDashOffset = -(scroll % 64);
  ctx.beginPath();
  ctx.moveTo(0, dividerY);
  ctx.lineTo(w, dividerY);
  ctx.stroke();
  ctx.restore();

  // Near kerb
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, h - 8, w, 3);
  const kerbOff = scroll % 34;
  for (let x = -34; x < w + 34; x += 34) {
    ctx.fillStyle = 'rgba(255,64,88,0.18)';
    ctx.fillRect(x - kerbOff, h - 14, 17, 6);
  }

  // Distance boards every 100 m, plus the finish gantry
  ctx.textAlign = 'center';
  for (let m = 0; m <= 400; m += 100) {
    const dx = carX + aheadX(m - s.playerDist, w);
    if (dx < -60 || dx > w + 60) continue;
    const depth = clamp(1 - (dx / w) * 0.5, 0.5, 1);
    ctx.globalAlpha = 0.5 * depth + 0.2;
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(dx - 15 * depth, horizon - 30 * depth, 30 * depth, 30 * depth);
    ctx.strokeStyle = 'rgba(160,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 15 * depth, horizon - 30 * depth, 30 * depth, 30 * depth);
    ctx.fillStyle = '#9fd4ff';
    ctx.font = `700 ${Math.round(13 * depth)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(String(m), dx, horizon - 9 * depth);
    ctx.globalAlpha = 1;
  }

  // Start line
  const startX = carX + aheadX(0 - s.playerDist, w);
  if (startX > -40 && startX < w + 40) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(startX - 2, horizon, 4, h - horizon);
  }

  // Finish line + gantry
  const finishX = carX + aheadX(402.336 - s.playerDist, w);
  if (finishX > -120 && finishX < w + 120) {
    const cell = 12;
    for (let y = horizon + 6; y < h; y += cell) {
      for (let i = 0; i < 2; i += 1) {
        ctx.fillStyle = (Math.floor((y - horizon) / cell) + i) % 2 === 0 ? '#eef1ff' : '#14141e';
        ctx.fillRect(finishX - 16 + i * cell, y, cell, cell);
      }
    }
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(finishX - 22, horizon - 44, 44, 18);
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(finishX - 22, horizon - 44, 44, 18);
    ctx.fillStyle = '#7fe0ff';
    ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('402m', finishX, horizon - 31);
  }

  // Speed streaks
  const fast = clamp(s.player.v / 70, 0, 1);
  if (fast > 0.25) {
    ctx.save();
    ctx.strokeStyle = `rgba(190,215,255,${0.05 + fast * 0.16})`;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i += 1) {
      const seedY = ((i * 137) % 100) / 100;
      const y = horizon + seedY * (h - horizon);
      const len = 60 + fast * 130;
      const x = ((now * (260 + i * 40) * fast + i * 220) % (w + 400)) - 200;
      ctx.beginPath();
      ctx.moveTo(w - x, y);
      ctx.lineTo(w - x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cars (rival sits in the deeper lane)
  const rivalGap = gapX(s.rivalDist - s.playerDist, w);
  drawCar(ctx, carX + rivalGap, rivalBase, scale * 0.84, s.rival, now);
  drawCar(ctx, carX, playerBase, scale, s.player, now);

  // Bottom vignette so the pedals sit on something solid
  const fade = ctx.createLinearGradient(0, h - 46, 0, h);
  fade.addColorStop(0, 'rgba(5,5,10,0)');
  fade.addColorStop(1, 'rgba(5,5,10,0.65)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, h - 46, w, 46);
}

/** Draws a single car on a studio backdrop (garage thumbnails, livery preview). */
export function drawCarPreview(
  ctx: CanvasRenderingContext2D,
  spec: CarSpec,
  w: number,
  h: number,
): void {
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#13131f');
  bg.addColorStop(1, '#08080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const pool = ctx.createRadialGradient(w * 0.5, h * 0.9, 2, w * 0.5, h * 0.9, w * 0.55);
  pool.addColorStop(0, `${spec.glow}33`);
  pool.addColorStop(1, `${spec.glow}00`);
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);

  const scale = Math.min(w / 250, h / 118);
  drawCar(
    ctx,
    w / 2,
    h * 0.8,
    scale,
    {
      spec,
      rpm: spec.idle,
      v: 0,
      spinAngle: 0,
      spin: 0,
      nos: false,
      launched: false,
      finished: false,
    },
    0,
  );
}
