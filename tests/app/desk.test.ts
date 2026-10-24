import { describe, expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { deskRows, deskUnlocked, offerViews, writeAt } from '../../src/app/desk';

/** The footnote desk reducer (design §8; plan P39, U7). */

const withShove = (over: Partial<Profile> = {}): Profile => {
  const base = newProfile();
  return {
    ...base,
    known: [...new Set([...base.known, 'shove' as const])],
    witnessed: ['shove:wall', 'shove:slick'],
    footnotes: { shove: { points: 8, slots: {} } },
    solvents: { ...base.solvents, gallnut: 2, cinder: 1 },
    ...over,
  };
};

describe('the rune list', () => {
  test('nothing shows until a rune has points', () => {
    expect(deskUnlocked(newProfile())).toBe(false);
    expect(deskRows(newProfile())).toEqual([]);
    expect(deskUnlocked(withShove())).toBe(true);
  });

  test('a row carries level, points to the next level and unwritten offers', () => {
    const [row] = deskRows(withShove());
    expect(row).toMatchObject({ rune: 'shove', points: 8, level: 1, toNext: 17, open: 2 });
    const top = deskRows(withShove({ footnotes: { shove: { points: 60, slots: {} } } }))[0];
    expect(top).toMatchObject({ level: 3, toNext: null });
    const below = deskRows(withShove({ footnotes: { shove: { points: 3, slots: {} } } }))[0];
    expect(below).toMatchObject({ level: 0, toNext: 5, open: 0 });
  });
});

describe('an offer', () => {
  test('shows the line, two variants and the solvent that would be spent', () => {
    const wall = offerViews(withShove(), 'shove').find((o) => o.line === 'shove:wall');
    expect(wall?.variants).toHaveLength(2);
    expect(wall?.current).toContain('wall');
    expect(wall?.written).toBe(false);
    expect(wall?.spend).toEqual({ solvent: 'gallnut', name: 'Gallnut', n: 1, count: 2 });
    expect(wall?.level).toBe(1);
    expect(wall?.blocked).toBeNull();
  });
});

describe('writing', () => {
  test('spends one solvent once, and re-picking the other variant is free', () => {
    const first = writeAt(withShove(), 'shove', 'shove:wall', 'shove-wall-soft');
    if ('error' in first) throw new Error(first.error);
    expect(first.profile.solvents.gallnut).toBe(1);
    expect(first.profile.footnotes.shove?.slots['shove:wall@1']).toBe('shove-wall-soft');
    const view = offerViews(first.profile, 'shove').find((o) => o.line === 'shove:wall');
    expect(view?.written).toBe(true);
    expect(view?.spend).toBeNull();
    expect(view?.variants.find((v) => v.id === 'shove-wall-soft')?.chosen).toBe(true);

    const again = writeAt(first.profile, 'shove', 'shove:wall', 'shove-wall-heavy');
    if ('error' in again) throw new Error(again.error);
    expect(again.profile.solvents.gallnut).toBe(1);
    expect(again.profile.footnotes.shove?.slots['shove:wall@1']).toBe('shove-wall-heavy');
  });

  test('without a district solvent it says what is needed and spends nothing', () => {
    const p = withShove({ solvents: { ...newProfile().solvents, pitch: 3 } });
    expect(writeAt(p, 'shove', 'shove:wall', 'shove-wall-soft')).toEqual({
      error: 'Needs Gallnut or Cinder',
    });
    const view = offerViews(p, 'shove').find((o) => o.line === 'shove:wall');
    expect(view?.blocked).toBe('Needs Gallnut or Cinder');
    expect(view?.spend).toBeNull();
  });

  test('a variant above the reached level offers nothing and is refused', () => {
    const p = withShove({ footnotes: { shove: { points: 2, slots: {} } } });
    expect(offerViews(p, 'shove')).toEqual([]);
    expect(writeAt(p, 'shove', 'shove:wall', 'shove-wall-soft')).toHaveProperty('error');
  });
});
