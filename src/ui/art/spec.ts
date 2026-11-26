/**
 * The art contract (program C2/C3/C4, UF-P7, R10, R19, R26): asset paths, per-ROLE size and alpha
 * rules, budgets and the public metadata shape. Pure data and functions: the client, the Vite
 * metadata plugin and `scripts/art-check.ts` (run by Node with type stripping) all import it, so
 * it uses relative imports and erasable syntax only.
 */

export const ART_FAMILIES = [
  'scenes',
  'tiles',
  'props',
  'units',
  'portraits',
  'foes',
  'map',
  'ui-plates',
  'crests',
  'finds',
] as const;
export type ArtFamily = (typeof ART_FAMILIES)[number];

/** District scopes (= `DistrictId`, camelCase); a test keeps this equal to `DISTRICT_IDS`. */
export const DISTRICT_SCOPES = [
  'seam',
  'canals',
  'inkQuarter',
  'bathhouses',
  'bridges',
  'foundry',
  'cartographers',
  'lowerSeam',
  'inkedPage',
] as const;
export const ART_SCOPES = [...DISTRICT_SCOPES, 'home', 'city', 'shared'] as const;
export type ArtScope = (typeof ART_SCOPES)[number];

/** `<family>/<scope>/<subject>[-<state>]`: the asset path under `src/assets/art/` without `.webp`. */
export type ArtId = `${ArtFamily}/${string}`;

const SUBJECT = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;

export interface ArtPath {
  family: ArtFamily;
  scope: ArtScope;
  subject: string;
}

/** Splits an ArtId; null when the family, scope or subject breaks the path rule. */
export function parseArtId(id: string): ArtPath | null {
  const parts = id.split('/');
  if (parts.length !== 3) return null;
  const [family, scope, subject] = parts as [string, string, string];
  if (!(ART_FAMILIES as readonly string[]).includes(family)) return null;
  if (!(ART_SCOPES as readonly string[]).includes(scope)) return null;
  if (!SUBJECT.test(subject)) return null;
  return { family: family as ArtFamily, scope: scope as ArtScope, subject };
}

export function isArtId(id: string): id is ArtId {
  return parseArtId(id) !== null;
}

// ── Roles (UF-P7: rules are per role, never per family) ──

export const ART_ROLES = [
  'tile-opaque',
  'material-overlay-alpha',
  'figure',
  'boss-figure',
  'portrait',
  'card',
  'strip',
  'scene',
  'map-plate',
  'map-patch-with-bbox',
  'nine-slice',
] as const;
export type ArtRole = (typeof ART_ROLES)[number];

/** `required`: real transparency needed; `forbidden`: none allowed; `declared`: the sidecar's `alpha` decides. */
export type AlphaRule = 'required' | 'forbidden' | 'declared';

export interface RoleRule {
  /** Fixed width, or null when the sidecar declares it. */
  w: number | null;
  /** Fixed height, or null when free / declared. */
  h: number | null;
  alpha: AlphaRule;
  /** Where the declared ground-contact point must land (C4), within `GROUND_TOLERANCE`. */
  ground?: readonly [number, number];
  needsBbox?: true;
  needsSlice?: true;
}

/** The master frame map patches are cropped from (R19, UT-D8). */
export const MAP_MASTER = { w: 750, h: 3800 } as const;

export const ROLE_RULES: Readonly<Record<ArtRole, RoleRule>> = {
  'tile-opaque': { w: 128, h: 128, alpha: 'forbidden' },
  'material-overlay-alpha': { w: 128, h: 128, alpha: 'required' },
  figure: { w: 128, h: 176, alpha: 'required', ground: [64, 160] },
  'boss-figure': { w: 192, h: 256, alpha: 'required', ground: [96, 232] },
  portrait: { w: 192, h: 192, alpha: 'forbidden' },
  card: { w: 222, h: 330, alpha: 'forbidden' },
  // Width 750 unless the sidecar declares another; height free; opaque unless the sidecar says alpha.
  strip: { w: null, h: null, alpha: 'declared' },
  scene: { w: 750, h: null, alpha: 'forbidden' },
  'map-plate': { w: MAP_MASTER.w, h: MAP_MASTER.h, alpha: 'forbidden' },
  'map-patch-with-bbox': { w: null, h: null, alpha: 'required', needsBbox: true },
  'nine-slice': { w: null, h: null, alpha: 'required', needsSlice: true },
};

/** Pixels from the declared ground contact to the role's baseline point that still pass. */
export const GROUND_TOLERANCE = 4;
/**
 * "Real" transparency: at least one pixel with alpha below this. An alpha channel whose pixels
 * are all at or above it counts as opaque (encoder noise at 250–254 is not transparency).
 */
export const TRANSPARENT_BELOW = 250;

