// biome-ignore lint/style/noRestrictedImports: the tone and note tables are data, and `$data` does not re-export them
import { DEFAULT_HANG, type Note, TONES, type Tone } from '$data/districts/foundry';
import { COSTS } from '$data/drawing';
import { cloneData } from '../../clone';
// biome-ignore lint/style/noRestrictedImports: the peal's own hanging rule (P7) is read, not copied
import { alliedBellEdits, type HookTile } from '../../districts/foundry/peal';
import {
  BELL_PIECE,
  BELLS_RULE_ID,
  FOUNDRY_SHAPE,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  HOOK_PIECE,
  ROPE_PIECE,
  TUNE_RULE_ID,
  // biome-ignore lint/style/noRestrictedImports: the foundry's own ids and state reader
} from '../../districts/foundry/types';
import { KIT } from '../../districts/kit';
import type {
  BoardEdit,
  Json,
  RoomSetup,
  RuleId,
  ShapeInput,
  TripShapeDef,
} from '../../districts/types';
import type { Coord } from '../../grid';
import { type BoardSpec, parseBoard } from '../../notation';
import { blocksUnits } from '../../queries';
import { createRng, deriveSeed } from '../../rng';
import type { Tile } from '../../types';
import { parseInkedState } from '../trip';
import type { FoeKit, GenKit, PieceKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, lay, needsOf, shuffled } from './seam';

/**
 * The bell foundry's kit (EN-K6; P4, P14, P15, P33): the sympathetic-bells rule with the bells it
 * brings, the bell and rope pieces, the ringers' staff, and the peal lent to drawn trips. The
 * district is reached through `KIT` (the lint rule for engine files), read lazily: see the import
 * cycle noted in `generate.ts`. No district file is edited.
 */

export const BELLS: RuleId = BELLS_RULE_ID;
export const BELL = BELL_PIECE;
export const ROPE = ROPE_PIECE;
const PEAL = FOUNDRY_SHAPE;

const key = (c: Coord): string => `${c.x},${c.y}`;
const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const pieceAt = (layout: BoardSpec, c: Coord): string | undefined => at(layout, c)?.piece?.id;

/** A tile a walker can stand on: not blocked, not a drop (fog and water do not occur in the foundry). */
const standable = (t: Tile): boolean =>
  !blocksUnits(t) && !t.terrain.drop && t.terrain.water === null;

/** Tiles reachable on foot from the first start point, with `blocked` taken out. */
function reach(layout: BoardSpec, blocked: ReadonlySet<string>): Set<string> {
  const seen = new Set<string>();
  const first = layout.starts[0];
  if (!first) return seen;
  const queue: Coord[] = [first];
  seen.add(key(first));
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const d of NEIGHBOURS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      const t = at(layout, n);
      if (t === undefined || !standable(t) || blocked.has(key(n)) || seen.has(key(n))) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
}

/** Nothing the party could walk to is cut off by laying on `blocked` (those tiles themselves go). */
function keepsReach(layout: BoardSpec, blocked: ReadonlySet<string>): boolean {
  const before = reach(layout, new Set());
  const after = reach(layout, blocked);
  for (const k of before) if (!blocked.has(k) && !after.has(k)) return false;
  return true;
}

/** Tiles a stamp may take: plain, empty, and not on or beside a start point or a unit. */
const freeTiles = (layout: BoardSpec): Coord[] =>
  coords(layout).filter((c) => {
    const t = at(layout, c);
    return (
      t !== undefined &&
      isPlain(t) &&
      !layout.units.some((u) => manhattan(u.at, c) < 2) &&
      !layout.starts.some((p) => manhattan(p, c) < 2)
    );
  });

// ── The rule (P4) ───────────────────────────────────────

/**
 * The sympathetic bells' stamp (P4: the rule brings its bells): three or four bells on free tiles
 * above the bottom two rows (where the start points go), in two or three tones, so a strike on one
 * rings its tone. The minimum stamp is a low and a mid bell. No bell lands on or beside a unit or a
 * start point, or cuts the party's way off.
 */
export const bellsKit: RuleKit = {
  id: BELLS,
  needs: needsOf(BELLS),
  brings: [BELL] satisfies string[],
  stamp(layout, seed, minimum) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const free = shuffled(
      freeTiles(out).filter((c) => c.y < out.height - 2),
      rng,
    );
    const tones = shuffled([...TONES], rng);
    const count = minimum ? 2 : rng.int(3, 4);
    const blocked = new Set<string>();
    let laid = 0;
    for (const c of free) {
      if (laid >= count) break;
      const tone = tones[laid % (minimum ? 2 : TONES.length)];
      if (!tone) break;
      blocked.add(key(c));
      if (!keepsReach(layout, blocked)) {
        blocked.delete(key(c));
        continue;
      }
      lay(out, c, `{bell:${tone}}`);
      laid++;
    }
    return out;
  },
};

// ── The pieces (the two piece picks) ────────────────────

