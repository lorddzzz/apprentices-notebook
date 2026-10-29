import { describe, expect, test, vi } from 'vitest';
import type { BasicActionId } from '$data';
import { encountersOf } from '$data';
import { MOOR_PIECE } from '$data/districts/canals';
import {
  type Action,
  accumulateStats,
  type BattleState,
  type Dir,
  emptyStats,
  finishEncounter,
  type GameEvent,
  isLegal,
  type Jar,
  newProfile,
  newSave,
  type Profile,
  parseLabel,
  parseSaveData,
  pickLoot,
  startTrip,
  takeChoice,
  tileAt,
  type Unit,
} from '$engine';
import { hasTrait } from '$engine/arrival';
import { act, board, cast, expectLogIncludes, withLattices } from '../harness';

/**
 * CN-2 (canals-revisit P3, P5): the barge's crate, a floating bystander unit. It drifts with the
 * current, is pushed, pulled and swapped, opens step-jars it lands on, beaches on a quay; any harm
 * ruins it (`cargoLost`); landing on the mooring (`{moor}`) moors and anchors it, and a room's
 * mooring bonus (DK-5b) is one more pick. The room never waits on it.
 */

// The barge rooms are CN-3/CN-4's: here the second canal room (index 1, as shipped) carries the mooring bonus.
vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const { MOORING_BONUS } = await import('$data/districts/canals');
  const rooms = m
    .encountersOf('canals')
    .map((e, i) => (i === 1 ? { ...e, bonus: MOORING_BONUS } : e));
  return {
    ...m,
    DISTRICT_KIT: { ...m.DISTRICT_KIT, canals: { ...m.DISTRICT_KIT.canals, rooms } },
  };
});

const endTurn: Action = { type: 'endTurn' };
const at = parseLabel;
const kit = (action: BasicActionId) => ({ kits: { draughtsman: { action } } });
const basic = (type: BasicActionId, dir: Dir): Action =>
  ({ type, unit: 'draughtsman', dir }) as Action;
const crate = (s: BattleState): Unit => {
  const u = s.units.find((x) => x.id === 'barge-1');
  if (!u) throw new Error('no crate');
  return u;
};
const has = (events: readonly GameEvent[], type: GameEvent['type']): boolean =>
  events.some((e) => e.type === type);
/** Ends `n` turns; returns the last state and every event. */
function rounds(s: BattleState, n: number): { state: BattleState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let state = s;
  for (let i = 0; i < n; i++) {
    const r = act(state, endTurn);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}
const stepJar = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: null,
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});
// A dummy far away keeps the battle going without attacking.
const DUMMY = '\n. . . . .\nS . . . d';

describe('the crate is a bystander (P3)', () => {
  test('crate-spawns-as-bystander: it floats, never plans and never idles in the log', () => {
    const s = board(`kw> w> w> w> .${DUMMY}`);
    expect(crate(s)).toMatchObject({ bystander: true, hp: 1, intent: null });
    expect(hasTrait(crate(s), 'floats')).toBe(true);
    const r = act(s, endTurn);
    expect(r.lines).not.toContain('crate at B1 waits');
    expect(r.lines.some((l) => l.startsWith('crate') && l.endsWith('waits'))).toBe(false);
  });

  test('crate-drifts: the current carries it one tile a round', () => {
    const r = rounds(board(`kw> w> w> w> .${DUMMY}`), 2);
    expect(crate(r.state).pos).toEqual(at('C1'));
  });

  test('crate-blocked: a body in the lane stops its drift', () => {
    const r = act(board(`kw> Dw> =${DUMMY}`), endTurn);
    expect(crate(r.state).pos).toEqual(at('A1'));
  });

  test('crate-beaches: the lane carries it onto the quay, then nothing moves it', () => {
    const r = rounds(board(`kw> . .${DUMMY}`), 2);
    expectLogIncludes(r.events, ['crate at A1 drifts to B1']);
    expect(crate(r.state).pos).toEqual(at('B1'));
    expect(r.events.filter((e) => e.type === 'drift')).toHaveLength(1);
  });

  test('crate-pushed-back: a shove off the quay sets it on the water, no drop', () => {
    const s = board(`w> k D${DUMMY}`, kit('shove'));
    const r = act(s, basic('shove', 'left'));
    expect(has(r.events, 'dropped')).toBe(false);
    expect(crate(r.state)).toMatchObject({ pos: at('A1'), hp: 1 });
    const next = act(r.state, endTurn);
    expect(crate(next.state).pos).toEqual(at('B1'));
  });

  test('crate-pulled-onto-water: Pull sets it on the lane, no drop', () => {
    const r = act(board(`D w> k${DUMMY}`, kit('pull')), basic('pull', 'right'));
    expect(has(r.events, 'dropped')).toBe(false);
    expect(crate(r.state)).toMatchObject({ pos: at('B1'), hp: 1 });
  });

  test('crate-opens-step-jar: drifting onto a step-jar opens it', () => {
    const s = structuredClone(board(`kw> w> w> .${DUMMY}`));
    tileAt(s, at('B1')).jar = stepJar();
    const r = act(s, endTurn);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'jarOpened' }));
    expect(tileAt(r.state, at('B1')).jar).toBeNull();
  });
});

