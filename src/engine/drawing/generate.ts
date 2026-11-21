import { type ApprenticeId, ATTACKS, type Drawing, ENEMIES, type EnemyId } from '$data';
import { GEN_LIMITS, GEN_TUNING } from '$data/drawing';
import { createBattle } from '../battle';
import type { Json, RuleId } from '../districts/types';
import { byReadingOrder, type Coord, key } from '../grid';
import { type BoardSpec, emptyTile, serializeBoard } from '../notation';
import { blocksUnits, members } from '../queries';
import { createRng, deriveSeed, type Rng } from '../rng';
import { checkRoom } from '../rooms';
import { listRules } from '../rules';
import { compiledFor } from '../run';
import { TRIAL_BUDGET } from '../sim';
import type { BattleState, Profile, Trip } from '../types';
import { weightBand } from './cost';
import { HEART_FRAMES } from './frames';
import { heartConfig, heartEnemyHp } from './heart';
import { GEN_KITS } from './kits';
import { CURRENT } from './kits/canals';
import { BELLS } from './kits/foundry';
import { at, coords, isHazard, isPlain, isWater, lay, shuffled } from './kits/seam';
import { foeReached, footRegion } from './reach';
import { botTrial } from './trial';
import { parseInkedState, roomInput, storeRoom } from './trip';
import {
  EN_SALT,
  type FoeKit,
  type GenInput,
  type GenIssue,
  type GenKit,
  type GenResult,
  type GenSpec,
  type HeartFrame,
  type RuleKit,
} from './types';

/**
 * P8-P10, P28, P35 (EN-S1, EN-2): one room from the trip seed, composed from the kits in `GEN_KITS`
 * (the Seam's ground, each rule's stamp, the pieces by `matters`, foes by budget) or, for the
 * heart, from its master's frame in `HEART_FRAMES`; judged by the engine bot and redrawn up to
 * `GEN_LIMITS.attempts` times (`heartAttempts` at the heart), then the safe fallback. Pure and
 * deterministic: every draw comes from a salted seed (7000-7999), and the only limit on the bot is
 * its operation budget, never the clock. Every limit is read from `GEN_LIMITS`.
 */

/** P10: the bot must win within this many rounds (`heartRounds` at the heart). */
export const ROOM_ROUNDS = GEN_LIMITS.rounds;
/** P10: bot-tested attempts before the safe fallback (`heartAttempts` at the heart). */
export const MAX_ATTEMPTS = GEN_LIMITS.attempts;
/** P8: foes stand at Manhattan distance 3 or more from every start point (two clear tiles between). */
export const MIN_FOE_DISTANCE = GEN_LIMITS.foeDistance;
/** P9: blocked tiles (plates, gates, grates, solid pieces) up to this share of the board. */
export const BLOCKED_SHARE = GEN_LIMITS.blockedShare;
/** Layout draws per attempt before the guardrails give up on it (cheap: no bot yet). */
export const MAX_DRAWS = GEN_LIMITS.draws;
/** P8: Seam ground, 2 to 5 tiles of plates, oil or vents. */
const GROUND = { min: 2, max: 5 } as const;

const blank = (width: number, height: number): BoardSpec => ({
  width,
  height,
  tiles: Array.from({ length: width * height }, emptyTile),
  units: [],
  starts: [],
});

const plainFree = (layout: BoardSpec): Coord[] =>
  coords(layout).filter((c) => {
    const t = at(layout, c);
    return (
      t !== undefined &&
      isPlain(t) &&
      !layout.units.some((u) => sameAt(u.at, c)) &&
      !layout.starts.some((p) => sameAt(p, c))
    );
  });
const sameAt = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** The spike's two kits, now the registry (P34): kept as an alias for what already reads it. */
export const SPIKE_KITS: readonly GenKit[] = GEN_KITS;

const ruleKitOf = (spec: GenSpec): RuleKit | undefined =>
  spec.kits.flatMap((k) => k.rules).find((r) => r.id === spec.drawing.rule);
