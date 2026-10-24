import type { LineId, SealRuneId, TriggerRuneId } from '$data';
import { type Coord, DIRS, type Dir, neighbors4, step, turnLeft, turnRight } from '../grid';
import { ruleOf, sameSide } from '../habits';
import { sealedContext } from '../jars';
import { inBoard } from '../queries';
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
 * they have no sides (the `fork:noHeading` line). A side keeps the heading of the target it
 * came from, so a Shove after a Fork still pushes along the spell's heading.
 */
export function forkSide(
  s: BattleState,
  targets: readonly Target[],
  headings: ReadonlyMap<string, Dir | null>,
  side: 'left' | 'right' | 'ahead',
): Aimed & { blind: number } {
  const out: Aimed & { blind: number } = { targets: [], headings: new Map(headings), blind: 0 };
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
    const to = step(at, way);
    if (inBoard(s, to)) add(out, seen, targetOn(s, to), heading, true);
  }
  return out;
}

/** Seep: the targets, then their neighbours (new ones only, in reading order per target). */
export function seep(
  s: BattleState,
  targets: readonly Target[],
  headings: ReadonlyMap<string, Dir | null>,
): Aimed {
  const out: Aimed = { targets: [], headings: new Map(headings) };
  const seen = new Set<string>();
  for (const t of targets) add(out, seen, t, headings.get(targetKey(t)) ?? null, false);
  for (const t of targets) {
    const at = whereIs(s, t);
    if (!at) continue;
    const heading = headings.get(targetKey(t)) ?? null;
    const around = neighbors4(at)
      .filter((c) => inBoard(s, c))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (const c of around) add(out, seen, targetOn(s, c), heading, false);
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

/**
 * Tally: marks, collars, shackles, states (and compounds) and jars on the target and its tile. A
 * mark counts `markWeight` (the notary's habit, AH P13: 2); a deep mark is still one mark.
 */
export function tallyCount(s: BattleState, snap: Snapshot, t: Target, markWeight = 1): number {
  const seen = seenAt(s, snap, t);
  if (!seen) return 0;
  const { unit, tile } = seen;
  let n = 0;
  if (unit?.mark) n += markWeight;
  if (unit && unit.collar !== false) n++;
  if (unit && unit.shackle > 0) n++;
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
 * (the habit's headline, AH P11), and the habit fine-print line it met.
 */
export interface Trial {
  pass: boolean;
  byHabit: boolean;
  line: LineId | null;
}

/** A trigger's verdict on one target, reading only the cast's snapshot and the flow's habit. */
export function trial(s: BattleState, rune: TriggerRuneId, t: Target, flow: Flow): Trial {
  const rule = ruleOf(flow.habit);
  switch (rune) {
    case 'tally': {
      const weight = rule.tallyMarkWeight ?? 1;
      const n = tallyCount(s, flow.snapshot, t, weight);
      const pass = n >= 2;
      if (weight === 1) return { pass, byHabit: false, line: null };
      const plain = tallyCount(s, flow.snapshot, t);
      const deep = seenAt(s, flow.snapshot, t)?.unit?.mark?.deep === true;
      return {
        pass,
        byHabit: pass && plain < 2,
        line: deep ? 'markTwice:deepMark' : null,
      };
    }
    case 'brink':
      return { pass: beside(s, flow.snapshot, t), byHabit: false, line: null };
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
