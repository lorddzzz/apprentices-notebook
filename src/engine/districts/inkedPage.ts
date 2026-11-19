import type { EncounterDef, LootTableId } from '$data';
import { HEART_HEAT } from '$data/districts/bathhouses';
import { ROOM_PENCIL } from '$data/districts/cartographers/rooms';
import { DEFAULT_PENCIL } from '$data/districts/cartographers/types';
import { cloneData } from '../clone';
import { checkDrawing } from '../drawing/check';
import { HEART_FRAMES } from '../drawing/frames';
import { GEN_KITS } from '../drawing/kits';
import { termCardFor } from '../drawing/kits/inkQuarter';
import { drawnOffersFor } from '../drawing/loot';
import { drawingsOf, endingOf } from '../drawing/profile';
import { parseInkedState } from '../drawing/trip';
import type { InkedTripState } from '../drawing/types';
import { ownedBy } from '../trip/offers';
import type { Profile, Trip } from '../types';
import { BOIL_OVER_RULE_ID } from './bathhouses/types';
import { GUILD_HAND_RULE_ID } from './cartographers/types';
import { TUNE_RULE_ID } from './foundry/types';
import { KIT } from './kit';
import type { DistrictModule, Json, RoomSetup, RuleId, ShapeInput, TripShapeDef } from './types';

/**
 * The inked page (EN P1, P15, P16, P31, P33): the district every drawn trip runs in. A trip carries
 * a snapshot of the drawing it set out from (`InkedTripState`), so nothing in the trip reads
 * `profile.drawings` after Set out; the rooms are the accepted layouts stored in the state as the
 * generator makes them (`inkRoom`, outside `encounter`, which has no profile), and the trip's shape
 * is lent by the drawing's own `shape` id. `sandbox` marks the district for the guards that keep a
 * drawn trip from giving hearing, a heart, a key, a recruit, a rival page or lore (P16).
 */

export const INKED_PAGE = 'inkedPage' as const;
const TERMS = 'inkQuarter:terms';

/** The room's own fields; the offers come from `offersFor` (EN-8, `drawing/loot.ts`), which replaces these. */
const LOOT: LootTableId = 'deep';
const PICKS = { room: 1, heart: 2 } as const;

/** A room not inked yet reads as this fixed board; it is never played (`roomSetup` refuses it). */
const PLACEHOLDER = ['. . . . .', '. . r . .', '. . . . .', '. . . . .', 'P P P P .'].join('\n');

// ── The lent shape (P33) ────────────────────────────────

const PLAIN = 'seam:plain';

let lentShapes: ReadonlyMap<string, TripShapeDef> | null = null;
/** Every shape a drawing can borrow, by id: the kits' first, then the modules' (built on first use: the kit reads lazily). */
function lentTable(): ReadonlyMap<string, TripShapeDef> {
  lentShapes ??= new Map(GEN_KITS.flatMap((k) => k.shapes).map((s) => [s.id, s.shape]));
  return lentShapes;
}

/** The shape a drawing borrows: `'plain'` is the Seam's, the rest are lent by their district's kit or module. */
function lentShape(shape: string): TripShapeDef {
  const id = shape === 'plain' ? PLAIN : shape;
  const lent =
    lentTable().get(id) ?? (KIT.shapes as Readonly<Record<string, TripShapeDef | undefined>>)[id];
  if (!lent) throw new RangeError(`No kit for ${shape}`);
  return lent;
}

/** The trip as the lent shape reads it: `kit.state` is the lent state, not the nested one (P33). */
function lentTrip(trip: Trip, inner: Json): Trip {
  return trip.kit ? { ...trip, kit: { ...trip.kit, state: inner } } : trip;
}

/** Runs `run` on the lent view of a drawn trip and writes the view's kit state back into `inner`. */
function lend(trip: Trip, run: (view: Trip) => Trip): Trip {
  if (!trip.kit) return run(trip);
  const own = parseInkedState(trip.kit.state);
  const after = run(lentTrip(trip, lentShape(own.drawing.shape).parseState(own.inner)));
  return after.kit
    ? { ...after, kit: { ...after.kit, state: asJson({ ...own, inner: after.kit.state }) } }
    : after;
}