const foeKitOf = (spec: GenSpec, id: EnemyId): FoeKit | undefined =>
  spec.kits.flatMap((k) => k.foes).find((f) => f.id === id);

/** The id of the first element of `drawing` that no kit (or, for the master, no frame) covers (P34). */
export function missingKit(drawing: Drawing, kits: readonly GenKit[] = GEN_KITS): string | null {
  const rules = kits.flatMap((k) => k.rules.map((r) => r.id));
  const foes = kits.flatMap((k) => k.foes.map((f) => f.id));
  const pieces = kits.flatMap((k) => k.pieces.map((x) => x.id));
  if (drawing.rule !== null && !rules.includes(drawing.rule)) return drawing.rule;
  const lost = drawing.foes.find((f) => !foes.includes(f));
  if (lost !== undefined) return lost;
  const piece = drawing.pieces.find((x) => !pieces.includes(x));
  if (piece !== undefined) return piece;
  return HEART_FRAMES[drawing.heart] === undefined ? drawing.heart : null;
}

/** Generating a drawing that names an element with no kit, or a master with no frame, throws (P34). */
function requireKits(drawing: Drawing, kits: readonly GenKit[]): void {
  const lost = missingKit(drawing, kits);
  if (lost !== null) throw new RangeError(`No kit for ${lost}`);
}

const isHeartRoom = (input: GenInput): boolean => input.room >= input.drawing.length - 1;

/** The frame of the drawing's master (the caller has checked it exists). */
function frameOf(drawing: Drawing): HeartFrame {
  const frame = HEART_FRAMES[drawing.heart];
  if (!frame) throw new RangeError(`No kit for ${drawing.heart}`);
  return frame;
}

// ── The spec ──────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** P7, P28: the walk's first budget, from the party, the depth and the drawing's weight band. */
export function baseBudget(input: GenInput): number {
  const depth = Math.min(input.room, 3);
  return (
    GEN_TUNING.perMember * input.party.length +
    GEN_TUNING.perDepth * depth +
    GEN_TUNING.bandBonus[weightBand(input.drawing)]
  );
}

/** The salt of a room's size draw (7950 + room): one size per room whatever the attempt. */
const SIZE_SALT = 7950;

/**
 * P8 size from depth and kit hints (5-7 wide, 6-9 tall: deeper rooms are bigger; the current wants 7
 * rows), a heart the size of its frame (P35). The size is drawn from the trip seed and the room, not
 * from the attempt's seed, so every attempt (and every reader of the spec) agrees on it. `budget` is
 * the walk's budget for this attempt; by default it is the most any attempt can reach (the base
 * budget plus one step per later attempt, P28), so a layout drawn at any step passes the oracle.
 */
export function specFor(input: GenInput, _seed: number, budget?: number): GenSpec {
  const heart = isHeartRoom(input);
  const base = { drawing: input.drawing, room: input.room, heart, kits: GEN_KITS } as const;
  const ceiling = baseBudget(input) + (GEN_LIMITS.attempts - 1) * GEN_TUNING.step;
  if (heart) {
    return { ...base, size: { ...frameOf(input.drawing).size }, budget: budget ?? ceiling };
  }
  const rng = createRng(deriveSeed(input.seed, SIZE_SALT + input.room));
  const depth = Math.min(input.room, 3);
  const hint = input.drawing.rule === CURRENT ? 7 : 6;
  const spec: GenSpec = {
    ...base,
    size: {
      width: clamp(5 + rng.int(0, 1) + (depth >= 2 ? 1 : 0), 5, 7),
      height: clamp(Math.max(hint, 6 + rng.int(0, 1) + Math.min(depth, 2)), 6, 9),
    },
    budget: budget ?? ceiling,
  };
  // A shape's choice (EN-K5) changes the room's spec on top of the walk's budget.
  const shape = GEN_KITS.flatMap((k) => k.shapes).find((x) => x.id === input.drawing.shape);
  return input.choice !== undefined && shape?.adjust ? shape.adjust(spec, input.choice) : spec;
}

