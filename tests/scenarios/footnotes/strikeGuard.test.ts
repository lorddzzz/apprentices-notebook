import { expect, test } from 'vitest';
import { TUNING } from '$data';
import type { BattleState } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { unitAtLabel, withLattices } from '../harness';
import { castWith, tileAim } from './castHelper';

const byId = (s: BattleState, id: string) => s.units.find((u) => u.id === id);

/** Rat-1 at B1 is shielded for 4; the draughtsman at A1 Touches it. Rat-2 is at C1, rat-3 at B2. Strike does 2. */
function shieldedStrike({ footnotes }: { footnotes: FootnoteIds }) {
  const s = withLattices('D r r\n. r .', { draughtsman: 'Touch> Strike' });
  const rat = unitAtLabel(s, 'B1');
  rat.shield = 4;
  rat.guardUntil = s.round + 1;
  const r = castWith(s, tileAim('B1'), footnotes);
  return {
    events: r.events,
    max: rat.maxHp,
    hit: byId(r.state, 'rat-1'),
    beside: byId(r.state, 'rat-2')?.hp,
    below: byId(r.state, 'rat-3')?.hp,
    caster: byId(r.state, 'draughtsman')?.hp,
    casterBefore: byId(s, 'draughtsman')?.hp,
  };
}

test('strike:shielded fourCombos: break or pierce, then glance or knock', () => {
  const runs = fourCombos(
    'strike:shielded',
    ['strike-shielded-break', 'strike-shielded-pierce'],
    ['strike-shielded-glance', 'strike-shielded-knock'],
    shieldedStrike,
  );
  const [breakGlance, breakKnock, pierceGlance, pierceKnock] = runs.map((r) => r.result);
  const full = breakGlance?.max ?? 0;
  // break: the whole shield goes and nothing passes; pierce: 1 goes through, the rest is absorbed.
  expect(breakGlance?.hit?.shield).toBe(0);
  expect(breakGlance?.hit?.hp).toBe(full);
  expect(pierceGlance?.hit?.hp).toBe(full - 1);
  expect(pierceGlance?.hit?.shield).toBe(3);
  // glance: the first neighbour in reading order that is not the caster (C1) takes 1.
  expect(breakGlance?.beside).toBe(full - 1);
  expect(pierceGlance?.beside).toBe(full - 1);
  expect(breakGlance?.below).toBe(full);
  expect(breakGlance?.caster).toBe(breakGlance?.casterBefore);
  // knock: the struck rat is knocked right into rat-2, which takes the 1 of a crush.
  expect(breakKnock?.hit?.hp).toBe(full - TUNING.crushBase);
  expect(breakKnock?.beside).toBe(full - TUNING.crushStruck);
  // the knocked rat's remaining shield takes its crush.
  expect(pierceKnock?.hit?.hp).toBe(full - 1);
  expect(pierceKnock?.hit?.shield).toBeLessThan(3);
  for (const r of runs) {
    const hit = r.result.events.find((e) => e.type === 'damage' && e.source === 'Strike');
    expect(hit?.line).toBe('strike:shielded');
  }
});

/** Rat-1 (B1) already holds a Guard shield when the draughtsman Guards it again; rat-2 at C1 is unshielded. */
function guardTwice({ footnotes }: { footnotes: FootnoteIds }) {
  const s = withLattices('D r r\n. . .', { draughtsman: 'Touch> Guard' });
  const rat = unitAtLabel(s, 'B1');
  rat.shield = TUNING.guardShield;
  rat.guardUntil = s.round + 1;
  const r = castWith(s, tileAim('B1'), footnotes);
  return {
    events: r.events,
    round: s.round,
    shield: byId(r.state, 'rat-1')?.shield,
    until: byId(r.state, 'rat-1')?.guardUntil,
    neighbour: byId(r.state, 'rat-2')?.shield,
    thorns: byId(r.state, 'rat-1')?.thorns === true,
  };
}

test('guard:shielded fourCombos: long or thick, then spill or thorns', () => {
  const runs = fourCombos(
    'guard:shielded',
    ['guard-shielded-long', 'guard-shielded-thick'],
    ['guard-shielded-spill', 'guard-shielded-thorns'],
    guardTwice,
  );
  const [longSpill, longThorns, thickSpill, thickThorns] = runs.map((r) => r.result);
  // long keeps the size and lasts a round longer; thick adds 3 to what is there.
  expect(longSpill?.shield).toBe(TUNING.guardShield);
  expect(longSpill?.until).toBe((longSpill?.round ?? 0) + 2);
  expect(thickSpill?.shield).toBe(TUNING.guardShield + 3);
  expect(thickSpill?.until).toBe((thickSpill?.round ?? 0) + 1);
  // spill shields the unshielded ally beside it (rat-2 at C1) for 1.
  expect(longSpill?.neighbour).toBe(1);
  expect(thickSpill?.neighbour).toBe(1);
  expect(longThorns?.neighbour).toBe(0);
  expect(longThorns?.thorns).toBe(true);
  expect(thickThorns?.thorns).toBe(true);
  expect(longSpill?.thorns).toBe(false);
  for (const r of runs) {
    const gained = r.result.events.find((e) => e.type === 'shieldGained');
    expect(gained?.line).toBe('guard:shielded');
  }
});

test('guard-shielded-thorns: a hit on the barbed unit costs the hitter 1', () => {
  const s = withLattices('D r .\n. . .', { draughtsman: 'Touch> Strike' });
  const rat = unitAtLabel(s, 'B1');
  rat.shield = 5;
  rat.guardUntil = s.round + 1;
  rat.thorns = true;
  const before = unitAtLabel(s, 'A1').hp;
  const r = castWith(s, tileAim('B1'), withFootnotes(['guard-shielded-thorns']));
  expect(unitAtLabel(r.state, 'A1').hp).toBe(before - 1);
  expect(r.events.some((e) => e.type === 'damage' && e.source === 'Thorns')).toBe(true);
});
