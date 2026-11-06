import { expect, test } from 'vitest';
import { type Aim, applyAction, isLegal, legalAims } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { aimAt, memberMode, onCell, onSpell } from '../../src/app/battleInput';
import { overlayFor } from '../../src/app/overlay';
import { withFootnotes } from '../scenarios/footnoteHarness';
import { firstSpell, tileAim } from '../scenarios/footnotes/castHelper';
import { withLattices } from '../scenarios/harness';
import { at } from './battleFixtures';

const REACH = withFootnotes(['touch-unit-reach']);
const board = () => withLattices('. D . r .', { draughtsman: 'Touch> Shove' });
const tiles = (aims: Aim[]) => aims.flatMap((a) => (a.kind === 'tile' ? [a.at] : []));
const aiming = (s: ReturnType<typeof board>, fn: FootnoteIds) =>
  onSpell(s, memberMode(s, 'draughtsman'), firstSpell(s), { footnotes: fn }).mode;

test('the UI aim set equals the engine legal aims, with and without touch-unit-reach', () => {
  const s = board();
  const spell = firstSpell(s);
  for (const fn of [{}, REACH]) {
    const mode = aiming(s, fn);
    expect(mode.kind).toBe('aim');
    if (mode.kind !== 'aim') continue;
    expect(mode.aims).toEqual(legalAims(s, 'draughtsman', spell, fn));
    for (let x = 0; x < 5; x++) {
      const ui = aimAt(s, 'draughtsman', spell, { x, y: 0 }, fn);
      const engine = legalAims(s, 'draughtsman', spell, fn).some(
        (a) => (a.kind === 'tile' && a.at.x === x) || (a.kind === 'self' && x === 1),
      );
      expect(ui !== null).toBe(engine);
      if (ui) {
        expect(isLegal(s, { type: 'cast', unit: 'draughtsman', spell, aim: ui }, fn)).toBeNull();
      }
    }
  }
});

test('touch-unit-reach: the unit two tiles off is aimable and tinted only when written', () => {
  const s = board();
  const spell = firstSpell(s);
  expect(tiles(legalAims(s, 'draughtsman', spell, {})).some((c) => c.x === 3)).toBe(false);
  expect(aimAt(s, 'draughtsman', spell, at('D1'))).toBeNull();
  expect(aimAt(s, 'draughtsman', spell, at('D1'), REACH)).toEqual(tileAim('D1'));

  const tinted = (fn: FootnoteIds) =>
    overlayFor(s, aiming(s, fn), fn).highlights.some((h) => h.kind === 'aim' && h.at.x === 3);
  expect(tinted({})).toBe(false);
  expect(tinted(REACH)).toBe(true);
});

test('tapping the far unit reaches confirm when written, and the engine accepts the cast', () => {
  const s = board();
  const r = onCell(s, aiming(s, REACH), at('D1'), { footnotes: REACH });
  expect(r.mode.kind).toBe('confirm');
  const off = onCell(s, aiming(s, {}), at('D1'), {});
  expect(off.mode.kind).not.toBe('confirm');
  const cast = {
    type: 'cast' as const,
    unit: 'draughtsman',
    spell: firstSpell(s),
    aim: tileAim('D1'),
  };
  expect(() => applyAction(s, cast, REACH)).not.toThrow();
});
