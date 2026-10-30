import { INK_FOE_TUNING } from '$data/districts/inkQuarter/enemies';
import { hasTrait } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { type Coord, label } from '../../grid';
import { makePiece, piecesOn } from '../../pieces';
import { findUnit, inBoard, isAlive, tileAt, unitAt } from '../../queries';
import type { BattleState, Unit } from '../../types';
import type { DistrictEvent, DistrictEventDef, PieceDef, PieceId, TilePiece } from '../types';
import { type SealedEvent, type UnsealedEvent, WAX_DEF, WAX_PIECE, type WaxData } from './types';

/**
 * The wax seal (ink-quarter plan P8; IQ-5b). A piece on one tile: whoever stands on it is held for
 * as long as the seal lasts (`held` = the seal's rounds left, so a Shove, a pull or a walk is
 * refused), whether the seal landed on them or they walked in. It lasts 2 rounds counting the one
 * it lands in, wears off at turn end, melts at once in fire, and vanishes (freeing its bearer) when
 * the Sealer that placed it dies. Seals with no Sealer (`by: ''`) are the room stake's and the
 * clock's (IQ-4, IQ-6): they call `placeSeal`.
 */

const dataOf = (p: TilePiece): WaxData => p.data as WaxData;
const isWax = (p: TilePiece | null | undefined): p is TilePiece => p?.id === WAX_PIECE;

/** The seal on a tile, if any. */
export const sealAt = (s: BattleState, at: Coord): TilePiece | null => {
  const p = inBoard(s, at) ? tileAt(s, at).piece : null;
  return isWax(p) ? p : null;
};

/** Whether a seal can be set down on `at` (not off the board, the drop, a gate, a grate or another piece). */
export function canSeal(s: BattleState, at: Coord): boolean {
  if (!inBoard(s, at)) return false;
  const t = tileAt(s, at);
  return !t.terrain.drop && !t.terrain.gate && !t.terrain.grate && (!t.piece || isWax(t.piece));
}

/** Holds `u` for `rounds` (never shortens an existing hold); emits `held` when it grows. */
function hold(ctx: Ctx, u: Unit, rounds: number): void {
  if (hasTrait(u, 'anchored') || u.held >= rounds) return;
  u.held = rounds;
  emit(ctx, { type: 'held', unit: ref(u), rounds });
}

const burning = (s: BattleState, at: Coord): boolean => tileAt(s, at).state?.id === 'fire';

/** Takes a seal off its tile and frees the one it held. */
function unseal(ctx: Ctx, at: Coord, why: UnsealedEvent['data']['why']): void {
  tileAt(ctx.s, at).piece = null;
  const u = unitAt(ctx.s, at);
  if (u) u.held = 0;
  const ev: UnsealedEvent = { type: 'inkQuarter:unsealed', at: { ...at }, data: { why } };
  emit(ctx, ev);
}

/**
 * A seal lands on `at` and holds whoever stands there. False when it cannot be set down; on a
 * burning tile it melts as it lands (true: the action was spent).
 */
export function placeSeal(
  ctx: Ctx,
  at: Coord,
  by = '',
  rounds: number = INK_FOE_TUNING.sealRounds,
): boolean {
  if (!canSeal(ctx.s, at)) return false;
  if (burning(ctx.s, at)) {
    const ev: UnsealedEvent = {
      type: 'inkQuarter:unsealed',
      at: { ...at },
      data: { why: 'melted' },
    };
    emit(ctx, ev);
    return true;
  }
  tileAt(ctx.s, at).piece = makePiece(WAX_PIECE, { rounds, by } satisfies WaxData);
  const ev: SealedEvent = { type: 'inkQuarter:sealed', at: { ...at }, data: { rounds } };
  emit(ctx, ev);
  const u = unitAt(ctx.s, at);
  if (u) hold(ctx, u, rounds);
  return true;
}

/** Seals the fallen Sealer placed vanish; their bearers are freed. */
export function sealerFell(ctx: Ctx, sealer: string): void {
  for (const { at, piece } of piecesOn(ctx.s)) {
    if (isWax(piece) && dataOf(piece).by === sealer) unseal(ctx, at, 'sealer');
  }
}

/** A unit stepping onto a seal is held as long as the seal has left. */
const WAX_ARRIVAL: NonNullable<PieceDef['triggers']['onArrive']> = {
  answers: 'landing',
  subjects: ['unit'],
  run(ctx, a) {
    if (a.subject.kind !== 'unit') return 'go';
    const piece = sealAt(ctx.s, a.at);
    const u = findUnit(ctx.s, a.subject.unit);
    if (piece && u && isAlive(u)) hold(ctx, u, dataOf(piece).rounds);
    return 'go';
  },
};

/** Turn end: fire melts the seal, else it wears down a round and falls off at none. */
function waxTurnEnd(ctx: Ctx, at: Coord, piece: TilePiece): void {
  if (burning(ctx.s, at)) {
    unseal(ctx, at, 'melted');
    return;
  }
  const d = dataOf(piece);
  if (d.rounds <= 1)
    tileAt(ctx.s, at).piece = null; // worn out: the hold lapses by itself
  else piece.data = { ...d, rounds: d.rounds - 1 };
}

/** The seal's def with its triggers, swapped in for the base def. */
export const WAX_SEAL_DEF: PieceDef<WaxData> = {
  ...WAX_DEF,
  exempt: ['anchored'],
  aiAvoid: true,
  triggers: { onArrive: WAX_ARRIVAL, onTurnEnd: waxTurnEnd },
};

export const WAX_PIECES: Readonly<Record<PieceId, PieceDef>> = {
  [WAX_PIECE]: WAX_SEAL_DEF as PieceDef,
};

/** The seal's two log lines. */
export const WAX_EVENT_LINES: Readonly<Record<string, DistrictEventDef>> = {
  'inkQuarter:sealed': {
    type: 'inkQuarter:sealed',
    describe: (e: DistrictEvent) => `a wax seal lands${e.at ? ` at ${label(e.at)}` : ''}`,
  },
  'inkQuarter:unsealed': {
    type: 'inkQuarter:unsealed',
    describe: (e: DistrictEvent) => {
      const why = (e.data as { why?: string } | undefined)?.why;
      const tail = why === 'sealer' ? 'its Sealer fell' : 'fire melts it';
      return `the wax seal${e.at ? ` at ${label(e.at)}` : ''} is gone: ${tail}`;
    },
  },
};
