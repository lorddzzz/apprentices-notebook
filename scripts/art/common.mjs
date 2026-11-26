/**
 * Shared helpers for `process.mjs` and `sheet.mjs` (UA-2). Plain ESM for Node >= 24: the art
 * contract (roles, sizes, ground points) is imported from `src/ui/art/spec.ts` so there is one
 * source of truth, and `art:check` is reused as the final proof.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export const require = createRequire(import.meta.url);
export const sharp = require('sharp');

export {
  GROUND_TOLERANCE,
  MASTER_STORE,
  parseArtId,
  ROLE_RULES,
  roleProblems,
  TRANSPARENT_BELOW,
} from '../../src/ui/art/spec.ts';

export const PROCESSOR = 'art-process@1';
export const SOLID = 250;
export const PARTIAL_MIN = 8;

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
export const fail = (msg) => {
  console.error(`art: ${msg}`);
  process.exit(1);
};

/** "12,34" or "12x34" → [12, 34]; null when absent. */
export function pair(text, what, n = 2) {
  if (text === undefined) return null;
  const parts = String(text).split(/[,x]/).map(Number);
  if (parts.length !== n || parts.some((v) => !Number.isFinite(v))) {
    fail(`${what} must be ${n} numbers (got "${text}")`);
  }
  return parts;
}

export async function loadRgba(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function hasTransparency(rgba, below = SOLID) {
  for (let i = 3; i < rgba.data.length; i += 4) if (rgba.data[i] < below) return true;
  return false;
}

/**
 * The matte-fringe test (UA-D14 risk 2). A partial-alpha pixel's colour should be the colour of
 * the solid pixels beside it; a background-removal fringe carries the matte (white or black)
 * instead. Returns the mean luminance step and the share of pixels that step the same way.
 */
export function haloReport(rgba, radius = 3) {
  const { data, w, h } = rgba;
  const a = (x, y) => data[(y * w + x) * 4 + 3];
  const solid = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (a(nx, ny) < SOLID) return false;
      }
    }
    return true;
  };
  let count = 0;
  let sum = 0;
  let light = 0;
  let dark = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const al = a(x, y);
      if (al < PARTIAL_MIN || al >= SOLID) continue;
      const ref = nearestSolid(data, w, h, x, y, radius, solid);
      if (!ref) continue;
      const i = (y * w + x) * 4;
      const d = lum(data[i], data[i + 1], data[i + 2]) - ref.l;
      count++;
      sum += d;
      if (d > 25) light++;
      if (d < -25) dark++;
    }
  }
  const mean = count ? sum / count : 0;
  const share = count ? Math.max(light, dark) / count : 0;
  const kind = mean > 0 ? 'light' : 'dark';
  const halo = count >= 24 && Math.abs(mean) > 40 && share >= 0.6;
  return { partial: count, mean, share, halo, kind };
}

function nearestSolid(data, w, h, x, y, radius, solid) {
  let best = null;
  let bd = Number.POSITIVE_INFINITY;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const d = dx * dx + dy * dy;
      if (d >= bd || !solid(nx, ny)) continue;
      const i = (ny * w + nx) * 4;
      bd = d;
      best = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        l: lum(data[i], data[i + 1], data[i + 2]),
      };
    }
  }
  return best;
}

/** `--defringe`: partial-alpha pixels take the colour of the nearest solid pixel. */
export function defringe(rgba, radius = 3) {
  const { data, w, h } = rgba;
  const out = Buffer.from(data);
  const solid = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (data[(ny * w + nx) * 4 + 3] < SOLID) return false;
      }
    }
    return true;
  };
  let fixed = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const al = data[i + 3];
      if (al < 1 || al >= SOLID) continue;
      const ref = nearestSolid(data, w, h, x, y, radius, solid);
      if (!ref) continue;
      out[i] = ref.r;
      out[i + 1] = ref.g;
      out[i + 2] = ref.b;
      fixed++;
    }
  }
  return { rgba: { data: out, w, h }, fixed };
}

/** Straight-alpha "over" of one source pixel onto an RGBA buffer. */
export function over(dst, di, r, g, b, a) {
  const sa = a / 255;
  const da = dst[di + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  dst[di] = Math.round((r * sa + dst[di] * da * (1 - sa)) / oa);
  dst[di + 1] = Math.round((g * sa + dst[di + 1] * da * (1 - sa)) / oa);
  dst[di + 2] = Math.round((b * sa + dst[di + 2] * da * (1 - sa)) / oa);
  dst[di + 3] = Math.round(oa * 255);
}

/** Blits `src` onto `dst` at (left, top); returns the count of visible source pixels cut off per side. */
export function blit(dst, dw, dh, src, sw, sh, left, top) {
  const cut = { top: 0, left: 0, right: 0, bottom: 0 };
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = (y * sw + x) * 4;
      const a = src[si + 3];
      if (a === 0) continue;
      const tx = left + x;
      const ty = top + y;
      if (a >= 16) {
        if (ty < 0) cut.top++;
        else if (ty >= dh) cut.bottom++;
        if (tx < 0) cut.left++;
        else if (tx >= dw) cut.right++;
      }
      if (tx < 0 || ty < 0 || tx >= dw || ty >= dh) continue;
      over(dst, (ty * dw + tx) * 4, src[si], src[si + 1], src[si + 2], a);
    }
  }
  return cut;
}

