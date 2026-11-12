import { type LineId, TUNING } from '$data';
import { arrive, hasTrait } from './arrival';
import { markUnit } from './bursts';
import { type Ctx, emit, ref, withLine, withOrigin } from './ctx';
import { dealDamage, gainShield, kill } from './damage';
import { hasFootnote } from './footnotes';
import {
  byReadingOrder,
  type Coord,
  type Dir,
  neighbors4,
  opposite,
  sameCoord,
  step,
} from './grid';
import { guardCancels } from './harm';
import { notify } from './hooks';
import { landKindFree, netCollar } from './mix';
import { pieceBlocksUnits, strikePiece } from './pieces';
import { blocksUnits, inBoard, isCloud, isPlate, tileAt, unitAt } from './queries';
import { trickBeforeHarm, trickResists } from './rivals/tricks';
import type { BattleState, Layer, Origin, Tile, Unit } from './types';

export interface PushResult {
  moved: number;
  end: Coord;
  crushed: string | 'wall' | 'plate' | null; // a UnitId, or what it hit
  dropped: boolean;
}

/**
 * Push options. `crush: false` stops short of what is in the way without a crush; `as: 'pull'` is
 * AH's Pull (P4): cause `pull`, its own fine print, and a miss when it can't move at all.
 */
export interface PushOptions {
  crush?: boolean;
  as?: 'pull';
  /** A Splash's unit targets: `splash-unit-ripple` and `splash-unit-press` read them. */
  area?: readonly string[];
  /** A Vat's Shove: `vat-edge-pin` and `vat-edge-rebound` answer the room's edge. */
  vat?: true;
  /** `touch-member-ram`: a crush into a unit reverses its split (it takes the full crush). */
  ram?: true;
  /** Mortar: how many of the pushed tiles are its extra ones (the Mortar footnotes read it). */
  bonus?: number;
}

/** Layers a pushed land unit slides across (design §4.2, §4.4). */
const SLICK: ReadonlySet<Layer['id']> = new Set(['slick', 'pool', 'greaseFog']);

const flies = (u: Unit): boolean => hasTrait(u, 'flies');
const swims = (u: Unit): boolean => hasTrait(u, 'swims');
/** A floating unit (the barge's crate, CN P3) is set on water, never dropped into it. */
const floatsOn = (u: Unit): boolean => hasTrait(u, 'floats');

/** An anchored foe never moves; a swimmer can't be pushed out of the water (K-13). */
const heldBack = (u: Unit, toWater: boolean): boolean =>
  hasTrait(u, 'anchored') || (swims(u) && !toWater);

/** What stopped the push: something to crush against, or a fall. */
export type Stop =
  | { kind: 'crush'; into: Unit | 'wall' | 'plate'; line: LineId | null; at: Coord }
  | { kind: 'drop'; line: LineId; at: Coord };

/** The first reason the unit can't enter `next` (P3, P19, P28), or null if it can. */
function stopAt(ctx: Ctx, unit: Unit, from: Coord, next: Coord): Stop | null {
  const s = ctx.s;
  if (!inBoard(s, next)) {
    if (heldBack(unit, false)) return { kind: 'crush', into: 'wall', line: null, at: next };
    // Fliers never fall: a drop edge is a wall to them.
    if (s.edge === 'drop' && !flies(unit)) return { kind: 'drop', line: 'shove:drop', at: from };
    return { kind: 'crush', into: 'wall', line: 'shove:edge', at: next };
  }
  const tile = tileAt(s, next);
  if (heldBack(unit, tile.terrain.water !== null)) {
    return { kind: 'crush', into: 'wall', line: null, at: next };
  }
  // A solid piece crushes like a plate but has no plate's fine print or wear.
  if (pieceBlocksUnits(tile) && !isPlate(tile) && !tile.terrain.gate && !tile.terrain.grate) {
    return { kind: 'crush', into: 'plate', line: null, at: next };
  }
  if (blocksUnits(tile)) {
    const line: LineId | null = tile.state?.id === 'wall' ? 'shove:wall' : 'shove:plate';
    return { kind: 'crush', into: 'plate', line, at: next };
  }
  const other = unitAt(s, next);
  if (other) return { kind: 'crush', into: other, line: 'shove:unit', at: next };
  if (flies(unit)) return null;
  if (tile.terrain.water !== null && !swims(unit) && !floatsOn(unit)) {
    return { kind: 'drop', line: 'shove:water', at: next };
  }
  if (tile.terrain.drop) return { kind: 'drop', line: 'shove:drop', at: next };
  return null;
}