// ── P8: the pipeline ──────────────────────────────────────────────────

/** Seam ground: 2-5 tiles cycling plate, oil and vent, so a Seam-basics page always has something to mix. */
function seamGround(layout: BoardSpec, rng: Rng): void {
  const kinds = shuffled(['=', 'o', '@~'], rng);
  const spots = shuffled(plainFree(layout), rng);
  const n = Math.min(spots.length, rng.int(GROUND.min, GROUND.max));
  for (let i = 0; i < n; i++) lay(layout, spots[i] as Coord, kinds[i % kinds.length] as string);
}

/** 4-5 start points on standable tiles in one third of the board (a side chosen by the seed). */
function startPoints(layout: BoardSpec, rng: Rng): void {
  const side = rng.int(0, 3);
  const third = Math.ceil((side < 2 ? layout.height : layout.width) / 3);
  const inThird = (c: Coord): boolean =>
    side === 0
      ? c.y < third
      : side === 1
        ? c.y >= layout.height - third
        : side === 2
          ? c.x < third
          : c.x >= layout.width - third;
  const free = plainFree(layout);
  const region = free.filter(inThird);
  const pool = region.length >= 4 ? region : free;
  layout.starts = shuffled(pool, rng)
    .slice(0, rng.int(4, 5))
    .sort(byReadingOrder)
    .map((c) => ({ ...c }));
}

/** The foe's reach on turn 1 along a line (a sentry's shot), which distance alone does not cover. */
const linesUp = (id: EnemyId, from: Coord, p: Coord): boolean => {
  const attack = ENEMIES[id].attack;
  const a = attack === null ? null : ATTACKS[attack];
  return (
    a !== null &&
    a.kind === 'projectile' &&
    a.range >= MIN_FOE_DISTANCE &&
    (from.x === p.x || from.y === p.y)
  );
};

/** Puts one foe of kit `k` on a valid, reachable tile at distance 3 or more from every P (none: skipped). */
function placeKit(layout: BoardSpec, k: FoeKit, rng: Rng, walk: ReadonlySet<string>): void {
  const ok = coords(layout).filter((c) => {
    const t = at(layout, c);
    if (t === undefined || !k.valid(layout, c) || layout.units.some((u) => sameAt(u.at, c))) {
      return false;
    }
    // A land foe stays off the lanes (the current would carry it away before it acts).
    if (k.habitat !== 'water' && isWater(t)) return false;
    if (layout.starts.some((p) => manhattan(p, c) < MIN_FOE_DISTANCE || linesUp(k.id, c, p))) {
      return false;
    }
    return foeReached(layout, walk, { def: k.id, at: c });
  });
  // Spread: prefer a tile away from the foes already placed, else any.
  const apart = ok.filter((c) => layout.units.every((u) => manhattan(u.at, c) >= 2));
  const pool = apart.length > 0 ? apart : ok;
  const c = pool[rng.int(0, pool.length - 1)];
  if (!c) return;
  layout.units.push({
    kind: 'enemy',
    def: k.id,
    at: { ...c },
    mark: null,
    collar: false,
    shackle: false,
    shield: 0,
  });
}

/** Foes by budget (each kind once first, then by the seed), at distance 3 or more from every P, on reachable tiles. */
function placeFoes(layout: BoardSpec, spec: GenSpec, rng: Rng, budget: number): void {
  const kits = spec.drawing.foes.flatMap((id) => foeKitOf(spec, id) ?? []);
  if (kits.length === 0) return;
  const walk = footRegion(layout);
  const queue: FoeKit[] = [];
  let left = budget;
  for (const k of kits) {
    if (k.budget <= left) {
      queue.push(k);
      left -= k.budget;
    }
  }
  for (;;) {
    const fit = kits.filter((k) => k.budget <= left);
    if (fit.length === 0) break;
    const k = fit[rng.int(0, fit.length - 1)] as FoeKit;
    queue.push(k);
    left -= k.budget;
  }
  for (const k of queue) placeKit(layout, k, rng, walk);
  layout.units.sort((a, b) => byReadingOrder(a.at, b.at));
}

