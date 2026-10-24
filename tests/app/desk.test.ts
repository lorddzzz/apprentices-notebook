import { describe, expect, test } from 'vitest';
import type { VariantDef } from '$data';
import { newProfile, type Profile } from '$engine';
import {
  deskGroups,
  deskRows,
  deskUnlocked,
  marginOf,
  needsText,
  ROAD_REFUSAL,
  spendText,
  writeAt,
} from '../../src/app/desk';

/** The footnote desk reducer (footnotes.md §1; plan FN-4). */

const home = { atHome: true };

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

/** Authored level II and capstone variants for Shove, which the shipped content does not have yet. */
const variant = (id: string, slot: VariantDef['slot']): VariantDef => ({
  id,
  subject: 'shove',
  slot,
  text: `text of ${id}`,
});
const FIXTURE: VariantDef[] = [
  variant('shove-wall-soft', { line: 'shove:wall', level: 1 }),
  variant('shove-wall-heavy', { line: 'shove:wall', level: 1 }),
  variant('shove-wall-two-a', { line: 'shove:wall', level: 2 }),
  variant('shove-wall-two-b', { line: 'shove:wall', level: 2 }),
  variant('shove-cap-a', { capstone: true }),
  variant('shove-cap-b', { capstone: true }),
  {
    ...variant('shove-cap-rival', { capstone: true }),
    rival: 'lamplighter',
    credit: "The Lamplighter's hand.",
  },
];

describe('the subject list', () => {
  test('nothing shows until a known subject has points', () => {
    expect(deskUnlocked(newProfile())).toBe(false);
    expect(deskRows(newProfile())).toEqual([]);
    expect(deskUnlocked(withShove())).toBe(true);
  });

  test('a row carries level, points to the next level and open frames', () => {
    const [row] = deskRows(withShove());
    expect(row).toMatchObject({
      subject: 'shove',
      kind: 'rune',
      points: 8,
      level: 1,
      toNext: 17,
      open: 2,
    });
    const top = deskRows(withShove({ footnotes: { shove: { points: 60, slots: {} } } }))[0];
    expect(top).toMatchObject({ level: 3, toNext: null });
    const below = deskRows(withShove({ footnotes: { shove: { points: 3, slots: {} } } }))[0];
    expect(below).toMatchObject({ level: 0, toNext: 5, open: 0 });
  });

  test('runes, methods and solvents are listed in groups; unknown ones stay out', () => {
    const base = withShove();
    const p: Profile = {
      ...base,
      methods: ['bind'],
      solventsFound: ['gallnut'],
      footnotes: {
        shove: { points: 8, slots: {} },
        bind: { points: 6, slots: {} },
        gallnut: { points: 2, slots: {} },
        conduct: { points: 9, slots: {} }, // not learned
        pitch: { points: 9, slots: {} }, // not found
      },
    };
    const rows = deskRows(p);
    expect(rows.map((r) => r.subject)).toEqual(['shove', 'bind', 'gallnut']);
    expect(rows.find((r) => r.subject === 'bind')).toMatchObject({ level: 1, toNext: 9 });
    expect(rows.find((r) => r.subject === 'gallnut')).toMatchObject({ level: 0, toNext: 3 });
    expect(deskGroups(rows).map((g) => g.kind)).toEqual(['rune', 'method', 'solvent']);
  });
});

