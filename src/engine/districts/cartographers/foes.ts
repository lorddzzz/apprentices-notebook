import { CARTOGRAPHERS_FOE_TUNING } from '$data/districts/cartographers/foes';
import { candidatesOf, nearestMember } from '../../ai';
import { hasTrait, relocateAll } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage } from '../../damage';
import { byReadingOrder, type Coord, key, label, neighbors4 } from '../../grid';
import { guardCancels } from '../../harm';
import { spendMark } from '../../marks';
import { enemyWalk } from '../../movement';
import { removeFromRoom } from '../../outOfRoom';
import {
  coordOf,
  distanceField,
  enemies,
  findUnit,
  inBoard,
  isAlive,
  tileAt,
  unitAt,
} from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, MemberUnit, Unit } from '../../types';
import type { BoardRule, FoeBehaviour, PreviewShape, RuleId } from '../types';
import { guildHandPreview } from './guildHand';
import {
  BLANK_PIECE,
  ERASER_BEHAVIOUR,
  GUILD_HAND_RULE_ID,
  PENCIL_PIECE,
  SURVEYOR_BEHAVIOUR,
  TRACER_BEHAVIOUR,
  type UndrawnEvent,
} from './types';

/**
 * The guild's hands (cartographers-plan P7-P9; CG-5, CG-6): the Surveyor swaps two units and
 * drags apprentices onto pencil about to be rubbed out, the Eraser rubs one tile (or un-draws
 * pencil early) and the Tracer copies its apprentice's damage a round late, mirrored. Each plans a
 * telegraph in the enemy phase and acts on it at the end of the player's turn, on the kit's
 * behaviour registry. No new event types: the swap is the core `swapped`, the un-draw is
 * `cartographers:undrawn`, the rub is `erased`.
 */

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const where = (c: Coord | undefined): string => (c ? label(c) : '?');
const sameTile = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

/** A telegraph of a behaviour foe as the board stands, if it has one. */
const telegraphOf = (e: EnemyUnit): Telegraph | null =>
  e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;

const isApprentice = (u: Unit): boolean => u.kind === 'member';

/** Walks toward the nearest apprentice by the shortest way. */
function approach(ctx: Ctx, e: EnemyUnit): void {
  const target = nearestMember(ctx.s, e);
  if (!target) return;
  walkToward(ctx, e, target.pos);
}

/** Walks to the candidate nearest `goal` by walking distance (ties: shorter walk, reading order). */
function walkToward(ctx: Ctx, e: EnemyUnit, goal: Coord): void {
  const field = distanceField(ctx.s, goal, e.id);
  const dist = (c: Coord): number => field.get(key(c)) ?? Number.POSITIVE_INFINITY;
  let best: { at: Coord; path: Coord[] } | null = null;
  for (const c of candidatesOf(ctx.s, e, true)) {
    if (!best) {
      best = c;
      continue;
    }
    const d = dist(c.at) - dist(best.at);
    if (d < 0 || (d === 0 && c.path.length < best.path.length)) best = c;
    else if (d === 0 && c.path.length === best.path.length && byReadingOrder(c.at, best.at) < 0)
      best = c;
  }
  enemyWalk(ctx, e, best?.path ?? []);
}

/** The pencil that falls to the rubber at this round's end (the hand's plan, or the board's fixed fates). */
function rubDueTiles(s: BattleState): Set<string> {
  const listed = !!s.rules && Object.hasOwn(s.rules, GUILD_HAND_RULE_ID);
  const own = listed ? (s.rules?.[GUILD_HAND_RULE_ID] ?? null) : { planned: s.round };
  return new Set(
    guildHandPreview(s, own).flatMap((sh) =>
      sh.kind === 'tile' && sh.tone === 'erased' ? [key(sh.at)] : [],
    ),
  );
}

const besideBlank = (s: BattleState, at: Coord): boolean =>
  neighbors4(at).some((n) => inBoard(s, n) && tileAt(s, n).piece?.id === BLANK_PIECE);

// ── The surveyor (P7) ───────────────────────────────────

const SURVEY_RANGE = CARTOGRAPHERS_FOE_TUNING.surveyor.range;

/** A unit the swap may name: alive, in the room, and not held, anchored or flying (party §1). */
const swappable = (u: Unit): boolean =>
  isAlive(u) && !u.bystander && u.held === 0 && !hasTrait(u, 'anchored') && !hasTrait(u, 'flies');

/** Why a named unit cannot swap now, for the plan and the action alike. */
const inReach = (e: EnemyUnit, u: Unit): boolean => manhattan(u.pos, e.pos) <= SURVEY_RANGE;

/**
 * P7's routine: of the pairs in range, the one that puts an apprentice on pencil due to rub (most
 * gained first), else beside blank paper, else the nearest apprentice with the farthest foe. A tie
 * keeps the earlier pair in unit order.
 */
