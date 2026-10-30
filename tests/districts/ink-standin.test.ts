import { describe, expect, test } from 'vitest';
import { ENCOUNTERS, ENEMIES } from '$data';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  hearAfterTrip,
  newProfile,
  parseLabel,
  pickLoot,
  startTrip,
  type Trip,
  unitAt,
} from '$engine';
import { dealDamage } from '$engine/damage';
import {
  CLOCK_RULE_ID,
  canServe,
  clockStaggered,
  openClock,
} from '$engine/districts/inkQuarter/clock';
import { HEART_ROSTER } from '$engine/districts/inkQuarter/standIn';
import { sealAt } from '$engine/districts/inkQuarter/wax';
import { pagesHeld } from '$engine/rivals/pages';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import type { EnemyUnit } from '$engine/types';
import { act, board, draft } from '../scenarios/harness';

/** The stand-in postmaster (ink-quarter plan P10; IQ-7). `p` is him, `q` his clock seal. */

const endTurn = { type: 'endTurn' } as const;
const at = parseLabel;

const MAP = `
S . . . . . .
. . . . . . .
. . . . . . p
`;

function heart(ascii = MAP): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [CLOCK_RULE_ID]);
  return s;
}
const pm = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'postmaster');
  if (!u || u.kind !== 'enemy') throw new Error('no postmaster');
  return u;
};
const labelOf = (s: BattleState): string => {
  const i = pm(s).intent;
  return i?.kind === 'step' ? i.telegraph.label : 'idle';
};
const hpOf = (s: BattleState, id: string): number => s.units.find((u) => u.id === id)?.hp ?? 0;

describe('the stand-in postmaster', () => {
  test('is flagged standIn: clearing him awards no page; the roster names the heart foes', () => {
    expect(ENEMIES.postmaster.script?.standIn).toBe(true);
    expect(awardsPage({ def: 'postmaster' })).toBe(false);
    expect(HEART_ROSTER).toEqual(['postmaster', 'sealer', 'deadLetter', 'deadLetter']);
  });

  test('deterministic by round: serve, pen strike, seal, then idle while the writ is open', () => {
    let s = heart();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      seen.push(`${s.round}:${labelOf(s)}`);
      s = act(s, endTurn).state;
    }
    expect(seen).toEqual(['1:serve', '2:pen', '3:seal', '4:idle']);
  });

  test('the same board plays the same log twice', () => {
    const run = (): string[] => {
      let s = heart();
      const out: string[] = [];
      for (let i = 0; i < 6; i++) {
        const r = act(s, endTurn);
        out.push(...r.events.map((e) => JSON.stringify(e)));
        s = r.state;
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  test('serves a legal writ: stamp on a free tile by the apprentice, seal off the stamp', () => {
    const s = act(heart(), endTurn).state;
    const w = openClock(s);
    expect(w).not.toBeNull();
    if (!w) return;
    expect(w.stamp).toEqual(at('B1'));
    expect(unitAt(s, w.stamp)).toBeNull();
    expect(s.units.find((u) => u.id === w.seal)?.def).toBe('clockSeal');
    expect(w.deadline).toBe(4);
  });

  test('the pen strike and the wax seal land on the apprentice they named', () => {
    let s = act(heart(), endTurn).state;
    expect(labelOf(s)).toBe('pen');
    const hp = hpOf(s, 'stoker');
    s = act(s, endTurn).state;
    expect(hpOf(s, 'stoker')).toBe(hp - 2);
    expect(labelOf(s)).toBe('seal');
    s = act(s, endTurn).state;
    expect(sealAt(s, at('A1'))).not.toBeNull();
  });

  test('a staggered postmaster skips his next action and spends the stagger', () => {
    let s = act(heart(), endTurn).state; // served; round 2 pen planned
    const w = openClock(s);
    if (!w) throw new Error('no writ');
    const seal = s.units.find((u) => u.id === w.seal);
    if (!seal) throw new Error('no seal');
    s = draft(s, (ctx) => {
      const live = ctx.s.units.find((u) => u.id === w.seal);
      if (live) dealDamage(ctx, live, 3, 'Strike');
    }).state;
    expect(clockStaggered(s, pm(s).id)).toBe(true);
    const hp = hpOf(s, 'stoker');
    s = act(s, endTurn).state; // the pen would have landed
    expect(hpOf(s, 'stoker')).toBe(hp);
    expect(clockStaggered(s, pm(s).id)).toBe(false);
    expect(canServe(s, pm(s).id)).toBe(false); // cooling down
  });

  test('re-serves only once canServe: after the cooldown', () => {
    let s = heart();
    const serves: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (labelOf(s) === 'serve') serves.push(s.round);
      s = act(s, endTurn).state;
      if (s.units.some((u) => u.kind === 'member' && u.hp <= 0)) break;
    }
    expect(serves[0]).toBe(1);
    for (const r of serves.slice(1)) expect(r).toBeGreaterThanOrEqual(7);
  });

  test('his death withdraws the writ: the seal goes and the room can end', () => {
    const s0 = act(heart('S . . . p'), endTurn).state;
    expect(openClock(s0)).not.toBeNull();
    const r = draft(s0, (ctx) => dealDamage(ctx, pm(ctx.s), 99, 'Strike'));
    expect(openClock(r.state)).toBeNull();
    expect(r.state.units.some((u) => u.kind === 'enemy' && u.hp > 0)).toBe(false);
  });
});
