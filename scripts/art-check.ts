/**
 * `pnpm art:check` (C3/C5, UF-P7): every shipped WebP under `src/assets/art/` is decoded and checked
 * against the ROLE its sidecar (`art-src/<ArtId>.json`) declares, its master record (D4 switch in
 * `spec.ts`) and the per-scope budgets; prints the budget table; exits 1 on any failure.
 * Also exports the Vite plugin that turns sidecars into the public `artMeta` module (R26).
 *
 * Usage: node --experimental-strip-types scripts/art-check.ts [--root <dir>] [--masters archive|git]
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import {
  type ArtMeta,
  BUDGETS,
  type BudgetGroup,
  budgetFor,
  budgetGroup,
  type Decoded,
  MASTER_STORE,
  type MasterStore,
  MB,
  PRECACHE_MAX_BYTES,
  parseArtId,
  readWebpHeader,
  roleProblems,
  type Sidecar,
  sidecarProblems,
  TRANSPARENT_BELOW,
  toMeta,
} from '../src/ui/art/spec.ts';

export const ART_DIR = 'src/assets/art';
export const SRC_DIR = 'art-src';
export const MASTERS_FILE = 'art-src/MASTERS.json';

// ── Decoding ──

/** The slice of sharp's API used here (sharp is not a direct dependency until UA Pack A, R11). */
export type SharpLike = (input: Uint8Array | string, opts?: Record<string, unknown>) => SharpImage;
interface SharpImage {
  ensureAlpha(): SharpImage;
  extractChannel(c: number): SharpImage;
  raw(): SharpImage;
  webp(opts?: Record<string, unknown>): SharpImage;
  toBuffer(opts: { resolveWithObject: true }): Promise<{
    data: Uint8Array;
    info: { width: number; height: number; channels: number };
  }>;
  toBuffer(): Promise<Uint8Array>;
}

let sharpCache: SharpLike | null | undefined;

/** sharp as a direct dependency when present, else the copy `@vite-pwa/assets-generator` ships. */
export async function loadSharp(): Promise<SharpLike | null> {
  if (sharpCache !== undefined) return sharpCache;
  const req = createRequire(import.meta.url);
  for (const from of [import.meta.url, '@vite-pwa/assets-generator']) {
    try {
      const base = from === import.meta.url ? req : createRequire(req.resolve(from));
      const mod = base('sharp') as SharpLike | { default: SharpLike };
      sharpCache = typeof mod === 'function' ? mod : mod.default;
      return sharpCache;
    } catch {
      // try the next location
    }
  }
  sharpCache = null;
  return null;
}

/** Decodes a WebP: size from the pixels when sharp is available, alpha by scanning every pixel. */
export async function decodeWebp(buf: Uint8Array): Promise<Decoded | string> {
  const header = readWebpHeader(buf);
  if (!header) return 'not a WebP file';
  const sharp = await loadSharp();
  if (!sharp) {
    if (header.mayHaveAlpha) return 'cannot decode alpha: sharp is not installed';
    return { w: header.w, h: header.h, transparent: false };
  }
  try {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let transparent = false;
    for (const a of data) {
      if (a < TRANSPARENT_BELOW) {
        transparent = true;
        break;
      }
    }
    return { w: info.width, h: info.height, transparent };
  } catch (e) {
    return `does not decode: ${(e as Error).message}`;
  }
}

// ── Files ──

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.isFile() && !e.name.startsWith('.') ? [p] : [];
  });
}

/** Every file under the art dir, as ArtId-ish paths (posix, extension kept). */
export function listArtFiles(root: string): string[] {
  const base = join(root, ART_DIR);
  return walk(base)
    .map((p) => relative(base, p).split(sep).join('/'))
    .sort();
}

function readSidecar(root: string, id: string): Sidecar | string {
  const file = join(root, SRC_DIR, `${id}.json`);
  if (!existsSync(file)) return `missing sidecar ${SRC_DIR}/${id}.json`;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return `sidecar ${SRC_DIR}/${id}.json is not JSON`;
  }
  const bad = sidecarProblems(raw);
  return bad.length ? `sidecar: ${bad.join('; ')}` : (raw as Sidecar);
}