const countOf = (layout: BoardSpec, id: string): number =>
  coords(layout).filter((c) => pieceAt(layout, c) === id).length;

/** A bell of a tone already on the board (so a strike rings more than itself), else the seed's. */
function toneFor(layout: BoardSpec, rng: ReturnType<typeof createRng>): Tone {
  const here = coords(layout).flatMap((c) => {
    const p = at(layout, c)?.piece;
    return p?.id === BELL ? [(p.data as { tone: Tone }).tone] : [];
  });
  return here.length > 0 ? (here[rng.int(0, here.length - 1)] as Tone) : (TONES[0] as Tone);
}

/**
 * Every bell on the layout keeps the party's way open: with the bells taken off, laying them back
 * (they are solid) cuts nothing off. A layout is only ever compared with its own bare self.
 */
function holdsOpen(layout: BoardSpec): boolean {
  const bare = cloneData(layout);
  const bells = new Set<string>();
  for (const c of coords(bare)) {
    const tile = at(bare, c);
    if (tile?.piece?.id !== BELL) continue;
    tile.piece = null;
    bells.add(key(c));
  }
  return keepsReach(bare, bells);
}

const bellKit: PieceKit = {
  id: BELL,
  cost: COSTS.piece,
  needs: needsOf(BELL),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const spots = shuffled(
      freeTiles(out).filter((c) => c.y < out.height - 2),
      rng,
    );
    const tone = toneFor(out, rng);
    for (const c of spots) {
      lay(out, c, `{bell:${tone}}`);
      if (holdsOpen(out)) return out;
      lay(out, c, '.');
    }
    return null;
  },
  matters: (layout) => 1 + countOf(layout, BELL),
  valid: holdsOpen,
};

const ropeKit: PieceKit = {
  id: ROPE,
  cost: COSTS.piece,
  needs: needsOf(ROPE),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const spot = shuffled(
      freeTiles(out).filter((c) => c.y < out.height - 2),
      rng,
    )[0];
    if (!spot) return null;
    lay(out, spot, `{rope:${toneFor(out, rng)}}`);
    return out;
  },
  // A rope is for a Ringer to stand on: it matters once the bells are there to be pulled.
  matters: (layout) => countOf(layout, BELL) / 2,
  valid: () => true,
};

// ── The staff (plain foes) ──────────────────────────────

/**
 * The Ringer stands on a rope when the board has a free one (it rings that rope's tone), and
 * anywhere plain when it has none (off its rope it rings low).
 */
const ringerFoe = (): FoeKit => {
  const base = foeKit('ringer');
  return {
    ...base,
    valid(layout, c) {
      if (!base.valid(layout, c)) return false;
      const ropes = coords(layout).filter(
        (r) => pieceAt(layout, r) === ROPE && !layout.units.some((u) => manhattan(u.at, r) === 0),
      );
      return ropes.length === 0 || pieceAt(layout, c) === ROPE;
    },
  };
};

export const FOUNDRY_FOE_KITS: readonly FoeKit[] = [
  ringerFoe(),
  foeKit('detuner'),
  foeKit('clapper'),
];

// ── The peal (P15) ──────────────────────────────────────

/** The great bell of room `room` (0-based): one of the four notes, each lock's note in turn. */
export const noteOfRoom = (room: number): Note => ((room % 4) + 1) as Note;

/**
 * The lock stamps (P6): what a room lays around its great bell so that its lock can be opened.
 * Reach (1): the bell hangs across drops, out of any apprentice's walking reach. Match (2): a mid
 * bell stands in the room, so a mid ring includes the great bell. Unison (3): the bell stands
 * alone, two strikes in one round open it. Chord (4): three low bells make the ring the bell needs.
 */
export const LOCK_STAMPS: Readonly<Record<Note, { drops: boolean; bells: readonly Tone[] }>> = {
  1: { drops: true, bells: [] },
  2: { drops: false, bells: ['mid'] },
  3: { drops: false, bells: [] },
  4: { drops: false, bells: ['low', 'low', 'low'] },
};

/**
 * The great bell of `note` and its lock's stamp laid on a drawn room's layout, as board edits (a
 * room set up cannot read the board, so the shape lays them when the room begins). Every tile is
 * plain, empty and two tiles from every start point and unit, and the party's way through the room
 * stays open. No edits when the room has no such place.
 */
