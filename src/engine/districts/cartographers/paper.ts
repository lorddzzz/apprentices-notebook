import { ENEMIES } from '$data';
import { relocateAll } from '../../arrival';
import { type Ctx, emit, ref, withLine } from '../../ctx';
import { makeEnemy } from '../../foes';
import { hasFootnote } from '../../footnotes';
import { type Coord, neighbors4, sameCoord } from '../../grid';
import { removeFromRoom } from '../../outOfRoom';
import { pieceVoid } from '../../pieces';
import { blocksUnits, coordOf, inBoard, isAlive, tileAt, unitAt } from '../../queries';
import type { BattleState } from '../../types';
import type { Json, StruckBy, TilePiece } from '../types';
import {
  BLANK_PIECE,
  type DrawnInEvent,
  OUTLINE_PIECE,
  type OutlineData,
  PENCIL_PIECE,
  type UndrawnEvent,
} from './types';

/**
 * Board runes on paper and the outlines that ink in (cartographers-plan P5, P6; CG-3, CG-4).
 *
 * - Erase on pencil un-draws the tile at once: it turns blank, what it held is gone, whoever
 *   stood there is erased from the room (a minion is gone, an elite takes the drop damage and
 *   loses its action). Erase on an outline un-draws the foe: the tile stays pencil, unplanned.
 *   Inked paper has no piece, so an Erase there is the core Erase and nothing more.
 * - Quicksilver's mirrored Erase arrives under `quicksilver:edge` (it is the added target) and
 *   un-draws a mirrored pencil under `quicksilver:drop`.
 * - An outline whose `due` is this round inks in at round end: the foe is spawned on the tile and
 *   the piece goes. A unit standing on it delays it one round.
 */

const QUICKSILVER_ADDED = 'quicksilver:edge';

/**
 * `swap-unit-carry`: the two tiles of a Swap exchange their pencil, fate and all, so each unit
 * takes the pencil it stood on. Only pencil moves; a tile holding any other piece keeps it, and
 * the exchange is skipped if either would lose one.
 */
export function carryPaper(s: BattleState, a: Coord, b: Coord): void {
  const ta = tileAt(s, a);
  const tb = tileAt(s, b);
  const carries = (p: TilePiece | null): boolean => p === null || p.id === PENCIL_PIECE;
  if (!carries(ta.piece) || !carries(tb.piece) || (!ta.piece && !tb.piece)) return;
  [ta.piece, tb.piece] = [tb.piece, ta.piece];
}

/** The footnotes that bend an Erase's un-draw (`erase:unit`): `trace`, `spare`, `sweep`, `salvage`. */
export interface UndrawOpts {
  trace?: boolean;
  spare?: boolean;
  sweep?: boolean;
  salvage?: boolean;
}

const standing = (s: BattleState, at: Coord) =>
  s.units.filter((u) => isAlive(u) && sameCoord(u.pos, at));

/** A tile paper can stand a unit or hold an object on: real, not solid, not a drop or water. */
const paperTile = (s: BattleState, at: Coord): boolean => {
  if (!inBoard(s, at)) return false;
  const t = tileAt(s, at);
  return !blocksUnits(t) && !t.terrain.drop && !t.terrain.water && !pieceVoid(t);
};

/** The nearest paper tile to `from` that satisfies `ok`, ties in reading order (excluding `from`). */
function nearestPaper(s: BattleState, from: Coord, ok: (at: Coord) => boolean): Coord | null {
  let best: Coord | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  s.tiles.forEach((_, i) => {
    const c = coordOf(s, i);
    if (sameCoord(c, from) || !paperTile(s, c) || !ok(c)) return;
    const d = Math.abs(c.x - from.x) + Math.abs(c.y - from.y);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  });
  return best;
}

/**
 * Un-draws a pencil tile at once: it turns blank, what it held is gone and whoever stood there is
 * erased. `opts` are the household's footnotes: `trace` leaves bare pencil, `spare` sets a member
 * down on the nearest free paper, `salvage` draws the state and jar to the nearest paper, `sweep`
 * clears the states and jars beside the tile.
 */
