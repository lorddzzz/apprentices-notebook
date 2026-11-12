import type { LineId, SealRuneId, TriggerRuneId } from '$data';
import type { FootnoteIds, FootnoteVariantId } from '../ctx';
import { crackedTiles } from '../districts/api';
import { hasFootnote } from '../footnotes';
import {
  type Coord,
  DIRS,
  type Dir,
  neighbors4,
  opposite,
  sameCoord,
  step,
  turnLeft,
  turnRight,
} from '../grid';
import { ruleOf, sameSide } from '../habits';
import { sealedContext } from '../jars';
import { cloudNet } from '../networks';
import { blocksUnits, inBoard, isCloud, tileAt, unitAt } from '../queries';
import { targetOn, whereIs } from '../targets';
import type { BattleState, Flow, Jar, Snapshot, Target, Tile, Unit } from '../types';
import { targetKey } from '../types';

/**
 * The pure halves of the Shapes, Triggers and Seals (design R5–R8, J1; plan P24–P26): what a
 * Fork, Seep or Toll turns the target list into, whether a Trigger lets a target through, and the
 * jar a Seal makes. `resolve.ts` walks the steps and calls these; none of them emits or mutates.
 */

/** A target list with the heading each target carries (R4). */
export interface Aimed {
  targets: Target[];
  headings: Map<string, Dir | null>;
}

/** Heading maps a Fork built: a Shove or Strike downstream of one acts under `fork:unit`. */
const forked = new WeakSet<ReadonlyMap<string, Dir | null>>();
export const isForked = (headings: ReadonlyMap<string, Dir | null>): boolean =>
  forked.has(headings);

/** The same headings with `more` set (and rotated by `quarter` turns first), staying a Fork's own. */
export function reheaded(
  headings: ReadonlyMap<string, Dir | null>,
  quarter: number,
  more: Iterable<[string, Dir | null]> = [],
): Map<string, Dir | null> {
  const turn = (d: Dir | null): Dir | null => {
    let out = d;
    for (let i = 0; out && i < quarter % 4; i++) out = turnRight(out);
    return out;
  };
  const out = new Map<string, Dir | null>();
  for (const [k, d] of headings) out.set(k, turn(d));
  for (const [k, d] of more) out.set(k, d);
  if (forked.has(headings)) forked.add(out);
  return out;
}

/** Appends `t` unless its key is already taken (P24: the first one wins). */
function add(out: Aimed, seen: Set<string>, t: Target, heading: Dir | null, override: boolean) {
  const k = targetKey(t);
  if (seen.has(k)) return;
  seen.add(k);
  out.targets.push(t);
  if (override || !out.headings.has(k)) out.headings.set(k, heading);
}

/**
 * Fork (R5, P24): one side of every target (`ahead` is the Stoker's habit, P36), relative to its own heading. A side off the board is
 * dropped, duplicates are dropped (first in order wins). `blind` counts targets with no heading:
 * they have no sides (the `fork:noHeading` line); `off` counts sides dropped at the edge (`fork:edge`). A side keeps the heading of the target it
 * came from, so a Shove after a Fork still pushes along the spell's heading.
 */
