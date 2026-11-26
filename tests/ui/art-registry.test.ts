import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { build } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { DISTRICT_IDS } from '$data/districts/index';
import { artMetaPlugin, collectArtMeta, listArtFiles, loadSharp } from '../../scripts/art-check';
import ArtImage from '../../src/ui/art/ArtImage.svelte';
import {
  artIdFromPath,
  artIds,
  artMeta,
  artSize,
  artUrl,
  buildIndex,
} from '../../src/ui/art/registry';
import {
  BUDGETS,
  DISTRICT_SCOPES,
  isArtId,
  PRECACHE_GLOBS,
  PRECACHE_MAX_BYTES,
  readWebpHeader,
} from '../../src/ui/art/spec';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'art-registry-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel: string, data: Uint8Array | string): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

/** A noisy lossless RGBA WebP (big enough not to be inlined as a data URL). */
async function webp(w: number, h: number): Promise<Uint8Array> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error('sharp is not available');
  const px = new Uint8Array(w * h * 4);
  let s = 7;
  for (let i = 0; i < px.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    px[i] = i % 4 === 3 ? (i < w * 4 ? 0 : 255) : (s >>> 16) & 0xff;
  }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .webp({ lossless: true })
    .toBuffer();
}

test('registry: no art → artUrl null', () => {
  expect(buildIndex({}).size).toBe(0);
  expect(artUrl('foes/seam/no-such-foe')).toBeNull();
  expect(artSize('foes/seam/no-such-foe')).toBeNull();
  expect(artMeta('foes/seam/no-such-foe')).toBeNull();
  // The live registry is exactly the WebPs on disk (none until UA's first pack).
  const onDisk = listArtFiles(process.cwd())
    .filter((f) => f.endsWith('.webp'))
    .map((f) => f.slice(0, -5));
  expect(artIds()).toEqual(onDisk);
});

test('registry: ArtImage draws the fallback when the art is not shipped', () => {
  const fallback = createRawSnippet(() => ({ render: () => '<b>vector</b>' }));
  const { body } = render(ArtImage, { props: { id: 'foes/seam/no-such-foe', fallback } });
  expect(body).toContain('<b>vector</b>');
  expect(body).not.toContain('<img');
});

test('registry: id from path', () => {
  expect(artIdFromPath('/src/assets/art/foes/inkQuarter/dead-letter.webp')).toBe(
    'foes/inkQuarter/dead-letter',
  );
  expect(artIdFromPath('/src/assets/art/tiles/shared/oil-lit.webp')).toBe('tiles/shared/oil-lit');
  expect(artIdFromPath('/src/assets/art/foes/nowhere/rat.webp')).toBeNull();
  expect(artIdFromPath('/src/assets/art/foes/seam/rat.png')).toBeNull();
  expect(artIdFromPath('/src/assets/art/foes/seam/deep/rat.webp')).toBeNull();
  const index = buildIndex({
    '/src/assets/art/foes/seam/rat.webp': '/assets/rat-abc.webp',
    '/src/assets/art/oops.webp': '/assets/oops.webp',
  });
  expect([...index]).toEqual([['foes/seam/rat', '/assets/rat-abc.webp']]);
  expect(isArtId('map/city/ink-inkQuarter')).toBe(true);
  expect(isArtId('dragons/seam/rat')).toBe(false);
});

test('registry: district scopes are the game districts', () => {
  expect([...DISTRICT_SCOPES]).toEqual([...DISTRICT_IDS]);
});

test('registry: artMeta gives bbox and slice in source pixels', async () => {
  write('src/assets/art/map/city/ink-seam.webp', await webp(120, 90));
  write(
    'art-src/map/city/ink-seam.json',
    JSON.stringify({ role: 'map-patch-with-bbox', size: [120, 90], bbox: [300, 2000, 120, 90] }),
  );
  write('src/assets/art/ui-plates/shared/sheet.webp', await webp(96, 64));
  write(
    'art-src/ui-plates/shared/sheet.json',
    JSON.stringify({ role: 'nine-slice', size: [96, 64], slice: [10, 20, 12, 22] }),
  );
  write('src/assets/art/units/shared/draughtsman.webp', await webp(128, 176));
  write(
    'art-src/units/shared/draughtsman.json',
    JSON.stringify({ role: 'figure', size: [128, 176], groundContact: [64, 160] }),
  );
  // No sidecar: no metadata (art:check fails it), but the registry still serves the file.
  write('src/assets/art/foes/seam/rat.webp', await webp(128, 176));
  const meta = collectArtMeta(root);
  const bytes = (rel: string) => readFileSync(join(root, 'src/assets/art', rel)).length;
  expect(meta).toEqual({
    'map/city/ink-seam': {
      role: 'map-patch-with-bbox',
      w: 120,
      h: 90,
      bytes: bytes('map/city/ink-seam.webp'),
      bbox: { x: 300, y: 2000, w: 120, h: 90 },
    },
    'ui-plates/shared/sheet': {
      role: 'nine-slice',
      w: 96,
      h: 64,
      bytes: bytes('ui-plates/shared/sheet.webp'),
      slice: { top: 10, right: 20, bottom: 12, left: 22 },
    },
    'units/shared/draughtsman': {
      role: 'figure',
      w: 128,
      h: 176,
      bytes: bytes('units/shared/draughtsman.webp'),
      ground: { x: 64, y: 160 },
    },
  });
});

