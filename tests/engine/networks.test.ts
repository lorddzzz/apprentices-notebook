import { describe, expect, test } from 'vitest';
import { label, parseLabel } from '$engine';
import { brassNet, cloudNet, isBrass, oilNet, sameStateNet } from '$engine/networks';
import { board } from '../scenarios/harness';

const names = (cs: readonly { x: number; y: number }[]): string[] => cs.map(label);
const at = parseLabel;

describe('brassNet', () => {
  const s = board(`
    D # # . .
    . . b # .
    . . . . #
  `);

  test('connects plates and collared units orthogonally, in reading order', () => {
    // The sentry on C2 is a collared unit: it joins the plates above and beside it.
    expect(names(brassNet(s, at('B1')))).toEqual(['B1', 'C1', 'C2', 'D2']);
    expect(names(brassNet(s, at('C2')))).toEqual(['B1', 'C1', 'C2', 'D2']);
  });

  test('a diagonal is not connected', () => {
    expect(names(brassNet(s, at('D2')))).not.toContain('E3');
    expect(names(brassNet(s, at('E3')))).toEqual(['E3']);
  });

  test('is empty where there is no brass', () => {
    expect(brassNet(s, at('A3'))).toEqual([]);
    expect(isBrass(s, at('A3'))).toBe(false);
  });

  test('compounds with a plate in them conduct; a bare unit does not', () => {
    const t = board('D {wall} {kettle} {skid} .\n . . r . .');
    expect(names(brassNet(t, at('B1')))).toEqual(['B1', 'C1', 'D1']);
    expect(brassNet(t, at('C2'))).toEqual([]); // an uncollared rat
  });

  test('a collar cast on a unit joins the network', () => {
    const t = board('D # r& . .');
    expect(names(brassNet(t, at('B1')))).toEqual(['B1', 'C1']);
  });
});

describe('cloudNet', () => {
  test('every kind of cloud joins, and nothing else does', () => {
    const s = board('D ~ {bank} {fog} {brand} o\n . . ~ . . .');
    expect(names(cloudNet(s, at('B1')))).toEqual(['B1', 'C1', 'D1', 'E1', 'C2']);
    expect(cloudNet(s, at('F1'))).toEqual([]);
  });
});

describe('oilNet', () => {
  test('slicks, pools and stains are oil; fire runs along them but not into steam', () => {
    const s = board('D o {pool} {stain} ~ o\n . . . . . .');
    expect(names(oilNet(s, at('B1')))).toEqual(['B1', 'C1', 'D1']);
    expect(names(oilNet(s, at('F1')))).toEqual(['F1']);
  });
});

describe('sameStateNet (Toll)', () => {
  test('connects tiles holding the very same state or compound', () => {
    const s = board('D o o ~ o\n . o . . .');
    expect(names(sameStateNet(s, at('B1')))).toEqual(['B1', 'C1', 'B2']);
    expect(names(sameStateNet(s, at('D1')))).toEqual(['D1']);
    expect(sameStateNet(s, at('A2'))).toEqual([]);
  });

  test('a pool and a slick are different states', () => {
    const s = board('D {pool} o {pool} .');
    expect(names(sameStateNet(s, at('B1')))).toEqual(['B1']);
  });
});
