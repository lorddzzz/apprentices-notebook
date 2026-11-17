// biome-ignore lint/style/noRestrictedImports: the term list is data, and `$data` does not re-export it
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { cloneData } from '../../clone';
import { KIT } from '../../districts/kit';
import type {
  Json,
  KitLootItem,
  PieceId,
  RuleId,
  ShapeInput,
  TripShapeDef,
} from '../../districts/types';
import { createRng, deriveSeed } from '../../rng';
import type { GenKit, RuleKit, ShapeKit } from '../types';
import { at, coords, isPlain, lay, needsOf, shuffled } from './seam';

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

/** The district's trip shape: its state reader, its hooks and its stakes, read when first used. */
const inkShape = (): TripShapeDef => {
  const shape = KIT.shapes[TERMS];
  if (!shape) throw new RangeError(`No kit for ${TERMS}`);
  return shape;
};

type TermRow = { id: string; signedAt: number; def: string; status: string };

/**
 * The termed card of room `input.room` (P15: one each room, none at the heart): a term of the
 * district's list that fits the room and was not signed before on this trip, or the first unsigned
 * term of an earlier room when the list has none for this deep a room. None while a term is open
 * (P5: at most one) and none at the heart (nothing would settle it). The drawn trip's offers
 * (EN-8) add this card beside the room's normal ones.
 */
export function termCardFor(input: ShapeInput<Json>): KitLootItem | null {
  if (input.room >= input.length - 1) return null;
  const parsed = inkShape().parseState(input.state) as { terms?: readonly TermRow[] };
  const terms = parsed.terms ?? [];
  if (terms.some((t) => t.status === 'open')) return null;
  const signed = new Set(terms.map((t) => t.def));
  const unsigned = INK_TERMS.filter((d) => !signed.has(d.id));
  const here = unsigned.filter((d) => d.rooms.includes(input.room));
  const earlier = unsigned.filter((d) => Math.max(...d.rooms) <= input.room);
  const pool = here.length > 0 ? here : earlier;
  const pick =
    pool[createRng(deriveSeed(input.trip.seed, 7300 + input.room)).int(0, pool.length - 1)];
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

/** The ink quarter: the writs and the terms (its foes and pieces have no kit yet). */
export const INK_KIT: GenKit = {
  district: 'inkQuarter',
  rules: [writsKit],
  pieces: [],
  foes: [],
  shapes: [termsKit],
  frames: [],
};