/** What the lent shape's hooks read: the trip's own view with the lent state and the drawing's length. */
function lentInput(
  input: ShapeInput<Json>,
  own: InkedTripState,
  lent: TripShapeDef,
): ShapeInput<Json> {
  const state = lent.parseState(own.inner);
  return {
    trip: lentTrip(input.trip, state),
    kit: { ...input.kit, state },
    state,
    room: input.room,
    length: own.drawing.length,
    ...(input.profile ? { profile: input.profile } : {}),
  };
}

/** The state as saved, parsed strictly once, and its lent shape with the hooks' input. */
function viewOf(input: ShapeInput<Json>): {
  own: InkedTripState;
  lent: TripShapeDef;
  lentIn: ShapeInput<Json>;
} {
  const own = parseInkedState(input.state);
  const lent = lentShape(own.drawing.shape);
  return { own, lent, lentIn: lentInput(input, own, lent) };
}

/** The pages the trip already carries (the fallback when the roll gives no household). */
const tripOwned = (t: Trip) => ({
  known: t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : [])),
  methods: t.loot.flatMap((i) => (i.kind === 'method' ? [i.method] : [])),
});

const asJson = (s: InkedTripState): Json => s as unknown as Json;

/**
 * P39: the config a master's rule gets in the district's own heart room (read, not copied, where a
 * constant exists): the tune's seed is the trip's, the baths run at their heart heat, the guild's
 * hand at the hall's last room's pencil. Rules with no config (the clock, the collapse) get none.
 */
function heartConfig(id: RuleId, trip: Trip): Json | undefined {
  if (id === TUNE_RULE_ID) return { seed: trip.seed };
  if (id === BOIL_OVER_RULE_ID) return { heat: HEART_HEAT };
  if (id === GUILD_HAND_RULE_ID) return { ...(ROOM_PENCIL.at(-1) ?? DEFAULT_PENCIL) };
  return undefined;
}

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
    // P39: the heart lists its master's rules on every shape, each at the district's heart config
    // unless the lent shape set its own.
    const heartRules =
      input.room === own.drawing.length - 1
        ? (HEART_FRAMES[own.drawing.heart]?.setup.rules ?? [])
        : [];
    const activate = [
      ...(own.drawing.rule === null ? [] : [own.drawing.rule]),
      ...(setup.activate ?? []),
      ...heartRules,
    ].filter((id, i, all) => all.indexOf(id) === i);
    const config: Record<RuleId, Json> = {};
    for (const id of heartRules) {
      const c = heartConfig(id, input.trip);
      if (c !== undefined) config[id] = c;
    }
    const rulesConfig = { ...config, ...setup.rulesConfig };
    return {
      ...setup,
      ...(activate.length > 0 ? { activate } : {}),
      ...(Object.keys(rulesConfig).length > 0 ? { rulesConfig } : {}),
    };
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
    const { own: state, lent, lentIn } = viewOf(input);
    const lentOwn = lent.offersFor?.(lentIn) ?? null;
    // EN-8: the drawn table, rolled from the snapshot. The shape lends its own cards (`extra`)
    // but not its table or picks. The household's pages (and the trip's) are not offered again;
    // a roll without the household offers by the trip's own.
    const owned = input.profile ? ownedBy(input.profile, input.trip) : tripOwned(input.trip);
    const own = drawnOffersFor(input.trip, input.room, owned, state.drawing);
    // P15: the terms shape's termed card, one each room but the heart, beside the room's own.
    const term = lent.id === TERMS ? termCardFor(lentIn) : null;
    const extra = [...(lentOwn?.extra ?? []), ...(term ? [term] : [])];
    return { ...own, ...(extra.length > 0 ? { extra } : {}) };
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
  lend,
  isOpen: inkedPageOpen,
  length: (t) => (t.kit ? parseInkedState(t.kit.state).drawing.length : 0),
  encounter: inkedRoom,
};
