import { CHIEF_TUNING } from '$data/districts/bridges/enemies';
import { type Ctx, emit, ref } from '../../ctx';
import { kill } from '../../damage';
import { makeEnemy } from '../../foes';
import { byReadingOrder, type Coord, DIRS, type Dir, step } from '../../grid';
import { push } from '../../push';
import {
  coordOf,
  enemies,
  findUnit,
  inBoard,
  isAlive,
  isOpen,
  members,
  tileAt,
  unitAt,
} from '../../queries';
import { noteJarFate } from '../../rivals/jarFate';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit } from '../../types';
import type { FoeBehaviour, KitId, ScriptStep } from '../types';
import { whenCollapseDone } from './collapse';
import { chalkAim, WARDEN_FOE } from './foes';
import { crackedSet } from './preview';
import { type CollapseEvent, KEYSTONE_PIECE, SPAN_PIECE } from './types';

/**
 * The heart (bridges-plan P7, P16; BR-11, BR-20): the Chief Warden on the great arch's keystone.
 * He is a rival now (`data/rivals/chiefWarden.ts`; right of way is his trick, `keystoneRight.ts`).
 * The scripted steps below (`chalk`, `mind the edge`, `call the staff`) are the old stand-in's
 * script, kept registered for the Lab and no longer reached by a battle. Felling him ends the room
 * (the staff folds with their chief) and the remaining span falls as an epilogue.
 */

export const CHIEF_BEHAVIOUR: KitId = 'bridges:chiefWarden';
export const CHALK_STEP: KitId = 'bridges:chalk';
export const EDGE_STEP: KitId = 'bridges:mindTheEdge';
export const STAFF_STEP: KitId = 'bridges:callStaff';
export const CHIEF_SCRIPT: readonly KitId[] = [CHALK_STEP, EDGE_STEP, STAFF_STEP];

const STAFF: readonly EnemyUnit['def'][] = ['warden', 'gargoyle', 'mason'];
const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const sameTile = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;
const tileText = (c: Coord | undefined): string => (c ? `${c.x},${c.y}` : '?');

// ── Chalk the line ──────────────────────────────────────

export const CHALK: ScriptStep = {
  id: CHALK_STEP,
  plan(s, e) {
    const aim = chalkAim(s, e.pos);
    if (!aim) return null;
    return { label: 'chalk', tiles: [{ ...aim.victim.pos }], units: [aim.victim.id] };
  },
  act: (ctx, e, tg) => WARDEN_FOE.resolve(ctx, e, tg),
  describe: (tg) => `chalk the line on ${tileText(tg.tiles[0])}`,
};

// ── Mind the edge ───────────────────────────────────────

/** The way to the first fog tile beside `c` (drop terrain; up, right, down, left), or null. */
export function fogDir(s: BattleState, c: Coord): Dir | null {
  return (
    DIRS.find((d) => {
      const n = step(c, d);
      return inBoard(s, n) && tileAt(s, n).terrain.drop;
    }) ?? null
  );
}

export const MIND_THE_EDGE: ScriptStep = {
  id: EDGE_STEP,
  plan(s) {
    const victims = members(s)
      .filter((m) => isAlive(m) && !m.out && fogDir(s, m.pos))
      .sort((a, b) => byReadingOrder(a.pos, b.pos));
    if (!victims.length) return null;
    return {
      label: 'mind the edge',
      tiles: victims.map((m) => ({ ...m.pos })),
      units: victims.map((m) => m.id),
    };
  },
  /** Each named apprentice still on their tile and still beside fog is shoved one tile into it. */
  act(ctx, _e, tg) {
    tg.units.forEach((id, i) => {
      const unit = findUnit(ctx.s, id);
      const at = tg.tiles[i];
      if (!unit || !isAlive(unit) || unit.out || !at || !sameTile(unit.pos, at)) return;
      const dir = fogDir(ctx.s, unit.pos);
      if (dir) push(ctx, unit, dir, 1, null);
    });
  },
  describe: (tg) => `mind the edge (${tg.units.length} shoved toward the fog)`,
};

// ── Call the staff ──────────────────────────────────────

const livingStaff = (s: BattleState): number =>
  enemies(s).filter((u) => isAlive(u) && STAFF.includes(u.def)).length;

