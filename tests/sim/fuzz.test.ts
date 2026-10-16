import { expect, test } from 'vitest';
import {
  DISTRICT_IDS,
  DISTRICTS,
  ENCOUNTERS,
  ENEMIES,
  type EnemyId,
  encountersOf,
  INTERACTION_IDS,
  type InteractionId,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SOLVENT_IDS,
  type SolventId,
  START_COLLECTION,
  TUNING,
} from '$data';
import {
  type Action,
  type ActionResult,
  applyAction,
  applyDoorway,
  argIssue,
  type BattleSpec,
  type BattleState,
  bankKeys,
  beginEncounter,
  blockingAuras,
  boardOf,
  type CityState,
  type Coord,
  canBeOpen,
  canPlace,
  canReturn,
  canUndoMove,
  castableSpells,
  cellsWithArgs,
  closeBattle,
  clustersOf,
  compiledFor,
  compileGlyph,
  compileLattice,
  createBattle,
  createEncounterBattle,
  createRng,
  DIRS,
  deriveSeed,
  describe as describeEvent,
  describeLog,
  disconnected,
  extraExitSides,
  finishEncounter,
  type GameEvent,
  type GlyphArg,
  type GlyphDef,
  type GlyphInside,
  type GlyphLibrary,
  glyphLibrary,
  hearAfterTrip,
  hearFromBattle,
  inBoard,
  inkUsed,
  insideOf,
  isGlyph,
  isLegal,
  isSocket,
  key,
  latticeOf,
  legalAims,
  legalMoves,
  type MemberUnit,
  masksFrom,
  memberById,
  newProfile,
  openAll,
  type PlacedGlyph,
  type Profile,
  parseLabel,
  parseSaveData,
  pickLoot,
  provenCount,
  pushOn,
  type Rng,
  recordAction,
  recordOf,
  recordProof,
  replay,
  returnHome,
  revertGlyph,
  reviseGlyph,
  rewardsOf,
  rotateDirLocal,
  seeMap,
  setExtraExit,
  setMemberLattice,
  setOpenCells,
  setSocket,
  shoveDirs,
  solveThreshold,
  startTrip,
  step,
  type TierLevel,
  type Trip,
  tileAt,
  type Unit,
  validateLoadout,
  variantFor,
  versionKey,
} from '$engine';
import { applyBrass, applyEtch, applyKiln, applyScald } from '$engine/materials';
import { board, draft } from '../scenarios/harness';
import { randomArg, randomValidInside } from './mastery-bot';

/**
 * Fuzz harness: random and greedy bots play whole trips over the pure engine. Every action is
 * checked against invariants; violations are collected (not thrown) and summarised at the end.
 * Test-only code: nothing here is engine logic.
 */

const MAX_ROUNDS = 60;
const SEEDS = Number(process.env.FUZZ_SEEDS ?? 8);
const REPLAY_EVERY = 5; // replay-compare every Nth finished battle (cost)
const STALL_ROUNDS = 20;
// '@entry' modes start every trip at encounter (seed % 4) with a full party, so the deeper
// encounters get played by both bots too (organic trips rarely reach them).
const BOT_KINDS = ['random', 'greedy', 'random@entry', 'greedy@entry'] as const;
type Bot = (typeof BOT_KINDS)[number];
const isRandom = (b: Bot): boolean => b.startsWith('random');

// ── Issue log ───────────────────────────────────────────

const issues = new Map<string, { count: number; example: string }>();
/**
 * Engine bugs the fuzz found but that are not fixed yet: counted and printed, never failing the
 * run. Each needs a skipped repro test below; delete the entry (and un-skip the test) once fixed.
 */
const KNOWN_ENGINE_GAPS = new Set<string>([]);
const knownGaps = new Map<string, { count: number; example: string }>();
function flag(rule: string, example: string): void {
  const book = KNOWN_ENGINE_GAPS.has(rule) ? knownGaps : issues;
  const cur = book.get(rule);
  if (cur) {
    cur.count += 1;
    return;
  }
  book.set(rule, { count: 1, example: example.slice(0, 3000) });
}

// ── Small helpers ───────────────────────────────────────

const liveMembers = (s: BattleState): MemberUnit[] =>
  s.units.filter((u): u is MemberUnit => u.kind === 'member' && u.hp > 0);
const liveEnemies = (s: BattleState): Unit[] =>
  s.units.filter((u) => u.kind === 'enemy' && u.hp > 0);
const enemyHpTotal = (s: BattleState): number =>
  s.units.reduce((a, u) => a + (u.kind === 'enemy' ? u.hp : 0), 0);
const memberHpTotal = (s: BattleState): number =>
  s.units.reduce((a, u) => a + (u.kind === 'member' ? u.hp : 0), 0);
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const sameTile = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[rng.int(0, xs.length - 1)] as T;
}

function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** A cheap signature of everything a player can see change; used for stall detection. */
function progressSig(s: BattleState): string {
  const units = s.units.map((u) => `${u.pos.x},${u.pos.y},${u.hp},${u.shield}`).join('|');
  let board = 0;
  for (const t of s.tiles) {
    board += t.steam + t.fire + t.heat + (t.oil ? 1 : 0) + (t.ink ? 1 : 0) + (t.stain ? 1 : 0);
  }
  return `${units}#${board}`;
}

// ── State invariants ────────────────────────────────────

function checkState(s: BattleState, where: string): void {
  const seen = new Map<string, string>();
  for (const u of s.units) {
    const at = `${where} ${u.name}@${key(u.pos)}`;
    if (u.pos.x < 0 || u.pos.y < 0 || u.pos.x >= s.width || u.pos.y >= s.height) {
      flag('unit outside the board', at);
    }
    if (!Number.isInteger(u.hp) || u.hp < 0 || u.hp > u.maxHp) {
      flag('hp outside [0, maxHp]', `${at} hp=${u.hp}/${u.maxHp}`);
    }
    if (u.shield < 0) flag('negative shield', `${at} shield=${u.shield}`);
    if (!Number.isInteger(u.heat) || u.heat < 0 || u.heat > TUNING.heatRounds) {
      flag('unit heat outside [0, heatRounds]', `${at} heat=${u.heat}`);
    }
    if (u.heat > 0 && !u.brass) flag('heat on a unit that is not brass', `${at} heat=${u.heat}`);
    if (u.etched && !u.brass) flag('etched unit that is not brass', at);
    if (u.hp > 0) {
      const k = key(u.pos);
      const prev = seen.get(k);
      if (prev !== undefined) flag('two living units share a tile', `${at} and ${prev}`);
      seen.set(k, u.id);
      const tile = s.tiles[u.pos.y * s.width + u.pos.x];
      if (tile?.plate) flag('living unit on a brass plate', at);
      if (tile?.gate) flag('living unit on a lock gate', at);
      if (tile?.grate) flag('living unit on a grate', at);
      if (u.kind === 'enemy' && u.def === 'eel' && !tile?.water) flag('living eel on land', at);
    }
    if (u.kind === 'member') {
      for (const [spell, n] of Object.entries(u.charges)) {
        if (n < 0) flag('negative charges', `${at} ${spell}=${n}`);
      }
    }
  }
  s.tiles.forEach((t, i) => {
    const at = `${where} tile ${i % s.width},${Math.floor(i / s.width)}`;
    if (t.fire < 0 || t.steam < 0) flag('negative fire or steam counter', at);
    if (t.fire > 0 && !t.oil) flag('fire on a tile without oil', at);
    if (t.fire > 0 && t.steam > 0) flag('fire and steam on the same tile', at);
    if (t.plate && (t.oil || t.ink || t.steam > 0 || t.fire > 0)) {
      flag('brass plate shares its tile with another layer', at);
    }
    if (!Number.isInteger(t.heat) || t.heat < 0 || t.heat > TUNING.heatRounds) {
      flag('tile heat outside [0, heatRounds]', `${at} heat=${t.heat}`);
    }
    if (t.heat > 0 && !t.plate)
      flag('heat on a tile that is not a brass plate', `${at} heat=${t.heat}`);
    if (t.etched && !t.plate) flag('etched tile that is not a brass plate', at);
    if (t.stain && !t.oil) flag('stain on a tile without oil', at);
    if (t.stain && t.fire > 0) flag('stain on burning oil', at);
    if (t.scald && t.steam <= 0) flag('scald on a tile without steam', at);
  });
  if (s.phase === 'won' && liveEnemies(s).length > 0) flag('won with enemies alive', where);
  if (s.phase === 'lost' && liveMembers(s).length > 0) flag('lost with members alive', where);
  if (
    s.phase === 'player' &&
    (liveMembers(s).length === 0 || (liveEnemies(s).length === 0 && !s.objective))
  ) {
    flag('player phase with one side already down', where);
  }
  if (new Set(s.discovered).size !== s.discovered.length) flag('duplicate discoveries', where);
  const orders: number[] = [];
  for (const u of s.units) {
    if (u.kind === 'enemy' && u.intent) {
      if (u.hp <= 0) flag('dead enemy still has an intent', `${where} ${u.name}`);
      orders.push(u.intent.order);
    }
    if (u.kind === 'member' && u.undo !== null && (!u.moved || u.acted || u.hp <= 0)) {
      flag('undo record inconsistent with the member state', `${where} ${u.name}`);
    }
  }
  if (new Set(orders).size !== orders.length) flag('two intents share an order', where);
  for (const e of s.echoes) {
    const c = s.units.find((u) => u.id === e.caster);
    if (c?.kind !== 'member') flag('echo queued by a non-member', `${where} ${e.caster}`);
  }
}

// ── Event invariants ────────────────────────────────────