test('registry: the WebP header reader gives the decoded size', async () => {
  const sharp = await loadSharp();
  if (!sharp) throw new Error('sharp is not available');
  const raw = new Uint8Array(30 * 20 * 3).fill(120);
  const opts = { raw: { width: 30, height: 20, channels: 3 } };
  const lossy = await sharp(raw, opts).webp({ quality: 80 }).toBuffer();
  const lossless = await sharp(raw, opts).webp({ lossless: true }).toBuffer();
  expect(readWebpHeader(lossy)).toMatchObject({ w: 30, h: 20, mayHaveAlpha: false });
  expect(readWebpHeader(lossless)).toMatchObject({ w: 30, h: 20 });
  expect(readWebpHeader(await webp(40, 50))).toEqual({ w: 40, h: 50, mayHaveAlpha: true });
  expect(readWebpHeader(new TextEncoder().encode('not a webp at all, not even close'))).toBeNull();
});

test('registry: precache takes WebP art and WOFF2 fonts under a cap above any one budget', () => {
  expect(PRECACHE_GLOBS.join()).toMatch(/webp/);
  expect(PRECACHE_GLOBS.join()).toMatch(/woff2/);
  expect(PRECACHE_MAX_BYTES).toBeGreaterThanOrEqual(BUDGETS.map);
  expect(PRECACHE_MAX_BYTES).toBe(2 * 1024 * 1024);
});

test('bundle: no prompt or reference text; the precache lists the dropped webp and font', async () => {
  write('src/assets/art/units/shared/draughtsman.webp', await webp(128, 176));
  write(
    'art-src/units/shared/draughtsman.json',
    JSON.stringify({
      role: 'figure',
      size: [128, 176],
      groundContact: [64, 160],
      prompt: 'PROMPT-CANARY a slim draughtsman',
      references: ['art-src/anchors/REFERENCE-CANARY.approved.webp'],
      master: { path: 'units/shared/MASTER-CANARY.png', sha256: 'f'.repeat(64) },
      model: 'MODEL-CANARY',
    }),
  );
  write('public/fonts/serif.woff2', new Uint8Array(2048).fill(7));
  const registry = resolve('src/ui/art/registry.ts');
  write(
    'main.ts',
    `import { artIds, artMeta, artUrl } from ${JSON.stringify(registry)};\n` +
      'document.body.textContent = JSON.stringify(artIds().map((id) => [id, artUrl(id), artMeta(id)]));\n',
  );
  write(
    'index.html',
    '<!doctype html><html><head></head><body><script type="module" src="/main.ts"></script></body></html>',
  );
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    build: { outDir: join(root, 'dist') },
    plugins: [
      artMetaPlugin(),
      VitePWA({
        injectRegister: false,
        manifest: false,
        workbox: {
          globPatterns: PRECACHE_GLOBS,
          maximumFileSizeToCacheInBytes: PRECACHE_MAX_BYTES,
        },
      }),
    ],
  });
  const dist = join(root, 'dist');
  const files = readdirSync(dist, { recursive: true, encoding: 'utf8' });
  const text = files
    .filter((f) => /\.(js|html|css|json|webmanifest)$/.test(f))
    .map((f) => readFileSync(join(dist, f), 'utf8'))
    .join('\n');
  for (const canary of ['PROMPT-CANARY', 'REFERENCE-CANARY', 'MASTER-CANARY', 'MODEL-CANARY']) {
    expect(text).not.toContain(canary);
  }
  // The public metadata did ship.
  expect(text).toMatch(/role:\s*[`'"]figure[`'"]/);
  const webpFile = files.find((f) => f.endsWith('.webp'));
  expect(webpFile).toMatch(/^assets\/draughtsman-.*\.webp$/);
  const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
  expect(sw).toContain(webpFile);
  expect(sw).toContain('fonts/serif.woff2');
}, 60_000);
