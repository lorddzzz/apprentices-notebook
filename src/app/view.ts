import { ENEMIES, type EnemyId, MEMBERS, type MemberId, TUNING } from '$data';
import type {
  BattlePhase,
  BattleState,
  BoardSpec,
  Coord,
  GameEvent,
  Intent,
  UnitId,
} from '$engine';

/** What the board draws. Events are projected onto it during playback; the engine state replaces it at the end. */
export interface TileView {
  oil: boolean;
  ink: boolean;
  steam: number;
  fire: number;
  plate: boolean;
  vent: boolean;
}

export interface UnitView {
  id: UnitId;
  kind: 'member' | 'enemy';
  def: MemberId | EnemyId;
  name: string;
  pos: Coord;
  hp: number;
  maxHp: number;
  shield: number;
  inked: boolean;
  brass: boolean;
  oilSoaked: boolean;
  branded: boolean;
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

export function viewOf(s: BattleState): BoardView {
  return {
    width: s.width,
    height: s.height,
    tiles: s.tiles.map(({ oil, ink, steam, fire, plate, vent }) => ({
      oil,
      ink,
      steam,
      fire,
      plate,
      vent,
    })),
    units: s.units.map((u) => ({
      id: u.id,
      kind: u.kind,
      def: u.def,
      name: u.name,
      pos: { ...u.pos },
      hp: u.hp,
      maxHp: u.maxHp,
      shield: u.shield,
      inked: u.inked,
      brass: u.brass,
      oilSoaked: u.oilSoaked,
      branded: u.branded,
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
        shield: 0,
        inked: b.inked,
        brass: b.brass,
        oilSoaked: false,
        branded: b.branded,
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
      shield: 0,
      inked: b.inked,
      brass: def.brass || b.brass,
      oilSoaked: def.oilSoaked,
      branded: b.branded,
      alive: true,
      intent: null,
    };
  });
  return {
    width: spec.width,
    height: spec.height,
    tiles: spec.tiles.map((t) => ({ ...t })),
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
    if (c.x < 0 || c.y < 0 || c.x >= v.width || c.y >= v.height) continue;
    const t = v.tiles[c.y * v.width + c.x];
    if (t) Object.assign(t, patch);
  }
}

function patchUnit(v: BoardView, id: UnitId, patch: (u: UnitView) => void): void {
  const u = v.units.find((x) => x.id === id);
  if (u) patch(u);
}

/**
 * Applies one event to a copy of the view. Patches only what the event states explicitly;
 * silent counters (steam 2→1) catch up when the view snaps to the engine state at the end.
 */
export function project(view: BoardView, e: GameEvent): BoardView {
  const v = cloneView(view);
  switch (e.type) {
    case 'moved':
    case 'moveUndone':
    case 'pushed':
    case 'slide':
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
        u.shield += e.amount;
      });
      break;
    case 'died':
      patchUnit(v, e.unit.id, (u) => {
        u.alive = false;
        u.intent = null;
      });
      break;
    case 'inked': {
      const u = v.units.find((x) => x.id === e.unit.id);
      if (u) {
        u.inked = true;
        if (e.via === 'puddle') patchTiles(v, [u.pos], { ink: false });
      }
      break;
    }
    case 'branded':
      patchUnit(v, e.unit.id, (u) => {
        u.branded = true;
      });
      break;
    case 'detonate':
      patchUnit(v, e.unit.id, (u) => {
        u.inked = false;
      });
      break;
    case 'coated':
      patchUnit(v, e.unit.id, (u) => {
        u.brass = true;
      });
      break;
    case 'puddle':
      patchTiles(v, e.tiles, { ink: true });
      break;
    case 'oiled':
      patchTiles(v, e.tiles, { oil: true });
      break;
    case 'steam':
      patchTiles(v, e.tiles, { steam: TUNING.steamRounds });
      break;
    case 'plates':
      patchTiles(v, e.tiles, { plate: true, oil: false, ink: false, steam: 0, fire: 0 });
      break;
    case 'ignite':
      patchTiles(v, e.tiles, { oil: true, fire: TUNING.fireRounds });
      break;
    case 'extinguish':
      patchTiles(v, e.tiles, { fire: 0 });
      break;
    case 'fireOut':
      patchTiles(v, e.tiles, { fire: 0, oil: false });
      break;
    case 'steamFades':
      patchTiles(v, e.tiles, { steam: 0 });
      break;
    case 'plateCrumbles':
      patchTiles(v, e.tiles, { plate: false });
      break;
    case 'vent':
      patchTiles(v, [e.at], { steam: TUNING.steamRounds });
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
    default:
      break;
  }
  return v;
}
