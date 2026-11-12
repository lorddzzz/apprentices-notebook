import type { DistrictId } from '$data';
import { RIVALS, type TrickId } from '$data/rivals';
import { arrive } from '../arrival';
import { type Ctx, emit, ref } from '../ctx';
import { KIT } from '../districts/kit';
import type { Json, RoundEndSlot } from '../districts/types';
import type { GameEvent } from '../events';
import type { Coord } from '../grid';
import type { Harm, HarmVerdict } from '../harm';
import { blocksUnits, enemies, findUnit, inBoard, isAlive, tileAt, unitAt } from '../queries';
import type { BattleState, EnemyUnit, RivalIntent, Unit, UnitId } from '../types';
import type {
  LockLost,
  MarkTiming,
  ObjectRef,
  Resistance,
  TrickDef,
  TrickMark,
  TrickObject,
  TrickObjectId,
} from './types';
import { lockStatus } from './wick';

/**
 * The trick hook points (rivals plan P10, RV-11). A rival's signature trick (`RivalDef.trick`) is a
 * `TrickDef` found here by id; every engine call site asks this file, never the trick directly:
 * the action trick (`resolveTrickAction`), the per-round mark (`planTrickMark`/`runTrickMarks`),
 * the reaction before a hit (`trickBeforeHarm`), immunity (`trickResists`), DK's round-end slots
 * (`runTrickRoundEnd`) and death (`trickDied`). Tricks own objects with stable ids that share the
 * wick's lock rules (`objectLock`). All trick state is plain data on `RivalState`.
 */

// ── Registry ────────────────────────────────────────────
/**
 * Tricks the engine registers itself: none since RV-14 (the long wick is in the canals module's
 * `tricks`). Kept so the registry reads like the goals' (core, then the modules).
 */
export const coreTricks = (): readonly TrickDef[] => [];

const extra = new Map<string, TrickDef>();
let table: Record<string, TrickDef> | null = null;

/**
 * Every trick by id: the core list, then each district module's `tricks` (`DistrictModule.tricks`,
 * in registry order). Built on first use (district modules import the movers, so `KIT` is not
 * ready while this file loads). `registerTrick` entries are consulted before it.
 */
export function trickTable(): Record<string, TrickDef> {
  if (table) return table;
  const out: Record<string, TrickDef> = {};
  const modules = Object.values(KIT.modules);
  for (const t of [...coreTricks(), ...modules.flatMap((m) => m?.tricks ?? [])]) {
    if (Object.hasOwn(out, t.id)) throw new Error(`Trick '${t.id}' is registered twice`);
    out[t.id] = t;
  }
  table = out;
  return out;
}

/**
 * Adds a trick to the registry (a test fixture or a Lab prototype; a district lists its own in its
 * module's `tricks`). Ids are namespaced by district (`bridges:keystoneRight`) and may not repeat a
 * module's or an earlier registered id. Returns a function that removes it again.
 */
export function registerTrick<S extends Json>(def: TrickDef<S>): () => void {
  if (extra.has(def.id) || Object.hasOwn(trickTable(), def.id))
    throw new Error(`Trick '${def.id}' is registered twice`);
  // Hooks receive the state `init` made, so widening `S` to `Json` here is safe.
  const t = def as unknown as TrickDef;
  extra.set(def.id, t);
  return () => {
    if (extra.get(def.id) === t) extra.delete(def.id);
  };
}

/** A trick by id, or null. */
export const trickOf = (id: string): TrickDef | null => extra.get(id) ?? trickTable()[id] ?? null;

/** The signature trick of a living or dead rival unit, or null for any other unit. */
export function trickFor(u: Unit): TrickDef | null {
  if (u.kind !== 'enemy' || !u.rival) return null;
  const id = RIVALS[u.rival.rival]?.trick;
  return id ? trickOf(id) : null;
}

/** A rival with its trick, for the hooks below. */
interface Bearer {
  unit: EnemyUnit;
  trick: TrickDef;
}
const bearerOf = (u: Unit): Bearer | null => {
  const trick = trickFor(u);
  return trick && u.kind === 'enemy' && u.rival ? { unit: u, trick } : null;
};
/** Living rivals with tricks, in unit order. */
const bearers = (s: BattleState): Bearer[] =>
  enemies(s).flatMap((e) => {
    const b = isAlive(e) ? bearerOf(e) : null;
    return b ? [b] : [];
  });