/** The fallback's budget: half the room's, never less than its dearest drawn foe (so it still has every kind it can afford). */
function halfBudget(spec: GenSpec): number {
  const dearest = Math.max(1, ...spec.drawing.foes.map((id) => foeKitOf(spec, id)?.budget ?? 1));
  return Math.min(spec.budget, Math.max(dearest, Math.floor(spec.budget / 2)));
}

/**
 * One layout from one seed (P8): rule stamp, Seam ground, starts, pieces, shape, foes. The bell
 * stamp needs starts first to keep their paths open. The safe fallback uses half the foe budget,
 * the rule's minimum stamp and no pieces.
 */
function compose(spec: GenSpec, seed: number, minimum: boolean): BoardSpec {
  const rng = createRng(seed);
  let layout = blank(spec.size.width, spec.size.height);
  const rule = ruleKitOf(spec);
  if (rule?.id === BELLS) startPoints(layout, rng);
  if (rule) layout = rule.stamp(layout, deriveSeed(seed, 1), minimum, spec.fuller === true);
  seamGround(layout, rng);
  if (rule?.id !== BELLS) startPoints(layout, rng);
  if (!minimum) {
    const pieces = spec.kits
      .flatMap((k) => k.pieces)
      .filter((p) => spec.drawing.pieces.includes(p.id))
      .sort((a, b) => b.matters(layout) - a.matters(layout));
    for (const [i, piece] of pieces.entries()) {
      layout = piece.place(layout, deriveSeed(seed, 2 + i)) ?? layout;
    }
  }
  // P40: the shape's own room additions, seen by the guardrails and the trial (never the heart).
  const shape = spec.kits.flatMap((k) => k.shapes).find((x) => x.id === spec.drawing.shape);
  if (shape?.stamp) {
    layout = shape.stamp(layout, spec.room, spec.drawing.length, deriveSeed(seed, 3));
  }
  placeFoes(layout, spec, rng, minimum ? halfBudget(spec) : spec.budget);
  return layout;
}

/**
 * A heart from its frame (P35): the frame's own setup on a board of the frame's size (master,
 * escorts of its own, ground, start points), the drawing's rule stamped only on the frame's
 * `ruleAt` tiles that are still plain, then the frame's listed escorts placed like any foe.
 */
function composeHeart(spec: GenSpec, frame: HeartFrame, seed: number): BoardSpec {
  const rng = createRng(seed);
  const layout = frame.setup.frame(blank(frame.size.width, frame.size.height), deriveSeed(seed, 1));
  const rule = ruleKitOf(spec);
  if (rule && frame.ruleAt.length > 0) {
    const stamped = rule.stamp(
      blank(frame.size.width, frame.size.height),
      deriveSeed(seed, 2),
      false,
    );
    for (const c of frame.ruleAt) {
      const own = at(layout, c);
      const tile = at(stamped, c);
      if (own !== undefined && tile !== undefined && isPlain(own)) {
        layout.tiles[c.y * layout.width + c.x] = tile;
      }
    }
  }
  const walk = footRegion(layout);
  for (const id of frame.escorts) {
    const k = foeKitOf(spec, id);
    if (!k) throw new RangeError(`No kit for ${id}`);
    placeKit(layout, k, rng, walk);
  }
  layout.units.sort((a, b) => byReadingOrder(a.at, b.at));
  return layout;
}

// ── P9: the oracle ────────────────────────────────────────────────────

const have = (spec: GenSpec): Set<string> => {
  const out = new Set<string>(spec.drawing.pieces);
  const rule = ruleKitOf(spec);
  if (spec.drawing.rule !== null) out.add(spec.drawing.rule);
  for (const p of rule?.brings ?? []) out.add(p);
  return out;
};