export function forkSide(
  s: BattleState,
  targets: readonly Target[],
  headings: ReadonlyMap<string, Dir | null>,
  side: 'left' | 'right' | 'ahead',
  footnotes: FootnoteIds = {},
  /** `fork-cap-pinch` (decided by the caller): side branches point back at the target. */
  pinch = false,
): Aimed & { blind: number; off: number } {
  const fn = (id: FootnoteVariantId) => hasFootnote({ footnotes }, id);
  const out: Aimed & { blind: number; off: number } = {
    targets: [],
    headings: new Map(headings),
    blind: 0,
    off: 0,
  };
  forked.add(out.headings);
  const seen = new Set<string>();
  for (const t of targets) {
    const at = whereIs(s, t);
    if (!at) continue;
    const heading = headings.get(targetKey(t)) ?? null;
    if (!heading) {
      out.blind++;
      continue;
    }
    const way =
      side === 'ahead' ? heading : side === 'left' ? turnLeft(heading) : turnRight(heading);
    // `fork-unit-wide`: the side branches act two tiles out.
    const reach = (w: Dir): Coord =>
      side !== 'ahead' && fn('fork-unit-wide') ? step(step(at, w), w) : step(at, w);
    let to = reach(way);
    // `fork-cap-behind`: an empty side branch acts on the tile behind the target instead; when
    // both sides are empty the left takes it and the right is dropped.
    if (side !== 'ahead' && fn('fork-cap-behind') && inBoard(s, to) && !unitAt(s, to)) {
      const other = reach(side === 'left' ? turnRight(heading) : turnLeft(heading));
      const otherEmpty = !inBoard(s, other) || !unitAt(s, other);
      if (!otherEmpty || side === 'left') to = step(at, opposite(heading));
      else continue;
    }
    // `fork-unit-splay`: a side branch points its own side's way.
    const aim =
      side !== 'ahead' && pinch
        ? opposite(way)
        : side !== 'ahead' && fn('fork-unit-splay')
          ? way
          : heading;
    if (inBoard(s, to)) {
      // `fork-unit-both`: a tile two targets reach is acted on once for each.
      if (fn('fork-unit-both')) {
        const t = targetOn(s, to);
        out.targets.push(t);
        out.headings.set(targetKey(t), aim);
      } else add(out, seen, targetOn(s, to), aim, true);
    } else if (fn('fork-unit-bounce')) add(out, seen, t, aim, true);
    else out.off++;
  }
  return out;
}

/** What Seep did besides the plain target list: lost neighbours, allies and the neighbour keys. */
export interface Seeped extends Aimed {
  /** Neighbours dropped at the board's edge (`seep:edge`); with `seep-edge-wall`, blockers too. */
  off: number;
  /** Target keys of your own party beside a target (`seep:member`). */
  members: string[];
  /** Target keys of every neighbour Seep added, for `seep-cap-chain`. */
  neighbours: string[];
}

const DIAGONALS: readonly Coord[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];
const readingOrder = (a: Coord, b: Coord): number => a.y - b.y || a.x - b.x;
const dirBetween = (from: Coord, to: Coord): Dir =>
  to.x !== from.x ? (to.x < from.x ? 'left' : 'right') : to.y < from.y ? 'up' : 'down';

/**
 * Seep: the targets, then their neighbours (new ones only, in reading order per target). `off`
 * counts neighbours dropped at the board's edge (`seep:edge`). Footnotes bend the edge (`back`,
 * `turn`, `wall`, `along`), the party beside the target (`spare-self`, `pass`, `away`) and the
 * capstone `seep-cap-cloud`; `caster` says who "you" are.
 */
