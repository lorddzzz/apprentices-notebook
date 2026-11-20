// biome-ignore lint/style/noRestrictedImports: the term list is data, and `$data` does not re-export it
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { COSTS } from '$data/drawing';
import { cloneData } from '../../clone';
import { inkTermFor } from '../../districts/api';
import { KIT } from '../../districts/kit';
import type {
  Json,
  KitLootItem,
  PieceId,
  RuleId,
  ShapeInput,
  TripShapeDef,
} from '../../districts/types';
import type { BoardSpec } from '../../notation';
import { createRng, deriveSeed } from '../../rng';
import type { GenKit, PieceKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, lay, needsOf, shuffled } from './seam';

/**
 * The ink quarter's kit (EN-K3; P4, P14, P15, P33): the writs rule with the two stamps it brings,
 * and the terms shape lent to drawn trips. The district is reached through `KIT` (the lint rule
 * for engine files), read lazily: see the import cycle noted in `generate.ts`. No district file
 * is edited.
 */

export const WRITS: RuleId = 'inkQuarter:writs';
const TERMS = 'inkQuarter:terms';
const TERMED = 'inkQuarter:termed';

/**
 * The writs' stamp (P4: the rule brings its activating pieces): one return and one or two standing
 * orders on plain tiles above the bottom two rows, where the start points go. The minimum stamp is
 * one return and one order.
 */
export const writsKit: RuleKit = {
  id: WRITS,
  needs: needsOf(WRITS),
  brings: ['inkQuarter:return', 'inkQuarter:order'] satisfies PieceId[],
  stamp(layout, seed, minimum) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const free = shuffled(
      coords(out).filter((c) => {
        const t = at(out, c);
        return t !== undefined && isPlain(t) && c.y < out.height - 2;
      }),
      rng,
    );
    const orders = minimum ? 1 : rng.int(1, 2);
    const stamps = ['{return}', ...Array.from({ length: orders }, () => '{order}')];
    stamps.forEach((token, i) => {
      const c = free[i];
      if (c) lay(out, c, token);
    });
    return out;
  },
};

const stampTiles = (layout: BoardSpec) =>
  coords(layout).filter((c) => {
    const tile = at(layout, c);
    return (
      tile !== undefined &&
      isPlain(tile) &&
      c.y < layout.height - 2 &&
      !layout.starts.some((p) => p.x === c.x && p.y === c.y)
    );
  });

const stampKit = (name: 'return' | 'order'): PieceKit => ({
  id: `inkQuarter:${name}`,
  cost: COSTS.piece,
  needs: [],
  place(layout, seed) {
    const c = shuffled(stampTiles(layout), createRng(seed))[0];
    if (!c) return null;
    const out = cloneData(layout);
    lay(out, c, `{${name}}`);
    return out;
  },
  matters: (layout) => layout.tiles.filter((t) => t.piece?.id === `inkQuarter:${name}`).length,
  valid: () => true,
});

const pairOf = (piece: BoardSpec['tiles'][number]['piece']): string | undefined => {
  const data = piece?.data as { pair?: string } | null | undefined;
  return data?.pair;
};

const forwardKit: PieceKit = {
  id: 'inkQuarter:forward',
  cost: COSTS.piece,
  needs: [],
  place(layout, seed) {
    const used = new Set(
      layout.tiles.flatMap((t) => {
        if (t.piece?.id !== 'inkQuarter:forward' && t.piece?.id !== 'inkQuarter:address') return [];
        const pair = pairOf(t.piece);
        return pair === undefined ? [] : [pair];
      }),
    );
    const letter = [...'abcdefghijklmnopqrstuvwxyz'].find((x) => !used.has(x));
    const free = shuffled(stampTiles(layout), createRng(seed));
    const first = free.find((a) => free.some((b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1));
    const second = first && free.find((b) => Math.abs(first.x - b.x) + Math.abs(first.y - b.y) > 1);
    if (!letter || !first || !second) return null;
    const out = cloneData(layout);
    lay(out, first, `{forward:${letter}}`);
    lay(out, second, `{address:${letter}}`);
    return out;
  },
  matters: (layout) => layout.tiles.filter((t) => t.piece?.id === 'inkQuarter:forward').length,
  valid(layout) {
    const addresses = new Set(
      layout.tiles.filter((t) => t.piece?.id === 'inkQuarter:address').map((t) => pairOf(t.piece)),
    );
    return layout.tiles
      .filter((t) => t.piece?.id === 'inkQuarter:forward')
      .every((t) => pairOf(t.piece) !== undefined && addresses.has(pairOf(t.piece)));
  },
};

/** The district's trip shape: its state reader, its hooks and its stakes, read when first used. */
const inkShape = (): TripShapeDef => {
  const shape = KIT.shapes[TERMS];
  if (!shape) throw new RangeError(`No kit for ${TERMS}`);
  return shape;
};

/**
 * The termed card of a drawn room (P15). When no eligible term fits this room, roll among the
 * earlier terms. The heart has no card because there is no next room to settle it.
 */
export function termCardFor(input: ShapeInput<Json>): KitLootItem | null {
  const { room, length, trip } = input;
  if (room >= length - 1) return null;
  const seed = deriveSeed(trip.seed, 7300 + room);
  const here = INK_TERMS.filter((term) => term.rooms.includes(room));
  const earlier = INK_TERMS.filter((term) => Math.max(...term.rooms) < room);
  const pick = inkTermFor(input, here, seed) ?? inkTermFor(input, earlier, seed);
  return pick ? { kind: TERMED, data: { def: pick.id } } : null;
}

/**
 * The terms (P15): signed in one room, settled by the next, at every length a drawing takes. The
 * quarter's own shape reads no room table (its hooks work from the trip's state and the room's
 * index), so it is lent as it is.
 */
export const termsKit: ShapeKit = {
  id: TERMS,
  needs: needsOf(TERMS),
  lengths: [3, 4, 5, 6],
  get shape(): TripShapeDef {
    return inkShape();
  },
};

/** The ink quarter: writs, stamps, foes and terms. */
export const INK_KIT: GenKit = {
  district: 'inkQuarter',
  rules: [writsKit],
  pieces: [stampKit('return'), stampKit('order'), forwardKit],
  foes: (['deadLetter', 'sorter', 'sealer'] as const).map(foeKit),
  shapes: [termsKit],
  frames: [],
};
