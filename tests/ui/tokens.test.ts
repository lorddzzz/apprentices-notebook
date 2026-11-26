import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS } from '../../src/data/districts';

/** UF-1: theme.css is the one token file (C1). These read it as text: cheap, no browser. */

const ROOT = join(__dirname, '../..');
const THEME = readFileSync(join(ROOT, 'src/ui/theme.css'), 'utf8');

interface Rule {
  selector: string;
  decls: Map<string, string>;
}

/** Leaf rules (selector + declarations); at-rule wrappers are walked through. */
function parseRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const walk = (src: string): void => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf('{', i);
      if (open < 0) return;
      let depth = 1;
      let j = open + 1;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
      }
      const prelude = src.slice(i, open).trim();
      const body = src.slice(open + 1, j - 1);
      if (body.includes('{')) walk(body);
      else {
        const decls = new Map<string, string>();
        for (const part of body.split(';')) {
          const c = part.indexOf(':');
          if (c < 0) continue;
          decls.set(part.slice(0, c).trim(), part.slice(c + 1).trim());
        }
        rules.push({ selector: prelude.replace(/\s+/g, ' '), decls });
      }
      i = j;
    }
  };
  walk(text);
  return rules;
}

const RULES = parseRules(THEME);
const ROOT_DECLS = new Map<string, string>();
for (const r of RULES) {
  if (r.selector === ':root') for (const [k, v] of r.decls) ROOT_DECLS.set(k, v);
}

/** Follow var() chains through :root until a literal remains. */
function resolve(name: string, seen = new Set<string>()): string {
  const v = ROOT_DECLS.get(name);
  if (v === undefined) throw new Error(`${name} is not declared in :root`);
  if (seen.has(name)) throw new Error(`cycle at ${name}`);
  const path = new Set(seen).add(name);
  return v.replace(/var\((--[\w-]+)\)/g, (_, n: string) => resolve(n, path));
}

const C1_NAMES = [
  '--font-serif',
  '--font-script',
  '--font-hand',
  '--font-mono',
  '--type-xs',
  '--type-sm',
  '--type-md',
  '--type-lg',
  '--type-xl',
  '--type-title',
  '--danger',
  '--gold',
  '--role-source',
  '--role-action',
  '--role-kind',
  '--role-shape',
  '--role-trigger',
  '--role-seal',
  '--role-aura',
  '--hue-slate',
  '--hue-rust',
  '--hue-amber',
  '--hue-moss',
  '--hue-teal',
  '--hue-plum',
  '--hue-rose',
  '--hue-ochre',
  '--hue-indigo',
  '--hue-gilt',
  '--overlay-danger',
  '--overlay-reach',
  '--overlay-preview',
  '--overlay-first',
  '--overlay-shield',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--tap',
  '--radius',
  '--shadow-1',
  '--shadow-2',
  '--dur-quick',
  '--dur-base',
  '--dur-held',
];

/** Every :root name and value at the base commit (17c2414), before the C1 reorganisation. */
const LEGACY: Record<string, string> = {
  '--parchment': '#f1e6cc',
  '--parchment-dark': '#e2d2ae',
  '--ink': '#2b2118',
  '--ink-soft': '#5a4a3a',
  '--accent': '#8b3a2b',
  '--lamp': '#e8b04a',
  '--night': '#1f2a3a',
  '--parchment-deep': '#d6c39a',
  '--ink-faint': 'rgba(43, 33, 24, 0.45)',
  '--line': 'rgba(43, 33, 24, 0.22)',
  '--m-ink': '#1d2a4a',
  '--m-oil': '#7a6420',
  '--m-oil-tint': 'rgba(122, 100, 32, 0.3)',
  '--m-steam': '#a9bcc6',
  '--m-spark': '#e2a312',
  '--m-brass': '#b5882e',
  '--m-brass-dark': '#7a5a1a',
  '--m-fire': '#d2552a',
  '--m-fire-tint': 'rgba(210, 85, 42, 0.4)',
  '--vent': '#55606a',
  '--f-source': '#8b3a2b',
  '--f-shape': '#5a4a3a',
  '--f-trigger': '#5b4a8a',
  '--f-aura': '#b07d1e',
  '--role-source': '#2f4f6f',
  '--role-action': '#8b3a2b',
  '--role-kind': '#a8741a',
  '--role-shape': '#4f5d6b',
  '--role-trigger': '#4f6b3a',
  '--role-seal': '#c98a14',
  '--role-aura': '#6a4a9a',
  '--member-draughtsman': '#2f4f6f',
  '--member-stoker': '#a2471f',
  '--hue-slate': '#2f4f6f',
  '--hue-rust': '#a2471f',
  '--hue-amber': '#8f5a00',
  '--hue-moss': '#44651f',
  '--hue-teal': '#17625c',
  '--hue-plum': '#7b3a6c',
  '--hue-rose': '#a8324c',
  '--hue-ochre': '#6b6412',
  '--hue-indigo': '#4a3f94',
  '--hue-gilt': '#6e5200',
  '--token-fill': '#f1e6cc',
  '--enemy': '#2b2118',
  '--danger': '#b3261e',
  '--danger-tint': 'rgba(179, 38, 30, 0.16)',
  '--shield': '#4f7ea8',
  '--habit': '#7b3a6c',
  '--select': '#e8b04a',
  '--reach': 'rgba(47, 79, 111, 0.35)',
  '--wall': '#2e2420',
  '--wood': '#6b4a2f',
  '--wood-dark': '#4a3426',
  '--wood-deep': '#2a1d15',
  '--mono': 'ui-monospace, Menlo, monospace',
  '--tap': '44px',
  '--radius': '6px',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '16px',
  '--space-4': '24px',
  '--safe-top': 'env(safe-area-inset-top, 0px)',
  '--safe-right': 'env(safe-area-inset-right, 0px)',
  '--safe-bottom': 'env(safe-area-inset-bottom, 0px)',
  '--safe-left': 'env(safe-area-inset-left, 0px)',
};