export function seep(
  s: BattleState,
  targets: readonly Target[],
  headings: ReadonlyMap<string, Dir | null>,
  footnotes: FootnoteIds = {},
  caster: Unit | null = null,
): Seeped {
  const fn = (id: FootnoteVariantId) => hasFootnote({ footnotes }, id);
  const out: Seeped = {
    targets: [],
    headings: new Map(headings),
    off: 0,
    members: [],
    neighbours: [],
  };
  const seen = new Set<string>();
  for (const t of targets) add(out, seen, t, headings.get(targetKey(t)) ?? null, false);
  const free = (c: Coord): boolean => inBoard(s, c) && !blocksUnits(tileAt(s, c));
  const reach = (c: Coord, heading: Dir | null): boolean => {
    const nt = targetOn(s, c);
    const k = targetKey(nt);
    if (seen.has(k)) return false;
    add(out, seen, nt, heading, false);
    out.neighbours.push(k);
    return true;
  };
  for (const t of targets) {
    const at = whereIs(s, t);
    if (!at) continue;
    const heading = headings.get(targetKey(t)) ?? null;
    const ring = neighbors4(at);
    let off = ring.filter((c) => !inBoard(s, c)).length;
    let around = ring.filter((c) => inBoard(s, c)).sort(readingOrder);
    // `seep-edge-wall`: a wall, gate or plate beside the target is lost like the edge.
    if (fn('seep-edge-wall')) {
      off += around.filter((c) => blocksUnits(tileAt(s, c))).length;
      around = around.filter((c) => !blocksUnits(tileAt(s, c)));
    }
    const beyond: Coord[] = [];
    for (const c of around) {
      const there = unitAt(s, c);
      const mine = !!caster && !!there && sameSide(caster, there);
      // `seep-member-spare-self`: Seep never reaches you, the caster.
      if (mine && there?.id === caster?.id && fn('seep-member-spare-self')) continue;
      // `seep-member-away`: your party is pushed away from the target, not along its heading.
      const way = mine && fn('seep-member-away') ? dirBetween(at, c) : heading;
      // `bathSteward:seep` (his note): a member on a cloud tile is passed over, and the rest re-forms
      // on the farthest free tile of that cloud (ties in reading order); with none, nothing re-forms.
      if (mine && fn('bathSteward:seep') && isCloud(tileAt(s, c))) {
        const to = cloudNet(s, c)
          .filter((k) => !sameCoord(k, c) && !unitAt(s, k) && free(k))
          .sort((a, b) => manhattan(b, c) - manhattan(a, c) || readingOrder(a, b))[0];
        if (to) reach(to, heading);
        continue;
      }
      if (!reach(c, way)) continue;
      if (mine) {
        out.members.push(targetKey(targetOn(s, c)));
        // `seep-member-pass`: a neighbour of yours passes it along to the tile beyond.
        if (fn('seep-member-pass')) beyond.push({ x: 2 * c.x - at.x, y: 2 * c.y - at.y });
      }
    }
    for (const c of beyond) if (inBoard(s, c)) reach(c, heading);
    // `seep-edge-along`: a target on the room's edge reaches one tile further along it, both ways.
    if (fn('seep-edge-along')) {
      const along: Coord[] = [];
      if (at.x === 0 || at.x === s.width - 1) {
        for (const dy of [-1, 1]) {
          if (inBoard(s, { x: at.x, y: at.y + dy })) along.push({ x: at.x, y: at.y + 2 * dy });
        }
      }
      if (at.y === 0 || at.y === s.height - 1) {
        for (const dx of [-1, 1]) {
          if (inBoard(s, { x: at.x + dx, y: at.y })) along.push({ x: at.x + 2 * dx, y: at.y });
        }
      }
      for (const c of along.sort(readingOrder)) if (inBoard(s, c)) reach(c, heading);
    }
    const diagonals = DIAGONALS.map((d) => ({ x: at.x + d.x, y: at.y + d.y }))
      .filter((c) => inBoard(s, c))
      .sort(readingOrder);
    // `seep-edge-back`: each lost neighbour turns back, the rest acts once more on the target (at most twice).
    if (fn('seep-edge-back')) {
      for (let i = 0; i < Math.min(off, 2); i++) out.targets.push(t);
    }
    // `seep-edge-turn`: each lost neighbour is replaced by the nearest free diagonal on the board.
    if (fn('seep-edge-turn')) {
      let lost = off;
      for (const c of diagonals) {
        if (lost <= 0) break;
        if (free(c) && reach(c, heading)) lost--;
      }
    }
    // `seep-cap-cloud`: a target on a cloud also reaches the four diagonals.
    if (fn('seep-cap-cloud') && isCloud(tileAt(s, at))) {
      for (const c of diagonals) if (free(c)) reach(c, heading);
    }
    out.off += off;
  }
  return out;
}

