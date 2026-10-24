import { ENEMIES } from '$data';
import { type Ctx, fizzled } from './ctx';
import { KIT } from './districts/kit';
import { type Coord, sameCoord } from './grid';
import { openJar } from './jars';
import * as marks from './marks';
import { stainMarks } from './mix';
import { findUnit, isAlive, tileAt, unitAt } from './queries';
import * as solvents from './solvents';
import type { Layer, Origin, Unit, UnitId } from './types';

/**
 * The arrival pipeline (foundations plan P1–P7): the contracts (FD-0) and the pipeline (FD-3).
 * Every mover calls `arrive`, `objectArrives` or `relocateAll`; nothing else sets a unit's `pos`
 * (tests/engine/arrival-pipeline.test.ts checks).
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
  | { kind: 'state'; state: Layer['id'] }
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

// ── The pipeline (FD-3) ─────────────────────────────────

/** Which tiles each core cause enters (P2). */
export const CORE_ENTERED: CoreEnteredTable = {
  walk: 'landing',
  push: 'each',
  slide: 'each',
  pull: 'each',
  hop: 'landing',
  swap: 'landing',
  drift: 'landing',
  draw: 'landing',
  return: 'landing',
  carry: 'landing',
};

/** The entered tiles of a cause: the core table, then the district kit's causes (DK-1). */
export function enteredTilesOf(cause: ArrivalCause): EnteredTiles {
  const core: Readonly<Record<string, EnteredTiles>> = CORE_ENTERED;
  const answers = Object.hasOwn(core, cause) ? core[cause] : KIT.causes[cause];
  if (!answers) throw new Error(`Arrival cause '${cause}' has no entered-tiles value`);
  return answers;
}

/** The one place exemption traits are read (P5), in `UnitTraitSet` order. */
export const unitTraits: UnitTraitsFn = (unit) => {
  if (unit.kind !== 'enemy') return [];
  const def = ENEMIES[unit.def];
  const out: UnitTrait[] = [];
  if (def.flies) out.push('flies');
  if (def.habitat === 'water') out.push('swims');
  if (def.anchored) out.push('anchored');
  return out;
};
export const hasTrait = (unit: Unit, trait: UnitTrait): boolean => unitTraits(unit).includes(trait);

/** The unit an arrival is about, if it is a living unit. */
function subjectUnit(ctx: Ctx, a: ArrivalAt): Unit | null {
  if (a.subject.kind !== 'unit') return null;
  const u = findUnit(ctx.s, a.subject.unit);
  return u && isAlive(u) ? u : null;
}

/** Runs `fn` on the arriving unit while it lives; the pipeline itself checks for interruption. */
const onUnit =
  (fn: (ctx: Ctx, u: Unit, a: ArrivalAt) => void) =>
  (ctx: Ctx, a: ArrivalAt): ArrivalOutcome => {
    const u = subjectUnit(ctx, a);
    if (u) fn(ctx, u, a);
    return 'go';
  };

/**
 * The core hooks in their fixed order (P3): Wax melts first, then marks spread and Bind *enters*
 * releases, then step-jars, then stains (landing only, not for drift or fliers), then the fire slot.
 */
export const CORE_ARRIVAL_HOOKS: ArrivalHookList = [
  {
    id: 'solvent',
    answers: 'each',
    subjects: ['unit'],
    run: onUnit((ctx, u, a) => solvents.onHook(ctx, { kind: 'entered', unit: u.id, at: a.at })),
  },
  {
    id: 'markSpread',
    answers: 'each',
    subjects: ['unit'],
    run: onUnit((ctx, u) => marks.spreadFrom(ctx, u)),
  },
  {
    id: 'bindEnters',
    answers: 'each',
    subjects: ['unit'],
    run: onUnit((ctx, u, a) => marks.onHook(ctx, { kind: 'entered', unit: u.id, at: a.at })),
  },
  {
    id: 'stepJar',
    answers: 'each',
    subjects: ['unit', 'object'],
    run(ctx, a) {
      if (tileAt(ctx.s, a.at).jar?.event !== 'step') return 'go';
      if (a.subject.kind === 'unit') {
        const u = subjectUnit(ctx, a);
        if (u) openJar(ctx, a.at, u.id);
      } else if (a.subject.object.kind === 'jar' && unitAt(ctx.s, a.at)) {
        openJar(ctx, a.at); // a step-jar arriving under a standing unit opens on it (P6)
      }
      return 'go';
    },
  },
  {
    id: 'stain',
    answers: 'landing',
    subjects: ['unit'],
    exceptCauses: ['drift'],
    exempt: ['flies'],
    run: onUnit((ctx, u) => stainMarks(ctx, u)),
  },
  // P8: fire burns at round end, not on arrival; the slot keeps the order for a later rule.
  { id: 'fire', answers: 'each', subjects: ['unit'], run: () => 'go' },
];

let composed: ArrivalHookList | null = null;

const isTrait = (t: string): t is UnitTrait => ['flies', 'swims', 'anchored'].includes(t);

/**
 * District pieces' arrival hooks (DK-4), in kit order, as `dk:<piece id>`: each answers only on a
 * tile holding its piece, and a unit with one of the piece's `exempt` traits skips it.
 */
function districtArrivalHooks(): ArrivalHookList {
  return Object.values(KIT.pieces).flatMap((p) => {
    const h = p.triggers.onArrive;
    if (!h) return [];
    const exempt = [...new Set([...(h.exempt ?? []), ...(p.exempt ?? []).filter(isTrait)])];
    const hook: ArrivalHook = {
      ...h,
      id: `dk:${p.id}`,
      ...(exempt.length ? { exempt } : {}),
      run: (ctx, a) => (tileAt(ctx.s, a.at).piece?.id === p.id ? h.run(ctx, a) : 'go'),
    };
    return [hook];
  });
}

