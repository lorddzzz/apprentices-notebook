import { expect, test } from 'vitest';
import { codexView, newProfile, type Profile } from '$engine';
import { lineTextFor } from '../../src/app/bench';
import { marginOf } from '../../src/app/desk';

/** Codex margin column and fine print for methods and solvents (plan FN-5). */

const base = (over: Partial<Profile> = {}): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...new Set([...p.known, 'shove' as const])],
    witnessed: ['shove:wall', 'bind:cloud', 'gallnut:unit'],
    solventsFound: ['gallnut'],
    footnotes: { shove: { points: 8, slots: { 'shove:wall@1': 'shove-wall-heavy' } } },
    ...over,
  };
};

const row = (p: Profile, id: string) => codexView(p).find((r) => r.entry.ref === id);

test('method and solvent pages list their witnessed fine print, counting the rest', () => {
  const p = base({ methods: [...newProfile().methods, 'bind' as const] });
  const bind = row(p, 'bind');
  expect(bind?.fine?.seen.map((l) => l.id)).toEqual(['bind:cloud']);
  expect(bind?.fine?.total).toBeGreaterThan(1);
  const gall = row(p, 'gallnut');
  expect(gall?.fine?.seen.map((l) => l.id)).toEqual(['gallnut:unit']);
});

test('an unknown method page lists no fine print', () => {
  const p = base({ methods: [] });
  expect(row(p, 'bind')?.fine?.seen).toEqual([]);
});

test('the margin is read-only frames: filled text reads in the owner hand; unwitnessed lines show nothing', () => {
  const p = base();
  const m = marginOf(p, 'shove');
  const wall = m.lines.find((l) => l.line === 'shove:wall');
  expect(wall?.frames[0]?.state).toBe('filled');
  const written = wall?.frames[0]?.variants.find((v) => v.chosen);
  expect(written?.id).toBe('shove-wall-heavy');
  expect(lineTextFor(p, 'shove:wall')).toContain(written?.text ?? 'missing');
  expect(m.lines.map((l) => l.line)).not.toContain('shove:slick');
});
