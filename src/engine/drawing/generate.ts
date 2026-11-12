import { type ApprenticeId, ATTACKS, ENEMIES, type EnemyId } from '$data';
import { COSTS, NEEDS } from '$data/drawing';
import { createBattle } from '../battle';
import { cloneData } from '../clone';
import type { PieceId, RuleId } from '../districts/types';
import { byReadingOrder, type Coord, key } from '../grid';
import { type BoardSpec, emptyTile, parseCell, serializeBoard } from '../notation';
import { blocksShots, blocksUnits, members } from '../queries';
import { createRng, deriveSeed, type Rng } from '../rng';
import { checkRoom } from '../rooms';
import { compiledFor } from '../run';
import { TRIAL_BUDGET } from '../sim';
import type { BattleState, Tile } from '../types';
import { weightBand } from './cost';
import { botTrial } from './trial';
import {
  EN_SALT,
  type FoeKit,
  type GenInput,
  type GenIssue,
  type GenKit,
  type GenResult,
  type GenSpec,
  type Need,
  type RuleKit,
} from './types';

/**
 * P8-P10, spike (EN-S1): one room from the trip seed on built content only (the Seam's foes and
 * ground, the canals' current and lamps), judged by the engine bot and redrawn up to four times,
 * then the safe fallback. Pure and deterministic: every draw comes from a salted seed, and the
 * only limit on the bot is its operation budget, never the clock. EN-2 finishes it (the other
 * districts' kits, `matters` scoring, depth budgets).
 */

/** P10: the bot must win within this many rounds (the heart's 16 belongs to the frames, EN-2). */
export const ROOM_ROUNDS = 12;
/** P10: bot-tested attempts before the safe fallback. */
export const MAX_ATTEMPTS = 4;
/** P8: foes stand at Manhattan distance 3 or more from every start point (two clear tiles between). */
export const MIN_FOE_DISTANCE = 3;
/** P9: blocked tiles (plates, gates, grates, solid pieces) up to this share of the board. */
export const BLOCKED_SHARE = 0.3;
/** Layout draws per attempt before the guardrails give up on it (cheap: no bot yet). */
export const MAX_DRAWS = 8;
/** P8: Seam ground, 2 to 5 tiles of plates, oil or vents. */
const GROUND = { min: 2, max: 5 } as const;
/** P7 (spike): +1 minion-equivalent per weight band over the depth's base. */
const BAND_BONUS = { light: 0, medium: 1, heavy: 2 } as const;

const CURRENT: RuleId = 'canals:current';

// ── Kits: the spike's adapter for the Seam and the canals ─────────────

const needsOf = (id: string): readonly Need[] =>
  (NEEDS[id] ?? []).map((n) => ({
    anyOf: n.anyOf as readonly (RuleId | PieceId)[],
    reason: n.reason,
  }));

const at = (layout: BoardSpec, c: Coord): Tile | undefined =>
  c.x < 0 || c.y < 0 || c.x >= layout.width || c.y >= layout.height
    ? undefined
    : layout.tiles[c.y * layout.width + c.x];

const isWater = (t: Tile): boolean => t.terrain.water !== null;
/** A tile nothing is laid on: free for ground, lamps, start points and foes of any habitat. */
const isPlain = (t: Tile): boolean =>
  !isWater(t) &&
  !t.terrain.gate &&
  !t.terrain.grate &&
  !t.terrain.drop &&
  !t.terrain.vent &&
  !t.terrain.lamp &&
  t.state === null &&
  t.piece === null &&
  t.jar === null;
/** P9 "no unit starting in a burst or fire": fire, a cloud or a vent. */
const isHazard = (t: Tile): boolean =>
  t.state?.id === 'fire' || t.state?.id === 'cloud' || t.terrain.vent;

const blank = (width: number, height: number): BoardSpec => ({
  width,
  height,
  tiles: Array.from({ length: width * height }, emptyTile),
  units: [],
  starts: [],
});

