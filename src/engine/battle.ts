import {
  ATTACKS,
  DISTRICTS,
  type DistrictId,
  ENEMIES,
  type EncounterDef,
  type EnemyId,
  MEMBERS,
  type MemberId,
  TUNING,
} from '$data';
import { RIVALS, type RivalDef, type RivalId } from '$data/rivals';
import { enemyPhase } from './ai';
import { BASIC_ACTIONS } from './basicActions';
import { castAction } from './cast';
import { cloneData } from './clone';
import { type Ctx, checkEnd, type DraftOptions, emit, ref, runDraft } from './ctx';
import type { GameEvent } from './events';
import { type Coord, label } from './grid';
import { withIdioms } from './idioms';
import { moveMember, undoMove } from './movement';
import { type BoardUnit, parseBoard, parseCell, parseLabel, serializeBoard } from './notation';
import {
  canUndoMove,
  enemies,
  findUnit,
  inBoard,
  isAlive,
  legalAims,
  legalMoves,
  livingUnits,
  memberById,
  members,
  sameAim,
  spellOf,
  unitAt,
} from './queries';
import { rivalAct } from './rivals/resolve';
import { spawnRival } from './rivals/unit';
import { deriveSeed } from './rng';
import { placeParty, START_SALT } from './rooms';
import { endTurnAction } from './turn';
import type {
  Action,
  ActionResult,
  BattleSpec,
  BattleState,
  EnemyUnit,
  InventionLibrary,
  MemberUnit,
  PartyInit,
  Unit,
} from './types';

