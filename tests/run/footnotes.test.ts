import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  capstoneKey,
  footnoteKeyOf,
  type LineId,
  SHOVE_WALL_SOFT,
  slotKey,
  VARIANTS,
  type VariantDef,
} from '$data';
import {
  awardFootnotePoints,
  footnoteCost,
  footnoteIds,
  footnoteLevel,
  footnoteOffers,
  type GameEvent,
  newProfile,
  type Profile,
  pointLines,
  rivalCasters,
  slotsOf,
  writeFootnote,
} from '$engine';
import { createBattle } from '$engine/battle';
import { type FootnoteIds, runDraft } from '$engine/ctx';
import { push } from '$engine/push';
import { learnFromFight } from '$engine/trip/finish';
import { board, unitAtLabel } from '../scenarios/harness';

/** Footnote points, levels, margins and writes (footnotes.md §1; plan FN-1: P2, P3, P11). */

const WALL: LineId = 'shove:wall';
const SLICK: LineId = 'shove:slick';
const W1 = slotKey(WALL, 1);
const W2 = slotKey(WALL, 2);
const CAP = capstoneKey('shove');
// Test-only variants: the real ones live in data/footnotes/.
const V: VariantDef[] = [
  { id: 't-soft', subject: 'shove', slot: { line: WALL, level: 1 }, text: 'Soft.' },
  { id: 't-hard', subject: 'shove', slot: { line: WALL, level: 1 }, text: 'Hard.' },
  { id: 't-l2a', subject: 'shove', slot: { line: WALL, level: 2 }, text: 'Level II, a.' },
  { id: 't-l2b', subject: 'shove', slot: { line: WALL, level: 2 }, text: 'Level II, b.' },
  { id: 't-slick', subject: 'shove', slot: { line: SLICK, level: 1 }, text: 'Unwitnessed.' },
  { id: 't-capa', subject: 'shove', slot: { capstone: true }, text: 'Capstone a.' },
  { id: 't-capb', subject: 'shove', slot: { capstone: true }, text: 'Capstone b.' },
  {
    id: 't-rival',
    subject: 'shove',
    slot: { line: WALL, level: 1 },
    text: "The rival's way.",
    rival: 'lamplighter',
    credit: 'The Lamplighter wrote this.',
  },
  { id: 't-bind', subject: 'bind', slot: { capstone: true }, text: 'Bind capstone.' },
];
const OPTS = { variants: V };
const HELD = { variants: V, holdsRivalPage: (r: string) => r === 'lamplighter' };

function profile(over: Partial<Profile> = {}): Profile {
  const p = newProfile();
  return { ...p, known: [...p.known, 'shove'], witnessed: [WALL], ...over };
}
const withPoints = (p: Profile, n: number): Profile =>
  awardFootnotePoints(p, Array<LineId>(n).fill(WALL));
const withSolvents = (p: Profile, held: Partial<Profile['solvents']>): Profile => ({
  ...p,
  solvents: { ...p.solvents, ...held },
});
const ok = (r: ReturnType<typeof writeFootnote>): Profile => {
  if ('error' in r) throw new Error(r.error);
  return r.profile;
};
const rat = { id: 'rat-1', name: 'rat', at: { x: 0, y: 0 }, member: false };
const stamped = (line?: LineId): GameEvent => ({
  type: 'held',
  unit: rat,
  rounds: 1,
  ...(line ? { line } : {}),
});

