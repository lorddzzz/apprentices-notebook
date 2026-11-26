import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { type CheckOptions, checkArt, formatTable, loadSharp } from '../../scripts/art-check';
import { ART_ROLES, type ArtRole, MB, type Sidecar } from '../../src/ui/art/spec';

let root: string;
let masters: { file: string; sha256: string; archiveKey: string }[];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'art-check-'));
  masters = [];
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** A lossless WebP; `transparent` clears the alpha of the first row. */
async function webp(w: number, h: number, transparent: boolean): Promise<Uint8Array> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error('sharp is not available');
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px.set([(i * 7) % 256, (i * 13) % 256, 90, transparent && i < w ? 0 : 255], i * 4);
  }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .webp({ lossless: true })
    .toBuffer();
}

function write(rel: string, data: Uint8Array | string): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

const sha = (id: string) =>
  id
    .replace(/[^a-f0-9]/g, '')
    .padEnd(64, 'a')
    .slice(0, 64);

interface Drop {
  id: string;
  file: [number, number, boolean];
  sidecar: Partial<Sidecar> & { role: ArtRole };
  master?: boolean;
  noSidecar?: boolean;
}

async function drop(d: Drop): Promise<void> {
  const [w, h, transparent] = d.file;
  write(`src/assets/art/${d.id}.webp`, await webp(w, h, transparent));
  if (d.noSidecar) return;
  const path = `${d.id}.png`;
  write(
    `art-src/${d.id}.json`,
    JSON.stringify({
      id: d.id,
      size: [w, h],
      prompt: 'PROMPT-CANARY',
      master: { path, sha256: sha(d.id) },
      ...d.sidecar,
    }),
  );
  if (d.master !== false) {
    masters.push({ file: path, sha256: sha(d.id), archiveKey: `r2:bucket/${path}` });
  }
}

async function run(opts: Omit<CheckOptions, 'root'> = {}) {
  write('art-src/MASTERS.json', JSON.stringify({ masters }));
  return checkArt({ root, ...opts });
}

/** One valid asset of every role (C3/C4). */
const VALID: Record<ArtRole, Drop> = {
  'tile-opaque': {
    id: 'tiles/seam/floor-a',
    file: [128, 128, false],
    sidecar: { role: 'tile-opaque' },
  },
  'material-overlay-alpha': {
    id: 'tiles/shared/oil',
    file: [128, 128, true],
    sidecar: { role: 'material-overlay-alpha' },
  },
  figure: {
    id: 'units/shared/draughtsman',
    file: [128, 176, true],
    sidecar: { role: 'figure', groundContact: [64, 160] },
  },
  'boss-figure': {
    id: 'foes/canals/mother',
    file: [192, 256, true],
    sidecar: { role: 'boss-figure', groundContact: [96, 232] },
  },
  portrait: {
    id: 'portraits/shared/draughtsman',
    file: [192, 192, false],
    sidecar: { role: 'portrait' },
  },
  card: {
    id: 'portraits/shared/draughtsman-card',
    file: [222, 330, false],
    sidecar: { role: 'card' },
  },
  strip: {
    id: 'finds/shared/rune-a',
    file: [176, 192, true],
    sidecar: { role: 'strip', alpha: true },
  },
  scene: { id: 'scenes/seam/fight', file: [750, 400, false], sidecar: { role: 'scene' } },
  'map-plate': {
    id: 'map/city/halvemeer',
    file: [750, 3800, false],
    sidecar: { role: 'map-plate' },
  },
  'map-patch-with-bbox': {
    id: 'map/city/ink-seam',
    file: [120, 90, true],
    sidecar: { role: 'map-patch-with-bbox', bbox: [300, 2000, 120, 90] },
  },
  'nine-slice': {
    id: 'ui-plates/shared/sheet',
    file: [96, 96, true],
    sidecar: { role: 'nine-slice', slice: [24, 24, 24, 24] },
  },
};

/** One invalid variant of every role, with the message it must produce. */
const INVALID: Record<ArtRole, [Drop, RegExp]> = {
  'tile-opaque': [{ ...VALID['tile-opaque'], file: [128, 128, true] }, /real transparency/],
  'material-overlay-alpha': [
    { ...VALID['material-overlay-alpha'], file: [128, 128, false] },
    /needs alpha/,
  ],
  figure: [
    { ...VALID.figure, sidecar: { role: 'figure', groundContact: [64, 120] } },
    /groundContact/,
  ],
  'boss-figure': [
    { ...VALID['boss-figure'], file: [128, 176, true] },
    /role boss-figure is 192×256/,
  ],
  portrait: [{ ...VALID.portrait, file: [192, 192, true] }, /real transparency/],
  card: [{ ...VALID.card, file: [192, 192, false] }, /role card is 222×330/],
  strip: [{ ...VALID.strip, sidecar: { role: 'strip', alpha: false } }, /real transparency/],
  scene: [{ ...VALID.scene, file: [700, 400, false] }, /role scene is 750×any/],
  'map-plate': [{ ...VALID['map-plate'], file: [750, 1900, false] }, /role map-plate is 750×3800/],
  'map-patch-with-bbox': [
    {
      ...VALID['map-patch-with-bbox'],
      sidecar: { role: 'map-patch-with-bbox', bbox: [700, 2000, 120, 90] },
    },
    /outside the 750×3800 master/,
  ],
  'nine-slice': [
    { ...VALID['nine-slice'], sidecar: { role: 'nine-slice', slice: [48, 24, 48, 24] } },
    /does not fit/,
  ],
};

const messages = (r: Awaited<ReturnType<typeof checkArt>>) => r.problems.map((p) => p.message);