export class IllegalActionError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Illegal action: ${reason}`);
    this.name = 'IllegalActionError';
    this.reason = reason;
  }
}

// ── Creation ────────────────────────────────────────────

/** The unit-layer fields a board token sets (notation's mods). */
function boardMods(b: BoardUnit) {
  return {
    shield: b.shield,
    guardUntil: null,
    mark:
      b.mark === null ? null : { deep: b.mark === 'deep', lineage: 0, bound: null, origin: null },
    collar: b.collar ? null : (false as const),
    shackle: b.shackle ? TUNING.compoundRounds : 0,
    held: 0,
    stunned: false,
  };
}

function spawnMember(b: BoardUnit, init: PartyInit = {}): MemberUnit {
  const def = MEMBERS[b.def as MemberId];
  const spells = init.spells ?? [];
  const hp = init.hp ?? def.hp;
  return {
    kind: 'member',
    id: def.id,
    def: def.id,
    name: def.name,
    pos: { ...b.at },
    hp,
    maxHp: Math.max(def.hp, hp),
    ...boardMods(b),
    elite: true,
    lastMove: null,
    move: def.move,
    moved: false,
    acted: false,
    undo: null,
    spells,
    charges: init.charges ?? Object.fromEntries(spells.map((sp) => [sp.key, sp.charges])),
    lean: { ...def.lean, ...(init.habit === undefined ? {} : { habit: init.habit }) },
    action: init.action ?? def.action,
  };
}

function spawnEnemy(b: BoardUnit, n: number): EnemyUnit {
  const def = ENEMIES[b.def as EnemyId];
  return {
    kind: 'enemy',
    id: `${def.id}-${n}`,
    def: def.id,
    name: def.name,
    pos: { ...b.at },
    hp: def.hp,
    maxHp: def.hp,
    ...boardMods(b),
    collar: b.collar || def.brass ? null : false,
    elite: def.elite,
    lastMove: null,
    intent: null,
    ...(def.bystander ? { bystander: true as const } : {}),
    ...(RIVALS[def.id as RivalId]
      ? { rival: spawnRival(RIVALS[def.id as RivalId] as RivalDef) }
      : {}),
  };
}

function unitAtLabel(s: BattleState, text: string): Unit {
  const u = unitAt(s, parseLabel(text));
  if (!u) throw new Error(`No unit at ${text}`);
  return u;
}

/** Round-1 telegraphs given explicitly by label (tests, Lab scenarios). Unlisted enemies wait. */
function telegraphGiven(ctx: Ctx, intents: NonNullable<BattleSpec['intents']>): void {
  const given = new Map(
    Object.entries(intents).map(([lbl, dir]) => [unitAtLabel(ctx.s, lbl).id, { lbl, dir }]),
  );
  let order = 0;
  for (const e of enemies(ctx.s)) {
    const g = given.get(e.id);
    given.delete(e.id);
    const attack = ENEMIES[e.def].attack;
    if (!g) {
      if (!e.rival?.pinned) emit(ctx, { type: 'idle', unit: ref(e) });
      continue;
    }
    if (!attack) throw new Error(`The ${e.name} at ${g.lbl} has no attack to telegraph`);
    const intent = { kind: 'attack', attack, dir: g.dir, order: ++order } as const;
    e.intent = intent;
    emit(ctx, {
      type: 'telegraph',
      unit: ref(e),
      intent: { ...intent },
      verb: ATTACKS[attack].verb,
    });
  }
  for (const { lbl } of given.values()) throw new Error(`Intent for ${lbl}: not an enemy`);
}

/** Rival intents pinned by label (RV-2): kept on the rival, telegraphed in place of planning. */
function pinRivals(s: BattleState, pins: NonNullable<BattleSpec['pins']>): void {
  for (const [lbl, intent] of Object.entries(pins)) {
    const u = unitAtLabel(s, lbl);
    if (u.kind !== 'enemy' || !u.rival) throw new Error(`Pin for ${lbl}: not a rival`);
    u.rival.pinned = cloneData(intent);
  }
}

/** Round 1 with explicit intents: pinned rivals telegraph after the given ones. */
function telegraphPins(ctx: Ctx): void {
  let order = Math.max(0, ...enemies(ctx.s).map((e) => e.intent?.order ?? 0));
  for (const e of enemies(ctx.s)) if (e.rival?.pinned && !e.intent) rivalAct(ctx, e, ++order);
}

export function createBattle(spec: BattleSpec): ActionResult {
  const parsed = parseBoard(spec.board);
  const board = spec.lineup
    ? placeParty(parsed, spec.lineup, spec.startSeed ?? deriveSeed(spec.seed, START_SALT))
    : parsed;
  const counts = new Map<EnemyId, number>();
  const units: Unit[] = board.units.map((b) => {
    if (b.kind === 'member') return spawnMember(b, spec.party?.[b.def as MemberId]);
    const n = (counts.get(b.def as EnemyId) ?? 0) + 1;
    counts.set(b.def as EnemyId, n);
    return spawnEnemy(b, n);
  });
  const state: BattleState = {
    title: spec.title,
    width: board.width,
    height: board.height,
    tiles: board.tiles,
    units,
    round: 1,
    edge: spec.edge ?? 'wall',
    phase: 'player',
    rngState: spec.seed >>> 0,
    lab: !!spec.lab,
    ...(spec.objective ? { objective: spec.objective } : {}),
    castSeq: 0,
    lineages: {},
    nextLineage: 1,
    scheduled: [],
    inventions: spec.inventions ?? {},
    landed: [],
    met: [],
    named: [],
  };
  // Board marks get their own lineages, in reading order (§6.4 limit 3).
  for (const u of state.units) if (u.mark) u.mark.lineage = state.nextLineage++;
  for (const [lbl, hp] of Object.entries(spec.hp ?? {})) {
    const u = unitAtLabel(state, lbl);
    u.hp = hp;
    u.maxHp = Math.max(u.maxHp, hp);
  }
  if (spec.pins) pinRivals(state, spec.pins);
  return runDraft(state, (ctx) => {
    emit(ctx, { type: 'battleStart', title: spec.title });
    emit(ctx, { type: 'round', round: 1 });
    emit(ctx, { type: 'phase', phase: 'enemy' });
    if (spec.intents) {
      telegraphGiven(ctx, spec.intents);
      telegraphPins(ctx);
    } else enemyPhase(ctx, { move: false });
    emit(ctx, { type: 'phase', phase: 'player' });
  });
}

export function createEncounterBattle(
  enc: EncounterDef,
  party: Partial<Record<MemberId, PartyInit>>,
  seed: number,
  variant = 0,
  district: DistrictId = 'seam',
  inventions: InventionLibrary = {},
  place: { lineup: readonly MemberId[]; startSeed?: number } = {
    lineup: Object.keys(party) as MemberId[],
  },
): ActionResult {
  const layout = enc.variants[variant]?.layout ?? enc.layout;
  const title = enc.variants[variant]?.name ?? enc.title;
  return createBattle({
    title,
    board: layout,
    seed,
    party,
    edge: DISTRICTS[district].edge,
    inventions,
    lineup: place.lineup,
    ...(place.startSeed === undefined ? {} : { startSeed: place.startSeed }),
  });
}

// ── Actions ─────────────────────────────────────────────

/** Null when legal, else a short reason (for disabled buttons and the thrown error). */
export function isLegal(s: BattleState, action: Action): string | null {
  if (s.phase !== 'player') return 'The battle is over';
  if (action.type === 'endTurn') return null;
  const u = findUnit(s, action.unit);
  if (!u) return `No unit ${action.unit}`;
  if (u.kind !== 'member') return `${u.name} is not a party member`;
  if (!isAlive(u)) return u.out ? `${u.name} is out of the room` : `${u.name} is down`;
  switch (action.type) {
    case 'move':
      if (u.moved) return `${u.name} has already moved`;
      return legalMoves(s, u.id).some((c) => c.x === action.to.x && c.y === action.to.y)
        ? null
        : `${u.name} can't reach ${label(action.to)}`;
    case 'undoMove':
      return canUndoMove(s, u.id) ? null : `${u.name} has no move to undo`;
    case 'shove':
    case 'pull':
    case 'hop':
    case 'swap':
      // HC P14, AH P1: an apprentice takes only her own basic action.
      if (u.action !== action.type) return `${u.name} can't ${action.type}`;
      if (u.acted) return `${u.name} has already acted`;
      return BASIC_ACTIONS[action.type].check(s, u.id, action.dir);
    case 'cast': {
      if (u.acted) return `${u.name} has already acted`;
      if (!spellOf(u, action.spell)) return `${u.name} has no spell at ${action.spell}`;
      if (!s.lab && (u.charges[action.spell] ?? 0) <= 0) return 'No charges left';
      const ok = legalAims(s, u.id, action.spell).some((a) => sameAim(a, action.aim));
      return ok ? null : 'Not a legal aim';
    }
  }
}

