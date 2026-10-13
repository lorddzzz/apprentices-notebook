import { expect, test } from 'vitest';
import {
  ENCOUNTERS,
  ENEMIES,
  type EnemyId,
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
  type BattleSpec,
  type BattleState,
  beginEncounter,
  blockingAuras,
  boardOf,
  type Coord,
  canPlace,
  canUndoMove,
  castableSpells,
  clustersOf,
  compiledFor,
  compileGlyph,
  createBattle,
  createRng,
  DIRS,
  deriveSeed,
  describe as describeEvent,
  describeLog,
  disconnected,
  finishEncounter,
  type GameEvent,
  glyphLibrary,
  inkUsed,
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
  type Profile,
  pickLoot,
  provenCount,
  pushOn,
  type Rng,
  recordProof,
  replay,
  returnHome,
  setMemberLattice,
  setSocket,
  shoveDirs,
  startTrip,
  type Trip,
  type Unit,
  validateLoadout,
} from '$engine';

/**
 * Fuzz harness: random and greedy bots play whole trips over the pure engine. Every action is
 * checked against invariants; violations are collected (not thrown) and summarised at the end.
 * Test-only code: nothing here is engine logic.
 */

const MAX_ROUNDS = 60;
const SEEDS = Number(process.env.FUZZ_SEEDS ?? 6);
const REPLAY_EVERY = 5; // replay-compare every Nth finished battle (cost)
const STALL_ROUNDS = 20;
// '@entry' modes start every trip at encounter (seed % 4) with a full party, so the deeper
// encounters get played by both bots too (organic trips rarely reach them).
const BOT_KINDS = ['random', 'greedy', 'random@entry', 'greedy@entry'] as const;
type Bot = (typeof BOT_KINDS)[number];
const isRandom = (b: Bot): boolean => b.startsWith('random');

// ── Issue log ───────────────────────────────────────────

const issues = new Map<string, { count: number; example: string }>();
function flag(rule: string, example: string): void {
  const cur = issues.get(rule);
  if (cur) cur.count += 1;
  else issues.set(rule, { count: 1, example: example.slice(0, 3000) });
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
  for (const t of s.tiles) board += t.steam + t.fire + (t.oil ? 1 : 0) + (t.ink ? 1 : 0);
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
    if (u.hp > 0) {
      const k = key(u.pos);
      const prev = seen.get(k);
      if (prev !== undefined) flag('two living units share a tile', `${at} and ${prev}`);
      seen.set(k, u.id);
      const tile = s.tiles[u.pos.y * s.width + u.pos.x];
      if (tile?.plate) flag('living unit on a brass plate', at);
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
  });
  if (s.phase === 'won' && liveEnemies(s).length > 0) flag('won with enemies alive', where);
  if (s.phase === 'lost' && liveMembers(s).length > 0) flag('lost with members alive', where);
  if (s.phase === 'player' && (liveEnemies(s).length === 0 || liveMembers(s).length === 0)) {
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
    checkPaths(before, r.state, r.events, where);

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
  for (const e of r.events) {
    if (e.type === 'cast' && !e.echo && action.type !== 'cast') {
      flag('cast event without a cast action', where);
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

function playBattle(label: string, bot: Bot, start: ActionResult, rng: Rng): BattleResult {
  const b = new Battle(label, start);
  let sig = progressSig(b.state);
  let lastChange = b.state.round;
  while (b.state.phase === 'player' && !b.broken) {
    if (b.state.round > MAX_ROUNDS) break;
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
      `${outcome} ${label} round ${b.state.round} (last change r${lastChange})\n${boardOf(b.state)}\n      ${tail}`,
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
  return { title: enc.title, board: enc.layout, seed: deriveSeed(t.seed, t.encounter), party };
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
  if (after.units.length !== before.units.length) flag('unit count changed', where);
  const prev = new Map(before.units.map((u) => [u.id, u]));
  for (const u of after.units) {
    const p = prev.get(u.id);
    if (!p) {
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
          (e.type === 'moved' ||
            e.type === 'pushed' ||
            e.type === 'moveUndone' ||
            e.type === 'slide') &&
          e.unit.id === u.id,
      );
      if (!moved) flag('unit changed tile with no movement event', `${where} ${u.name}`);
    }
  }
}

/** Walks in the log: no step crosses a living unit or a brass plate, and each move starts where the unit was. */
function checkPaths(
  before: BattleState,
  after: BattleState,
  events: readonly GameEvent[],
  where: string,
): void {
  const at = new Map<string, string>(); // tile key -> unit id (living units only)
  const tileOf = new Map<string, string>(); // unit id -> tile key
  for (const u of before.units) {
    if (u.hp <= 0) continue;
    at.set(key(u.pos), u.id);
    tileOf.set(u.id, key(u.pos));
  }
  const plate = (c: Coord) => after.tiles[c.y * after.width + c.x]?.plate === true;
  const place = (id: string, to: Coord) => {
    const old = tileOf.get(id);
    if (old !== undefined) at.delete(old);
    at.set(key(to), id);
    tileOf.set(id, key(to));
  };
  for (const e of events) {
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

function runTrip(seed: number, bot: Bot, replayPick: { n: number }): void {
  const rng = createRng(seed * 2654435761 + BOT_KINDS.indexOf(bot) + 1);
  let p: Profile = seed % 2 === 0 ? newProfile() : randomLoadout(seed);
  if (seed % 2 !== 0) p = compileSome(p, seed);
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
    switch (t.status) {
      case 'fight': {
        const enc = ENCOUNTERS[t.encounter];
        if (!enc) break;
        const label = `${bot}/${seed}/${enc.id}`;
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
        trip = pickLoot(t, rng.int(0, t.offers.length - 1));
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
      runTrip(1000 + i * 7919, bot, replayPick);
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
  lines.push(
    `glyphs: tried ${glyphStats.tried}, compiled ${glyphStats.compiled}, casts compared ${glyphStats.castsCompared}`,
  );
  if (process.env.FUZZ_SEEDS) console.log(lines.join('\n'));

  const summary = [...issues.keys()].join('; ');
  expect(summary, summary).toBe('');
}, 600_000);

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