/** The standard soft ground shadow (down-right, #101820): composed by the processor, never generated. */
export function paintShadow(dst, dw, dh, gx, gy, k) {
  const cx = gx + 6 * k;
  const cy = gy + 2 * k;
  const rx = 30 * k;
  const ry = 8 * k;
  for (let y = Math.max(0, Math.floor(cy - ry * 1.3)); y < Math.min(dh, cy + ry * 1.3); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx * 1.3)); x < Math.min(dw, cx + rx * 1.3); x++) {
      const d2 = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d2 > 1.7) continue;
      const a = 0.42 * Math.exp(-d2 * 2.2);
      over(dst, (y * dw + x) * 4, 16, 24, 32, Math.round(a * 255));
    }
  }
}

/** Centred or focal "cover" crop window for a source of (w,h) into a target aspect. */
export function coverWindow(w, h, tw, th, focal = [0.5, 0.5]) {
  const scale = Math.max(tw / w, th / h);
  const cw = Math.min(w, Math.round(tw / scale));
  const ch = Math.min(h, Math.round(th / scale));
  const left = Math.max(0, Math.min(w - cw, Math.round(focal[0] * w - cw / 2)));
  const top = Math.max(0, Math.min(h - ch, Math.round(focal[1] * h - ch / 2)));
  return { left, top, width: cw, height: ch };
}

// ── Tiles ──

const smooth = (t) => t * t * (3 - 2 * t);

/** Offset-wrap blend: edges come from the half-shifted copy, so they wrap with no seam. */
export function makeSeamless(rgb, n) {
  const out = new Float32Array(rgb.length);
  const half = n >> 1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const mx = 1 - Math.abs(((x + 0.5) / n) * 2 - 1);
      const my = 1 - Math.abs(((y + 0.5) / n) * 2 - 1);
      const m = smooth(Math.min(mx, my));
      const si = (((y + half) % n) * n + ((x + half) % n)) * 3;
      const di = (y * n + x) * 3;
      for (let c = 0; c < 3; c++) out[di + c] = rgb[di + c] * m + rgb[si + c] * (1 - m);
    }
  }
  return out;
}

/** Pulls a tile's edge ring toward a reference tile's ring so variants share edge pixels. */
export function matchEdges(rgb, ref, n, band = 8) {
  const out = new Float32Array(rgb);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.min(x, y, n - 1 - x, n - 1 - y);
      if (d >= band) continue;
      const w = (1 - d / band) ** 1.5;
      const i = (y * n + x) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = rgb[i + c] * (1 - w) + ref[i + c] * w;
    }
  }
  return out;
}

export function floatToRgb(f) {
  const out = Buffer.alloc(f.length);
  for (let i = 0; i < f.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(f[i])));
  return out;
}

/** Mean abs RGB step between adjacent columns/rows inside a tile: what a "natural" seam looks like. */
export function internalStep(rgb, n) {
  let sum = 0;
  let cnt = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n - 1; x++) {
      for (let c = 0; c < 3; c++) {
        sum += Math.abs(rgb[(y * n + x) * 3 + c] - rgb[(y * n + x + 1) * 3 + c]);
        sum += Math.abs(rgb[(x * n + y) * 3 + c] - rgb[((x + 1) * n + y) * 3 + c]);
        cnt += 2;
      }
    }
  }
  return sum / cnt;
}

/** Mean abs RGB step across the joint of `a` followed by `b` (dir 'h': a left of b; 'v': a above b). */
export function jointStep(a, b, n, dir) {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    for (let c = 0; c < 3; c++) {
      const ai = dir === 'h' ? (k * n + n - 1) * 3 + c : ((n - 1) * n + k) * 3 + c;
      const bi = dir === 'h' ? k * n * 3 + c : k * 3 + c;
      sum += Math.abs(a[ai] - b[bi]);
    }
  }
  return sum / (n * 3);
}

/**
 * The mixed-neighbour check (UA-D14): every ordered pair of a floor set must join (both
 * directions) no worse than `max(2.5 x natural step, natural step + 6)`.
 */
export function mixedSeamReport(tiles, n) {
  const natural = tiles.reduce((s, t) => s + internalStep(t.rgb, n), 0) / tiles.length;
  const limit = Math.max(natural * 2.5, natural + 6);
  const pairs = [];
  for (const a of tiles) {
    for (const b of tiles) {
      for (const dir of ['h', 'v']) {
        pairs.push({ a: a.name, b: b.name, dir, step: jointStep(a.rgb, b.rgb, n, dir) });
      }
    }
  }
  const bad = pairs.filter((p) => p.step > limit);
  return { natural, limit, pairs, bad, pass: bad.length === 0 };
}

// ── Sidecars and masters (UA-D15 / D4) ──

export const MASTERS_FILE = 'art-src/MASTERS.json';

export function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
}

/** Every sidecar under `art-src/` (recursive), as { id, file, json }. */
export function listSidecars(root) {
  const base = join(root, 'art-src');
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json') && e.name !== 'MASTERS.json') {
        try {
          const json = JSON.parse(readFileSync(p, 'utf8'));
          const id = p
            .slice(base.length + 1, -'.json'.length)
            .split('\\')
            .join('/');
          out.push({ id, file: p, json });
        } catch {
          // not a sidecar
        }
      }
    }
  };
  walk(base);
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
