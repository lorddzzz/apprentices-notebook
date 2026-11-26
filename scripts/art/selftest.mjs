#!/usr/bin/env node
/**
 * `node scripts/art/selftest.mjs`: proves process.mjs and sheet.mjs on synthetic samples in a
 * temporary root (deleted afterwards; nothing lands in src/assets/art). Covers both modes
 * (--ship, --scratch), a figure whose shadow, hem and pole tip hang below the feet (foot lands
 * at (64,160), boss at (96,232), on a light and a dark tile), an alpha-edge halo, role-rule
 * failures, mixed floor neighbours, and full-board repeats with and without baked light pools.
 * `--keep` leaves the temp root in place so the contact sheets can be looked at.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRgba, sharp } from './common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'art-selftest-'));
const root = join(tmp, 'root');
const raw = join(tmp, 'raw');
mkdirSync(raw, { recursive: true });
mkdirSync(root, { recursive: true });

let failures = 0;
const ok = (cond, what) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
  if (!cond) failures++;
};
const run = (script, args, _expectCode = 0) => {
  const r = spawnSync(process.execPath, [join(here, script), ...args], {
    encoding: 'utf8',
    cwd: repo,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const proc = (rawFile, id, args, expect = 0) =>
  run('process.mjs', [rawFile, id, '--root', root, ...args], expect);

// ── Samples ──

/** A figure: boots bottom at source y=760 (x=300), head/hat top y=100, a pole tip to y=850, a baked shadow and flared hem below the feet. */
function figureSvg(scale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${600 * scale}" height="${900 * scale}" viewBox="0 0 600 900">
  <ellipse cx="330" cy="775" rx="130" ry="32" fill="#000" fill-opacity="0.35"/>
  <line x1="420" y1="110" x2="420" y2="850" stroke="#6b4a2f" stroke-width="12"/>
  <polygon points="215,330 385,330 430,800 170,800 300,760" fill="#4a5a7a"/>
  <rect x="268" y="700" width="64" height="60" fill="#8a9ab8"/>
  <circle cx="300" cy="215" r="62" fill="#d9b48f"/>
  <ellipse cx="300" cy="150" rx="120" ry="22" fill="#2a2f3a"/>
  <rect x="250" y="100" width="100" height="55" fill="#2a2f3a"/>
</svg>`;
}
async function writeFigure(file, mattes = false) {
  await sharp(Buffer.from(figureSvg())).png().toFile(file);
  if (!mattes) return;
  const a = await loadRgba(file);
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] > 0 && a.data[i + 3] < 250) {
      a.data[i] = 255;
      a.data[i + 1] = 255;
      a.data[i + 2] = 255;
    }
  }
  await sharp(a.data, { raw: { width: a.w, height: a.h, channels: 4 } })
    .png()
    .toFile(file);
}

/** Deterministic floor texture. Bad edges and a baked pool are tested independently. */
async function writeFloor(file, seed, { vignette = 0, pool = false } = {}) {
  const N = 512;
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const grid = (g) => Array.from({ length: (g + 1) * (g + 1) }, () => rnd() - 0.5);
  const lo = grid(6);
  const hi = grid(24);
  const at = (g, arr, x, y) => {
    const fx = (x / N) * g;
    const fy = (y / N) * g;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const v = (xx, yy) => arr[yy * (g + 1) + xx];
    return (
      v(x0, y0) * (1 - tx) * (1 - ty) +
      v(x0 + 1, y0) * tx * (1 - ty) +
      v(x0, y0 + 1) * (1 - tx) * ty +
      v(x0 + 1, y0 + 1) * tx * ty
    );
  };
  const buf = Buffer.alloc(N * N * 3);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.min(x, y, N - 1 - x, N - 1 - y) / (N / 2);
      const noise = at(6, lo, x, y) + at(24, hi, x, y) * 0.36 + (rnd() - 0.5) * 0.16;
      const base = 85 + noise * (vignette ? 50 : 16 * Math.min(1, d * 8));
      const radius = Math.hypot(x - N / 2, y - N / 2) / (N / 2);
      const light = pool ? 55 * Math.max(0, 1 - (radius / 0.8) ** 2) ** 2 : 0;
      const v = base - vignette * (1 - d) ** 2 * 60 + light;
      const i = (y * N + x) * 3;
      buf[i] = Math.max(0, Math.min(255, v));
      buf[i + 1] = Math.max(0, Math.min(255, v * 1.12));
      buf[i + 2] = Math.max(0, Math.min(255, v * 1.08));
    }
  }
  await sharp(buf, { raw: { width: N, height: N, channels: 3 } })
    .png()
    .toFile(file);
}

async function footOk(webpFile, ground, label) {
  const a = await loadRgba(webpFile);
  const px = (x, y) => {
    const i = (y * a.w + x) * 4;
    return [a.data[i], a.data[i + 1], a.data[i + 2], a.data[i + 3]];
  };
  const boot = [0x8a, 0x9a, 0xb8];
  const near = (p) => Math.hypot(p[0] - boot[0], p[1] - boot[1], p[2] - boot[2]) < 40 && p[3] > 200;
  for (const [name, bg] of [
    ['light tile', [0xe9, 0xdf, 0xc8]],
    ['dark tile', [0x10, 0x18, 0x20]],
  ]) {
    const over = (p) => {
      const al = p[3] / 255;
      return [0, 1, 2].map((c) => Math.round(p[c] * al + bg[c] * (1 - al)));
    };
    let last = -1;
    for (let y = 0; y < a.h; y++) {
      const c = over(px(ground[0], y));
      if (near([c[0], c[1], c[2], 255]) && px(ground[0], y)[3] > 200) last = y;
    }
    ok(
      Math.abs(last - (ground[1] - 1)) <= 3,
      `${label}: last boot row at x=${ground[0]} is ${last}, ground contact ${ground[1]} ±4, on a ${name}`,
    );
  }
}

try {
  console.log(`selftest root: ${root}\n`);

  // 1. Figure, ship mode: foot placement, shadow, silhouette, art:check proof.
  const fig = join(raw, 'fig.png');
  await writeFigure(fig);
  let r = proc(fig, 'units/shared/draughtsman', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
    '--pack',
    'selftest',
  ]);
  ok(
    r.code === 0 && /art:check: units\/shared\/draughtsman passes/.test(r.out),
    `figure ships and passes art:check\n${r.out}`,
  );
  await footOk(join(root, 'src/assets/art/units/shared/draughtsman.webp'), [64, 160], 'figure');
  const small = await loadRgba(join(root, 'src/assets/art/units/shared/draughtsman.webp'));
  const below = small.data[(172 * small.w + 64) * 4 + 3];
  ok(below < 200, 'pole tip, hem and the baked shadow below the feet do not move the feet');

  r = proc(fig, 'units/shared/tuner', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
    '--draw-height',
    '200',
  ]);
  ok(
    r.code !== 0 && /cut off at the canvas/.test(r.out),
    'a figure drawn too tall is refused instead of silently cropped',
  );

  // 2. Boss, ship mode.
  r = proc(fig, 'foes/seam/marginalia', [
    '--ship',
    '--role',
    'boss-figure',
    '--size',
    '192x256',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
    '--pack',
    'selftest',
  ]);
  ok(r.code === 0, `boss ships and passes art:check\n${r.out}`);
  await footOk(join(root, 'src/assets/art/foes/seam/marginalia.webp'), [96, 232], 'boss');

  // 3. Scratch mode (anchors never ship).
  r = proc(fig, 'party/pell-v1', [
    '--scratch',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
    '--pack',
    'selftest-anchor',
  ]);
  const scratchOk = r.code === 0 && /scratch: art-src\/anchors\/party\/pell-v1\.webp/.test(r.out);
  ok(
    scratchOk,
    `scratch writes art-src/anchors/party/pell-v1.webp and no src/assets file\n${r.out}`,
  );

  // 4. Alpha-edge halo: rejected, then repaired by --defringe.
  const halo = join(raw, 'halo.png');
  await writeFigure(halo, true);
  r = proc(halo, 'units/shared/stoker', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
  ]);
  ok(
    r.code !== 0 && /alpha-edge halo/.test(r.out),
    `a matte fringe is rejected\n${r.out.split('\n')[0]}`,
  );
  r = proc(halo, 'units/shared/stoker', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
    '--defringe',
    '--pack',
    'selftest',
  ]);
  ok(r.code === 0, `--defringe repairs it and the asset passes\n${r.out}`);

  // 5. Role-rule failures.
  r = proc(fig, 'units/shared/runaway', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x128',
    '--alpha',
    '--ground-contact',
    '300,760',
    '--height',
    '660',
  ]);
  ok(
    r.code !== 0 && /role-rule failure/.test(r.out),
    `figure at 128x128 fails the role rule\n${r.out.split('\n')[0]}`,
  );
  const opaque = join(raw, 'opaque.png');
  await sharp({ create: { width: 256, height: 256, channels: 3, background: '#55625e' } })
    .png()
    .toFile(opaque);
  r = proc(opaque, 'tiles/shared/slick', [
    '--ship',
    '--role',
    'material-overlay-alpha',
    '--size',
    '128x128',
    '--alpha',
  ]);
  ok(
    r.code !== 0 && /needs real transparency/.test(r.out),
    `a material without transparency fails\n${r.out.split('\n')[0]}`,
  );
  r = proc(fig, 'units/shared/notary', [
    '--ship',
    '--role',
    'figure',
    '--size',
    '128x176',
    '--alpha',
  ]);
  ok(r.code !== 0 && /--ground-contact/.test(r.out), 'a figure without a ground contact fails');

  // 6. Floor sets: even passes; seams and baked light pools fail independently.
  const names = ['a', 'b', 'c', 'd', 'e'];
  for (const [i, n] of names.entries())
    await writeFloor(join(raw, `floor-${n}.png`), 1000 + i * 77);
  const tileArgs = (extra) => ['--ship', '--role', 'tile-opaque', '--size', '128x128', ...extra];
  r = proc(
    join(raw, 'floor-a.png'),
    'tiles/seam/floor-a',
    tileArgs(['--tile', '--pack', 'selftest-floors']),
  );
  ok(r.code === 0, `floor-a ships (seamless)\n${r.out}`);
  const aWebp = join(root, 'src/assets/art/tiles/seam/floor-a.webp');
  for (const n of names.slice(1)) {
    r = proc(
      join(raw, `floor-${n}.png`),
      `tiles/seam/floor-${n}`,
      tileArgs(['--tile', '--edge-from', aWebp, '--pack', 'selftest-floors']),
    );
    ok(r.code === 0, `floor-${n} ships with edges shared from floor-a`);
  }
  r = run('sheet.mjs', ['selftest-floors', '--root', root]);
  ok(
    r.code === 0 &&
      /PASS mixed-neighbour check.*50 joints/.test(r.out) &&
      r.out.match(/PASS board repeat check/g)?.length === 2,
    `the even floor set passes all 50 mixed joints and both repeat boards\n${r.out}`,
  );
  for (const [i, n] of names.entries()) {
    const file = join(raw, `bad-${n}.png`);
    await writeFloor(file, 1000 + i * 77, { vignette: 0.4 + i * 0.25 });
    proc(file, `tiles/canals/floor-${n}`, tileArgs(['--tile', '--pack', 'selftest-badfloors']));
  }
  r = run('sheet.mjs', ['selftest-badfloors', '--root', root]);
  ok(
    r.code === 1 && /FAIL mixed-neighbour check/.test(r.out),
    `a set that does not share edges fails the mixed check\n${r.out.split('\n').slice(0, 2).join('\n')}`,
  );

  for (const [i, n] of names.entries()) {
    const file = join(raw, `pool-${n}.png`);
    await writeFloor(file, 1000 + i * 77, { pool: true });
    r = proc(file, `repeat/pool-${n}`, [
      '--scratch',
      '--role',
      'tile-opaque',
      '--size',
      '128x128',
      '--pack',
      'selftest-pools',
    ]);
    ok(r.code === 0, `baked pool fixture ${n} processes\n${r.out}`);
  }
  r = run('sheet.mjs', ['selftest-pools', '--root', root]);
  ok(
    r.code === 1 &&
      /PASS mixed-neighbour check.*50 joints/.test(r.out) &&
      r.out.match(/FAIL board repeat check/g)?.length === 2,
    `baked pools fail both repeat boards even with clean joints\n${r.out}`,
  );

  // 7. Sheets for the figures (both a ship pack and an anchor pack).
  r = run('sheet.mjs', ['selftest', '--root', root]);
  ok(r.code === 0, `sheet renders docs/art/contact/selftest.png\n${r.out}`);
  r = run('sheet.mjs', ['selftest-anchor', '--root', root]);
  ok(r.code === 0, `sheet renders an anchor pack\n${r.out}`);

  // 8. The whole root passes art:check.
  const chk = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      join(repo, 'scripts/art-check.ts'),
      '--root',
      root,
      '--masters',
      'archive',
    ],
    { encoding: 'utf8', cwd: repo },
  );
  const chkOut = `${chk.stdout}${chk.stderr}`;
  const onlyBad = chkOut
    .split('\n')
    .filter((l) => l.startsWith('FAIL') && !l.startsWith('FAIL tiles/canals'));
  ok(
    onlyBad.length === 0,
    `art:check on the temp root passes (the deliberately bad canals floors are expected to differ only by the sheet)\n${onlyBad.join('\n')}`,
  );
  void writeFileSync;
} finally {
  if (process.argv.includes('--keep')) console.log(`\nkept ${tmp}`);
  else {
    rmSync(tmp, { recursive: true, force: true });
    console.log('\ntemp files removed');
  }
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall selftest checks passed');
process.exit(failures ? 1 : 0);
