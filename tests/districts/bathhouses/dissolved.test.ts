import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { BATHER_AREA_SOURCES } from '$data/districts/bathhouses';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { hasTrait } from '$engine/arrival';
import { KIT } from '$engine/districts';
import { BOIL_SOURCE, boilOverState } from '$engine/districts/bathhouses/boilOver';
import {
  BATHER_FOE,
  BATHER_GUARD,
  isDissolved,
  PASSES_THROUGH,
} from '$engine/districts/bathhouses/dissolved';
import {
  BOIL_OVER_RULE_ID,
  type BoilOverState,
  STEAM_CAUSE,
} from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import type { EnemyUnit } from '$engine/types';
import {
  act,
  board,
  cast,
  draft,
  expectLogIncludes,
  label,
  withLattices,
} from '../../scenarios/harness';

/**
 * The dissolved bather (bathhouses-plan P8; BH-4). Token `s`; `s~` is a bather in a cloud. Round 1
 * telegraphs without moving; `endTurn` resolves, then the bather moves and plans for round 2.
 */

const at = parseLabel;
const bather = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'dissolvedBather');
  if (u?.kind !== 'enemy') throw new Error('no bather');
  return u;
};
const hpOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp;
const telegraphOf = (e: EnemyUnit) => (e.intent?.kind === 'behaviour' ? e.intent.telegraph : null);
const damageTo = (events: readonly GameEvent[], id: string) =>
  events.filter((e) => e.type === 'damage' && e.target.id === id);
const passes = (events: readonly GameEvent[]) => events.filter((e) => e.type === PASSES_THROUGH);
const bolt = (ascii: string, rune: string) =>
  cast(withLattices(ascii, { draughtsman: `Bolt> ${rune}` }), 'draughtsman', 'right');

describe('data and registration', () => {
  test('token s, the dissolves trait, the behaviour and the guard on the district module', () => {
    expect(ENEMIES.dissolvedBather).toMatchObject({
      token: 's',
      attack: 'bite',
      behaviour: 'bathhouses:bather',
    });
    const s = board('s');
    expect(hasTrait(bather(s), 'dissolves')).toBe(true);
    expect(KIT.foes['bathhouses:bather']).toBe(BATHER_FOE);
    expect(KIT.harmGuards).toContain(BATHER_GUARD);
    // Sized against the canal foes (eel 3 HP, snuffer 4).
    expect(ENEMIES.dissolvedBather.hp).toBeLessThanOrEqual(ENEMIES.snuffer.hp);
  });

  test('area sources are the cloud bursts and the boil-over', () => {
    expect(BATHER_AREA_SOURCES).toEqual(expect.arrayContaining(['Storm', BOIL_SOURCE]));
    expect(BATHER_AREA_SOURCES).not.toContain('Conduct');
  });
});

describe('dissolved is derived from the tile, never stored', () => {
  test('on a cloud tile it is dissolved; the cloud gone, it is solid again', () => {
    const s = structuredClone(board('s~ s'));
    const [inCloud, out] = s.units;
    if (!inCloud || !out) throw new Error('board');
    expect(isDissolved(s, inCloud)).toBe(true);
    expect(isDissolved(s, out)).toBe(false);
    const tile = s.tiles[0];
    if (!tile) throw new Error('board');
    tile.state = null;
    expect(isDissolved(s, inCloud)).toBe(false);
  });
});

describe('single hits, pushes, holds and swaps pass through (in a cloud)', () => {
  test('Bolt and Strike: passes through, unharmed; out of the cloud it takes the hit', () => {
    const r = bolt('D . s~ .', 'Strike');
    expectLogIncludes(r.events, [
      'Bolt is stopped by the cloud at C1',
      'bather at C1 is steam: the Strike passes through',
      'Strike leaves bather at C1 unharmed',
    ]);
    expect(damageTo(r.events, bather(r.state).id)).toEqual([]);
    expect(hpOf(r.state, bather(r.state).id)).toBe(ENEMIES.dissolvedBather.hp);

    const solid = bolt('D . s .', 'Strike');
    expect(passes(solid.events)).toEqual([]);
    expect(hpOf(solid.state, bather(solid.state).id)).toBeLessThan(ENEMIES.dissolvedBather.hp);
  });

  test('Spark: its own hit passes through, the Storm it sets off in the cloud hurts', () => {
    const r = bolt('D . s~ .', 'Spark');
    expectLogIncludes(r.events, [
      'bather at C1 is steam: the Spark passes through',
      'Spark leaves bather at C1 unharmed',
      'storm bursts at C1, hitting bather at C1',
      'Storm hits bather at C1 for 2',
    ]);
  });

  test('Shove: the push passes through and it stays; solid, it is pushed', () => {
    const r = act(board('D s~ .'), { type: 'shove', unit: 'draughtsman', dir: 'right' });
    expectLogIncludes(r.events, [
      'bather at B1 is steam: the push passes through',
      'Push leaves bather at B1 unharmed',
    ]);
    expect(bather(r.state).pos).toEqual(at('B1'));

    const solid = act(board('D s .'), { type: 'shove', unit: 'draughtsman', dir: 'right' });
    expect(passes(solid.events)).toEqual([]);
    expect(bather(solid.state).pos).toEqual(at('C1'));
  });

  test('Hold: passes through, it is not held', () => {
    const r = bolt('D . s~ .', 'Hold');
    expectLogIncludes(r.events, [
      'bather at C1 is steam: the hold passes through',
      'Hold leaves bather at C1 unharmed',
    ]);
    expect(bather(r.state).held).toBe(0);
    expect(bather(bolt('D . s .', 'Hold').state).held).toBeGreaterThan(0);
  });

  test('Swap: passes through, nobody moves', () => {
    const r = bolt('D . s~ .', 'Swap');
    expectLogIncludes(r.events, [
      'bather at C1 is steam: the swap passes through',
      'Swap leaves bather at C1 unharmed',
    ]);
    expect(bather(r.state).pos).toEqual(at('C1'));
    expect(r.events.some((e) => e.type === 'swapped')).toBe(false);
  });

  test('a unit crushed into it: the crush passes through the bather', () => {
    const r = act(board('D r s~'), { type: 'shove', unit: 'draughtsman', dir: 'right' });
    expect(passes(r.events).length).toBeGreaterThan(0);
    expect(hpOf(r.state, bather(r.state).id)).toBe(ENEMIES.dissolvedBather.hp);
  });
});