const lay = (layout: BoardSpec, c: Coord, token: string): void => {
  layout.tiles[c.y * layout.width + c.x] = parseCell(token, c).tile;
};

const coords = (layout: BoardSpec): Coord[] =>
  Array.from({ length: layout.width * layout.height }, (_, i) => ({
    x: i % layout.width,
    y: Math.floor(i / layout.width),
  }));

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const swap = out[i] as T;
    out[i] = out[j] as T;
    out[j] = swap;
  }
  return out;
}

const plainFree = (layout: BoardSpec): Coord[] =>
  coords(layout).filter((c) => {
    const t = at(layout, c);
    return t !== undefined && isPlain(t) && !layout.units.some((u) => sameAt(u.at, c));
  });
const sameAt = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * The current's stamp (P4: the rule brings its lanes): one or two straight lanes, side by side
 * and flowing one way, across the whole board, then lamps on the banks (the moth needs them). The
 * minimum stamp is one lane and one lamp.
 */
const currentKit: RuleKit = {
  id: CURRENT,
  brings: [],
  needs: [],
  stamp(layout, seed, minimum) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const vertical = rng.int(0, 1) === 0;
    const lanes = minimum ? 1 : rng.int(1, 2);
    const span = vertical ? out.width : out.height;
    const first = rng.int(1, Math.max(1, span - 1 - lanes));
    const flow = vertical ? (rng.int(0, 1) === 0 ? 'v' : '^') : rng.int(0, 1) === 0 ? '>' : '<';
    for (const c of coords(out)) {
      const line = vertical ? c.x : c.y;
      if (line >= first && line < first + lanes) lay(out, c, `w${flow}`);
    }
    const banks = shuffled(
      coords(out).filter((c) => {
        const t = at(out, c);
        return (
          t !== undefined &&
          isPlain(t) &&
          [
            { x: c.x + 1, y: c.y },
            { x: c.x - 1, y: c.y },
            { x: c.x, y: c.y + 1 },
            { x: c.x, y: c.y - 1 },
          ].some((n) => {
            const nt = at(out, n);
            return nt !== undefined && isWater(nt);
          })
        );
      }),
      rng,
    );
    for (const c of banks.slice(0, minimum ? 1 : rng.int(2, 3))) lay(out, c, 'l');
    return out;
  },
};

const foeKit = (id: EnemyId): FoeKit => {
  const def = ENEMIES[id];
  return {
    id,
    needs: needsOf(id),
    budget: def.elite ? COSTS.elite : COSTS.minion,
    habitat: def.habitat,
    valid(layout, c) {
      const t = at(layout, c);
      if (t === undefined || blocksUnits(t) || isHazard(t)) return false;
      return def.habitat === 'water' ? isWater(t) : def.habitat === 'land' ? !isWater(t) : true;
    },
  };
};

/** The Seam: its three foes and its ground (no rule of its own). */
const SEAM_KIT: GenKit = {
  district: 'seam',
  rules: [],
  pieces: [],
  foes: (['rat', 'familiar', 'sentry'] as const).map(foeKit),
  shapes: [],
  frames: [],
};
/** The canals: the current with its lamps, the eel on its lanes and the moth by its lamps. */
const CANALS_KIT: GenKit = {
  district: 'canals',
  rules: [currentKit],
  pieces: [],
  foes: (['eel', 'moth'] as const).map(foeKit),
  shapes: [],
  frames: [],
};
export const SPIKE_KITS: readonly GenKit[] = [SEAM_KIT, CANALS_KIT];

const ruleKitOf = (spec: GenSpec): RuleKit | undefined =>
  spec.kits.flatMap((k) => k.rules).find((r) => r.id === spec.drawing.rule);
const foeKitOf = (spec: GenSpec, id: EnemyId): FoeKit | undefined =>
  spec.kits.flatMap((k) => k.foes).find((f) => f.id === id);

