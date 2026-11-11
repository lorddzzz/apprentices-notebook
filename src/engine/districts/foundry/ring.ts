import { FOUNDRY_TUNING, TONES, type Tone } from '$data/districts/foundry';
import { cloneData } from '../../clone';
import { type Ctx, emit, withOrigin } from '../../ctx';
import { dealDamage } from '../../damage';
import { type Coord, DIRS, type Dir, inBounds, neighbors4, step } from '../../grid';
import { push } from '../../push';
import { isCloud, livingUnits, members, tileAt } from '../../queries';
import type { BattleState, Origin, Unit } from '../../types';
import type { PieceTriggers, PreviewShape, StruckBy, TilePiece } from '../types';
import { clapperTone, type ToneMember, toneGroups, toneOfPiece } from './pieces';
import {
  BELL_PIECE,
  BELLS_RULE_ID,
  type BellRungEvent,
  type BellStruckEvent,
  type BellsState,
  GREAT_BELL_PIECE,
  type GreatBellData,
  type HumEvent,
  initBells,
  lockOf,
  type MuffledEvent,
  type PulseEvent,
  parseBells,
  type QueuedOrigin,
  type QueuedStrike,
  type RetunedEvent,
  type RingCause,
  type RingEvent,
  tileKey,
} from './types';

/**
 * The ring (BF-3, BF-5; foundry-plan P2–P5, P18, P19). A strike (`onStruck`, `onHit`) is logged at
 * once and queued with its striker's origin; `settleBells` resolves the queue at a settle point:
 * in strike order it reads the tone and the muffle *then*, rings the tone's bells once per round
 * (the tone then hums until `late`), and pulses each unit beside a ringing bell once. A pulse that
 * pushes a unit into a bell strikes it, which queues another ring. Brass retunes a bell (P4).
 */

// ── The rule's state ────────────────────────────────────

const readBells = (ctx: Ctx): BellsState => parseBells(ctx.s.rules?.[BELLS_RULE_ID]);
const writeBells = (ctx: Ctx, own: BellsState): void => {
  ctx.s.rules = { ...ctx.s.rules, [BELLS_RULE_ID]: own };
};
const withQueue = (own: BellsState, queue: QueuedStrike[]): BellsState => {
  const { queue: _old, ...rest } = own;
  return queue.length > 0 ? { ...rest, queue } : rest;
};

const toOrigin = (o: QueuedOrigin | null): Origin | null => o as Origin | null;

// ── Strikes (P2) ────────────────────────────────────────

const isGreat = (piece: TilePiece): boolean => piece.id === GREAT_BELL_PIECE;
const isAllied = (piece: TilePiece): boolean =>
  isGreat(piece) && (piece.data as GreatBellData).allied;

/** A strike on the bell at `at`: logged now, queued for the settle point (P18), striker recorded (P8). */
function strike(ctx: Ctx, at: Coord, piece: TilePiece, by: StruckBy, origin: Origin | null): void {
  // One blow per bell until the queue settles: a Bolt that stops at a bell and the Spark it
  // carries (or a Storm burst on top of it) strike it once.
  if (readBells(ctx).queue?.some((q) => q.at.x === at.x && q.at.y === at.y)) return;
  const key = tileKey(at.x, at.y);
  const caster = origin?.caster;
  let by_ = caster;
  if (isAllied(piece)) {
    // P8: a hung bell answers an apprentice's cast or Shove, once per round (a Shove has no origin).
    const apprentice = by === 'shove' || (!!caster && members(ctx.s).some((m) => m.id === caster));
    if (!apprentice || (readBells(ctx).struck[key] ?? []).length > 0) return;
    by_ = caster ?? 'shove';
  }
  const ev: BellStruckEvent = {
    type: 'foundry:bellStruck',
    at: { ...at },
    data: { by, tone: piece.id === BELL_PIECE ? toneOfPiece(piece.id, piece.data) : null },
  };
  emit(ctx, ev);
  const own = readBells(ctx);
  const struck =
    by_ && !(own.struck[key] ?? []).includes(by_)
      ? { ...own.struck, [key]: [...(own.struck[key] ?? []), by_] }
      : own.struck;
  const entry: QueuedStrike = {
    at: { x: at.x, y: at.y },
    by,
    origin: origin ? cloneData(origin) : null,
  };
  writeBells(ctx, { ...own, struck, queue: [...(own.queue ?? []), entry] });
}