describe('area bursts hurt it', () => {
  test('a Storm anywhere in its connected cloud reaches it', () => {
    const r = bolt('D . ~ ~ s~', 'Spark');
    expectLogIncludes(r.events, ['Storm hits bather at E1 for 2']);
    expect(passes(r.events)).toEqual([]);
  });

  test('the boil-over storms it', () => {
    const s = structuredClone(board('D . s~'));
    s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: 1 } });
    const g = boilOverState(s) as BoilOverState;
    s.rules = { ...s.rules, [BOIL_OVER_RULE_ID]: { ...g, pressure: g.capacity - 1 } };
    for (const u of s.units) if (u.kind === 'enemy') u.intent = null;
    const r = draft(s, (ctx) => roundEnd(ctx));
    expectLogIncludes(r.events, ['Boil-over hits bather at C1 for 2']);
    expect(passes(r.events)).toEqual([]);
  });
});

describe('movement: free through connected cloud', () => {
  test('crosses a long cloud in one move as steam and telegraphs a bite from the open tile', () => {
    const r = act(board('s~ ~ ~ ~ ~ . D'), { type: 'endTurn' });
    const moved = r.events.find((e) => e.type === 'moved' && e.unit.id === bather(r.state).id);
    expect(moved).toMatchObject({ from: at('A1'), to: at('F1'), cause: STEAM_CAUSE });
    expect(telegraphOf(bather(r.state))).toMatchObject({ label: 'bite', tiles: [at('G1')] });
    expect(isDissolved(r.state, bather(r.state))).toBe(false);
  });

  test('stepped out, it is solid and killable in the next player phase', () => {
    const s = withLattices('s~ ~ ~ ~ ~ . D', { draughtsman: 'Bolt> Strike' });
    const out = act(s, { type: 'endTurn' });
    const id = bather(out.state).id;
    const r = cast(out.state, 'draughtsman', 'left');
    expect(passes(r.events)).toEqual([]);
    expect(damageTo(r.events, id).length).toBe(1);
    expect(hpOf(r.state, id)).toBeLessThan(ENEMIES.dissolvedBather.hp);
  });

  test('a cut cloud strands it: open tiles cost its move, so it cannot reach the bite', () => {
    const r = act(board('s~ ~ ~ . ~ ~ . D'), { type: 'endTurn' });
    expect(bather(r.state).pos).not.toEqual(at('G1'));
    expect(telegraphOf(bather(r.state))).toBeNull();
    expectLogIncludes(r.events, [`bather at ${label(bather(r.state).pos)} waits`]);
  });

  test('a walk that starts solid is a plain walk', () => {
    const r = act(board('s . . D'), { type: 'endTurn' });
    const moved = r.events.find((e) => e.type === 'moved' && e.unit.id === bather(r.state).id);
    expect(moved).toMatchObject({ cause: 'walk', to: at('C1') });
  });
});

describe('the bite: only from an open tile, only at an apprentice on one', () => {
  test('beside an apprentice on open ground it bites; the bite lands', () => {
    const s = structuredClone(board('D s', { hp: { A1: 6 } }));
    expect(telegraphOf(bather(s))).toMatchObject({ label: 'bite', units: ['draughtsman'] });
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Bite hits Draughtsman for 1']);
  });

  test('dissolved, it cannot bite: beside the apprentice from a cloud it waits', () => {
    const s = board('D s~');
    expect(telegraphOf(bather(s))).toBeNull();
  });

  test('the party in a cloud is safe from it', () => {
    const s = board('D~ s');
    expect(telegraphOf(bather(s))).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
  });

  test('an apprentice who steps into a cloud before it lands is missed', () => {
    const s = structuredClone(board('D s', { hp: { A1: 6 } }));
    const tile = s.tiles[0];
    if (!tile) throw new Error('board');
    tile.state = { id: 'cloud', rounds: 2, origin: null };
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Bite hits nothing']);
    expect(hpOf(r.state, 'draughtsman')).toBe(6);
  });
});