describe('ruin (P3): any harm loses the cargo', () => {
  const lost = (events: readonly GameEvent[]) =>
    events.filter((e): e is Extract<GameEvent, { type: 'cargoLost' }> => e.type === 'cargoLost');

  test('cargo-lost-fire: fire drifting under it burns it at round end', () => {
    const r = act(board(`w>* kw> =${DUMMY}`), endTurn);
    expect(lost(r.events)).toMatchObject([{ unit: { id: 'barge-1' }, source: 'Fire' }]);
    expectLogIncludes(r.events, ["the crate's cargo is lost at B1 (Fire)", 'crate at B1 dies']);
  });

  test('cargo-lost-burst: a dying moth beside it bursts on it', () => {
    const r = cast(
      withLattices(`D m k${DUMMY}`, { draughtsman: 'Bolt> Strike' }),
      'draughtsman',
      'right',
    );
    expect(lost(r.events)).toMatchObject([{ source: 'Burst' }]);
  });

  test('cargo-lost-strike: a stray Strike hits it', () => {
    const r = cast(
      withLattices(`D k .${DUMMY}`, { draughtsman: 'Bolt> Strike' }),
      'draughtsman',
      'right',
    );
    expect(lost(r.events)).toMatchObject([{ source: 'Strike', at: at('B1') }]);
  });

  test('cargo-lost-crush: a shove into a plate crushes it', () => {
    const r = act(board(`D k =${DUMMY}`, kit('shove')), basic('shove', 'right'));
    expect(lost(r.events)).toMatchObject([{ source: 'Crush' }]);
  });

  test('cargo-lost-eel: the eel lunges at a crate beside it when no member is', () => {
    const s = board(`ew> kw> w> .${DUMMY}`);
    expect(s.units.find((u) => u.id === 'eel-1')).toMatchObject({
      intent: { kind: 'attack', attack: 'lunge', dir: 'right' },
    });
    const r = act(s, endTurn);
    expectLogIncludes(r.events, [
      'eel at A1 lunges right',
      'Lunge hits crate at B1 for 2',
      "the crate's cargo is lost at B1 (Lunge)",
    ]);
  });

  test('eel-prefers-member: with a member beside it too, the eel lunges at the member', () => {
    const s = board(`. D .\nkw> ew> w>\n. . .\nS . d`);
    expect(s.units.find((u) => u.id === 'eel-1')).toMatchObject({ intent: { dir: 'up' } });
  });

  test('no-credit: harm to the crate is no kill or damage in the trip stats', () => {
    const r = cast(
      withLattices(`D k .${DUMMY}`, { draughtsman: 'Bolt> Strike' }),
      'draughtsman',
      'right',
    );
    expect(r.events).toContainEqual(
      expect.objectContaining({ type: 'died', unit: expect.objectContaining({ bystander: true }) }),
    );
    const stats = accumulateStats(emptyStats(), r.events, newProfile());
    expect(stats.spells.map((t) => [t.damage, t.kills])).toEqual([[0, 0]]);
  });
});

