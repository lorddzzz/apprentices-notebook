import { describe, expect, test } from 'vitest';
import { type BattleState, type Coord, type Jar, parseLabel, tileAt, unitAt } from '$engine';
import { arrive } from '$engine/arrival';
import type { Ctx } from '$engine/ctx';
import { sealJar } from '$engine/jars';
import { act, cast, draft, expectLogIncludes, withLattices } from './harness';

/** Design §7 (J1–J5) and plan P32: a Seal splits the flow in time; the jar opens on a step or at dusk. */

const at = (lbl: string): Coord => parseLabel(lbl);
const jarAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).jar;
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const moveTo = (s: BattleState, lbl: string) =>
  act(s, { type: 'move', unit: 'draughtsman', to: at(lbl) });
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** `Bolt → Ink → Jar → Oil → Spark` (J1): ink now, fire when someone steps in. */
const J1 = 'Bolt> Ink Jar Oil Spark';

describe('jars open on a step', () => {
  test('jar-ink-now-fire-on-step', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: J1 });
    const sealed = cast(start, 'draughtsman', 'right');
    // Everything before the Seal happens now; everything after it waits in the jar.
    expectLogIncludes(sealed.events, [
      'ink lands at D1 as blot',
      'Draughtsman seals a jar at D1 (opens on a step)',
    ]);
    expect(sealed.lines.join('\n')).not.toContain('Spark');
    expect(jarAt(sealed.state, 'D1')).toMatchObject({ owner: 'draughtsman', event: 'step' });
    expect(tileAt(sealed.state, at('D1')).state?.id).toBe('blot');

    const stepped = moveTo(sealed.state, 'D1');
    expectLogIncludes(stepped.events, [
      'Draughtsman moves to D1',
      'the jar at D1 opens under Draughtsman',
      'D1: stain',
    ]);
    expect(stepped.lines.join('\n')).toContain('Spark hits Draughtsman');
    expect(jarAt(stepped.state, 'D1')).toBeNull();
  });

  test('step-on-own-jar-opens', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: 'Bolt> Jar Guard' });
    const sealed = cast(start, 'draughtsman', 'right');
    expect(unit(sealed.state, 'draughtsman').shield).toBe(0);
    const stepped = moveTo(sealed.state, 'D1');
    expectLogIncludes(stepped.events, [
      'Draughtsman moves to D1',
      'the jar at D1 opens under Draughtsman',
    ]);
    expect(unit(stepped.state, 'draughtsman').shield).toBeGreaterThan(0);
  });

  test('foe-trips-jar', () => {
    // The rat walks beside the Draughtsman, onto the jar at B1 (J5).
    const start = withLattices('D . r', { draughtsman: 'Touch> Jar Strike' });
    const sealed = cast(start, 'draughtsman', { kind: 'tile', at: at('B1') });
    expect(jarAt(sealed.state, 'B1')?.owner).toBe('draughtsman');
    const round = endTurn(sealed.state);
    expectLogIncludes(round.events, [
      'rat at C1 moves to B1',
      'oil lands at C1 as slick',
      'oil lands at B1 as slick',
      'the jar at B1 opens under rat at B1',
      'Strike hits rat at B1 for 2',
    ]);
    expect(jarAt(round.state, 'B1')).toBeNull();
  });

  test('a unit can trip a foes jar too (J5)', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: 'Bolt> Strike' });
    const s = structuredClone(start);
    const jar: Jar = {
      owner: 'rat-1',
      event: 'step',
      rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
      heading: null,
      origin: { caster: 'rat-1', spell: 'x', cast: 0 },
    };
    tileAt(s, at('B1')).jar = jar;
    const stepped = moveTo(s, 'B1');
    expectLogIncludes(stepped.events, ['the jar at B1 opens under Draughtsman']);
    expect(unit(stepped.state, 'draughtsman').hp).toBeLessThan(unit(s, 'draughtsman').hp);
  });

  test('jar-takes-new-snapshot', () => {
    // Tally counts things on the target and its tile in the snapshot taken when the jar opens (P25).
    const start = withLattices('D . . .\n. . . r!', { draughtsman: 'Bolt> Jar Tally Strike' });
    const sealed = cast(start, 'draughtsman', 'right');
    const s = structuredClone(sealed.state);
    // After the cast: the jar's tile gets a slick; the marked rat is put there by a push.
    tileAt(s, at('D1')).state = { id: 'slick', rounds: 0, origin: null };
    const rat = unit(s, 'rat-1');
    const opened = draft(s, (ctx: Ctx) => {
      const r = unit(ctx.s, 'rat-1');
      arrive(ctx, r.id, [at('D1')], { cause: 'push', origin: null, landing: true });
    });
    expectLogIncludes(opened.events, [
      'the jar at D1 opens under rat at D1',
      'tally: the rest happens',
      'Strike hits rat at D1 for 2',
    ]);
    expect(rat.mark).not.toBeNull();
  });

  test('a jar does not block: walking past it (not ending on it) leaves it closed', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: 'Touch> Jar Guard' });
    const sealed = cast(start, 'draughtsman', { kind: 'tile', at: at('B1') });
    expect(jarAt(sealed.state, 'B1')).not.toBeNull();
    const past = moveTo(sealed.state, 'C1'); // walks through B1 to C1
    expect(past.lines.join('\n')).not.toContain('opens');
    expect(jarAt(past.state, 'B1')).not.toBeNull();
  });
});

