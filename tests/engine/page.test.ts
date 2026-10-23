import { describe, expect, test } from 'vitest';
import {
  cellsInWindow,
  compileLattice,
  growingLattice,
  isLatticeCoord,
  isSocket,
  key,
  label,
  latticeLabel,
  MAX_LATTICE_COORD,
  pageBounds,
  parseLattice,
  parseLatticeKey,
  toGrowingLattice,
} from '$engine';
import { DISTANT_PAGE, EMPTY_PAGE } from '../fixtures/growing-pages/pages';

describe('growing page contracts', () => {
  test('fixed holes stay fixed; conversion retains exact placements and compiler identity', () => {
    const fixed = parseLattice('Bolt> Ink Strike\nx . .');
    const growing = toGrowingLattice(fixed);
    expect(growing.runes).toBe(fixed.runes);
    expect(isSocket(fixed.shape, { x: 0, y: 1 })).toBe(false);
    expect(isSocket(growing.shape, { x: 0, y: 1 })).toBe(true);
    expect(isSocket(growing.shape, { x: -100, y: 100 })).toBe(true);
    expect(compileLattice(growing)).toEqual(compileLattice(fixed));
    for (const shape of [fixed.shape, growing.shape]) {
      for (const x of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
        expect(isSocket(shape, { x, y: 0 })).toBe(false);
      }
    }
  });

  test('empty and sparse occupied bounds use no rectangle allocation', () => {
    expect(growingLattice(EMPTY_PAGE).shape).toEqual({
      kind: 'growing',
      origin: { x: -2, y: -2 },
      width: 5,
      height: 5,
      holes: [],
    });
    expect(
      pageBounds([
        { x: -1_000_000_000, y: 4 },
        { x: 1_000_000_000, y: -5 },
      ]),
    ).toEqual({ origin: { x: -1_000_000_001, y: -6 }, width: 2_000_000_003, height: 12 });
    expect(() => pageBounds([{ x: 0, y: 0 }], Number.MAX_SAFE_INTEGER)).toThrow('Unsafe');
    expect(() => pageBounds([{ x: NaN, y: 0 }])).toThrow('Invalid lattice');
    expect(pageBounds([{ x: -MAX_LATTICE_COORD, y: MAX_LATTICE_COORD }]).width).toBe(3);
    expect(growingLattice(DISTANT_PAGE).runes).toBe(DISTANT_PAGE);
  });

  test('only an explicit bounded window is enumerable', () => {
    expect([...cellsInWindow({ origin: { x: -1, y: -1 }, width: 2, height: 2 }, 4)]).toEqual([
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(() => [
      ...cellsInWindow(
        pageBounds([
          { x: -1e9, y: 0 },
          { x: 1e9, y: 0 },
        ]),
        500,
      ),
    ]).toThrow('excessive');
    expect([...cellsInWindow({ origin: { x: 0, y: 0 }, width: 0, height: 0 }, 0)]).toEqual([]);
  });

  test('signed keys are strict and separate from battle labels', () => {
    for (const at of [
      { x: -7, y: 2 },
      { x: 0, y: 0 },
      { x: MAX_LATTICE_COORD, y: -1 },
    ]) {
      expect(isLatticeCoord(at)).toBe(true);
      expect(parseLatticeKey(key(at))).toEqual(at);
    }
    for (const k of ['1,2,3', '01,0', '-0,0', '1.0,0', '1e2,0', ' 1,0', '0,Infinity']) {
      expect(() => parseLatticeKey(k)).toThrow('Bad lattice');
    }
    expect(label({ x: 0, y: 0 })).toBe('A1');
    expect(latticeLabel({ x: 25, y: 8 })).toBe('Z9');
    expect(latticeLabel({ x: 26, y: 0 })).toBe('AA1');
    expect(latticeLabel({ x: 701, y: 0 })).toBe('ZZ1');
    expect(latticeLabel({ x: -1, y: 4 })).toBe('(-1,4)');
  });
});