// ── Master record (D4) ──

interface MasterEntry {
  file: string;
  sha256: string;
  archiveKey?: string;
}

function readMasters(root: string): MasterEntry[] {
  const file = join(root, MASTERS_FILE);
  if (!existsSync(file)) return [];
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { masters?: MasterEntry[] };
  return raw.masters ?? [];
}

const sha256 = (buf: Uint8Array) => createHash('sha256').update(buf).digest('hex');
const SHA = /^[0-9a-f]{64}$/;

/** The master path relative to `art-src/` (sidecars may write it with or without the prefix). */
function masterRel(path: string): string {
  return path.replace(/^art-src\//, '');
}

export function masterProblems(
  root: string,
  id: string,
  sidecar: Sidecar,
  store: MasterStore,
  masters: readonly MasterEntry[],
): string[] {
  const m = sidecar.master;
  if (store === 'git') {
    const rel = masterRel(m?.path ?? `${id}.master.webp`);
    const file = join(root, SRC_DIR, rel);
    if (!existsSync(file)) return [`missing master record: ${SRC_DIR}/${rel} is not committed`];
    if (m?.sha256 && sha256(readFileSync(file)) !== m.sha256) {
      return [`master ${SRC_DIR}/${rel} does not match its sha256`];
    }
    return [];
  }
  if (!m?.path || !m.sha256 || !SHA.test(m.sha256)) {
    return ['missing master record: sidecar needs master.path and master.sha256'];
  }
  const rel = masterRel(m.path);
  const entry = masters.find((e) => e.file === rel);
  if (!entry) return [`missing master record: ${rel} is not in ${MASTERS_FILE}`];
  const out: string[] = [];
  if (entry.sha256 !== m.sha256)
    out.push(`master ${rel}: sidecar sha256 differs from ${MASTERS_FILE}`);
  if (!entry.archiveKey) out.push(`master ${rel}: no archiveKey in ${MASTERS_FILE}`);
  const local = join(root, SRC_DIR, rel);
  if (existsSync(local) && sha256(readFileSync(local)) !== entry.sha256) {
    out.push(`master ${rel}: local file does not match its archived sha256`);
  }
  return out;
}

// ── The check ──

export interface Problem {
  id: string;
  message: string;
}
export interface BudgetRow {
  group: BudgetGroup | 'total';
  files: number;
  bytes: number;
  budget: number;
  over: boolean;
}
export interface CheckResult {
  ok: boolean;
  files: number;
  problems: Problem[];
  table: BudgetRow[];
}
export interface CheckOptions {
  root?: string;
  masters?: MasterStore;
  /** Test hook: overrides the C5 budgets (bytes). */
  budgets?: Partial<Record<BudgetGroup | 'total', number>>;
}

export async function checkArt(opts: CheckOptions = {}): Promise<CheckResult> {
  const root = resolve(opts.root ?? process.cwd());
  const store = opts.masters ?? MASTER_STORE;
  const masters = store === 'archive' ? readMasters(root) : [];
  const problems: Problem[] = [];
  const totals = new Map<BudgetGroup, { files: number; bytes: number }>();
  const files = listArtFiles(root);

  for (const name of files) {
    if (!name.endsWith('.webp')) {
      problems.push({ id: name, message: 'only .webp files ship under src/assets/art' });
      continue;
    }
    const id = name.slice(0, -'.webp'.length);
    const path = parseArtId(id);
    if (!path) {
      problems.push({ id, message: 'path is not <family>/<scope>/<subject>[-<state>]' });
      continue;
    }
    const buf = readFileSync(join(root, ART_DIR, name));
    const group = budgetGroup(path);
    const t = totals.get(group) ?? { files: 0, bytes: 0 };
    totals.set(group, { files: t.files + 1, bytes: t.bytes + buf.length });
    if (buf.length > PRECACHE_MAX_BYTES) {
      problems.push({
        id,
        message: `${buf.length} bytes is over the precache cap ${PRECACHE_MAX_BYTES}`,
      });
    }
    const sidecar = readSidecar(root, id);
    if (typeof sidecar === 'string') {
      problems.push({ id, message: sidecar });
      continue;
    }
    const decoded = await decodeWebp(buf);
    if (typeof decoded === 'string') {
      problems.push({ id, message: decoded });
      continue;
    }
    for (const message of [
      ...roleProblems(sidecar, decoded),
      ...masterProblems(root, id, sidecar, store, masters),
    ]) {
      problems.push({ id, message });
    }
  }

  const budget = (g: BudgetGroup | 'total') =>
    opts.budgets?.[g] ?? (g === 'total' ? BUDGETS.total : budgetFor(g));
  const table: BudgetRow[] = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, t]) => ({ group, ...t, budget: budget(group), over: t.bytes > budget(group) }));
  const sum = table.reduce((a, r) => ({ files: a.files + r.files, bytes: a.bytes + r.bytes }), {
    files: 0,
    bytes: 0,
  });
  table.push({
    group: 'total',
    ...sum,
    budget: budget('total'),
    over: sum.bytes > budget('total'),
  });
  for (const row of table) {
    if (row.over) {
      problems.push({
        id: row.group,
        message: `scope over budget: ${mb(row.bytes)} MB > ${mb(row.budget)} MB`,
      });
    }
  }
  return { ok: problems.length === 0, files: files.length, problems, table };
}