// ── Budgets (C5, UA-D13; decimal megabytes: 1 MB = 1,000,000 bytes) ──

export const MB = 1_000_000;
export type BudgetGroup = 'shared+home' | 'map' | (typeof DISTRICT_SCOPES)[number];
export const BUDGETS = {
  sharedHome: 4.5 * MB,
  district: 1.5 * MB,
  map: 0.8 * MB,
  total: 15 * MB,
} as const;

/** Which budget an asset counts against: the `map` family, its district, else shared + home (+ city). */
export function budgetGroup(path: ArtPath): BudgetGroup {
  if (path.family === 'map') return 'map';
  if ((DISTRICT_SCOPES as readonly string[]).includes(path.scope)) {
    return path.scope as BudgetGroup;
  }
  return 'shared+home';
}

export function budgetFor(group: BudgetGroup): number {
  if (group === 'map') return BUDGETS.map;
  if (group === 'shared+home') return BUDGETS.sharedHome;
  return BUDGETS.district;
}

// ── Precache (vite.config.ts workbox) ──

/** Every shipped file type the service worker precaches (art is WebP, fonts WOFF2). */
export const PRECACHE_GLOBS = ['**/*.{js,css,html,svg,png,ico,webmanifest,webp,woff2}'];
/** Workbox skips larger files silently; `art:check` fails any asset above it instead. */
export const PRECACHE_MAX_BYTES = 2 * 1024 * 1024;

// ── Master record (D4 / UA-D15) ──

/**
 * `archive` (D4 ruling, 2026-11-26): masters live in the external archive; the sidecar's
 * `master.sha256` must match an entry in `art-src/MASTERS.json` with an archive key, and a master
 * present locally must hash to it. `git`: the master file itself is committed under `art-src/`.
 */
export type MasterStore = 'archive' | 'git';
export const MASTER_STORE: MasterStore = 'archive';

// ── Public metadata (R26) ──

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
/** What the client may know about an asset: nothing else from `art-src/` is bundled. */
export interface ArtMeta {
  role: ArtRole;
  /** Decoded size of the shipped file. */
  w: number;
  h: number;
  /** Shipped bytes. */
  bytes: number;
  /** Map patches: position in 750×3800 master pixels, top-left. */
  bbox?: Rect;
  /** Nine-slices: insets in source pixels. */
  slice?: Insets;
  /** Figures: the declared ground-contact point in source pixels. */
  ground?: { x: number; y: number };
}

/** The sidecar fields the checker and the metadata plugin read (UA briefs' SIDECAR). */
export interface Sidecar {
  role: ArtRole;
  size: [number, number];
  alpha?: boolean;
  groundContact?: [number, number] | null;
  bbox?: [number, number, number, number] | null;
  slice?: [number, number, number, number] | null;
  master?: { path?: string; sha256?: string } | null;
}

function isNums(v: unknown, n: number): v is number[] {
  return (
    Array.isArray(v) &&
    v.length === n &&
    v.every((x) => typeof x === 'number' && Number.isInteger(x) && x >= 0)
  );
}

/** Validates the shape of a parsed sidecar; returns the problems (empty = usable). */
export function sidecarProblems(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) return ['sidecar is not an object'];
  const s = raw as Record<string, unknown>;
  const out: string[] = [];
  if (!(ART_ROLES as readonly unknown[]).includes(s.role))
    out.push(`unknown role ${String(s.role)}`);
  if (!isNums(s.size, 2)) out.push('size must be [w, h]');
  if (s.alpha !== undefined && typeof s.alpha !== 'boolean') out.push('alpha must be a boolean');
  if (s.groundContact != null && !isNums(s.groundContact, 2))
    out.push('groundContact must be [x, y]');
  if (s.bbox != null && !isNums(s.bbox, 4)) out.push('bbox must be [x, y, w, h]');
  if (s.slice != null && !isNums(s.slice, 4)) out.push('slice must be [top, right, bottom, left]');
  return out;
}

/** The public metadata entry for one asset, from its sidecar and the decoded file. */
export function toMeta(sidecar: Sidecar, w: number, h: number, bytes: number): ArtMeta {
  const meta: ArtMeta = { role: sidecar.role, w, h, bytes };
  if (sidecar.bbox) {
    const [x, y, bw, bh] = sidecar.bbox;
    meta.bbox = { x, y, w: bw, h: bh };
  }
  if (sidecar.slice) {
    const [top, right, bottom, left] = sidecar.slice;
    meta.slice = { top, right, bottom, left };
  }
  if (sidecar.groundContact) {
    const [x, y] = sidecar.groundContact;
    meta.ground = { x, y };
  }
  return meta;
}

export interface Decoded {
  w: number;
  h: number;
  /** Some pixel has alpha below `TRANSPARENT_BELOW`. */
  transparent: boolean;
}