// ── Trick events ────────────────────────────────────────
/**
 * The hooks' own log lines are district events of the trick's district (`canals:trickResists`),
 * so playback treats them like any district event until RV-13 draws them.
 */
export type TrickEventName =
  | 'trickResists'
  | 'trickMark'
  | 'trickMarkUsed'
  | 'trickObject'
  | 'trickObjectGone';

const districtOf = (id: TrickId): DistrictId => id.slice(0, id.indexOf(':')) as DistrictId;
const json = (c: Coord): Json => ({ x: c.x, y: c.y });

function trickEvent(ctx: Ctx, b: Bearer, name: TrickEventName, data: Record<string, Json>): void {
  emit(ctx, {
    type: `${districtOf(b.trick.id)}:${name}`,
    unit: ref(b.unit),
    at: { ...b.unit.pos },
    data: { trick: b.trick.id, ...data },
  });
}

/** Whether `e` is one of the hooks' events, optionally of one name. */
export const isTrickEvent = (e: GameEvent, name?: TrickEventName): boolean =>
  e.type.includes(':') &&
  (name
    ? e.type.endsWith(`:${name}`)
    : /:trick(Resists|Mark|MarkUsed|Object|ObjectGone)$/.test(e.type));

/** A trick object made counts as an effect (P3), as a sealed jar does. */
export const isTrickEffect = (e: GameEvent): boolean =>
  isTrickEvent(e, 'trickObject') || declaredEffectEvents().has(e.type);

let declared: ReadonlySet<string> | null = null;
/** Event types tricks declare as effects (`TrickDef.effectEvents`); registered tricks are read each call. */
function declaredEffectEvents(): ReadonlySet<string> {
  declared ??= new Set(Object.values(trickTable()).flatMap((t) => t.effectEvents ?? []));
  if (extra.size === 0) return declared;
  return new Set([...declared, ...[...extra.values()].flatMap((t) => t.effectEvents ?? [])]);
}

// ── Objects and locks ───────────────────────────────────
/** The next battle-unique trick object id: one past the highest any rival has issued. */
function nextObjectId(s: BattleState): TrickObjectId {
  let max = 0;
  for (const u of s.units)
    if (u.kind === 'enemy' && u.rival) max = Math.max(max, u.rival.objectSeq ?? 0);
  return max + 1;
}

/** Puts a new object of the rival's trick on the board (or off it: `at` null). Returns its id. */
export function makeTrickObject(
  ctx: Ctx,
  unit: EnemyUnit,
  at: Coord | null,
  data: Json,
): TrickObjectId {
  const b = bearerOf(unit);
  if (!b || !unit.rival) throw new Error(`${unit.id} has no trick to own objects`);
  const id = nextObjectId(ctx.s);
  unit.rival.objectSeq = id;
  const obj: TrickObject = {
    id,
    trick: b.trick.id,
    owner: unit.id,
    at: at ? { ...at } : null,
    data,
  };
  unit.rival.objects.push(obj);
  trickEvent(ctx, b, 'trickObject', { id, at: at ? json(at) : null });
  return id;
}

/** A trick object by id, wherever its owner is. */
export function trickObjectOf(s: BattleState, id: TrickObjectId): TrickObject | null {
  for (const u of s.units) {
    const found = u.kind === 'enemy' ? u.rival?.objects.find((o) => o.id === id) : undefined;
    if (found) return found;
  }
  return null;
}

/** Takes an object off its owner's list (erased, expired, spent). */
export function removeTrickObject(ctx: Ctx, id: TrickObjectId, why: LockLost): void {
  const obj = trickObjectOf(ctx.s, id);
  const owner = obj ? findUnit(ctx.s, obj.owner) : null;
  if (!obj || owner?.kind !== 'enemy' || !owner.rival) return;
  owner.rival.objects = owner.rival.objects.filter((o) => o.id !== id);
  if (why === 'met' || why === 'spent') owner.rival.lost = { ...owner.rival.lost, [id]: why };
  const b = bearerOf(owner);
  if (b) trickEvent(ctx, b, 'trickObjectGone', { id, why });
}

