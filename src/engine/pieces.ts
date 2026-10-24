import { cloneData } from './clone';
import type { Ctx } from './ctx';
import { KIT } from './districts/kit';
import type {
  Json,
  Kit,
  PieceDef,
  PieceId,
  Solidity,
  StruckBy,
  TilePiece,
} from './districts/types';
import type { Coord } from './grid';
import { coordOf, inBoard, tileAt } from './queries';
import type { BattleState, Origin, Tile } from './types';

/**
 * Board pieces (district-kit P10, DK-4): the registry lookups, the `{token}` / `{token:suffix}`
 * notation, solidity, and the trigger entry points. Pieces live on `Tile.piece`; their `data` is
 * plain JSON, so it is cloned and saved with the battle.
 */

/** A registered piece by id; throws on an unknown id (a stale save or a typo in a fixture). */
export function pieceDef(id: PieceId, kit: Kit = KIT): PieceDef {
  const def = Object.hasOwn(kit.pieces, id) ? kit.pieces[id] : undefined;
  if (!def) throw new Error(`Unknown board piece '${id}'`);
  return def;
}

/** A fresh piece with its default data (cloned, so pieces never share it). */
export function makePiece(id: PieceId, data?: Json, kit: Kit = KIT): TilePiece {
  const def = pieceDef(id, kit);
  return { id, data: cloneData(data ?? def.data?.init ?? null) };
}

/** What the piece on a tile blocks; `'none'` on a bare tile. */
export const solidityOf = (t: Tile, kit: Kit = KIT): Solidity =>
  t.piece ? pieceDef(t.piece.id, kit).solid : 'none';
/** A solid piece stops walks, pushes and placement like a plate. */
export const pieceBlocksUnits = (t: Tile, kit: Kit = KIT): boolean => solidityOf(t, kit) !== 'none';
/** Only `unitsAndShots` pieces stop projectiles and lines. */
export const pieceBlocksShots = (t: Tile, kit: Kit = KIT): boolean =>
  solidityOf(t, kit) === 'unitsAndShots';

/** The piece on a tile answers being struck (a basic Shove may aim at it). */
export const strikable = (t: Tile, kit: Kit = KIT): boolean =>
  !!t.piece && !!pieceDef(t.piece.id, kit).triggers.onStruck;

// ── Notation ────────────────────────────────────────────

/**
 * A brace name as a piece: `bell` or `bell:a` (the suffix read by the piece's `data.parse`).
 * Null when the token is no piece's; throws on a suffix the piece cannot read.
 */
export function parsePieceToken(name: string, kit: Kit = KIT): TilePiece | null {
  const colon = name.indexOf(':');
  const token = colon < 0 ? name : name.slice(0, colon);
  const def = Object.hasOwn(kit.tokens, token) ? kit.tokens[token] : undefined;
  if (!def) return null;
  if (colon < 0) return makePiece(def.id, undefined, kit);
  const suffix = name.slice(colon + 1);
  const data = def.data?.parse?.(suffix) ?? null;
  if (data === null) throw new Error(`Piece "{${token}}" cannot read "${suffix}"`);
  return makePiece(def.id, data, kit);
}

/** The canonical brace token: `{bell:a}` when the piece writes a suffix, else `{bell}`. */
export function pieceToken(p: TilePiece, kit: Kit = KIT): string {
  const def = pieceDef(p.id, kit);
  const suffix = def.data?.write?.(p.data) ?? '';
  return suffix ? `{${def.token}:${suffix}}` : `{${def.token}}`;
}

// ── Triggers ────────────────────────────────────────────

const originOf = (ctx: Ctx, origin: Origin | null | undefined): Origin | null =>
  origin === undefined ? (ctx.meta.origin ?? null) : origin;

/**
 * Something struck the piece on `at` (foundry P2: damage landing there, a push into it, a Spark, a
 * basic Shove at it; Erase and Draw). Returns whether a piece answered.
 */
export function strikePiece(ctx: Ctx, at: Coord, by: StruckBy, origin?: Origin | null): boolean {
  if (!inBoard(ctx.s, at)) return false;
  const piece = tileAt(ctx.s, at).piece;
  const fn = piece && pieceDef(piece.id).triggers.onStruck;
  if (!piece || !fn) return false;
  fn(ctx, { ...at }, piece, by, originOf(ctx, origin));
  return true;
}

/** A projectile or an area landed on `at`. Returns whether a piece answered. */
export function hitPiece(ctx: Ctx, at: Coord, origin?: Origin | null): boolean {
  if (!inBoard(ctx.s, at)) return false;
  const piece = tileAt(ctx.s, at).piece;
  const fn = piece && pieceDef(piece.id).triggers.onHit;
  if (!piece || !fn) return false;
  fn(ctx, { ...at }, piece, originOf(ctx, origin));
  return true;
}

/**
 * Turn end: each piece's `onTurnEnd`, in reading order over the pieces standing when it starts
 * (one a trigger removes is skipped; one it places waits for the next turn end).
 */
export function piecesTurnEnd(ctx: Ctx): void {
  const s = ctx.s;
  const standing: { at: Coord; piece: TilePiece }[] = [];
  s.tiles.forEach((t, i) => {
    if (t.piece && pieceDef(t.piece.id).triggers.onTurnEnd) {
      standing.push({ at: coordOf(s, i), piece: t.piece });
    }
  });
  for (const { at, piece } of standing) {
    if (tileAt(s, at).piece !== piece) continue;
    pieceDef(piece.id).triggers.onTurnEnd?.(ctx, { ...at }, piece);
  }
}

/** Every piece on the board, reading order (Lab palette, UI art, tests). */
export function piecesOn(s: BattleState): { at: Coord; piece: TilePiece }[] {
  const out: { at: Coord; piece: TilePiece }[] = [];
  s.tiles.forEach((t, i) => {
    if (t.piece) out.push({ at: coordOf(s, i), piece: t.piece });
  });
  return out;
}