describe('jars open at dusk', () => {
  test('fuse-opens-at-dusk', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: 'Bolt> Fuse Oil' });
    const sealed = cast(start, 'draughtsman', 'right');
    expectLogIncludes(sealed.events, ['Draughtsman seals a jar at D1 (opens at dusk)']);
    expect(tileAt(sealed.state, at('D1')).state).toBeNull();
    // A step on a dusk jar does nothing.
    const walked = moveTo(sealed.state, 'D1');
    expect(walked.lines.join('\n')).not.toContain('opens');
    const dusk = endTurn(sealed.state);
    expectLogIncludes(dusk.events, ['the jar at D1 opens', 'oil lands at D1 as slick']);
    expect(jarAt(dusk.state, 'D1')).toBeNull();
  });
});

/** Draughtsman without his habit: one jar (the two-jar habit has its own test in leans.test.ts). */
const withoutHabit = (s: BattleState): BattleState => {
  const c = structuredClone(s);
  const d = unit(c, 'draughtsman');
  if (d.kind === 'member') d.lean.habit = null;
  return c;
};

describe('one jar per apprentice', () => {
  test('new-jar-crumbles-old', () => {
    const start = withoutHabit(
      withLattices('D . . .\n. . . .\n. . . r', { draughtsman: 'Bolt> Jar Guard' }),
    );
    const first = cast(start, 'draughtsman', 'right');
    expect(jarAt(first.state, 'D1')).not.toBeNull();
    const next = endTurn(first.state).state;
    const second = cast(next, 'draughtsman', 'down');
    expectLogIncludes(second.events, [
      'the jar at D1 crumbles empty',
      'Draughtsman seals a jar at A3 (opens on a step)',
    ]);
    expect(jarAt(second.state, 'D1')).toBeNull();
    expect(jarAt(second.state, 'A3')).not.toBeNull();
  });

  test('a jar sealed onto a jar replaces it', () => {
    const start = withLattices('D . . .\n. . . r', { draughtsman: 'Bolt> Jar Guard' });
    const s = withoutHabit(start);
    const theirs: Jar = {
      owner: 'rat-1',
      event: 'step',
      rest: null,
      heading: null,
      origin: { caster: 'rat-1', spell: 'x', cast: 0 },
    };
    tileAt(s, at('D1')).jar = theirs;
    const sealed = cast(s, 'draughtsman', 'right');
    expectLogIncludes(sealed.events, [
      'the jar at D1 crumbles empty',
      'Draughtsman seals a jar at D1 (opens on a step)',
    ]);
    expect(jarAt(sealed.state, 'D1')?.owner).toBe('draughtsman');
  });

  test('sealing again from another tile moves your jar', () => {
    const start = withoutHabit(
      withLattices('D . . .\n. . . r', { draughtsman: 'Bolt> Jar Guard' }),
    );
    const sealed = cast(start, 'draughtsman', 'right');
    const s = sealed.state;
    const r = draft(s, (ctx) => {
      sealJar(ctx, at('B2'), {
        owner: 'draughtsman',
        event: 'dusk',
        rest: null,
        heading: null,
        origin: { caster: 'draughtsman', spell: 'x', cast: 9 },
      });
    });
    expect(jarAt(r.state, 'D1')).toBeNull(); // the old one crumbled
    expect(jarAt(r.state, 'B2')?.event).toBe('dusk');
    expect(unitAt(r.state, at('B2'))).toBeNull();
  });
});
