import { type LineId, TUNING } from '$data';
import { arrive, hasTrait } from './arrival';
import { markUnit } from './bursts';
import { type Ctx, emit, ref, withLine, withOrigin } from './ctx';
import { dealDamage, kill } from './damage';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, type Dir, neighbors4, step } from './grid';
import { notify } from './hooks';
import { pieceBlocksUnits, strikePiece } from './pieces';
import { blocksUnits, inBoard, isPlate, tileAt, unitAt } from './queries';
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
  /** `touch-member-ram`: a crush into a unit reverses its split (it takes the full crush). */
  ram?: true;
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
function wearPlate(ctx: Ctx, at: Coord, wear = 1): boolean {
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
    } else if (stop.into === 'plate') {
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

/** A fall: a minion is gone (no death-burst); an elite or member takes 4 and is stunned (P19). */
function fall(ctx: Ctx, unit: Unit, dir: Dir, stop: Stop & { kind: 'drop' }, pull: boolean): void {
  withLine(ctx, pull ? 'pull:drop' : stop.line, () => {
    emit(ctx, { type: 'dropped', unit: ref(unit), at: { ...stop.at }, elite: unit.elite });
    if (!unit.elite) {
      unit.hp = 0;
      kill(ctx, unit, false, 'Drop');
      return;
    }
    dealDamage(ctx, unit, TUNING.dropEliteDamage, 'Drop', [], { heading: dir, at: null });
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
    const heavy = unit.mark?.deep === true && hasFootnote(ctx, 'ink-mark-heavy');
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
    const cause = pull ? ('pull' as const) : ('push' as const);
    const blockedByHold = (): PushResult => {
      withLine(ctx, pull ? 'pull:held' : 'shove:held', () =>
        emit(ctx, { type: 'held', unit: ref(unit), rounds: unit.held }),
      );
      return unmoved();
    };
    if (unit.held > 0) return blockedByHold();
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
    // A bound mark may answer "pushed" by holding its bearer in place (Anchor).
    notify(ctx, { kind: 'pushed', unit: unit.id, dir });
    if (unit.hp <= 0) return unmoved();
    if (unit.held > 0) return blockedByHold();

    // Plan the walk first so the log reads push, then crush or drop.
    const start = { ...unit.pos };
    const { path, slid, stop, slicks, left } = planPush(ctx, unit, dir, tiles);
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

    // `shove-slick-smear`: a slide over a blot or stain picks up the ink.
    if (hasFootnote(ctx, 'shove-slick-smear') && unit.hp > 0 && slide.length) {
      const inked = slide.some((at) => ['blot', 'stain'].includes(tileAt(s, at).state?.id ?? ''));
      if (inked) withLine(ctx, 'shove:slick', () => markUnit(ctx, unit, origin));
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
    } else if (stop?.kind === 'crush' && opts.crush !== false) {
      // With `crush: false` it stops short of what is in the way.
      crush(ctx, unit, dir, path.length, stop, origin, opts);
      crushed = typeof stop.into === 'string' ? stop.into : stop.into.id;
    } else if (stop?.kind === 'crush' && pull && path.length === 0) {
      // Pull (P4): a blocking tile in between, or a swimmer that won't leave the water.
      const why: LineId = stop.into === 'plate' ? 'pull:plate' : 'pull:water';
      withLine(ctx, why, () => emit(ctx, { type: 'miss', source: 'Pull' }));
    } else if (stop?.kind === 'drop' && !trickResists(ctx, unit, 'fall')) {
      // A rival's trick may refuse the fall (RV-11 `resists`): he stops on the brink.
      fall(ctx, unit, dir, stop, pull);
      dropped = true;
    }
    return { moved: path.length, end: { ...unit.pos }, crushed, dropped };
  });
}
