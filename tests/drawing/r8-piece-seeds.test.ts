import { expect, it, vi } from 'vitest';
import { generateRoom } from '$engine/drawing';
import { INK_KIT } from '$engine/drawing/kits/inkQuarter';
import { deriveSeed } from '$engine/rng';
import { heartDrawing, inputFor } from './fixtures';

it('R8.3: each piece gets a separate seed in placement order', () => {
  const pieces = INK_KIT.pieces.slice(0, 2);
  const calls: number[] = [];
  const spies = pieces.map((kit) =>
    vi.spyOn(kit, 'place').mockImplementation((_layout, seed) => {
      calls.push(seed);
      return null;
    }),
  );
  const input = inputFor(heartDrawing('postmaster'), 1, 0);
  try {
    generateRoom({
      ...input,
      drawing: { ...input.drawing, rule: null, pieces: pieces.map((piece) => piece.id) },
      budget: 1,
    });
    const layoutSeed = deriveSeed(deriveSeed(input.seed, 7001), 0);
    expect(calls.slice(0, 2)).toEqual([deriveSeed(layoutSeed, 2), deriveSeed(layoutSeed, 3)]);
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
});