/** Plates and Walls break after a few crushes; layout plates (no hits recorded, permanent) never. */
export function wearPlate(ctx: Ctx, at: Coord, wear = 1): boolean {
  const tile: Tile = tileAt(ctx.s, at);
  const layer = tile.state;
  if (!layer || !isPlate(tile)) return false;
  if (layer.hits === undefined && layer.rounds === 0 && !layer.set) return false;
  const left = (layer.hits ?? (layer.id === 'wall' ? 2 : 1)) - wear;
  if (left > 0) {
    layer.hits = left;
    return false;
  }
  tile.state = null;
  emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
  return true;
}

/** The direction from a tile out to the unit beside it. */
function awayFrom(from: Coord, to: Coord): Dir {
  if (to.x !== from.x) return to.x < from.x ? 'left' : 'right';
  return to.y < from.y ? 'up' : 'down';
}

/**
 * What a crushed wall does next (footnotes): `shove-wall-ring` pushes every other unit touching it
 * one tile away, unharmed; `shove-wall-through` carries the crushed unit into the tile of a wall
 * that broke.
 */
function wallAnswers(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  wall: Coord,
  broke: boolean,
  origin: Origin | null,
): void {
  if (hasFootnote(ctx, 'shove-wall-ring')) {
    const beside = neighbors4(wall)
      .sort(byReadingOrder)
      .flatMap((at) => unitAt(ctx.s, at) ?? [])
      .filter((u) => u.id !== unit.id && u.hp > 0);
    for (const u of beside) push(ctx, u, awayFrom(wall, u.pos), 1, origin, { crush: false });
  }
  if (broke && unit.hp > 0 && hasFootnote(ctx, 'shove-wall-through')) {
    push(ctx, unit, dir, 1, origin, { crush: false });
  }
}

function crush(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  moved: number,
  stop: Stop & { kind: 'crush' },
  origin: Origin | null,
  opts: PushOptions = {},
): void {
  const other = typeof stop.into === 'string' ? null : stop.into;
  // `splash-unit-press`: two Splash targets crush each other for the full crush.
  const press =
    other !== null &&
    opts.area?.includes(unit.id) === true &&
    opts.area.includes(other.id) &&
    hasFootnote(ctx, 'splash-unit-press');
  const ram = other !== null && opts.ram === true;
  // Footnote `shove-wall-soft` (P39): a wall crush skips the per-tile damage.
  const softWall = stop.line === 'shove:wall' && hasFootnote(ctx, 'shove-wall-soft');
  const heavyWall = stop.line === 'shove:wall' && hasFootnote(ctx, 'shove-wall-heavy');
  const damage =
    TUNING.crushBase + (softWall ? 0 : TUNING.crushPerTile * moved) + (heavyWall ? 1 : 0);
  // `brass-cap-net`: a plate you cast catches the unit: no crush, and it is collared.
  const netted = stop.into === 'plate' ? tileAt(ctx.s, stop.at).state : null;
  if (netted?.origin && hasFootnote(ctx, 'brass-cap-net')) {
    const catchIt = (): void => netCollar(ctx, unit, netted.origin);
    if (stop.line) withLine(ctx, stop.line, catchIt);
    else catchIt();
    return;
  }
  const body = (): void => {
    emit(ctx, {
      type: 'crush',
      unit: ref(unit),
      into: other ? ref(other) : (stop.into as 'wall' | 'plate'),
      damage,
      at: { ...stop.at },
      dir,
    });
    dealDamage(ctx, unit, ram ? TUNING.crushStruck : damage, 'Crush', [], {
      heading: dir,
      at: null,
    });
    if (other) {
      dealDamage(ctx, other, ram || press ? damage : TUNING.crushStruck, 'Crush', [], {
        heading: dir,
        at: { ...unit.pos },
      });
      // `shove-cap-chain`: the unit crushed against is shoved one tile too (once, no crush).
      if (other.hp > 0 && hasFootnote(ctx, 'shove-cap-chain')) {
        push(ctx, other, dir, 1, origin, { crush: false });
      }
    } else if (stop.into === 'plate') {
      // `steam-kettle-press`: a unit crushed against a kettle is scalded for 1 more.
      if (tileAt(ctx.s, stop.at).state?.id === 'kettle' && hasFootnote(ctx, 'steam-kettle-press')) {
        withLine(ctx, 'steam:kettle', () =>
          dealDamage(ctx, unit, 1, 'Kettle', [], {
            heading: dir,
            at: { ...stop.at },
            harm: 'steam',
          }),
        );
      }
      // `shove-wall-soft` wears the wall by two crushes.
      const broke = wearPlate(ctx, stop.at, softWall ? 2 : 1);
      if (stop.line === 'shove:wall') wallAnswers(ctx, unit, dir, stop.at, broke, origin);
    }
    // A crush strikes a piece on either tile: under the pushed unit, and the one it hit (P10).
    strikePiece(ctx, unit.pos, 'push');
    if (inBoard(ctx.s, stop.at)) strikePiece(ctx, stop.at, 'push');
  };
  if (stop.line) withLine(ctx, stop.line, body);
  else body();
}

