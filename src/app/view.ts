import {
  CHEMISTRY,
  type CompoundId,
  ENEMIES,
  type EnemyId,
  MEMBERS,
  type MemberId,
  type RuneRef,
  type StateId,
  TUNING,
} from '$data';
import {
  type BattlePhase,
  type BattleState,
  type BoardSpec,
  type Coord,
  type Dir,
  firstRune,
  type GameEvent,
  type Intent,
  relocations,
  type Tile,
  type Unit,
  type UnitId,
} from '$engine';

/** A state or compound a tile can hold. */
export type LayerId = StateId | CompoundId;

/** A sealed jar as the board draws it: whose it is, when it opens, and a peek at what is inside. */
export interface JarView {
  owner: UnitId;
  event: 'step' | 'dusk';
  /** The first rune of what is sealed (the jar's contents peek); null when not known or empty. */
  peek: RuneRef | null;
}

/** What the board draws. Events are projected onto it during playback; the engine state replaces it at the end. */
export interface TileView {
  /** The one state or compound on the tile (design §4); `rounds` is how long it has left (0 = permanent). */
  state: LayerId | null;
  rounds: number;
  /** Hits left on a plate, skid plate, kettle or wall before it breaks; 0 = none recorded (a layout plate). */
  hits: number;
  jar: JarView | null;
  vent: boolean;
  /** `_`: an open side (P3). */
  drop?: boolean;
  /** The canal terrain (K-6); absent in hand-built views, which means none. */
  water?: Dir | null;
  grate?: boolean;
  gate?: boolean;
  lamp?: boolean;
}

export type MarkView = 'plain' | 'deep' | null;

export interface UnitView {
  id: UnitId;
  kind: 'member' | 'enemy';
  def: MemberId | EnemyId;
  name: string;
  pos: Coord;
  hp: number;
  maxHp: number;
  shield: number;
  /** The round whose player phase lifts the shield (Guard); null when none is running. */
  guard: number | null;
  /** Ink on the unit (a mark, `!`), deep when it takes two Sparks to clear. */
  mark: MarkView;
  /** The action a bound mark holds until its event (Bind); null for a plain mark. */
  bound: RuneRef | null;
  /** Marks spread from one source share a lineage; the projection numbers its own. */
  lineage: number | null;
  /** Brass on the unit (a collar, `&`). */
  collar: boolean;
  /** The brass was there from the start (a sentry): a shackle does not take it off. */
  born: boolean;
  /** Rounds a shackle has left (0 = none). */
  shackle: number;
  /** Rounds a hold has left (0 = none). */
  held: number;
  stunned: boolean;
  alive: boolean;
  intent: Intent | null;
}

export interface BoardView {
  width: number;
  height: number;
  tiles: TileView[];
  units: UnitView[];
  round: number;
  phase: BattlePhase;
}

export function tileViewOf(t: Tile): TileView {
  const { water, grate, gate, lamp, vent, drop } = t.terrain;
  return {
    state: t.state?.id ?? null,
    rounds: t.state && !t.state.set ? t.state.rounds : 0,
    hits: t.state?.hits ?? 0,
    jar: t.jar ? { owner: t.jar.owner, event: t.jar.event, peek: firstRune(t.jar.rest) } : null,
    vent,
    drop,
    water,
    grate,
    gate,
    lamp,
  };
}

const markOf = (u: Unit): MarkView => (u.mark ? (u.mark.deep ? 'deep' : 'plain') : null);

export function viewOf(s: BattleState): BoardView {
  return {
    width: s.width,
    height: s.height,
    tiles: s.tiles.map(tileViewOf),
    units: s.units.map((u) => ({
      id: u.id,
      kind: u.kind,
      def: u.def,
      name: u.name,
      pos: { ...u.pos },
      hp: u.hp,
      maxHp: u.maxHp,
      shield: u.shield,
      guard: u.guardUntil,
      mark: markOf(u),
      bound: u.mark?.bound?.action ?? null,
      lineage: u.mark ? u.mark.lineage : null,
      collar: u.collar !== false,
      born: u.collar === null,
      shackle: u.shackle,
      held: u.held,
      stunned: u.stunned,
      alive: u.hp > 0,
      intent: u.kind === 'enemy' && u.intent ? { ...u.intent } : null,
    })),
    round: s.round,
    phase: s.phase,
  };
}

