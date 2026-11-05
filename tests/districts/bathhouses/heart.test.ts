import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { BATH_HEART, HEART_HEAT, STEWARD_STEPS, STEWARD_TUNING } from '$data/districts/bathhouses';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { hasTrait } from '$engine/arrival';
import { KIT } from '$engine/districts';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import { reformSpot, STEAMS_AWAY, STEWARD_GUARD, STOKE } from '$engine/districts/bathhouses/heart';
import { bathOffersFor, heatOf } from '$engine/districts/bathhouses/trip';
import {
  BOIL_OVER_RULE_ID,
  type BoilOverState,
  STEAM_CAUSE,
} from '$engine/districts/bathhouses/types';
import { checkRoom } from '$engine/rooms';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import type { EnemyUnit } from '$engine/types';
import { act, board, cast, draft, expectLogIncludes, withLattices } from '../../scenarios/harness';

/**
 * The Bath-Steward stand-in (bathhouses-plan P10; BH-8). Token `H`, `H~` on a cloud tile. His
 * script cycles lay → shove → stoke by round; struck in a cloud he re-forms on the free tile of it
 * farthest from where he stood; a burst of the cloud (Storm, the boil-over) hurts him.
 */

const at = parseLabel;
const endTurn = { type: 'endTurn' } as const;
const ID = BOIL_OVER_RULE_ID;

const steward = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'bathSteward');
  if (u?.kind !== 'enemy') throw new Error('no steward');
  return u;
};
const stepNow = (s: BattleState) => {
  const i = steward(s).intent;
  return i?.kind === 'step' ? i : null;
};
const damageTo = (events: readonly GameEvent[], id: string) =>
  events.filter((e) => e.type === 'damage' && e.target.id === id);
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const bolt = (ascii: string, rune: string) =>
  cast(withLattices(ascii, { draughtsman: `Bolt> ${rune}` }), 'draughtsman', 'right');

/** A board with the gauge listed (as the heart lists it) at heat 4. */
function heart(ascii: string, pressure = 0): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [ID], { [ID]: { heat: 4 } });
  s.rules = { ...s.rules, [ID]: { ...(s.rules[ID] as BoilOverState), pressure } };
  return s;
}

describe('data and registration', () => {
  test('token H, a stand-in script of three steps, the steamsAway trait, no page', () => {
    expect(ENEMIES.bathSteward).toMatchObject({ token: 'H', move: 0, boss: true });
    expect(ENEMIES.bathSteward.script).toEqual({ steps: STEWARD_STEPS, standIn: true });
    for (const id of STEWARD_STEPS) expect(KIT.steps[id]).toBeDefined();
    expect(KIT.harmGuards).toContain(STEWARD_GUARD);
    expect(hasTrait(steward(board('H')), 'steamsAway')).toBe(true);
    expect(awardsPage({ def: 'bathSteward' })).toBe(false);
  });
});