/** `splash-unit-ripple`: the unit in the way moves a tile instead; true when it did. */
function ripple(ctx: Ctx, blocker: Unit, dir: Dir, origin: Origin | null): boolean {
  let moved = false;
  withLine(ctx, 'shove:unit', () => {
    moved = push(ctx, blocker, dir, 1, origin, { crush: false }).moved > 0;
  });
  return moved;
}

/**
 * What a Mortar'd push does once it is over (the push's own line, `mortar:unit`, is already set):
 * `mortar-unit-guard` (a member takes a Guard of 1 where it stops; a fall is no stop), `-behind`
 * (the unit behind the target is pushed one plain tile, once: that push carries no bonus),
 * `mortar-cap-set` (the span it ends on is set sound again, by the bridges wear hook) and
 * `mortar-cap-scatter` (a drop pushes each unit beside the last stone one tile away).
 */
function mortarAfter(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  start: Coord,
  dropped: boolean,
  origin: Origin | null,
): void {
  if (!dropped && unit.hp > 0) {
    if (unit.kind === 'member' && hasFootnote(ctx, 'mortar-unit-guard')) {
      gainShield(ctx, unit, 1, ctx.s.round + 1);
    }
    if (hasFootnote(ctx, 'mortar-cap-set')) strikePiece(ctx, unit.pos, 'shove');
  }
  if (hasFootnote(ctx, 'mortar-unit-behind')) {
    const back = step(start, opposite(dir));
    const behind = inBoard(ctx.s, back) ? unitAt(ctx.s, back) : null;
    if (behind && behind.hp > 0 && behind.id !== unit.id) push(ctx, behind, dir, 1, origin);
  }
  if (dropped && hasFootnote(ctx, 'mortar-cap-scatter')) {
    const edge = { ...unit.pos };
    for (const at of neighbors4(edge).sort(byReadingOrder)) {
      const v = inBoard(ctx.s, at) ? unitAt(ctx.s, at) : null;
      if (v && v.hp > 0 && v.id !== unit.id) push(ctx, v, awayFrom(edge, v.pos), 1, origin);
    }
  }
}

/** A fall: a minion is gone (no death-burst); an elite or member takes 4 and is stunned (P19). */
function fall(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  stop: Stop & { kind: 'drop' },
  pull: boolean,
  harder = 0,
): void {
  withLine(ctx, pull ? 'pull:drop' : stop.line, () => {
    emit(ctx, { type: 'dropped', unit: ref(unit), at: { ...stop.at }, elite: unit.elite });
    if (!unit.elite) {
      unit.hp = 0;
      kill(ctx, unit, false, 'Drop');
      return;
    }
    dealDamage(ctx, unit, TUNING.dropEliteDamage + harder, 'Drop', [], { heading: dir, at: null });
    if (unit.hp > 0) {
      unit.stunned = true;
      emit(ctx, { type: 'stunned', unit: ref(unit) });
    }
  });
}

