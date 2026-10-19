import {
  type CompoundId,
  ENEMIES,
  type EnemyId,
  MEMBERS,
  type MemberId,
  type StateId,
  TUNING,
} from '$data';
import type {
  BattlePhase,
  BattleState,
  BoardSpec,
  Coord,
  Dir,
  GameEvent,
  Intent,
  Tile,
  Unit,
  UnitId,
} from '$engine';

/** A state or compound a tile can hold. */
export type LayerId = StateId | CompoundId;

/** What the board draws. Events are projected onto it during playback; the engine state replaces it at the end. */
export interface TileView {
  /** The one state or compound on the tile (design §4); `rounds` is how long it has left (0 = permanent). */
  state: LayerId | null;
  rounds: number;
  jar: boolean;
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
  /** Ink on the unit (a mark, `!`), deep when it takes two Sparks to clear. */
  mark: MarkView;
  /** Brass on the unit (a collar, `&`). */
  collar: boolean;
  shackle: boolean;
  held: boolean;
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
    rounds: t.state?.rounds ?? 0,
    jar: t.jar !== null,
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
      mark: markOf(u),
      collar: u.collar !== false,
      shackle: u.shackle > 0,
      held: u.held > 0,
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
        mark: b.mark,
        collar: b.collar,
        shackle: b.shackle,
        held: false,
        stunned: false,
        alive: true,
        intent: null,
      };
    }
    const def = ENEMIES[b.def as EnemyId];
    const n = (counts.get(def.id) ?? 0) + 1;
    counts.set(def.id, n);
    return {
      id: `${def.id}-${n}`,
      kind: 'enemy',
      def: def.id,
      name: def.name,
      pos: { ...b.at },
      hp: def.hp,
      maxHp: def.hp,
      shield: b.shield,
      mark: b.mark,
      collar: def.brass || b.collar,
      shackle: b.shackle,
      held: false,
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
    tiles: v.tiles.map((t) => ({ ...t })),
    units: v.units.map((u) => ({ ...u, pos: { ...u.pos }, intent: u.intent && { ...u.intent } })),
  };
}

function patchTiles(v: BoardView, cells: readonly Coord[], patch: Partial<TileView>): void {
  for (const c of cells) {
    const t = tileOf(v, c);
    if (t) Object.assign(t, patch);
  }
}

function tileOf(v: BoardView, c: Coord): TileView | undefined {
  if (c.x < 0 || c.y < 0 || c.x >= v.width || c.y >= v.height) return undefined;
  return v.tiles[c.y * v.width + c.x];
}

/** How long a state put down lasts (P17); 0 = until changed. */
function roundsFor(id: LayerId): number {
  switch (id) {
    case 'blot':
    case 'slick':
      return 0;
    case 'cloud':
      return TUNING.cloudRounds;
    case 'plate':
      return TUNING.plateRounds;
    case 'fire':
      return TUNING.fireRounds;
    default:
      return TUNING.compoundRounds;
  }
}

/** Puts a state on tiles with the rounds a fresh one lasts, or clears them. */
function setState(v: BoardView, cells: readonly Coord[], id: LayerId | null): void {
  patchTiles(v, cells, { state: id, rounds: id ? roundsFor(id) : 0 });
}

function patchUnit(v: BoardView, id: UnitId, patch: (u: UnitView) => void): void {
  const u = v.units.find((x) => x.id === id);
  if (u) patch(u);
}