/**
 * Every hook in run order (P3): core, then habits (AH's list goes between), then district pieces'
 * hooks in kit order. Composed once, on first use (district modules import the movers, so the kit
 * is not ready while this file loads); nothing registers at runtime.
 */
export function arrivalHooks(): ArrivalHookList {
  composed ??= [...CORE_ARRIVAL_HOOKS, ...districtArrivalHooks()];
  return composed;
}

function applies(h: ArrivalHook, a: ArrivalAt, traits: UnitTraits, cause: ArrivalCause): boolean {
  if (!h.subjects.includes(a.subject.kind)) return false;
  if (h.answers === 'landing' && !a.landing) return false;
  if (h.causes && !h.causes.includes(cause)) return false;
  if (h.exceptCauses?.includes(cause)) return false;
  return !h.exempt?.some((t) => traits.includes(t));
}

/** The tiles a cause reports to the hooks, each with whether it is the landing (P2). */
function reported(
  entered: readonly Coord[],
  opts: ArrivalOptions,
): { at: Coord; landing: boolean }[] {
  const last = entered.length - 1;
  const all = entered.map((at, i) => ({ at, landing: opts.landing && i === last }));
  if (enteredTilesOf(opts.cause) === 'each') return all;
  return all.slice(last).filter((t) => t.landing);
}

const stopped = (at: Coord, reason: InterruptReason): ArrivalResult => ({
  interrupted: true,
  at: { ...at },
  reason,
});

/**
 * Runs the hooks for a unit on each reported tile. With `place` the unit is set on each tile in
 * turn (straight onto the last when the cause enters only its landing); without, it already
 * stands where it arrived (`relocateAll`). Stops when a hook kills, moves or holds it (P4).
 */
function runUnit(
  ctx: Ctx,
  id: UnitId,
  entered: readonly Coord[],
  opts: ArrivalOptions,
  place: boolean,
): ArrivalResult {
  const u = findUnit(ctx.s, id);
  if (!u) throw new Error(`No unit ${id}`);
  const last = entered[entered.length - 1];
  if (!last) return { interrupted: false };
  const traits = unitTraits(u);
  if (traits.includes('anchored')) return stopped(u.pos, 'held'); // it never moves (P5)
  if (place && (!isAlive(u) || enteredTilesOf(opts.cause) === 'landing')) u.pos = { ...last };
  if (!isAlive(u)) return stopped(u.pos, 'died');
  for (const [index, t] of reported(entered, opts).entries()) {
    if (place) u.pos = { ...t.at };
    const a: ArrivalAt = {
      subject: { kind: 'unit', unit: id },
      at: { ...t.at },
      index,
      landing: t.landing,
      cause: opts.cause,
      origin: opts.origin,
    };
    for (const h of arrivalHooks()) {
      if (!applies(h, a, traits, opts.cause)) continue;
      const held = u.held;
      const out = h.run(ctx, a);
      if (!isAlive(u)) return stopped(u.pos, 'died');
      if (!sameCoord(u.pos, t.at)) return stopped(u.pos, 'moved');
      if (u.held > held || out === 'stop') return stopped(u.pos, 'held');
      if (fizzled(ctx)) return stopped(u.pos, 'cap');
    }
  }
  return { interrupted: false };
}

/**
 * A unit entered `entered` in order (P1): it is set on each tile its cause reports, and the hooks
 * answer there. The mover emits its relocation event first. A dead unit is only set down; an
 * anchored one never moves.
 */
export const arrive: ArriveFn = (ctx, unit, entered, opts) =>
  runUnit(ctx, unit, entered, opts, true);

/** A jar, state or piece arrived on `at` (P6); the mover has already put it there. */
export const objectArrives: ObjectArrivesFn = (ctx, object, at, opts) => {
  const a: ArrivalAt = {
    subject: { kind: 'object', object },
    at: { ...at },
    index: 0,
    landing: true,
    cause: opts.cause,
    origin: opts.origin,
  };
  for (const h of arrivalHooks()) {
    if (!applies(h, a, [], opts.cause)) continue;
    if (h.run(ctx, a) === 'stop') return stopped(at, 'held');
    if (fizzled(ctx)) return stopped(at, 'cap');
  }
  return { interrupted: false };
};

const isPlacement = (c: ArrivalCause | PlacementCause): c is PlacementCause =>
  c === 'restore' || c === 'spawn';

/**
 * A simultaneous move (P4): everyone is set down on `to`, then each arrives in `moves` order. A
 * unit an earlier arrival killed or moved does not arrive. Placement causes fire nothing (P2).
 */
export const relocateAll: RelocateAllFn = (ctx, moves, cause, origin) => {
  const units = moves.map((m) => {
    const u = findUnit(ctx.s, m.unit);
    if (!u) throw new Error(`No unit ${m.unit}`);
    u.pos = { ...m.to };
    return u;
  });
  if (isPlacement(cause)) return moves.map(() => ({ interrupted: false }));
  return moves.map((m, i) => {
    const u = units[i];
    if (!u || !isAlive(u)) return stopped(m.to, 'died');
    if (!sameCoord(u.pos, m.to)) return stopped(u.pos, 'moved');
    return runUnit(ctx, m.unit, m.path, { cause, origin, landing: true }, false);
  });
};