/** Toll: the targets, then every tile `net` connects to a target's tile (new ones only). */
export function toll(
  s: BattleState,
  targets: readonly Target[],
  headings: ReadonlyMap<string, Dir | null>,
  net: (s: BattleState, at: Coord) => Coord[],
): Aimed {
  const out: Aimed = { targets: [], headings: new Map(headings) };
  const seen = new Set<string>();
  for (const t of targets) add(out, seen, t, headings.get(targetKey(t)) ?? null, false);
  for (const t of targets) {
    const at = whereIs(s, t);
    if (!at) continue;
    const heading = headings.get(targetKey(t)) ?? null;
    for (const c of net(s, at)) add(out, seen, targetOn(s, c), heading, false);
  }
  return out;
}

// ── Triggers (R8): they read the snapshot, never the live board ──

/** Where a target stood when the cast began, and the tile under it. */
function seenAt(
  s: BattleState,
  snap: Snapshot,
  t: Target,
): { unit: Unit | null; at: Coord; tile: Tile } | null {
  let unit: Unit | null = null;
  let at: Coord | null;
  if (t.kind === 'tile') {
    at = t.at;
  } else {
    unit = snap.units.find((u) => u.id === t.unit) ?? null;
    at = unit?.pos ?? whereIs(s, t); // a unit born mid-cast has no snapshot: where it is now
  }
  if (!at || !inBoard(s, at)) return null;
  const tile = snap.tiles[at.y * s.width + at.x];
  return tile ? { unit, at, tile } : null;
}

/** Footnote reads for the trigger verdicts (the flow carries no footnotes; the trigger step passes them). */
export type FootnoteCheck = (id: FootnoteVariantId) => boolean;
const NO_FOOTNOTES: FootnoteCheck = () => false;

/** What a unit's collar and shackle count for Tally (`tally-collar-twice`, `tally-collar-shackle`). */
function ownCollarPart(unit: Unit | null, fn: FootnoteCheck): number {
  if (!unit) return 0;
  let n = 0;
  if (unit.collar !== false) n += fn('tally-collar-twice') ? 2 : 1;
  if (unit.shackle > 0) n += fn('tally-collar-shackle') ? 2 : 1;
  return n;
}

/**
 * Tally: marks, collars, shackles, states (and compounds) and jars on the target and its tile. A
 * mark counts `markWeight` (the notary's habit, AH P13: 2); a deep mark is still one mark. A collar
 * or shackle counts as its footnote says; `tally-collar-net` adds collared neighbours (at most two).
 * Pieces never count.
 */
export function tallyCount(
  s: BattleState,
  snap: Snapshot,
  t: Target,
  markWeight = 1,
  fn: FootnoteCheck = NO_FOOTNOTES,
): number {
  const seen = seenAt(s, snap, t);
  if (!seen) return 0;
  const { unit, tile, at } = seen;
  let n = 0;
  if (unit?.mark) n += markWeight;
  n += ownCollarPart(unit, fn);
  if (fn('tally-collar-net')) {
    const beside = snap.units.filter(
      (u) =>
        u.hp > 0 &&
        u.collar !== false &&
        u.id !== unit?.id &&
        neighbors4(at).some((c) => sameCoord(c, u.pos)),
    );
    n += Math.min(2, beside.length);
  }
  if (tile.state) n++;
  if (tile.jar) n++;
  return n;
}

/**
 * Brink: the target stood beside canal water or a drop tile, or beside the board's edge when the
 * district's edge is a drop (P3: a wall edge is not an edge to Brink). A tile that is itself
 * water or a drop counts too.
 */
export function beside(s: BattleState, snap: Snapshot, t: Target): boolean {
  const seen = seenAt(s, snap, t);
  if (!seen) return false;
  const open = (tile: Tile): boolean => tile.terrain.water !== null || tile.terrain.drop;
  if (open(seen.tile)) return true;
  return DIRS.some((d) => {
    const c = step(seen.at, d);
    if (!inBoard(s, c)) return s.edge === 'drop';
    const tile = snap.tiles[c.y * s.width + c.x];
    return tile ? open(tile) : false;
  });
}

