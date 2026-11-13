import { ENEMIES } from '$data';
import { type Ctx, emit, ref, withLine } from '../../ctx';
import { makeEnemy } from '../../foes';
import { type Coord, sameCoord } from '../../grid';
import { removeFromRoom } from '../../outOfRoom';
import { coordOf, isAlive, tileAt, unitAt } from '../../queries';
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

/** Un-draws a pencil tile at once: it turns blank, what it held is gone and whoever stood there is erased. */
export function undrawPencil(ctx: Ctx, at: Coord, by: UndrawnEvent['data']['by']): void {
  const tile = tileAt(ctx.s, at);
  const units = ctx.s.units.filter((u) => isAlive(u) && sameCoord(u.pos, at));
  tile.piece = { id: BLANK_PIECE, data: {} };
  const ev: UndrawnEvent = {
    type: 'cartographers:undrawn',
    at: { ...at },
    data: { by, was: 'pencil', units: units.map((u) => u.id) },
  };
  emit(ctx, ev);
  if (tile.state) {
    tile.state = null;
    emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
  }
  if (tile.jar) {
    tile.jar = null;
    emit(ctx, { type: 'jarCrumbles', at: { ...at } });
  }
  for (const u of units) removeFromRoom(ctx, u, 'erased');
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
  withLine(ctx, 'erase:unit', () => undrawPencil(ctx, at, 'erase'));
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