test('art-check: empty tree passes', async () => {
  const r = await checkArt({ root });
  expect(r.ok).toBe(true);
  expect(r.files).toBe(0);
  expect(r.table).toEqual([{ group: 'total', files: 0, bytes: 0, budget: 15 * MB, over: false }]);
});

test('art-check: valid examples of every role pass', async () => {
  for (const role of ART_ROLES) await drop(VALID[role]);
  const r = await run();
  expect(r.problems).toEqual([]);
  expect(r.files).toBe(ART_ROLES.length);
});

test.each(ART_ROLES)('art-check: an invalid %s fails', async (role) => {
  const [bad, message] = INVALID[role];
  await drop(bad);
  const r = await run();
  expect(r.ok).toBe(false);
  expect(messages(r).join('\n')).toMatch(message);
});

test('art-check: missing sidecar fails', async () => {
  await drop({ ...VALID.portrait, noSidecar: true });
  expect(messages(await run())).toEqual([
    'missing sidecar art-src/portraits/shared/draughtsman.json',
  ]);
});

test('art-check: wrong size fails', async () => {
  // File and sidecar agree, but the role is 128².
  await drop({ ...VALID['tile-opaque'], file: [120, 120, false] });
  expect(messages(await run())).toEqual(['role tile-opaque is 128×128, sidecar says 120×120']);
});

test('art-check: mismatched dimensions fail', async () => {
  await drop({ ...VALID['tile-opaque'], sidecar: { role: 'tile-opaque', size: [128, 120] } });
  expect(messages(await run())).toContain('decoded 128×128 differs from sidecar size 128×120');
});

test('art-check: opaque role with real transparency fails', async () => {
  await drop({ ...VALID.scene, file: [750, 400, true] });
  expect(messages(await run())).toEqual([
    'role scene is opaque but the file has real transparency',
  ]);
});

test('art-check: alpha role without transparency fails', async () => {
  await drop({ ...VALID.figure, file: [128, 176, false] });
  expect(messages(await run())).toEqual(['role figure needs alpha but no pixel is transparent']);
});

test('art-check: missing master record fails', async () => {
  await drop({ ...VALID.portrait, master: false });
  expect(messages(await run())).toEqual([
    'missing master record: portraits/shared/draughtsman.png is not in art-src/MASTERS.json',
  ]);
});

test('art-check: master record switch: git mode needs the committed master file', async () => {
  await drop({ ...VALID.portrait, sidecar: { role: 'portrait', master: null } });
  const missing = await run({ masters: 'git' });
  expect(messages(missing)).toEqual([
    'missing master record: art-src/portraits/shared/draughtsman.master.webp is not committed',
  ]);
  write('art-src/portraits/shared/draughtsman.master.webp', 'lossless');
  expect((await run({ masters: 'git' })).ok).toBe(true);
});

test('art-check: an archived master present locally must match its hash', async () => {
  await drop(VALID.portrait);
  write('art-src/portraits/shared/draughtsman.png', 'not the accepted master');
  expect(messages(await run())).toEqual([
    'master portraits/shared/draughtsman.png: local file does not match its archived sha256',
  ]);
});

test('art-check: bbox out of bounds fails', async () => {
  await drop({
    ...VALID['map-patch-with-bbox'],
    sidecar: { role: 'map-patch-with-bbox', bbox: [300, 3750, 120, 90] },
  });
  expect(messages(await run())).toEqual(['bbox 300,3750,120,90 is outside the 750×3800 master']);
});

test('art-check: a path off the contract or a non-WebP fails', async () => {
  write('src/assets/art/foes/nowhere/rat.webp', await webp(128, 176, true));
  write('src/assets/art/foes/seam/rat.png', 'png');
  expect(messages(await run())).toEqual([
    'path is not <family>/<scope>/<subject>[-<state>]',
    'only .webp files ship under src/assets/art',
  ]);
});

test('art-check: over-budget scope fails deliberately', async () => {
  await drop(VALID.scene);
  await drop(VALID['map-patch-with-bbox']);
  const under = await run();
  expect(under.ok).toBe(true);
  const over = await run({ budgets: { seam: 10 } });
  expect(over.ok).toBe(false);
  expect(over.table.find((r) => r.group === 'seam')?.over).toBe(true);
  expect(over.table.find((r) => r.group === 'map')?.over).toBe(false);
  expect(messages(over)).toEqual([expect.stringMatching(/^scope over budget: .* MB > 0\.000 MB$/)]);
  const total = await run({ budgets: { total: 10 } });
  expect(total.problems.map((p) => p.id)).toEqual(['total']);
});

test('art-check: budget table printed (decimal MB stated)', async () => {
  await drop(VALID.portrait);
  await drop(VALID['tile-opaque']);
  const table = formatTable((await run()).table);
  expect(table).toMatch(/decimal MB: 1 MB = 1,000,000 bytes/);
  expect(table).toMatch(/^shared\+home\s+1\s+0\.\d{3}\s+4\.500\s+ok$/m);
  expect(table).toMatch(/^seam\s+1\s+0\.\d{3}\s+1\.500\s+ok$/m);
  expect(table).toMatch(/^total\s+2\s+0\.\d{3}\s+15\.000\s+ok$/m);
});

test('art-check: the CLI prints the table and exits 1 on failure (--root)', async () => {
  await drop({ ...VALID.portrait, noSidecar: true });
  write('art-src/MASTERS.json', JSON.stringify({ masters }));
  const cli = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/art-check.ts', '--root', root],
    { encoding: 'utf8' },
  );
  expect(cli.status).toBe(1);
  expect(cli.stdout).toMatch(/decimal MB/);
  expect(cli.stderr).toMatch(/FAIL portraits\/shared\/draughtsman: missing sidecar/);
});