/** P9: every guardrail as a test oracle; empty means the layout is fair to offer. */
export function checkGenerated(layout: BoardSpec, spec: GenSpec): GenIssue[] {
  const issues: GenIssue[] = [];
  const add = (guardrail: GenIssue['guardrail'], reason: string, where?: Coord): void => {
    issues.push(where ? { guardrail, reason, at: where } : { guardrail, reason });
  };
  for (const p of checkRoom(serializeBoard(layout))) {
    add('room', p.message, p.cell ?? undefined);
  }
  if (layout.width !== spec.size.width || layout.height !== spec.size.height) {
    add(
      'room',
      `The room is ${layout.width}x${layout.height}, the spec asked ${spec.size.width}x${spec.size.height}`,
    );
  }
  const frame = spec.heart ? frameOf(spec.drawing) : undefined;
  const foes = layout.units.filter((u) => u.kind === 'enemy');
  const walk = footRegion(layout);
  const mine = have(spec);
  let cost = 0;
  if (frame && !foes.some((u) => u.def === frame.setup.foe)) {
    add('kit', `The master (${frame.setup.foe}) is not on the board`);
  }
  for (const f of foes) {
    const id = f.def as EnemyId;
    const def = ENEMIES[id];
    if (!frame) {
      const kit = foeKitOf(spec, id);
      if (!kit || !spec.drawing.foes.includes(id)) {
        add('kit', `${def.name} is not on the drawing or in a kit`, f.at);
        continue;
      }
      cost += kit.budget;
      if (!kit.valid(layout, f.at)) add('kit', `${def.name} stands where its kit forbids`, f.at);
      for (const need of kit.needs) {
        if (!need.anyOf.some((x) => mine.has(x))) add('needs', need.reason, f.at);
      }
    }
    for (const p of layout.starts) {
      if (manhattan(p, f.at) < MIN_FOE_DISTANCE) {
        add('distance', `${def.name} is within two tiles of a start point`, f.at);
      } else if (linesUp(id, f.at, p)) {
        add('distance', `${def.name} fires along a line to a start point`, f.at);
      }
    }
    if (!foeReached(layout, walk, f)) {
      add('reach', `${def.name} cannot be reached`, f.at);
    }
    const t = at(layout, f.at);
    const poolMaster = frame?.masterInCloud === true && f.def === frame.setup.foe;
    if (t !== undefined && isHazard(t) && !(poolMaster && t.state?.id === 'cloud')) {
      add('burst', `${def.name} starts in a burst or fire`, f.at);
    }
  }
  for (const p of layout.starts) {
    const t = at(layout, p);
    if (t === undefined || !walk.has(key(p)))
      add('reach', 'A start point cannot be walked from', p);
    else if (isHazard(t)) add('burst', 'A start point is in a burst or fire', p);
  }
  if (!frame && cost > spec.budget) {
    add('budget', `Foes cost ${cost}, the budget is ${spec.budget}`);
  }
  if (foes.length === 0) add('budget', 'The room has no foes');
  const blocked = layout.tiles.filter(blocksUnits).length;
  if (blocked > layout.tiles.length * BLOCKED_SHARE) {
    add('blocked', `${blocked} of ${layout.tiles.length} tiles are blocked`);
  }
  // The current's ground: a room stamps it; a heart has it when its frame does (its own or on `ruleAt`).
  const water = layout.tiles.some(isWater);
  const lamps = layout.tiles.some((t) => t.terrain.lamp);
  const ownsCurrent = frame?.setup.rules.includes(CURRENT) ?? false;
  const stamped = !frame || frame.ruleAt.length > 0 || ownsCurrent;
  if (spec.drawing.rule === CURRENT && stamped && !(water && lamps)) {
    add('needs', 'The current needs lanes and lamps on the board');
  }
  if (spec.drawing.rule !== CURRENT && water && !ownsCurrent) {
    add('needs', 'Water without the current');
  }
  if (frame) return issues;
  const ground = layout.tiles.filter(
    (t) => t.state?.id === 'plate' || t.state?.id === 'slick' || t.terrain.vent,
  ).length;
  if (ground < GROUND.min) add('needs', `The Seam ground has ${ground} tiles, want ${GROUND.min}+`);
  // A selected piece is judged only when it is on the board (the minimum fallback lays none).
  const laid = new Set(layout.tiles.flatMap((t) => (t.piece ? [t.piece.id] : [])));
  for (const k of spec.kits.flatMap((x) => x.pieces)) {
    if (spec.drawing.pieces.includes(k.id) && laid.has(k.id) && !k.valid(layout)) {
      add('kit', `Piece ${k.id} is not valid on this layout`);
    }
  }
  return issues;
}

