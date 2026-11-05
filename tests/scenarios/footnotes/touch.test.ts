import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { type Aim, legalAims, parseLabel } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { fourCombos } from '../footnoteHarness';
import { unitAtLabel, withLattices } from '../harness';
import { castWith, firstSpell, hpOf, step, tileAim, where } from './castHelper';

const SELF: Aim = { kind: 'self' };
const move = (to: string) => ({ type: 'move' as const, unit: 'draughtsman', to: parseLabel(to) });

/**
 * Touch on yourself, with Shove. Memory: no step this turn, but a step last turn (right); a rat
 * stands behind her. Run-up: she walks A1 to D1 and Touches herself into a rat at G1.
 */
function selfTouch(footnotes: FootnoteIds) {
  const a = withLattices('r D . . .\n. . . . r', { draughtsman: 'Touch> Shove' });
  unitAtLabel(a, 'B1').prevMove = 'right';
  const remembered = castWith(a, SELF, footnotes);
  const b = withLattices('D . . . . . r', { draughtsman: 'Touch> Shove' });
  const walked = step(b, move('D1'), footnotes);
  const ran = castWith(walked.state, SELF, footnotes);
  return {
    caster: where(remembered.state, 'draughtsman'),
    behind: where(remembered.state, 'rat-1'),
    lineA: remembered.events.find((e) => e.type === 'aimed')?.line,
    ran: where(ran.state, 'draughtsman'),
    casterHp: (hpOf(ran.state, 'draughtsman') ?? 0) - (hpOf(walked.state, 'draughtsman') ?? 0),
    ratHp: hpOf(ran.state, 'rat-2') ?? hpOf(ran.state, 'rat-1'),
    ratBefore: 2,
  };
}

test('touch:member fourCombos: memory or run-up, then ram or tow', () => {
  const runs = fourCombos(
    'touch:member',
    ['touch-member-memory', 'touch-member-runup'],
    ['touch-member-ram', 'touch-member-tow'],
    ({ footnotes }) => selfTouch(footnotes),
  );
  const [memoryRam, memoryTow, runupRam, runupTow] = runs.map((r) => r.result);
  // memory: no step this turn, the step of last turn points the Touch right; run-up has no memory.
  expect(memoryRam?.caster).toBe('C1');
  expect(memoryTow?.caster).toBe('C1');
  expect(runupRam?.caster).toBe('B1'); // blind: the Touch had no heading
  expect(memoryRam?.lineA).toBe('touch:member');
  // tow: the rat behind her is pulled along one tile.
  expect(memoryTow?.behind).toBe('B1');
  expect(memoryRam?.behind).toBe('A1');
  expect(runupTow?.behind).toBe('A1'); // nothing was pushed, so nothing was towed
  // run-up: three tiles walked, three pushed; she is crushed against the rat at G1 two tiles on.
  expect(runupRam?.ran).toBe('F1');
  expect(runupTow?.ran).toBe('F1');
  expect(memoryRam?.ran).toBe('E1'); // without run-up one tile
  // ram: the rat takes the full crush (1 + 2 tiles = 3, it dies) and she takes 1; otherwise reversed.
  expect(runupRam?.casterHp).toBe(-TUNING.crushStruck);
  expect(runupRam?.ratHp).toBe(0);
  expect(runupTow?.casterHp).toBe(-(TUNING.crushBase + 2 * TUNING.crushPerTile));
  expect(runupTow?.ratHp).toBe(2 - TUNING.crushStruck);
});

test('touch-member-memory: a step last turn is remembered into the next turn', () => {
  const s = withLattices('D . . . r', { draughtsman: 'Touch> Shove' });
  const moved = step(s, move('B1'));
  const next = step(moved.state, { type: 'endTurn' });
  expect(unitAtLabel(next.state, 'B1').lastMove).toBeNull();
  expect(unitAtLabel(next.state, 'B1').prevMove).toBe('right');
});

/**
 * Touch on a neighbouring unit, with Shove. Steer: she steps right A2 to B2, the rat is at B3
 * below her (away is down; steer is right). Reach: the rat stands two tiles off at D1.
 */
function unitTouch(footnotes: FootnoteIds) {
  const a = withLattices('. . . .\nD . . .\n. r . .\n. . . .', { draughtsman: 'Touch> Shove' });
  const walked = step(a, move('B2'), footnotes);
  const r = castWith(walked.state, tileAim('B3'), footnotes);
  const b = withLattices('. D . r .', { draughtsman: 'Touch> Shove' });
  const aims = legalAims(b, 'draughtsman', firstSpell(b), footnotes);
  const far = aims.some((x) => x.kind === 'tile' && x.at.x === 3 && x.at.y === 0);
  const longCast = far ? castWith(b, tileAim('D1'), footnotes) : null;
  return {
    rat: where(r.state, 'rat-1'),
    caster: where(r.state, 'draughtsman'),
    line: r.events.find((e) => e.type === 'aimed')?.line,
    far,
    farRat: longCast ? where(longCast.state, 'rat-1') : null,
    farCaster: longCast ? where(longCast.state, 'draughtsman') : null,
  };
}

test('touch:unit fourCombos: reach or steer, then follow or recoil', () => {
  const runs = fourCombos(
    'touch:unit',
    ['touch-unit-reach', 'touch-unit-steer'],
    ['touch-unit-follow', 'touch-unit-recoil'],
    ({ footnotes }) => unitTouch(footnotes),
  );
  const [reachFollow, reachRecoil, steerFollow, steerRecoil] = runs.map((r) => r.result);
  // Without steer the Touch points away from her (down): the rat goes to B4; with steer, right to C3.
  expect(reachFollow?.rat).toBe('B4');
  expect(steerFollow?.rat).toBe('C3');
  expect(reachFollow?.line).toBe('touch:unit');
  // follow: she steps after it (one tile along the heading); recoil: one tile the other way.
  expect(reachFollow?.caster).toBe('B3');
  expect(reachRecoil?.caster).toBe('B1');
  expect(steerFollow?.caster).toBe('C2');
  expect(steerRecoil?.caster).toBe('A2');
  // reach: a unit two tiles away over an empty tile is a legal aim, and its heading is unchanged.
  expect(reachFollow?.far).toBe(true);
  expect(steerFollow?.far).toBe(false);
  expect(reachFollow?.farRat).toBe('E1');
  expect(reachFollow?.farCaster).toBe('C1');
  expect(reachRecoil?.farCaster).toBe('A1');
});
