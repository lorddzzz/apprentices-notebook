import { describe, expect, test } from 'vitest';
import { parseLabel } from '$engine';
import { runDraft } from '$engine/ctx';
import { fallenBrassTiles } from '$engine/districts/api';
import { type BridgesState, COLLAPSE_RULE_ID, parseBridges } from '$engine/districts/bridges/types';
import { roundEnd } from '$engine/turn';
import { board } from '../../scenarios/harness';

/** BR-19c (bridges P24): the two carried variants' state, read through the api. */
const at = parseLabel;

describe('P24 carriers', () => {
  test('P24: parseBridges keeps fallenBrass and omits it when empty', () => {
    const base = { stone: { '1,0': 2 }, originals: ['1,0'], cuts: {} };
    // Valid keys stay, once each, in reading order; malformed entries go.
    const kept = parseBridges({
      ...base,
      fallenBrass: ['3,1', '0,0', '3,1', 'x', 7, '-1,2', '2,0'],
    });
    expect(kept.fallenBrass).toEqual(['0,0', '2,0', '3,1', '-1,2']);
    // Empty, absent or malformed: the key is not there at all.
    for (const raw of [[], undefined, 'no', ['bad']]) {
      const parsed = parseBridges({ ...base, fallenBrass: raw });
      expect(Object.hasOwn(parsed, 'fallenBrass')).toBe(false);
      expect(parsed).toEqual(base);
    }
  });

  test('P24: fallenBrassTiles lists the recorded tiles still fog, in reading order', () => {
    // Fog at D1 and B2; a recorded tile that stands again (A2) is forgotten.
    const s = board('{span} . . _\n. _ . .\n. . . .');
    const own = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
    s.rules = {
      ...s.rules,
      [COLLAPSE_RULE_ID]: { ...own, fallenBrass: ['3,0', '0,1', '1,1'] },
    };
    expect(fallenBrassTiles(s)).toEqual([at('D1'), at('B2')]);
    // Without the key there is nothing to list.
    expect(fallenBrassTiles(board('{span} . . _'))).toEqual([]);
  });

  test('P24: without the two variants a dusk fall leaves the bridges state and the queue as before', () => {
    const s = board('D . r = ={span} . r');
    const before = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
    const r = runDraft(s, (ctx) => roundEnd(ctx));
    const after = r.state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
    expect(r.state.tiles[at('E1').x]?.terrain.drop).toBe(true);
    expect(Object.hasOwn(after, 'fallenBrass')).toBe(false);
    expect(after).toEqual({ ...before, stone: {}, cuts: {} });
    expect(r.state.scheduled).toEqual([]);
  });
});