export function aimSurvey(s: BattleState, e: EnemyUnit): [Unit, Unit] | null {
  const near = s.units.filter((u) => u.id !== e.id && swappable(u) && inReach(e, u));
  const rub = rubDueTiles(s);
  const gain = (a: Unit, b: Unit, bad: (c: Coord) => boolean): number =>
    [
      [a, b],
      [b, a],
    ].reduce(
      (sum, [from, to]) =>
        from && to && isApprentice(from)
          ? sum + (bad(to.pos) ? 1 : 0) - (bad(from.pos) ? 1 : 0)
          : sum,
      0,
    );
  let best: { pair: [Unit, Unit]; tier: number; gain: number } | null = null;
  near.forEach((a, i) => {
    for (const b of near.slice(i + 1)) {
      const onRub = gain(a, b, (c) => rub.has(key(c)));
      const byBlank = onRub > 0 ? 0 : gain(a, b, (c) => besideBlank(s, c));
      const tier = onRub > 0 ? 1 : byBlank > 0 ? 2 : 0;
      if (tier === 0) continue;
      const g = tier === 1 ? onRub : byBlank;
      if (!best || tier < best.tier || (tier === best.tier && g > best.gain))
        best = { pair: [a, b], tier, gain: g };
    }
  });
  if (best) return (best as { pair: [Unit, Unit] }).pair;
  const apprentices = near
    .filter(isApprentice)
    .sort(
      (a, b) => manhattan(a.pos, e.pos) - manhattan(b.pos, e.pos) || byReadingOrder(a.pos, b.pos),
    );
  const foes = near
    .filter((u) => !isApprentice(u))
    .sort(
      (a, b) => manhattan(b.pos, e.pos) - manhattan(a.pos, e.pos) || byReadingOrder(a.pos, b.pos),
    );
  const a = apprentices[0];
  const f = foes[0];
  return a && f ? [a, f] : null;
}

/** The two named units, if both can still be swapped from where the surveyor stands. */
function namedPair(s: BattleState, e: EnemyUnit, tg: Telegraph): [Unit, Unit] | null {
  const [a, b] = tg.units.map((id) => findUnit(s, id));
  if (!a || !b || a.id === b.id) return null;
  return swappable(a) && swappable(b) && inReach(e, a) && inReach(e, b) ? [a, b] : null;
}

export const SURVEYOR_FOE: FoeBehaviour = {
  id: SURVEYOR_BEHAVIOUR,
  move: approach,
  plan(s, e): Telegraph | null {
    const pair = aimSurvey(s, e);
    if (!pair) return null;
    return {
      label: 'swap',
      tiles: pair.map((u) => ({ ...u.pos })),
      units: pair.map((u) => u.id),
    };
  },
  /** The swap follows the units (R7): it fails, plainly, if either is out of range, held, anchored or flying. */
  resolve(ctx, e, tg) {
    const pair = namedPair(ctx.s, e, tg);
    if (!pair) {
      emit(ctx, { type: 'miss', source: 'Swap' });
      return;
    }
    const [a, b] = pair;
    if (guardCancels(ctx, a, { kind: 'swap', unit: a.id, harm: null }, 'Swap')) return;
    if (guardCancels(ctx, b, { kind: 'swap', unit: b.id, harm: null }, 'Swap')) return;
    const from = { ...a.pos };
    const to = { ...b.pos };
    emit(ctx, {
      type: 'swapped',
      unit: ref(a),
      with: ref(b),
      from,
      to,
      path: [{ ...to }],
      cause: 'swap',
    });
    // Both are lifted and set down, then arrive: the first named first, then the second.
    relocateAll(
      ctx,
      [
        { unit: a.id, from, to, path: [to] },
        { unit: b.id, from: to, to: from, path: [from] },
      ],
      'swap',
      null,
    );
  },
  /** Where each unit would stand after the swap, as the board stands. */
  preview(s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const pair = tg ? namedPair(s, e, tg) : null;
    if (!pair) return [];
    const [a, b] = pair;
    return [
      { kind: 'ghost', unit: a.id, from: { ...a.pos }, to: { ...b.pos } },
      { kind: 'ghost', unit: b.id, from: { ...b.pos }, to: { ...a.pos } },
    ];
  },
  describe: (tg) => `swap ${where(tg.tiles[0])} with ${where(tg.tiles[1])}`,
};

// ── The eraser (P8) ─────────────────────────────────────

