#!/usr/bin/env node
/**
 * `pnpm art:sheet <pack>`: renders `docs/art/contact/<pack>.png` (UA-2, style-sheet §8). Every
 * asset of the pack (sidecars whose `pack` equals the name, or `--ids a,b`) on light and dark
 * grounds, in greyscale, at 24 px (figures, portraits), at the real cell size on a light and a dark
 * tile, 3x3 self-tiling and two full-board repeats for floor sets, and a 375 px board crop for
 * scenes. Exits 1 when a floor set fails the mixed-neighbour or repeat check.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fail, listSidecars, loadRgba, mixedSeamReport, sharp } from './common.mjs';
import {
  BOARD_COLS,
  BOARD_ROWS,
  boardPicks,
  CELL,
  CELL_SPREAD_LIMIT,
  drawTileBoard,
  LATTICE_LIMIT,
  repeatReport,
  resizeTile,
} from './tile-board.mjs';

const LIGHT = '#E9DFC8';
const DARK = '#101820';
const PAGE = '#2b2b2b';
const SHEET_W = 1280;
const PAD = 16;
const GAP = 12;

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string' },
    out: { type: 'string' },
    ids: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});
if (o.help || positionals.length === 0) {
  console.log(
    'Usage: pnpm art:sheet <pack> [--root <dir>] [--out <file>] [--ids a/b/c,d/e/f]\n  Selects sidecars whose "pack" equals <pack>; anchors (art-src/anchors/...) work too.',
  );
  process.exit(o.help ? 0 : 2);
}
const pack = positionals[0];
const root = resolve(o.root ?? process.cwd());
const outFile = resolve(o.out ?? join(root, 'docs/art/contact', `${pack}.png`));

// ── Select assets ──
const all = listSidecars(root);
const wanted = o.ids ? new Set(o.ids.split(',')) : null;
const picked = all.filter((s) => (wanted ? wanted.has(s.id) : s.json.pack === pack));
if (!picked.length) {
  fail(
    `no sidecars with "pack": "${pack}" under art-src/ (art:process --pack ${pack}, or pass --ids)`,
  );
}
const assets = [];
for (const s of picked) {
  const file = s.id.startsWith('anchors/')
    ? join(root, 'art-src', `${s.id}.webp`)
    : join(root, 'src/assets/art', `${s.id}.webp`);
  if (!existsSync(file)) {
    console.error(`art:sheet: ${s.id}: no image at ${file}, skipped`);
    continue;
  }
  const rgba = await loadRgba(file);
  const sil = join(root, 'art-src', `${s.id}.silhouette.webp`);
  assets.push({
    id: s.id,
    role: s.json.role,
    w: rgba.w,
    h: rgba.h,
    rgba,
    silhouette: existsSync(sil) ? sil : null,
  });
}
if (!assets.length) fail('nothing to draw');

// ── Drawing helpers ──
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const text = (t, w, size = 12, fill = '#d8d8d8') =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 8}"><text x="0" y="${size + 1}" font-size="${size}" font-family="Helvetica, Arial, sans-serif" fill="${fill}">${esc(t)}</text></svg>`,
  );
const png = (pipe) => pipe.png().toBuffer();
const fromRaw = (a) => sharp(a.rgba.data, { raw: { width: a.w, height: a.h, channels: 4 } });
const solid = (w, h, bg) => sharp({ create: { width: w, height: h, channels: 4, background: bg } });

/** The asset scaled by `s` and composited over a flat colour; greyscale optional. */
async function onGround(a, s, bg, grey = false, padX = 0, padY = 0) {
  const w = Math.max(1, Math.round(a.w * s));
  const h = Math.max(1, Math.round(a.h * s));
  const art = await png(fromRaw(a).resize(w, h, { kernel: s < 1 ? 'lanczos3' : 'nearest' }));
  let pipe = solid(w + padX * 2, h + padY * 2, bg).composite([
    { input: art, left: padX, top: padY },
  ]);
  if (grey) pipe = sharp(await png(pipe)).greyscale();
  return png(pipe);
}