describe('points and levels (P2)', () => {
  test('rune levels come at 8 / 25 / 60 points', () => {
    const p = profile();
    const levels = [7, 8, 24, 25, 59, 60].map((n) => footnoteLevel(withPoints(p, n), 'shove'));
    expect(levels).toEqual([0, 1, 1, 2, 2, 3]);
  });

  test('methods and solvents use 5 / 15 / 36', () => {
    const p: Profile = { ...newProfile(), methods: ['bind'], solventsFound: ['gallnut'] };
    const at = (line: LineId, n: number) => awardFootnotePoints(p, Array<LineId>(n).fill(line));
    const bind = [4, 5, 15, 36].map((n) => footnoteLevel(at('bind:cloud', n), 'bind'));
    expect(bind).toEqual([0, 1, 2, 3]);
    const gall = [4, 5, 14, 35, 36].map((n) => footnoteLevel(at('gallnut:unit', n), 'gallnut'));
    expect(gall).toEqual([0, 1, 1, 2, 3]);
  });

  test('every known subject whose line fires is credited; unknown ones are not', () => {
    const p: Profile = { ...profile(), methods: ['bind'], solventsFound: ['gallnut'] };
    const r = awardFootnotePoints(p, [WALL, 'bind:cloud', 'gallnut:unit', 'conduct:network']);
    expect(r.footnotes.shove?.points).toBe(1);
    expect(r.footnotes.bind?.points).toBe(1);
    expect(r.footnotes.gallnut?.points).toBe(1);
    expect(r.footnotes.conduct).toBeUndefined(); // not learned
    expect(awardFootnotePoints(profile(), ['steam:blot', 'cinder:slick'])).toEqual(profile());
  });

  test('no double count per run: one point per consecutive run of a line', () => {
    const log = [stamped(WALL), stamped(WALL), stamped(), stamped(WALL)];
    expect(pointLines(log)).toEqual([WALL]);
    expect(pointLines([...log, stamped(SLICK), stamped(WALL)])).toEqual([WALL, SLICK, WALL]);
  });

  test("a rival's casts reveal lines but earn no points, and break the household's run", () => {
    const b = createBattle({
      title: 't',
      board: '. . .\n. L .\n. . .',
      seed: 1,
      intents: {},
    }).state;
    const rival = b.units.find((u) => u.kind === 'enemy' && u.rival);
    if (!rival) throw new Error('no rival');
    expect([...rivalCasters(b)]).toEqual([rival.id]);
    const by = (caster: string, line: LineId): GameEvent => ({
      ...stamped(line),
      origin: { caster, spell: 'lantern', cast: 1 },
    });
    const log = [by('stoker', WALL), by(rival.id, WALL), by('stoker', WALL), by(rival.id, SLICK)];
    expect(pointLines(log, rivalCasters(b))).toEqual([WALL, WALL]);
    const learned = learnFromFight(profile({ witnessed: [] }), b, log);
    expect(learned.witnessed).toEqual(expect.arrayContaining([WALL, SLICK]));
    expect(learned.footnotes.shove?.points).toBe(2);
  });

  test('the Bench and the Lab never award points', () => {
    for (const f of ['bench.ts', 'bench.svelte.ts', 'lab.ts', 'lab.svelte.ts']) {
      const src = readFileSync(new URL(`../../src/app/${f}`, import.meta.url), 'utf8');
      expect(src).not.toMatch(/awardFootnotePoints|learnFromFight|finishEncounter|closeBattle/);
    }
  });
});

describe('the margin (slots and capstone)', () => {
  test('witnessed margin lines show level I and II; locked frames carry no text', () => {
    const slots = slotsOf(withPoints(profile(), 8), 'shove', OPTS);
    expect(slots.map((s) => [s.key, s.state, s.threshold])).toEqual([
      [W1, 'open', 8],
      [W2, 'locked', 25],
      [CAP, 'locked', 60],
    ]);
    expect(slots[0]?.options.map((v) => v.id)).toEqual(['t-soft', 't-hard']); // no rival note
    expect(slots[1]?.options).toEqual([]);
    expect(slotsOf(withPoints(profile(), 7), 'shove', OPTS)[0]?.state).toBe('locked');
  });

  test('the capstone opens at level III without a witnessed line', () => {
    const p = withSolvents(withPoints(profile({ witnessed: [] }), 60), { gallnut: 1, cinder: 1 });
    const slots = slotsOf(p, 'shove', OPTS);
    expect(slots.map((s) => [s.key, s.state])).toEqual([[CAP, 'open']]);
    expect(slots[0]?.options.map((v) => v.id)).toEqual(['t-capa', 't-capb']);
    const w = ok(writeFootnote(p, 'shove', CAP, 't-capa', OPTS));
    expect(w.footnotes.shove?.capstone).toBe('t-capa');
    expect(slotsOf(w, 'shove', OPTS)[0]).toMatchObject({ state: 'filled', written: 't-capa' });
    expect(footnoteIds(w, V)).toEqual({ [CAP]: 't-capa' });
  });

  test('offers list open and filled choices, capstones included', () => {
    const p = withPoints(profile(), 60);
    expect(footnoteOffers(p, 'shove', V).map((v) => v.id)).toEqual([
      't-soft',
      't-hard',
      't-l2a',
      't-l2b',
      't-capa',
      't-capb',
    ]);
    expect(footnoteOffers(withPoints(profile(), 7), 'shove', V)).toEqual([]);
  });
});