/** Where a push would take a unit, without moving it or using up a slick. */
export interface PushPlan {
  /** Tiles entered in order; the tail past `tiles` is the slide. */
  path: Coord[];
  slid: number;
  /** What ends it early: a crush or a drop (null: it went the whole way). */
  stop: Stop | null;
  /** Fresh slicks it slides on, used up for the round when the push happens (no pinball). */
  slicks: Layer[];
  /** Tiles of the push still unspent when it stopped. */
  left: number;
}

/** Plans a push (P3, P19, P28): pure, so previews and AH's Pull can read it. */
export function planPush(ctx: Ctx, unit: Unit, dir: Dir, tiles: number): PushPlan {
  const s: BattleState = ctx.s;
  const path: Coord[] = [];
  const slicks: Layer[] = [];
  let at = { ...unit.pos };
  let allowance = tiles;
  let stop: Stop | null = null;
  while (allowance > 0) {
    const next = step(at, dir);
    stop = stopAt(ctx, unit, at, next);
    if (stop) break;
    at = next;
    path.push(next);
    allowance--;
    const layer = tileAt(s, next).state as Layer | null;
    const heavy =
      (unit.mark?.deep === true && hasFootnote(ctx, 'ink-mark-heavy')) ||
      (unit.mark?.heavy === true && hasFootnote(ctx, 'gallnut-unit-heavy'));
    if (!flies(unit) && !heavy && layer && SLICK.has(layer.id) && layer.slid !== s.round) {
      slicks.push(layer);
      allowance = Math.max(allowance, hasFootnote(ctx, 'shove-slick-far') ? 2 : 1);
    }
  }
  return { path, slid: Math.max(0, path.length - tiles), stop, slicks, left: allowance };
}

/**
 * Push along a heading (design §4.4, P3, P19, P28). The unit steps `tiles` tiles and slides on
 * while it stands on a fresh slick; a slick it slid over is used up for the round (no pinball).
 * A plate, wall, edge or unit in the way is a crush (1 + 1 per tile moved to the pushed unit, 1 to
 * what it hit); a drop (`_`, canal water for land units, an edge when `edge === 'drop'`) removes a
 * minion and costs an elite 4 and its next action. A held unit doesn't move.
 */
