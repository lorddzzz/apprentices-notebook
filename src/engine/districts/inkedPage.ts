import type { EncounterDef, LootTableId } from '$data';
import { cloneData } from '../clone';
import { checkDrawing } from '../drawing/check';
import { GEN_KITS } from '../drawing/kits';
import { drawingsOf, endingOf } from '../drawing/profile';
import { parseInkedState } from '../drawing/trip';
import type { InkedTripState } from '../drawing/types';
import type { Profile, Trip } from '../types';
import { KIT } from './kit';
import type { DistrictModule, Json, RoomSetup, ShapeInput, TripShapeDef } from './types';

/**
 * The inked page (EN P1, P15, P16, P31, P33): the district every drawn trip runs in. A trip carries
 * a snapshot of the drawing it set out from (`InkedTripState`), so nothing in the trip reads
 * `profile.drawings` after Set out; the rooms are the accepted layouts stored in the state as the
 * generator makes them (`inkRoom`, outside `encounter`, which has no profile), and the trip's shape
 * is lent by the drawing's own `shape` id. `sandbox` marks the district for the guards that keep a
 * drawn trip from giving hearing, a heart, a key, a recruit, a rival page or lore (P16).
 */

export const INKED_PAGE = 'inkedPage' as const;

/** Loot until EN-8 (offers by depth): the Seam's deepest table, one pick, the heart two. */
const LOOT: LootTableId = 'deep';
const PICKS = { room: 1, heart: 2 } as const;

/** A room not inked yet reads as this fixed board; it is never played (`roomSetup` refuses it). */
const PLACEHOLDER = ['. . . . .', '. . r . .', '. . . . .', '. . . . .', 'P P P P .'].join('\n');

// ── The lent shape (P33) ────────────────────────────────

/** The shape a drawing borrows: `'plain'` is the Seam's, the rest are lent by their district's kit or module. */
function lentShape(shape: string): TripShapeDef {
  const id = shape === 'plain' ? 'seam:plain' : shape;
  const lent =
    GEN_KITS.flatMap((k) => k.shapes).find((s) => s.id === id)?.shape ??
    Object.values(KIT.modules)
      .flatMap((m) => m?.shapes ?? [])
      .find((s) => s.id === id);
  if (!lent) throw new RangeError(`No kit for ${shape}`);
  return lent;
}

/** What the lent shape's hooks read: the trip's own view with the lent state and the drawing's length. */
function lentInput(
  input: ShapeInput<Json>,
  own: InkedTripState,
  lent: TripShapeDef,
): ShapeInput<Json> {
  return {
    trip: input.trip,
    kit: input.kit,
    state: lent.parseState(own.inner),
    room: input.room,
    length: own.drawing.length,
  };
}

/** The state as saved, parsed strictly, and its lent shape with the hooks' input. */
function viewOf(input: ShapeInput<Json>): {
  own: InkedTripState;
  lent: TripShapeDef;
  lentIn: ShapeInput<Json>;
} {
  const own = parseInkedState(input.state);
  const lent = lentShape(own.drawing.shape);
  return { own, lent, lentIn: lentInput(input, own, lent) };
}

const asJson = (s: InkedTripState): Json => s as unknown as Json;

/** The drawn trip's shape (P1, P15): the snapshot, the stored rooms and the lent shape's hooks. */
export const INKED_TRIP: TripShapeDef = {
  id: 'inkedPage:page',
  parseState: (raw) => asJson(parseInkedState(raw)),
  initState(p?: Profile, opts?: { page?: number }) {
    const slot = opts?.page;
    if (p === undefined || (slot !== 0 && slot !== 1 && slot !== 2)) {
      throw new Error('A drawn trip is set out from one of the three pages');
    }
    const page = drawingsOf(p)[slot] ?? null;
    if (page === null) throw new Error(`Page ${slot + 1} is empty`);
    const first = checkDrawing(p, page)[0];
    if (first) throw new Error(first.reason);
    const drawing = cloneData(page);
    const lent = lentShape(drawing.shape);
    const rooms: (string | null)[] = Array.from({ length: drawing.length }, () => null);
    return asJson({ slot, drawing, rooms, inner: lent.initState(p, opts) });
  },
  roomSetup(input): RoomSetup {
    const { own, lent, lentIn } = viewOf(input);
    if (own.rooms[input.room] == null) throw new Error(`Room ${input.room} is not inked`);
    const setup = lent.roomSetup?.(lentIn) ?? {};
    const activate = [
      ...(own.drawing.rule === null ? [] : [own.drawing.rule]),
      ...(setup.activate ?? []),
    ].filter((id, i, all) => all.indexOf(id) === i);
    return { ...setup, ...(activate.length > 0 ? { activate } : {}) };
  },
  returnBlocks(input) {
    const { lent, lentIn } = viewOf(input);
    return lent.returnBlocks?.(lentIn) ?? [];
  },
  choices(input) {
    const { lent, lentIn } = viewOf(input);
    return lent.choices?.(lentIn) ?? [];
  },
  afterRoom(input, log, won) {
    const { own, lent, lentIn } = viewOf(input);
    if (!lent.afterRoom) return input.state;
    return asJson({ ...own, inner: lent.afterRoom(lentIn, log, won) });
  },
  lootAfterRoom(input) {
    const { lent, lentIn } = viewOf(input);
    return lent.lootAfterRoom?.(lentIn) ?? input.trip.loot;
  },
  offersFor(input) {
    const { lent, lentIn } = viewOf(input);
    return lent.offersFor?.(lentIn) ?? null;
  },
};

// ── The rooms (P31) ─────────────────────────────────────

/** Room `i` of a drawn trip: pure and cheap, never runs the bot; the stored layout or a placeholder. */
export function inkedRoom(t: Trip, i: number): EncounterDef {
  const { slot, drawing, rooms } = parseInkedState(t.kit?.state);
  const heart = i === drawing.length - 1;
  const title = heart ? `${drawing.name}: the heart` : `${drawing.name}, room ${i + 1}`;
  const layout = rooms[i] ?? PLACEHOLDER;
  return {
    id: `${INKED_PAGE}:${slot}:${i}`,
    title,
    depth: i + 1,
    layout,
    variants: [{ name: title, layout }],
    loot: LOOT,
    picks: heart ? PICKS.heart : PICKS.room,
    heart,
  };
}

/** The drawn page opens at the handover once a page is drawn; each trip then fixes its own snapshot. */
export const inkedPageOpen = (p: Profile): boolean =>
  endingOf(p).handover && drawingsOf(p).some((d) => d !== null);

export const INKED_PAGE_MODULE: DistrictModule = {
  id: INKED_PAGE,
  sandbox: true,
  trip: INKED_TRIP,
  isOpen: inkedPageOpen,
  length: (t) => (t.kit ? parseInkedState(t.kit.state).drawing.length : 0),
  encounter: inkedRoom,
};
