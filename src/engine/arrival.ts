import type { StateId } from '$data';
import type { Ctx } from './ctx';
import type { Coord } from './grid';
import type { Origin, Unit, UnitId } from './types';

/**
 * The arrival pipeline's contracts (foundations plan P1–P7, FD-0). Types only: FD-3 builds
 * `arrive`, `objectArrives` and `relocateAll` against the signatures below.
 *
 * Arrival = a cause plus the tiles a subject *entered*, in order. Every way a unit or board object
 * comes to stand on a tile goes through it, so the same hooks and exemptions apply to all movers.
 */

// ── Causes ──────────────────────────────────────────────
/** Which entered tiles a cause reports to the hooks (P2). */
export type EnteredTiles = 'each' | 'landing';

/**
 * Every arrival cause and which tiles it enters (P2). Other plans add their own causes by module
 * augmentation from their own file, never by editing this one (P3):
 *
 *   declare module '$engine/arrival' { interface ArrivalCauses { cargo: 'landing' } }
 *
 * They then supply the runtime value in their own list (FD-3 composes the lists).
 */
export interface ArrivalCauses {
  walk: 'landing'; // members and foes walking: you pick your path
  push: 'each';
  slide: 'each'; // an oil slide after a push
  pull: 'each'; // AH
  hop: 'landing'; // AH: hopping over a jar does not open it
  swap: 'landing'; // the Swap rune, AH's basic Swap, a foe's swap
  drift: 'landing'; // the current, one tile a step
  draw: 'landing'; // the Draw rune moving a board object
  return: 'landing'; // IQ's return to sender
  carry: 'landing'; // BR's gargoyle carry
}
export type ArrivalCause = keyof ArrivalCauses;
/** The causes this file defines; a `Record` over them is the core entered-tiles table. */
export type CoreArrivalCause =
  | 'walk'
  | 'push'
  | 'slide'
  | 'pull'
  | 'hop'
  | 'swap'
  | 'drift'
  | 'draw'
  | 'return'
  | 'carry';
/** The core entered-tiles table FD-3 writes (P2); DK's own table covers its causes. */
export type CoreEnteredTable = { readonly [C in CoreArrivalCause]: ArrivalCauses[C] };

/**
 * Moves that are NOT arrivals (P2): Graphite's restore and spawns place units without firing
 * any hook. Named so playback and relocation events can still say why something moved.
 */
export type PlacementCause = 'restore' | 'spawn';

// ── Subjects and traits ─────────────────────────────────
/** Exemption traits read from a unit (P5). Other plans augment it like `ArrivalCauses`. */
export interface UnitTraitSet {
  flies: true; // skips ground hooks; still opens step-jars and spreads marks
  swims: true; // a normal arrival on water
  anchored: true; // never moves, so never enters the pipeline
}
export type UnitTrait = keyof UnitTraitSet;
/** A unit's traits, in a fixed order (deterministic iteration). */
export type UnitTraits = readonly UnitTrait[];
/** `unitTraits(unit)` (FD-3): the one place traits are read from the unit and its data. */
export type UnitTraitsFn = (unit: Unit) => UnitTraits;

/** Board objects that can arrive (P6). `piece` ids belong to DK's piece registry. */
export type ArrivingObject =
  | { kind: 'jar' }
  | { kind: 'state'; state: StateId }
  | { kind: 'piece'; piece: string };

export type ArrivalSubject =
  | { kind: 'unit'; unit: UnitId }
  | { kind: 'object'; object: ArrivingObject };
export type ArrivalSubjectKind = ArrivalSubject['kind'];

// ── Hooks ───────────────────────────────────────────────
/** One tile of one arrival, as a hook sees it. */
export interface ArrivalAt {
  subject: ArrivalSubject;
  at: Coord;
  /** Index into the entered tiles (0-based); the landing is the last. */
  index: number;
  /** True on the tile the subject comes to rest on. */
  landing: boolean;
  cause: ArrivalCause | PlacementCause;
  /** What moved it: the cast whose rune or board object did (null for a walk or a layout move). */
  origin: Origin | null;
}

/** A hook either lets the arrival go on or stops it: the unit died, was moved, or was held (P4). */
export type ArrivalOutcome = 'go' | 'stop';

/** The core hooks in their fixed order (P3); `fire` is the empty slot P8 keeps open. */
export type CoreArrivalHookId =
  | 'solvent'
  | 'markSpread'
  | 'bindEnters'
  | 'stepJar'
  | 'stain'
  | 'fire';
/** Registered hooks (habits, writs, terrain) use their owner's prefix: `habit:…`, `dk:…`. */
export type ArrivalHookId = CoreArrivalHookId | `${string}:${string}`;

/**
 * A data-like hook entry (P3). Lists are composed per owner (FD core, AH habits, DK terrain) in a
 * fixed order; nothing registers at runtime.
 */
export interface ArrivalHook {
  id: ArrivalHookId;
  /** Every entered tile, or only the landing (P1). */
  answers: EnteredTiles;
  subjects: readonly ArrivalSubjectKind[];
  /** Only these causes (absent = every cause). */
  causes?: readonly ArrivalCause[];
  /** Never these causes (the stain hook skips `drift`, city §5). */
  exceptCauses?: readonly ArrivalCause[];
  /** A unit with any of these traits skips the hook (fliers skip ground hooks, P5). */
  exempt?: readonly UnitTrait[];
  run: (ctx: Ctx, arrival: ArrivalAt) => ArrivalOutcome;
}
export type ArrivalHookList = readonly ArrivalHook[];

// ── Entry points (implemented by FD-3) ──────────────────
export interface ArrivalOptions {
  cause: ArrivalCause;
  origin: Origin | null;
  /** False when the subject passes through the last entered tile without stopping there. */
  landing: boolean;
}
export type InterruptReason = 'died' | 'moved' | 'held' | 'cap';
export type ArrivalResult =
  | { interrupted: false }
  | { interrupted: true; at: Coord; reason: InterruptReason };

/** `arrive(ctx, unit, entered, opts)`: a unit entered `entered` in order. */
export type ArriveFn = (
  ctx: Ctx,
  unit: UnitId,
  entered: readonly Coord[],
  opts: ArrivalOptions,
) => ArrivalResult;
/** `objectArrives(ctx, object, at, opts)`: a jar, state or piece arrived on `at` (P6). */
export type ObjectArrivesFn = (
  ctx: Ctx,
  object: ArrivingObject,
  at: Coord,
  opts: Omit<ArrivalOptions, 'landing'>,
) => ArrivalResult;

/** One leg of a simultaneous move: everyone is lifted, set down, then arrives in list order (P4). */
export interface Relocation {
  unit: UnitId;
  from: Coord;
  to: Coord;
  /** Tiles entered, `to` last (a one-tile move is `[to]`). */
  path: readonly Coord[];
}
/** `relocateAll(ctx, moves, cause, origin)`: per-move results, in `moves` order. */
export type RelocateAllFn = (
  ctx: Ctx,
  moves: readonly Relocation[],
  cause: ArrivalCause | PlacementCause,
  origin: Origin | null,
) => ArrivalResult[];
