import { describe, expect, test } from 'vitest';
import type { VariantDef } from '$data';
import { newProfile, type Profile } from '$engine';
import { marginOf, writeAt } from '../../src/app/desk';

/** The rival-note slot hook (footnotes §1 "Rival notes", plan FN-8): hidden, offered, written, credited. */

const variant = (id: string, over: Partial<VariantDef> = {}): VariantDef => ({
  id,
  subject: 'shove',
  slot: { line: 'shove:wall', level: 1 },
  text: `text of ${id}`,
  ...over,
});
const FIXTURE: VariantDef[] = [
  variant('a'),
  variant('b'),
  variant('wick', { rival: 'lamplighter' }),
];

const profile = (pages?: Profile['pages']): Profile => {
  const base = newProfile();
  return {
    ...base,
    known: [...new Set([...base.known, 'shove' as const])],
    witnessed: ['shove:wall'],
    footnotes: { shove: { points: 8, slots: {} } },
    solvents: { ...base.solvents, gallnut: 1 },
    pages,
  };
};

const frameOf = (p: Profile) => marginOf(p, 'shove', { variants: FIXTURE }).lines[0]?.frames[0];
const home = { atHome: true, variants: FIXTURE };

describe('a rival note in a named slot', () => {
  test('hidden until the page is held, then a third option at the same level and cost', () => {
    const before = frameOf(profile());
    expect(before?.variants.map((v) => v.id)).toEqual(['a', 'b']);

    const after = frameOf(profile(['lamplighter:lantern']));
    expect(after?.variants.map((v) => v.id)).toEqual(['a', 'b', 'wick']);
    expect(after?.level).toBe(before?.level);
    expect(after?.spends).toEqual(before?.spends);
    expect(after?.blocked).toBe(before?.blocked);
  });

  test('refused without the page; written with it, spending as any variant, and credited', () => {
    expect(writeAt(profile(), 'shove', 'wick', home)).toHaveProperty('error');
    const r = writeAt(profile(['lamplighter:lantern']), 'shove', 'wick', home);
    if ('error' in r) throw new Error(r.error);
    expect(r.profile.solvents.gallnut).toBe(0);
    expect(r.profile.footnotes.shove?.slots['shove:wall@1']).toBe('wick');
    const written = frameOf(r.profile)?.variants.find((v) => v.id === 'wick');
    expect(written?.chosen).toBe(true);
    expect(written?.credit).toBe("Lamplighter's hand.");
    expect(frameOf(r.profile)?.variants.find((v) => v.id === 'a')?.credit).toBeNull();
  });

  test('re-picking away from the rival note is free', () => {
    const w = writeAt(profile(['lamplighter:lantern']), 'shove', 'wick', home);
    if ('error' in w) throw new Error(w.error);
    const back = writeAt(w.profile, 'shove', 'a', home);
    if ('error' in back) throw new Error(back.error);
    expect(back.profile.solvents.gallnut).toBe(0);
  });
});
