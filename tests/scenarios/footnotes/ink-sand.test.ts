import { describe, expect, test } from 'vitest';
import { type BattleState, label, type Origin } from '$engine';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { notify } from '$engine/hooks';
import { applyMark } from '$engine/marks';
import type { Unit } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';

/** IQ-F4: Sand's margin line (`sand:unit`) and its two capstones. */

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const HP = { C1: 9, D1: 9 };

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const at = (u: Unit): string => label(u.pos);
const markOf = (u: Unit): string | null => (u.mark ? (u.mark.bound ? 'bound' : 'plain') : null);

/** The rat (C1) carries a Sand mark that shoves on a hit. */
const sandRat = (ctx: Ctx): void => {
  applyMark(ctx, unit(ctx.s, 'rat-1'), {
    deep: false,
    bound: { action: 'shove', event: 'hit', solvent: 'sand', heading: 'right' },
    origin: ORIGIN,
  });
};

/**
 * One hit on the rat. `fire`: nobody hit it (a fire, heading right, the dummy beside it at D1 is
 * the nearest). `foe` / `member`: the dummy or the stoker stands at D1 and hits leftward.
 */
function hit(footnotes: FootnoteIds, who: 'fire' | 'foe' | 'member') {
  const ascii = who === 'member' ? 'D . r S .' : 'D . r d .';
  const s = runDraft(withLattices(ascii, { draughtsman: 'Bolt> Strike' }, { hp: HP }), sandRat, {
    footnotes,
  }).state;
  const r = runDraft(
    s,
    (ctx) =>
      notify(
        ctx,
        who === 'fire'
          ? { kind: 'hit', unit: 'rat-1', heading: 'right', from: null }
          : { kind: 'hit', unit: 'rat-1', heading: 'left', from: { x: 3, y: 0 } },
      ),
    { footnotes },
  ).state;
  return r;
}

/** The sand run per hitter: where the nearest/fire hit ended the dummy, and the member/foe runs. */
function sandRun(footnotes: FootnoteIds) {
  const fire = hit(footnotes, 'fire');
  const foe = hit(footnotes, 'foe');
  const member = hit(footnotes, 'member');
  return {
    fireDummy: at(unit(fire, 'dummy-1')),
    foeDummy: at(unit(foe, 'dummy-1')),
    foeRatHp: unit(foe, 'rat-1').hp,
    memberStoker: at(unit(member, 'stoker')),
    memberRat: at(unit(member, 'rat-1')),
  };
}

test('sand:unit fourCombos: onward or still, then nearest or spared', () => {
  const runs = fourCombos(
    'sand:unit',
    ['sand-unit-onward', 'sand-unit-still'],
    ['sand-unit-nearest', 'sand-unit-spared'],
    (combo: Combo) => sandRun(combo.footnotes),
  );
  const [onNear, onSpared, stillNear, stillSpared] = runs.map((r) => r.result);
  // Nearest: with no hitter the action turns on the nearest unit (the dummy); still drops the push.
  expect(onNear?.fireDummy).toBe('E1');
  expect(stillNear?.fireDummy).toBe('D1');
  // Spared: a member's hit releases the action as cast, so the rat is shoved away from the stoker.
  for (const r of [onSpared, stillSpared]) {
    expect(r?.memberRat).toBe('B1');
    expect(r?.memberStoker).toBe('D1');
  }
  // Onward sends a foe's turned push back into the rat (a crush: its hp drops); still keeps the foe in place.
  expect(onSpared?.foeRatHp).toBeLessThan(9);
  expect(stillSpared?.foeRatHp).toBe(9);
  expect(onSpared?.foeDummy).toBe('D1');
  expect(stillSpared?.foeDummy).toBe('D1');
  // Without nearest, a fire spends the mark and turns nothing.
  expect(onNear?.foeDummy).toBe('D1');
  expect(stillNear?.foeRatHp).toBe(9);
});

test('sand:unit baseline: the turned action pushes the foe back the way it came', () => {
  const plain = sandRun(withFootnotes([]));
  expect(plain.foeDummy).toBe('E1');
  expect(plain.fireDummy).toBe('D1');
  expect(plain.memberRat).toBe('C1');
  expect(plain.memberStoker).toBe('E1');
});

describe('Sand capstones', () => {
  test('sand-cap-return: the hitter the action turned on is marked plain', () => {
    const capped = hit(withFootnotes(['sand-cap-return']), 'foe');
    expect(unit(capped, 'dummy-1').mark).not.toBeNull();
    expect(markOf(unit(capped, 'dummy-1'))).toBe('plain');
    const plain = hit(withFootnotes([]), 'foe');
    expect(unit(plain, 'dummy-1').mark).toBeNull();
  });

  test('sand-cap-ricochet: when the turned action defeats the hitter, the bearer takes it too', () => {
    // The dummy has 1 hp and a plate waits at E1: the turned push crushes it dead.
    const ascii = 'D . r d #';
    const hp = { C1: 9, D1: 1 };
    const run = (footnotes: FootnoteIds) =>
      runDraft(withLattices(ascii, { draughtsman: 'Bolt> Strike' }, { hp }), sandRat, {
        footnotes,
      }).state;
    const hitWith = (footnotes: FootnoteIds) =>
      runDraft(
        run(footnotes),
        (ctx) => notify(ctx, { kind: 'hit', unit: 'rat-1', heading: 'left', from: { x: 3, y: 0 } }),
        { footnotes },
      ).state;
    const ricochet = hitWith(withFootnotes(['sand-cap-ricochet']));
    expect(unit(ricochet, 'dummy-1').hp).toBe(0);
    // The bearer's own shove (heading left) moves it off C1 to B1.
    expect(at(unit(ricochet, 'rat-1'))).toBe('B1');
    const plain = hitWith(withFootnotes([]));
    expect(at(unit(plain, 'rat-1'))).toBe('C1');
  });
});
