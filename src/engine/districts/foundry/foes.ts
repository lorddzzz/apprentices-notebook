import { FOUNDRY_TUNING, TONES, type Tone } from '$data/districts/foundry';
import { candidatesOf, closestTo, nearestMember } from '../../ai';
import { type Ctx, emit } from '../../ctx';
import { dealDamage } from '../../damage';
import {
  byReadingOrder,
  type Coord,
  DIRS,
  type Dir,
  key,
  label,
  neighbors4,
  sameCoord,
  step,
} from '../../grid';
import { enemyWalk } from '../../movement';
import {
  distanceField,
  findUnit,
  inBoard,
  isAlive,
  livingUnits,
  members,
  tileAt,
  unitAt,
} from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { FoeBehaviour, KitId, PreviewShape } from '../types';
import { clapperTone, ropeTone, toneOfPiece } from './pieces';
import { isHumming, pulseTiles, retune, ringingBells, ringTone } from './ring';
import { BELL_PIECE, ROPE_PIECE } from './types';

/**
 * The ringers' staff (foundry-plan P5, P12, P16; BF-6, BF-7), on the kit's behaviour registry. A
 * Ringer stands on its rope and rings the rope's tone a round after it telegraphs; a Clapper walks,
 * is a member of its tone while it stands, and rings that tone when hit (`onStruck`); a Detuner
 * walks to the nearest bell and retunes it. Plans are rng-free. Rings and retunes go through
 * `ringTone` and `retune`, so they settle with every other ring.
 */

export const RINGER_BEHAVIOUR: KitId = 'foundry:ringer';
export const DETUNER_BEHAVIOUR: KitId = 'foundry:detuner';
export const CLAPPER_BEHAVIOUR: KitId = 'foundry:clapper';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const where = (c: Coord | undefined): string => (c ? label(c) : '?');
const telegraphOf = (e: EnemyUnit): Telegraph | null =>
  e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;
const dirTo = (from: Coord, to: Coord): Dir | null =>
  DIRS.find((d) => sameCoord(step(from, d), to)) ?? null;
const isTone = (v: string): v is Tone => (TONES as readonly string[]).includes(v);

/** Living apprentices beside `e`, in reading order. */
const besideMembers = (s: BattleState, e: EnemyUnit): Unit[] =>
  members(s)
    .filter((m) => isAlive(m) && manhattan(m.pos, e.pos) === 1)
    .sort((a, b) => byReadingOrder(a.pos, b.pos));

/** Walks toward the nearest apprentice by the shortest way (ties: path length, reading order). */
function approach(ctx: Ctx, e: EnemyUnit): void {
  const target = nearestMember(ctx.s, e);
  if (!target) return;
  const best = closestTo(ctx.s, e, target, candidatesOf(ctx.s, e, true));
  enemyWalk(ctx, e, best?.path ?? []);
}

// ── The Ringer ──────────────────────────────────────────

/** The tone of the rope the Ringer stands on; a Ringer off its rope rings low. */
export function ringerTone(s: BattleState, e: EnemyUnit): Tone {
  const piece = tileAt(s, e.pos).piece;
  return piece?.id === ROPE_PIECE ? ropeTone(piece.data) : 'low';
}

/** Who a ring of `tone` would pulse now: apprentices and foes on the tiles beside its bells. */
function pulsed(s: BattleState, tone: Tone): { friends: number; apprentices: number } {
  const tiles = new Set(pulseTiles(s, tone).map(key));
  const beside = livingUnits(s).filter((u) => tiles.has(key(u.pos)));
  return {
    friends: beside.filter((u) => u.kind === 'enemy').length,
    apprentices: beside.filter((u) => u.kind === 'member').length,
  };
}

const toneOfLabel = (tg: Telegraph): Tone | null => {
  const t = tg.label.split(':')[1];
  return t && isTone(t) ? t : null;
};

export const RINGER_FOE: FoeBehaviour = {
  id: RINGER_BEHAVIOUR,
  /**
   * Rings its rope's tone: telegraphs the tiles that pulse. It holds the pull when the ring would
   * hurt only friends (no apprentice beside any ringing bell and a foe is); a ring that spares no
   * one else but hurts more apprentices than friends still comes.
   */
  plan(s, e): Telegraph | null {
    const tone = ringerTone(s, e);
    if (ringingBells(s, tone).length === 0) return null;
    const hit = pulsed(s, tone);
    if (hit.friends > 0 && hit.friends >= hit.apprentices) return null;
    return { label: `ring:${tone}`, tiles: pulseTiles(s, tone), units: [] };
  },
  /** The ring is queued with the foe's own tile as its source and settles at this foe's end. */
  resolve(ctx, e, tg) {
    const tone = toneOfLabel(tg) ?? ringerTone(ctx.s, e);
    ringTone(ctx, tone, 'ringer', null, e.pos);
  },
  preview(s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const tone = tg ? toneOfLabel(tg) : null;
    if (!tone || isHumming(s, tone)) return [];
    const cells = pulseTiles(s, tone);
    return cells.length > 0 ? [{ kind: 'outline', cells, label: tone }] : [];
  },
  describe: (tg) => `ring the ${toneOfLabel(tg) ?? 'low'} bells`,
};

// ── The Clapper ─────────────────────────────────────────