describe('the script telegraphs and acts by round', () => {
  test('round 1 lays steam toward the party, round 2 shoves from within, round 3 stokes', () => {
    const s0 = heart(['. . . . . . .', '. H~ . . . S .', '. . . . . . .'].join('\n'));
    // Round 1: lay, telegraphed on his tile... his tile is steam already, so the way to the Stoker.
    const lay = stepNow(s0);
    expect(lay?.step).toBe('bathhouses:steward:lay');
    expect(lay?.telegraph.tiles).toEqual([at('C2'), at('D2'), at('E2')]);

    const r1 = act(s0, endTurn);
    for (const c of ['B2', 'C2', 'D2', 'E2']) {
      expect(r1.state.tiles[at(c).y * r1.state.width + at(c).x]?.state?.id).toBe('cloud');
    }
    // Round 2: from the cloud tile beside the Stoker (E2), by the attendant's heading rule.
    const shove = stepNow(r1.state);
    expect(shove?.step).toBe('bathhouses:steward:shove');
    expect(shove?.telegraph.tiles[0]).toEqual(at('E2'));
    expect(shove?.telegraph.units).toEqual(['stoker']);

    const r2 = act(r1.state, endTurn);
    expect(steward(r2.state).pos).toEqual(at('E2'));
    expect(
      ofType(r2.events, 'moved').some((e) => e.type === 'moved' && e.cause === STEAM_CAUSE),
    ).toBe(true);
    expect(ofType(r2.events, 'shove')).toHaveLength(1);
    const stoker = r2.state.units.find((u) => u.id === 'stoker');
    expect(stoker?.pos).not.toEqual(at('F2'));

    // Round 3: stoke, +4 pips on the gauge before the round's own fill.
    expect(stepNow(r2.state)?.step).toBe('bathhouses:steward:stoke');
    const s2 = structuredClone(r2.state);
    s2.rules = { ...s2.rules, [ID]: { ...(s2.rules?.[ID] as BoilOverState), pressure: 0 } };
    const before = boilOverState(s2)?.pressure ?? 0;
    const r3 = act(s2, endTurn);
    const stoke = ofType(r3.events, STOKE)[0] as { data?: { from: number; to: number } };
    expect(stoke.data).toEqual({ from: before, to: before + STEWARD_TUNING.stokePips * 4 });
    // Round 4 starts the cycle again.
    expect(stepNow(r3.state)?.step).toBe('bathhouses:steward:lay');
  });

  test('the stoke caps at capacity; without the gauge he idles that round', () => {
    const s = heart('H~ . S', 46);
    const stoke = KIT.steps['bathhouses:steward:stoke'];
    if (!stoke) throw new Error('no step');
    const tg = stoke.plan(s, steward(s));
    if (!tg) throw new Error('no telegraph');
    const r = draft(s, (ctx) => stoke.act(ctx, steward(ctx.s), tg));
    expect(boilOverState(r.state)?.pressure).toBe(48);
    expect(stoke.plan(board('H~ . S'), steward(board('H~ . S')))).toBeNull();
  });

  test('a shove out of the cloud: he idles when no apprentice is beside his steam', () => {
    const s = board('H~ . . . S');
    const shove = KIT.steps['bathhouses:steward:shove'];
    expect(shove?.plan(s, steward(s))).toBeNull();
  });
});

describe('steams away (P10)', () => {
  test('a hit in a connected cloud is dodged: he re-forms on the farthest free tile', () => {
    const r = bolt('D . H~ ~ ~ ~', 'Strike');
    const id = steward(r.state).id;
    expect(damageTo(r.events, id)).toEqual([]);
    expect(steward(r.state).hp).toBe(ENEMIES.bathSteward.hp);
    expect(steward(r.state).pos).toEqual(at('F1'));
    expect(ofType(r.events, STEAMS_AWAY)).toHaveLength(1);
    expectLogIncludes(r.events, ['Bath-Steward at C1 steams away and re-forms at F1']);
  });

  test('ties go to reading order', () => {
    const s = board(['. ~ .', '~ H~ ~', '. ~ .'].join('\n'));
    expect(reformSpot(s, steward(s))).toEqual(at('B1'));
  });

  test('with the cloud cut (no free tile of his network) he takes the hit', () => {
    const r = bolt('D . H~ . ~ ~', 'Strike');
    expect(damageTo(r.events, steward(r.state).id)).toHaveLength(1);
    expect(steward(r.state).pos).toEqual(at('C1'));
    expect(ofType(r.events, STEAMS_AWAY)).toEqual([]);
  });

  test('out of the cloud he takes the hit', () => {
    const r = bolt('D . H . ~', 'Strike');
    expect(damageTo(r.events, steward(r.state).id)).toHaveLength(1);
  });

  test('a Storm hurts him: the Spark is dodged, the burst of the cloud is not', () => {
    const r = bolt('D . H~ ~ ~', 'Spark');
    const id = steward(r.state).id;
    expect(ofType(r.events, STEAMS_AWAY)).toHaveLength(1);
    const hits = damageTo(r.events, id);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.type === 'damage' && e.source === 'Storm')).toBe(true);
  });
});

describe('the heart room', () => {
  test('every variant passes checkRoom and seats the Steward on steam', () => {
    for (const v of BATH_HEART.variants) {
      expect(checkRoom(v.layout)).toEqual([]);
      const s = board(v.layout.replace('P', 'S'));
      expect(steward(s)).toBeDefined();
    }
    expect(BATH_HEART).toMatchObject({ heart: true, heatBase: 4, loot: 'bathhouses:h4' });
  });

  test('heat 4, never cooled; the heart offers h4 with two picks', () => {
    const where = { room: 4, length: 5 };
    expect(heatOf({ ...where, state: { pendingCool: 1 } })).toBe(HEART_HEAT);
    const offers = bathOffersFor({ ...where, state: { pendingCool: 0 } } as Parameters<
      typeof bathOffersFor
    >[0]);
    expect(offers).toEqual({ table: 'bathhouses:h4', picks: 2 });
    expect(BATH_HEART.picks).toBe(2);
  });
});