/** The role rule checks on a decoded file (everything but the master record and budget). */
export function roleProblems(sidecar: Sidecar, file: Decoded): string[] {
  const rule = ROLE_RULES[sidecar.role];
  const out: string[] = [];
  const [sw, sh] = sidecar.size;
  if (file.w !== sw || file.h !== sh) {
    out.push(`decoded ${file.w}×${file.h} differs from sidecar size ${sw}×${sh}`);
  }
  if ((rule.w !== null && sw !== rule.w) || (rule.h !== null && sh !== rule.h)) {
    out.push(
      `role ${sidecar.role} is ${rule.w ?? 'any'}×${rule.h ?? 'any'}, sidecar says ${sw}×${sh}`,
    );
  }
  const needs = rule.alpha === 'declared' ? (sidecar.alpha ? 'required' : 'forbidden') : rule.alpha;
  if (rule.alpha !== 'declared' && sidecar.alpha !== undefined) {
    if (sidecar.alpha !== (rule.alpha === 'required')) {
      out.push(`sidecar alpha ${sidecar.alpha} contradicts role ${sidecar.role}`);
    }
  }
  if (needs === 'forbidden' && file.transparent) {
    out.push(`role ${sidecar.role} is opaque but the file has real transparency`);
  }
  if (needs === 'required' && !file.transparent) {
    out.push(`role ${sidecar.role} needs alpha but no pixel is transparent`);
  }
  if (rule.ground) {
    const g = sidecar.groundContact;
    if (!g) out.push(`role ${sidecar.role} must declare groundContact`);
    else if (
      Math.abs(g[0] - rule.ground[0]) > GROUND_TOLERANCE ||
      Math.abs(g[1] - rule.ground[1]) > GROUND_TOLERANCE
    ) {
      out.push(
        `groundContact ${g[0]},${g[1]} is not at ${rule.ground[0]},${rule.ground[1]} (±${GROUND_TOLERANCE})`,
      );
    }
  }
  if (rule.needsBbox) {
    const b = sidecar.bbox;
    if (!b) out.push('map patch must declare bbox');
    else {
      const [x, y, bw, bh] = b;
      if (bw <= 0 || bh <= 0 || x + bw > MAP_MASTER.w || y + bh > MAP_MASTER.h) {
        out.push(`bbox ${b.join(',')} is outside the ${MAP_MASTER.w}×${MAP_MASTER.h} master`);
      }
      if (bw !== file.w || bh !== file.h) {
        out.push(`patch ${file.w}×${file.h} differs from bbox size ${bw}×${bh}`);
      }
    }
  }
  if (rule.needsSlice) {
    const s = sidecar.slice;
    if (!s) out.push('nine-slice must declare slice insets');
    else {
      const [top, right, bottom, left] = s;
      if (top + bottom >= file.h || left + right >= file.w) {
        out.push(`slice ${s.join(',')} does not fit inside ${file.w}×${file.h}`);
      }
    }
  }
  return out;
}

// ── WebP container header (RIFF; VP8 / VP8L / VP8X) ──

export interface WebpHeader {
  w: number;
  h: number;
  /** The container may carry alpha (VP8X flag / ALPH chunk, or VP8L's alpha hint). */
  mayHaveAlpha: boolean;
}

/** Reads size and the alpha hint from a WebP's header; null when it is not a WebP. */
export function readWebpHeader(buf: Uint8Array): WebpHeader | null {
  const ascii = (at: number) => String.fromCharCode(...buf.subarray(at, at + 4));
  if (buf.length < 30 || ascii(0) !== 'RIFF' || ascii(8) !== 'WEBP') return null;
  const u24 = (at: number) =>
    (buf[at] ?? 0) | ((buf[at + 1] ?? 0) << 8) | ((buf[at + 2] ?? 0) << 16);
  const u16 = (at: number) => (buf[at] ?? 0) | ((buf[at + 1] ?? 0) << 8);
  const chunk = ascii(12);
  if (chunk === 'VP8X') {
    const flags = buf[20] ?? 0;
    return { w: u24(24) + 1, h: u24(27) + 1, mayHaveAlpha: (flags & 0x10) !== 0 };
  }
  if (chunk === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits =
      ((buf[21] ?? 0) | ((buf[22] ?? 0) << 8) | ((buf[23] ?? 0) << 16) | ((buf[24] ?? 0) << 24)) >>>
      0;
    return {
      w: (bits & 0x3fff) + 1,
      h: ((bits >>> 14) & 0x3fff) + 1,
      mayHaveAlpha: ((bits >>> 28) & 1) === 1,
    };
  }
  if (chunk === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { w: u16(26) & 0x3fff, h: u16(28) & 0x3fff, mayHaveAlpha: false };
  }
  return null;
}
