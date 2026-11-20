// biome-ignore lint/style/noRestrictedImports: the pencil config is data, and `$data` does not re-export it
import { DEFAULT_PENCIL } from '$data/districts/cartographers/types';
import { COSTS } from '$data/drawing';
import { cloneData } from '../../clone';
import {
  BLANK_PIECE,
  GUILD_HAND_RULE_ID,
  OUTLINE_PIECE,
  PENCIL_PIECE,
  PENCIL_RULE_ID,
  // biome-ignore lint/style/noRestrictedImports: the hall's own ids (cycle-free by its own note)
} from '../../districts/cartographers/types';
import { KIT } from '../../districts/kit';
import type {
  CrossroadsChoice,
  RoomSetup,
  RuleId,
  ShapeInput,
  TripShapeDef,
} from '../../districts/types';
import type { Coord } from '../../grid';
import type { BoardSpec } from '../../notation';
import { blocksUnits } from '../../queries';
import { createRng } from '../../rng';
import type { Tile } from '../../types';
import type { FoeKit, GenKit, PieceKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, lay, needsOf, shuffled } from './seam';

/**
 * The Cartographers' hall's kit (EN-K7; P4, P14, P15, P33): pencil and ink as a drawn rule with
 * the pencil it brings, the paper pieces (pencil, blank paper, outlines), the guild's hands as
 * plain foes, and the doorway lent to drawn trips. The district is reached through `KIT`, read
 * lazily: see the import cycle noted in `generate.ts`. No district file is edited.
 */

export const PENCIL: RuleId = PENCIL_RULE_ID;
const DOORWAY = 'cartographers:doorway';

const key = (c: Coord): string => `${c.x},${c.y}`;
const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const pieceAt = (layout: BoardSpec, c: Coord): string | undefined => at(layout, c)?.piece?.id;
const standable = (t: Tile): boolean =>
  !blocksUnits(t) && !t.terrain.drop && t.terrain.water === null;

/** Tiles reachable on foot from the first start point. */
function reach(layout: BoardSpec): Set<string> {
  const seen = new Set<string>();
  const first = layout.starts[0];
  if (!first) return seen;
  const queue: Coord[] = [first];
  seen.add(key(first));
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const d of NEIGHBOURS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      const t = at(layout, n);
      if (t === undefined || !standable(t) || seen.has(key(n))) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
}

/** Paper that stands up (blank paper, an outline) leaves every start point and foe reachable. */
function holdsOpen(layout: BoardSpec): boolean {
  const seen = reach(layout);
  return (
    layout.starts.every((p) => seen.has(key(p))) &&
    layout.units.every((u) => seen.has(key(u.at)) || at(layout, u.at)?.piece?.id === PENCIL_PIECE)
  );
}

const countOf = (layout: BoardSpec, id: string): number =>
  coords(layout).filter((c) => pieceAt(layout, c) === id).length;

/** A free plain tile above the bottom two rows. */
const freeAbove = (layout: BoardSpec): Coord[] =>
  coords(layout).filter((c) => {
    const t = at(layout, c);
    return (
      t !== undefined &&
      isPlain(t) &&
      c.y < layout.height - 2 &&
      !layout.units.some((u) => manhattan(u.at, c) === 0) &&
      !layout.starts.some((p) => manhattan(p, c) === 0)
    );
  });

// ── The rule (P4) ───────────────────────────────────────

/** The share of the tiles above the bottom two rows the stamp pencils (the hall's heart scatters 0.4). */
const PENCIL_SHARE = { fuller: 0.35, usual: 0.3, minimum: 0.2 } as const;

/**
 * Pencil and ink's stamp (P4: the rule brings its pencil tiles): about three in ten of the tiles
 * above the bottom two rows are pencil, standable paper the guild's hand inks or rubs out (the
 * doorway lists the hand; elsewhere it is paper). The minimum stamp is two in ten.
 */
export const pencilKit: RuleKit = {
  id: PENCIL,
  needs: needsOf(PENCIL),
  brings: [PENCIL_PIECE] satisfies string[],
  stamp(layout, seed, minimum, fuller = false) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const free = shuffled(freeAbove(out), rng);
    const share = minimum
      ? PENCIL_SHARE.minimum
      : fuller
        ? PENCIL_SHARE.fuller
        : PENCIL_SHARE.usual;
    for (const c of free.slice(0, Math.max(2, Math.round(free.length * share)))) {
      lay(out, c, '{pencil}');
    }
    return out;
  },
};

// ── The pieces (the two piece picks) ────────────────────

/** Extra pencil, beside the pencil already laid when there is some. */
const pencilPiece: PieceKit = {
  id: PENCIL_PIECE,
  cost: COSTS.piece,
  needs: needsOf(PENCIL_PIECE),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const free = shuffled(freeAbove(out), rng);
    const beside = free.filter((c) =>
      NEIGHBOURS.some((d) => pieceAt(out, { x: c.x + d.x, y: c.y + d.y }) === PENCIL_PIECE),
    );
    const c = beside[0] ?? free[0];
    if (!c) return null;
    lay(out, c, '{pencil}');
    return out;
  },
  matters: (layout) => 1 + countOf(layout, PENCIL_PIECE) / 4,
  valid: () => true,
};