function checkEvents(events: readonly GameEvent[], where: string): void {
  for (const e of events) {
    if (e.type === 'trace') continue;
    let text: string | null;
    try {
      text = describeEvent(e);
    } catch (err) {
      flag('describe() threw', `${where} ${e.type}: ${String(err)}`);
      continue;
    }
    if (!text || text.trim() === '' || /undefined|NaN|\[object/.test(text)) {
      flag('event text empty or contains undefined/NaN', `${where} ${e.type}: "${text}"`);
    }
    if (e.type === 'moved') {
      let prev = e.unit.at;
      for (const c of e.path) {
        if (manhattan(prev, c) !== 1)
          flag('moved path has a non-adjacent step', `${where} ${text}`);
        prev = c;
      }
      const last = e.path[e.path.length - 1];
      if (!last || !sameTile(last, e.to))
        flag('moved path does not end at its target', `${where} ${text}`);
      const id = e.unit.id.split('-')[0] ?? '';
      const cap = e.unit.member ? MEMBERS[id as MemberId]?.move : ENEMIES[id as EnemyId]?.move;
      if (cap === undefined || e.path.length > cap) {
        flag('moved farther than its move allowance', `${where} ${text} (cap ${cap})`);
      }
    }
    if (e.type === 'damage') {
      if (e.amount < 1) flag('damage below 1', `${where} ${text}`);
      if (e.hpLeft < 0) flag('damage leaves negative hp', `${where} ${text}`);
    }
    if (e.type === 'shieldAbsorbs' && e.left < 0) flag('shield left negative', `${where} ${text}`);
  }
}

// ── Battle runner (applies actions with checks) ─────────

interface BattleRecord {
  label: string;
  bot: Bot;
  state: BattleState;
  events: GameEvent[];
  actions: Action[];
  broken: boolean;
}

class Battle {
  state: BattleState;
  events: GameEvent[];
  actions: Action[] = [];
  broken = false;
  readonly label: string;

  constructor(label: string, start: ActionResult) {
    this.label = label;
    this.state = start.state;
    this.events = [...start.events];
    checkState(start.state, `${label} start`);
    checkEvents(start.events, `${label} start`);
  }

  /** Applies a bot's action. Returns false (and marks the battle broken) if the engine misbehaves. */
  apply(action: Action): boolean {
    if (this.broken || this.state.phase !== 'player') return false;
    const before = this.state;
    const where = `${this.label} r${before.round} ${JSON.stringify(action)}`;
    const snapshot = JSON.stringify(before);

    const reason = isLegal(before, action);
    if (reason !== null) {
      flag('bot action rejected by isLegal (query/isLegal mismatch)', `${where}: ${reason}`);
      this.broken = true;
      return false;
    }

    let r: ActionResult;
    try {
      r = applyAction(before, action);
    } catch (err) {
      flag('legal action threw', `${where}: ${String(err)}`);
      this.broken = true;
      return false;
    }

    if (JSON.stringify(before) !== snapshot) flag('applyAction mutated its input', where);
    if (r.state === before) flag('applyAction returned the input object', where);
    checkEvents(r.events, where);
    checkState(r.state, where);
    checkPost(before, action, r, where);
    checkMonotone(before, r, where);
    checkPaths(before, r.events, where);

    this.state = r.state;
    this.events.push(...r.events);
    this.actions.push(action);
    return true;
  }
}

function checkPost(before: BattleState, action: Action, r: ActionResult, where: string): void {
  const s = r.state;
  if (s.round < before.round) flag('round went backwards', where);
  if (action.type !== 'endTurn' && s.round !== before.round) {
    flag('round changed outside endTurn', where);
  }
  switch (action.type) {
    case 'move': {
      const m = memberById(s, action.unit);
      if (!m.moved || !sameTile(m.pos, action.to)) flag('move postcondition failed', where);
      break;
    }
    case 'undoMove': {
      const from = memberById(before, action.unit).undo?.from;
      const m = memberById(s, action.unit);
      if (m.moved || !from || !sameTile(m.pos, from)) flag('undo postcondition failed', where);
      break;
    }
    case 'cast': {
      const am = memberById(s, action.unit);
      const bm = memberById(before, action.unit);
      if (!am.acted) flag('cast did not mark the member as acted', where);
      if (!s.lab) {
        const was = bm.charges[action.spell] ?? 0;
        const now = am.charges[action.spell] ?? 0;
        if (now !== was - 1)
          flag('cast did not spend exactly one charge', `${where} ${was}->${now}`);
      }
      break;
    }
    case 'shove': {
      if (!memberById(s, action.unit).acted) flag('shove did not mark the member as acted', where);
      break;
    }
    case 'endTurn': {
      if (s.phase === 'player') {
        if (s.round !== before.round + 1) flag('endTurn did not advance the round', where);
        for (const m of liveMembers(s)) {
          if (m.moved || m.acted || m.undo !== null) {
            flag('member flags not reset at the start of the player turn', `${where} ${m.name}`);
          }
        }
      }
      break;
    }
  }
  checkCanalPost(before, r, where);
  for (const e of r.events) {
    if (e.type === 'cast' && !e.echo && action.type !== 'cast') {
      flag('cast event without a cast action', where);
    }
  }
}

/** The current and the anchored (K-8, K-9, K-17): drift moves one tile downstream; the mother stays. */
function checkCanalPost(before: BattleState, r: ActionResult, where: string): void {
  const s = before;
  for (const u of before.units) {
    if (u.kind !== 'enemy' || u.def !== 'mother' || u.hp <= 0) continue;
    const now = r.state.units.find((v) => v.id === u.id);
    if (now && now.hp > 0 && !sameTile(now.pos, u.pos)) flag('the lamp-mother moved', where);
  }
  for (const e of r.events) {
    if (e.type !== 'drift') continue;
    const froms = new Set<string>();
    const tos = new Set<string>();
    for (const f of e.floats) {
      const dir = inBoard(s, f.from) ? tileAt(s, f.from).water : null;
      if (froms.has(key(f.from))) flag('drift moves a float twice', where);
      froms.add(key(f.from));
      if (!dir) {
        flag('a float drifts from a tile with no current', `${where} ${key(f.from)}`);
        continue;
      }
      const next = step(f.from, dir);
      if (f.to === null) {
        if (inBoard(s, next))
          flag('a float left the board from inside it', `${where} ${key(f.from)}`);
      } else {
        tos.add(key(f.to));
        if (inBoard(r.state, f.to) && tileAt(r.state, f.to).plate) {
          flag('drift laid a float on a brass plate', `${where} ${key(f.to)}`);
        }
        if (!sameTile(f.to, next) || !(inBoard(s, f.to) && tileAt(s, f.to).water)) {
          flag('a float did not move one tile downstream onto water', `${where} ${key(f.from)}`);
        }
      }
    }
    // Floats can merge, never split: the count of landing tiles never exceeds the movers.
    const landed = e.floats.filter((f) => f.to !== null).length;
    if (tos.size > landed) flag('drift made more floats than it moved', where);
    for (const m of e.units) {
      const dir = inBoard(s, m.from) ? tileAt(s, m.from).water : null;
      if (
        m.unit.id.startsWith('eel') ||
        m.unit.id.startsWith('moth') ||
        m.unit.id.startsWith('mother')
      ) {
        flag('a swimmer, flier or anchored foe drifted', `${where} ${m.unit.id}`);
      }
      if (dir && !sameTile(m.to, step(m.from, dir))) {
        flag('a unit did not move one tile downstream', `${where} ${m.unit.id}`);
      }
    }
  }
}

// ── Bots ────────────────────────────────────────────────

/** Random bot: per living member, maybe move, maybe act (cast at a random aim, shove, or nothing). */
function randomTurn(b: Battle, rng: Rng): void {
  const order = shuffle(
    rng,
    liveMembers(b.state).map((m) => m.id),
  );
  for (const id of order) {
    if (b.state.phase !== 'player') return;
    const m = memberById(b.state, id);
    if (m.hp <= 0) continue;
    if (!m.moved && rng.next() < 0.8) {
      const tiles = legalMoves(b.state, id);
      if (tiles.length > 0) b.apply({ type: 'move', unit: id, to: pick(rng, tiles) });
    }
    if (canUndoMove(b.state, id) && rng.next() < 0.1) {
      b.apply({ type: 'undoMove', unit: id });
    }
    const roll = rng.next();
    if (roll < 0.6) {
      const usable = castableSpells(b.state, id).filter((c) => c.usable);
      if (usable.length > 0) {
        const spell = pick(rng, usable).spell.key;
        const aims = legalAims(b.state, id, spell);
        if (aims.length > 0) b.apply({ type: 'cast', unit: id, spell, aim: pick(rng, aims) });
      }
    } else if (roll < 0.85) {
      const dirs = shoveDirs(b.state, id);
      if (dirs.length > 0) b.apply({ type: 'shove', unit: id, dir: pick(rng, dirs) });
    }
  }
  b.apply({ type: 'endTurn' });
}

/** Score of an applied action: enemy HP removed, kills, minus the party's own HP lost. */
function scoreOf(before: BattleState, after: BattleState): number {
  const kills = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy' && u.hp <= 0).length;
  const enemyGain = enemyHpTotal(before) - enemyHpTotal(after);
  const selfLoss = memberHpTotal(before) - memberHpTotal(after);
  return enemyGain + 2 * (kills(after) - kills(before)) - 1.5 * selfLoss;
}

interface Scored {
  action: Action;
  score: number;
}

/** The best-scoring cast this member can make from where it stands (no move). */
function bestCast(b: Battle, id: string): Scored | null {
  let best: Scored | null = null;
  for (const c of castableSpells(b.state, id)) {
    if (!c.usable) continue;
    for (const aim of legalAims(b.state, id, c.spell.key)) {
      const action: Action = { type: 'cast', unit: id, spell: c.spell.key, aim };
      let r: ActionResult;
      try {
        r = applyAction(b.state, action);
      } catch (err) {
        flag('legal cast threw during greedy evaluation', `${b.label}: ${String(err)}`);
        continue;
      }
      const score = scoreOf(b.state, r.state);
      if (!best || score > best.score) best = { action, score };
    }
  }
  return best;
}

function nearestEnemy(s: BattleState, at: Coord): number {
  let best = Number.POSITIVE_INFINITY;
  for (const e of liveEnemies(s)) best = Math.min(best, manhattan(at, e.pos));
  return best;
}

/**
 * Greedy bot: per member, cast the best damaging spell from where it stands; if none hurts, step
 * to the reachable tile nearest an enemy and try again. Ends the turn after each member.
 */
function greedyTurn(b: Battle): void {
  for (const id of MEMBER_IDS) {
    if (b.state.phase !== 'player') return;
    const m = memberById(b.state, id);
    if (m.hp <= 0) continue;
    let best = bestCast(b, id);
    if (!best || best.score <= 0) {
      if (!m.moved) {
        let target: Coord | null = null;
        let bestDist = nearestEnemy(b.state, m.pos);
        for (const to of legalMoves(b.state, id)) {
          const d = nearestEnemy(b.state, to);
          if (d < bestDist) {
            bestDist = d;
            target = to;
          }
        }
        if (target) b.apply({ type: 'move', unit: id, to: target });
      }
      best = bestCast(b, id);
    }
    if (best && best.score > 0) b.apply(best.action);
  }
  b.apply({ type: 'endTurn' });
}

// ── Battle driver ───────────────────────────────────────

type Outcome = 'won' | 'lost' | 'capped' | 'stalled' | 'broken';

interface BattleResult {
  outcome: Outcome;
  battle: BattleRecord;
  rounds: number;
  hpLeft: number;
  discovered: InteractionId[];
}

/** A member with nothing to do but end the turn: no move, no usable cast with an aim, no shove. */
function isBoxed(s: BattleState, id: string): boolean {
  if (legalMoves(s, id).length > 0 || shoveDirs(s, id).length > 0) return false;
  return !castableSpells(s, id).some((c) => c.usable && legalAims(s, id, c.spell.key).length > 0);
}

// Hot plates plus Kiln could wall the party in (plan §4). The party is "boxed" in a round when
// every living member is; three such rounds in a row is a soft-lock candidate.
const BOXED_ROUNDS = 3;
const boxStats = { partyBoxedRounds: 0, longestRun: 0, withHotPlate: 0 };

function watchBoxed(s: BattleState, run: { n: number }, label: string): void {
  const live = liveMembers(s);
  const hot = s.tiles.some((t) => t.plate && t.heat > 0);
  if (s.phase !== 'player' || live.length === 0 || !live.every((m) => isBoxed(s, m.id))) {
    run.n = 0;
    return;
  }
  run.n += 1;
  boxStats.partyBoxedRounds += 1;
  if (hot) boxStats.withHotPlate += 1;
  boxStats.longestRun = Math.max(boxStats.longestRun, run.n);
  if (run.n >= BOXED_ROUNDS) {
    flag(
      `party boxed in for ${BOXED_ROUNDS} rounds with no legal action but endTurn`,
      `${label} round ${s.round} hot plates ${hot}\n${boardOf(s)}`,
    );
  }
}

function playBattle(label: string, bot: Bot, start: ActionResult, rng: Rng): BattleResult {
  const b = new Battle(label, start);
  let sig = progressSig(b.state);
  let lastChange = b.state.round;
  const boxed = { n: 0 };
  while (b.state.phase === 'player' && !b.broken) {
    if (b.state.round > MAX_ROUNDS) break;
    watchBoxed(b.state, boxed, label);
    if (isRandom(bot)) randomTurn(b, rng);
    else greedyTurn(b);
    const next = progressSig(b.state);
    if (next !== sig) {
      sig = next;
      lastChange = b.state.round;
    }
  }
  let outcome: Outcome;
  if (b.broken) outcome = 'broken';
  else if (b.state.phase === 'won') outcome = 'won';
  else if (b.state.phase === 'lost') outcome = 'lost';
  else outcome = b.state.round - lastChange >= STALL_ROUNDS ? 'stalled' : 'capped';
  if ((outcome === 'capped' || outcome === 'stalled') && anomalies.length < 8) {
    const tail = describeLog(b.events.slice(-8)).join('\n      ');
    anomalies.push(
      `${outcome} ${label} round ${b.state.round} (last change r${lastChange}) charges ${JSON.stringify(liveMembers(b.state).map((m) => [m.name, m.hp, m.charges]))}\n${boardOf(b.state)}\n      ${tail}`,
    );
  }
  return {
    outcome,
    battle: { label, bot, state: b.state, events: b.events, actions: b.actions, broken: b.broken },
    rounds: b.state.round,
    hpLeft: liveMembers(b.state).reduce((a, m) => a + m.hp, 0),
    discovered: b.state.discovered,
  };
}

// ── Trip-level setup ────────────────────────────────────

function chargesOf(p: Profile, m: MemberId): Record<string, number> {
  return Object.fromEntries(compiledFor(p, m).spells.map((sp) => [sp.key, sp.charges]));
}

/** Mirrors `beginEncounter` as a plain spec so replay can rebuild the battle. */
function specFor(p: Profile, t: Trip): BattleSpec {
  const enc = ENCOUNTERS[t.encounter];
  if (!enc) throw new Error(`no encounter ${t.encounter}`);
  const party: BattleSpec['party'] = {};
  for (const m of MEMBER_IDS) {
    party[m] = {
      hp: t.hp[m],
      spells: compiledFor(p, m).spells,
      charges: { ...chargesOf(p, m), ...t.charges[m] },
    };
  }
  const variant = enc.variants[variantFor(t, t.encounter)];
  return {
    title: variant?.name ?? enc.title,
    board: variant?.layout ?? enc.layout,
    seed: deriveSeed(t.seed, t.encounter),
    party,
  };
}

/** Randomised lattices (runes spread over the sockets) with a few extra copies owned. */
function randomLoadout(seed: number): Profile {
  const rng = createRng(seed ^ 0x51ed);
  let p = newProfile();
  p = {
    ...p,
    collection: Object.fromEntries(RUNE_IDS.map((r) => [r, START_COLLECTION[r] + 2])) as Record<
      RuneId,
      number
    >,
    inkCapacity: { draughtsman: 14, stoker: 14 },
  };
  for (const m of MEMBER_IDS) {
    const shape = latticeOf(p, m).shape;
    for (let y = 0; y < shape.height; y++) {
      for (let x = 0; x < shape.width; x++) {
        const at = { x, y };
        if (!isSocket(shape, at) || rng.next() < 0.5) continue;
        const rune = pick(rng, RUNE_IDS);
        if (canPlace(p, m, at, rune) !== null) continue;
        const dir = pick(rng, DIRS);
        const lat = setSocket(latticeOf(p, m), at, rune, RUNES[rune].arrow ? dir : undefined);
        p = setMemberLattice(p, m, lat);
      }
    }
  }
  return Object.keys(validateLoadout(p)).length === 0 ? p : newProfile();
}

// ── Themed lattices (the loot and bench runes show up in real casts) ──

/** `new`: Pierce, On Ignite, Thrift, Scald, Etch, Kiln among the usual. `kiln`: Kiln-heavy, with fire and brass around it. */
type Theme = 'new' | 'kiln';
const THEMES: Record<Theme, { sources: RuneId[]; chain: RuneId[]; auras: RuneId[] }> = {
  new: {
    sources: ['bolt', 'quill', 'bolt'],
    chain: [
      'pierce',
      'onIgnite',
      'scald',
      'etch',
      'kiln',
      'ink',
      'oil',
      'spark',
      'torch',
      'brass',
      'steam',
      'bend',
      'fork',
      'onInked',
    ],
    auras: ['thrift', 'amplify', 'echo'],
  },
  kiln: {
    sources: ['bolt', 'quill'],
    chain: ['kiln', 'kiln', 'brass', 'oil', 'torch', 'spark', 'etch', 'scald', 'ink', 'pierce'],
    auras: ['thrift'],
  },
};

/** The profile with every rune owned in numbers (the new ones too) and ink to spare. */
function richProfile(base: Profile): Profile {
  const collection = { ...base.collection };
  for (const r of RUNE_IDS) collection[r] = Math.max(collection[r], START_COLLECTION[r] + 3);
  return { ...base, collection, inkCapacity: { draughtsman: 16, stoker: 16 } };
}

/**
 * Lays chains on empty lattices from `p`'s collection: a Source with an arrow, then runes from the
 * theme along it (turning when the way is blocked), and sometimes an aura beside the Source.
 * Everything goes through `canPlace`, so the result respects ownership and ink.
 */
function fillThemed(p0: Profile, theme: Theme, rng: Rng): Profile {
  const pool = THEMES[theme];
  let p = p0;
  for (const m of MEMBER_IDS) {
    p = setMemberLattice(p, m, { shape: latticeOf(p, m).shape, runes: [] });
  }
  for (const m of MEMBER_IDS) {
    const chains = rng.int(2, 3);
    for (let c = 0; c < chains; c++) {
      let lat = latticeOf(p, m);
      const free = (at: Coord): boolean =>
        isSocket(lat.shape, at) && !lat.runes.some((r) => sameTile(r.at, at));
      const starts: Coord[] = [];
      for (let y = 0; y < lat.shape.height; y++) {
        for (let x = 0; x < lat.shape.width; x++) if (free({ x, y })) starts.push({ x, y });
      }
      if (starts.length === 0) break;
      const at0 = pick(rng, starts);
      const source = pick(rng, pool.sources);
      if (canPlace(p, m, at0, source) !== null) continue;
      let dir = pick(rng, DIRS);
      lat = setSocket(lat, at0, source, dir);
      p = setMemberLattice(p, m, lat);
      let cur = at0;
      const len = rng.int(2, 5);
      for (let i = 0; i < len; i++) {
        const options = [dir, ...shuffle(rng, DIRS)].map((d) => ({ d, to: step(cur, d) }));
        const next = options.find((o) => free(o.to));
        if (!next) break;
        const rune = pick(rng, pool.chain);
        if (canPlace(p, m, next.to, rune) !== null) continue;
        const rdir = RUNES[rune].arrow ? pick(rng, [next.d, next.d, ...DIRS]) : undefined;
        lat = setSocket(lat, next.to, rune, rdir);
        p = setMemberLattice(p, m, lat);
        cur = next.to;
        dir = rdir ?? next.d;
      }
      if (rng.next() < 0.6) {
        const spots = DIRS.map((d) => step(at0, d)).filter(free);
        const aura = pick(rng, pool.auras);
        const spot = spots.length > 0 ? pick(rng, spots) : null;
        if (spot && canPlace(p, m, spot, aura) === null) {
          lat = setSocket(lat, spot, aura);
          p = setMemberLattice(p, m, lat);
        }
      }
    }
  }
  return p;
}

const hasSpells = (p: Profile): boolean =>
  MEMBER_IDS.every((m) => compiledFor(p, m).spells.length > 0);

/** A valid themed loadout with a spell for every member, or null if the draw was unlucky. */
function themedLoadout(base: Profile, theme: Theme, rng: Rng): Profile | null {
  const p = fillThemed(richProfile(base), theme, rng);
  return Object.keys(validateLoadout(p)).length === 0 && hasSpells(p) ? p : null;
}

/** How many compiled spells (all members) carry each rune: shows the new runes are really on the pages. */
const runeCoverage = new Map<RuneId, number>();
function noteCoverage(p: Profile): void {
  for (const m of MEMBER_IDS) {
    const compiled = compiledFor(p, m);
    for (const sp of compiled.spells) {
      const seen = new Set<RuneId>([sp.source, ...sp.path.map((c) => c.rune)]);
      if (sp.pierce) seen.add('pierce');
      for (const r of seen) bump(runeCoverage, r);
    }
    for (const t of compiled.auraTouches) bump(runeCoverage, t.aura);
  }
}

// ── Glyph lattices through the real path ────────────────

const glyphStats = { tried: 0, compiled: 0, castsCompared: 0 };

/** Battle over an encounter board with the profile's compiled spells for the whole party. */
function profileBattle(p: Profile, enc: number, seed: number): BattleState {
  const e = ENCOUNTERS[enc % ENCOUNTERS.length];
  if (!e) throw new Error('no encounter');
  const party: BattleSpec['party'] = {};
  for (const m of MEMBER_IDS) {
    party[m] = { hp: MEMBERS[m].hp, spells: compiledFor(p, m).spells };
  }
  return createBattle({ title: e.title, board: e.layout, seed, party }).state;
}

/** Casts every legal aim of every spell of `m` (capped) and records the masks as full proof. */
function proveByCasting(p: Profile, m: MemberId, enc: number, seed: number): Profile {
  const state = profileBattle(p, enc, seed);
  let out = p;
  for (const c of castableSpells(state, m)) {
    if (!c.usable) continue;
    for (const aim of legalAims(state, m, c.spell.key).slice(0, 12)) {
      const r = applyAction(state, { type: 'cast', unit: m, spell: c.spell.key, aim });
      const masks = masksFrom(r.events, m);
      for (let i = 0; i < TUNING.provenCasts && masks.length > 0; i++) {
        out = recordProof(out, m, masks);
      }
    }
  }
  return out;
}

/** The log lines of every spell/aim both profiles share, cast on the same board. */
function castLines(p: Profile, m: MemberId, enc: number, seed: number): Map<string, string[]> {
  const state = profileBattle(p, enc, seed);
  const out = new Map<string, string[]>();
  for (const c of castableSpells(state, m)) {
    if (!c.usable) continue;
    for (const aim of legalAims(state, m, c.spell.key).slice(0, 6)) {
      const r = applyAction(state, { type: 'cast', unit: m, spell: c.spell.key, aim });
      out.set(`${c.spell.key}|${JSON.stringify(aim)}`, describeLog(r.events));
    }
  }
  return out;
}

/**
 * Picks a proven, unblocked cluster per member by random and Fair-Copies it. Every invariant is
 * flagged, never thrown. Returns the profile with whatever compiled.
 */
function compileSome(p0: Profile, seed: number): Profile {
  const rng = createRng(seed ^ 0x6c79);
  let p = p0;
  for (const m of MEMBER_IDS) {
    const enc = rng.int(0, ENCOUNTERS.length - 1);
    const where = `glyph seed ${seed} ${m} enc ${enc}`;
    let proven: Profile;
    let candidates: ReturnType<typeof clustersOf>;
    try {
      proven = proveByCasting(p, m, enc, seed);
      const lib = glyphLibrary(proven);
      const l = latticeOf(proven, m);
      // Known engine gap (see research-loop.test.ts): a cell another spell also flows through
      // (a side entry) is not safe to compile, so those clusters are left out here.
      const spells = compiledFor(proven, m).spells;
      const shared = (c: { cells: readonly Coord[] }): boolean =>
        c.cells.some(
          (cell) =>
            spells.filter((sp) => sp.path.some((q) => q.at.x === cell.x && q.at.y === cell.y))
              .length > 1,
        );
      candidates = clustersOf(l, lib).filter(
        (c) =>
          !shared(c) &&
          disconnected(l, c, lib).length === 0 && // the player re-lays tails (plan P2)
          c.cells.length >= TUNING.glyphMinCells &&
          c.cells.length <= TUNING.glyphMaxCells &&
          blockingAuras(l, c, lib).length === 0 &&
          provenCount(
            l,
            c,
            MEMBER_IDS.flatMap((id) => proven.proof[id] ?? []),
          ) >= TUNING.provenCasts,
      );
    } catch (err) {
      flag('proving or clustering threw', `${where}: ${String(err)}`);
      continue;
    }
    if (candidates.length === 0) continue;
    glyphStats.tried += 1;
    const cluster = pick(rng, candidates);
    const before = validateLoadout(proven);
    const flatLines = castLines(proven, m, enc, seed);
    let next: Profile;
    try {
      next = compileGlyph({ ...proven, vellum: proven.vellum + 2 }, m, cluster, 'Fuzzed');
    } catch (err) {
      flag('compileGlyph threw on a proven, unblocked cluster', `${where}: ${String(err)}`);
      continue;
    }
    glyphStats.compiled += 1;
    const after = validateLoadout(next);
    if (Object.keys(before).length === 0 && Object.keys(after).length > 0) {
      flag('valid loadout invalid after compileGlyph', `${where} ${JSON.stringify(after)}`);
    }
    for (const id of MEMBER_IDS) {
      const used = inkUsed(latticeOf(next, id), glyphLibrary(next));
      if (Object.keys(before).length === 0 && used > next.inkCapacity[id]) {
        flag('inkUsed exceeds capacity after compileGlyph', `${where} ${id} ${used}`);
      }
    }
    try {
      const glyphLines = castLines(next, m, enc, seed);
      for (const [k, lines] of flatLines) {
        const g = glyphLines.get(k);
        if (!g) continue;
        glyphStats.castsCompared += 1;
        if (JSON.stringify(g) !== JSON.stringify(lines)) {
          flag(
            'Glyph cast differs from the flat cast (identity)',
            `${where} ${k}\nFLAT ${lines.join(' / ')}\nGLYPH ${g.join(' / ')}\nLAT ${JSON.stringify(latticeOf(proven, m).runes)}\nAFTER ${JSON.stringify(latticeOf(next, m).runes)}\nGDEF ${JSON.stringify(next.glyphs)}\nCL ${JSON.stringify(cluster)}`,
          );
        }
      }
    } catch (err) {
      flag('casting the compiled lattice threw', `${where}: ${String(err)}`);
    }
    p = next;
  }
  return p;
}

// ── Stats ───────────────────────────────────────────────

interface Tally {
  battles: number;
  won: number;
  lost: number;
  capped: number;
  stalled: number;
  broken: number;
  roundsSum: number;
  hpLeftSum: number;
}
const emptyTally = (): Tally => ({
  battles: 0,
  won: 0,
  lost: 0,
  capped: 0,
  stalled: 0,
  broken: 0,
  roundsSum: 0,
  hpLeftSum: 0,
});

interface TripTally {
  runs: number;
  cleared: number;
  wiped: number;
  endedEarly: number;
  cappedRuns: number;
  depthSum: number;
  banked: number;
}
const emptyTrip = (): TripTally => ({
  runs: 0,
  cleared: 0,
  wiped: 0,
  endedEarly: 0,
  cappedRuns: 0,
  depthSum: 0,
  banked: 0,
});

const anomalies: string[] = [];

const stats = {
  encounter: new Map<string, Tally>(), // `${bot}|${encounter index}`
  trips: new Map<Bot, TripTally>(),
  interactions: new Map<Bot, Map<InteractionId, number>>(),
  spells: new Map<Bot, Map<string, number>>(),
  events: new Map<Bot, Map<string, number>>(),
  battlesByBot: new Map<Bot, number>(),
  replayChecked: 0,
  replayFailed: 0,
  queries: 0,
};

function bump<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

function recordBattle(bot: Bot, enc: number, res: BattleResult): void {
  const t = stats.encounter.get(`${bot}|${enc}`) ?? emptyTally();
  t.battles += 1;
  if (res.outcome === 'won') {
    t.won += 1;
    t.roundsSum += res.rounds;
    t.hpLeftSum += res.hpLeft;
  } else if (res.outcome === 'lost') {
    t.lost += 1;
    t.roundsSum += res.rounds;
  } else if (res.outcome === 'capped') t.capped += 1;
  else if (res.outcome === 'stalled') t.stalled += 1;
  else t.broken += 1;
  stats.encounter.set(`${bot}|${enc}`, t);

  bump(stats.battlesByBot, bot);
  const ints = stats.interactions.get(bot) ?? new Map<InteractionId, number>();
  for (const d of res.discovered) bump(ints, d);
  stats.interactions.set(bot, ints);
  const ev = stats.events.get(bot) ?? new Map<string, number>();
  const sp = stats.spells.get(bot) ?? new Map<string, number>();
  for (const e of res.battle.events) {
    bump(ev, e.type);
    if (e.type === 'cast') bump(sp, `${e.spell}${e.echo ? ' (echo)' : ''}`);
  }
  stats.events.set(bot, ev);
  stats.spells.set(bot, sp);
}

function tripTally(bot: Bot): TripTally {
  const t = stats.trips.get(bot) ?? emptyTrip();
  stats.trips.set(bot, t);
  return t;
}

// ── Trip driver ─────────────────────────────────────────

function checkBank(before: Profile, after: Profile, t: Trip, where: string): void {
  const runes: Partial<Record<RuneId, number>> = {};
  const ink: Partial<Record<MemberId, number>> = {};
  let vellum = 0;
  const solvents: Partial<Record<SolventId, number>> = {};
  for (const item of t.loot) {
    if (item.kind === 'rune') runes[item.rune] = (runes[item.rune] ?? 0) + 1;
    else if (item.kind === 'vellum') vellum += item.amount;
    else if (item.kind === 'solvent') solvents[item.solvent] = (solvents[item.solvent] ?? 0) + 1;
    else if (item.kind === 'ink') ink[item.member] = (ink[item.member] ?? 0) + item.amount;
  }
  for (const id of RUNE_IDS) {
    if (after.collection[id] !== before.collection[id] + (runes[id] ?? 0)) {
      flag('returnHome did not bank the rune loot', `${where} ${id}`);
    }
  }
  for (const m of MEMBER_IDS) {
    if (after.inkCapacity[m] !== before.inkCapacity[m] + (ink[m] ?? 0)) {
      flag('returnHome did not bank the ink loot', `${where} ${m}`);
    }
  }
  if (after.vellum !== before.vellum + vellum) flag('returnHome did not bank vellum', where);
  for (const id of SOLVENT_IDS) {
    if (after.solvents[id] !== before.solvents[id] + (solvents[id] ?? 0)) {
      flag('returnHome did not bank the solvent loot', `${where} ${id}`);
    }
  }
}

/** Positions change only through movement events; hp never rises; charges never rise. */
function checkMonotone(before: BattleState, r: ActionResult, where: string): void {
  const after = r.state;
  const summoned = new Set(r.events.flatMap((e) => (e.type === 'summon' ? [e.unit.id] : [])));
  if (after.units.length !== before.units.length + summoned.size) flag('unit count changed', where);
  const prev = new Map(before.units.map((u) => [u.id, u]));
  for (const u of after.units) {
    const p = prev.get(u.id);
    if (!p) {
      if (summoned.has(u.id)) continue;
      flag('unit appeared mid-battle', `${where} ${u.id}`);
      continue;
    }
    if (u.hp > p.hp)
      flag('hp increased (no healing exists)', `${where} ${u.name} ${p.hp}->${u.hp}`);
    if (u.maxHp !== p.maxHp) flag('maxHp changed', `${where} ${u.name}`);
    if (u.kind === 'member' && p.kind === 'member' && !after.lab) {
      for (const [spell, n] of Object.entries(u.charges)) {
        if (n > (p.charges[spell] ?? 0))
          flag('charges increased mid-battle', `${where} ${u.name} ${spell}`);
      }
    }
    if (!sameTile(u.pos, p.pos)) {
      const moved = r.events.some(
        (e) =>
          ((e.type === 'moved' ||
            e.type === 'pushed' ||
            e.type === 'moveUndone' ||
            e.type === 'slide') &&
            e.unit.id === u.id) ||
          (e.type === 'drift' && e.units.some((d) => d.unit.id === u.id)),
      );
      if (!moved) flag('unit changed tile with no movement event', `${where} ${u.name}`);
    }
  }
}

/** Walks in the log: no step crosses a living unit or a brass plate, and each move starts where the unit was. */
function checkPaths(before: BattleState, events: readonly GameEvent[], where: string): void {
  const at = new Map<string, string>(); // tile key -> unit id (living units only)
  const tileOf = new Map<string, string>(); // unit id -> tile key
  for (const u of before.units) {
    if (u.hp <= 0) continue;
    at.set(key(u.pos), u.id);
    tileOf.set(u.id, key(u.pos));
  }
  const plates = new Set(
    before.tiles.flatMap((t, i) =>
      t.plate ? [`${i % before.width},${Math.floor(i / before.width)}`] : [],
    ),
  );
  const plate = (c: Coord) => plates.has(key(c));
  const place = (id: string, to: Coord) => {
    const old = tileOf.get(id);
    if (old !== undefined) at.delete(old);
    at.set(key(to), id);
    tileOf.set(id, key(to));
  };
  for (const e of events) {
    // Plates come and go inside one action (Kiln raises one behind a walker; a plate crumbles).
    if (e.type === 'plates') for (const c of e.tiles) plates.add(key(c));
    else if (e.type === 'plateCrumbles') for (const c of e.tiles) plates.delete(key(c));
    if (e.type === 'moved') {
      if (tileOf.get(e.unit.id) !== key(e.unit.at))
        flag('move starts from the wrong tile', `${where} ${e.unit.id}`);
      for (const c of e.path) {
        if (plate(c)) flag('path crosses a brass plate', `${where} ${e.unit.id} at ${key(c)}`);
        const occ = at.get(key(c));
        if (occ !== undefined && occ !== e.unit.id)
          flag('path passes through a unit', `${where} ${e.unit.id} at ${key(c)}`);
      }
      place(e.unit.id, e.to);
    } else if (e.type === 'moveUndone' || e.type === 'pushed' || e.type === 'slide') {
      if (e.type === 'pushed' && plate(e.to))
        flag('pushed onto a brass plate', `${where} ${e.unit.id}`);
      place(e.unit.id, e.to);
    } else if (e.type === 'drift') {
      // The current lifts everyone first, then sets them down.
      for (const d of e.units) {
        const old = tileOf.get(d.unit.id);
        if (old !== undefined) at.delete(old);
      }
      for (const d of e.units) place(d.unit.id, d.to);
    } else if (e.type === 'summon') {
      place(e.unit.id, e.at);
    } else if (e.type === 'died') {
      const old = tileOf.get(e.unit.id);
      if (old !== undefined) at.delete(old);
      tileOf.delete(e.unit.id);
    }
  }
}

function checkTripState(before: Trip | null, t: Trip, p: Profile, where: string): void {
  for (const m of MEMBER_IDS) {
    if (t.hp[m] < 0 || t.hp[m] > MEMBERS[m].hp)
      flag('trip hp out of range', `${where} ${m}=${t.hp[m]}`);
    if (before) {
      for (const [spell, n] of Object.entries(t.charges[m])) {
        const was = before.charges[m][spell] ?? 0;
        if (n > was || n < 0) flag('trip charges rose or went negative', `${where} ${m} ${spell}`);
      }
    }
  }
  for (const id of RUNE_IDS) {
    if (p.collection[id] < 0) flag('negative rune collection', `${where} ${id}`);
  }
  // No trip-level check can see the spells, so validate the profile lattices directly.
  const issues2 = validateLoadout(p);
  if (Object.keys(issues2).length > 0) {
    flag(
      'profile loadout invalid after banking',
      `${where} ${JSON.stringify(issues2).slice(0, 200)}`,
    );
  }
}

type Kind = 'start' | 'random' | 'new' | 'kiln';
const KINDS: readonly Kind[] = ['start', 'random', 'new', 'kiln'];

/** The trip's starting profile: the real one, random runes (plus Fair Copies), or themed chains. */
function profileFor(kind: Kind, seed: number): Profile {
  if (kind === 'start') return newProfile();
  if (kind === 'random') return compileSome(randomLoadout(seed), seed);
  const rng = createRng(seed ^ 0x7e11);
  for (let tries = 0; tries < 20; tries++) {
    const p = themedLoadout(newProfile(), kind, rng);
    if (p) return p;
  }
  flag('no themed loadout could be drawn', `seed ${seed} ${kind}`);
  return newProfile();
}

/** Rewiring at a doorway: the banked collection only (no richProfile), or null if the draw is no good. */
function rewired(p: Profile, rng: Rng): Profile | null {
  const q = fillThemed(p, rng.next() < 0.5 ? 'new' : 'kiln', rng);
  return Object.keys(validateLoadout(q)).length === 0 && hasSpells(q) ? q : null;
}

const sourceType = (sp: { glyph?: string; source: string }): string =>
  sp.glyph ? `glyph:${sp.glyph}` : `rune:${sp.source}`;

/** Remaining charges of every Source, grouped by rune (or Glyph) type, across both members. */
function leftByType(p: Profile, t: Trip): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const m of MEMBER_IDS) {
    for (const sp of compiledFor(p, m).spells) {
      const k = sourceType(sp);
      out.set(k, [...(out.get(k) ?? []), t.charges[m][sp.key] ?? sp.charges]);
    }
  }
  return out;
}

