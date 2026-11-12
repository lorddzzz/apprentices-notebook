import { describe, expect, it } from 'vitest';
import { ENEMIES } from '$data';
import { FOUNDRY_FOE_TOKENS, FOUNDRY_TUNING } from '$data/districts/foundry';
import type { BattleState, EnemyUnit } from '$engine';
import { behaviourPreview } from '$engine/behaviours';
import { KIT } from '$engine/districts';
import { clapperTone, pulseTiles, toneGroups } from '$engine/districts/foundry';
import { act, board, cast, withLattices } from '../../scenarios/harness';
import { damageTo, dataOf, ev, hums, ringBells, ringTones, unit } from './helpers';

/**
 * BF-6 and BF-7 acceptance (foundry-plan §2 P5, P9, P12, P16; BF-T2): the ringers' staff. Round 1
 * plans nothing, so a foe's first telegraph exists after the first end of turn (`planned`) and
 * resolves at the second. A Clapper rings the tone of its ordinal (`clapper-1` low, `-2` mid, `-3`
 * high); a Ringer rings the tone of the rope it stands on.
 */

const roster = ENEMIES as unknown as Record<string, Record<string, unknown> | undefined>;

const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const intentOf = (s: BattleState, id: string) => (unit(s, id) as EnemyUnit).intent;
const telegraphOf = (s: BattleState, id: string) => {
  const i = intentOf(s, id);
  return i?.kind === 'behaviour' ? i.telegraph : null;
};
const SEEDS = [1, 2, 3, 4, 5, 6, 7];
const BOLT = { draughtsman: 'Bolt> Strike' } as const;

const planned = (ascii: string, seed = 1): BattleState => endTurn(board(ascii, { seed })).state;

