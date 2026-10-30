import type { GameEvent, UnitId } from '$engine';
import {
  type BattleState,
  type Coord,
  coordOf,
  findUnit,
  isAlive,
  livingUnits,
  sameCoord,
  step,
} from '$engine';
import { hasTrait } from '$engine/arrival';
import { clockRoundsLeft, openClock } from '$engine/districts/inkQuarter/clock';
import {
  ADDRESS_PIECE,
  FORWARD_PIECE,
  ORDER_PIECE,
  RETURN_PIECE,
} from '$engine/districts/inkQuarter/types';
import { sendBackTarget } from '$engine/districts/inkQuarter/writs';
import type { Json, PreviewShape } from '$engine/districts/types';
import type { InputMode } from './battleInput';

/**
 * The ink quarter's board marks (IQ-15), as district highlights the board draws through the UI
 * registry (`DistrictUi.highlightArt`): the forwarding thread, the clock's countdown, the
 * "sent back to" ghost for a walk or hop that would land on a return stamp, and the ring on the
 * addressee when a previewed hit would be forwarded. Pure reads of the battle state.
 */

export type DistrictHighlight = {
  kind: 'district';
  key: string;
  at: Coord;
  to?: Coord;
  data?: Json;
};

export const THREAD = 'inkQuarter:thread';
export const CLOCK_COUNT = 'inkQuarter:clockCount';
export const SENT_BACK = 'inkQuarter:sentBack';
export const FORWARD_RING = 'inkQuarter:forwardRing';

const pieceAt = (s: BattleState, at: Coord): { id: string; data: Json } | null =>
  s.tiles[at.y * s.width + at.x]?.piece ?? null;

/** Every tile holding a piece of `id`, in reading order. */
function tilesOf(s: BattleState, id: string): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < s.tiles.length; i++)
    if (s.tiles[i]?.piece?.id === id) out.push(coordOf(s, i));
  return out;
}

/** A thread from each forwarding stamp to the address that shares its letter. */
function threads(s: BattleState): DistrictHighlight[] {
  const out: DistrictHighlight[] = [];
  for (const at of tilesOf(s, FORWARD_PIECE)) {
    const pair = (pieceAt(s, at)?.data as { pair?: string } | null)?.pair;
    const to = tilesOf(s, ADDRESS_PIECE).find(
      (a) => (pieceAt(s, a)?.data as { pair?: string } | null)?.pair === pair,
    );
    if (to) out.push({ kind: 'district', key: THREAD, at, to });
  }
  return out;
}

/** Where `unit` would be sent if it landed on the return stamp at `stamp`, as a ghost. */
function sentBackAt(s: BattleState, unit: UnitId, stamp: Coord): DistrictHighlight | null {
  if (pieceAt(s, stamp)?.id !== RETURN_PIECE) return null;
  // As the landing would find it: the unit is already on the stamp, so its own start tile is free.
  const landed: BattleState = {
    ...s,
    units: s.units.map((u) => (u.id === unit ? { ...u, pos: { ...stamp } } : u)),
  };
  const to = sendBackTarget(landed, unit, stamp);
  return to ? { kind: 'district', key: SENT_BACK, at: to, to: stamp } : null;
}

/** The ring on the addressee of every forwarded hit or mark in the previewed events. */
function forwardedRings(s: BattleState, shown: readonly GameEvent[]): DistrictHighlight[] {
  const out: DistrictHighlight[] = [];
  for (const e of shown) {
    if (e.type !== 'inkQuarter:forwarded') continue;
    const data = (e as { data?: { to?: unknown; stamp?: Coord } }).data;
    const to = typeof data?.to === 'string' ? findUnit(s, data.to) : undefined;
    if (!to || !data?.stamp) continue;
    out.push({ kind: 'district', key: FORWARD_RING, at: { ...to.pos }, to: { ...data.stamp } });
  }
  return out;
}

/** The mode's landing tiles that a walk or hop could end on. */
function landings(s: BattleState, mode: InputMode): { unit: UnitId; at: Coord }[] {
  if (mode.kind === 'member' || mode.kind === 'inspect') {
    const unit = mode.kind === 'member' ? mode.unit : mode.member;
    return unit ? mode.moves.map((at) => ({ unit, at })) : [];
  }
  if (mode.kind === 'basic' && mode.action === 'hop') {
    const m = findUnit(s, mode.unit);
    return m ? mode.dirs.map((d) => ({ unit: m.id, at: step(step(m.pos, d), d) })) : [];
  }
  return [];
}

/** Everything the ink quarter adds to the board's highlights for this state and input mode. */
export function inkHighlights(
  s: BattleState,
  mode: InputMode,
  shown: readonly GameEvent[] | null,
): DistrictHighlight[] {
  const out = threads(s);
  const clock = openClock(s);
  const left = clockRoundsLeft(s);
  if (clock && left !== null) {
    out.push({ kind: 'district', key: CLOCK_COUNT, at: { ...clock.stamp }, data: { left } });
  }
  for (const l of landings(s, mode)) {
    const ghost = sentBackAt(s, l.unit, l.at);
    if (ghost) out.push(ghost);
  }
  if (shown) out.push(...forwardedRings(s, shown));
  return out;
}

/**
 * The standing order's dusk preview (P4): a drawn-ink tile on every order that holds an unmarked,
 * unanchored unit, which is exactly who the round end will mark.
 */
export function orderShapes(s: BattleState): PreviewShape[] {
  const out: PreviewShape[] = [];
  for (const at of tilesOf(s, ORDER_PIECE)) {
    const u = livingUnits(s).find((v) => isAlive(v) && sameCoord(v.pos, at));
    if (u && !u.mark && !hasTrait(u, 'anchored')) out.push({ kind: 'tile', at, tone: 'drawn' });
  }
  return out;
}
