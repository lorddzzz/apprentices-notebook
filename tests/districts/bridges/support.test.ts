import { describe, expect, test } from 'vitest';
import { cracksOf, spanFillEdits, supportedTiles } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { parseBoard, serializeBoard } from '$engine/notation';
import { board } from '../../scenarios/harness';

/** BR-1 (bridges P2): the support model, derived from the board, and `init` from the pieces. */
const lbl = (cs: { x: number; y: number }[]) => cs.map((c) => `${c.x},${c.y}`);
const stoneOf = (s: ReturnType<typeof board>) => s.rules?.[COLLAPSE_RULE_ID] as BridgesState;

describe('BR-1 support model', () => {
  test('a span with a pier stands', () => {
    const s = board('{pier} {span} {span}');
    expect(cracksOf(s)).toEqual([]);
    expect(lbl(supportedTiles(s))).toEqual(['1,0', '2,0']);
  });

  test('a section with no pier is cracked, derived at once', () => {
    const s = board('{span} {span} {span}');
    expect(lbl(cracksOf(s))).toEqual(['0,0', '1,0', '2,0']);
  });

  test('a broken tile cuts the neck: the far side cracks, the near side stands', () => {
    const s = board('{pier} {span} {span} {span}');
    stoneOf(s).stone['2,0'] = 0;
    expect(lbl(cracksOf(s))).toEqual(['2,0', '3,0']);
  });

  test('two piers survive one cut; derived equal after a clone', () => {
    const s = board('{pier} {span} {span} {span} {pier}');
    stoneOf(s).stone['2,0'] = 0;
    expect(lbl(cracksOf(s))).toEqual(['2,0']);
    expect(cracksOf(structuredClone(s))).toEqual(cracksOf(s));
  });

  test('a keystone holds like a pier while it has HP, and not at 0', () => {
    const s = board('{keystone:3} {span} {span}');
    expect(cracksOf(s)).toEqual([]);
    stoneOf(s).stone['0,0'] = 0;
    expect(lbl(cracksOf(s))).toEqual(['1,0', '2,0']);
  });

  test('init fills stone and originals from the pieces', () => {
    const s = board('{pier} {span:1} {span} {keystone:3}');
    expect(stoneOf(s)).toEqual({
      stone: { '1,0': 1, '2,0': 2, '3,0': 3 },
      originals: ['1,0', '2,0'],
      cuts: {},
    });
  });

  test('span fill covers standable bare floor, not piers or fog', () => {
    const s = board('. {pier} _ .');
    expect(lbl(spanFillEdits(s).map((e) => e.at))).toEqual(['0,0', '3,0']);
  });

  test('notation round trips for span, span:1, pier and keystone:3', () => {
    const row = '{span} {span:1} {pier} {keystone:3}';
    const spec = parseBoard(row);
    const canon = '{span:2} {span:1} {pier} {keystone:3}';
    expect(serializeBoard(spec)).toBe(canon);
    expect(serializeBoard(parseBoard(canon))).toBe(canon);
    expect(parseBoard('{span:1}').tiles[0]?.piece?.data).toEqual({ stone: 1 });
    expect(parseBoard('{keystone:3}').tiles[0]?.piece?.data).toEqual({ hp: 3 });
  });
});