describe('writing (P3, P11)', () => {
  test('level I costs one solvent of the line district, most held first', () => {
    const p = withSolvents(withPoints(profile(), 8), { gallnut: 1, cinder: 3 });
    expect(footnoteCost(p, 'shove', W1)).toEqual([{ solvent: 'cinder', n: 1 }]);
    const w = ok(writeFootnote(p, 'shove', W1, 't-soft', OPTS));
    expect(w.solvents).toMatchObject({ gallnut: 1, cinder: 2 });
  });

  test('level II costs two of the line district, any mix', () => {
    const p = withPoints(profile(), 25);
    const mix = withSolvents(p, { gallnut: 1, cinder: 1 });
    expect(footnoteCost(mix, 'shove', W2)).toEqual([
      { solvent: 'gallnut', n: 1 },
      { solvent: 'cinder', n: 1 },
    ]);
    const w = ok(writeFootnote(mix, 'shove', W2, 't-l2a', OPTS));
    expect(w.solvents).toMatchObject({ gallnut: 0, cinder: 0 });
    const one = withSolvents(p, { cinder: 3 });
    expect(footnoteCost(one, 'shove', W2)).toEqual([{ solvent: 'cinder', n: 2 }]);
    const short = withSolvents(p, { gallnut: 1, pitch: 4 });
    expect(footnoteCost(short, 'shove', W2)).toBeNull();
    expect(writeFootnote(short, 'shove', W2, 't-l2a', OPTS)).toEqual({ error: 'noSolvent' });
  });

  test("the capstone costs one of each of the subject's home district solvents", () => {
    const p = withPoints(profile(), 60);
    expect(footnoteCost(withSolvents(p, { cinder: 5 }), 'shove', CAP)).toBeNull();
    const both = withSolvents(p, { gallnut: 2, cinder: 1 });
    expect(footnoteCost(both, 'shove', CAP)).toEqual([
      { solvent: 'gallnut', n: 1 },
      { solvent: 'cinder', n: 1 },
    ]);
    const w = ok(writeFootnote(both, 'shove', CAP, 't-capb', OPTS));
    expect(w.solvents).toMatchObject({ gallnut: 1, cinder: 0 });
    // Bind's home is the Ink Quarter: Wax and Sand, whichever district its lines were found in.
    const bind: Profile = {
      ...newProfile(),
      methods: ['bind'],
      footnotes: { bind: { points: 36, slots: {} } },
    };
    const seamOnly = withSolvents(bind, { gallnut: 3, cinder: 3 });
    expect(footnoteCost(seamOnly, 'bind', 'bind@cap')).toBeNull();
    expect(footnoteCost(withSolvents(bind, { wax: 1, sand: 1 }), 'bind', 'bind@cap')).toEqual([
      { solvent: 'wax', n: 1 },
      { solvent: 'sand', n: 1 },
    ]);
  });

  test('re-picking a filled slot or capstone is free', () => {
    const p = withSolvents(withPoints(profile(), 60), { gallnut: 4, cinder: 4 });
    const a = ok(writeFootnote(p, 'shove', W1, 't-soft', OPTS));
    expect(footnoteCost(a, 'shove', W1)).toEqual([]);
    const b = ok(writeFootnote(a, 'shove', W1, 't-hard', OPTS));
    expect(b.solvents).toEqual(a.solvents);
    const c = ok(writeFootnote(b, 'shove', CAP, 't-capa', OPTS));
    const d = ok(writeFootnote(c, 'shove', CAP, 't-capb', OPTS));
    expect(d.solvents).toEqual(c.solvents);
    expect(d.footnotes.shove?.capstone).toBe('t-capb');
  });

  test('level I and II of a line are independent', () => {
    const p = withSolvents(withPoints(profile(), 25), { gallnut: 9 });
    const one = ok(writeFootnote(p, 'shove', W1, 't-soft', OPTS));
    const both = ok(writeFootnote(one, 'shove', W2, 't-l2b', OPTS));
    const re1 = ok(writeFootnote(both, 'shove', W1, 't-hard', OPTS));
    expect(re1.footnotes.shove?.slots).toEqual({ [W1]: 't-hard', [W2]: 't-l2b' });
    const re2 = ok(writeFootnote(re1, 'shove', W2, 't-l2a', OPTS));
    expect(re2.footnotes.shove?.slots).toEqual({ [W1]: 't-hard', [W2]: 't-l2a' });
    expect(footnoteIds(re2, V)).toEqual({ [W1]: 't-hard', [W2]: 't-l2a' });
  });

  test('errors: not reached, unwitnessed, unknown variant, wrong slot, no solvent', () => {
    const rich = withSolvents(profile(), { gallnut: 3 });
    const at8 = withPoints(rich, 8);
    expect(writeFootnote(withPoints(rich, 7), 'shove', W1, 't-soft', OPTS)).toEqual({
      error: 'notReached',
    });
    expect(writeFootnote(at8, 'shove', W2, 't-l2a', OPTS)).toEqual({ error: 'notReached' });
    expect(writeFootnote(at8, 'shove', slotKey(SLICK, 1), 't-slick', OPTS)).toEqual({
      error: 'notReached',
    });
    expect(writeFootnote(at8, 'shove', W1, 'nope', OPTS)).toEqual({ error: 'unknownVariant' });
    expect(writeFootnote(at8, 'shove', W2, 't-soft', OPTS)).toEqual({ error: 'unknownVariant' });
    expect(writeFootnote(withPoints(profile(), 8), 'shove', W1, 't-soft', OPTS)).toEqual({
      error: 'noSolvent',
    });
  });

  test("a rival note is hidden until the page is held, then a third option at the slot's cost", () => {
    const p = withSolvents(withPoints(profile(), 8), { gallnut: 1 });
    expect(writeFootnote(p, 'shove', W1, 't-rival', OPTS)).toEqual({ error: 'notHeld' });
    const open = slotsOf(p, 'shove', HELD)[0];
    expect(open?.options.map((v) => v.id)).toEqual(['t-soft', 't-hard', 't-rival']);
    const w = ok(writeFootnote(p, 'shove', W1, 't-rival', HELD));
    expect(w.solvents.gallnut).toBe(0);
    expect(w.footnotes.shove?.slots[W1]).toBe('t-rival');
  });
});