/** S12: leaving a doorway never refills a spell. Plus: the trip is otherwise untouched and moves on. */
function checkDoorway(p: Profile, after: Profile, t: Trip, next: Trip, where: string): void {
  if (next.status !== 'looting' && next.status !== 'crossroads') {
    flag('trip still in the doorway after applyDoorway (soft-lock)', `${where} ${next.status}`);
  }
  if (next.status === 'looting' && (next.offers.length === 0 || next.picksLeft <= 0)) {
    flag('doorway returned to looting with nothing to pick', where);
  }
  if (next.status === 'crossroads' && (next.offers.length > 0 || next.picksLeft !== 0)) {
    flag('doorway went to the crossroads with picks pending', where);
  }
  const kept = (x: Trip) => JSON.stringify([x.hp, x.loot, x.encounter]);
  if (kept(next) !== kept(t)) flag('doorway changed hp, loot or encounter', where);
  if (JSON.stringify(after.collection) !== JSON.stringify(p.collection)) {
    flag('doorway changed the collection', where);
  }
  for (const m of MEMBER_IDS) {
    for (const sp of compiledFor(after, m).spells) {
      const n = next.charges[m][sp.key];
      if (n === undefined) {
        flag('no charge entry for a rewired spell (would refill)', `${where} ${m} ${sp.key}`);
      } else if (n < 0 || n > sp.charges) {
        flag('rewired charges outside [0, max]', `${where} ${m} ${sp.key}=${n}/${sp.charges}`);
      }
    }
  }
  if (
    MEMBER_IDS.some((m) =>
      compiledFor(p, m).spells.some((sp) => (t.charges[m][sp.key] ?? sp.charges) < sp.charges),
    )
  ) {
    doorwayStats.spent += 1;
  }
  const was = leftByType(p, t);
  const now = leftByType(after, next);
  for (const [type, counts] of now) {
    const old = [...(was.get(type) ?? [])].sort((a, b) => b - a);
    // Copies beyond the ones that were wired before start full: set the largest aside first.
    const extra = Math.max(0, counts.length - old.length);
    const rest = [...counts].sort((a, b) => b - a).slice(extra);
    rest.forEach((n, i) => {
      if (n > (old[i] ?? 0)) {
        flag(
          'charges refilled by a doorway (S12)',
          `${where} ${type} before [${old}] after [${counts}]`,
        );
      }
    });
  }
}

