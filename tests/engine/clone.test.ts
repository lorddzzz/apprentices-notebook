import { expect, test } from 'vitest';
import {
  applyAction,
  cloneData,
  compileLattice,
  createBattle,
  growingLattice,
  memberById,
  type PlacedRune,
  stepsOf,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { openJar } from '$engine/jars';

test('engine data cloning preserves shared references, cycles and collections', () => {
  const shared = { at: { x: -2, y: 7 } };
  const graph = {
    left: shared,
    right: shared,
    map: new Map([[shared, shared]]),
    set: new Set([shared]),
    loop: {},
  };
  graph.loop = graph;
  const copy = cloneData(graph);
  expect(copy).not.toBe(graph);
  expect(copy.left).toBe(copy.right);
  expect(copy.left).not.toBe(shared);
  expect(copy.map.get(copy.left)).toBe(copy.left);
  expect(copy.set.has(copy.left)).toBe(true);
  expect(copy.loop).toBe(copy);
  copy.left.at.x = 99;
  expect(shared.at.x).toBe(-2);
});

function longSpell(sealed: boolean) {
  const runes: PlacedRune[] = [
    { at: { x: -2, y: -1 }, rune: 'touch', dir: 'right' },
    ...Array.from(
      { length: 16_384 },
      (_, i): PlacedRune => ({
        at: { x: i - 1, y: -1 },
        rune: i === 0 && sealed ? 'jar' : 'lay',
      }),
    ),
    { at: { x: 16_383, y: -1 }, rune: 'guard' },
  ];
  return compileLattice(growingLattice(runes)).spells;
}

test('a long cast clones snapshots and resolves every quiet step before its final effect', () => {
  const spells = longSpell(false);
  const before = createBattle({
    title: 'long',
    seed: 1,
    board: 'D . r',
    party: { draughtsman: { spells } },
    intents: {},
  }).state;
  const result = applyAction(before, {
    type: 'cast',
    unit: 'draughtsman',
    spell: '-2,-1',
    aim: { kind: 'self' },
  });
  expect(result.events.filter((e) => e.type === 'shieldGained')).toHaveLength(1);
  expect(result.events.some((e) => e.type === 'fizzles')).toBe(false);
  expect(result.events.find((e) => e.type === 'trace')?.cells).toHaveLength(16_386);
  expect(memberById(before, 'draughtsman').shield).toBe(0);
  expect(memberById(result.state, 'draughtsman').shield).toBeGreaterThan(0);
  expect(stepsOf(memberById(result.state, 'draughtsman').spells[0]?.first ?? null)).toHaveLength(
    16_385,
  );
});

test('a long sealed continuation survives cloning and resumes with its original Source identity', () => {
  const before = createBattle({
    title: 'long jar',
    seed: 1,
    board: 'D . r',
    party: { draughtsman: { spells: longSpell(true) } },
    intents: {},
  }).state;
  const sealed = applyAction(before, {
    type: 'cast',
    unit: 'draughtsman',
    spell: '-2,-1',
    aim: { kind: 'self' },
  });
  expect(sealed.events.some((e) => e.type === 'jarSealed')).toBe(true);
  expect(memberById(sealed.state, 'draughtsman').shield).toBe(0);
  const opened = runDraft(sealed.state, (ctx) => openJar(ctx, { x: 0, y: 0 }));
  expect(opened.events.some((e) => e.type === 'shieldGained')).toBe(true);
  expect(opened.events.find((e) => e.type === 'trace')).toMatchObject({
    continued: true,
    spell: '-2,-1',
  });
  expect(opened.state.tiles[0]?.jar).toBeNull();
  expect(sealed.state.tiles[0]?.jar).not.toBeNull();
});