// ── The spec ──────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** P8 size from depth and kit hints (5-7 wide, 6-9 tall: deeper rooms are bigger; the current wants 7 rows). */
export function specFor(input: GenInput, seed: number): GenSpec {
  const rng = createRng(deriveSeed(seed, 7990));
  const depth = Math.min(input.room, 3);
  const hint = input.drawing.rule === CURRENT ? 7 : 6;
  return {
    drawing: input.drawing,
    room: input.room,
    heart: false,
    size: {
      width: clamp(5 + rng.int(0, 1) + (depth >= 2 ? 1 : 0), 5, 7),
      height: clamp(Math.max(hint, 6 + rng.int(0, 1) + Math.min(depth, 2)), 6, 9),
    },
    budget: 3 + depth + BAND_BONUS[weightBand(input.drawing)],
    kits: SPIKE_KITS,
  };
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

/** Tiles a party can walk to from any start point (units ignored). */
function walkable(layout: BoardSpec): Set<string> {
  const seen = new Set<string>();
  const queue = layout.starts.filter((c) => {
    const t = at(layout, c);
    return t !== undefined && !blocksUnits(t);
  });
  for (const c of queue) seen.add(key(c));
  for (let c = queue.shift(); c; c = queue.shift()) {
    for (const n of [
      { x: c.x + 1, y: c.y },
      { x: c.x - 1, y: c.y },
      { x: c.x, y: c.y + 1 },
      { x: c.x, y: c.y - 1 },
    ]) {
      const t = at(layout, n);
      if (t === undefined || blocksUnits(t) || seen.has(key(n))) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
}

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;
/** The bolt's reach: a tile in line with a walkable one, nothing standing up between. */
const BOLT_REACH = 4;
function castable(layout: BoardSpec, walk: ReadonlySet<string>, c: Coord): boolean {
  for (const d of DIRS) {
    for (let i = 1; i <= BOLT_REACH; i++) {
      const n = { x: c.x + d.x * i, y: c.y + d.y * i };
      const t = at(layout, n);
      if (t === undefined) break;
      if (walk.has(key(n))) return true;
      if (blocksShots(t)) break;
    }
  }
  return false;
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

/** Foes by budget (each kind once first, then by the seed), at distance 3 or more from every P, on reachable tiles. */
function placeFoes(layout: BoardSpec, spec: GenSpec, rng: Rng, budget: number): void {
  const kits = spec.drawing.foes.flatMap((id) => foeKitOf(spec, id) ?? []);
  if (kits.length === 0) return;
  const walk = walkable(layout);
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
  for (const k of queue) {
    const def = ENEMIES[k.id];
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
      return walk.has(key(c)) || ((def.flies || def.anchored) && castable(layout, walk, c));
    });
    // Spread: prefer a tile away from the foes already placed, else any.
    const apart = ok.filter((c) => layout.units.every((u) => manhattan(u.at, c) >= 2));
    const pool = apart.length > 0 ? apart : ok;
    const c = pool[rng.int(0, pool.length - 1)];
    if (!c) continue;
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
  layout.units.sort((a, b) => byReadingOrder(a.at, b.at));
}

/** The fallback's budget: half the room's, never less than its dearest drawn foe (so it still has every kind it can afford). */
function halfBudget(spec: GenSpec): number {
  const dearest = Math.max(1, ...spec.drawing.foes.map((id) => foeKitOf(spec, id)?.budget ?? 1));
  return Math.min(spec.budget, Math.max(dearest, Math.floor(spec.budget / 2)));
}

/**
 * One layout from one seed: size, rule stamp, Seam ground, pieces, start points, foes (P8). The
 * stamp comes before the ground in the spike so ground never lands under a lane. `minimum` is the
 * safe fallback: half the foe budget, the rule's minimum stamp, no pieces.
 */
function compose(spec: GenSpec, seed: number, minimum: boolean): BoardSpec {
  const rng = createRng(seed);
  let layout = blank(spec.size.width, spec.size.height);
  const rule = ruleKitOf(spec);
  if (rule) layout = rule.stamp(layout, deriveSeed(seed, 1), minimum);
  seamGround(layout, rng);
  if (!minimum) {
    const pieces = spec.kits
      .flatMap((k) => k.pieces)
      .filter((p) => spec.drawing.pieces.includes(p.id))
      .sort((a, b) => b.matters(layout) - a.matters(layout));
    for (const p of pieces) layout = p.place(layout, deriveSeed(seed, 2)) ?? layout;
  }
  startPoints(layout, rng);
  placeFoes(layout, spec, rng, minimum ? halfBudget(spec) : spec.budget);
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
  const foes = layout.units.filter((u) => u.kind === 'enemy');
  const walk = walkable(layout);
  const mine = have(spec);
  let cost = 0;
  for (const f of foes) {
    const id = f.def as EnemyId;
    const def = ENEMIES[id];
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
    for (const p of layout.starts) {
      if (manhattan(p, f.at) < MIN_FOE_DISTANCE) {
        add('distance', `${def.name} is within two tiles of a start point`, f.at);
      } else if (linesUp(id, f.at, p)) {
        add('distance', `${def.name} fires along a line to a start point`, f.at);
      }
    }
    if (!walk.has(key(f.at)) && !((def.flies || def.anchored) && castable(layout, walk, f.at))) {
      add('reach', `${def.name} cannot be reached`, f.at);
    }
    const t = at(layout, f.at);
    if (t !== undefined && isHazard(t)) add('burst', `${def.name} starts in a burst or fire`, f.at);
  }
  for (const p of layout.starts) {
    const t = at(layout, p);
    if (t === undefined || !walk.has(key(p)))
      add('reach', 'A start point cannot be walked from', p);
    else if (isHazard(t)) add('burst', 'A start point is in a burst or fire', p);
  }
  if (cost > spec.budget) add('budget', `Foes cost ${cost}, the budget is ${spec.budget}`);
  if (foes.length === 0) add('budget', 'The room has no foes');
  const blocked = layout.tiles.filter(blocksUnits).length;
  if (blocked > layout.tiles.length * BLOCKED_SHARE) {
    add('blocked', `${blocked} of ${layout.tiles.length} tiles are blocked`);
  }
  const water = layout.tiles.some(isWater);
  const lamps = layout.tiles.some((t) => t.terrain.lamp);
  if (spec.drawing.rule === CURRENT && !(water && lamps)) {
    add('needs', 'The current needs lanes and lamps on the board');
  }
  if (spec.drawing.rule !== CURRENT && water) add('needs', 'Water without the current');
  const ground = layout.tiles.filter(
    (t) => t.state?.id === 'plate' || t.state?.id === 'slick' || t.terrain.vent,
  ).length;
  if (ground < GROUND.min) add('needs', `The Seam ground has ${ground} tiles, want ${GROUND.min}+`);
  for (const k of spec.kits.flatMap((x) => x.pieces)) {
    if (spec.drawing.pieces.includes(k.id) && !k.valid(layout)) {
      add('kit', `Piece ${k.id} is not valid on this layout`);
    }
  }
  return issues;
}

// ── P10: the trial, the attempts, the fallback ───────────────────────

/** One attempt's record: its salt, the layout draws it took, the oracle's verdict and the bot's. */
export interface RoomTrial {
  attempt: number;
  salt: number;
  draws: number;
  /** The guardrails still broken after the last draw (empty: the layout went to the bot). */
  guardrails: GenIssue[];
  /** `null` when no bot ran (the guardrails held it back). */
  won: boolean | null;
  rounds: number;
  /** Share of the party's HP left at the end (a quality signal for EN-G0: 1 is a walkover). */
  hpLeft: number;
  ops: number;
  /** A cast hit the event cap during the trial. */
  capped: boolean;
}
/** `generateRoom`'s result, with the trace the fuzz and the dev page read. */
export interface GeneratedRoom extends GenResult {
  /** The bot cleared the offered layout (false: an unverified fallback, counted). */
  verified: boolean;
  trials: RoomTrial[];
}

/** Draws layouts until the oracle is green (at most `MAX_DRAWS`); returns the last one either way. */
function draw(
  spec: GenSpec,
  seed: number,
  minimum: boolean,
): { layout: BoardSpec; issues: GenIssue[]; draws: number } {
  let layout = compose(spec, deriveSeed(seed, 0), minimum);
  let issues = checkGenerated(layout, spec);
  let draws = 1;
  while (issues.length > 0 && draws < MAX_DRAWS) {
    layout = compose(spec, deriveSeed(seed, draws), minimum);
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

/** The room judged fair, not the trip: fresh HP and charges, the party's compiled pages. */
function trial(
  input: GenInput,
  layout: BoardSpec,
  seed: number,
  budget: number,
  attempt: number,
  salt: number,
  draws: number,
): RoomTrial {
  const state = createBattle({
    title: 'A drawn room',
    board: serializeBoard(layout),
    seed: deriveSeed(seed, 7991),
    lineup: input.party,
    party: Object.fromEntries(
      input.party.map((id: ApprenticeId) => [
        id,
        { spells: compiledFor(input.profile, id).spells },
      ]),
    ),
  }).state;
  const r = botTrial(state, budget, input.party);
  return {
    attempt,
    salt,
    draws,
    guardrails: [],
    won: r.won && r.state.round <= ROOM_ROUNDS,
    rounds: r.state.round,
    hpLeft: hpShare(r.state),
    ops: r.ops,
    capped: r.events.some((e) => e.type === 'fizzles' && e.reason === 'cap'),
  };
}

/**
 * P8-P10: one room from the trip seed, bot-tested, with the safe fallback. Attempt `n` (1-4) draws
 * from salt `7000 + 10*room + n`; the fallback from `7900 + room`. The first room the bot wins
 * within 12 rounds is offered; the fallback is offered even when it fails (`verified: false`).
 * Hearts come from their frames (EN-2), not from here.
 */
export function generateRoom(input: GenInput): GeneratedRoom {
  if (input.room >= input.drawing.length - 1) {
    throw new RangeError('The spike draws rooms, not hearts: a heart is its frame (EN-2)');
  }
  const budget = input.budget ?? TRIAL_BUDGET;
  const trials: RoomTrial[] = [];
  let ops = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const salt = EN_SALT.from + 10 * input.room + attempt;
    const seed = deriveSeed(input.seed, salt);
    const spec = specFor(input, seed);
    const drawn = draw(spec, seed, false);
    if (drawn.issues.length > 0) {
      trials.push({
        attempt,
        salt,
        draws: drawn.draws,
        guardrails: drawn.issues,
        won: null,
        rounds: 0,
        hpLeft: 0,
        ops: 0,
        capped: false,
      });
      continue;
    }
    const t = trial(input, drawn.layout, seed, budget, attempt, salt, drawn.draws);
    trials.push(t);
    ops += t.ops;
    if (t.won) {
      return {
        layout: drawn.layout,
        attempts: attempt,
        fallback: false,
        ops,
        verified: true,
        trials,
      };
    }
  }
  const salt = EN_SALT.fallback + input.room;
  const seed = deriveSeed(input.seed, salt);
  const spec = specFor(input, seed);
  const drawn = draw(spec, seed, true);
  const t =
    drawn.issues.length > 0
      ? {
          attempt: MAX_ATTEMPTS + 1,
          salt,
          draws: drawn.draws,
          guardrails: drawn.issues,
          won: null,
          rounds: 0,
          hpLeft: 0,
          ops: 0,
          capped: false,
        }
      : trial(input, drawn.layout, seed, budget, MAX_ATTEMPTS + 1, salt, drawn.draws);
  trials.push(t);
  ops += t.ops;
  return {
    layout: drawn.layout,
    attempts: MAX_ATTEMPTS,
    fallback: true,
    ops,
    verified: t.won === true,
    trials,
  };
}