/**
 * BF-6, P3: a foe's ring of `tone`, queued like a strike and rung at the next settle point (a
 * Ringer on its rope, a struck Clapper); `at` is the source's tile. Nothing queues on a board with
 * no bell, where the rule is not on (the queue would never settle).
 */
export function ringTone(
  ctx: Ctx,
  tone: Tone,
  cause: RingCause,
  origin: Origin | null,
  at: Coord,
): void {
  const anyBell = ctx.s.tiles.some((t) => t.piece && toneOfPiece(t.piece.id, t.piece.data));
  if (!anyBell) return;
  const own = readBells(ctx);
  const entry: QueuedStrike = {
    at: { x: at.x, y: at.y },
    by: 'damage',
    origin: origin ? cloneData(origin) : null,
    tone,
    cause,
  };
  writeBells(ctx, { ...own, queue: [...(own.queue ?? []), entry] });
}

/** Whether `tone` has rung this round (a ring of it now fizzles, P3). */
export const isHumming = (s: BattleState, tone: Tone): boolean =>
  parseBells(s.rules?.[BELLS_RULE_ID]).humming.includes(tone);

/**
 * Retunes the bell at `at` by `delta` tones up, wrapping (P4; the Detuner steps by one): logged,
 * no strike, nothing queued. False when no bell stands there.
 */
export function retune(ctx: Ctx, at: Coord, delta = 1): boolean {
  const piece = tileAt(ctx.s, at).piece;
  if (!piece || piece.id !== BELL_PIECE) return false;
  const from = toneOfPiece(piece.id, piece.data);
  if (!from) return false;
  const n = TONES.length;
  const to = TONES[(((TONES.indexOf(from) + delta) % n) + n) % n] ?? from;
  const ev: RetunedEvent = { type: 'foundry:retuned', at: { ...at }, data: { from, to } };
  emit(ctx, ev);
  piece.data = { tone: to };
  return true;
}

/**
 * P4, P19: Brass retunes the bell up one tone (wrapping) and lands nothing, and is no strike. Every
 * other kind is left to land: Steam as the muffling cloud, Ink and Oil as misses on the bell.
 */
const retuneByKind = (ctx: Ctx, at: Coord, kind: string): boolean =>
  kind === 'brass' && retune(ctx, at, 1);

/** The bell's triggers: struck or hit it queues a ring; Brass retunes it. */
export const BELL_TRIGGERS: PieceTriggers = {
  onStruck: (ctx, at, piece, by, origin) => strike(ctx, at, piece, by, origin),
  onHit: (ctx, at, piece, origin) => strike(ctx, at, piece, 'damage', origin),
  onKind: (ctx, at, _piece, kind) => retuneByKind(ctx, at, kind),
};

/** The great bell's triggers (P6): a strike is queued and weighed against its lock at the settle point. */
export const GREAT_BELL_TRIGGERS: PieceTriggers = {
  onStruck: (ctx, at, piece, by, origin) => strike(ctx, at, piece, by, origin),
  onHit: (ctx, at, piece, origin) => strike(ctx, at, piece, 'damage', origin),
};

// ── Ringing (P3, P5) ────────────────────────────────────

const isMuffled = (s: BattleState, at: Coord): boolean => isCloud(tileAt(s, at));

/** The members that would ring for `tone` now, reading order; muffled bells are silent (P4). */
function ringMembers(s: BattleState, tone: Tone): ToneMember[] {
  return toneGroups(s, clapperTone)[tone].filter((m) => m.kind === 'unit' || !isMuffled(s, m.at));
}

/** The tiles of the bells (and standing Clappers) that would ring for `tone` now, reading order. */
export const ringingBells = (s: BattleState, tone: Tone): Coord[] =>
  ringMembers(s, tone).map((m) => ({ ...m.at }));