describe('BF-6 the Ringer and the Clapper', () => {
  it('BF-6: the Ringer and the Clapper are in ENEMIES with the plan stats and tokens', () => {
    expect(roster.ringer).toMatchObject({
      hp: FOUNDRY_TUNING.foes.ringer.hp,
      anchored: true,
      token: FOUNDRY_FOE_TOKENS.ringer,
    });
    expect(roster.clapper).toMatchObject({
      hp: FOUNDRY_TUNING.foes.clapper.hp,
      move: FOUNDRY_TUNING.foes.clapper.move,
      anchored: false,
      token: FOUNDRY_FOE_TOKENS.clapper,
    });
    expect(ENEMIES.ringer.behaviour).toBe('foundry:ringer');
    expect(KIT.foes['foundry:clapper']).toBeDefined();
  });

  const RING = 'D . . . .\n. . . . .\n{bell:mid} . Z{rope:mid} . {bell:mid}';

  it('BF-6: the Ringer stands on its rope and telegraphs a ring a round ahead', () => {
    const s = board(RING);
    expect(unit(s, 'ringer-1').pos).toEqual({ x: 2, y: 2 });
    expect(telegraphOf(s, 'ringer-1')).toMatchObject({ label: 'ring:mid' }); // an anchored foe plans at once
    expect(telegraphOf(s, 'ringer-1')?.tiles).toEqual(pulseTiles(s, 'mid'));
    expect(behaviourPreview(s)).toEqual([
      { kind: 'outline', cells: pulseTiles(s, 'mid'), label: 'mid' },
    ]);
    const rung = endTurn(s);
    expect(unit(rung.state, 'ringer-1').pos).toEqual({ x: 2, y: 2 }); // anchored
    expect(ringTones(rung.events)).toEqual(['mid']);
    expect(dataOf(ev(rung.events, 'foundry:ring')[0])).toMatchObject({ cause: 'ringer' });
    expect(ringBells(ev(rung.events, 'foundry:ring')[0])).toEqual(['0,2', '4,2']);
  });

  it('BF-6: a Ringer ring fizzles when its tone already hums', () => {
    const s = withLattices('D . {bell:mid}\n. . .\n. . .\nZ{rope:mid} . . . {bell:mid}', BOLT);
    expect(telegraphOf(s, 'ringer-1')?.label).toBe('ring:mid');
    const counter = cast(s, 'draughtsman', 'right'); // ring mid first
    expect(hums(counter.state)).toEqual(['mid']);
    const r = endTurn(counter.state);
    expect(ringTones(r.events)).toEqual([]);
    expect(ev(r.events, 'foundry:pulse')).toHaveLength(0);
  });

  it('BF-6: a Ringer ring pulses neutrally and can hurt its friends', () => {
    // two apprentices and one dummy beside the bell: the ring comes (more apprentices than friends)
    const s = board('. . . . .\n. . D . .\n. . {bell:mid} d .\n. . S . .\nZ{rope:mid} . . . .');
    expect(telegraphOf(s, 'ringer-1')?.label).toBe('ring:mid');
    const r = endTurn(s);
    expect(ringTones(r.events)).toEqual(['mid']);
    expect(damageTo(r.events, 'dummy-1')).toHaveLength(1);
    expect(damageTo(r.events, 'draughtsman')).toHaveLength(1);
    expect(damageTo(r.events, 'stoker')).toHaveLength(1);
  });

  it('BF-6: hitting the Clapper rings its tone', () => {
    const s = withLattices('D . Q . {bell:low}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    const rings = ev(r.events, 'foundry:ring');
    expect(rings).toHaveLength(1);
    expect(dataOf(rings[0])).toMatchObject({ tone: 'low', cause: 'clapper' });
    expect(ringBells(rings[0])).toEqual(['4,0', '2,0']); // bells first, then standing Clappers
    expect(hums(r.state)).toEqual(['low']);
  });

  it('BF-6: a standing Clapper is a member of its tone; a dead one is not', () => {
    const s = board('D . Q Q Q . {bell:low}');
    const at = (n: number) => unit(s, `clapper-${n}`).pos;
    const groups = toneGroups(s, clapperTone);
    expect(groups.low.map((m) => m.kind)).toEqual(['bell', 'unit']);
    expect(groups.mid.map((m) => (m.kind === 'unit' ? m.at : null))).toEqual([at(2)]);
    expect(groups.high.map((m) => (m.kind === 'unit' ? m.at : null))).toEqual([at(3)]);
    const dead = structuredClone(s);
    unit(dead, 'clapper-1').hp = 0;
    expect(toneGroups(dead, clapperTone).low.map((m) => m.kind)).toEqual(['bell']);
  });

  it('BF-6: the Clapper plan is rng-free and avoids harming friends', () => {
    const plan = (s: BattleState) =>
      KIT.foes['foundry:clapper']?.plan(s, unit(s, 'clapper-1') as EnemyUnit);
    // The rat beside the Clapper is never its victim; the apprentice on the other side is.
    expect(plan(board('r Q D .', { seed: 3 }))).toMatchObject({
      label: 'bump',
      units: ['draughtsman'],
    });
    // Only a foe beside it: nothing to bump.
    expect(plan(board('r Q . .\n. . . . D', { seed: 3 }))).toBeNull();
  });

  it('BF-6: Ringer and Clapper plans are deterministic across seeds', () => {
    const ascii = '. . . . .\nD . Q . .\n. . . . .\n{bell:mid} . Z{rope:mid} . {bell:low}';
    const plans = SEEDS.map((seed) => {
      const s = planned(ascii, seed);
      return JSON.stringify([
        unit(s, 'clapper-1').pos,
        telegraphOf(s, 'clapper-1'),
        telegraphOf(s, 'ringer-1'),
      ]);
    });
    expect(new Set(plans).size).toBe(1);
  });
});

describe('BF-7 the Detuner', () => {
  it('BF-7: the Detuner is in ENEMIES with the plan stats and token', () => {
    expect(roster.detuner).toMatchObject({
      hp: FOUNDRY_TUNING.foes.detuner.hp,
      move: FOUNDRY_TUNING.foes.detuner.move,
      anchored: false,
      token: FOUNDRY_FOE_TOKENS.detuner,
    });
    expect(ENEMIES.detuner.behaviour).toBe('foundry:detuner');
  });

  it('BF-7: the Detuner walks to the nearest bell and retunes it with a preview', () => {
    const p = planned('D . . . .\n. . . . .\nX . . {bell:low} .');
    expect(unit(p, 'detuner-1').pos).toEqual({ x: 2, y: 2 });
    expect(telegraphOf(p, 'detuner-1')).toMatchObject({
      label: 'retune:mid',
      tiles: [{ x: 3, y: 2 }],
    });
    expect(behaviourPreview(p)).toEqual([
      { kind: 'outline', cells: [{ x: 3, y: 2 }], label: 'mid' },
    ]);
    const r = endTurn(p);
    expect(dataOf(ev(r.events, 'foundry:retuned')[0])).toEqual({ from: 'low', to: 'mid' });
  });

  it('BF-7: with two bells in reach it takes the nearest, reading order on a tie', () => {
    const near = planned('D . . . . .\n. . . . . .\nX . . {bell:low} . {bell:mid}');
    expect(telegraphOf(near, 'detuner-1')?.tiles).toEqual([{ x: 3, y: 2 }]);
    // equal steps either side: reading order (the upper bell)
    const tie = planned('D . . . .\n. . {bell:low} . .\n. . X . .\n. . {bell:high} . .');
    expect(unit(tie, 'detuner-1').pos).toEqual({ x: 2, y: 2 });
    expect(telegraphOf(tie, 'detuner-1')?.tiles).toEqual([{ x: 2, y: 1 }]);
  });

  it('BF-7: muffled and humming bells are retuned like any other', () => {
    const muffled = planned('D . . . .\n. . . . .\nX . . ~{bell:low} .');
    expect(telegraphOf(muffled, 'detuner-1')?.label).toBe('retune:mid');
    const hum = board('D . . . .\n. . . . .\nX . . {bell:low} .');
    hum.rules = { ...hum.rules, 'foundry:bells': { humming: ['low'], struck: {} } };
    const p = endTurn(hum).state;
    expect(telegraphOf(p, 'detuner-1')?.label).toBe('retune:mid');
  });

  it('BF-7: killing or blocking the Detuner keeps the net as it was', () => {
    const p = planned('D . . . .\n. . . . .\nX . . {bell:low} .');
    const killed = structuredClone(p);
    unit(killed, 'detuner-1').hp = 0;
    expect(ev(endTurn(killed).events, 'foundry:retuned')).toHaveLength(0);
    // walled in: no bell is within its reach and it never retunes
    const blocked = planned('D . . . .\nX # . . .\n# # . . {bell:low}');
    expect(telegraphOf(blocked, 'detuner-1')).toBeNull();
    expect(ev(endTurn(blocked).events, 'foundry:retuned')).toHaveLength(0);
  });

  it('BF-7: the Detuner choice is deterministic across seeds', () => {
    const ascii = 'D . . . .\n. . . . .\nX . {bell:high} . .\n. . . . {bell:low}';
    const picks = SEEDS.map((seed) => {
      const s = planned(ascii, seed);
      return JSON.stringify([unit(s, 'detuner-1').pos, telegraphOf(s, 'detuner-1')]);
    });
    expect(new Set(picks).size).toBe(1);
  });
});