const mb = (bytes: number) => (bytes / MB).toFixed(3);

export function formatTable(rows: readonly BudgetRow[]): string {
  const lines = [
    'Art budget (decimal MB: 1 MB = 1,000,000 bytes)',
    `${'scope'.padEnd(16)}${'files'.padStart(6)}${'MB'.padStart(10)}${'budget'.padStart(10)}  status`,
  ];
  for (const r of rows) {
    lines.push(
      `${r.group.padEnd(16)}${String(r.files).padStart(6)}${mb(r.bytes).padStart(10)}${mb(r.budget).padStart(10)}  ${r.over ? 'OVER' : 'ok'}`,
    );
  }
  return lines.join('\n');
}

// ── Public metadata (R26) ──

/** `artMeta` for every shipped asset with a usable sidecar: role, decoded size, bytes, bbox, slice. */
export function collectArtMeta(root: string): Record<string, ArtMeta> {
  const out: Record<string, ArtMeta> = {};
  for (const name of listArtFiles(root)) {
    if (!name.endsWith('.webp')) continue;
    const id = name.slice(0, -'.webp'.length);
    if (!parseArtId(id)) continue;
    const sidecar = readSidecar(root, id);
    if (typeof sidecar === 'string') continue;
    const file = join(root, ART_DIR, name);
    const header = readWebpHeader(readFileSync(file));
    if (!header) continue;
    out[id] = toMeta(sidecar, header.w, header.h, statSync(file).size);
  }
  return out;
}

export const META_MODULE = 'virtual:art-meta';
const RESOLVED = `\0${META_MODULE}`;

/** Serves `virtual:art-meta` (only the `ArtMeta` fields: prompts, references and masters stay out). */
export function artMetaPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'art-meta',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === META_MODULE ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      return `export default ${JSON.stringify(collectArtMeta(root))};`;
    },
    configureServer(server) {
      const watched = [join(root, ART_DIR), join(root, SRC_DIR)];
      const onChange = (file: string) => {
        if (!watched.some((d) => file.startsWith(d))) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

// ── CLI ──

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  return eq?.slice(name.length + 1);
}

async function main(): Promise<void> {
  const masters = arg('--masters');
  if (masters !== undefined && masters !== 'archive' && masters !== 'git') {
    console.error('--masters must be archive or git');
    process.exit(2);
  }
  const result = await checkArt({ root: arg('--root'), masters });
  console.log(`art:check: ${result.files} file(s), masters: ${masters ?? MASTER_STORE}`);
  console.log(formatTable(result.table));
  for (const p of result.problems) console.error(`FAIL ${p.id}: ${p.message}`);
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
