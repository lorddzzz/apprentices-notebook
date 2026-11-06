import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { BATH_HEART, HEART_HEAT, STEWARD_TUNING } from '$data/districts/bathhouses';
import { RIVALS } from '$data/rivals';
import { BATH_STEWARD_RIVAL } from '$data/rivals/bathSteward';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { runDraft } from '$engine/ctx';
import { reformSpot, STEAMS_AWAY, STEWARD_TRICK, STOKE } from '$engine/districts/bathhouses/heart';
import { bathOffersFor, heatOf } from '$engine/districts/bathhouses/trip';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { rivalAct } from '$engine/rivals/resolve';
import { trickOf } from '$engine/rivals/tricks';
import { checkRoom } from '$engine/rooms';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import type { EnemyUnit } from '$engine/types';
import { act, board, cast, expectLogIncludes, withLattices } from '../../scenarios/harness';

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
const damageTo = (events: readonly GameEvent[], id: string) =>
  events.filter((e) => e.type === 'damage' && e.target.id === id);
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const bolt = (ascii: string, rune: string) =>
  cast(withLattices(ascii, { draughtsman: `Bolt> ${rune}` }), 'draughtsman', 'right');

/** The Steward's round-1 telegraph planned again (the gauge was listed after the board began). */
const replanned = (s: BattleState): BattleState =>
  runDraft(s, (ctx) => {
    const e = steward(ctx.s);
    e.intent = null;
    rivalAct(ctx, e, 1, false);
  }).state;

/** A board with the gauge listed (as the heart lists it) at heat 4. */
function heart(ascii: string, pressure = 0): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [ID], { [ID]: { heat: 4 } });
  s.rules = { ...s.rules, [ID]: { ...(s.rules[ID] as BoilOverState), pressure } };
  return s;
}

describe('data and registration', () => {
  test('token H, a rival (not a stand-in): his page is awarded and his trick is registered', () => {
    expect(ENEMIES.bathSteward).toMatchObject({ token: 'H', move: 0, boss: true });
    expect(ENEMIES.bathSteward.script).toBeUndefined();
    expect(RIVALS.bathSteward).toBe(BATH_STEWARD_RIVAL);
    expect(trickOf(STEAMS_AWAY)).toBe(STEWARD_TRICK);
    expect(steward(board('H')).rival).toBeDefined();
    expect(awardsPage({ def: 'bathSteward' })).toBe(true);
  });
});

describe('the stoke', () => {
  test('two apprentices in his cloud: he stokes (+stokePips, an effect), then the gauge boils', () => {
    const s0 = replanned(heart('H~ S~ D~', 0));
    expect(steward(s0).intent).toMatchObject({ kind: 'trick', trick: STEAMS_AWAY });
    const r = act(s0, endTurn);
    const stoke = ofType(r.events, STOKE)[0] as { data?: { from: number; to: number } };
    expect(stoke.data).toEqual({ from: 0, to: STEWARD_TUNING.stokePips * 4 });
  });

  test('the stoke caps at capacity; without the gauge the trick plans nothing', () => {
    const full = act(replanned(heart('H~ S~ D~', 46)), endTurn);
    const stoke = ofType(full.events, STOKE)[0] as { data?: { from: number; to: number } };
    expect(stoke.data?.to).toBe(48);
    const s = heart('H~ S~ D~');
    expect(STEWARD_TRICK.action?.plan(s, steward(s), null)).toHaveLength(1);
    const bare = board('H~ S~ D~');
    expect(STEWARD_TRICK.action?.plan(bare, steward(bare), null)).toEqual([]);
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