const placed = [];
let y = PAD;
const header = (t) => {
  placed.push({ input: text(t, SHEET_W - PAD * 2, 15, '#ffffff'), left: PAD, top: y });
  y += 28;
};
/** Flow items left to right, wrapping at the sheet width; item = { w, h, label, render }. */
async function flow(items) {
  let x = PAD;
  let rowH = 0;
  for (const it of items) {
    if (x + it.w > SHEET_W - PAD && x > PAD) {
      y += rowH + GAP;
      x = PAD;
      rowH = 0;
    }
    placed.push({ input: await it.render(), left: x, top: y });
    placed.push({
      input: text(it.label, Math.max(it.w, 90), 11, '#a8a8a8'),
      left: x,
      top: y + it.h + 2,
    });
    x += it.w + GAP;
    rowH = Math.max(rowH, it.h + 20);
  }
  y += rowH + GAP * 2;
}

const short = (id) => id.replace(/^anchors\//, 'a/');
const FIG = ['figure', 'boss-figure'];
const PEOPLE = [...FIG, 'portrait', 'card'];
const SCENES = ['scene', 'strip', 'map-plate'];

// ── 1. Light, dark, greyscale at native size ──
header(`${pack}: ${assets.length} asset(s). Light ${LIGHT}, dark ${DARK}, greyscale`);
const nativeItems = [];
for (const a of assets) {
  const s = a.role === 'map-plate' ? 0.3 : SCENES.includes(a.role) ? Math.min(1, 380 / a.w) : 1;
  const w = Math.round(a.w * s);
  const h = Math.round(a.h * s);
  for (const [name, bg, grey] of [
    ['light', LIGHT, false],
    ['dark', DARK, false],
    ['grey', LIGHT, true],
  ]) {
    nativeItems.push({
      w,
      h,
      label: `${short(a.id)} ${name}`,
      render: () => onGround(a, s, bg, grey),
    });
  }
}
await flow(nativeItems);

// ── 2. 24 px row and the silhouettes ──
const people = assets.filter((a) => PEOPLE.includes(a.role));
if (people.length) {
  header('24 px greyscale row (told apart by silhouette alone) and the derived 48 px silhouettes');
  const items = [];
  for (const a of people) {
    const s24 = 24 / Math.max(a.w, a.h);
    items.push({
      w: Math.max(24, Math.round(a.w * s24)),
      h: Math.round(a.h * s24),
      label: `${short(a.id).split('/').pop()} 24`,
      render: () => onGround(a, s24, LIGHT, true),
    });
    const s48 = 48 / Math.max(a.w, a.h);
    items.push({
      w: Math.round(a.w * s48),
      h: Math.round(a.h * s48),
      label: '48',
      render: () => onGround(a, s48, LIGHT, true),
    });
    if (a.silhouette) {
      items.push({
        w: 48,
        h: 48,
        label: 'sil',
        render: () => png(sharp(a.silhouette).png()),
      });
    }
  }
  await flow(items);
}

// ── 3. Real cell size on a light and a dark tile; feet and shadow, 1/3 cell lapping the row above ──
const figs = assets.filter((a) => FIG.includes(a.role));
if (figs.length) {
  header(
    'Figures at the real cell (51 px), 58 px and 128 px on a light and a dark tile; feet in the lower third, lapping the row above',
  );
  const items = [];
  for (const a of figs) {
    const ground = a.role === 'boss-figure' ? [96, 232] : [64, 160];
    for (const cell of [51, 58, 128]) {
      for (const [name, bg] of [
        ['light', LIGHT],
        ['dark', DARK],
      ]) {
        const s = (a.role === 'boss-figure' ? cell * 1.5 : cell) / a.w;
        const w = cell * 2;
        const h = cell * 2;
        items.push({
          w,
          h,
          label: `${short(a.id).split('/').pop()} ${cell}px ${name}`,
          render: async () => {
            const art = await png(
              fromRaw(a).resize(Math.round(a.w * s), Math.round(a.h * s), { kernel: 'lanczos3' }),
            );
            const left = Math.round(cell - ground[0] * s);
            const top = Math.round(cell * 1.7 - ground[1] * s);
            const tileA = name === 'light' ? '#cfc5ad' : '#1a232c';
            return png(
              solid(w, h, bg).composite([
                { input: await png(solid(cell, cell, tileA)), left: Math.round(cell / 2), top: 0 },
                { input: art, left, top },
              ]),
            );
          },
        });
      }
    }
  }
  await flow(items);
}

// ── 4. Materials ──
const mats = assets.filter((a) => a.role === 'material-overlay-alpha');
if (mats.length) {
  header(
    'Material states on light, dark and mid ground, and greyscale (a distinct silhouette each)',
  );
  const items = [];
  for (const a of mats) {
    for (const [name, bg, grey] of [
      ['mid', '#55625E', false],
      ['light', LIGHT, false],
      ['dark', DARK, false],
      ['grey', '#55625E', true],
    ]) {
      items.push({
        w: a.w,
        h: a.h,
        label: `${short(a.id).split('/').pop()} ${name}`,
        render: () => onGround(a, 1, bg, grey),
      });
    }
  }
  await flow(items);
}

// ── 5. Tiles: self-tiling, full-board repeats and mixed neighbours ──
const tiles = assets.filter((a) => a.role === 'tile-opaque');
let floorFailed = false;
if (tiles.length) {
  header('Ground tiles: 3x3 self-tiling');
  const items = [];
  for (const a of tiles) {
    items.push({
      w: a.w * 3,
      h: a.h * 3,
      label: `${short(a.id)} 3x3`,
      render: async () => {
        const one = await png(fromRaw(a));
        const cells = [];
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) cells.push({ input: one, left: c * a.w, top: r * a.h });
        return png(solid(a.w * 3, a.h * 3, DARK).composite(cells));
      },
    });
  }
  await flow(items);

  const sets = new Map();
  for (const a of tiles) {
    const variant = a.id.match(/^(.*)-([a-z])$/);
    const standalone = /\/(floor|quay(?:-lit)?|water)(-v\d+)?$/.test(a.id);
    if (!variant && !standalone) continue;
    const [name, letter] = variant ? variant.slice(1) : [a.id, 'a'];
    sets.set(name, [...(sets.get(name) ?? []), { ...a, letter }]);
  }
  for (const [name, variants] of sets) {
    variants.sort((a, b) => a.letter.localeCompare(b.letter));
    const scaled = await Promise.all(variants.map((a) => resizeTile(a.rgba)));
    for (const rows of BOARD_ROWS) {
      const picks = boardPicks(BOARD_COLS, rows, scaled.length);
      const report = repeatReport(scaled, picks, BOARD_COLS, rows);
      const verdict = report.pass ? 'PASS' : 'FAIL';
      if (!report.pass) floorFailed = true;
      const metrics = `lattice ${report.score.toFixed(2)} / ${LATTICE_LIMIT}; cell mean spread ${report.between.toFixed(2)} / ${CELL_SPREAD_LIMIT}; within-cell spread ${report.within.toFixed(2)}`;
      const size = `${BOARD_COLS}×${rows}`;
      header(`Floor set ${short(name)} ${size}: repeat ${verdict}. ${metrics}`);
      console.log(`${verdict} board repeat check ${name} ${size}: ${metrics}`);
      const board = await drawTileBoard(scaled, picks, BOARD_COLS, rows);
      await flow(
        [
          { label: 'colour', render: () => board },
          { label: 'greyscale', render: () => png(sharp(board).greyscale()) },
        ].map((item) => ({ ...item, w: BOARD_COLS * CELL, h: rows * CELL })),
      );
    }
    if (variants.length < 2) continue;
    const n = variants[0].w;
    const rgbOf = async (a) => ({
      name: a.letter.toUpperCase(),
      rgb: Float32Array.from(
        await sharp(a.rgba.data, { raw: { width: a.w, height: a.h, channels: 4 } })
          .removeAlpha()
          .raw()
          .toBuffer(),
      ),
    });
    const report = mixedSeamReport(await Promise.all(variants.map(rgbOf)), n);
    const worst = report.pairs.reduce((m, p) => (p.step > m.step ? p : m), report.pairs[0]);
    const verdict = report.pass ? 'PASS' : 'FAIL';
    if (!report.pass) floorFailed = true;
    header(
      `Floor set ${short(name)} (${variants.map((v) => v.letter.toUpperCase()).join('')}): mixed neighbours ${verdict}. Worst joint ${worst.a}${worst.dir === 'h' ? '|' : '/'}${worst.b} ${worst.step.toFixed(1)} vs limit ${report.limit.toFixed(1)} (natural step ${report.natural.toFixed(1)})`,
    );
    const k = variants.length;
    const grid = 4;
    const pick = (r, c) => variants[(r * 2 + c * 3 + ((r * c) % 2)) % k];
    const items2 = [
      {
        w: n * grid,
        h: n * grid,
        label: 'mixed grid',
        render: async () => {
          const cells = [];
          for (let r = 0; r < grid; r++) {
            for (let c = 0; c < grid; c++) {
              cells.push({ input: await png(fromRaw(pick(r, c))), left: c * n, top: r * n });
            }
          }
          return png(solid(n * grid, n * grid, DARK).composite(cells));
        },
      },
    ];
    const pairsToShow = [];
    for (let i = 0; i + 1 < k; i++) pairsToShow.push([variants[i], variants[i + 1], 'h']);
    pairsToShow.push([variants[0], variants[k - 1], 'v']);
    for (const [p, q, dir] of pairsToShow) {
      items2.push({
        w: dir === 'h' ? n * 2 : n,
        h: dir === 'h' ? n : n * 2,
        label: `${p.letter.toUpperCase()}${dir === 'h' ? '|' : ' over '}${q.letter.toUpperCase()}`,
        render: async () =>
          png(
            solid(dir === 'h' ? n * 2 : n, dir === 'h' ? n : n * 2, DARK).composite([
              { input: await png(fromRaw(p)), left: 0, top: 0 },
              { input: await png(fromRaw(q)), left: dir === 'h' ? n : 0, top: dir === 'h' ? 0 : n },
            ]),
          ),
      });
    }
    await flow(items2);
    console.log(
      `${verdict} mixed-neighbour check ${name}: ${report.pairs.length} joints, worst ${worst.a}${worst.dir === 'h' ? '|' : '/'}${worst.b} ${worst.step.toFixed(1)}, limit ${report.limit.toFixed(1)}`,
    );
    for (const p of report.bad.slice(0, 8)) {
      console.error(
        `  seam ${p.a}${p.dir === 'h' ? '|' : ' over '}${p.b}: step ${p.step.toFixed(1)} > ${report.limit.toFixed(1)}`,
      );
    }
  }
}