// ── P10 and P28: the trial, the walk, the fallback ───────────────────

/** One attempt's record: its salt, the layout draws it took, the oracle's verdict and the bot's. */
export interface RoomTrial {
  attempt: number;
  salt: number;
  /** The foe budget this attempt was drawn with (P28: the walk moves it). */
  budget: number;
  draws: number;
  /** The guardrails still broken after the last draw (empty: the layout went to the bot). */
  guardrails: GenIssue[];
  /** `null` when no bot ran (the guardrails held it back). */
  won: boolean | null;
  rounds: number;
  /** Share of the party's HP left at the end (a quality signal for EN-G0: 1 is a walkover). */
  hpLeft: number;
  /** Won with `GEN_TUNING.walkover` to spare: not fair, so not offered while a fairer attempt may come. */
  walkover: boolean;
  ops: number;
  /** A cast hit the event cap during the trial. */
  capped: boolean;
}
/** `generateRoom`'s result, with the trace the fuzz and the dev page read. */
export interface GeneratedRoom extends GenResult {
  /** The bot cleared the offered layout (false: an unverified fallback, counted). */
  verified: boolean;
  /** No attempt was fair: the offered room was won, but as a walkover (or it is a fallback that was). */
  dull: boolean;
  trials: RoomTrial[];
}

/** The trial whose layout `room` carries: the last one, or the last won one for a dull room. */
export function offeredTrial(room: GeneratedRoom): RoomTrial | undefined {
  return room.dull && !room.fallback
    ? room.trials.findLast((t) => t.won === true)
    : room.trials.at(-1);
}

/** Draws layouts until the oracle is green (at most `MAX_DRAWS`); returns the last one either way. */
function draw(
  spec: GenSpec,
  seed: number,
  minimum: boolean,
  frame?: HeartFrame,
): { layout: BoardSpec; issues: GenIssue[]; draws: number } {
  const make = (n: number): BoardSpec =>
    frame
      ? composeHeart(spec, frame, deriveSeed(seed, n))
      : compose(spec, deriveSeed(seed, n), minimum);
  let layout = make(0);
  let issues = checkGenerated(layout, spec);
  let draws = 1;
  while (issues.length > 0 && draws < MAX_DRAWS) {
    layout = make(draws);
    issues = checkGenerated(layout, spec);
    draws++;
  }
  return { layout, issues, draws };
}

const hpShare = (s: BattleState): number => {
  const ms = members(s);
  return (
    ms.reduce((n, m) => n + m.hp, 0) /
    Math.max(
      1,
      ms.reduce((n, m) => n + m.maxHp, 0),
    )
  );
};

const isWalkover = (rounds: number, hpLeft: number): boolean =>
  rounds <= GEN_TUNING.walkover.rounds || hpLeft >= GEN_TUNING.walkover.hpLeft;

/** An attempt the guardrails held back: no bot ran. */
const heldBack = (
  attempt: number,
  salt: number,
  budget: number,
  drawn: { issues: GenIssue[]; draws: number },
): RoomTrial => ({
  attempt,
  salt,
  budget,
  draws: drawn.draws,
  guardrails: drawn.issues,
  won: null,
  rounds: 0,
  hpLeft: 0,
  walkover: false,
  ops: 0,
  capped: false,
});

