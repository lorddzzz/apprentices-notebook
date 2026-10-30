import { CODEX, type KindId } from '$data';
import { MARGINALIA_HANDS, MARGINALIA_TUNING } from '$data/districts/seam';
import { type Ctx, emit, ref } from '../ctx';
import { kill } from '../damage';
import { byReadingOrder, type Coord, label } from '../grid';
import { landKindFree } from '../mix';
import { enemies, inBoard, isAlive, members } from '../queries';
import type { BattleState, EnemyUnit, Profile, Unit } from '../types';
import type {
  DistrictEvent,
  DistrictEventDef,
  DistrictModule,
  FoeBehaviour,
  KitId,
  ScriptStep,
  StepId,
  Telegraph,
} from './types';

// ── The Marginalia's hands (SM P2, P3; SM-1) ──
/** A hand's step id: `seam:write:<kind>`. */
export type HandStepId = `seam:write:${KindId}`;
export const handStep = (kind: KindId): HandStepId => `seam:write:${kind}`;
/** The Marginalia's script, in cycle order (`EnemyScript.steps`, `standIn: false`). */
export const MARGINALIA_STEPS: readonly (HandStepId & StepId)[] = MARGINALIA_HANDS.map(handStep);
/** Its behaviour id: only the death hook (its familiars fall with it). */
export const MARGINALIA_BEHAVIOUR: KitId = 'seam:marginalia';

/** A hand landed: `data.kind` and the tiles it wrote on, in reading order. */
export const HAND_EVENT = 'seam:hand';
/** The Marginalia fell and its familiars with it: `data.count` familiars. */
export const FAMILIARS_FALL_EVENT = 'seam:familiarsFall';
export interface HandData {
  kind: KindId;
  tiles: Coord[];
}

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const KIND_NAME: Readonly<Record<KindId, string>> = {
  ink: 'Ink',
  oil: 'Oil',
  steam: 'Steam',
  brass: 'Brass',
  spark: 'Spark',
};

/** The living apprentice nearest `from`, ties in reading order. */
export function nearestApprentice(s: BattleState, from: Coord): Unit | null {
  let best: Unit | null = null;
  for (const m of members(s)) {
    if (!isAlive(m)) continue;
    if (!best) {
      best = m;
      continue;
    }
    const d = manhattan(from, m.pos) - manhattan(from, best.pos);
    if (d < 0 || (d === 0 && byReadingOrder(m.pos, best.pos) < 0)) best = m;
  }
  return best;
}

/**
 * The hands' pattern (P2), reusable by a later boss: `reach` tiles each side of `centre` in its row
 * (three tiles at reach 1), clipped to the board, in reading order.
 */
export function rowAround(
  s: BattleState,
  centre: Coord,
  reach: number = MARGINALIA_TUNING.reach,
): Coord[] {
  const out: Coord[] = [];
  for (let dx = -reach; dx <= reach; dx++) {
    const c = { x: centre.x + dx, y: centre.y };
    if (inBoard(s, c)) out.push(c);
  }
  return out;
}

/** "B2–D2" for a run of tiles in a row; one tile is its own label. */
export function tilesText(tiles: readonly Coord[]): string {
  const first = tiles[0];
  const last = tiles[tiles.length - 1];
  if (!first || !last) return 'nowhere';
  return first === last ? label(first) : `${label(first)}–${label(last)}`;
}

/** What a hand does, in a telegraph or a log line. */
const handVerb = (kind: KindId): string =>
  kind === 'spark' ? 'strike Spark' : `write ${KIND_NAME[kind]}`;

/**
 * One hand: in the enemy phase it telegraphs a row of three on the nearest apprentice; next round
 * it lands its kind on each tile exactly as a cast would (`landKindFree`: the normal mix and burst
 * paths, with no origin, so it never hears a district, P5). It harms whatever stands there, the
 * Marginalia included.
 */
export function handScript(kind: KindId): ScriptStep {
  return {
    id: handStep(kind),
    plan(s: BattleState, e: EnemyUnit): Telegraph | null {
      const target = nearestApprentice(s, e.pos);
      if (!target) return null;
      return { label: kind, tiles: rowAround(s, target.pos), units: [target.id] };
    },
    act(ctx: Ctx, e: EnemyUnit, tg: Telegraph): void {
      const tiles = tg.tiles.filter((c) => inBoard(ctx.s, c)).map((c) => ({ x: c.x, y: c.y }));
      const ev: DistrictEvent = { type: HAND_EVENT, unit: ref(e), data: { kind, tiles } };
      emit(ctx, ev);
      for (const at of tiles) landKindFree(ctx, kind, { kind: 'tile', at });
    },
    describe: (tg) => `${handVerb(kind)} on ${tilesText(tg.tiles)}`,
  };
}

export const HAND_STEPS: readonly ScriptStep[] = MARGINALIA_HANDS.map(handScript);

/** Never planned (the script wins); it exists for the death hook: its familiars fall with it (P3). */
export const MARGINALIA_FOE: FoeBehaviour = {
  id: MARGINALIA_BEHAVIOUR,
  plan: () => null,
  resolve: () => {},
  onDeath(ctx, e) {
    const pieces = enemies(ctx.s).filter((u) => u.def === 'familiar' && isAlive(u));
    if (pieces.length === 0) return;
    const ev: DistrictEvent = {
      type: FAMILIARS_FALL_EVENT,
      unit: ref(e),
      data: { count: pieces.length },
    };
    emit(ctx, ev);
    for (const f of pieces) {
      f.hp = 0;
      kill(ctx, f, true, 'Marginalia');
    }
  },
};

const handData = (e: DistrictEvent): HandData | null => {
  const d = e.data as Partial<HandData> | undefined;
  return d?.kind && Array.isArray(d.tiles) ? (d as HandData) : null;
};

export const SEAM_EVENTS: readonly DistrictEventDef[] = [
  {
    type: HAND_EVENT,
    describe: (e) => {
      const d = handData(e);
      if (!d) return 'the Marginalia writes';
      const verb = d.kind === 'spark' ? 'strikes Spark' : `writes ${KIND_NAME[d.kind]}`;
      return `the Marginalia ${verb} on ${tilesText(d.tiles)}`;
    },
  },
  {
    type: FAMILIARS_FALL_EVENT,
    describe: (e) => {
      const n = (e.data as { count?: number } | undefined)?.count ?? 0;
      return `the Marginalia's familiars fall with it (${n})`;
    },
  },
];

/** The Seam's module: no rules or pieces (P1); the Marginalia's hands and death hook (SM-1). */
export const SEAM_MODULE: DistrictModule = {
  id: 'seam',
  steps: HAND_STEPS,
  foes: [MARGINALIA_FOE],
  events: SEAM_EVENTS,
};

// ── The margins answer (SM P12; SM-12 builds the triggers) ──
/** The note a codex page shows: the first, or the owner's answer once it has come. */
export interface NoteView {
  text: string;
  answered: boolean;
}
/**
 * The note to show on a codex page. Nothing answers before the Marginalia falls; then a page's
 * `answer` shows once its `when` holds. Until SM-12, always the first note.
 */
export function noteFor(_p: Profile, entryId: string): NoteView {
  const entry = CODEX.find((e) => e.id === entryId);
  if (!entry) throw new Error(`noteFor: unknown codex entry '${entryId}'`);
  return { text: entry.ownerNote, answered: false };
}