export function undrawPencil(
  ctx: Ctx,
  at: Coord,
  by: UndrawnEvent['data']['by'],
  opts: UndrawOpts = {},
): void {
  const tile = tileAt(ctx.s, at);
  const there = standing(ctx.s, at);
  tile.piece = opts.trace
    ? { id: PENCIL_PIECE, data: { fate: null, due: null } }
    : { id: BLANK_PIECE, data: {} };
  const down = new Map<string, Coord>();
  if (opts.spare) {
    for (const u of there) {
      if (u.kind !== 'member') continue;
      const to = nearestPaper(
        ctx.s,
        at,
        (c) => !unitAt(ctx.s, c) && ![...down.values()].some((d) => sameCoord(d, c)),
      );
      if (to) down.set(u.id, to);
    }
  }
  const erased = there.filter((u) => !down.has(u.id));
  const ev: UndrawnEvent = {
    type: 'cartographers:undrawn',
    at: { ...at },
    data: { by, was: 'pencil', units: erased.map((u) => u.id) },
  };
  emit(ctx, ev);
  if (opts.salvage) salvage(ctx, at);
  if (tile.state) {
    tile.state = null;
    emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
  }
  if (tile.jar) {
    tile.jar = null;
    emit(ctx, { type: 'jarCrumbles', at: { ...at } });
  }
  if (opts.sweep) sweepBeside(ctx, at);
  for (const [id, to] of down) {
    const u = ctx.s.units.find((x) => x.id === id);
    if (!u) continue;
    const from = { ...u.pos };
    emit(ctx, {
      type: 'moved',
      unit: ref(u),
      from,
      to: { ...to },
      path: [{ ...to }],
      cause: 'return',
    });
    relocateAll(ctx, [{ unit: u.id, from, to, path: [to] }], 'return', null);
  }
  for (const u of erased) removeFromRoom(ctx, u, 'erased');
}

/** `erase-cap-salvage`: the state and jar on an un-drawn tile go to the nearest paper tile that is free for them. */
function salvage(ctx: Ctx, at: Coord): void {
  const tile = tileAt(ctx.s, at);
  const free = (c: Coord, what: 'state' | 'jar') =>
    tileAt(ctx.s, c)[what] === null &&
    !tileAt(ctx.s, c).terrain.gate &&
    !tileAt(ctx.s, c).terrain.grate;
  if (tile.state) {
    const to = nearestPaper(
      ctx.s,
      at,
      (c) => free(c, 'state') && !(tile.state?.id === 'plate' && unitAt(ctx.s, c)),
    );
    if (to) {
      emit(ctx, {
        type: 'drawn',
        from: { ...at },
        to: { ...to },
        what: tile.state.id.replace(/([A-Z])/g, ' $1').toLowerCase(),
      });
      tileAt(ctx.s, to).state = tile.state;
      tile.state = null;
    }
  }
  if (tile.jar) {
    const to = nearestPaper(ctx.s, at, (c) => free(c, 'jar'));
    if (to) {
      emit(ctx, { type: 'drawn', from: { ...at }, to: { ...to }, what: 'jar' });
      tileAt(ctx.s, to).jar = tile.jar;
      tile.jar = null;
    }
  }
}

/** `erase-unit-sweep`: the states and jars on the tiles beside an un-drawn tile are erased too. */
function sweepBeside(ctx: Ctx, at: Coord): void {
  for (const c of neighbors4(at)) {
    if (!inBoard(ctx.s, c)) continue;
    const t = tileAt(ctx.s, c);
    if (t.state) {
      t.state = null;
      emit(ctx, { type: 'stateFades', tiles: [{ ...c }] });
    }
    if (t.jar) {
      t.jar = null;
      emit(ctx, { type: 'jarCrumbles', at: { ...c } });
    }
  }
}

/** Un-draws an outline: the foe in it never inks, and the tile is plain pencil again. */
export function undrawOutline(ctx: Ctx, at: Coord, by: UndrawnEvent['data']['by']): void {
  tileAt(ctx.s, at).piece = { id: PENCIL_PIECE, data: { fate: null, due: null } };
  const ev: UndrawnEvent = {
    type: 'cartographers:undrawn',
    at: { ...at },
    data: { by, was: 'outline', units: [] },
  };
  emit(ctx, ev);
}