/**
 * P39: the rules the room lists when it is played: the drawing's own and, at the heart, its master's.
 * The heart's frame rules run at the config the played heart gives them (`heartConfig`); the lent
 * shape's state-dependent config is not reproduced here.
 */
function trialRules(drawing: Drawing, heart: boolean): RuleId[] {
  const ids = [
    ...(drawing.rule === null ? [] : [drawing.rule]),
    ...(heart ? (HEART_FRAMES[drawing.heart]?.setup.rules ?? []) : []),
  ];
  return ids.filter((id, i) => ids.indexOf(id) === i);
}

/** The heart's frame rules at the config the played heart gives them (the drawing's own rule stays at its default). */
function heartConfigs(input: GenInput, heart: boolean): Record<RuleId, Json> {
  const config: Record<RuleId, Json> = {};
  for (const id of heart ? (HEART_FRAMES[input.drawing.heart]?.setup.rules ?? []) : []) {
    const c = heartConfig(id, input.seed);
    if (c !== undefined) config[id] = c;
  }
  return config;
}

/** The room judged fair, not the trip: fresh HP and charges, the party's compiled pages, the room's rules (P39). */
function trial(
  input: GenInput,
  layout: BoardSpec,
  seed: number,
  opBudget: number,
  meta: { attempt: number; salt: number; budget: number; draws: number },
  heart = false,
): RoomTrial {
  const rounds = heart ? GEN_LIMITS.heartRounds : ROOM_ROUNDS;
  const state = createBattle({
    title: 'A drawn room',
    board: serializeBoard(layout),
    ...(heart ? { enemyHp: heartEnemyHp(input.drawing) } : {}),
    seed: deriveSeed(seed, 7991),
    lineup: input.party,
    party: Object.fromEntries(
      input.party.map((id: ApprenticeId) => [
        id,
        { spells: compiledFor(input.profile, id).spells },
      ]),
    ),
  }).state;
  const ids = trialRules(input.drawing, heart);
  if (ids.length > 0) state.rules = listRules(state, ids, heartConfigs(input, heart));
  const r = botTrial(state, opBudget, input.party, { maxRounds: rounds });
  const won = r.won && r.state.round <= rounds;
  const hpLeft = hpShare(r.state);
  return {
    ...meta,
    guardrails: [],
    won,
    rounds: r.state.round,
    hpLeft,
    // A heart is a boss on a fixed frame: the walk cannot move its budget, so it is never judged dull.
    walkover: won && !heart && isWalkover(r.state.round, hpLeft),
    ops: r.ops,
    capped: r.events.some((e) => e.type === 'fizzles' && e.reason === 'cap'),
  };
}

/**
 * P8-P10, P28 and P35: one room from the trip seed, bot-tested on a walking budget. Attempt `n`
 * (1 to `GEN_LIMITS.attempts`) draws from salt `7000 + 10*room + n`. Attempt 1 uses the base
 * budget; the next uses this one's plus `GEN_TUNING.step` after a walkover, minus it after a loss
 * (never below 1); an attempt the guardrails held back (no bot ran) keeps its budget. The first won attempt that is not a walkover is offered.
 * When none is fair but one was won, the last won attempt is offered (`verified`, `dull`). When
 * none was won, the safe fallback (salt `7900 + room`, half the base budget) is offered even when
 * it fails (`verified: false`). A heart (the drawing's last room) comes from its master's frame:
 * `heartAttempts` attempts judged at `heartRounds`, the first win offered, then the frame's own
 * fallback board. Throws `RangeError('No kit for <id>')` for an element or master with no kit.
 */