/** Blank paper, on the board's edge so it cuts no room in two; the party keeps its way. */
const blankPiece: PieceKit = {
  id: BLANK_PIECE,
  cost: COSTS.piece,
  needs: needsOf(BLANK_PIECE),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const edge = shuffled(
      freeAbove(out).filter((c) => c.x === 0 || c.x === out.width - 1 || c.y === 0),
      rng,
    );
    for (const c of edge) {
      lay(out, c, '{blank}');
      if (holdsOpen(out)) return out;
      lay(out, c, '.');
    }
    return null;
  },
  matters: (layout) => 0.5 + countOf(layout, PENCIL_PIECE) / 4,
  valid: holdsOpen,
};

/** The foes an outline may carry: the guild's hands, in the order a seed picks from. */
const OUTLINE_FOES = ['surveyor', 'eraser', 'tracer'] as const;

/** An outline of one of the guild's hands, the foe the seed names; it stands in the party's way. */
const outlinePiece: PieceKit = {
  id: OUTLINE_PIECE,
  cost: COSTS.piece,
  needs: needsOf(OUTLINE_PIECE),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const foe = OUTLINE_FOES[rng.int(0, OUTLINE_FOES.length - 1)];
    const spots = shuffled(
      freeAbove(out).filter((c) => !out.starts.some((p) => manhattan(p, c) < 3)),
      rng,
    );
    for (const c of spots) {
      lay(out, c, `{outline:${foe}}`);
      if (holdsOpen(out)) return out;
      lay(out, c, '.');
    }
    return null;
  },
  matters: (layout) => 0.25 + countOf(layout, PENCIL_PIECE) / 8,
  valid: holdsOpen,
};

// ── The guild's hands (plain foes) ──────────────────────

/** The guild's hands by their own data (the Registrar is the frame's, his Tracer is his own escort). */
export const HALL_FOE_KITS: readonly FoeKit[] = (['surveyor', 'eraser', 'tracer'] as const).map(
  foeKit,
);

// ── The doorway (P15) ───────────────────────────────────

/** Rooms 1 to `freeThrough(length)` (1-based) let the party home; later rooms do not, the heart always does. */
export const freeThrough = (length: number): number => Math.ceil(length / 2);

/**
 * Whether the party may go home from the Crossroads after room `room` (0-based): free through room
 * ⌈length / 2⌉, none after it, the heart always (nothing blocks there, a cleared trip has
 * nowhere else to go).
 */
export const mayReturn = (room: number, length: number): boolean =>
  room >= length - 1 || room < freeThrough(length);

const DOORWAY_WAY: CrossroadsChoice = {
  id: 'doorway',
  label: 'Through the doorway',
  kind: 'push',
  warn: 'After this room: no way home until the heart.',
};

/** The district's doorway shape, read when first used (the cycle noted in `generate.ts`). */
const doorwayShape = (): TripShapeDef => {
  const shape = KIT.shapes[DOORWAY];
  if (!shape) throw new RangeError(`No kit for ${DOORWAY}`);
  return shape;
};

/** The way past the last room that lets the party home, none when no room lies past it but the heart's. */
export const doorwayChoices = (input: Pick<ShapeInput<null>, 'room' | 'length'>) =>
  input.room === freeThrough(input.length) - 1 && input.room < input.length - 1
    ? [DOORWAY_WAY]
    : [];

/**
 * The doorway at any length: free return through room ⌈length / 2⌉, none after it, the heart always
 * a return point, and no checkpoint (a generated trip remembers no room). Every room lists the
 * guild's hand at the hall's default pencil config (the hall's per-room table is not used).
 */
export const doorwaySetup = (): RoomSetup => ({
  activate: [GUILD_HAND_RULE_ID],
  rulesConfig: { [GUILD_HAND_RULE_ID]: { ...DEFAULT_PENCIL } },
});

export const doorwayKit: ShapeKit = {
  id: DOORWAY,
  needs: needsOf(DOORWAY),
  lengths: [3, 4, 5, 6],
  get shape(): TripShapeDef {
    const home = doorwayShape();
    return {
      id: home.id,
      parseState: home.parseState,
      initState: home.initState,
      choices: (input) => doorwayChoices(input),
      returnBlocks: (input) =>
        mayReturn(input.room, input.length)
          ? []
          : [{ why: 'The doorway is behind you: no way home until the heart.' }],
      roomSetup: () => doorwaySetup(),
    };
  },
};

/** The Cartographers' hall: pencil and ink, the paper, the guild's hands and the doorway. */
export const CARTOGRAPHERS_KIT: GenKit = {
  district: 'cartographers',
  rules: [pencilKit],
  pieces: [pencilPiece, blankPiece, outlinePiece],
  foes: HALL_FOE_KITS,
  shapes: [doorwayKit],
  frames: [],
};
