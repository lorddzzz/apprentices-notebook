import { describe, expect, test } from 'vitest';
import { HEAT, type HeatLevel } from '$data/districts/bathhouses/types';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { KIT } from '$engine/districts';
import {
  BOIL_OVER_RULE,
  boilOverState,
  forecastBoilOver,
  initBoilOver,
  parseBoilOver,
} from '$engine/districts/bathhouses/boilOver';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { listRules, rulePreview } from '$engine/rules';
import { shapeOf } from '$engine/trip/shape';
import { roundEnd } from '$engine/turn';
import type { Unit } from '$engine/types';
import { act, board, draft } from '../../scenarios/harness';

/**
 * The boil-over gauge (bathhouses-plan P1–P3; BH-1). Each board lists the rule as a bathhouse room
 * (or a Lab board) would, at a heat; `pressure` sets the gauge before the round end. Capacity is
 * 12 pips = 48 quarters; heat 1 weighs a cloud tile 2 quarters and a vent 4.
 */

const at = parseLabel;
const ID = BOIL_OVER_RULE_ID;
type Opts = Parameters<typeof board>[1];

function bath(ascii: string, heat: HeatLevel = 1, pressure = 0, opts: Opts = {}): BattleState {
  const s = structuredClone(board(ascii, opts));
  s.rules = listRules(s, [ID], { [ID]: { heat } });
  s.rules = { ...s.rules, [ID]: { ...(s.rules[ID] as BoilOverState), pressure } };
  for (const u of s.units) if (u.kind === 'enemy') u.intent = null; // nothing acts but the gauge
  return s;
}
const gauge = (s: BattleState): BoilOverState => {
  const g = boilOverState(s);
  if (!g) throw new Error('no gauge');
  return g;
};
const dusk = (s: BattleState) => draft(s, (ctx) => roundEnd(ctx));
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const pressureEv = (events: readonly GameEvent[]) =>
  ofType(events, 'bathhouses:pressure')[0] as { data?: unknown } | undefined;
const boilEv = (events: readonly GameEvent[]) =>
  ofType(events, 'bathhouses:boilOver')[0] as { data?: unknown } | undefined;
const damageTo = (events: readonly GameEvent[], id: string) =>
  events.filter((e) => e.type === 'damage' && e.target.id === id);
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

describe('activation: this district and boards that list it', () => {
  test('registered as a district-scoped afterChemistry rule; the bathhouses list it, others do not', () => {
    expect(KIT.rules[ID]).toBe(BOIL_OVER_RULE);
    expect(BOIL_OVER_RULE).toMatchObject({ scope: 'district', slot: 'afterChemistry' });
    expect(shapeOf('bathhouses').rules).toEqual([ID]);
    expect(shapeOf('canals').rules ?? []).not.toContain(ID);
    expect(shapeOf('seam').rules ?? []).not.toContain(ID);
  });

  test('an unlisted board with clouds and a vent never fills or boils', () => {
    const r = dusk(board('D~ ~ ~ @'));
    expect(pressureEv(r.events)).toBeUndefined();
    expect(r.state.rules?.[ID]).toBeUndefined();
    expect(rulePreview(r.state).find((p) => p.rule === ID)).toBeUndefined();
  });

  test('config: heat from `{ heat }`, anything else reads as heat 1; capacity 48 quarters', () => {
    const s = board('D');
    expect(listRules(s, [ID], { [ID]: { heat: 3 } })[ID]).toEqual({
      pressure: 0,
      capacity: 48,
      heat: 3,
    });
    expect(listRules(s, [ID])[ID]).toMatchObject({ heat: 1 });
    expect(listRules(s, [ID], { [ID]: { heat: 9 } })[ID]).toMatchObject({ heat: 1 });
  });
});

describe('fill (P1, P2)', () => {
  test('fill-per-heat: 3 cloud tiles and 1 vent fill by the heat row', () => {
    for (const heat of [1, 2, 3, 4] as const) {
      const r = dusk(bath('D . ~ ~ ~ @', heat));
      const fill = 3 * HEAT[heat].tileQuarters + HEAT[heat].ventQuarters;
      expect(pressureEv(r.events)?.data, `heat ${heat}`).toEqual({
        from: 0,
        to: fill,
        clouds: 3,
        vents: 1,
        feeders: 0,
      });
      expect(gauge(r.state).pressure, `heat ${heat}`).toBe(fill);
    }
  });

  test('every cloud kind and every network counts; a vent under a cloud counts as both', () => {
    const r = dusk(bath('D ~ . {brand} . {fog} . {bank} . @~'));
    expect(pressureEv(r.events)?.data).toMatchObject({ clouds: 5, vents: 1, to: 5 * 2 + 4 });
  });

  test('the gauge carries over rounds and never falls on its own', () => {
    const once = dusk(bath('D ~ ~'));
    expect(gauge(once.state).pressure).toBe(4);
    const twice = dusk(once.state);
    expect(pressureEv(twice.events)?.data).toMatchObject({ from: 4, to: 8 });
    const empty = dusk(bath('D . .', 2, 20));
    expect(pressureEv(empty.events)).toBeUndefined();
    expect(gauge(empty.state).pressure).toBe(20);
  });
});

