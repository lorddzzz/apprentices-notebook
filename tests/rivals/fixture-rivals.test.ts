import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { type BattleState, type GameEvent, libraryOf, parseLabel } from '$engine';
import { placeSeal } from '$engine/districts/inkQuarter/wax';
import { isTrickEvent, registerTrick, trickOf } from '$engine/rivals/tricks';
import { act, cast, draft, expectLogIncludes } from '../scenarios/harness';
import { CLOCK, CLOCK_DAMAGE, CLOCK_ID } from './fixtures/clock';
import { type Fixture, fixtureBoard, install, rivalOf } from './fixtures/harness';
import { REGISTER } from './fixtures/register';
import { STEAM } from './fixtures/steam';
import { PEAL_DAMAGE, TUNE, TUNE_NOTES } from './fixtures/tune';
import { WAY } from './fixtures/way';

/**
 * RV-14, the authoring API's stress test: five test-only fixture rivals (rivals plan P10's five
 * known tricks), each written only through `registerTrick`/`registerGoal` and a `RivalDef`, with
 * one scenario each. None needs an engine edit outside the hook points. (The fixtures borrow the
 * Lamplighter's board shell, so the log names them "lamplighter".)
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const hp = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp ?? 0;
const sourced = (events: readonly GameEvent[], source: string) =>
  events.filter((e) => e.type === 'damage' && e.source === source);
const resisted = (events: readonly GameEvent[]) =>
  events.filter((e) => isTrickEvent(e, 'trickResists'));

const ALL: readonly Fixture[] = [CLOCK, STEAM, WAY, TUNE, REGISTER];
let undo: (() => void)[] = [];
beforeAll(() => {
  undo = ALL.map(install);
});
afterAll(() => {
  for (const u of undo) u();
});

describe('the authoring API', () => {
  test('registerTrick finds, refuses a clash and undoes; spawn runs the trick’s init', () => {
    expect(trickOf(TUNE.trick.id)).toBe(TUNE.trick);
    expect(() => registerTrick(TUNE.trick)).toThrow(/registered twice/);
    expect(() => registerTrick({ ...TUNE.trick, id: 'canals:longWick' })).toThrow();
    const extra = { ...TUNE.trick, id: 'foundry:fixtureOther' as const };
    const off = registerTrick(extra);
    expect(trickOf(extra.id)).toBe(extra);
    off();
    expect(trickOf(extra.id)).toBeNull();
    expect(rivalOf(fixtureBoard('L . D', TUNE.def)).rival?.trick).toEqual({ note: 0 });
  });
});

describe('clock contract: action trick, trick object, round end, district goal', () => {
  // The stamp is his first free neighbour (B1); Draughtsman can reach it in one move.
  const START = '. . . D .\n. L . . .\n. . . . .';

  test('he serves a writ; unanswered it collects from everyone, answered it is met', () => {
    const s = fixtureBoard(START, CLOCK.def, { hp: { D1: 10 } });
    expect(rivalOf(s).intent).toMatchObject({ kind: 'trick', trick: CLOCK_ID, data: at('B1') });

    // Unanswered: the writ goes down on B1 and falls due at the end of the next round.
    let r = endTurn(s);
    expectLogIncludes(r.events, ['lamplighter at B2 sets something down at B1']);
    expect(rivalOf(r.state).rival?.objects).toMatchObject([{ at: at('B1'), data: { due: 2 } }]);
    expect(rivalOf(r.state).intent).toBeNull(); // one writ at a time
    r = endTurn(r.state);
    expect(sourced(r.events, 'the clock writ')).toHaveLength(1);
    expect(hp(r.state, 'draughtsman')).toBe(10 - CLOCK_DAMAGE);
    expect(rivalOf(r.state).rival?.objects).toEqual([]);

    // Answered: Draughtsman walks onto the stamp before it falls due.
    let m = endTurn(s);
    m = act(m.state, { type: 'move', unit: 'draughtsman', to: at('B1') });
    m = endTurn(m.state);
    expect(sourced(m.events, 'the clock writ')).toHaveLength(0);
    expect(m.events.filter((e) => isTrickEvent(e, 'trickObjectGone'))).toMatchObject([
      { data: { trick: CLOCK_ID, why: 'opened' } },
    ]);
  });
});

describe('steams away: reaction before harm', () => {
  test('struck in a cloud he re-forms across it unharmed; out of it the hit lands', () => {
    const lattices = { draughtsman: 'Bolt> Strike' };
    const s = fixtureBoard('D . . L~ ~\n. . . ~ ~\n. . . . .', STEAM.def, { lattices });
    const r = cast(s, 'draughtsman', 'right');
    expectLogIncludes(r.events, [
      'Strike leaves lamplighter at D1 unharmed',
      'lamplighter at D1 moves to E2', // the farthest free tile of that cloud
    ]);
    expect(rivalOf(r.state)).toMatchObject({ pos: at('E2'), hp: STEAM.def.hp });

    const dry = fixtureBoard('D . L .\n. . . .', STEAM.def, { lattices });
    const hit = cast(dry, 'draughtsman', 'right');
    expectLogIncludes(hit.events, ['Strike hits lamplighter at C1 for 2']);
    expect(rivalOf(hit.state).hp).toBe(STEAM.def.hp - 2);
  });
});

describe('right of way: immunity', () => {
  const lattices = { draughtsman: 'Bolt> Shove', stoker: 'Bolt> Hold' };

  test('on the keystone nothing pushes or holds him; off it he is shoved', () => {
    const s = fixtureBoard('D . Ll .\nS . . .', WAY.def, { lattices });
    const shove = cast(s, 'draughtsman', 'right');
    expectLogIncludes(shove.events, ['lamplighter at C1 cannot be pushed (his trick)']);
    expect(rivalOf(shove.state).pos).toEqual(at('C1'));
    const s2 = fixtureBoard('D . . .\nS . Ll .', WAY.def, { lattices });
    const hold = cast(s2, 'stoker', 'right');
    expect(rivalOf(hold.state).held).toBe(0);
    expect(resisted(hold.events)).toMatchObject([{ data: { what: 'hold' } }]);

    const off = fixtureBoard('D . L .', WAY.def, { lattices });
    const pushed = cast(off, 'draughtsman', 'right');
    expectLogIncludes(pushed.events, ['lamplighter at C1 is pushed right to D1']);
  });

  // RV-11 follow-ups: the other two holds consult `resists` like the Hold rune does.
  test('a Rivet and a wax seal do not hold him on the keystone either', () => {
    const inventions = libraryOf([
      {
        id: 'inv:impulse-rivet',
        name: 'impulse-rivet',
        method: 'conduct',
        parts: ['shove'],
        solvent: 'rivet',
      },
    ]);
    const s = fixtureBoard('D . Ll .\n. = = .', WAY.def, {
      lattices: { draughtsman: 'Bolt> inv:impulse-rivet' },
      inventions,
    });
    const rivet = cast(s, 'draughtsman', 'right');
    expect(rivalOf(rivet.state).held).toBe(0);
    expect(resisted(rivet.events).map((e) => ('data' in e ? e.data : null))).toContainEqual(
      expect.objectContaining({ what: 'hold' }),
    );

    const wax = draft(fixtureBoard('D . Ll .', WAY.def), (ctx) => {
      placeSeal(ctx, at('C1'));
    });
    expect(rivalOf(wax.state).held).toBe(0);
    expect(resisted(wax.events)).toMatchObject([{ data: { what: 'hold' } }]);
    const plain = draft(fixtureBoard('D . L .', WAY.def), (ctx) => {
      placeSeal(ctx, at('C1'));
    });
    expect(rivalOf(plain.state).held).toBeGreaterThan(0);
  });
});

describe('plays a tune: per-round mark after the actions', () => {
  const START = 'D . . . .\n. . . . .\n. . L . .\n. . . . S\n. . . . .';

  test('four unmuted notes ring the Great Peal; a unit on the note mutes it', () => {
    let s = fixtureBoard(START, TUNE.def, { hp: { A1: 10, E4: 10 } });
    expect(rivalOf(s).rival?.mark).toEqual({ data: { note: 1 }, tiles: [at('C2')] });
    const pealed: number[] = [];
    for (let i = 0; i < TUNE_NOTES; i++) {
      const r = endTurn(s);
      pealed.push(sourced(r.events, 'the Great Peal').length);
      s = r.state;
    }
    expect(pealed).toEqual([0, 0, 0, 2]); // the fourth note rings every apprentice
    expect(hp(s, 'draughtsman')).toBe(10 - PEAL_DAMAGE);
    expect(rivalOf(s).rival?.trick).toEqual({ note: 0 });

    // Muted: Stoker stands on the second note's tile (D3) and the tune starts over.
    let m = endTurn(fixtureBoard(START, TUNE.def)).state;
    expect(rivalOf(m).rival?.mark?.tiles).toEqual([at('D3')]);
    m = act(m, { type: 'move', unit: 'stoker', to: at('D3') }).state;
    m = endTurn(m).state;
    expect(rivalOf(m).rival?.trick).toEqual({ note: 0 });
    expect(rivalOf(m).rival?.mark?.tiles).toEqual([at('C2')]);
  });
});

describe('strike from the register: mark, circles, round-end erase', () => {
  const START = '. . . . . .\n. D . . . .\n. . L . . .\n. . . . . .\n. . . . . .\n. . . . . S';

  test('a circled apprentice who stays is erased at round end; one who steps away is not', () => {
    const s = fixtureBoard(START, REGISTER.def);
    // Only Draughtsman is within his reach (Stoker at F6 is three away).
    expect(rivalOf(s).rival?.mark?.tiles).toEqual([at('B2')]);

    const stays = endTurn(s);
    expectLogIncludes(stays.events, ['lamplighter at C3 sets something down at B2']);
    expectLogIncludes(stays.events, ['Draughtsman is erased out of the room']);
    expect(rivalOf(stays.state).rival?.objects).toEqual([]);

    const moved = act(s, { type: 'move', unit: 'draughtsman', to: at('A1') });
    const away = endTurn(moved.state);
    expect(away.events.filter((e) => e.type === 'outOfRoom')).toHaveLength(0);
    expect(away.events.filter((e) => isTrickEvent(e, 'trickObject'))).toHaveLength(0);
  });
});