/**
 * Brink's fine print on a bridge (BR-17): a pass over a fallen (fog) tile signs `brink:drop`; a
 * miss beside a cracked span tile (still standing, so no edge yet) signs `brink:cracked`; a miss
 * at the room's own wall signs `brink:edge`. Canal water and a drop edge pass with no line.
 * Footnotes (BR-19a): `brink-drop-near` counts the diagonals of a fog tile, `brink-drop-keen` makes
 * a fog pass one step stronger (`weaker` -1), `brink-cracked-dusk` and `-half` let a cracked tile
 * through (the latter one step weaker), `brink-cap-rim` lets the room's walls through.
 */
function brinkLine(
  s: BattleState,
  snap: Snapshot,
  t: Target,
  pass: boolean,
  fn: FootnoteCheck,
): { pass: boolean; line: LineId | null; weaker?: number } {
  const seen = seenAt(s, snap, t);
  if (!seen) return { pass, line: null };
  const around = [seen.at, ...DIRS.map((d) => step(seen.at, d))];
  const tileOf = (c: Coord): Tile | undefined =>
    inBoard(s, c) ? snap.tiles[c.y * s.width + c.x] : undefined;
  const fogIn = (cs: readonly Coord[]): boolean => cs.some((c) => tileOf(c)?.terrain.drop);
  const keen = fn('brink-drop-keen') ? { weaker: -1 } : {};
  if (pass) return fogIn(around) ? { pass, line: 'brink:drop', ...keen } : { pass, line: null };
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => ({ x: seen.at.x + x, y: seen.at.y + y })),
  );
  if (fn('brink-drop-near') && fogIn(corners)) return { pass: true, line: 'brink:drop', ...keen };
  const cracked = crackedTiles({ ...s, tiles: [...snap.tiles] });
  if (around.some((c) => cracked.some((k) => sameCoord(k, c)))) {
    if (fn('brink-cracked-dusk')) return { pass: true, line: 'brink:cracked' };
    if (fn('brink-cracked-half')) return { pass: true, line: 'brink:cracked', weaker: 1 };
    return { pass, line: 'brink:cracked' };
  }
  if (!around.some((c) => !inBoard(s, c))) return { pass, line: null };
  return fn('brink-cap-rim') ? { pass: true, line: 'brink:edge' } : { pass, line: 'brink:edge' };
}

/** How a Unison passed: on the target, beside it (AH P16; `besideUnit` via a unit entry), or not. */
export type UnisonPass = 'on' | 'beside' | 'besideUnit' | null;

/**
 * Unison (P26): another unit of the caster's side (`sameSide`: another apprentice for a member)
 * had this target among its step targets earlier this player phase. With `reach` 1 (the tuner's
 * habit, AH P16) a landing on a tile orthogonally beside the target passes too; a unit entry
 * counts where that unit stood in this cast's snapshot.
 */
export function unisonWith(
  s: BattleState,
  snap: Snapshot,
  caster: string,
  t: Target,
  reach = 0,
): UnisonPass {
  const me = snap.units.find((u) => u.id === caster);
  const others = snap.landed.filter((e) => {
    if (e.caster === caster) return false;
    const by = snap.units.find((u) => u.id === e.caster);
    return by !== undefined && (me ? sameSide(me, by) : by.kind === 'member');
  });
  const k = targetKey(t);
  if (others.some((e) => e.targets.includes(k))) return 'on';
  if (reach < 1) return null;
  const here = seenAt(s, snap, t)?.at;
  if (!here) return null;
  let found: UnisonPass = null;
  for (const e of others)
    for (const key of e.targets) {
      const at = landedAt(snap, key);
      if (!at || manhattan(at, here) !== 1) continue;
      if (key.startsWith('u:')) return 'besideUnit';
      found = 'beside';
    }
  return found;
}