/** Every stylesheet text under src/ui other than theme.css: .css files and Svelte <style> blocks. */
function otherStyleTexts(): { file: string; css: string }[] {
  const out: { file: string; css: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.css') && !p.endsWith('theme.css'))
        out.push({ file: p, css: readFileSync(p, 'utf8') });
      else if (p.endsWith('.svelte')) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
          out.push({ file: p, css: m[1] ?? '' });
      }
    }
  };
  walk(join(ROOT, 'src/ui'));
  return out;
}

describe('C1 tokens', () => {
  test('tokens: every C1 name is declared', () => {
    const missing = C1_NAMES.filter((n) => !ROOT_DECLS.has(n));
    expect(missing).toEqual([]);
    expect(resolve('--font-hand')).toBe(resolve('--font-script'));
    expect(
      ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5'].map((n) => resolve(n)),
    ).toEqual(['4px', '8px', '16px', '24px', '32px']);
    expect(resolve('--tap')).toBe('44px');
    expect(['--dur-quick', '--dur-base', '--dur-held'].map((n) => resolve(n))).toEqual([
      '250ms',
      '400ms',
      '800ms',
    ]);
    // world palettes and the three world roots
    expect([...ROOT_DECLS.keys()].some((k) => k.startsWith('--home-'))).toBe(true);
    expect([...ROOT_DECLS.keys()].some((k) => k.startsWith('--city-'))).toBe(true);
    const selectors = RULES.map((r) => r.selector);
    for (const w of ['home', 'city', 'system']) expect(selectors).toContain(`[data-world="${w}"]`);
    // the small-caps label class, real small caps, never uppercase
    // scoped to C1 world roots: unmigrated components have their own scoped .label classes
    const label = RULES.find((r) => r.selector.startsWith(':where([data-world]) .label'));
    expect(label?.decls.get('font-variant-caps')).toBe('all-small-caps');
    expect(label?.decls.has('text-transform')).toBe(false);
    // gold is its own colour, not the amber selection or the lamp
    expect(resolve('--gold')).not.toBe(resolve('--select'));
  });

  test('tokens: overlay tokens only in :root', () => {
    for (const r of RULES) {
      const overlays = [...r.decls.keys()].filter((k) => k.startsWith('--overlay-'));
      if (overlays.length > 0) expect(r.selector, overlays.join(',')).toBe(':root');
    }
    const elsewhere = otherStyleTexts().filter(({ css }) => /--overlay-[\w-]+\s*:/.test(css));
    expect(elsewhere.map((e) => e.file)).toEqual([]);
  });

  test('tokens: --overlay-preview is not --select', () => {
    const raw = ROOT_DECLS.get('--overlay-preview');
    expect(raw).toBeDefined();
    expect(raw).not.toContain('--select');
    expect(raw).not.toContain('--lamp');
    expect(resolve('--overlay-preview')).not.toBe(resolve('--select'));
    // it is the paint the "Next round" preview already uses
    expect(resolve('--overlay-preview')).toBe(resolve('--m-oil'));
  });

  test('tokens: one [data-world][data-district] block per DISTRICT_IDS id', () => {
    const blocks = RULES.filter((r) => r.selector.includes('[data-district'));
    const ids = blocks.map((r) => {
      const m = /^\[data-world\]\[data-district="(\w+)"\]$/.exec(r.selector);
      expect(m, r.selector).not.toBeNull();
      return m?.[1];
    });
    expect(ids).toEqual([...DISTRICT_IDS]);
    for (const b of blocks) {
      for (const n of ['--district-dark', '--district-mid', '--district-light'])
        expect(b.decls.get(n), `${b.selector} ${n}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect([...b.decls.keys()].filter((k) => k.startsWith('--overlay-'))).toEqual([]);
    }
    const seam = blocks[0];
    expect(seam?.decls.get('--district-dark')?.toLowerCase()).toBe('#253235');
  });

  test('tokens: no bare [data-district] selector', () => {
    for (const r of RULES) {
      for (const part of r.selector.split(',')) {
        if (!part.includes('[data-district')) continue;
        expect(part.trim(), r.selector).toMatch(/^\[data-world[^\]]*\]\[data-district/);
      }
    }
  });

  test('tokens: legacy names still resolve', () => {
    for (const [name, value] of Object.entries(LEGACY)) {
      expect(resolve(name), name).toBe(value);
    }
    // --hand became an alias of the script face; the old stack follows it as the fallback
    expect(ROOT_DECLS.get('--hand')).toBe('var(--font-script)');
    expect(resolve('--hand')).toContain(
      '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive',
    );
    // the desk skin the Study and the Lab depend on is still there
    expect(RULES.some((r) => r.selector === '.desk .editor .page')).toBe(true);
    expect(RULES.some((r) => r.selector === ':root[data-theme="dark"]')).toBe(true);
  });
});