describe('boil-over (P2, P3)', () => {
  test('boil-at-cap: at capacity every unit on a cloud takes 2 in reading order, then it resets', () => {
    // heat 1, 44 + 2 clouds × 2 = 48: boils exactly at the cap.
    const s = bath('r~ . D~\n. . .', 1, 44);
    const r = dusk(s);
    expect(pressureEv(r.events)?.data).toMatchObject({ from: 44, to: 48 });
    expect(boilEv(r.events)?.data).toEqual({
      tiles: [at('A1'), at('C1')],
      units: ['rat-1', 'draughtsman'],
    });
    const hits = ofType(r.events, 'damage');
    expect(hits.map((e) => e.type === 'damage' && [e.target.id, e.amount, e.source])).toEqual([
      ['rat-1', 2, 'Boil-over'],
      ['draughtsman', 2, 'Boil-over'],
    ]);
    expect(r.lines).toContain('The house boils over.');
    expect(gauge(r.state).pressure).toBe(0);
  });

  test('one quarter short: it fills to 47 and nothing is hurt', () => {
    const r = dusk(bath('r~ . D~', 1, 43));
    expect(gauge(r.state).pressure).toBe(47);
    expect(boilEv(r.events)).toBeUndefined();
    expect(ofType(r.events, 'damage')).toEqual([]);
  });

  test('surplus-dropped: 46 + 12 boils and resets to 0, not 10', () => {
    const r = dusk(bath('D~ ~ ~ ~ @', 1, 46));
    expect(pressureEv(r.events)?.data).toMatchObject({ from: 46, to: 48 });
    expect(boilEv(r.events)).toBeDefined();
    expect(gauge(r.state).pressure).toBe(0);
    const next = dusk(r.state);
    expect(pressureEv(next.events)?.data).toMatchObject({ from: 0 });
  });

  test('units off the cloud are untouched; the event lists every cloud tile', () => {
    const r = dusk(bath('D ~ r~ . r', 1, 47));
    expect(boilEv(r.events)?.data).toEqual({ tiles: [at('B1'), at('C1')], units: ['rat-1'] });
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
    expect(damageTo(r.events, 'rat-2')).toEqual([]);
  });

  test('shielded: the shield takes what it can, the hit still counts', () => {
    const r = dusk(bath('D+~ ~', 1, 47));
    expect(damageTo(r.events, 'draughtsman')).toHaveLength(1);
    expect(ofType(r.events, 'shieldAbsorbs')).toEqual([
      expect.objectContaining({ absorbed: 1, left: 0 }),
    ]);
    const d = unit(r.state, 'draughtsman');
    expect(d.hp).toBe(unit(bath('D+~ ~'), 'draughtsman').hp - 1);
  });

  test('downed: a member at 0 HP on the cloud is not listed and takes nothing', () => {
    const s = bath('D~ S~ r', 1, 47);
    unit(s, 'stoker').hp = 0;
    const r = dusk(s);
    expect(boilEv(r.events)?.data).toMatchObject({ units: ['draughtsman'] });
    expect(damageTo(r.events, 'stoker')).toEqual([]);
  });

  test('towel-bearer: a steamproof apprentice is skipped (`unharmed`), the rest are hit', () => {
    const opts = { kits: { draughtsman: { habit: 'steamproof' as const } } };
    const s = bath('D~ r~', 1, 47, opts);
    const f = forecastBoilOver(s, gauge(s));
    expect(f.units).toEqual(['draughtsman', 'rat-1']);
    expect(f.harm).toEqual([]);
    const r = dusk(s);
    expect(damageTo(r.events, 'draughtsman')).toEqual([]);
    expect(ofType(r.events, 'unharmed')).toEqual([
      expect.objectContaining({ source: 'Boil-over', harm: 'steam', habit: 'steamproof' }),
    ]);
    expect(damageTo(r.events, 'rat-1')).toHaveLength(1);
  });
});