/** The save written mid-trip must read back exactly (every status, the doorway included). */
function checkSave(p: Profile, t: Trip, where: string): void {
  const save = { profile: p, trip: t, seedCounter: 1, lastTrip: null };
  try {
    expect(parseSaveData(JSON.parse(JSON.stringify(save)))).toEqual(save);
  } catch (err) {
    flag(
      `save round trip failed in status ${t.status}`,
      `${where}: ${String(err).slice(0, 300)} ${(err as Error).stack?.split('\n').slice(1, 5).join('|')}`,
    );
  }
}

const doorwayStats = { offered: 0, injected: 0, taken: 0, rewired: 0, kept: 0, spent: 0 };
const variantsSeen = new Map<string, number>();

function runTrip(seed: number, bot: Bot, replayPick: { n: number }, kind: Kind): void {
  const rng = createRng(seed * 2654435761 + BOT_KINDS.indexOf(bot) + 1);
  let p: Profile = profileFor(kind, seed);
  noteCoverage(p);
  const tt = tripTally(bot);
  tt.runs += 1;

  let trip: Trip | null;
  try {
    trip = startTrip(p, seed);
  } catch (err) {
    flag('startTrip rejected a validated loadout', `seed ${seed}: ${String(err)}`);
    return;
  }
  if (bot.endsWith('@entry')) trip = { ...trip, encounter: seed % ENCOUNTERS.length };

  let cappedRun = false;
  let guard = 0;
  while (trip && guard++ < 50) {
    const t: Trip = trip;
    checkSave(p, t, `${bot}/${seed}/${kind} e${t.encounter}`);
    switch (t.status) {
      case 'fight': {
        const enc = ENCOUNTERS[t.encounter];
        if (!enc) break;
        bump(variantsSeen, `${t.encounter}|${variantFor(t, t.encounter)}`);
        const label = `${bot}/${seed}/${kind}/${enc.id}`;
        const begun = beginEncounter(p, t);
        const spec = specFor(p, t);
        if (JSON.stringify(createBattle(spec).state) !== JSON.stringify(begun.state)) {
          flag('specFor does not rebuild the encounter battle', label);
        }
        const res = playBattle(label, bot, begun, rng);
        recordBattle(bot, t.encounter, res);
        if (res.outcome === 'won' || res.outcome === 'lost') {
          if (replayPick.n++ % REPLAY_EVERY === 0) {
            stats.replayChecked += 1;
            const rep = replay(spec, res.battle.actions);
            const finalOk =
              JSON.stringify(rep.states[rep.states.length - 1]) ===
              JSON.stringify(res.battle.state);
            const linesOk =
              JSON.stringify(describeLog(rep.events)) ===
              JSON.stringify(describeLog(res.battle.events));
            if (!finalOk || !linesOk) {
              stats.replayFailed += 1;
              flag('replay does not reproduce the recorded battle', label);
            }
          }
          const fin = finishEncounter(p, t, res.battle.state);
          const _before = p;
          p = fin.profile;
          trip = fin.trip;
          if (!trip) {
            tt.wiped += 1;
            tt.depthSum += t.encounter;
            break;
          }
          checkTripState(t, trip, p, label);
          if (trip.status === 'looting' && trip.offers.length === 0) {
            flag('looting with no offers', label);
          }
        } else {
          cappedRun = true;
          trip = null;
        }
        break;
      }
      case 'looting': {
        if (t.offers.length === 0) {
          flag('looting with no offers (before pick)', `seed ${seed}`);
          trip = null;
          break;
        }
        let offers = t.offers;
        const heart = ENCOUNTERS[t.encounter]?.heart ?? false;
        if (offers.some((o) => o.kind === 'doorway')) doorwayStats.offered += 1;
        else if (!heart && rng.next() < 0.5) {
          // Deep tables hold a doorway at weight 1, so force some (an offer holds at most one).
          offers = [...offers.slice(0, -1), { kind: 'doorway' }];
          doorwayStats.injected += 1;
        }
        const door = offers.findIndex((o) => o.kind === 'doorway');
        const choice =
          door >= 0 && (bot.startsWith('greedy') || rng.next() < 0.7)
            ? door
            : rng.int(0, offers.length - 1);
        trip = pickLoot({ ...t, offers }, choice);
        break;
      }
      case 'doorway': {
        const where = `${bot}/${seed}/${kind} doorway e${t.encounter}`;
        doorwayStats.taken += 1;
        const q = rng.next() < 0.5 ? rewired(p, rng) : null;
        if (q) doorwayStats.rewired += 1;
        else doorwayStats.kept += 1;
        let r: { profile: Profile; trip: Trip };
        try {
          r = applyDoorway(p, t, (q ?? p).lattices);
        } catch (err) {
          flag('applyDoorway threw on a valid loadout', `${where}: ${String(err)}`);
          trip = null;
          break;
        }
        checkDoorway(p, r.profile, t, r.trip, where);
        noteCoverage(r.profile);
        p = r.profile;
        trip = r.trip;
        checkTripState(null, trip, p, where);
        break;
      }
      case 'crossroads': {
        if (isRandom(bot) && rng.next() < 0.1) {
          const before = p;
          p = returnHome(p, t);
          checkBank(before, p, t, `seed ${seed} early`);
          tt.endedEarly += 1;
          tt.depthSum += t.encounter;
          trip = null;
          break;
        }
        trip = pushOn(t);
        break;
      }
      case 'cleared': {
        const before = p;
        p = returnHome(p, t);
        checkBank(before, p, t, `seed ${seed} heart`);
        tt.cleared += 1;
        tt.depthSum += t.encounter + 1;
        tt.banked += t.loot.length;
        trip = null;
        break;
      }
    }
  }
  if (cappedRun) tt.cappedRuns += 1;
}