/** `met` or `spent` when its owner took it off for that reason, else `gone`. */
function lostWhy(s: BattleState, owner: UnitId, id: TrickObjectId): LockLost {
  const u = findUnit(s, owner);
  return (u?.kind === 'enemy' && u.rival?.lost?.[id]) || 'gone';
}

export type ObjectLock = { ok: true; at: Coord | null } | { ok: false; why: LockLost };

/**
 * Whether a locked order still holds (P10: every object shares the wick's lock rules). A jar uses
 * the wick's `lockStatus`; a trick object must still be on its owner's list. It never switches to
 * a replacement.
 */
export function objectLock(s: BattleState, owner: UnitId, lock: ObjectRef): ObjectLock {
  if (lock.kind === 'jar') {
    const c = lockStatus(s, owner, lock.id);
    return c.ok ? { ok: true, at: c.at } : c;
  }
  const obj = trickObjectOf(s, lock.id);
  if (!obj) return { ok: false, why: lostWhy(s, owner, lock.id) };
  return obj.owner === owner ? { ok: true, at: obj.at } : { ok: false, why: 'ownerChanged' };
}

/** An object made earlier in this resolve phase (the log since the last `phase` event). */
function madeThisPhase(ctx: Ctx, lock: ObjectRef): boolean {
  for (let i = ctx.log.length - 1; i >= 0; i--) {
    const e = ctx.log[i];
    if (!e || e.type === 'phase') return false;
    if (lock.kind === 'jar' && e.type === 'jarSealed' && e.id === lock.id) return true;
    if (lock.kind === 'trick' && isTrickEvent(e, 'trickObject') && dataId(e) === lock.id)
      return true;
  }
  return false;
}
const dataId = (e: GameEvent): number | null => {
  const d: Json | undefined = 'data' in e ? e.data : undefined;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const id = (d as { readonly [k: string]: Json }).id;
  return typeof id === 'number' ? id : null;
};

// ── Action trick ────────────────────────────────────────
/**
 * Resolves a telegraphed action trick through its lock (RV-3's rules, now generic): a locked
 * object made this phase or lost fails the order (`orderFails`, the caller's starved fallback);
 * otherwise the trick's `resolve` runs and its returned state is kept. False = no such trick.
 */
export function resolveTrickAction(
  ctx: Ctx,
  unit: EnemyUnit,
  intent: Extract<RivalIntent, { kind: 'trick' }>,
): boolean {
  const trick = trickOf(intent.trick);
  const r = unit.rival;
  if (!trick?.action || !r) return false;
  emit(ctx, { type: 'trickUsed', unit: ref(unit), trick: intent.trick, name: trick.name });
  const lock = intent.lock;
  if (lock) {
    // Placed and used in one turn is illegal: an object made in this resolve phase waits a turn.
    const held = objectLock(ctx.s, unit.id, lock);
    const check: ObjectLock =
      held.ok && madeThisPhase(ctx, lock) ? { ok: false, why: 'gone' } : held;
    if (!check.ok) {
      emit(ctx, { type: 'orderFails', unit: ref(unit), object: { ...lock }, why: check.why });
      return true;
    }
  }
  r.trick = trick.action.resolve(ctx, unit, intent, r.trick);
  return true;
}

// ── Per-round mark ──────────────────────────────────────
/**
 * Plans and shows the rival's mark for the coming resolve phase (enemy phase, after his action
 * telegraph). It is always shown (`trickMark`), never a surprise. A trick without a mark clears it.
 */
export function planTrickMark(ctx: Ctx, unit: EnemyUnit): void {
  const b = bearerOf(unit);
  const r = unit.rival;
  if (!b?.trick.mark || !r) return;
  const mark = isAlive(unit) ? b.trick.mark.plan(ctx.s, unit, r.trick) : null;
  r.mark = mark ? { data: mark.data, tiles: mark.tiles.map((c) => ({ ...c })) } : null;
  if (r.mark) {
    trickEvent(ctx, b, 'trickMark', {
      timing: b.trick.mark.timing,
      tiles: r.mark.tiles.map(json),
      mark: r.mark.data,
    });
  }
}

/** The mark a rival shows now, if any. */
export const trickMarkOf = (unit: EnemyUnit): TrickMark | null => unit.rival?.mark ?? null;