export function lockEdits(layout: BoardSpec, note: Note, seed: number): BoardEdit[] {
  const rng = createRng(seed);
  const stamp = LOCK_STAMPS[note];
  const free = shuffled(freeTiles(layout), rng);
  const blocked = new Set<string>();
  const takes = (c: Coord): boolean => {
    blocked.add(key(c));
    if (keepsReach(layout, blocked)) return true;
    blocked.delete(key(c));
    return false;
  };
  const home = free.find((c) => takes(c));
  if (!home) return [];
  const edits: BoardEdit[] = [
    {
      at: { ...home },
      piece: {
        id: GREAT_BELL_PIECE,
        data: { note, hang: DEFAULT_HANG[note], allied: false, rung: false },
      },
    },
  ];
  const used = new Set<string>([key(home)]);
  if (stamp.drops) {
    for (const d of NEIGHBOURS) {
      const c = { x: home.x + d.x, y: home.y + d.y };
      if (!free.some((f) => key(f) === key(c)) || !takes(c)) continue;
      used.add(key(c));
      edits.push({ at: c, terrain: { drop: true } });
    }
  }
  for (const tone of stamp.bells) {
    const c = free.find((f) => !used.has(key(f)) && takes(f));
    if (!c) continue;
    used.add(key(c));
    edits.push({ at: { ...c }, piece: { id: BELL, data: { tone } } });
  }
  return edits;
}

/** `edits` laid on a copy of `layout` (the same writes a room set up makes on a battle's tiles). */
function withEdits(layout: BoardSpec, edits: readonly BoardEdit[]): BoardSpec {
  const out = cloneData(layout);
  for (const e of edits) {
    const tile = at(out, e.at);
    if (!tile) continue;
    if ('piece' in e) tile.piece = e.piece && cloneData(e.piece);
    else tile.terrain = { ...tile.terrain, ...e.terrain };
  }
  return out;
}

/** The district's peal shape, read when first used (the cycle noted in `generate.ts`). */
const pealShape = (): TripShapeDef => {
  const shape = KIT.shapes[PEAL];
  if (!shape) throw new RangeError(`No kit for ${PEAL}`);
  return shape;
};

/** The layout stored for room `room` of the drawn trip a hook is asked about, if there is one. */
function storedLayout(input: Pick<ShapeInput<Json>, 'kit' | 'room'>): BoardSpec | null {
  try {
    const text = parseInkedState(input.kit.state).rooms[input.room];
    return text ? parseBoard(text) : null;
  } catch {
    return null;
  }
}

/** The `{hook}` tiles of a heart layout, in reading order, each bare (note 0) or naming its note. */
export function hooksOf(layout: BoardSpec): HookTile[] {
  return coords(layout).flatMap((c) => {
    const p = at(layout, c)?.piece;
    return p?.id === HOOK_PIECE ? [{ at: c, note: (p.data as { note: number }).note }] : [];
  });
}

/**
 * The peal at any length (P15): every room before the heart carries a great bell of its own note
 * (`lockEdits`, laid at generation by `pealKit.stamp`, P40), and the heart hangs an allied great bell on its hooks for each note that was rung
 * in its room (`alliedBellEdits`, the district's own rule) and lists the tune. A bell is never
 * hung for a room that did not ring it; a room not won leaves no note in the state.
 */
export function pealSetup(input: ShapeInput<FoundryTripState>): RoomSetup {
  const layout = storedLayout(input);
  if (input.room < input.length - 1) {
    // P40: a room is stored with its great bell (`pealKit.stamp`); only a trip inked before that
    // still lays the lock when the room begins.
    const stamped =
      layout !== null && coords(layout).some((c) => pieceAt(layout, c) === GREAT_BELL_PIECE);
    const seed = deriveSeed(input.trip.seed, 7400 + input.room);
    const boardEdits = layout && !stamped ? lockEdits(layout, noteOfRoom(input.room), seed) : [];
    return boardEdits.length > 0 ? { boardEdits } : {};
  }
  const boardEdits = layout ? alliedBellEdits(input.state, hooksOf(layout)) : [];
  return {
    ...(boardEdits.length > 0 ? { boardEdits } : {}),
    activate: [TUNE_RULE_ID],
    rulesConfig: { [TUNE_RULE_ID]: { seed: input.trip.seed } },
  };
}

/**
 * The peal, lent at every length a drawing takes. The district's own shape reads its home rooms'
 * variants and tables; this one keeps its state and its settling after a room (a rung great bell
 * joins the peal) and sets the rooms up itself.
 */
export const pealKit: ShapeKit = {
  id: PEAL,
  needs: needsOf(PEAL),
  lengths: [3, 4, 5, 6],
  stamp: (layout, room, _length, seed) =>
    withEdits(layout, lockEdits(layout, noteOfRoom(room), seed)),
  get shape(): TripShapeDef {
    const home = pealShape();
    return {
      id: home.id,
      parseState: home.parseState,
      initState: home.initState,
      ...(home.afterRoom ? { afterRoom: home.afterRoom } : {}),
      roomSetup: (input) => pealSetup(input as ShapeInput<FoundryTripState>),
    };
  },
};

/** The foundry: sympathetic bells with their bells, the bell and rope, the ringers' staff and the peal. */
export const FOUNDRY_KIT: GenKit = {
  district: 'foundry',
  rules: [bellsKit],
  pieces: [bellKit, ropeKit],
  foes: FOUNDRY_FOE_KITS,
  shapes: [pealKit],
  frames: [],
};
