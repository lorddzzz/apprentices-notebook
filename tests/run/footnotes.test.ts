import { expect, test } from 'vitest';
import type { LineId, VariantDef } from '$data';
import {
  awardFootnotePoints,
  footnoteLevel,
  footnoteOffers,
  footnoteTexts,
  newProfile,
  type Profile,
  writeFootnote,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { push } from '$engine/push';
import { board, unitAtLabel } from '../scenarios/harness';

// Test-only variants: C1 owns the real ones in data/footnotes.ts.
const V: VariantDef[] = [
  { id: 't-soft', line: 'shove:wall', level: 1, text: 'A wall crush ignores distance.' },
  { id: 't-hard', line: 'shove:wall', level: 1, text: 'A wall crush hurts more.' },
  { id: 't-l2', line: 'shove:wall', level: 2, text: 'Second level.' },
];
const WALL: LineId = 'shove:wall';

function profile(over: Partial<Profile> = {}): Profile {
  const p = newProfile();
  return { ...p, known: [...p.known, 'shove'], witnessed: [WALL], ...over };
}
const withPoints = (p: Profile, n: number): Profile =>
  awardFootnotePoints(p, Array<LineId>(n).fill(WALL));
const withSolvent = (p: Profile, id: 'gallnut' | 'cinder', n: number): Profile => ({
  ...p,
  solvents: { ...p.solvents, [id]: n },
});

test("levels come at 5 / 15 / 40 points, one per witnessed firing of the rune's lines", () => {
  const p = profile();
  expect(footnoteLevel(withPoints(p, 4), 'shove')).toBe(0);
  expect(footnoteLevel(withPoints(p, 5), 'shove')).toBe(1);
  expect(footnoteLevel(withPoints(p, 15), 'shove')).toBe(2);
  expect(footnoteLevel(withPoints(p, 40), 'shove')).toBe(3);
  // A line of a rune not yet known, earns nothing.
  expect(awardFootnotePoints(p, ['steam:blot', 'steam:slick'])).toEqual(p);
});

test('offers: reached levels, witnessed lines of that rune only', () => {
  const p = withPoints(profile(), 5);
  expect(footnoteOffers(p, 'shove', V).map((v) => v.id)).toEqual(['t-soft', 't-hard']);
  expect(footnoteOffers(withPoints(profile(), 15), 'shove', V)).toHaveLength(3);
  expect(footnoteOffers({ ...p, witnessed: [] }, 'shove', V)).toEqual([]);
  expect(footnoteOffers(withPoints(profile(), 4), 'shove', V)).toEqual([]);
});

test("writing spends one solvent of the line's district once; re-picking is free", () => {
  const p = withSolvent(withPoints(profile(), 5), 'gallnut', 2);
  const first = writeFootnote(p, 'shove', WALL, 't-soft', V);
  if ('error' in first) throw new Error(first.error);
  expect(first.profile.solvents.gallnut).toBe(1);
  const again = writeFootnote(first.profile, 'shove', WALL, 't-hard', V);
  if ('error' in again) throw new Error(again.error);
  expect(again.profile.solvents.gallnut).toBe(1);
  expect(again.profile.footnotes.shove?.chosen[WALL]).toBe('t-hard');
  expect(footnoteTexts(again.profile, V)).toEqual({ [WALL]: 'A wall crush hurts more.' });
});

test('the solvent held in greater number is spent', () => {
  const p = withSolvent(withSolvent(withPoints(profile(), 5), 'gallnut', 1), 'cinder', 3);
  const r = writeFootnote(p, 'shove', WALL, 't-soft', V);
  if ('error' in r) throw new Error(r.error);
  expect(r.profile.solvents).toMatchObject({ gallnut: 1, cinder: 2 });
});

test('errors: not reached, unknown variant, no solvent', () => {
  const rich = withSolvent(profile(), 'gallnut', 3);
  expect(writeFootnote(withPoints(rich, 4), 'shove', WALL, 't-soft', V)).toEqual({
    error: 'notReached',
  });
  expect(writeFootnote(withPoints(rich, 5), 'shove', WALL, 't-l2', V)).toEqual({
    error: 'notReached',
  });
  expect(writeFootnote(withPoints(rich, 5), 'shove', WALL, 'nope', V)).toEqual({
    error: 'unknownVariant',
  });
  expect(writeFootnote(withPoints(profile(), 5), 'shove', WALL, 't-soft', V)).toEqual({
    error: 'noSolvent',
  });
});

test('variant-changes-a-scenario-log', () => {
  const crushDamage = (footnotes: Partial<Record<LineId, string>>): number => {
    const r = runDraft(
      board('D r . . {wall}'),
      (ctx) => {
        push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 3, null);
      },
      { footnotes },
    );
    const crush = r.events.find((e) => e.type === 'crush');
    if (crush?.type !== 'crush') throw new Error('no crush');
    expect(crush.line).toBe(WALL);
    return crush.damage;
  };
  const plain = crushDamage({});
  const p = withSolvent(withPoints(profile(), 5), 'gallnut', 1);
  const w = writeFootnote(p, 'shove', WALL, 't-soft', V);
  if ('error' in w) throw new Error(w.error);
  expect(crushDamage(footnoteTexts(w.profile, V))).toBeLessThan(plain);
});
