import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { LINES } from '$data';

// Allowlist: `<id>` -> one-line reason. Empty so far.
const ALLOW: Record<string, string> = {};

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|svelte)$/.test(e.name) ? [p] : [];
  });
}

const PATTERNS = [/withLine\(\s*[\w.]+\s*,\s*'([\w-]+:[\w-]+)'/g, /\bline:\s*'([\w-]+:[\w-]+)'/g];

test('CI-4: every literal line id in src is a row', () => {
  const ids = new Set<string>(LINES.map((l) => l.id));
  const subjects = new Set<string>(LINES.map((l) => l.subject));
  const missing: string[] = [];
  let seen = 0;
  for (const f of walk('src')) {
    const text = readFileSync(f, 'utf8');
    for (const re of PATTERNS) {
      for (const m of text.matchAll(re)) {
        const id = m[1] ?? '';
        // A district event type (`cartographers:inked`) has no LineSubject prefix.
        if (!subjects.has(id.split(':')[0] ?? '')) continue;
        if (id in ALLOW) continue;
        seen++;
        if (!ids.has(id)) missing.push(`${f}: ${id}`);
      }
    }
  }
  expect(seen).toBeGreaterThan(0);
  expect(missing).toEqual([]);
});