/** Every board tile beside a bell that would ring for `tone`: where its pulse lands, reading order. */
export function pulseTiles(s: BattleState, tone: Tone): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const bell of ringingBells(s, tone)) {
    for (const c of neighbors4(bell)) {
      if (!inBounds(c, s.width, s.height) || seen.has(tileKey(c.x, c.y))) continue;
      seen.add(tileKey(c.x, c.y));
      out.push(c);
    }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

const dirBetween = (from: Coord, to: Coord): Dir | null =>
  DIRS.find((d) => {
    const c = step(from, d);
    return c.x === to.x && c.y === to.y;
  }) ?? null;

/** One ringing bell: 1 damage then a push away from it, to each unit beside it not yet pulsed this ring. */
function pulse(
  ctx: Ctx,
  tone: Tone,
  bell: Coord,
  pulsed: Set<string>,
  origin: Origin | null,
): void {
  const beside = livingUnits(ctx.s)
    .filter((u) => !pulsed.has(u.id) && dirBetween(bell, u.pos))
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
  if (beside.length === 0) return;
  const ev: PulseEvent = {
    type: 'foundry:pulse',
    at: { ...bell },
    data: { tone, allied: false, units: beside.map((u) => u.id) },
  };
  emit(ctx, ev);
  for (const u of beside) pulsed.add(u.id);
  for (const u of beside) hurt(ctx, u, bell, origin);
}

function hurt(
  ctx: Ctx,
  u: Unit,
  bell: Coord,
  origin: Origin | null,
  damage: number = FOUNDRY_TUNING.pulseDamage,
  pushBy: number = FOUNDRY_TUNING.pulsePush,
): void {
  if (u.hp <= 0 || u.out) return;
  const dir = dirBetween(bell, u.pos);
  if (!dir) return; // a pulse earlier in this ring moved it away
  dealDamage(ctx, u, damage, 'Bell', [], { heading: dir, at: { ...bell } });
  if (u.hp > 0) push(ctx, u, dir, pushBy, origin);
}

/** P8: a hung great bell pulses the foes beside it only: more damage, the same push. */
function alliedPulse(ctx: Ctx, tone: Tone, bell: Coord, origin: Origin | null): void {
  const beside = livingUnits(ctx.s)
    .filter((u) => u.kind === 'enemy' && dirBetween(bell, u.pos))
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
  if (beside.length === 0) return;
  const ev: PulseEvent = {
    type: 'foundry:pulse',
    at: { ...bell },
    data: { tone, allied: true, units: beside.map((u) => u.id) },
  };
  emit(ctx, ev);
  withOrigin(ctx, origin, () => {
    for (const u of beside)
      hurt(ctx, u, bell, origin, FOUNDRY_TUNING.alliedPulseDamage, FOUNDRY_TUNING.alliedPulsePush);
  });
}

/** P6: the great bell at `at` is rung (once): its data reads `rung`, and the room's bonus can see it. */
function markRung(ctx: Ctx, at: Coord): void {
  const piece = tileAt(ctx.s, at).piece;
  if (!piece || !isGreat(piece)) return;
  const d = piece.data as GreatBellData;
  if (d.rung || d.allied) return;
  piece.data = { ...d, rung: true };
  const ev: BellRungEvent = {
    type: 'foundry:bellRung',
    at: { ...at },
    data: { note: d.note, lock: lockOf(d), hang: d.hang },
  };
  emit(ctx, ev);
}

/**
 * Locks 2 and 4 (P6): a great bell in a ring is rung by Match (the ring is of its tone), and by
 * Chord when three or more other members ring with it.
 */
function ringGreatBells(ctx: Ctx, ringing: readonly ToneMember[]): void {
  const others = ringing.filter((m) => m.kind !== 'greatBell').length;
  for (const m of ringing) {
    if (m.kind !== 'greatBell') continue;
    const piece = tileAt(ctx.s, m.at).piece;
    if (!piece || !isGreat(piece)) continue;
    const lock = lockOf(piece.data as GreatBellData);
    if (lock === 'match' || (lock === 'chord' && others >= 3)) markRung(ctx, m.at);
  }
}

/** Rings `tone`: every bell of it that is not muffled, then the tone hums until round end (P3). */
function ring(ctx: Ctx, tone: Tone, origin: Origin | null, cause: RingCause = 'strike'): void {
  const ringing = ringMembers(ctx.s, tone);
  const bells = ringing.map((m) => ({ ...m.at }));
  if (bells.length === 0) return;
  withOrigin(ctx, origin, () => {
    const rung: RingEvent = {
      type: 'foundry:ring',
      data: { tone, bells: bells.map((b) => ({ ...b })), cause },
    };
    emit(ctx, rung);
    const hum: HumEvent = { type: 'foundry:hum', data: { tone, on: true } };
    emit(ctx, hum);
    const own = readBells(ctx);
    writeBells(ctx, {
      ...own,
      humming: TONES.filter((t) => t === tone || own.humming.includes(t)),
    });
    ringGreatBells(ctx, ringing);
    const pulsed = new Set<string>();
    for (const bell of bells) pulse(ctx, tone, bell, pulsed, origin);
  });
}

/** Locks 1 and 3 and an allied bell, at the settle point after a strike on a great bell (P6, P8). */
function resolveGreat(ctx: Ctx, entry: QueuedStrike, piece: TilePiece): void {
  const d = piece.data as GreatBellData;
  const origin = toOrigin(entry.origin);
  if (isMuffled(ctx.s, entry.at)) {
    const ev: MuffledEvent = {
      type: 'foundry:muffled',
      at: { ...entry.at },
      data: { tone: d.hang },
    };
    emit(ctx, ev);
    return;
  }
  if (d.allied) {
    alliedPulse(ctx, d.hang, entry.at, origin);
    if (!readBells(ctx).humming.includes(d.hang)) ring(ctx, d.hang, origin, 'hung');
    return;
  }
  const lock = lockOf(d);
  if (lock === 'reach') markRung(ctx, entry.at);
  if (lock === 'unison') {
    const strikers = readBells(ctx).struck[tileKey(entry.at.x, entry.at.y)] ?? [];
    const need = Math.min(2, Math.max(1, members(ctx.s).filter((m) => m.hp > 0).length));
    if (strikers.length >= need) markRung(ctx, entry.at);
  }
}

/** One queued strike: the tone and the muffle are read now, at the end of the action (P3, P4). */
function resolveStrike(ctx: Ctx, entry: QueuedStrike): void {
  if (entry.tone) {
    if (!readBells(ctx).humming.includes(entry.tone))
      ring(ctx, entry.tone, toOrigin(entry.origin), entry.cause ?? 'strike');
    return;
  }
  const piece = tileAt(ctx.s, entry.at).piece;
  if (piece && isGreat(piece)) {
    resolveGreat(ctx, entry, piece);
    return;
  }
  const tone = piece?.id === BELL_PIECE ? toneOfPiece(piece.id, piece.data) : null;
  if (!tone) return;
  if (isMuffled(ctx.s, entry.at)) {
    const ev: MuffledEvent = { type: 'foundry:muffled', at: { ...entry.at }, data: { tone } };
    emit(ctx, ev);
    return;
  }
  if (readBells(ctx).humming.includes(tone)) return;
  ring(ctx, tone, toOrigin(entry.origin));
}

const capped = (ctx: Ctx): boolean =>
  ctx.log.some((e) => e.type === 'fizzles' && e.reason === 'cap');

/**
 * P18: drains the queue in strike order; rings the strikes cause queue more behind it. A capped
 * action rings nothing more (the log stopped), and the queue is empty when this returns.
 */
export function settleBells(ctx: Ctx, own: BellsState): BellsState {
  if (!own.queue?.length) return own;
  if (capped(ctx)) {
    const dropped = withQueue(readBells(ctx), []);
    writeBells(ctx, dropped);
    return dropped;
  }
  for (;;) {
    const now = readBells(ctx);
    const [entry, ...rest] = now.queue ?? [];
    if (!entry) break;
    writeBells(ctx, withQueue(now, rest)); // out of the queue before it can be cut by the cap
    resolveStrike(ctx, entry);
  }
  return readBells(ctx);
}

/** Round end (`late`): settle what is left, then the hum and this round's strikers clear (P3, P8). */
export function bellsStep(ctx: Ctx, own: BellsState): BellsState {
  const settled = settleBells(ctx, own);
  for (const tone of settled.humming) {
    const ev: HumEvent = { type: 'foundry:hum', data: { tone, on: false } };
    emit(ctx, ev);
  }
  if (settled.humming.length === 0 && Object.keys(settled.struck).length === 0) return settled;
  return initBells();
}

/**
 * P4's "Next round" shapes: for each tone a queued strike would ring, an outline of the tiles its
 * bells would pulse. Empty when nothing is queued (a ring queued during a turn is settled before
 * the player looks), so the Ringer's telegraph (BF-6) reads `pulseTiles` directly.
 */
export function bellsPreview(s: BattleState, own: BellsState): PreviewShape[] {
  const out: PreviewShape[] = [];
  const seen = new Set<Tone>();
  for (const q of own.queue ?? []) {
    const piece = tileAt(s, q.at).piece;
    const tone = piece?.id === BELL_PIECE ? toneOfPiece(piece.id, piece.data) : null;
    if (!tone || seen.has(tone) || own.humming.includes(tone) || isMuffled(s, q.at)) continue;
    seen.add(tone);
    const cells = pulseTiles(s, tone);
    if (cells.length > 0) out.push({ kind: 'outline', cells, label: tone });
  }
  return out;
}