describe('the margin column', () => {
  test('an open frame shows its choices and what writing spends', () => {
    const wall = marginOf(withShove(), 'shove').lines.find((l) => l.line === 'shove:wall');
    expect(wall?.current).toContain('wall');
    const [frame] = wall?.frames ?? [];
    expect(frame).toMatchObject({ level: 1, state: 'open', threshold: 8, blocked: null });
    expect(frame?.variants).toHaveLength(2);
    expect(frame?.spends).toEqual([{ solvent: 'gallnut', name: 'Gallnut', n: 1, count: 2 }]);
  });

  test('a filled frame is free to re-pick and marks the written choice', () => {
    const first = writeAt(withShove(), 'shove', 'shove-wall-soft', home);
    if ('error' in first) throw new Error(first.error);
    const frame = marginOf(first.profile, 'shove').lines.find((l) => l.line === 'shove:wall')
      ?.frames[0];
    expect(frame).toMatchObject({ state: 'filled', spends: [], blocked: null });
    expect(frame?.variants.find((v) => v.id === 'shove-wall-soft')?.chosen).toBe(true);
  });

  test('a locked frame has a threshold and no text; an unwitnessed line shows nothing (P9)', () => {
    const p = withShove({ footnotes: { shove: { points: 9, slots: {} } } });
    const m = marginOf(p, 'shove', { variants: FIXTURE });
    const wall = m.lines.find((l) => l.line === 'shove:wall');
    expect(wall?.frames.map((f) => [f.level, f.state])).toEqual([
      [1, 'open'],
      [2, 'locked'],
    ]);
    const locked = wall?.frames[1];
    expect(locked).toMatchObject({ threshold: 25, missing: 16, variants: [], spends: [] });
    expect(m.capstone).toMatchObject({ level: 3, state: 'locked', threshold: 60, variants: [] });
    const unseen = marginOf({ ...p, witnessed: [] }, 'shove', { variants: FIXTURE });
    expect(unseen.lines).toEqual([]);
    expect(unseen.capstone?.state).toBe('locked');
  });

  test('level II costs two of the line district, the capstone one of each home solvent', () => {
    const p = withShove({
      footnotes: { shove: { points: 60, slots: {} } },
      solvents: { ...newProfile().solvents, gallnut: 1, cinder: 1 },
    });
    const m = marginOf(p, 'shove', { variants: FIXTURE });
    const two = m.lines[0]?.frames.find((f) => f.level === 2);
    expect(two?.state).toBe('open');
    expect(two?.spends.map((s) => [s.solvent, s.n]).sort()).toEqual([
      ['cinder', 1],
      ['gallnut', 1],
    ]);
    expect(spendText(m.capstone?.spends ?? [])).toBe('Spends Gallnut and Cinder, one each');
    expect(m.capstone?.variants.map((v) => v.id)).toEqual(['shove-cap-a', 'shove-cap-b']);
  });

  test('a short purse names what is needed and disables nothing it should not', () => {
    const p = withShove({
      footnotes: { shove: { points: 60, slots: {} } },
      solvents: { ...newProfile().solvents, gallnut: 1 },
    });
    const m = marginOf(p, 'shove', { variants: FIXTURE });
    expect(m.lines[0]?.frames.find((f) => f.level === 2)?.blocked).toBe(
      'Needs 2 of Gallnut or Cinder',
    );
    expect(m.capstone?.blocked).toBe('Needs Gallnut and Cinder, one each');
    expect(needsText('shove', 'shove:wall@1')).toBe('Needs Gallnut or Cinder');
  });

  test('a rival note stays hidden until the page is held, then carries its credit', () => {
    const p = withShove({ footnotes: { shove: { points: 60, slots: {} } } });
    const hidden = marginOf(p, 'shove', { variants: FIXTURE });
    expect(hidden.capstone?.variants.some((v) => v.id === 'shove-cap-rival')).toBe(false);
    const held = marginOf(p, 'shove', { variants: FIXTURE, holdsRivalPage: () => true });
    expect(held.capstone?.variants.find((v) => v.id === 'shove-cap-rival')?.credit).toBe(
      "The Lamplighter's hand.",
    );
  });
});