/** What an Erase aimed at paper does: `erase:unit`, or `quicksilver:drop` on Quicksilver's mirrored tile. */
export function pencilStruck(
  ctx: Ctx,
  at: Coord,
  _piece: TilePiece,
  by: StruckBy,
  _origin: unknown,
): void {
  if (by !== 'erase') return;
  if (ctx.meta.line === QUICKSILVER_ADDED) {
    withLine(ctx, 'quicksilver:drop', () => undrawPencil(ctx, at, 'quicksilver'));
    return;
  }
  const opts: UndrawOpts = {
    trace: hasFootnote(ctx, 'erase-unit-trace'),
    spare: hasFootnote(ctx, 'erase-unit-spare'),
    sweep: hasFootnote(ctx, 'erase-unit-sweep'),
    salvage: hasFootnote(ctx, 'erase-cap-salvage'),
  };
  withLine(ctx, 'erase:unit', () => {
    undrawPencil(ctx, at, 'erase', opts);
    // `erase-unit-wide`: every pencil tile touching the first is un-drawn the same way (once over).
    if (!hasFootnote(ctx, 'erase-unit-wide')) return;
    for (const c of neighbors4(at)) {
      if (inBoard(ctx.s, c) && tileAt(ctx.s, c).piece?.id === PENCIL_PIECE) {
        undrawPencil(ctx, c, 'erase', opts);
      }
    }
  });
}

/** `erase:empty`; Quicksilver's mirrored Erase un-draws an outline as it would pencil. */
export function outlineStruck(
  ctx: Ctx,
  at: Coord,
  _piece: TilePiece,
  by: StruckBy,
  _origin: unknown,
): void {
  if (by !== 'erase') return;
  if (ctx.meta.line === QUICKSILVER_ADDED) {
    withLine(ctx, 'quicksilver:drop', () => undrawOutline(ctx, at, 'quicksilver'));
    return;
  }
  // `erase-cap-salvage` left the tile's state and jar for the paper to save; an outline is no un-draw, so they go as ever.
  const tile = tileAt(ctx.s, at);
  if (hasFootnote(ctx, 'erase-cap-salvage')) {
    if (tile.state) {
      tile.state = null;
      emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
    }
    if (tile.jar) {
      tile.jar = null;
      emit(ctx, { type: 'jarCrumbles', at: { ...at } });
    }
  }
  withLine(ctx, 'erase:empty', () => undrawOutline(ctx, at, 'erase'));
}

// ── Outlines (P6) ───────────────────────────────────────

/** An outline piece's data, read forgivingly (a hand-built Lab state). */
export function outlineData(raw: Json | undefined): OutlineData {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const foe = 'foe' in r && typeof r.foe === 'string' ? r.foe : '';
  const due =
    'due' in r && typeof r.due === 'number' && Number.isSafeInteger(r.due) && r.due > 0
      ? r.due
      : null;
  return { foe, due };
}

export interface Outline {
  at: Coord;
  data: OutlineData;
}

/** Every outline tile in reading order. */
export function outlineTiles(s: BattleState): Outline[] {
  const out: Outline[] = [];
  s.tiles.forEach((t, i) => {
    if (t.piece?.id === OUTLINE_PIECE)
      out.push({ at: coordOf(s, i), data: outlineData(t.piece.data) });
  });
  return out;
}

/** Whether a unit stands on the tile, which holds an outline back for a round. */
export const outlineBlocked = (s: BattleState, at: Coord): boolean => !!unitAt(s, at);

/**
 * Inks the outlines due `round`, in reading order: the foe def is spawned on the tile and the
 * piece goes; where a unit stands the outline waits one round (`due + 1`). An outline naming no
 * foe def is just paper again.
 */
export function inkOutlines(ctx: Ctx, round: number): void {
  for (const o of outlineTiles(ctx.s)) {
    if (o.data.due !== round) continue;
    const tile = tileAt(ctx.s, o.at);
    if (outlineBlocked(ctx.s, o.at)) {
      tile.piece = { id: OUTLINE_PIECE, data: { foe: o.data.foe, due: round + 1 } };
      continue;
    }
    tile.piece = null;
    if (!Object.hasOwn(ENEMIES, o.data.foe)) continue;
    const foe = makeEnemy(ctx.s, o.data.foe as keyof typeof ENEMIES, o.at);
    ctx.s.units.push(foe);
    const ev: DrawnInEvent = {
      type: 'cartographers:drawnIn',
      at: { ...o.at },
      unit: ref(foe),
      data: { foe: o.data.foe },
    };
    emit(ctx, ev);
  }
}