test('variant-changes-a-scenario-log', () => {
  const crushDamage = (footnotes: FootnoteIds): number => {
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
  const p = withSolvents(withPoints(profile(), 8), { gallnut: 1 });
  const w = ok(writeFootnote(p, 'shove', W1, SHOVE_WALL_SOFT));
  expect(crushDamage(footnoteIds(w, VARIANTS))).toBeLessThan(plain);
});

test.each(VARIANTS)('authored $id resolves from the profile to its context id', (v) => {
  const p = newProfile();
  const key = footnoteKeyOf(v);
  const written: Profile = {
    ...p,
    footnotes: { [v.subject]: { points: 8, slots: { [key]: v.id } } },
  };
  expect(footnoteIds(written)).toEqual({ [key]: v.id });
});

test('a variant text can be reworded without changing behaviour', () => {
  const reworded = VARIANTS.map((v) =>
    v.id === SHOVE_WALL_SOFT ? { ...v, text: 'Walls forgive, in other words.' } : v,
  );
  const p = withSolvents(withPoints(profile(), 8), { gallnut: 1 });
  const w = ok(writeFootnote(p, 'shove', W1, SHOVE_WALL_SOFT));
  const crush = (ids: ReturnType<typeof footnoteIds>) =>
    runDraft(
      board('D r . . {wall}'),
      (ctx) => {
        push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 3, null);
      },
      { footnotes: ids },
    ).events.filter((e) => e.type === 'crush');
  expect(crush(footnoteIds(w, reworded))).toEqual(crush(footnoteIds(w, VARIANTS)));
});