describe('writing', () => {
  test('spends one solvent once, and re-picking the other variant is free', () => {
    const first = writeAt(withShove(), 'shove', 'shove-wall-soft', home);
    if ('error' in first) throw new Error(first.error);
    expect(first.profile.solvents.gallnut).toBe(1);
    expect(first.profile.footnotes.shove?.slots['shove:wall@1']).toBe('shove-wall-soft');

    const again = writeAt(first.profile, 'shove', 'shove-wall-heavy', home);
    if ('error' in again) throw new Error(again.error);
    expect(again.profile.solvents.gallnut).toBe(1);
    expect(again.profile.footnotes.shove?.slots['shove:wall@1']).toBe('shove-wall-heavy');
  });

  test('level I and level II are independent: writing one leaves the other', () => {
    const p = withShove({ footnotes: { shove: { points: 30, slots: {} } } });
    const opts = { ...home, variants: FIXTURE };
    const one = writeAt(p, 'shove', 'shove-wall-soft', opts);
    if ('error' in one) throw new Error(one.error);
    const two = writeAt(one.profile, 'shove', 'shove-wall-two-a', opts);
    if ('error' in two) throw new Error(two.error);
    const slots = two.profile.footnotes.shove?.slots;
    expect(slots).toMatchObject({
      'shove:wall@1': 'shove-wall-soft',
      'shove:wall@2': 'shove-wall-two-a',
    });
    const repick = writeAt(two.profile, 'shove', 'shove-wall-heavy', opts);
    if ('error' in repick) throw new Error(repick.error);
    expect(repick.profile.footnotes.shove?.slots['shove:wall@2']).toBe('shove-wall-two-a');
  });

  test('the capstone writes without a witnessed line', () => {
    const p = withShove({
      witnessed: [],
      footnotes: { shove: { points: 60, slots: {} } },
      solvents: { ...newProfile().solvents, gallnut: 1, cinder: 1 },
    });
    const r = writeAt(p, 'shove', 'shove-cap-a', { ...home, variants: FIXTURE });
    if ('error' in r) throw new Error(r.error);
    expect(r.profile.footnotes.shove?.capstone).toBe('shove-cap-a');
    expect(r.profile.solvents.gallnut).toBe(0);
    expect(r.profile.solvents.cinder).toBe(0);
  });

  test('without a district solvent it says what is needed and spends nothing', () => {
    const p = withShove({ solvents: { ...newProfile().solvents, pitch: 3 } });
    expect(writeAt(p, 'shove', 'shove-wall-soft', home)).toEqual({
      error: 'Needs Gallnut or Cinder',
    });
    const frame = marginOf(p, 'shove').lines.find((l) => l.line === 'shove:wall')?.frames[0];
    expect(frame?.blocked).toBe('Needs Gallnut or Cinder');
    expect(frame?.spends).toEqual([]);
  });

  test('a variant above the reached level is refused and its frame is locked', () => {
    const p = withShove({ footnotes: { shove: { points: 2, slots: {} } } });
    expect(marginOf(p, 'shove').lines[0]?.frames[0]).toMatchObject({
      state: 'locked',
      variants: [],
    });
    expect(writeAt(p, 'shove', 'shove-wall-soft', home)).toHaveProperty('error');
  });

  test('a rival note cannot be written until the page is held', () => {
    const p = withShove({
      footnotes: { shove: { points: 60, slots: {} } },
      solvents: { ...newProfile().solvents, gallnut: 1, cinder: 1 },
    });
    expect(writeAt(p, 'shove', 'shove-cap-rival', { ...home, variants: FIXTURE })).toHaveProperty(
      'error',
    );
    expect(
      writeAt(p, 'shove', 'shove-cap-rival', {
        ...home,
        variants: FIXTURE,
        holdsRivalPage: () => true,
      }),
    ).toHaveProperty('profile');
  });

  test('home only: refused on the road, nothing spent (P10)', () => {
    const p = withShove();
    expect(writeAt(p, 'shove', 'shove-wall-soft', { atHome: false })).toEqual({
      error: ROAD_REFUSAL,
    });
  });

  test('a variant of another subject, or none, is refused', () => {
    expect(writeAt(withShove(), 'spark', 'shove-wall-soft', home)).toHaveProperty('error');
    expect(writeAt(withShove(), 'shove', 'nope', home)).toHaveProperty('error');
  });
});