/** A fresh view from parsed ASCII (gallery fixtures, Lab board edits). Mirrors the engine's spawn rules. */
export function viewOfSpec(spec: BoardSpec): BoardView {
  const counts = new Map<string, number>();
  const units: UnitView[] = spec.units.map((b) => {
    if (b.kind === 'member') {
      const def = MEMBERS[b.def as MemberId];
      return {
        id: def.id,
        kind: 'member',
        def: def.id,
        name: def.name,
        pos: { ...b.at },
        hp: def.hp,
        maxHp: def.hp,
        shield: b.shield,
        guard: null,
        mark: b.mark,
        bound: null,
        lineage: b.mark ? 0 : null,
        collar: b.collar,
        born: b.collar,
        shackle: b.shackle ? TUNING.compoundRounds : 0,
        held: 0,
        stunned: false,
        alive: true,
        intent: null,
      };
    }
    const def = ENEMIES[b.def as EnemyId];
    const n = (counts.get(def.id) ?? 0) + 1;
    counts.set(def.id, n);
    const collar = def.brass || b.collar;
    return {
      id: `${def.id}-${n}`,
      kind: 'enemy',
      def: def.id,
      name: def.name,
      pos: { ...b.at },
      hp: def.hp,
      maxHp: def.hp,
      shield: b.shield,
      guard: null,
      mark: b.mark,
      bound: null,
      lineage: b.mark ? 0 : null,
      collar,
      born: collar,
      shackle: b.shackle ? TUNING.compoundRounds : 0,
      held: 0,
      stunned: false,
      alive: true,
      intent: null,
    };
  });
  return {
    width: spec.width,
    height: spec.height,
    tiles: spec.tiles.map(tileViewOf),
    units,
    round: 1,
    phase: 'player',
  };
}

export function withoutIntents(v: BoardView): BoardView {
  return { ...v, units: v.units.map((u) => ({ ...u, intent: null })) };
}

function cloneView(v: BoardView): BoardView {
  return {
    ...v,
    tiles: v.tiles.map((t) => ({ ...t, jar: t.jar && { ...t.jar } })),
    units: v.units.map((u) => ({ ...u, pos: { ...u.pos }, intent: u.intent && { ...u.intent } })),
  };
}

function tileOf(v: BoardView, c: Coord): TileView | undefined {
  if (c.x < 0 || c.y < 0 || c.x >= v.width || c.y >= v.height) return undefined;
  return v.tiles[c.y * v.width + c.x];
}

