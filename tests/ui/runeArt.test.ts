import { describe, expect, it } from 'vitest';
import { METHOD_IDS } from '$data/next/methods';
import { RUNE_IDS } from '$data/next/runes';
import { SOLVENT_IDS } from '$data/next/solvents';
import { FILLED_ART, METHOD_ART, ROLE_COLOR, RUNE_ART, SOLVENT_ART } from '$ui/runeArt';

const ARITY: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};
const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g;

/**
 * Absolute end points of every segment, with relative commands resolved. Control points and arc
 * radii are not checked: the copied glyphs use relative deltas, so a raw number scan would
 * flag negative offsets that are fine on the page.
 */
function endPoints(d: string): [number, number][] {
  const tokens = d.match(TOKEN) ?? [];
  const out: [number, number][] = [];
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i] ?? '';
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        x = sx;
        y = sy;
        cmd = '';
        continue;
      }
    }
    const up = cmd.toUpperCase();
    const n = ARITY[up];
    if (!n) throw new Error(`bad path command in "${d}" at token ${i}`);
    if (i + n > tokens.length) throw new Error(`short arguments in "${d}"`);
    const args = tokens.slice(i, i + n).map(Number);
    i += n;
    const rel = cmd !== up;
    let ex: number;
    let ey: number;
    if (up === 'H') {
      ex = rel ? x + (args[0] ?? 0) : (args[0] ?? 0);
      ey = y;
    } else if (up === 'V') {
      ex = x;
      ey = rel ? y + (args[0] ?? 0) : (args[0] ?? 0);
    } else {
      const ax = args[n - 2] ?? 0;
      const ay = args[n - 1] ?? 0;
      ex = rel ? x + ax : ax;
      ey = rel ? y + ay : ay;
    }
    if (up === 'M') {
      sx = ex;
      sy = ey;
      cmd = rel ? 'l' : 'L'; // later pairs after a move are implicit line-tos
    }
    x = ex;
    y = ey;
    out.push([x, y]);
  }
  return out;
}

const allPaths = (): [string, string][] => [
  ...Object.entries(RUNE_ART).map(([k, v]) => [`rune ${k}`, v] as [string, string]),
  ...Object.entries(METHOD_ART).map(([k, v]) => [`method ${k}`, v] as [string, string]),
  ...Object.entries(SOLVENT_ART).map(([k, v]) => [`solvent ${k}`, v] as [string, string]),
];

describe('rune art', () => {
  it('has a non-empty path for every rune, method and solvent', () => {
    for (const id of RUNE_IDS) expect(RUNE_ART[id], id).not.toBe('');
    for (const id of METHOD_IDS) expect(METHOD_ART[id], id).not.toBe('');
    for (const id of SOLVENT_IDS) expect(SOLVENT_ART[id], id).not.toBe('');
  });

  it('keeps every segment end point inside the 24-unit box', () => {
    for (const [label, d] of allPaths()) {
      const points = endPoints(d);
      expect(points.length, label).toBeGreaterThan(0);
      for (const [px, py] of points) {
        expect(px, `${label}: x in ${d}`).toBeGreaterThanOrEqual(0);
        expect(px, `${label}: x in ${d}`).toBeLessThanOrEqual(24);
        expect(py, `${label}: y in ${d}`).toBeGreaterThanOrEqual(0);
        expect(py, `${label}: y in ${d}`).toBeLessThanOrEqual(24);
      }
    }
  });

  it('gives no two runes the same path', () => {
    const paths = new Set(Object.values(RUNE_ART));
    expect(paths.size).toBe(RUNE_IDS.length);
  });

  it('draws ink and spark filled', () => {
    expect(FILLED_ART.has('ink')).toBe(true);
    expect(FILLED_ART.has('spark')).toBe(true);
  });

  it('names one custom property per role', () => {
    expect(Object.keys(ROLE_COLOR).sort()).toEqual(
      ['action', 'aura', 'kind', 'seal', 'shape', 'source', 'trigger'].sort(),
    );
    for (const value of Object.values(ROLE_COLOR)) expect(value).toMatch(/^--role-[a-z]+$/);
  });
});
