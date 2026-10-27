// Draws the app icons with a tiny software rasteriser, so there is no image
// dependency in the repo. Emits both the web icons and, when the Android
// project exists, the launcher mipmaps.
//
//   node tools/gen-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'icons');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
mkdirSync(OUT, { recursive: true });

/* ───────────────────────────── png writer ──────────────────────── */

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

/* ───────────────────────────── drawing ─────────────────────────── */

const PLATE_FROM = [226, 112, 58];
const PLATE_TO = [154, 68, 24];
const PLATE_BASE = [26, 25, 23];
const INK = [255, 247, 240];

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function roundedRectSdf(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

// The integral sign: an S-shaped spine with a semicircular hook curling off
// each end, sampled into points so a plain distance test can draw it.
function integralPoints(size, pad) {
  const top = pad;
  const bottom = size - pad;
  const cx = size / 2;
  const midY = (top + bottom) / 2;
  const lean = size * 0.1;
  const bend = size * 0.17;
  const hook = size * 0.057;

  const p0 = [cx - lean, bottom];
  const p1 = [cx + bend, bottom - (bottom - top) * 0.34];
  const p2 = [cx - bend, top + (bottom - top) * 0.34];
  const p3 = [cx + lean, top];

  const pts = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }

  const hx = p3[0] - hook;
  const hy = p3[1];
  const topHook = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI;
    topHook.push([hx + hook * Math.cos(a), hy - hook * Math.sin(a)]);
  }
  // The glyph has point symmetry about its middle, so the bottom hook is the
  // top one rotated by half a turn.
  const bottomHook = topHook.map(([x, y]) => [2 * cx - x, 2 * midY - y]);

  return pts.concat(topHook, bottomHook);
}

const pointCache = new Map();

function integralSdf(px, py, size, pad) {
  const key = `${size}|${pad}`;
  let pts = pointCache.get(key);
  if (!pts) {
    pts = integralPoints(size, pad);
    pointCache.set(key, pts);
  }
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const dx = px - pts[i][0];
    const dy = py - pts[i][1];
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * shape:    'rounded' | 'circle' | 'square' — the plate outline
 * plate:    draw the gradient plate at all (false = glyph on transparent)
 * glyph:    draw the integral sign
 * glyphPad: space above and below the glyph, as a fraction of the canvas
 */
function render(size, {
  shape = 'rounded', plate = true, glyph = true, glyphPad = 0.235, strokeScale = 0.052,
} = {}) {
  const out = Buffer.alloc(size * size * 4);
  const ss = 3; // supersampling
  const inset = shape === 'square' ? 0 : shape === 'circle' ? size * 0.02 : size * 0.055;
  const radius = shape === 'square' ? 0 : shape === 'circle' ? size * 0.5 : size * 0.235;
  const pad = size * glyphPad;
  const stroke = size * strokeScale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;

          const ink = glyph
            ? clamp01((stroke / 2 - integralSdf(px, py, size, pad)) / 1.2 + 0.5)
            : 0;

          let coverage;
          let col;
          if (plate) {
            const d = roundedRectSdf(px, py, size / 2, size / 2,
              size / 2 - inset, size / 2 - inset, radius);
            coverage = clamp01(0.5 - d);
            if (coverage <= 0) continue;
            const t = clamp01((px / size) * 0.55 + (py / size) * 0.45);
            col = mix(mix(PLATE_FROM, PLATE_TO, t), PLATE_BASE, 0.2 + 0.32 * t);
            // Specular sheen across the top-left corner.
            const sheen = clamp01(1 - (px + py) / (size * 0.95));
            col = mix(col, [255, 255, 255], sheen * 0.16);
            col = mix(col, INK, ink);
          } else {
            if (ink <= 0) continue;
            coverage = ink;
            col = INK;
          }

          r += col[0] * coverage;
          g += col[1] * coverage;
          b += col[2] * coverage;
          a += coverage;
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        out[i] = Math.round(r / a);
        out[i + 1] = Math.round(g / a);
        out[i + 2] = Math.round(b / a);
        out[i + 3] = Math.round((a / (ss * ss)) * 255);
      }
    }
  }
  return out;
}

const write = (path, size, opts) => {
  writePng(path, size, size, render(size, opts));
  console.log(path.replace(`${ROOT}/`, ''));
};

/* ───────────────────────────── web icons ───────────────────────── */

write(join(OUT, 'icon-192.png'), 192, {});
write(join(OUT, 'icon-512.png'), 512, {});
// Maskable needs its content inside the safe circle, so the plate fills the
// canvas and the glyph sits well inside it.
write(join(OUT, 'icon-maskable-512.png'), 512, { shape: 'circle', glyphPad: 0.37 });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2703a"/>
      <stop offset="1" stop-color="#9a4418"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff7f0" stop-opacity=".24"/>
      <stop offset=".5" stop-color="#fff7f0" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="28" y="28" width="456" height="456" rx="120" fill="#1a1917"/>
  <rect x="28" y="28" width="456" height="456" rx="120" fill="url(#g)" opacity=".62"/>
  <rect x="28" y="28" width="456" height="456" rx="120" fill="url(#s)"/>
  <path d="M196 372c0 22 14 34 32 34 20 0 32-14 32-40V170c0-40 26-64 60-64 24 0 40 14 40 34 0 12-8 20-19 20-10 0-18-7-18-17 0-10 6-14 6-20 0-5-4-9-11-9-14 0-22 12-22 38v212c0 42-26 66-62 66-26 0-44-15-44-36 0-12 8-21 19-21 10 0 18 7 18 17 0 9-6 13-6 19 0 4 3 8 10 8z" fill="#fff7f0"/>
  <rect x="28" y="28" width="456" height="456" rx="120" fill="none" stroke="#fff7f0" stroke-opacity=".18" stroke-width="2"/>
</svg>
`;
writeFileSync(join(OUT, 'icon.svg'), svg);
console.log('icons/icon.svg');

/* ─────────────────────────── android icons ─────────────────────── */

if (existsSync(ANDROID_RES)) {
  // Legacy launcher icons, and the two layers of the adaptive icon. Adaptive
  // layers are 108dp with only the middle 72dp guaranteed visible, so the
  // foreground glyph is generously padded.
  const densities = [
    ['mdpi', 48, 108],
    ['hdpi', 72, 162],
    ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324],
    ['xxxhdpi', 192, 432],
  ];

  for (const [density, legacy, adaptive] of densities) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    write(join(dir, 'ic_launcher.png'), legacy, {});
    write(join(dir, 'ic_launcher_round.png'), legacy, { shape: 'circle', glyphPad: 0.3 });
    write(join(dir, 'ic_launcher_background.png'), adaptive, { shape: 'square', glyph: false });
    write(join(dir, 'ic_launcher_foreground.png'), adaptive, {
      plate: false, glyphPad: 0.21, strokeScale: 0.045,
    });
  }

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  const anydpi = join(ANDROID_RES, 'mipmap-anydpi-v26');
  mkdirSync(anydpi, { recursive: true });
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    writeFileSync(join(anydpi, name), adaptiveXml);
    console.log(`android/app/src/main/res/mipmap-anydpi-v26/${name}`);
  }
}
