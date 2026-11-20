import { expect, it, vi } from 'vitest';
import type { PieceId } from '$engine/districts/types';
import { generateRoom } from '$engine/drawing';
import { GEN_KITS } from '$engine/drawing/kits';
import { bellsKit } from '$engine/drawing/kits/foundry';
import { heartDrawing, inputFor } from './fixtures';

function pieceKit(id: PieceId) {
  const piece = GEN_KITS.flatMap((kit) => kit.pieces).find((kit) => kit.id === id);
  if (!piece) throw new Error(`Missing piece kit for ${id}`);
  return piece;
}

it('R8.1: bell and paper placement guards see the reserved start points', () => {
  const bell = pieceKit('foundry:bell');
  const blank = pieceKit('cartographers:blank');
  const outline = pieceKit('cartographers:outline');
  const startsSeen = {
    stamp: [] as number[],
    bell: [] as number[],
    blank: [] as number[],
    outline: [] as number[],
  };
  const stamp = bellsKit.stamp;
  const spies = [
    vi.spyOn(bellsKit, 'stamp').mockImplementation((layout, ...args) => {
      startsSeen.stamp.push(layout.starts.length);
      return stamp(layout, ...args);
    }),
  ];
  const pieceSpies = (
    [
      ['bell', bell],
      ['blank', blank],
      ['outline', outline],
    ] as const
  ).map(([id, kit]) => {
    const place = kit.place;
    return vi.spyOn(kit, 'place').mockImplementation((layout, seed) => {
      startsSeen[id].push(layout.starts.length);
      return place(layout, seed);
    });
  });
  try {
    for (const drawing of [
      { ...heartDrawing('carillonneur'), pieces: [bell.id] },
      { ...heartDrawing('registrar'), pieces: [blank.id, outline.id] },
    ]) {
      generateRoom({ ...inputFor(drawing, 1, 0), budget: 1 });
    }
    for (const [id, counts] of Object.entries(startsSeen)) {
      expect(counts.length, id).toBeGreaterThan(0);
      expect(Math.min(...counts), id).toBeGreaterThanOrEqual(4);
    }
  } finally {
    for (const spy of [...spies, ...pieceSpies]) spy.mockRestore();
  }
});