export function generateRoom(input: GenInput): GeneratedRoom {
  requireKits(input.drawing, GEN_KITS);
  if (isHeartRoom(input)) return generateHeart(input, frameOf(input.drawing));
  const opBudget = input.budget ?? TRIAL_BUDGET;
  const trials: RoomTrial[] = [];
  let ops = 0;
  let budget = baseBudget(input);
  let lastWon: BoardSpec | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const salt = EN_SALT.from + 10 * input.room + attempt;
    const seed = deriveSeed(input.seed, salt);
    const spec = specFor(input, seed, budget);
    const drawn = draw(spec, seed, false);
    const t =
      drawn.issues.length > 0
        ? heldBack(attempt, salt, budget, drawn)
        : trial(input, drawn.layout, seed, opBudget, {
            attempt,
            salt,
            budget,
            draws: drawn.draws,
          });
    trials.push(t);
    ops += t.ops;
    if (t.won && !t.walkover) {
      return {
        layout: drawn.layout,
        attempts: attempt,
        fallback: false,
        ops,
        verified: true,
        dull: false,
        trials,
      };
    }
    if (t.won) lastWon = drawn.layout;
    if (t.won !== null) budget = Math.max(1, budget + (t.won ? GEN_TUNING.step : -GEN_TUNING.step));
  }
  if (lastWon) {
    return {
      layout: lastWon,
      attempts: MAX_ATTEMPTS,
      fallback: false,
      ops,
      verified: true,
      dull: true,
      trials,
    };
  }
  const salt = EN_SALT.fallback + input.room;
  const seed = deriveSeed(input.seed, salt);
  const base = baseBudget(input);
  const spec = specFor(input, seed, base);
  const drawn = draw(spec, seed, true);
  const t =
    drawn.issues.length > 0
      ? heldBack(MAX_ATTEMPTS + 1, salt, base, drawn)
      : trial(input, drawn.layout, seed, opBudget, {
          attempt: MAX_ATTEMPTS + 1,
          salt,
          budget: base,
          draws: drawn.draws,
        });
  trials.push(t);
  ops += t.ops;
  return {
    layout: drawn.layout,
    attempts: MAX_ATTEMPTS,
    fallback: true,
    ops,
    verified: t.won === true,
    dull: t.walkover,
    trials,
  };
}

/** P35: a heart from its frame, judged like a room but never as a walkover; then the authored fallback. */
function generateHeart(input: GenInput, frame: HeartFrame): GeneratedRoom {
  const opBudget = input.budget ?? TRIAL_BUDGET;
  const trials: RoomTrial[] = [];
  let ops = 0;
  const budget = baseBudget(input);
  for (let attempt = 1; attempt <= GEN_LIMITS.heartAttempts; attempt++) {
    const salt = EN_SALT.from + 10 * input.room + attempt;
    const seed = deriveSeed(input.seed, salt);
    const spec = specFor(input, seed, budget);
    const drawn = draw(spec, seed, false, frame);
    const meta = { attempt, salt, budget, draws: drawn.draws };
    const t =
      drawn.issues.length > 0
        ? heldBack(attempt, salt, budget, drawn)
        : trial(input, drawn.layout, seed, opBudget, meta, true);
    trials.push(t);
    ops += t.ops;
    if (t.won) {
      return {
        layout: drawn.layout,
        attempts: attempt,
        fallback: false,
        ops,
        verified: true,
        dull: false,
        trials,
      };
    }
  }
  const salt = EN_SALT.fallback + input.room;
  const layout = frame.fallback;
  const t = trial(
    input,
    layout,
    deriveSeed(input.seed, salt),
    opBudget,
    { attempt: GEN_LIMITS.heartAttempts + 1, salt, budget, draws: 0 },
    true,
  );
  trials.push(t);
  ops += t.ops;
  return {
    layout,
    attempts: GEN_LIMITS.heartAttempts,
    fallback: true,
    ops,
    verified: t.won === true,
    dull: false,
    trials,
  };
}

/**
 * Generates and stores room `room` of a drawn trip (default: the current one). A room already
 * stored returns `t` itself, so a reload replays the layout and the bot never runs twice (P31).
 */
export function inkRoom(p: Profile, t: Trip, room: number = t.encounter): Trip {
  const input = roomInput(p, t, room);
  if (parseInkedState(t.kit?.state).rooms[room] !== null) return t;
  return storeRoom(t, room, serializeBoard(generateRoom(input).layout));
}