export function push(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  tiles: number,
  origin: Origin | null,
  opts: PushOptions = {},
): PushResult {
  return withOrigin(ctx, origin, () => {
    const s = ctx.s;
    const unmoved = (): PushResult => ({
      moved: 0,
      end: { ...unit.pos },
      crushed: null,
      dropped: false,
    });
    if (unit.hp <= 0 || tiles <= 0) return unmoved();
    const pull = opts.as === 'pull';
    // `brass-mark-anchor`: a shackled unit cannot be pushed (the snap frees it before a throw).
    if (unit.shackle > 0 && hasFootnote(ctx, 'brass-mark-anchor')) {
      withLine(ctx, 'brass:mark', () =>
        emit(ctx, { type: 'miss', source: pull ? 'Pull' : 'Push' }),
      );
      return unmoved();
    }
    const cause = pull ? ('pull' as const) : ('push' as const);
    const blockedByHold = (): PushResult => {
      withLine(ctx, pull ? 'pull:held' : 'shove:held', () =>
        emit(ctx, { type: 'held', unit: ref(unit), rounds: unit.held }),
      );
      return unmoved();
    };
    if (unit.held > 0) return blockedByHold();
    // `wax-cloud-stay`: a waxed unit standing in a cloud is held by the wax, for the step.
    if (unit.mark?.wax && isCloud(tileAt(s, unit.pos)) && hasFootnote(ctx, 'wax-cloud-stay')) {
      withLine(ctx, 'wax:cloud', () => emit(ctx, { type: 'held', unit: ref(unit), rounds: 1 }));
      return unmoved();
    }
    // `guard-cap-brace`: a shielded unit holds its ground; the push costs its shield 1.
    if (!pull && unit.shield > 0 && hasFootnote(ctx, 'guard-cap-brace')) {
      withLine(ctx, 'shove:held', () => {
        unit.shield -= 1;
        if (unit.shield <= 0) delete unit.thorns;
        emit(ctx, { type: 'shieldAbsorbs', unit: ref(unit), absorbed: 1, left: unit.shield });
      });
      return unmoved();
    }
    // A rival's trick answers the push first (RV-11 `beforeHarm`): a relocation or a cancel leaves
    // the push undone; a redirect is not offered for a push (it passes).
    const reaction = trickBeforeHarm(ctx, unit, { kind: 'push', unit: unit.id, dir, harm: null });
    if (reaction === 'relocated') return unmoved();
    if (reaction?.kind === 'cancel') {
      emit(ctx, { type: 'unharmed', unit: ref(unit), source: pull ? 'Pull' : 'Push', harm: null });
      return unmoved();
    }
    // A rival's trick may refuse the push (RV-11 `resists`: right of way).
    if (trickResists(ctx, unit, 'push')) return unmoved();
    // The harm guards (BH P8: a dissolved bather lets the push pass through it).
    const pushHarm = { kind: 'push', unit: unit.id, dir, harm: null } as const;
    if (guardCancels(ctx, unit, pushHarm, pull ? 'Pull' : 'Push')) return unmoved();
    // A bound mark may answer "pushed" by holding its bearer in place (Anchor).
    notify(ctx, { kind: 'pushed', unit: unit.id, dir });
    if (unit.hp <= 0) return unmoved();
    if (unit.held > 0) return blockedByHold();

    // Plan the walk first so the log reads push, then crush or drop.
    const start = { ...unit.pos };
    const cloudFrom = isCloud(tileAt(s, start)) ? tileAt(s, start).state : null;
    const bonus = pull ? 0 : Math.min(tiles, opts.bonus ?? 0);
    let plan = planPush(ctx, unit, dir, tiles);
    // Whether Mortar's extra tile is the step that ends in the fog.
    const bonusFall = bonus > 0 && plan.stop?.kind === 'drop' && plan.path.length >= tiles - bonus;
    // `mortar-unit-rim`: the extra tile is dropped when it would carry the unit into fog.
    if (bonusFall && hasFootnote(ctx, 'mortar-unit-rim')) {
      plan = planPush(ctx, unit, dir, tiles - bonus);
    }
    const { path, slid, stop, slicks, left } = plan;
    if (!hasFootnote(ctx, 'shove-slick-again')) for (const l of slicks) l.slid = s.round;

    const end = path[path.length - 1];
    if (end) {
      const body = (): void => {
        emit(ctx, {
          type: 'push',
          unit: ref(unit, start),
          from: start,
          to: { ...end },
          cause,
          dir,
          path,
          slid,
        });
      };
      const t = tileAt(s, end);
      const overFall = flies(unit) && (t.terrain.water !== null || t.terrain.drop);
      const line: LineId | null =
        slid > 0 ? 'shove:slick' : pull && overFall && !swims(unit) ? 'pull:flier' : null;
      if (line) withLine(ctx, line, body);
      else body();
      if (unit.kind === 'member') unit.undo = null;
    }
    // The pushed tiles, then the slide; each tile entered answers (P2). A hook that kills, moves
    // or holds the unit ends the push there (P4).
    const pushed = path.slice(0, tiles);
    const slide = path.slice(tiles);
    const legs = [
      { tiles: pushed, cause, landing: slide.length === 0 },
      { tiles: slide, cause: 'slide' as const, landing: true },
    ];
    for (const leg of legs) {
      if (!leg.tiles.length) continue;
      const r = arrive(ctx, unit.id, leg.tiles, { cause: leg.cause, origin, landing: leg.landing });
      if (r.interrupted) {
        return { moved: path.length, end: { ...unit.pos }, crushed: null, dropped: false };
      }
    }

    // `steam-cap-carry`: the cloud a pushed unit stood in goes with it, onto a bare tile.
    if (cloudFrom && unit.hp > 0 && hasFootnote(ctx, 'steam-cap-carry')) {
      const dest = tileAt(s, unit.pos);
      const gone = tileAt(s, start);
      if (dest.state === null && gone.state === cloudFrom && !sameCoord(start, unit.pos)) {
        withLine(ctx, 'steam:cloud', () => {
          gone.state = null;
          emit(ctx, { type: 'stateFades', tiles: [{ ...start }] });
          emit(ctx, { type: 'landed', kind: 'steam', at: { ...unit.pos }, makes: cloudFrom.id });
          dest.state = cloudFrom;
        });
      }
    }

    // `shove-slick-smear`: a slide over a blot or stain picks up the ink.
    if (hasFootnote(ctx, 'shove-slick-smear') && unit.hp > 0 && slide.length) {
      const inked = slide.some((at) => ['blot', 'stain'].includes(tileAt(s, at).state?.id ?? ''));
      if (inked) withLine(ctx, 'shove:slick', () => markUnit(ctx, unit, origin));
    }

    // `shove-cap-oily`: a unit that slid on oil leaves a slick where it stops.
    if (slid > 0 && unit.hp > 0 && hasFootnote(ctx, 'shove-cap-oily')) {
      const at = { ...unit.pos };
      if (tileAt(s, at).state === null) {
        landKindFree(ctx, 'oil', { kind: 'tile', at });
      }
    }

    let crushed: PushResult['crushed'] = null;
    let dropped = false;
    // `shove-slick-carry`: a unit still sliding hands its tiles on to the one in its way.
    const carried =
      stop?.kind === 'crush' &&
      typeof stop.into !== 'string' &&
      !pull &&
      opts.crush !== false &&
      slicks.length > 0 &&
      left > 0 &&
      hasFootnote(ctx, 'shove-slick-carry');
    if (carried && stop?.kind === 'crush' && typeof stop.into !== 'string') {
      const blocker = stop.into;
      withLine(ctx, 'shove:slick', () => push(ctx, blocker, dir, left, origin, { crush: false }));
    } else if (
      stop?.kind === 'crush' &&
      opts.crush !== false &&
      typeof stop.into !== 'string' &&
      !pull &&
      opts.area?.includes(unit.id) &&
      hasFootnote(ctx, 'splash-unit-ripple') &&
      ripple(ctx, stop.into, dir, origin)
    ) {
      // `splash-unit-ripple`: the blocker took the push on; nothing is crushed.
    } else if (
      stop?.kind === 'crush' &&
      stop.line === 'shove:edge' &&
      opts.vat &&
      !pull &&
      opts.crush !== false &&
      unit.hp > 0 &&
      hasFootnote(ctx, 'vat-edge-rebound')
    ) {
      // `vat-edge-rebound`: the blocked step bounces one tile back, colliding like any Shove.
      push(ctx, unit, opposite(dir), 1, origin);
    } else if (stop?.kind === 'crush' && opts.crush !== false) {
      // With `crush: false` it stops short of what is in the way.
      crush(ctx, unit, dir, path.length, stop, origin, opts);
      crushed = typeof stop.into === 'string' ? stop.into : stop.into.id;
      // `vat-edge-pin`: a unit your Vat pushed against the room's edge cannot move until your next turn.
      if (
        opts.vat &&
        stop.line === 'shove:edge' &&
        unit.hp > 0 &&
        hasFootnote(ctx, 'vat-edge-pin')
      ) {
        withLine(ctx, 'vat:edge', () => {
          if (trickResists(ctx, unit, 'hold')) return;
          if (guardCancels(ctx, unit, { kind: 'hold', unit: unit.id, harm: null }, 'Hold')) return;
          unit.held = Math.max(unit.held, 1);
          emit(ctx, { type: 'held', unit: ref(unit), rounds: unit.held });
        });
      }
    } else if (stop?.kind === 'crush' && pull && path.length === 0) {
      // Pull (P4): a blocking tile in between, or a swimmer that won't leave the water.
      const why: LineId = stop.into === 'plate' ? 'pull:plate' : 'pull:water';
      withLine(ctx, why, () => emit(ctx, { type: 'miss', source: 'Pull' }));
    } else if (stop?.kind === 'drop' && !trickResists(ctx, unit, 'fall')) {
      // A rival's trick may refuse the fall (RV-11 `resists`): he stops on the brink.
      // `mortar-unit-fall`: a unit the extra tile carried into the fog takes the fall one step harder.
      fall(ctx, unit, dir, stop, pull, bonusFall && hasFootnote(ctx, 'mortar-unit-fall') ? 1 : 0);
      dropped = true;
    }
    const result = { moved: path.length, end: { ...unit.pos }, crushed, dropped };
    if (bonus > 0) mortarAfter(ctx, unit, dir, start, dropped, origin);
    return result;
  });
}