/** Lifts what floats on each source tile and sets it down downstream (the engine's merge rules). */
function driftTiles(v: BoardView, floats: readonly { from: Coord; to: Coord | null }[]): void {
  const lifted = floats.map((f) => {
    const t = tileOf(v, f.from);
    if (!t) return null;
    const cargo = { state: t.state, rounds: t.rounds };
    t.state = null;
    t.rounds = 0;
    return cargo;
  });
  floats.forEach((f, i) => {
    const cargo = lifted[i];
    const dest = f.to && tileOf(v, f.to);
    if (!cargo?.state || !dest) return;
    if (dest.state === null || (cargo.state === 'fire' && dest.state === 'slick')) {
      dest.state = cargo.state;
      dest.rounds = cargo.rounds;
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
    mark: null,
    collar: def.brass,
    shackle: false,
    held: false,
    stunned: false,
    alive: true,
    intent: null,
  };
}

/**
 * Applies one event to a copy of the view. Patches only what the event states explicitly;
 * silent counters (a cloud's rounds) catch up when the view snaps to the engine state at the end.
 * Every event in the union is named here, so a new one fails to compile until it is considered.
 */
export function project(view: BoardView, e: GameEvent): BoardView {
  const v = cloneView(view);
  switch (e.type) {
    case 'moved':
    case 'moveUndone':
      patchUnit(v, e.unit.id, (u) => {
        u.pos = { ...e.to };
      });
      break;
    case 'push':
      patchUnit(v, e.unit.id, (u) => {
        const last = e.path[e.path.length - 1];
        if (last) u.pos = { ...last };
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
        u.shield += e.amount;
      });
      break;
    case 'died':
      patchUnit(v, e.unit.id, (u) => {
        u.alive = false;
        u.intent = null;
      });
      break;
    case 'landed': {
      const unit = e.unit;
      if (e.makes === 'mark') {
        if (unit) {
          patchUnit(v, unit.id, (u) => {
            u.mark = u.mark ?? 'plain';
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
            u.mark = null;
            u.collar = false;
            u.shackle = true;
          }
        });
      } else {
        setState(v, [e.at], e.compound);
      }
      break;
    }
    case 'washed':
      setState(v, [e.at], e.now);
      break;
    case 'stateFades':
      setState(v, e.tiles, null);
      break;
    case 'spreadState': {
      const id = tileOf(v, e.from)?.state ?? null;
      if (id) setState(v, e.to, id);
      break;
    }
    case 'marked':
      patchUnit(v, e.unit.id, (u) => {
        u.mark = e.deep ? 'deep' : 'plain';
      });
      break;
    case 'collared':
      patchUnit(v, e.unit.id, (u) => {
        u.collar = true;
      });
      break;
    case 'markSpread':
      for (const r of e.to) {
        patchUnit(v, r.id, (u) => {
          u.mark = u.mark ?? 'plain';
        });
      }
      break;
    case 'markSpent':
      patchUnit(v, e.unit.id, (u) => {
        u.mark = null;
      });
      break;
    case 'markLifted': {
      const mark = v.units.find((x) => x.id === e.from.id)?.mark ?? 'plain';
      patchUnit(v, e.from.id, (u) => {
        u.mark = null;
      });
      patchUnit(v, e.to.id, (u) => {
        u.mark = mark;
      });
      break;
    }
    case 'stunned':
      patchUnit(v, e.unit.id, (u) => {
        u.stunned = true;
      });
      break;
    case 'held':
      patchUnit(v, e.unit.id, (u) => {
        u.held = true;
      });
      break;
    case 'swapped': {
      const a = v.units.find((x) => x.id === e.a.id);
      const b = v.units.find((x) => x.id === e.b.id);
      if (a && b) [a.pos, b.pos] = [b.pos, a.pos];
      break;
    }
    case 'jarSealed':
      patchTiles(v, [e.at], { jar: true });
      break;
    case 'jarOpened':
    case 'jarCrumbles':
      patchTiles(v, [e.at], { jar: false });
      break;
    case 'drift':
      driftTiles(v, e.floats);
      for (const m of e.units) {
        patchUnit(v, m.unit.id, (u) => {
          u.pos = { ...m.to };
        });
      }
      break;
    case 'gateBurns':
      patchTiles(v, [e.at], { gate: false });
      break;
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
      if (e.phase === 'player') v.phase = 'player';
      break;
    // Nothing to patch: the view catches up with the engine state at the end of the playback.
    case 'battleStart':
    case 'shove':
    case 'cast':
    case 'lands':
    case 'stopped':
    case 'miss':
    case 'foeBursts':
    case 'trace':
    case 'aimed':
    case 'burst':
    case 'crush':
    case 'dropped':
    case 'drawn':
    case 'erased':
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