/** Gargoyle on odd multiples of the script's length, Mason on even ones: deterministic by round. */
export const staffFor = (round: number): 'gargoyle' | 'mason' =>
  Math.floor(round / CHIEF_SCRIPT.length) % 2 === 1 ? 'gargoyle' : 'mason';

/** The standing span tile nearest the chief that is empty and not about to fall (reading order breaks ties). */
function arrivalTile(s: BattleState, e: EnemyUnit): Coord | null {
  const cracked = new Set(crackedSet(s).map((c) => `${c.x},${c.y}`));
  let best: Coord | null = null;
  s.tiles.forEach((t, i) => {
    const at = coordOf(s, i);
    if (t.piece?.id !== SPAN_PIECE || t.terrain.drop || cracked.has(`${at.x},${at.y}`)) return;
    if (!isOpen(s, at) || unitAt(s, at)) return;
    const d = manhattan(at, e.pos);
    const bd = best ? manhattan(best, e.pos) : Number.POSITIVE_INFINITY;
    if (d < bd || (d === bd && best && byReadingOrder(at, best) < 0)) best = at;
  });
  return best;
}

export const CALL_STAFF: ScriptStep = {
  id: STAFF_STEP,
  plan(s, e) {
    if (livingStaff(s) >= CHIEF_TUNING.staffCap) return null;
    const at = arrivalTile(s, e);
    if (!at) return null;
    return { label: `call a ${staffFor(s.round)}`, tiles: [at], units: [] };
  },
  act(ctx, e, tg: Telegraph) {
    const at = tg.tiles[0];
    if (!at || !isOpen(ctx.s, at) || livingStaff(ctx.s) >= CHIEF_TUNING.staffCap) {
      emit(ctx, { type: 'miss', source: 'Call the staff' });
      return;
    }
    const foe = makeEnemy(ctx.s, staffFor(ctx.s.round), at);
    ctx.s.units.push(foe);
    emit(ctx, { type: 'summon', by: ref(e), unit: ref(foe), at: { ...at } });
  },
  describe: (tg) => tg.label,
};

export const HEART_STEPS: readonly ScriptStep[] = [CHALK, MIND_THE_EDGE, CALL_STAFF];

// ── The fall of the chief and the epilogue (P7) ─────────

/**
 * The room is over when he is: the staff folds with their chief, then every span tile and the
 * keystone (if it still stands) drops as an epilogue collapse. Nobody is out of the room (this
 * happens as the battle is won) and the piers stay. Fires once, from his death.
 */
export function epilogueFall(ctx: Ctx, chief: EnemyUnit): void {
  for (const u of enemies(ctx.s)) {
    if (u.id === chief.id || !isAlive(u)) continue;
    u.hp = 0;
    kill(ctx, u, false, 'Chief Warden');
  }
  const tiles: Coord[] = [];
  ctx.s.tiles.forEach((t, i) => {
    if (t.piece?.id === SPAN_PIECE || t.piece?.id === KEYSTONE_PIECE) tiles.push(coordOf(ctx.s, i));
  });
  if (!tiles.length) return;
  const ev: CollapseEvent = {
    type: 'bridges:collapse',
    data: { tiles: tiles.map((c) => ({ x: c.x, y: c.y })), units: [], epilogue: true },
  };
  emit(ctx, ev);
  for (const at of tiles) {
    const t = tileAt(ctx.s, at);
    if (t.jar) noteJarFate(ctx, t.jar, 'crumbled');
    if (t.jar) emit(ctx, { type: 'jarCrumbles', at: { ...at }, ...(t.jar.id === undefined ? {} : { id: t.jar.id }) });
    t.piece = null;
    t.state = null;
    t.jar = null;
    t.hot = 0;
    delete t.brassHot;
    t.terrain = { ...t.terrain, drop: true };
  }
}

/** Never planned (the script wins); it exists for the death hook. */
export const CHIEF_FOE: FoeBehaviour = {
  id: CHIEF_BEHAVIOUR,
  plan: () => null,
  resolve: () => {},
  onDeath: (ctx, e) => whenCollapseDone(ctx, e, () => epilogueFall(ctx, e)),
};