describe('the battle ends after the whole step', () => {
  const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
  const ends = (events: readonly GameEvent[]) =>
    events.filter((e) => e.type === 'won' || e.type === 'lost').map((e) => e.type);

  test('a boil-over killing the last foe wins', () => {
    const s = bath('D . r~', 1, 47);
    unit(s, 'rat-1').hp = 2;
    const r = endTurn(s);
    expect(ends(r.events)).toEqual(['won']);
    expect(r.state.phase).toBe('won');
  });

  test('a boil-over downing the last member loses', () => {
    const s = bath('D~ . r', 1, 47);
    unit(s, 'draughtsman').hp = 2;
    const r = endTurn(s);
    expect(ends(r.events)).toEqual(['lost']);
    expect(r.state.phase).toBe('lost');
  });

  test('both at once: every hit lands first, then the room is won (foes are checked first)', () => {
    const s = bath('D~ . r~', 1, 47);
    unit(s, 'draughtsman').hp = 2;
    unit(s, 'rat-1').hp = 2;
    const r = endTurn(s);
    const died = r.events.flatMap((e) => (e.type === 'died' ? [e.unit.id] : []));
    expect(died).toEqual(['draughtsman', 'rat-1']);
    expect(ends(r.events)).toEqual(['won']);
    const lastDied = r.events.findLastIndex((e) => e.type === 'died');
    expect(r.events.findIndex((e) => e.type === 'won')).toBeGreaterThan(lastDied);
  });
});

describe('the event cap (DK request g, FD-6)', () => {
  test('eight units in the cloud: every hit and death is logged, nothing fizzles', () => {
    const s = bath('D~ S~ r~ r~\nm~ m~ d~ d~', 1, 47);
    for (const u of s.units) if (u.kind === 'enemy') u.hp = 2;
    const r = draft(s, (ctx) => {
      ctx.eventCap = 5; // a cast's cap; the round end is not a cast and must not cut the boil
      roundEnd(ctx);
    });
    const listed = (boilEv(r.events)?.data as { units: string[] } | undefined)?.units ?? [];
    expect(listed).toHaveLength(8);
    for (const id of listed) expect(damageTo(r.events, id).length, id).toBeGreaterThan(0);
    expect(ofType(r.events, 'fizzles')).toEqual([]);
    expect(r.events.length).toBeLessThan(500);
    for (const u of r.state.units) if (u.kind === 'enemy') expect(u.hp, u.id).toBe(0);
  });
});

describe('forecast and preview (P4)', () => {
  test('forecast equals the later result, through a full End turn', () => {
    const s = bath('D~ ~ . r~\nS . ~ @', 2, 30);
    const f = forecastBoilOver(s, gauge(s));
    expect(f).toMatchObject({ value: 30, capacity: 48, boils: true, harm: ['draughtsman'] });
    const r = act(s, { type: 'endTurn' });
    expect(pressureEv(r.events)?.data).toEqual({
      from: f.value,
      to: f.forecast,
      clouds: f.clouds,
      vents: f.vents,
      feeders: f.feeders,
    });
    expect(boilEv(r.events)?.data).toEqual({ tiles: f.tiles, units: f.units });
  });

  test('forecast below the cap matches the next pressure', () => {
    const s = bath('D ~ ~ @', 3, 4);
    const f = forecastBoilOver(s, gauge(s));
    expect(f.boils).toBe(false);
    expect(gauge(dusk(s).state).pressure).toBe(f.forecast);
  });

  test('preview: the meter in whole pips, next round, and a harm ring when it boils', () => {
    const calm = bath('D ~ ~', 1, 9);
    expect(rulePreview(calm).find((p) => p.rule === ID)?.shapes).toEqual([
      { kind: 'meter', label: 'Pressure', value: 2, max: 12, forecast: 3, danger: false },
    ]);
    const hot = bath('D~ r~ .', 1, 46);
    expect(rulePreview(hot).find((p) => p.rule === ID)?.shapes).toEqual([
      { kind: 'meter', label: 'Pressure', value: 11, max: 12, forecast: 12, danger: true },
      { kind: 'tile', at: at('A1'), tone: 'warn' },
      { kind: 'tile', at: at('B1'), tone: 'warn' },
      { kind: 'pulse', at: at('A1') },
    ]);
  });
});

describe('the marked line (BH-9)', () => {
  test('a numeric line in quarter-pips is kept; anything else is dropped', () => {
    expect(initBoilOver({ heat: 2, line: 32 })).toEqual({
      pressure: 0,
      capacity: 48,
      heat: 2,
      line: 32,
    });
    for (const line of ['32', 0, -4, 1.5, null]) {
      expect(initBoilOver({ heat: 2, line })).not.toHaveProperty('line');
    }
    expect(
      parseBoilOver(JSON.parse(JSON.stringify({ pressure: 8, capacity: 48, heat: 3, line: 40 }))),
    ).toEqual({ pressure: 8, capacity: 48, heat: 3, line: 40 });
  });
});
