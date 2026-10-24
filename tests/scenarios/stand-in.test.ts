import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ENCOUNTERS, ENEMIES } from '$data';
import {
  type BattleState,
  beginEncounter,
  type EnemyUnit,
  finishEncounter,
  hearAfterTrip,
  newProfile,
  pickLoot,
  startTrip,
  type Trip,
} from '$engine';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts/kit';
import type { ScriptStep } from '$engine/districts/types';
import { pagesHeld } from '$engine/rivals/pages';
import { awardsPage } from '$engine/standIn';
import { act, board } from './harness';

/** Stand-in hearts (district kit plan P14, DK-9): a script of telegraphed steps, cycled by round. */

const endTurn = { type: 'endTurn' } as const;

/** Fixture steps: "ring" names the apprentice's tile and strikes it next; "rest" only waits. */
const ring: ScriptStep = {
  id: 'seam:ring',
  plan: (s) => {
    const m = s.units.find((u) => u.kind === 'member' && u.hp > 0);
    return m ? { label: 'ring', tiles: [m.pos], units: [m.id], sequence: [1, 2] } : null;
  },
  act: (ctx, unit, tg) => {
    const victim = ctx.s.units.find((u) => tg.units.includes(u.id) && u.hp > 0);
    if (victim) dealDamage(ctx, victim, 1, 'Ring', [], { heading: null, at: unit.pos });
  },
  describe: (tg) => `ring a note (${tg.sequence?.[0]}/${tg.sequence?.[1]})`,
};
const rest: ScriptStep = {
  id: 'seam:rest',
  plan: () => ({ label: 'rest', tiles: [], units: [], countdown: 1 }),
  act: () => {},
  describe: () => 'wait',
};

const original = ENEMIES.dummy;
const steps = KIT.steps as Record<string, ScriptStep>;

/** Scoped to each describe: other suites import this file, so hooks must not leak outside it. */
function withFixture(): void {
  beforeEach(() => {
    steps['seam:ring'] = ring;
    steps['seam:rest'] = rest;
    ENEMIES.dummy = { ...original, script: { steps: ['seam:ring', 'seam:rest'], standIn: true } };
  });
  afterEach(() => {
    ENEMIES.dummy = original;
    delete steps['seam:ring'];
    delete steps['seam:rest'];
  });
}

const BOARD = 'S . . . d';
const foeOf = (s: BattleState): EnemyUnit => {
  const e = s.units.find((u): u is EnemyUnit => u.kind === 'enemy');
  if (!e) throw new Error('no foe');
  return e;
};
const stepOf = (s: BattleState) => {
  const i = foeOf(s).intent;
  return i?.kind === 'step' ? i.step : null;
};
const hpOf = (s: BattleState) => s.units.find((u) => u.kind === 'member')?.hp;

describe('a stand-in heart', () => {
  withFixture();
  test('telegraphs its step through the Telegraph contract, and acts on it next', () => {
    const s0 = board(BOARD);
    const i = foeOf(s0).intent;
    expect(i?.kind).toBe('step');
    if (i?.kind === 'step') {
      expect(i.telegraph.label).toBe('ring');
      expect(i.telegraph.units).toEqual(['stoker']);
    }
    const hp = hpOf(s0);
    const r = act(s0, endTurn);
    expect(hpOf(r.state)).toBe((hp ?? 0) - 1);
    expect(r.lines.join('\n')).toContain('Ring');
  });

  test('cycles its steps by round, deterministically', () => {
    const run = () => {
      let s = board(BOARD, { hp: { A1: 9 } });
      const seen: (string | null)[] = [];
      for (let i = 0; i < 4; i++) {
        seen.push(stepOf(s));
        s = act(s, endTurn).state;
      }
      return seen;
    };
    const a = run();
    expect(a).toEqual(['seam:ring', 'seam:rest', 'seam:ring', 'seam:rest']);
    expect(run()).toEqual(a);
  });

  test('a downed stand-in does not act', () => {
    const s0 = board(BOARD);
    const down = structuredClone(s0);
    foeOf(down).hp = 0;
    expect(hpOf(act(down, endTurn).state)).toBe(hpOf(s0));
  });
});

describe('clearing a stand-in heart', () => {
  withFixture();
  test('marks the heart cleared and awards no page', () => {
    expect(awardsPage({ def: 'dummy' })).toBe(false);
    expect(awardsPage({ def: 'rat' })).toBe(true);
    const p = newProfile();
    const start: Trip = { ...startTrip(p, 77), encounter: ENCOUNTERS.length - 1 };
    const b = beginEncounter(p, start).state;
    const r = finishEncounter(p, start, { ...b, phase: 'won' });
    if (!r.trip) throw new Error('expected a trip');
    let t = r.trip;
    for (let g = 0; g < 5 && t.status === 'looting'; g++) t = pickLoot(t, 0);
    expect(t.status).toBe('cleared');
    const out = hearAfterTrip(p, t, 'returned');
    expect(out.profile.city.hearts).toContain('seam');
    expect(pagesHeld(out.profile)).toEqual([]);
  });
});
