import { expect, test } from 'vitest';
import { parseLabel } from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { forkSide } from '$engine/runes/flow';
import { fourCombos } from '../footnoteHarness';
import { board, withLattices } from '../harness';
import { castWith, hpOf, tileAim, where } from './castHelper';

const FORK = '. Shove\nTouch> Fork\n. Shove';

/**
 * Touch on the empty tile B4 from A4 (heading right): the left branch is the tile above it (up),
 * the right branch the tile below (down). Near rats stand at B3, B5; far rats at B2, B6.
 */
function branches(footnotes: FootnoteIds) {
  const near = withLattices('. . .\n. . .\n. r .\nD . .\n. r .\n. . .\n. . .\nr . .', {
    draughtsman: FORK,
  });
  const far = withLattices('. . .\n. r .\n. . .\nD . .\n. . .\n. r .\n. . .\nr . .', {
    draughtsman: FORK,
  });
  const n = castWith(near, tileAim('B4'), footnotes);
  const f = castWith(far, tileAim('B4'), footnotes);
  return {
    near: [where(n.state, 'rat-1'), where(n.state, 'rat-2')],
    far: [where(f.state, 'rat-1'), where(f.state, 'rat-2')],
    nearLine: n.events.find((e) => e.type === 'push')?.line,
  };
}

/** Touch on the top-row tile B1 (a rat): the left branch (up) is off the board; the right (down) is B2. */
function edge(footnotes: FootnoteIds) {
  const s = withLattices('D r .\n. r .', { draughtsman: FORK });
  const r = castWith(s, tileAim('B1'), footnotes);
  return {
    top: where(r.state, 'rat-1'),
    topHp: hpOf(r.state, 'rat-1'),
    below: where(r.state, 'rat-2'),
    edgeMiss: r.events.some((e) => e.type === 'miss' && e.line === 'fork:edge'),
  };
}

test('fork:unit fourCombos: splay or wide, then bounce or both', () => {
  const runs = fourCombos(
    'fork:unit',
    ['fork-unit-splay', 'fork-unit-wide'],
    ['fork-unit-bounce', 'fork-unit-both'],
    ({ footnotes }) => ({ ...branches(footnotes), ...edge(footnotes) }),
  );
  const [splayBounce, splayBoth, wideBounce, wideBoth] = runs.map((r) => r.result);
  // splay: each branch pushes its own side's way (up for the left, down for the right).
  expect(splayBoth?.near).toEqual(['B2', 'B6']);
  // wide: the near rats are not acted on; the far rats are, pushed with the spell (right).
  expect(wideBoth?.near).toEqual(['B3', 'B5']);
  expect(wideBoth?.far).toEqual(['C2', 'C6']);
  // bounce: the branch off the room acts on the target; both stamp fork:unit on the push.
  expect(splayBounce?.edgeMiss).toBe(false);
  expect(wideBounce?.edgeMiss).toBe(false);
  expect(splayBoth?.edgeMiss).toBe(true);
  expect(wideBoth?.edgeMiss).toBe(true);
  // bounce with splay pushes the top rat up into the edge (a crush); without splay it is pushed right.
  expect(splayBounce?.top).toBe('B1');
  expect((splayBounce?.topHp ?? 2) < 2).toBe(true);
  expect(wideBounce?.top).toBe('C1');
  expect(splayBoth?.top).toBe('B1');
  expect(splayBoth?.topHp).toBe(2);
  expect(splayBounce?.nearLine).toBe('fork:unit');
});

test('fork-unit-both: a tile two targets reach is acted on once for each, not once', () => {
  const s = board('. . . .\nD . . .\n. . . .\n. . . .');
  const at = (l: string) => ({ kind: 'tile' as const, at: parseLabel(l) });
  // A1 faces down (its left is B1... east) and B2 faces right (its left is up): both reach B1.
  const targets = [at('A1'), at('B2')];
  const headings = new Map<string, 'down' | 'right'>([
    ['t:0,0', 'down'],
    ['t:1,1', 'right'],
  ]);
  const plain = forkSide(s, targets, headings, 'left');
  const doubled = forkSide(s, targets, headings, 'left', { 'fork:unit@2': 'fork-unit-both' });
  expect(plain.targets).toHaveLength(1);
  expect(doubled.targets).toHaveLength(2);
  expect(doubled.targets.map((x) => (x.kind === 'tile' ? x.at : null))).toEqual([
    parseLabel('B1'),
    parseLabel('B1'),
  ]);
});
