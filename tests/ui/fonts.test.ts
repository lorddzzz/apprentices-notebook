import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PRECACHE_GLOBS } from '../../src/ui/art/spec';

/** UF-5: the two self-hosted faces (UF-P1). Text checks only; the loaded-face and real small caps
 *  check (document.fonts.check) is the phone run, recorded in docs/plans/ux-foundations-evidence/. */

const ROOT = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const FONTS_CSS = read('src/ui/fonts.css');
const THEME = read('src/ui/theme.css');

interface Face {
  family: string;
  url: string;
  display: string | undefined;
}

function faces(): Face[] {
  const out: Face[] = [];
  for (const m of FONTS_CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1] ?? '';
    const family = /font-family:\s*"([^"]+)"/.exec(body)?.[1];
    const url = /url\("([^"]+)"\)/.exec(body)?.[1];
    expect(family, body).toBeTruthy();
    expect(url, body).toBeTruthy();
    out.push({
      family: family as string,
      url: url as string,
      display: /font-display:\s*(\w+)/.exec(body)?.[1],
    });
  }
  return out;
}

/** Workbox globs are minimatch-style; this covers the one shape in use: `**\/*.{a,b}`. */
function globMatches(glob: string, path: string): boolean {
  const m = /^\*\*\/\*\.\{([^}]+)\}$/.exec(glob);
  if (!m) throw new Error(`unsupported glob ${glob}`);
  return (m[1] as string).split(',').some((ext) => path.endsWith(`.${ext}`));
}

describe('fonts', () => {
  test('fonts: every @font-face file exists', () => {
    const list = faces();
    expect(list.length).toBe(4);
    for (const f of list) {
      expect(f.url.startsWith('/fonts/'), f.url).toBe(true);
      const file = join(ROOT, 'public', f.url);
      expect(existsSync(file), f.url).toBe(true);
      expect(f.display, f.url).toBe('swap');
      // A woff2 file starts with the "wOF2" signature.
      expect(readFileSync(file).subarray(0, 4).toString('latin1'), f.url).toBe('wOF2');
    }
    // Every shipped file is used, and the total stays within the 400 KB budget.
    const shipped = readdirSync(join(ROOT, 'public/fonts')).filter((n) => n.endsWith('.woff2'));
    expect(shipped.sort()).toEqual(list.map((f) => f.url.slice('/fonts/'.length)).sort());
    const bytes = shipped.reduce((n, f) => n + statSync(join(ROOT, 'public/fonts', f)).size, 0);
    expect(bytes).toBeLessThanOrEqual(400 * 1024);
  });

  test('fonts: precache globs match woff2', () => {
    for (const f of faces()) {
      expect(
        PRECACHE_GLOBS.some((g) => globMatches(g, f.url)),
        f.url,
      ).toBe(true);
    }
  });

  test('fonts: --font-* stacks name the shipped faces', () => {
    const declared = new Set(faces().map((f) => f.family));
    expect([...declared].sort()).toEqual(['EB Garamond', 'Pinyon Script']);
    const stack = (name: string) =>
      new RegExp(`${name}:\\s*([^;]+);`).exec(THEME)?.[1]?.trim() ?? '';
    expect(stack('--font-serif').startsWith('"EB Garamond",')).toBe(true);
    expect(stack('--font-script').startsWith('"Pinyon Script",')).toBe(true);
    expect(stack('--font-hand')).toBe('var(--font-script)');
    // fonts.css is imported by theme.css; only the Garamond regular is preloaded.
    expect(THEME).toMatch(/@import\s+"\.\/fonts\.css";/);
    const html = read('index.html');
    const preloads = [...html.matchAll(/<link rel="preload"[^>]*>/g)].map((m) => m[0]);
    expect(preloads.length).toBe(1);
    expect(preloads[0]).toContain('/fonts/EBGaramond-Regular.woff2');
    expect(preloads[0]).toContain('as="font"');
    expect(preloads[0]).toContain('crossorigin');
    // The OFL notice for each family ships with the files.
    const licenses = read('public/fonts/LICENSES.txt');
    for (const name of ['EB Garamond', 'Pinyon Script', 'SIL OPEN FONT LICENSE Version 1.1']) {
      expect(licenses, name).toContain(name);
    }
  });
});