function dispatch(ctx: Ctx, action: Action): void {
  switch (action.type) {
    case 'move':
      moveMember(ctx, memberById(ctx.s, action.unit), action.to);
      break;
    case 'undoMove':
      undoMove(ctx, memberById(ctx.s, action.unit));
      break;
    case 'shove':
    case 'pull':
    case 'hop':
    case 'swap':
      BASIC_ACTIONS[action.type].apply(ctx, action.unit, action.dir);
      break;
    case 'cast':
      castAction(ctx, action);
      break;
    case 'endTurn':
      endTurnAction(ctx);
      break;
  }
}

/** Pure: returns the next state and the events; throws IllegalActionError if not legal. */
export function applyAction(
  state: BattleState,
  action: Action,
  footnotes: DraftOptions['footnotes'] = {},
): ActionResult {
  const reason = isLegal(state, action);
  if (reason !== null) throw new IllegalActionError(reason);
  return runDraft(
    state,
    (ctx) => {
      // A cast or basic action changes the board: no earlier move can be taken back after it.
      if (action.type !== 'move' && action.type !== 'undoMove' && action.type !== 'endTurn') {
        for (const m of members(ctx.s)) m.undo = null;
      }
      withIdioms(ctx, () => dispatch(ctx, action));
      if (action.type !== 'endTurn') checkEnd(ctx);
    },
    { footnotes },
  );
}

/** Creates the battle and applies each action. states[0] is the created battle. */
export function replay(
  spec: BattleSpec,
  actions: readonly Action[],
): { states: BattleState[]; events: GameEvent[] } {
  const first = createBattle(spec);
  const states = [first.state];
  const events = [...first.events];
  let cur = first.state;
  for (const a of actions) {
    const r = applyAction(cur, a);
    cur = r.state;
    states.push(cur);
    events.push(...r.events);
  }
  return { states, events };
}

// ── Lab ─────────────────────────────────────────────────

function toBoardUnit(u: Unit): BoardUnit {
  const innateBrass = u.kind === 'enemy' && ENEMIES[u.def].brass;
  return {
    kind: u.kind,
    def: u.def,
    at: { ...u.pos },
    mark: u.mark === null ? null : u.mark.deep ? 'deep' : 'plain',
    collar: u.collar !== false && !(innateBrass && u.collar === null),
    shackle: u.shackle > 0,
    shield: u.shield,
  };
}

/** The current board as ASCII (Lab "copy as scenario"). */
export function boardOf(s: BattleState): string {
  return serializeBoard({
    width: s.width,
    height: s.height,
    tiles: s.tiles,
    units: livingUnits(s).map(toBoardUnit),
  });
}

/**
 * Lab edit: replaces the tile and the unit at `at` with one board token. A member placed again
 * moves (keeping its spells and charges); a new enemy gets a fresh id and acts last.
 */
export function labSetCell(state: BattleState, at: Coord, token: string): BattleState {
  if (!inBoard(state, at)) throw new Error(`${label(at)} is off the board`);
  const { tile, unit } = parseCell(token, at);
  const s = cloneData(state);
  s.tiles[at.y * s.width + at.x] = tile;
  const old = unitAt(s, at);
  const kept = s.units.filter((u) => u !== old && !(unit?.kind === 'member' && u.id === unit.def));
  const prev = unit?.kind === 'member' ? s.units.find((u) => u.id === unit.def) : undefined;
  s.units = kept;
  if (unit?.kind === 'member') {
    const init: PartyInit =
      prev?.kind === 'member'
        ? {
            spells: prev.spells,
            charges: prev.charges,
            action: prev.action,
            habit: prev.lean.habit,
          }
        : {};
    s.units.push(spawnMember(unit, init));
  } else if (unit) {
    const ids = s.units
      .filter((u) => u.def === unit.def)
      .map((u) => Number(u.id.slice(u.id.lastIndexOf('-') + 1)));
    s.units.push(spawnEnemy(unit, Math.max(0, ...ids) + 1));
  }
  return s;
}