// ── 6. Scenes and plates: the 375 px board crop ──
const scenes = assets.filter((a) => SCENES.includes(a.role));
if (scenes.length) {
  header('Scenes, strips and plates at 375 px wide (a phone-width crop, top 812 px at most)');
  const items = scenes.map((a) => {
    const s = 375 / a.w;
    const h = Math.min(812, Math.round(a.h * s));
    return {
      w: 375,
      h,
      label: `${short(a.id)} ${a.w}x${a.h}`,
      render: async () =>
        png(
          fromRaw(a)
            .resize(375, Math.round(a.h * s), { kernel: 'lanczos3' })
            .extract({ left: 0, top: 0, width: 375, height: h })
            .flatten({ background: DARK }),
        ),
    };
  });
  await flow(items);
}

// ── 7. Everything else (patches, nine-slices) on light and dark ──
const rest = assets.filter(
  (a) =>
    !PEOPLE.includes(a.role) &&
    !SCENES.includes(a.role) &&
    a.role !== 'tile-opaque' &&
    a.role !== 'material-overlay-alpha',
);
if (rest.length) {
  header('Other assets on light and dark');
  const items = [];
  for (const a of rest) {
    const s = Math.min(1, 380 / a.w);
    for (const [name, bg] of [
      ['light', LIGHT],
      ['dark', DARK],
    ]) {
      items.push({
        w: Math.round(a.w * s),
        h: Math.round(a.h * s),
        label: `${short(a.id)} ${name}`,
        render: () => onGround(a, s, bg),
      });
    }
  }
  await flow(items);
}

mkdirSync(dirname(outFile), { recursive: true });
await solid(SHEET_W, y + PAD, PAGE)
  .composite(placed)
  .png()
  .toFile(outFile);
console.log(`sheet: ${outFile} (${SHEET_W}x${y + PAD}, ${assets.length} asset(s))`);
if (floorFailed) process.exitCode = 1;