function liveUnitAt(v: BoardView, c: Coord): UnitView | undefined {
  return v.units.find((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y);
}

/** How long a state put down lasts (P17) and how many hits it takes; the engine's `newLayer` without its flags. */
function freshLayer(id: LayerId): { rounds: number; hits: number } {
  switch (id) {
    case 'blot':
    case 'slick':
      return { rounds: 0, hits: 0 };
    case 'cloud':
      return { rounds: TUNING.cloudRounds, hits: 0 };
    case 'plate':
      return { rounds: TUNING.plateRounds, hits: CHEMISTRY.plateHits };
    case 'fire':
      return { rounds: TUNING.fireRounds, hits: 0 };
    case 'bank':
      return { rounds: TUNING.compoundRounds + CHEMISTRY.bankExtraRounds, hits: 0 };
    case 'wall':
      return { rounds: TUNING.compoundRounds, hits: CHEMISTRY.wallHits };
    case 'skidPlate':
    case 'kettle':
      return { rounds: TUNING.compoundRounds, hits: CHEMISTRY.plateHits };
    default:
      return { rounds: TUNING.compoundRounds, hits: 0 };
  }
}

/** Layers that stand up like a plate: no unit may share the tile. */
export const STANDS_UP: ReadonlySet<LayerId> = new Set(['plate', 'skidPlate', 'kettle', 'wall']);

/** Puts a state on tiles with the rounds a fresh one lasts, or clears them. */
function setState(
  v: BoardView,
  cells: readonly Coord[],
  id: LayerId | null,
  rounds?: number,
): void {
  for (const c of cells) {
    const t = tileOf(v, c);
    if (!t) continue;
    const fresh = id ? freshLayer(id) : { rounds: 0, hits: 0 };
    t.state = id;
    t.rounds = rounds ?? fresh.rounds;
    t.hits = fresh.hits;
  }
}

function patchUnit(v: BoardView, id: UnitId, patch: (u: UnitView) => void): void {
  const u = v.units.find((x) => x.id === id);
  if (u) patch(u);
}

function clearMark(u: UnitView): void {
  u.mark = null;
  u.bound = null;
  u.lineage = null;
}

/** Lifts what floats on each source tile and sets it down downstream (the engine's merge rules). */
function driftTiles(v: BoardView, floats: readonly { from: Coord; to: Coord | null }[]): void {
  const lifted = floats.map((f) => {
    const t = tileOf(v, f.from);
    if (!t) return null;
    const cargo = { state: t.state, rounds: t.rounds, hits: t.hits };
    t.state = null;
    t.rounds = 0;
    t.hits = 0;
    return cargo;
  });
  floats.forEach((f, i) => {
    const cargo = lifted[i];
    const dest = f.to && tileOf(v, f.to);
    if (!cargo?.state || !dest) return;
    if (dest.state === null || (cargo.state === 'fire' && dest.state === 'slick')) {
      dest.state = cargo.state;
      dest.rounds = cargo.rounds;
      dest.hits = cargo.hits;
    }
  });
}

/** A foe called onto the board mid-playback (`summon`): ids are `<def>-<n>`. */
function spawnedView(id: UnitId, pos: Coord): UnitView {
  const def = ENEMIES[id.replace(/-\d+$/, '') as EnemyId] ?? ENEMIES.moth;
  return {
    id,
    kind: 'enemy',
    def: def.id,
    name: def.name,
    pos: { ...pos },
    hp: def.hp,
    maxHp: def.hp,
    shield: 0,
    guard: null,
    mark: null,
    bound: null,
    lineage: null,
    collar: def.brass,
    born: def.brass,
    shackle: 0,
    held: 0,
    stunned: false,
    alive: true,
    intent: null,
  };
}

/** A crush against a plate wears it. */
function wearPlateAt(v: BoardView, at: Coord): void {
  const t = tileOf(v, at);
  if (t?.state && STANDS_UP.has(t.state) && t.hits > 1) t.hits--;
}

/** Round-end decay as the engine logs it: a layer at its last round, a worn-out plate, a shackle's last round. */
function fadeAt(v: BoardView, c: Coord): void {
  const t = tileOf(v, c);
  if (!t) return;
  const shackled = liveUnitAt(v, c);
  if (shackled && shackled.shackle > 0 && shackled.shackle <= 1) shackled.shackle = 0;
  if (!t.state) return;
  const worn = STANDS_UP.has(t.state) && t.hits > 0 && t.hits <= 1;
  if (t.rounds === 1 || worn) setState(v, [c], null);
}

/** The burst's own changes to the board (the event names the tiles; the damage follows as its own events). */
function burstEffects(v: BoardView, e: Extract<GameEvent, { type: 'burst' }>): void {
  switch (e.burst) {
    case 'fire':
    case 'page:stain':
    case 'page:pool':
      setState(v, e.tiles.length ? e.tiles : [e.at], 'fire');
      break;
    case 'page:greaseFog':
      for (const c of e.tiles) {
        if (tileOf(v, c)?.state === 'greaseFog') {
          setState(v, [c], 'fire', CHEMISTRY.flashoverFireRounds);
        }
      }
      break;
    case 'page:skidPlate':
      setState(v, [e.at], null);
      break;
    case 'page:kettle':
      setState(v, [e.at], 'cloud');
      break;
    case 'page:shackle': {
      const u = liveUnitAt(v, e.at);
      if (u) u.shackle = 0;
      break;
    }
    default:
      break;
  }
}

/** A new player phase: Guard lapses, Hold counts down, a stunned apprentice sits out. */
function beginPlayerPhase(v: BoardView): void {
  for (const u of v.units) {
    if (!u.alive) continue;
    if (u.guard !== null && u.guard <= v.round) {
      u.shield = 0;
      u.guard = null;
    }
    if (u.held > 0) u.held--;
    if (u.kind === 'member' && u.stunned) u.stunned = false;
  }
}

/** Mark lineage numbers the projection hands out itself (the engine's are not in the log). */
const nextLineage = (v: BoardView): number =>
  1 + Math.max(-1, ...v.units.map((u) => u.lineage ?? -1));

/**
 * Applies one event to a copy of the view. Patches what the event states, and what the engine does
 * silently around it that the log makes certain (a burst's fire, a hold's countdown);
 * a few silent counters (a cloud's rounds with a gift) catch up when the view snaps to the engine
 * state at the end. Every event in the union is named here, so a new one fails to compile until
 * it is considered.
 */
export function projectWith(view: BoardView, e: GameEvent): BoardView {
  const v = cloneView(view);
  switch (e.type) {
    case 'moved':
    case 'push':
    case 'swapped':
    case 'drift':
      for (const r of relocations(e)) {
        patchUnit(v, r.unit.id, (u) => {
          u.pos = { ...r.to };
        });
      }
      if (e.type === 'drift') driftTiles(v, e.floats);
      break;
    case 'moveUndone':
      patchUnit(v, e.unit.id, (u) => {
        u.pos = { ...e.to };
      });
      break;
    case 'damage':
      patchUnit(v, e.target.id, (u) => {
        u.hp = e.hpLeft;
      });
      break;
    case 'shieldAbsorbs':
      patchUnit(v, e.unit.id, (u) => {
        u.shield = e.left;
      });
      break;
    case 'shieldGained':
      patchUnit(v, e.unit.id, (u) => {
        u.shield = e.total ?? u.shield + e.amount;
        u.guard = Math.max(u.guard ?? 0, e.until ?? v.round + 1);
      });
      break;
    case 'died':
      patchUnit(v, e.unit.id, (u) => {
        u.alive = false;
        u.hp = 0;
        u.intent = null;
      });
      break;
    case 'landed': {
      const unit = e.unit;
      if (e.makes === 'mark') {
        if (unit) {
          patchUnit(v, unit.id, (u) => {
            if (!u.mark) {
              u.mark = 'plain';
              u.lineage = nextLineage(v);
            }
          });
        }
      } else if (e.makes === 'collar') {
        if (unit) {
          patchUnit(v, unit.id, (u) => {
            u.collar = true;
          });
        }
      } else {
        setState(v, [e.at], e.makes);
      }
      break;
    }
    case 'mixed': {
      const unit = e.unit;
      if (unit) {
        patchUnit(v, unit.id, (u) => {
          if (e.compound === 'deepMark') u.mark = 'deep';
          else if (e.compound === 'shackle') {
            clearMark(u);
            if (!u.born) u.collar = false;
            u.shackle = TUNING.compoundRounds;
          }
        });
      } else {
        setState(v, [e.at], e.compound);
      }
      break;
    }
    case 'washed': {
      // A wash on a unit is its own compound coming off: the event carries the unit's tile.
      const u = liveUnitAt(v, e.at);
      if (e.was === 'shackle') {
        if (u) u.shackle = 0;
      } else if (e.was === 'deepMark') {
        if (u && u.mark === 'deep') u.mark = 'plain';
      } else {
        setState(v, [e.at], e.now);
      }
      break;
    }
    case 'stateFades':
      // Graphite's undo removes a state outright; round-end fades only take what ran out.
      if (e.line?.startsWith('graphite:')) setState(v, e.tiles, null);
      else for (const c of e.tiles) fadeAt(v, c);
      break;
    case 'spreadState': {
      const from = tileOf(v, e.from);
      if (from?.state) {
        for (const c of e.to) {
          const t = tileOf(v, c);
          if (!t) continue;
          t.state = from.state;
          t.rounds = from.rounds;
          t.hits = from.hits;
        }
      }
      break;
    }
    case 'marked':
      patchUnit(v, e.unit.id, (u) => {
        const had = u.mark !== null;
        u.mark = e.deep ? 'deep' : 'plain';
        if (!had) u.lineage = nextLineage(v);
        if (e.bound !== null && u.bound !== e.bound) {
          // Bind's carrier lands the mark first, then the whole lineage holds the action (D5).
          const lineage = u.lineage;
          for (const other of v.units) {
            if (other.mark && other.lineage === lineage && other.bound === null) {
              other.bound = e.bound;
            }
          }
          u.bound = e.bound;
        }
      });
      break;
    case 'collared':
      patchUnit(v, e.unit.id, (u) => {
        u.collar = true;
        u.born = false; // only a unit's start puts brass on it without a cast
      });
      break;
    case 'markSpread': {
      const src = v.units.find((x) => x.id === e.from.id);
      if (src?.mark) {
        const { mark, bound, lineage } = src;
        for (const r of e.to) {
          patchUnit(v, r.id, (u) => {
            u.mark = mark;
            u.bound = bound;
            u.lineage = lineage;
          });
        }
      }
      break;
    }
    case 'markSpent':
      patchUnit(v, e.unit.id, clearMark);
      break;
    case 'markLifted': {
      const from = v.units.find((x) => x.id === e.from.id);
      if (from?.mark) {
        const { mark, bound, lineage } = from;
        clearMark(from);
        patchUnit(v, e.to.id, (u) => {
          u.mark = mark;
          u.bound = bound;
          u.lineage = lineage;
        });
      }
      break;
    }
    case 'stunned':
      patchUnit(v, e.unit.id, (u) => {
        u.stunned = true;
      });
      break;
    case 'held':
      patchUnit(v, e.unit.id, (u) => {
        u.held = Math.max(u.held, e.rounds);
      });
      break;
    case 'crush':
      if (e.into === 'plate') wearPlateAt(v, e.at);
      break;
    case 'drawn': {
      const from = tileOf(v, e.from);
      const to = tileOf(v, e.to);
      if (!from || !to) break;
      if (e.what === 'jar') {
        to.jar = from.jar;
        from.jar = null;
      } else {
        to.state = from.state;
        to.rounds = from.rounds;
        to.hits = from.hits;
        from.state = null;
        from.rounds = 0;
        from.hits = 0;
      }
      break;
    }
    case 'erased': {
      const t = tileOf(v, e.at);
      const u = liveUnitAt(v, e.at);
      if (e.what === 'mark' || e.what === 'deep mark') {
        // Spent just before this event.
      } else if (e.what === 'collar') {
        if (u) u.collar = false;
      } else if (e.what === 'shackle') {
        if (u) u.shackle = 0;
      } else if (e.what === 'jar') {
        if (t) t.jar = null;
      } else {
        setState(v, [e.at], null);
      }
      break;
    }
    case 'jarSealed': {
      const t = tileOf(v, e.at);
      if (t) {
        t.jar = {
          owner: e.owner.id,
          event: e.event,
          peek: e.peek,
        };
      }
      break;
    }
    case 'jarOpened':
    case 'jarCrumbles': {
      const t = tileOf(v, e.at);
      if (t) t.jar = null;
      break;
    }
    case 'burst':
      burstEffects(v, e);
      break;
    case 'gateBurns': {
      const t = tileOf(v, e.at);
      if (t) t.gate = false;
      break;
    }
    case 'vent':
      setState(v, [e.at], 'cloud');
      break;
    case 'snuff':
      for (const c of e.tiles) {
        if (tileOf(v, c)?.state === 'fire') setState(v, [c], null);
      }
      break;
    case 'summon':
      if (!v.units.some((u) => u.id === e.unit.id)) v.units.push(spawnedView(e.unit.id, e.at));
      patchUnit(v, e.by.id, (u) => {
        u.intent = null;
      });
      break;
    case 'flare':
      patchUnit(v, e.by.id, (u) => {
        u.intent = null;
      });
      break;
    case 'telegraph':
      patchUnit(v, e.unit.id, (u) => {
        u.intent = { ...e.intent };
      });
      break;
    case 'idle':
      patchUnit(v, e.unit.id, (u) => {
        u.intent = null;
        u.stunned = false;
      });
      break;
    case 'attack':
      patchUnit(v, e.unit.id, (u) => {
        u.intent = null;
      });
      break;
    case 'round':
      v.round = e.round;
      break;
    case 'won':
      v.phase = 'won';
      break;
    case 'lost':
      v.phase = 'lost';
      break;
    case 'phase':
      if (e.phase === 'player') {
        v.phase = 'player';
        beginPlayerPhase(v);
      }
      break;
    // Nothing to patch: the view catches up with the engine state at the end of the playback.
    case 'battleStart':
    case 'shove':
    case 'pull':
    case 'hop':
    case 'swapWith':
    case 'unharmed':
    case 'cast':
    case 'lands':
    case 'stopped':
    case 'miss':
    case 'foeBursts':
    case 'trace':
    case 'aimed':
    case 'dropped':
    case 'released':
    case 'conducted':
    case 'scheduled':
    case 'repeated':
    case 'triggered':
    case 'fizzles':
    case 'named':
      break;
    default: {
      const unhandled: never = e;
      void unhandled;
    }
  }
  return v;
}

/** `projectWith` without a final view: the shape `reduce` wants. */
export const project = (view: BoardView, e: GameEvent): BoardView => projectWith(view, e);