/**
 * Resolves every living rival's shown mark whose timing is `timing`, in unit order. A stun does
 * not cancel a mark (it is not his action); death does. The mark is spent either way. True when
 * any mark resolved.
 */
export function runTrickMarks(ctx: Ctx, timing: MarkTiming): boolean {
  let ran = false;
  for (const b of bearers(ctx.s)) {
    const r = b.unit.rival;
    const mark = r?.mark;
    if (!r || !mark || b.trick.mark?.timing !== timing) continue;
    r.mark = null;
    trickEvent(ctx, b, 'trickMarkUsed', { timing });
    r.trick = b.trick.mark.resolve(ctx, b.unit, mark, r.trick);
    ran = true;
  }
  return ran;
}

// ── Reaction (beforeHarm) ───────────────────────────────
const reacting = new WeakSet<Ctx>();

/** A free tile a relocation may end on. */
function canLand(s: BattleState, at: Coord, unit: Unit): boolean {
  if (!inBoard(s, at) || blocksUnits(tileAt(s, at))) return false;
  const there = unitAt(s, at);
  return !there || there.id === unit.id;
}

/**
 * The rival's `beforeHarm` answer to a hit (P10; damage.ts asks before the harm guards). A
 * relocation cancels the hit (`unharmed`), then moves him with a `moved` event under the trick's
 * cause through FD's pipeline; to a tile he cannot stand on it passes instead. Reactions do not
 * nest: a hit during a reaction (fire where he lands) is not answered again. Null = no reaction.
 */
export function trickBeforeHarm(
  ctx: Ctx,
  unit: Unit,
  harm: Harm,
): HarmVerdict | 'relocated' | null {
  const b = bearerOf(unit);
  const r = b?.unit.rival;
  if (!b?.trick.beforeHarm || !r || !isAlive(unit) || reacting.has(ctx)) return null;
  const answer = b.trick.beforeHarm(ctx, b.unit, harm, r.trick);
  if (answer.kind !== 'relocate') return answer.kind === 'pass' ? null : answer;
  if (!canLand(ctx.s, answer.to, unit)) return null;
  if (harm.kind === 'hit') {
    emit(ctx, { type: 'unharmed', unit: ref(unit), source: harm.source, harm: harm.harm });
  }
  const from = { ...unit.pos };
  const to = { ...answer.to };
  emit(ctx, {
    type: 'moved',
    unit: ref(unit, from),
    from,
    to,
    path: [{ ...to }],
    cause: answer.cause,
  });
  reacting.add(ctx);
  try {
    arrive(ctx, unit.id, [to], { cause: answer.cause, origin: null, landing: true });
  } finally {
    reacting.delete(ctx);
  }
  return 'relocated';
}

// ── Immunity (resists) ──────────────────────────────────
/**
 * Whether the unit's trick refuses `what` on this board (right of way). When it does, the refusal
 * is logged (`trickResists`) and the caller leaves the unit as it is.
 */
export function trickResists(ctx: Ctx, unit: Unit, what: Resistance): boolean {
  const b = bearerOf(unit);
  const r = b?.unit.rival;
  if (!b?.trick.resists || !r || !isAlive(unit)) return false;
  if (!b.trick.resists(ctx.s, b.unit, what, r.trick)) return false;
  trickEvent(ctx, b, 'trickResists', { what });
  return true;
}

// ── Round end and death ─────────────────────────────────
/** Runs each living rival's round-end step in `slot` (turn.ts calls it after DK's rule slot). */
export function runTrickRoundEnd(ctx: Ctx, slot: RoundEndSlot): void {
  for (const b of bearers(ctx.s)) {
    const r = b.unit.rival;
    if (!r || b.trick.roundEnd?.slot !== slot) continue;
    r.trick = b.trick.roundEnd.step(ctx, b.unit, r.trick);
  }
}

/** A rival just died (`kill`): its trick's `onDeath`, and its shown mark lapses. */
export function trickDied(ctx: Ctx, unit: Unit): void {
  const b = bearerOf(unit);
  const r = b?.unit.rival;
  if (!b || !r) return;
  if (r.mark) r.mark = null;
  if (b.trick.onDeath) r.trick = b.trick.onDeath(ctx, b.unit, r.trick);
}