/** Un-draws a pencil tile at once: it turns blank, what it held is gone and whoever stood there is erased. */
export function undrawPencil(ctx: Ctx, at: Coord, by: UndrawnEvent['data']['by']): void {
  const tile = tileAt(ctx.s, at);
  const units = ctx.s.units.filter((u) => isAlive(u) && sameTile(u.pos, at));
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

/** Rubs what a tile holds as the Erase rune's parts would go, with no record: its state, its jar, the mark of the unit there. */
function rubParts(ctx: Ctx, at: Coord): boolean {
  const tile = tileAt(ctx.s, at);
  const u = unitAt(ctx.s, at);
  let any = false;
  const gone = (what: string): void => {
    any = true;
    emit(ctx, { type: 'erased', at: { ...at }, what });
  };
  if (u?.mark) {
    const deep = u.mark.deep;
    spendMark(ctx, u);
    gone(deep ? 'deep mark' : 'mark');
  }
  if (tile.state) {
    const what = tile.state.id.replace(/([A-Z])/g, ' $1').toLowerCase();
    tile.state = null;
    gone(what);
  }
  if (tile.jar) {
    tile.jar = null;
    gone('jar');
  }
  return any;
}

const isPencil = (s: BattleState, at: Coord): boolean => tileAt(s, at).piece?.id === PENCIL_PIECE;

/**
 * P8's routine: an apprentice's jar or mark first, else pencil under an apprentice; the nearest
 * such tile to the eraser (ties in reading order). Nothing worth rubbing: it idles.
 */
export function aimErase(s: BattleState, e: EnemyUnit): Coord | null {
  const mine = (jarOwner: string | undefined): boolean => {
    const o = jarOwner ? findUnit(s, jarOwner) : null;
    return !!o && o.kind === 'member';
  };
  const first: Coord[] = [];
  const second: Coord[] = [];
  s.tiles.forEach((t, i) => {
    const at = coordOf(s, i);
    const u = unitAt(s, at);
    const apprentice = u && isApprentice(u);
    if (mine(t.jar?.owner) || (apprentice && u.mark)) first.push(at);
    else if (apprentice && isPencil(s, at)) second.push(at);
  });
  const nearest = (cs: Coord[]): Coord | null =>
    [...cs].sort((a, b) => manhattan(a, e.pos) - manhattan(b, e.pos) || byReadingOrder(a, b))[0] ??
    null;
  return nearest(first) ?? nearest(second);
}

export const ERASER_FOE: FoeBehaviour = {
  id: ERASER_BEHAVIOUR,
  move: approach,
  plan(s, e): Telegraph | null {
    const at = aimErase(s, e);
    if (!at) return null;
    const u = unitAt(s, at);
    return { label: 'erase', tiles: [{ ...at }], units: u && isApprentice(u) ? [u.id] : [] };
  },
  /** Un-draws the pencil, else rubs what the tile holds; whatever stands there is erased with the pencil. */
  resolve(ctx, _e, tg) {
    const at = tg.tiles[0];
    if (!at || !inBoard(ctx.s, at)) return;
    if (isPencil(ctx.s, at)) {
      undrawPencil(ctx, at, 'eraser');
      return;
    }
    if (!rubParts(ctx, at)) emit(ctx, { type: 'miss', source: 'Erase' });
  },
  preview(s, e): readonly PreviewShape[] {
    const at = telegraphOf(e)?.tiles[0];
    if (!at || !inBoard(s, at)) return [];
    return [{ kind: 'tile', at: { ...at }, tone: 'erased' }];
  },
  describe: (tg) => `erase ${where(tg.tiles[0])}`,
};

// ── The tracer (P9) ─────────────────────────────────────

/**
 * Its memory is a district rule's state (the units have no data of their own): which apprentice
 * each tracer is bound to, and the tiles each apprentice damaged, stamped with the round. The rule
 * is listed with the hall's rooms (a district rule) and by a Lab scenario's `rules`; without it a
 * tracer binds to the nearest apprentice each time and nothing is recorded.
 */
export const TRACER_RULE_ID: RuleId = 'cartographers:tracer';
export type TracerState = {
  bound: { [tracer: string]: string };
  hits: { round: number; by: string; x: number; y: number }[];
};

const tracerState = (raw: unknown): TracerState => {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const bound: TracerState['bound'] = {};
  if (r.bound && typeof r.bound === 'object' && !Array.isArray(r.bound)) {
    for (const [k, v] of Object.entries(r.bound)) if (typeof v === 'string') bound[k] = v;
  }
  const hits: TracerState['hits'] = [];
  if (Array.isArray(r.hits)) {
    for (const h of r.hits as unknown[]) {
      const o = h && typeof h === 'object' ? (h as Record<string, unknown>) : null;
      if (
        o &&
        typeof o.round === 'number' &&
        typeof o.by === 'string' &&
        typeof o.x === 'number' &&
        typeof o.y === 'number'
      )
        hits.push({ round: o.round, by: o.by, x: o.x, y: o.y });
    }
  }
  return { bound, hits };
};

const tracers = (s: BattleState): EnemyUnit[] =>
  enemies(s).filter((u) => u.def === 'tracer' && isAlive(u));

/** Binds each living tracer not yet bound to the nearest apprentice (at spawn, or the first settle after). */
function bindTracers(s: BattleState, st: TracerState): TracerState {
  const bound = { ...st.bound };
  for (const t of tracers(s)) {
    if (bound[t.id]) continue;
    const m = nearestMember(s, t);
    if (m) bound[t.id] = m.id;
  }
  return { ...st, bound };
}

/** The apprentice a tracer is tethered to: its bound one while she lives, else the nearest. */
export function tracerTether(s: BattleState, e: EnemyUnit): MemberUnit | null {
  const id = tracerState(s.rules?.[TRACER_RULE_ID]).bound[e.id];
  const m = id ? findUnit(s, id) : null;
  return m && m.kind === 'member' && isAlive(m) ? m : nearestMember(s, e);
}

/** The x-mirror of a tile (Quicksilver's mirror). */
const mirrorOf = (s: BattleState, c: Coord): Coord => ({ x: s.width - 1 - c.x, y: c.y });

/** The tiles `by` damaged during last round's turn, mirrored: reading order, one entry each. */
export function mirroredHits(s: BattleState, by: string): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const h of tracerState(s.rules?.[TRACER_RULE_ID]).hits) {
    if (h.by !== by || h.round !== s.round - 1) continue;
    const m = mirrorOf(s, { x: h.x, y: h.y });
    if (!inBoard(s, m) || seen.has(key(m))) continue;
    seen.add(key(m));
    out.push(m);
  }
  return out.sort(byReadingOrder);
}