export const CLAPPER_FOE: FoeBehaviour = {
  id: CLAPPER_BEHAVIOUR,
  move: approach,
  /** Bumps an apprentice beside it (reading order); never anything else. */
  plan(s, e): Telegraph | null {
    const victim = besideMembers(s, e)[0];
    return victim ? { label: 'bump', tiles: [{ ...victim.pos }], units: [victim.id] } : null;
  },
  resolve(ctx, e, tg) {
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    if (!victim || !isAlive(victim) || manhattan(victim.pos, e.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'Bump' });
      return;
    }
    dealDamage(ctx, victim, FOUNDRY_TUNING.foes.clapper.bump, 'Bump', [], {
      heading: dirTo(e.pos, victim.pos),
      at: e.pos,
    });
  },
  /** Hitting it rings its tone (queued, settled with the cast that did it). */
  onStruck(ctx, e) {
    const tone = clapperTone(e);
    if (tone) ringTone(ctx, tone, 'clapper', ctx.meta.origin ?? null, e.pos);
  },
  preview(_s, e): readonly PreviewShape[] {
    const at = telegraphOf(e)?.tiles[0];
    return at ? [{ kind: 'pulse', at: { ...at } }] : [];
  },
  describe: (tg) => `bump ${where(tg.tiles[0])}`,
};

// ── The Detuner (P16) ───────────────────────────────────

const bellTiles = (s: BattleState): Coord[] =>
  s.tiles.flatMap((t, i) =>
    t.piece?.id === BELL_PIECE ? [{ x: i % s.width, y: Math.floor(i / s.width) }] : [],
  );

/** The bells 4-adjacent to `at`, in reading order. */
const bellsBeside = (s: BattleState, at: Coord): Coord[] =>
  neighbors4(at)
    .filter((c) => inBoard(s, c) && tileAt(s, c).piece?.id === BELL_PIECE)
    .sort(byReadingOrder);

/**
 * P16: walking steps from `e` to a free tile beside `bell` (0 when it already stands beside it),
 * by the foes' own pathing; infinity when none is reachable.
 */
function stepsTo(s: BattleState, e: EnemyUnit, bell: Coord): number {
  if (manhattan(e.pos, bell) === 1) return 0;
  const field = distanceField(s, e.pos, e.id);
  let best = Number.POSITIVE_INFINITY;
  for (const n of neighbors4(bell)) {
    if (!inBoard(s, n) || (unitAt(s, n) && !sameCoord(n, e.pos))) continue;
    best = Math.min(best, field.get(key(n)) ?? Number.POSITIVE_INFINITY);
  }
  return best;
}

/** The nearest bell by `stepsTo` (ties in reading order); with none reachable, by distance as the crow walks. */
export function nearestBell(s: BattleState, e: EnemyUnit): Coord | null {
  const bells = bellTiles(s).sort(byReadingOrder);
  let best: { at: Coord; d: number } | null = null;
  for (const at of bells) {
    const d = stepsTo(s, e, at);
    if (!best || d < best.d) best = { at, d };
  }
  if (best && best.d < Number.POSITIVE_INFINITY) return best.at;
  let near: { at: Coord; d: number } | null = null;
  for (const at of bells) {
    const d = manhattan(e.pos, at);
    if (!near || d < near.d) near = { at, d };
  }
  return near?.at ?? null;
}

/** Walks toward the nearest bell; a Detuner already beside one stays. */
function detunerMove(ctx: Ctx, e: EnemyUnit): void {
  if (bellsBeside(ctx.s, e.pos).length > 0) return;
  const goal = nearestBell(ctx.s, e);
  if (!goal) return;
  const fields = neighbors4(goal)
    .filter((n) => inBoard(ctx.s, n))
    .map((n) => distanceField(ctx.s, n, e.id));
  const score = (c: Coord): number =>
    Math.min(...fields.map((f) => f.get(key(c)) ?? Number.POSITIVE_INFINITY));
  let best: { at: Coord; path: Coord[] } | null = null;
  for (const c of candidatesOf(ctx.s, e, true)) {
    if (!best || score(c.at) < score(best.at)) best = c;
  }
  enemyWalk(ctx, e, best?.path ?? []);
}

const retunedLabel = (s: BattleState, bell: Coord): string => {
  const piece = tileAt(s, bell).piece;
  const from = piece ? toneOfPiece(piece.id, piece.data) : null;
  const to = from ? (TONES[(TONES.indexOf(from) + 1) % TONES.length] ?? from) : 'low';
  return `retune:${to}`;
};

export const DETUNER_FOE: FoeBehaviour = {
  id: DETUNER_BEHAVIOUR,
  move: detunerMove,
  /** Retunes the first bell beside it in reading order, muffled or humming alike. */
  plan(s, e): Telegraph | null {
    const bell = bellsBeside(s, e.pos)[0];
    return bell ? { label: retunedLabel(s, bell), tiles: [bell], units: [] } : null;
  },
  /** Retunes the telegraphed bell if it still stands beside the Detuner. */
  resolve(ctx, e, tg) {
    const at = tg.tiles[0];
    if (!at || manhattan(at, e.pos) !== 1 || !retune(ctx, at, 1)) {
      emit(ctx, { type: 'miss', source: 'Retune' });
    }
  },
  preview(_s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const at = tg?.tiles[0];
    const to = tg?.label.split(':')[1];
    return at ? [{ kind: 'outline', cells: [{ ...at }], label: to }] : [];
  },
  describe: (tg) => `retune the bell at ${where(tg.tiles[0])} to ${tg.label.split(':')[1] ?? '?'}`,
};

/** The staff's behaviours, for the district module. */
export const FOUNDRY_FOES: readonly FoeBehaviour[] = [RINGER_FOE, DETUNER_FOE, CLAPPER_FOE];
