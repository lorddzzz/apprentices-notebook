import { ATTACKS } from '$data';
import { cloneData } from '../clone';
import type { Ctx } from '../ctx';
import { dealDamage } from '../damage';
import type { EventLog, GameEvent } from '../events';
import { type Coord, DIRS, sameCoord, step } from '../grid';
import { findUnit, isAlive, travel, unitAt } from '../queries';
import type { BattleState, EnemyUnit, RivalIntent, UnitId } from '../types';
import { outcomeOf } from './plan';
import { dryStrikeIntent, isEffect, isStarved, resolveRivalIntent } from './resolve';
import type { ObjectRef, RivalPreview } from './types';
import { jarLocation } from './wick';

/**
 * The telegraph preview (rivals plan P6, P7; RV-6): the shown action simulated now, on a clone,
 * from wherever the board stands. The intent is the locked order and never changes; the caster's
 * tile, the line in front of him, the targets and the jar the wick names are read fresh from the
 * state, so the player sees how a move changes his spell before confirming it. Pure: the real
 * state and its rng are never touched, and no rng is drawn here.
 */

/** The preview plus whether the shown action would be starved (the fallback ring's "if starved"). */
export interface RivalPreviewDetail extends RivalPreview {
  starved: boolean;
}

const EMPTY: Omit<RivalPreviewDetail, 'fallbackLive'> = {
  path: [],
  landing: null,
  targets: [],
  events: [],
  opens: [],
  starved: false,
};

/** The fallback tile still holds a living apprentice next to the caster. */
function fallbackIsLive(s: BattleState, e: EnemyUnit, at: Coord | null): boolean {
  if (!at || !DIRS.some((d) => sameCoord(step(e.pos, d), at))) return false;
  const u = unitAt(s, at);
  return u?.kind === 'member' && isAlive(u);
}

/** Units the effects named, except the caster, in the order the log names them. */
function targetsOf(events: EventLog, self: UnitId): UnitId[] {
  const out: UnitId[] = [];
  const add = (v: unknown) => {
    if (typeof v !== 'object' || v === null || !('id' in v) || typeof v.id !== 'string') return;
    if (v.id !== self && !out.includes(v.id)) out.push(v.id);
  };
  for (const e of events) {
    if (!isEffect(e)) continue;
    if ('unit' in e) add(e.unit);
    if ('target' in e) add(e.target);
  }
  return out;
}

/** Where a cast's line goes: its first flight, else a tile aim, else nowhere. */
function flightOf(
  events: EventLog,
  intent: Extract<RivalIntent, { kind: 'cast' }>,
  self: Coord,
): { path: Coord[]; landing: Coord | null } {
  const flight = events.find(
    (e): e is Extract<GameEvent, { type: 'lands' | 'stopped' }> =>
      e.type === 'lands' || e.type === 'stopped',
  );
  if (flight) return { path: flight.path.map((c) => ({ ...c })), landing: { ...flight.at } };
  if (intent.aim.kind === 'tile') return { path: [], landing: { ...intent.aim.at } };
  if (intent.aim.kind === 'self') return { path: [], landing: { ...self } };
  return { path: [], landing: null };
}

/** The dry strike: an ordinary attack on the tile it faces, resolved on the clone. */
function previewStrike(
  state: BattleState,
  unit: UnitId,
  intent: Extract<RivalIntent, { kind: 'rivalStrike' }>,
): RivalPreviewDetail | null {
  const s = cloneData(state);
  const e = findUnit(s, unit);
  if (e?.kind !== 'enemy') return null;
  const ctx: Ctx = { s, log: [], cast: null, meta: {}, footnotes: {} };
  const att = ATTACKS[dryStrikeIntent(e, intent).attack];
  const dir = intent.dir;
  const done = (path: Coord[], landing: Coord | null): RivalPreviewDetail => ({
    ...EMPTY,
    path,
    landing,
    targets: targetsOf(ctx.log, unit),
    events: ctx.log,
    fallbackLive: false,
  });
  if (att.kind === 'adjacent') {
    const at = step(e.pos, dir);
    const victim = unitAt(s, at);
    if (victim) dealDamage(ctx, victim, att.damage, att.name, [], { heading: dir, at: e.pos });
    return done([], at);
  }
  const r = travel(s, e.pos, dir, att.range, e.id);
  if (r.reason === 'unit')
    dealDamage(ctx, r.unit, att.damage, att.name, [], { heading: dir, at: e.pos });
  if (r.reason === 'none') return done([], null);
  return done(
    r.path.map((c) => ({ ...c })),
    { ...r.stop },
  );
}

/**
 * What the rival's shown action would do if it resolved on `state` now (P6), or null when `unit`
 * is not a living rival with a cast, trick or dry-strike intent on show. A stunned rival's action
 * is skipped, with no fallback. Safe to call on any state, including a confirm preview's result.
 */
export function rivalPreview(state: BattleState, unit: UnitId): RivalPreviewDetail | null {
  const shown = findUnit(state, unit);
  if (shown?.kind !== 'enemy' || !shown.rival || !isAlive(shown) || !shown.intent) return null;
  const intent = shown.intent;
  if (intent.kind === 'rivalStrike') return previewStrike(state, unit, intent);
  if (intent.kind !== 'cast' && intent.kind !== 'trick') return null;
  if (shown.stunned) return { ...EMPTY, fallbackLive: false };
  const fallbackLive = fallbackIsLive(state, shown, intent.fallback);

  const ctx: Ctx = { s: cloneData(state), log: [], cast: null, meta: {}, footnotes: {} };
  const e = findUnit(ctx.s, unit);
  if (e?.kind !== 'enemy') return null;
  const before = cloneData(ctx.s);
  // The fallback is shown separately (`fallbackLive`), so the dry run never strikes.
  resolveRivalIntent(ctx, e, { ...cloneData(intent), fallback: null });
  const events = ctx.log;
  const outcome = outcomeOf(events, unit, before);
  const starved = isStarved(events);
  const targets = targetsOf(events, unit);

  if (intent.kind === 'cast') {
    const { path, landing } = flightOf(events, intent, shown.pos);
    return { path, landing, targets, events, opens: outcome.opened, fallbackLive, starved };
  }
  // A trick names an object: its landing is where that object stands in this state, so a jar's
  // drift moves the highlight. A lost order has no landing and opens nothing.
  const lock = intent.lock;
  const found = lock?.kind === 'jar' ? jarLocation(state, lock.id) : null;
  const opens: ObjectRef[] =
    lock && events.some((ev) => ev.type === 'jarOpened') ? [{ ...lock }] : [...outcome.opened];
  return {
    path: [],
    landing: found ? { ...found.at } : null,
    targets,
    events,
    opens,
    fallbackLive,
    starved,
  };
}