/** Each draft's log is read once: settle runs several times per action over the same log. */
const readTo = new WeakMap<object, number>();

function recordHits(ctx: Ctx, st: TracerState): TracerState {
  const from = readTo.get(ctx.log) ?? 0;
  readTo.set(ctx.log, ctx.log.length);
  const tethered = new Set(Object.values(st.bound));
  const hits = [...st.hits];
  for (const e of ctx.log.slice(from)) {
    if (e.type !== 'damage' || e.amount <= 0 || !e.origin || !tethered.has(e.origin.caster))
      continue;
    const { x, y } = e.target.at;
    const dup = hits.some(
      (h) => h.round === ctx.s.round && h.by === e.origin?.caster && h.x === x && h.y === y,
    );
    if (!dup) hits.push({ round: ctx.s.round, by: e.origin.caster, x, y });
  }
  return { ...st, hits };
}

export const TRACER_RULE: BoardRule<TracerState> = {
  id: TRACER_RULE_ID,
  slot: 'late',
  order: 70,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: (s) => bindTracers(s, { bound: {}, hits: [] }),
  /** Records what the tethered apprentices damage, as it lands (a cast's end, an action's end). */
  settle: (ctx, own) => recordHits(ctx, bindTracers(ctx.s, tracerState(own))),
  /** A round end drops what the strikes just read: only this round's damage is kept for the next. */
  step: (ctx, own) => {
    const st = tracerState(own);
    return { ...st, hits: st.hits.filter((h) => h.round >= ctx.s.round) };
  },
};

export const TRACER_FOE: FoeBehaviour = {
  id: TRACER_BEHAVIOUR,
  /** Walks toward the mirror of its apprentice's tile. */
  move(ctx, e) {
    const m = tracerTether(ctx.s, e);
    if (m) walkToward(ctx, e, mirrorOf(ctx.s, m.pos));
  },
  /** The mirror of every tile its apprentice damaged last turn; with none, only the tether shows. */
  plan(s, e): Telegraph | null {
    const m = tracerTether(s, e);
    if (!m) return null;
    const tiles = mirroredHits(s, m.id);
    return { label: tiles.length > 0 ? 'trace' : 'tether', tiles, units: [m.id] };
  },
  resolve(ctx, e, tg) {
    if (tg.label !== 'trace') return;
    let hit = false;
    for (const at of tg.tiles) {
      const u = unitAt(ctx.s, at);
      if (!u || u.id === e.id || u.bystander) continue;
      hit = true;
      dealDamage(ctx, u, CARTOGRAPHERS_FOE_TUNING.tracer.strike, 'Trace');
    }
    if (!hit) emit(ctx, { type: 'miss', source: 'Trace' });
  },
  preview(_s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    if (tg?.label !== 'trace') return [];
    return tg.tiles.map((at): PreviewShape => ({ kind: 'tile', at: { ...at }, tone: 'warn' }));
  },
  describe: (tg) =>
    tg.label === 'trace' ? `trace ${tg.tiles.map(where).join(' ')}` : 'follow its apprentice',
};

/** The guild's hands, for the district module. */
export const CARTOGRAPHERS_FOES: readonly FoeBehaviour[] = [SURVEYOR_FOE, ERASER_FOE, TRACER_FOE];