// ── Illegal-action probe ────────────────────────────────

/** A move to a tile the query does not offer must be rejected by both isLegal and applyAction. */
function probeIllegal(state: BattleState, rng: Rng): void {
  if (state.phase !== 'player') return;
  const m = liveMembers(state)[0];
  if (!m || m.moved) return;
  const offered = new Set(legalMoves(state, m.id).map(key));
  const cells: Coord[] = [];
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) if (!offered.has(`${x},${y}`)) cells.push({ x, y });
  }
  if (cells.length === 0) return;
  const to = pick(rng, cells);
  if (isLegal(state, { type: 'move', unit: m.id, to }) === null) {
    flag('isLegal accepts a move that legalMoves does not offer', `${m.id} to ${key(to)}`);
    return;
  }
  try {
    applyAction(state, { type: 'move', unit: m.id, to });
    flag('applyAction accepts an illegal move', `${m.id} to ${key(to)}`);
  } catch {
    // expected
  }
}

// ── The test ────────────────────────────────────────────

test(`fuzz: ${SEEDS} trips per bot, invariants on every action`, () => {
  const t0 = Date.now();
  for (const bot of BOT_KINDS) {
    const replayPick = { n: 0 };
    for (let i = 0; i < SEEDS; i++) {
      const seed = 1000 + i * 7919 + BOT_KINDS.indexOf(bot) * 104729; // a different seed per bot: more layouts
      runTrip(seed, bot, replayPick, KINDS[i % KINDS.length] ?? 'start');
    }
  }
  // Illegal-action probes on a few fresh battles.
  const probeRng = createRng(99);
  for (const enc of ENCOUNTERS) {
    const start = createBattle({ title: enc.title, board: enc.layout, seed: 1 });
    probeIllegal(start.state, probeRng);
  }
  const elapsed = Date.now() - t0;

  const lines: string[] = [];
  lines.push(`fuzz: ${elapsed} ms, seeds per bot ${SEEDS}, replays checked ${stats.replayChecked}`);
  lines.push('');
  lines.push(
    'bot     enc  battles  won%   lost%  capped stalled broken  avgRounds(fin)  avgHpLeft(won)',
  );
  for (const bot of BOT_KINDS) {
    ENCOUNTERS.forEach((enc, i) => {
      const t = stats.encounter.get(`${bot}|${i}`) ?? emptyTally();
      const fin = t.won + t.lost;
      const pct = (n: number) => (t.battles ? ((100 * n) / t.battles).toFixed(0) : '-');
      lines.push(
        [
          bot.padEnd(7),
          `${i + 1} ${enc.id}`.padEnd(26),
          String(t.battles).padStart(7),
          pct(t.won).padStart(5),
          pct(t.lost).padStart(6),
          String(t.capped).padStart(6),
          String(t.stalled).padStart(7),
          String(t.broken).padStart(6),
          (fin ? (t.roundsSum / fin).toFixed(1) : '-').padStart(14),
          (t.won ? (t.hpLeftSum / t.won).toFixed(1) : '-').padStart(14),
        ].join(' '),
      );
    });
  }
  lines.push('');
  lines.push('bot     runs  cleared(heart) wiped  endedEarly  runsHitCap  avgDepthReached');
  for (const bot of BOT_KINDS) {
    const t = stats.trips.get(bot) ?? emptyTrip();
    const reached = t.runs ? (t.depthSum / t.runs).toFixed(2) : '-';
    lines.push(
      `${bot.padEnd(7)} ${String(t.runs).padStart(5)} ${String(t.cleared).padStart(14)} ${String(
        t.wiped,
      ).padStart(
        5,
      )} ${String(t.endedEarly).padStart(11)} ${String(t.cappedRuns).padStart(11)} ${reached.padStart(16)}`,
    );
  }
  lines.push('');
  for (const bot of BOT_KINDS) {
    const n = stats.battlesByBot.get(bot) ?? 0;
    const ints = stats.interactions.get(bot) ?? new Map<InteractionId, number>();
    lines.push(
      `${bot} interactions (battles that showed it, of ${n}): ` +
        INTERACTION_IDS.map((id) => `${id}=${ints.get(id) ?? 0}`).join(' '),
    );
    const sp = [...(stats.spells.get(bot) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
    lines.push(`${bot} casts: ${sp.map(([k, v]) => `${k}=${v}`).join(' ')}`);
    const ev = stats.events.get(bot) ?? new Map<string, number>();
    const keyTypes = [
      'ignite',
      'arc',
      'conduct',
      'detonate',
      'extinguish',
      'slide',
      'diffuse',
      'trigger',
      'echoQueued',
      'echoFizzles',
      'shieldGained',
      'splash',
      'steam',
      'plates',
      'plateCrumbles',
      'coated',
      'bump',
      'pushed',
      'miss',
      'stopped',
      'moveUndone',
      'shove',
      'lands',
      'pierced',
      'heated',
      'cooled',
      'scalded',
      'stained',
      'etched',
    ];
    lines.push(`${bot} events: ${keyTypes.map((k) => `${k}=${ev.get(k) ?? 0}`).join(' ')}`);
  }
  lines.push('');
  for (const a of anomalies) lines.push(`anomaly: ${a}`, '');
  if (issues.size === 0) lines.push('violations: none');
  else {
    lines.push('violations:');
    for (const [rule, v] of issues) lines.push(`  x${v.count} ${rule}\n      e.g. ${v.example}`);
  }
  for (const [rule, v] of knownGaps) {
    lines.push(`known engine gap x${v.count} ${rule}\n      e.g. ${v.example}`);
  }
  lines.push(
    `glyphs: tried ${glyphStats.tried}, compiled ${glyphStats.compiled}, casts compared ${glyphStats.castsCompared}`,
  );
  lines.push(
    `doorways: offered ${doorwayStats.offered}, injected ${doorwayStats.injected}, taken ${doorwayStats.taken} (rewired ${doorwayStats.rewired}, kept ${doorwayStats.kept}; with a spent spell ${doorwayStats.spent})`,
  );
  lines.push(
    `layouts played: ${ENCOUNTERS.flatMap((e, d) => e.variants.map((_, v) => `${d + 1}.${v}=${variantsSeen.get(`${d}|${v}`) ?? 0}`)).join(' ')}`,
  );
  lines.push(
    `spells carrying each rune: ${[...runeCoverage.entries()].map(([r, n]) => `${r}=${n}`).join(' ')}`,
  );
  lines.push(
    `boxed-in rounds: ${boxStats.partyBoxedRounds} (longest run ${boxStats.longestRun}, with a hot plate ${boxStats.withHotPlate})`,
  );
  if (process.env.FUZZ_SEEDS) console.log(lines.join('\n'));

  const summary = [...issues.keys()].join('; ');
  expect(summary, summary).toBe('');
  // The run must really exercise the new content, not just allow it.
  expect(doorwayStats.taken, 'doorways taken').toBeGreaterThan(0);
  expect(doorwayStats.rewired, 'doorways rewired').toBeGreaterThan(0);
  for (const r of NEW_RUNES) {
    expect(runeCoverage.get(r) ?? 0, `spells carrying ${r}`).toBeGreaterThan(0);
  }
  const missing = ENCOUNTERS.flatMap((e, d) =>
    e.variants.flatMap((_, v) => (variantsSeen.has(`${d}|${v}`) ? [] : [`${d + 1}.${v}`])),
  );
  expect(missing, `layouts never played by a trip: ${missing}`).toEqual([]);
}, 600_000);

const NEW_RUNES: readonly RuneId[] = ['pierce', 'onIgnite', 'thrift', 'scald', 'etch', 'kiln'];
const THEMED_SEEDS = Number(process.env.THEMED_SEEDS ?? 3);

test('fuzz: every layout under themed lattices (new runes, Kiln-heavy): no softlock, no cap', () => {
  const seen = new Set(issues.keys());
  const events = new Map<string, number>();
  const outcomes = { won: 0, lost: 0, capped: 0, stalled: 0, broken: 0 };
  let outOfAmmo = 0;
  for (const [depth, enc] of ENCOUNTERS.entries()) {
    for (const [vi, variant] of enc.variants.entries()) {
      for (const theme of ['new', 'kiln'] as const) {
        for (let seed = 1; seed <= THEMED_SEEDS; seed++) {
          const p = themedLoadout(newProfile(), theme, createRng(seed * 977 + depth * 31 + vi));
          if (!p) continue;
          noteCoverage(p);
          const party: BattleSpec['party'] = {};
          for (const m of MEMBER_IDS) {
            party[m] = {
              hp: MEMBERS[m].hp,
              spells: compiledFor(p, m).spells,
              charges: chargesOf(p, m),
            };
          }
          for (const bot of ['random', 'greedy'] as const) {
            const label = `${theme}/${variant.name}/${bot}/${seed}`;
            const start = createEncounterBattle(enc, party, seed, vi);
            const res = playBattle(label, bot, start, createRng(seed * 7919 + depth * 31 + vi));
            outcomes[res.outcome] += 1;
            if (res.outcome === 'capped' || res.outcome === 'stalled') {
              // Every charge spent with an enemy still standing is the bots' ammo stalemate (not a
              // hot plate or a wall): counted, not failed. Anything else is a soft-lock.
              const spent = liveMembers(res.battle.state).every((m) =>
                Object.values(m.charges).every((n) => n <= 0),
              );
              if (spent) outOfAmmo += 1;
              else flag(`themed fight ${res.outcome} (round cap) with charges left`, label);
            }
            for (const e of res.battle.events) bump(events, e.type);
          }
        }
      }
    }
  }
  if (process.env.FUZZ_SEEDS || process.env.THEMED_SEEDS) {
    console.log(
      `${anomalies.join('\n')}\nthemed layouts: ${JSON.stringify(outcomes)} (capped with every charge spent: ${outOfAmmo})\nevents: ${['pierced', 'heated', 'cooled', 'scalded', 'stained', 'etched', 'plates', 'plateCrumbles'].map((k) => `${k}=${events.get(k) ?? 0}`).join(' ')}\nboxed-in rounds ${boxStats.partyBoxedRounds} (longest ${boxStats.longestRun}, hot plate ${boxStats.withHotPlate})`,
    );
  }
  const fresh = [...issues.entries()]
    .filter(([k]) => !seen.has(k))
    .map(([k, v]) => `${k}: ${v.example}`)
    .join('; ');
  expect(fresh, fresh).toBe('');
  for (const e of ['pierced', 'heated', 'scalded', 'etched']) {
    expect(events.get(e) ?? 0, `${e} events in themed fights`).toBeGreaterThan(0);
  }
}, 300_000);

test('fuzz: random loadouts Fair-Copy cleanly (no battles, many seeds)', () => {
  const before = glyphStats.compiled;
  const seen = new Set(issues.keys());
  for (let i = 0; i < 24; i++) {
    const seed = 2001 + i * 2; // odd seeds get random loadouts
    const p = compileSome(randomLoadout(seed), seed);
    if (Object.keys(validateLoadout(p)).length > 0)
      flag('compiled loadout invalid', `seed ${seed}`);
  }
  const fresh = [...issues.entries()]
    .filter(([k]) => !seen.has(k))
    .map(([k, v]) => `${k}: ${v.example}`)
    .join('; ');
  expect(fresh, fresh).toBe('');
  expect(glyphStats.compiled - before).toBeGreaterThan(0);
}, 60_000);

// ── Repros for the engine gaps the fuzz found (both fixed after the review) ──

const cellsAt = (...labels: string[]) => labels.map(parseLabel);

test('a plate raised on scalding steam drops the scald flag', () => {
  // Fuzz: random bot, Bolt then Scald then Kiln down one line; the tile ends `=` with scald: true.
  const lit = draft(board('D s .'), (ctx) => applyScald(ctx, cellsAt('B1')));
  const r = draft(lit.state, (ctx) => applyKiln(ctx, cellsAt('B1')));
  const t = tileAt(r.state, parseLabel('B1'));
  expect(t.plate).toBe(true);
  expect(t.steam).toBe(0);
  expect(t.scald).toBe(false); // scald only belongs where steam > 0
});

test('a crumbled plate drops its etch', () => {
  // Fuzz: Etch on a raised plate, the plate crumbles, the tile stays `etched: true` (a later plate
  // raised there would start etched).
  let s = draft(board('D . . . . . . r', { hp: { H1: 99 } }), (ctx) =>
    applyBrass(ctx, cellsAt('B1')),
  ).state;
  s = draft(s, (ctx) => applyEtch(ctx, cellsAt('B1'))).state;
  for (let i = 0; i < TUNING.plateRounds + 1; i++) s = applyAction(s, { type: 'endTurn' }).state;
  const t = tileAt(s, parseLabel('B1'));
  expect(t.plate).toBe(false);
  expect(t.etched).toBe(false);
});

// ── Glyph mastery: revise, revert, open cells, args and extra exits between trips (plan F1) ──

const MASTERY_SEEDS = Number(process.env.MASTERY_SEEDS ?? 6);
const MASTERY_STEPS = 5;

const masteryStats = {
  profiles: 0,
  ops: new Map<string, number>(),
  rejected: 0,
  identityChecked: 0,
  exitChecked: 0,
  exitGrew: 0,
  fights: 0,
  castsRecorded: 0,
};

const noGlyphExit = (p: Profile): Profile => ({
  ...p,
  glyphs: p.glyphs.map((g) => ({ ...g, extraExit: null })),
});

const pathKeys = (p: Profile, m: MemberId, lib: GlyphLibrary): Set<string> =>
  new Set(
    compileLattice(latticeOf(p, m), MEMBERS[m].affinity, lib).spells.flatMap((s) =>
      s.path.map((c) => `${key(c.at)}|${c.inner ? key(c.inner) : ''}`),
    ),
  );

/** Placed Glyphs in a member's lattice whose args are set. */
const argedSockets = (p: Profile, m: MemberId) =>
  latticeOf(p, m).runes.filter(
    (r): r is PlacedGlyph => isGlyph(r) && Object.keys(r.args ?? {}).length > 0,
  );

/** M28(a): a Glyph with args behaves like the same Glyph with the args baked into its cells. */
function bakedTwin(p: Profile, m: MemberId): Profile {
  const base = noGlyphExit(p);
  const extra: GlyphDef[] = [];
  const runes = latticeOf(base, m).runes.map((r) => {
    if (!isGlyph(r) || !r.args) return r;
    const def = base.glyphs.find((g) => g.id === r.glyph);
    if (!def) return r;
    const id = `${def.id}#b${extra.length}`;
    extra.push({ ...def, id, cells: cellsWithArgs(def, r.args), params: [] });
    const { args: _args, ...bare } = r;
    return { ...bare, glyph: id };
  });
  return setMemberLattice({ ...base, glyphs: [...base.glyphs, ...extra] }, m, {
    shape: latticeOf(base, m).shape,
    runes,
  });
}

function runMastery(seed: number, start: Profile, bad: string[]): void {
  const rng = createRng(seed * 7919 + 17);
  let p = start;
  let step = 0;
  const where = (op: string) => `seed ${seed} step ${step} ${op}`;
  const fail = (rule: string, w: string, extra = ''): void => {
    if (bad.length < 30) bad.push(`${rule} @ ${w} ${extra}`.slice(0, 1500));
  };
  const owned = (q: Profile) => (r: RuneId) => q.collection[r] > 0;

  /** Records stay in bounds and never go backwards between two profiles. */
  const checkRecords = (a: Profile, b: Profile, w: string): void => {
    for (const [k, rec] of Object.entries(a.glyphRecords)) {
      const next = b.glyphRecords[k];
      if (!next) {
        fail('a record vanished', w, k);
        continue;
      }
      if (next.casts < rec.casts) fail('casts fell', w, k);
      if (next.best.economy < rec.best.economy || next.best.reliability < rec.best.reliability) {
        fail('a best tier fell', w, k);
      }
    }
    for (const [k, rec] of Object.entries(b.glyphRecords)) {
      if (rec.recent.length > TUNING.tierWindow) fail('recent past the window', w, k);
      if (rec.casts < rec.recent.length) fail('recent longer than casts', w, k);
    }
  };

  /** What every profile must survive: compiling, validating, ink and arg reporting, M28(b). */
  const checkProfile = (q: Profile, w: string): void => {
    let reported: ReturnType<typeof validateLoadout> = {};
    try {
      reported = validateLoadout(q);
    } catch (err) {
      fail('validateLoadout threw', w, String(err));
    }
    const lib = glyphLibrary(q);
    const bare: GlyphLibrary = Object.fromEntries(
      Object.entries(lib).map(([id, g]) => [id, { ...g, extraExit: null }]),
    );
    for (const m of MEMBER_IDS) {
      try {
        compiledFor(q, m);
        const used = inkUsed(latticeOf(q, m), lib);
        if (used > q.inkCapacity[m] && !reported[m]?.some((i) => i.kind === 'ink')) {
          fail('ink over capacity not reported', w, `${m} ${used}`);
        }
        const withExit = pathKeys(q, m, lib);
        masteryStats.exitChecked += 1;
        const without = pathKeys(q, m, bare);
        for (const k of without) {
          if (!withExit.has(k)) fail('extra exit lost a cell (M28b)', w, `${m} ${k}`);
        }
        if (withExit.size > without.size) masteryStats.exitGrew += 1;
        const argReported = reported[m]?.some((i) => i.kind === 'arg') ?? false;
        for (const r of latticeOf(q, m).runes) {
          if (!isGlyph(r) || !r.args) continue;
          const def = lib[r.glyph];
          // A wrong-family arg on an open cell must be reported; a stale key is ignored quietly.
          const wrong = Object.entries(r.args).some(
            ([k, a]) => def?.params.includes(k) && argIssue(def, k, a) !== null,
          );
          if (wrong && !argReported) {
            fail('a bad arg was not reported', w, `${m} ${JSON.stringify(r.args)}`);
          }
        }
      } catch (err) {
        fail('compile/ink check threw', w, `${m} ${String(err)}`);
      }
    }
  };

  const identity = (q: Profile, w: string): void => {
    for (const m of MEMBER_IDS) {
      if (argedSockets(q, m).length === 0) continue;
      try {
        const enc = rng.int(0, ENCOUNTERS.length - 1);
        const a = castLines(noGlyphExit(q), m, enc, seed);
        const b = castLines(bakedTwin(q, m), m, enc, seed);
        masteryStats.identityChecked += 1;
        if (JSON.stringify([...a]) !== JSON.stringify([...b])) {
          fail('Glyph with args differs from its baked twin (M28a)', w, `${m} enc ${enc}`);
        }
      } catch (err) {
        fail('identity check threw', w, String(err));
      }
    }
  };

  const withArgs = (q: Profile, m: MemberId, at: Coord, args: Record<string, GlyphArg>): Profile =>
    setMemberLattice(q, m, {
      shape: latticeOf(q, m).shape,
      runes: latticeOf(q, m).runes.map((r) =>
        isGlyph(r) && sameTile(r.at, at) ? { ...r, args } : r,
      ),
    });

  const expectThrow = (what: string, w: string, f: () => unknown): void => {
    try {
      f();
    } catch (err) {
      if (!(err instanceof Error)) fail(`${what}: threw a non-Error`, w);
      return;
    }
    fail(`${what}: should have thrown`, w);
  };

  const withBest = (q: Profile, g: GlyphDef, economy: TierLevel, reliability: TierLevel) => {
    const rec = recordOf(q, g.id, g.version);
    const best = {
      economy: Math.max(rec.best.economy, economy) as TierLevel,
      reliability: Math.max(rec.best.reliability, reliability) as TierLevel,
    };
    return {
      ...q,
      glyphRecords: { ...q.glyphRecords, [versionKey(g.id, g.version)]: { ...rec, best } },
    };
  };

  const revertFrom = (p: Profile): Profile | null => {
    const g = pick(rng, p.glyphs);
    const old = p.glyphArchive.filter((a) => a.id === g.id);
    if (old.length === 0) return null;
    const w = where('revert');
    const target = pick(rng, old);
    const q = revertGlyph(p, g.id, target.version);
    if (q.glyphs.find((x) => x.id === g.id)?.version !== target.version) {
      fail('revert did not swap', w);
    }
    if (JSON.stringify(q.glyphRecords) !== JSON.stringify(p.glyphRecords)) {
      fail('revert touched records', w);
    }
    if (q.glyphs.length !== p.glyphs.length || q.glyphArchive.length !== p.glyphArchive.length) {
      fail('revert changed version counts', w);
    }
    expectThrow('revert to current', w, () => revertGlyph(q, g.id, target.version));
    return q;
  };

  const ops: Record<string, () => Profile | null> = {
    revise: () => {
      const g = pick(rng, p.glyphs);
      const inside = randomValidInside(insideOf(g), rng, owned(p));
      if (!inside) return null;
      const w = where('revise');
      const q = reviseGlyph(p, g.id, inside);
      const cur = q.glyphs.find((x) => x.id === g.id);
      const top = Math.max(
        g.version,
        ...p.glyphArchive.filter((a) => a.id === g.id).map((a) => a.version),
      );
      if (cur?.version !== top + 1) fail('revision is not max + 1', w);
      if (recordOf(q, g.id, top + 1).casts !== 0) fail('a new version starts with a record', w);
      if (q.glyphArchive.length !== p.glyphArchive.length + 1) fail('old not archived', w);
      if (
        JSON.stringify(recordOf(q, g.id, g.version)) !==
        JSON.stringify(recordOf(p, g.id, g.version))
      ) {
        fail('the old version lost its record', w);
      }
      if ((cur?.params.length ?? 0) > TUNING.paramSlots) fail('kept a second open cell (M20)', w);
      if (glyphLibrary(q)[g.id]?.extraExit !== null) fail('fresh version has an extra exit', w);
      const broken: GlyphInside = { ...inside, cells: inside.cells.slice(0, 2) };
      expectThrow('revise with 2 cells', w, () => reviseGlyph(p, g.id, broken));
      return q;
    },
    revert: () => {
      // Nothing archived yet: revise first (the player has to have a version to go back to).
      const hasOld = p.glyphs.some((x) => p.glyphArchive.some((a) => a.id === x.id));
      return revertFrom(hasOld ? p : (ops.revise?.() ?? p));
    },
    exit: () => {
      const w = where('exit');
      const g = pick(rng, p.glyphs);
      // Half the time earn silver first (as a trip would), so the side picker is reachable.
      const base = rng.next() < 0.5 ? withBest(p, g, 0, rng.int(2, 3) as TierLevel) : p;
      const silver = rewardsOf(recordOf(base, g.id, g.version)).extraExit;
      const sides = extraExitSides(g);
      if (silver && sides.length > 0) {
        // Prefer a side whose outer cell holds a rune, so the extra branch has somewhere to go.
        const lit = sides.filter((d) =>
          MEMBER_IDS.some((m) =>
            latticeOf(base, m).runes.some((r) => {
              if (!isGlyph(r) || r.glyph !== g.id) return false;
              const out = rotateDirLocal(d, r.dir);
              const to = {
                x: r.at.x + (out === 'right' ? 1 : out === 'left' ? -1 : 0),
                y: r.at.y + (out === 'down' ? 1 : out === 'up' ? -1 : 0),
              };
              return latticeOf(base, m).runes.some((o) => sameTile(o.at, to));
            }),
          ),
        );
        const side =
          rng.next() < 0.1 ? null : pick(rng, lit.length > 0 && rng.next() < 0.8 ? lit : sides);
        const q = setExtraExit(base, g.id, side);
        if (q.glyphs.find((x) => x.id === g.id)?.extraExit !== side) fail('exit not set', w);
        return q;
      }
      if (!silver) expectThrow('extra exit below silver', w, () => setExtraExit(base, g.id, 'up'));
      return null;
    },
    open: () => {
      const g = pick(rng, p.glyphs);
      const w = where('open');
      const allowance = rewardsOf(recordOf(p, g.id, g.version)).params;
      const cands = g.cells.filter((c) => canBeOpen(c.rune)).map((c) => key(c.at));
      const chosen = shuffle(rng, cands).slice(0, Math.min(rng.int(0, allowance), cands.length));
      const q = setOpenCells(p, g.id, chosen);
      const got = q.glyphs.find((x) => x.id === g.id)?.params ?? [];
      if (JSON.stringify([...got].sort()) !== JSON.stringify([...chosen].sort())) {
        fail('open cells not set', w);
      }
      if (cands.length > allowance) {
        expectThrow('too many open cells', w, () =>
          setOpenCells(p, g.id, cands.slice(0, allowance + 1)),
        );
      }
      const fixed = g.cells.find((c) => !canBeOpen(c.rune));
      if (fixed)
        expectThrow('open a Source or Aura', w, () => setOpenCells(p, g.id, [key(fixed.at)]));
      return q;
    },
    args: () => {
      const sockets = MEMBER_IDS.flatMap((m) =>
        latticeOf(p, m)
          .runes.filter(isGlyph)
          .map((r) => ({ m, r })),
      );
      if (sockets.length === 0) return null;
      const { m, r } = pick(rng, sockets);
      let base = p;
      let def = p.glyphs.find((g) => g.id === r.glyph);
      if (!def) return null;
      if (def.params.length === 0 && rng.next() < 0.7) {
        // The player opens a cell first (free), then fills it at placement.
        const cand = def.cells.filter((c) => canBeOpen(c.rune));
        if (cand.length > 0) {
          base = setOpenCells(p, def.id, [key(pick(rng, cand).at)]);
          def = base.glyphs.find((g) => g.id === r.glyph) ?? def;
        }
      }
      const args: Record<string, GlyphArg> = {};
      // Open cells mostly; sometimes any cell (a stale key must be ignored, never crash).
      for (const k of rng.next() < 0.7 ? def.params : def.cells.map((c) => key(c.at))) {
        if (rng.next() < 0.2) continue;
        const a = randomArg(rng, def, k, owned(p));
        if (a) args[k] = a;
      }
      return withArgs(base, m, r.at, args);
    },
    force: () => {
      // Silver or gold without the casts: exercises the reward paths (best tiers only rise).
      const g = pick(rng, p.glyphs);
      return withBest(p, g, rng.int(0, 3) as TierLevel, rng.int(0, 3) as TierLevel);
    },
    exitSides: () => {
      const g = pick(rng, p.glyphs);
      const w = where('exitSides');
      const silver = withBest(p, g, 0, 2);
      const taken = g.exits.find((e) => e.dir !== 'left');
      if (taken)
        expectThrow('extra exit on a taken side', w, () => setExtraExit(silver, g.id, taken.dir));
      expectThrow('extra exit left', w, () => setExtraExit(silver, g.id, 'left'));
      return null;
    },
  };
  const names = [
    ...['revise', 'revise', 'revert', 'revert', 'open', 'args', 'args', 'exit', 'exit', 'force'],
    ...['force', 'exitSides'],
  ];

  for (step = 0; step < MASTERY_STEPS; step++) {
    // Between trips: one to three seeded edits.
    for (let i = rng.int(1, 3); i > 0; i--) {
      const name = pick(rng, names);
      let q: Profile | null = null;
      try {
        q = ops[name]?.() ?? null;
      } catch (err) {
        fail(`${name} threw on a valid request`, where(name), String(err));
      }
      if (!q) continue;
      masteryStats.ops.set(name, (masteryStats.ops.get(name) ?? 0) + 1);
      const w = where(name);
      checkRecords(p, q, w);
      checkProfile(q, w);
      // A change that leaves ink or ownership problems is reported (checked above), not played.
      if (Object.keys(validateLoadout(q)).length > 0) {
        masteryStats.rejected += 1;
        continue;
      }
      if (name === 'args' || name === 'open') identity(q, w);
      p = q;
    }

    // The trip: up to three fights with the Glyphs as they stand; closeBattle writes the records.
    let trip: Trip | null;
    try {
      trip = startTrip(p, seed * 100 + step);
    } catch (err) {
      fail('startTrip rejected a validated loadout', where('trip'), String(err));
      continue;
    }
    trip = { ...trip, encounter: (seed + step) % ENCOUNTERS.length };
    const bot: Bot = step % 2 === 0 ? 'random' : 'greedy';
    for (let fights = 0; trip && fights < 3; fights++) {
      if (trip.status !== 'fight') break;
      const label = `mastery/${seed}/${step}/${fights}`;
      const res = playBattle(label, bot, beginEncounter(p, trip), rng);
      if (res.outcome !== 'won' && res.outcome !== 'lost') break;
      masteryStats.fights += 1;
      const acted = res.battle.actions.reduce<Trip>((acc, a) => recordAction(acc, a), trip);
      let closed: ReturnType<typeof closeBattle>;
      try {
        closed = closeBattle(p, acted, res.battle.state, res.battle.events);
      } catch (err) {
        fail('closeBattle threw', label, String(err));
        break;
      }
      checkRecords(p, closed.profile, label);
      for (const g of closed.profile.glyphs) {
        const was = recordOf(p, g.id, g.version).casts;
        masteryStats.castsRecorded += recordOf(closed.profile, g.id, g.version).casts - was;
      }
      p = closed.profile;
      trip = closed.trip;
      if (trip?.status === 'looting') {
        trip = pickLoot(
          trip,
          Math.max(
            0,
            trip.offers.findIndex((o) => o.kind !== 'doorway'),
          ),
        );
      }
      if (trip?.status === 'crossroads' && trip.encounter + 1 < ENCOUNTERS.length) {
        trip = pushOn(trip);
      } else if (trip?.status !== 'fight') break;
    }
  }
}

test('fuzz: Glyph mastery (revise, revert, open cells, args, extra exits) between trips', () => {
  const t0 = Date.now();
  const seen = new Set(issues.keys());
  const bad: string[] = [];
  let done = 0;
  for (let seed = 1; done < MASTERY_SEEDS && seed < 60; seed++) {
    const p = profileFor('random', seed); // compileSome flags its own findings: they fail via `fresh`
    if (p.glyphs.length === 0) continue;
    done += 1;
    masteryStats.profiles += 1;
    runMastery(seed, p, bad);
  }
  const fresh = [...issues.keys()].filter((k) => !seen.has(k));
  const ops = [...masteryStats.ops].map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(
    `mastery fuzz: ${Date.now() - t0} ms, ${masteryStats.profiles} profiles, ops [${ops}], rejected ${masteryStats.rejected}, identity ${masteryStats.identityChecked}, exit ${masteryStats.exitChecked} (grew ${masteryStats.exitGrew}), fights ${masteryStats.fights}, casts recorded ${masteryStats.castsRecorded}`,
  );
  expect(bad.join('\n'), bad.join('\n')).toBe('');
  expect(fresh.join('; '), fresh.join('; ')).toBe('');
  expect(masteryStats.profiles, 'profiles with Glyphs').toBeGreaterThan(0);
});

// ── The city and the canals (plan F1) ───────────────────

const canalStats = {
  trips: 0,
  battles: 0,
  won: 0,
  locks: 0,
  locksSolved: 0,
  drifts: 0,
  eels: 0,
  replays: 0,
};

/** heard ⊇ open ⊇ hearts, solved ⊆ open, and no list ever loses an entry. */
function checkCity(before: CityState, after: CityState, where: string): void {
  const lists = ['heard', 'open', 'hearts', 'solved'] as const;
  for (const l of lists) {
    for (const id of before[l]) {
      if (!after[l].includes(id)) flag(`city.${l} lost an entry`, `${where} ${id}`);
    }
    if (new Set(after[l]).size !== after[l].length) flag(`city.${l} has a duplicate`, where);
  }
  for (const id of after.open) {
    if (!after.heard.includes(id)) flag('open but not heard', `${where} ${id}`);
  }
  for (const id of after.hearts) {
    if (!after.open.includes(id)) flag('heart cleared but not open', `${where} ${id}`);
  }
  for (const id of after.solved) {
    if (!after.open.includes(id)) flag('solved but not open', `${where} ${id}`);
  }
  if (after.trips < before.trips) flag('city.trips went down', where);
}

/** The pure city functions on this state: each only grows the city. */
function probeCity(p: Profile, t: Trip, log: readonly GameEvent[], where: string): void {
  const h = hearFromBattle(p, t, [...log]);
  checkCity(p.city, h.profile.city, `${where} hearFromBattle`);
  for (const outcome of ['wiped', 'returned'] as const) {
    const a = hearAfterTrip(h.profile, t, outcome);
    checkCity(h.profile.city, a.profile.city, `${where} hearAfterTrip ${outcome}`);
  }
  for (const id of DISTRICT_IDS) {
    checkCity(p.city, bankKeys(p, [{ kind: 'key', district: id }]).city, `${where} bankKeys ${id}`);
    checkCity(p.city, solveThreshold(p, id).city, `${where} solveThreshold ${id}`);
  }
  checkCity(p.city, openAll(p).city, `${where} openAll`);
  checkCity(p.city, seeMap(p).city, `${where} seeMap`);
}

function partyOf(p: Profile, t: Trip | null): BattleSpec['party'] {
  const party: BattleSpec['party'] = {};
  for (const m of MEMBER_IDS) {
    party[m] = {
      hp: t ? t.hp[m] : MEMBERS[m].hp,
      spells: compiledFor(p, m).spells,
      charges: { ...chargesOf(p, m), ...(t ? t.charges[m] : {}) },
    };
  }
  return party;
}

function replayCheck(label: string, spec: BattleSpec, res: BattleResult): void {
  canalStats.replays += 1;
  const rep = replay(spec, res.battle.actions);
  const same =
    JSON.stringify(rep.states[rep.states.length - 1]) === JSON.stringify(res.battle.state) &&
    JSON.stringify(describeLog(rep.events)) === JSON.stringify(describeLog(res.battle.events));
  if (!same) flag('replay does not reproduce the recorded battle', label);
}

function noteBattle(res: BattleResult): void {
  canalStats.battles += 1;
  if (res.outcome === 'won') canalStats.won += 1;
  for (const e of res.battle.events) if (e.type === 'drift') canalStats.drifts += 1;
  if (res.battle.state.units.some((u) => u.kind === 'enemy' && u.def === 'eel')) {
    canalStats.eels += 1;
  }
}

/** The canal lock (K-22): a threshold board with an objective and no foes. */
function runLock(seed: number, bot: Bot, p: Profile, rng: Rng): Profile {
  const gate = DISTRICTS.canals.gate;
  if (gate.kind !== 'threshold') return p;
  const room = gate.room;
  const label = `${bot}/${seed}/lock`;
  const spec: BattleSpec = {
    title: room.name,
    board: room.board,
    seed,
    objective: room.goal,
    party: partyOf(p, null),
  };
  let start: ActionResult;
  try {
    start = createBattle(spec);
  } catch (err) {
    flag('createBattle threw on the lock', `${label}: ${String(err)}`);
    return p;
  }
  const res = playBattle(label, bot, start, rng);
  canalStats.locks += 1;
  noteBattle(res);
  if ((res.outcome === 'won' || res.outcome === 'lost') && canalStats.locks % 2 === 0) {
    replayCheck(label, spec, res);
  }
  if (res.outcome === 'won') {
    canalStats.locksSolved += 1;
    const after = solveThreshold(p, 'canals');
    checkCity(p.city, after.city, label);
    return after;
  }
  return p;
}

function runCanalTrip(seed: number, bot: Bot, kind: Kind, n: number): void {
  const rng = createRng(seed * 2654435761 + BOT_KINDS.indexOf(bot) + 7);
  let p: Profile = profileFor(kind, seed);
  try {
    for (const m of MEMBER_IDS) compiledFor(p, m);
  } catch (err) {
    flag('compileLattice threw', `seed ${seed}: ${String(err)}`);
    return;
  }
  // Heard of, but shut: half the trips try the lock first, the rest get a key.
  p = { ...p, city: { ...p.city, heard: [...new Set([...p.city.heard, 'canals' as const])] } };
  const c0 = p.city;
  if (n % 2 === 0) {
    p = runLock(seed, bot, p, rng);
    if (!p.city.open.includes('canals')) p = solveThreshold(p, 'canals');
  } else {
    p = bankKeys(p, [{ kind: 'key', district: 'canals' }]);
  }
  checkCity(c0, p.city, `${bot}/${seed} open`);

  let trip: Trip | null;
  try {
    trip = startTrip(p, seed, 'canals');
  } catch (err) {
    flag('startTrip rejected a canal trip', `seed ${seed}: ${String(err)}`);
    return;
  }
  canalStats.trips += 1;
  if (bot.endsWith('@entry')) trip = { ...trip, encounter: seed % encountersOf('canals').length };

  let guard = 0;
  while (trip && guard++ < 50) {
    const t: Trip = trip;
    const where = `${bot}/${seed}/canals e${t.encounter} ${t.status}`;
    checkSave(p, t, where);
    switch (t.status) {
      case 'fight': {
        const enc = encountersOf('canals')[t.encounter];
        if (!enc) {
          flag('canal trip on a missing room', where);
          trip = null;
          break;
        }
        const label = `${bot}/${seed}/${enc.id}`;
        const begun = beginEncounter(p, t);
        const variant = enc.variants[variantFor(t, t.encounter)];
        const spec: BattleSpec = {
          title: variant?.name ?? enc.title,
          board: variant?.layout ?? enc.layout,
          seed: deriveSeed(t.seed, t.encounter),
          party: partyOf(p, t),
        };
        if (JSON.stringify(createBattle(spec).state) !== JSON.stringify(begun.state)) {
          flag('spec does not rebuild the canal battle', label);
        }
        const res = playBattle(label, bot, begun, rng);
        noteBattle(res);
        if (res.outcome !== 'won' && res.outcome !== 'lost') {
          trip = null;
          break;
        }
        if (canalStats.battles % 2 === 0) replayCheck(label, spec, res);
        probeCity(p, t, res.battle.events, label);
        const before = p;
        const fin = closeBattle(p, t, res.battle.state, res.battle.events);
        checkCity(before.city, fin.profile.city, `${label} closeBattle`);
        p = fin.profile;
        trip = fin.trip;
        for (const i of p.interactions) {
          if (!INTERACTION_IDS.includes(i))
            flag('profile holds an unknown interaction', `${label} ${i}`);
        }
        if (trip) checkTripState(t, trip, p, label);
        else if (p.city.trips <= before.city.trips)
          flag('a wiped canal trip was not counted', label);
        break;
      }
      case 'looting': {
        if (t.offers.length === 0) {
          flag('looting with no offers', where);
          trip = null;
          break;
        }
        trip = pickLoot(t, rng.int(0, t.offers.length - 1));
        break;
      }
      case 'doorway': {
        const r = applyDoorway(p, t, p.lattices);
        p = r.profile;
        trip = r.trip;
        break;
      }
      case 'crossroads': {
        if (canReturn(t) && rng.next() < 0.15) {
          const before = p;
          p = returnHome(p, t);
          checkBank(before, p, t, where);
          checkCity(before.city, p.city, `${where} returnHome`);
          trip = null;
          break;
        }
        trip = pushOn(t);
        break;
      }
      case 'cleared': {
        const before = p;
        if (!canReturn(t)) flag('the heart is not a landing: the party is stranded', where);
        p = returnHome(p, t);
        checkBank(before, p, t, where);
        checkCity(before.city, p.city, `${where} returnHome`);
        if (!p.city.hearts.includes('canals')) flag('a cleared heart was not marked', where);
        trip = null;
        break;
      }
    }
  }
}

test("data: every district's heart is a landing (else the party is stranded)", () => {
  for (const id of DISTRICT_IDS) {
    const d = DISTRICTS[id];
    const heart = d.encounters.findIndex((e) => e.heart);
    expect(heart, `${id} has a heart`).toBeGreaterThanOrEqual(0);
    expect(d.landings === 'all' || d.landings.includes(heart), `${id} heart is a landing`).toBe(
      true,
    );
  }
});

test('fuzz: canal trips and the lock, bots on the current', () => {
  const t0 = Date.now();
  for (const bot of BOT_KINDS) {
    for (let i = 0; i < SEEDS; i++) {
      const seed = 5000 + i * 6007 + BOT_KINDS.indexOf(bot) * 104729;
      runCanalTrip(seed, bot, KINDS[i % KINDS.length] ?? 'start', i);
    }
  }
  if (process.env.FUZZ_SEEDS) {
    console.log(`canal fuzz: ${Date.now() - t0} ms ${JSON.stringify(canalStats)}`);
  }
  const summary = [...issues]
    .map(([k, v]) => `${k} x${v.count}: ${v.example.slice(0, 400)}`)
    .join('\n');
  expect(summary, summary).toBe('');
  expect(canalStats.battles, 'canal battles played').toBeGreaterThan(0);
  expect(canalStats.drifts, 'drift events seen').toBeGreaterThan(0);
  expect(canalStats.eels, 'eel battles').toBeGreaterThan(0);
}, 600_000);

// ── Engine bugs found by F1 (fixed; kept as regressions) ──

test('BUG-F1-1: a shoved eel stays on the water', () => {
  // `. . . .` / `. ew> . .` / `. D . .`: the Draughtsman shoves the eel up, off the lane, onto land.
  const s = board('. . . .\n. ew> . .\n. D . .');
  const r = applyAction(s, { type: 'shove', unit: 'draughtsman', dir: 'up' });
  const eel = r.state.units.find((u) => u.id.startsWith('eel'));
  expect(eel && eel.hp > 0 ? tileAt(r.state, eel.pos).water : 'down').not.toBeNull();
});

test('BUG-F1-2: drift never lays a float on a brass plate', () => {
  // A plate raised on a lane tile (Kiln) with oil upstream: the oil drifts onto the plate.
  const s = board('w>o w> w> .\n. D . S\nr . . .');
  const t = s.tiles[1];
  if (t) t.plate = true;
  const r = applyAction(s, { type: 'endTurn' });
  expect(r.state.tiles[1]?.oil).toBe(false);
});

test('BUG-F1-3: every interaction a battle can discover is in INTERACTION_IDS', () => {
  // A canal fight that drifts oil discovers 'drift'; parseProfile then rejects the save.
  const s = board('w>o w> w> .\n. D . S\nr . . .');
  const r = applyAction(s, { type: 'endTurn' });
  for (const d of r.state.discovered) expect(INTERACTION_IDS).toContain(d);
});

test('BUG-F1-4: the lamp-mother cannot be shoved', () => {
  // `. D . .` / `. Mw> . .` ... a member shoves the anchored mother and she moves.
  const s = board('. . . .\n. Mw> . .\n. D . .');
  const r = applyAction(s, { type: 'shove', unit: 'draughtsman', dir: 'up' });
  const m = r.state.units.find((u) => u.id.startsWith('mother'));
  expect(m?.pos).toEqual({ x: 1, y: 1 });
});