describe('mooring (P5)', () => {
  const moored = (events: readonly GameEvent[]) => events.filter((e) => e.type === 'moored');

  test('moor-by-drift: the current brings it in, it moors and stays', () => {
    const s = board(`kw> w> w>{moor} w> .${DUMMY}`);
    expect(tileAt(s, at('C1')).piece?.id).toBe(MOOR_PIECE);
    const r = rounds(s, 4);
    expect(moored(r.events)).toEqual([
      expect.objectContaining({ unit: expect.objectContaining({ id: 'barge-1' }), at: at('C1') }),
    ]);
    expectLogIncludes(r.events, ['crate at B1 drifts to C1', 'the crate moors at C1']);
    expect(crate(r.state)).toMatchObject({ pos: at('C1'), moored: true });
    expect(hasTrait(crate(r.state), 'anchored')).toBe(true);
  });

  test('moor-by-shove', () => {
    const r = act(board(`D k w>{moor} w>${DUMMY}`, kit('shove')), basic('shove', 'right'));
    expect(moored(r.events)).toHaveLength(1);
    expect(crate(r.state)).toMatchObject({ pos: at('C1'), moored: true });
  });

  test('moor-by-pull', () => {
    const r = act(board(`D w>{moor} kw> w>${DUMMY}`, kit('pull')), basic('pull', 'right'));
    expect(moored(r.events)).toHaveLength(1);
    expect(crate(r.state).pos).toEqual(at('B1'));
  });

  test('moor-by-swap: a wading apprentice on the mooring trades places with it', () => {
    const r = act(board(`Dw>{moor} k .${DUMMY}`, kit('swap')), basic('swap', 'right'));
    expect(moored(r.events)).toHaveLength(1);
    expect(crate(r.state).pos).toEqual(at('A1'));
  });

  test('moor-only-the-crate: another unit stopping there does nothing', () => {
    const r = act(board(`rw> w>{moor} w> .${DUMMY}`), endTurn);
    expect(moored(r.events)).toEqual([]);
  });

  test('anchored: a moored crate cannot be pulled and the current leaves it', () => {
    const r = rounds(board(`kw> w>{moor} w> . .\n. . . D .\nS . . . d`, kit('pull')), 1);
    expect(crate(r.state).moored).toBe(true);
    const s = structuredClone(r.state);
    const d = s.units.find((u) => u.id === 'draughtsman');
    if (!d) throw new Error('no Draughtsman');
    d.pos = at('D1');
    expect(isLegal(s, basic('pull', 'left'))).toMatch(/can't be moved/);
  });

  test('moored-survives-reload: the anchored crate stays moored after a save round-trip', () => {
    const r = rounds(board(`kw> w>{moor} w> .${DUMMY}`), 1);
    const reloaded = JSON.parse(JSON.stringify(r.state)) as BattleState;
    const later = rounds(reloaded, 3);
    expect(crate(later.state)).toMatchObject({ pos: at('B1'), moored: true });
    expect(moored(later.events)).toEqual([]);
  });
});

describe('the room never waits on the crate', () => {
  test('won-with-crate-alive: the last foe down wins the room', () => {
    const r = cast(
      withLattices(`r D kw> w>`, { draughtsman: 'Bolt> Strike' }),
      'draughtsman',
      'left',
    );
    expect(r.state.phase).toBe('won');
    expect(crate(r.state).hp).toBe(1);
  });

  test('won-with-cargo-lost: the burst that ruins it also wins the room', () => {
    const r = cast(withLattices(`D m k`, { draughtsman: 'Bolt> Strike' }), 'draughtsman', 'right');
    expect(has(r.events, 'cargoLost')).toBe(true);
    expect(r.state.phase).toBe('won');
  });
});

describe('the mooring bonus (DK-5b): one more pick', () => {
  const withCanals = (p: Profile): Profile => ({
    ...p,
    city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
  });
  const p = withCanals(newProfile());
  /** The room that carries the bonus: index 1, as the shipped canals do (CN-3). */
  const ROOM = 1;
  const picks = encountersOf('canals')[ROOM]?.picks ?? 0;
  /** A fight in the bonus room as played on a barge board: the crate moors (or not), the rat falls. */
  function fight(moorIt: boolean): { state: BattleState; events: GameEvent[] } {
    const lane = moorIt ? 'kw> w>{moor} w>' : 'kw> w> w>';
    const s = withLattices(`r D . .\n${lane} .\nS . . .`, { draughtsman: 'Bolt> Strike' });
    const drifted = rounds(s, 1);
    const r = cast(drifted.state, 'draughtsman', 'left');
    return { state: r.state, events: [...drifted.events, ...r.events] };
  }
  /** A trip standing in the bonus room: the way on from room 0 taken, as played. */
  const roomTrip = () => takeChoice({ ...startTrip(p, 7, 'canals'), status: 'crossroads' }, 'push');
  const finish = (moorIt: boolean) => {
    const f = fight(moorIt);
    expect(f.state.phase).toBe('won');
    const end = finishEncounter(p, roomTrip(), f.state, f.events);
    if (!end.trip) throw new Error('expected a trip');
    return end.trip;
  };

  test('moored-grants-one-pick: the bonus adds exactly one pick and is noted on the trip', () => {
    const t = finish(true);
    expect(t.picksLeft).toBe(picks + 1);
    expect(t.kit?.bonuses).toEqual([ROOM]);
    let after = t;
    let taken = 0;
    while (after.status === 'looting') {
      after = pickLoot(after, 0);
      taken++;
    }
    expect(taken).toBe(picks + 1);
  });

  test('unmoored-grants-nothing', () => {
    const t = finish(false);
    expect(t.picksLeft).toBe(picks);
    expect(t.kit?.bonuses).toEqual([]);
  });

  test('bonus-survives-save: the extra pick and the note round-trip through the save', () => {
    const trip = finish(true);
    const save = { ...newSave(1), profile: p, trip };
    const parsed = parseSaveData(JSON.parse(JSON.stringify(save)));
    expect(parsed).toEqual(save);
    expect(parsed.trip?.picksLeft).toBe(picks + 1);
  });
});