/** Where a landed entry stood in the snapshot: a tile's coordinate, a unit's snapshot tile. */
function landedAt(snap: Snapshot, key: string): Coord | null {
  if (key.startsWith('u:')) return snap.units.find((u) => `u:${u.id}` === key)?.pos ?? null;
  const [x, y] = key.slice(2).split(',').map(Number);
  return x === undefined || y === undefined ? null : { x, y };
}

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * One target through a trigger: whether it passes, whether only the flow's habit let it through
 * (the habit's headline, AH P11), the fine-print line it met (habit, then collar, then piece: one
 * `triggered` event carries one line), the count Tally read, and the collar or shackle a passing
 * Tally needed (`tally-collar-spend`).
 */
export interface Trial {
  pass: boolean;
  byHabit: boolean;
  line: LineId | null;
  count?: number;
  spend?: 'collar' | 'shackle';
  /** Brink: how many steps weaker (or, negative, stronger) the rest acts on this target. */
  weaker?: number;
}

/** A trigger's verdict on one target, reading only the cast's snapshot and the flow's habit. */
export function trial(
  s: BattleState,
  rune: TriggerRuneId,
  t: Target,
  flow: Flow,
  fn: FootnoteCheck = NO_FOOTNOTES,
): Trial {
  const rule = ruleOf(flow.habit);
  switch (rune) {
    case 'tally': {
      const weight = rule.tallyMarkWeight ?? 1;
      const n = tallyCount(s, flow.snapshot, t, weight, fn);
      const pass = n >= 2;
      const seen = seenAt(s, flow.snapshot, t);
      const unit = seen?.unit ?? null;
      const collared = unit !== null && (unit.collar !== false || unit.shackle > 0);
      const piece = seen?.tile.piece !== undefined && seen.tile.piece !== null;
      const deep = unit?.mark?.deep === true;
      const habit: LineId | null = weight === 1 || !deep ? null : 'markTwice:deepMark';
      const line: LineId | null =
        habit ?? (collared ? 'tally:collar' : piece ? 'tally:stamp' : null);
      const byHabit = weight !== 1 && pass && tallyCount(s, flow.snapshot, t, 1, fn) < 2;
      // The count without the target's own collar and shackle: below 2, the debt carried the pass.
      const needed = pass && collared && n - ownCollarPart(unit, fn) < 2;
      const spend =
        needed && fn('tally-collar-spend') ? (unit?.shackle ? 'shackle' : 'collar') : null;
      return {
        pass,
        byHabit,
        line,
        count: n,
        ...(spend ? { spend } : {}),
      };
    }
    case 'brink': {
      const v = brinkLine(s, flow.snapshot, t, beside(s, flow.snapshot, t), fn);
      return {
        pass: v.pass,
        byHabit: false,
        line: v.line,
        ...(v.weaker !== undefined ? { weaker: v.weaker } : {}),
      };
    }
    case 'unison': {
      const how = unisonWith(s, flow.snapshot, flow.caster, t, rule.unisonReach ?? 0);
      return {
        pass: how !== null,
        byHabit: how === 'beside' || how === 'besideUnit',
        line: how === 'besideUnit' ? 'nearUnison:unit' : null,
      };
    }
  }
}

/** Whether a trigger lets one target through, reading only the cast's snapshot. */
export const passes = (s: BattleState, rune: TriggerRuneId, t: Target, flow: Flow): boolean =>
  trial(s, rune, t, flow).pass;

// ── Seals (J1, P32) ──

/** The jar a Seal makes: the rest of the flow, the sealing cast's heading and origin. */
export function jarFor(seal: SealRuneId, rest: Jar['rest'], t: Target, flow: Flow): Jar {
  return {
    owner: flow.caster,
    event: seal === 'jar' ? 'step' : 'dusk',
    rest,
    heading: flow.headings.get(targetKey(t)) ?? null,
    origin: flow.origin,
    context: sealedContext(flow),
  };
}
