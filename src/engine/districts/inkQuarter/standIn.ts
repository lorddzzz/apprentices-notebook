import { POSTMASTER_TUNING } from '$data/districts/inkQuarter/enemies';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage } from '../../damage';
import { byReadingOrder, type Coord, DIRS, step } from '../../grid';
import { coordOf, isAlive, members, unitAt } from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { FoeBehaviour, KitId, ScriptStep, StepId } from '../types';
import {
  canPlaceSeal,
  canServe,
  canStamp,
  clockStaggered,
  serveClock,
  spendStagger,
  withdrawClock,
} from './clock';
import { canSeal, placeSeal, sealerFell } from './wax';

/**
 * The stand-in heart (ink-quarter plan P10; IQ-7): the postmaster as a scripted foe
 * (`EnemyDef.script`, `standIn: true`: clearing him gives no page). By round he cycles
 * serve the clock writ -> pen strike -> wax seal. He never walks. Answering his writ staggers
 * him: the action he had planned is skipped (`spendStagger`). He re-serves only when `canServe`.
 * His `behaviour` carries only the death hook, so a dead postmaster never leaves his seal open.
 */

export const POSTMASTER_BEHAVIOUR: KitId = 'inkQuarter:postmaster';
export const SERVE_STEP: StepId = 'inkQuarter:serve';
export const PEN_STEP: StepId = 'inkQuarter:pen';
export const WAX_STEP: StepId = 'inkQuarter:waxSeal';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const living = (us: readonly Unit[]): Unit[] => us.filter(isAlive);

/** The nearest apprentice to `from`, ties in reading order. */
function nearestMember(s: BattleState, from: Coord): Unit | null {
  let best: Unit | null = null;
  for (const m of living(members(s))) {
    const d = manhattan(from, m.pos);
    const bd = best ? manhattan(from, best.pos) : Infinity;
    if (d < bd || (d === bd && best && byReadingOrder(m.pos, best.pos) < 0)) best = m;
  }
  return best;
}

/** Every board tile in reading order. */
const allTiles = (s: BattleState): Coord[] =>
  Array.from({ length: s.width * s.height }, (_, i) => coordOf(s, i));

/** The legal tile nearest `to` for `fits` (not in `skip`), ties in reading order. */
function tileNear(
  s: BattleState,
  to: Coord,
  fits: (c: Coord) => boolean,
  skip: readonly Coord[] = [],
): Coord | null {
  let best: Coord | null = null;
  for (const c of allTiles(s)) {
    if (!fits(c) || skip.some((k) => k.x === c.x && k.y === c.y)) continue;
    if (!best || manhattan(to, c) < manhattan(to, best)) best = c;
  }
  return best;
}

/** The writ's tiles: stamp = a free tile beside the nearest apprentice, seal = the one nearest him. */
export function writTiles(s: BattleState, e: EnemyUnit): { seal: Coord; stamp: Coord } | null {
  const target = nearestMember(s, e.pos);
  const stamp = tileNear(s, target?.pos ?? e.pos, (c) => canStamp(s, c) && !unitAt(s, c));
  if (!stamp) return null;
  const seal = tileNear(s, e.pos, (c) => canPlaceSeal(s, c), [stamp]);
  return seal ? { seal, stamp } : null;
}

const STUNNED: Telegraph = { label: 'stunned', tiles: [], units: [] };

/** Wraps a step so a staggered postmaster shows "stunned" and spends the stagger in place of acting. */
function stepOf(
  id: StepId,
  describe: (tg: Telegraph) => string,
  plan: (s: BattleState, e: EnemyUnit) => Telegraph | null,
  act: (ctx: Ctx, e: EnemyUnit, tg: Telegraph) => void,
): ScriptStep {
  return {
    id,
    plan: (s, e) => (clockStaggered(s, e.id) ? STUNNED : plan(s, e)),
    act: (ctx, e, tg) => {
      if (spendStagger(ctx.s, e.id)) return;
      act(ctx, e, tg);
    },
    describe: (tg) => (tg.label === 'stunned' ? 'reel, his writ answered' : describe(tg)),
  };
}

export const SERVE_SCRIPT: ScriptStep = stepOf(
  SERVE_STEP,
  () => 'serve a clock writ',
  (s, e) => {
    if (!canServe(s, e.id)) return null;
    const t = writTiles(s, e);
    return t ? { label: 'serve', tiles: [t.seal, t.stamp], units: [], countdown: 3 } : null;
  },
  (ctx, e, tg) => {
    const [seal, stamp] = tg.tiles;
    if (!seal || !stamp || !serveClock(ctx, e.id, seal, stamp)) {
      emit(ctx, { type: 'miss', source: 'Writ' });
    }
  },
);

export const PEN_SCRIPT: ScriptStep = stepOf(
  PEN_STEP,
  (tg) => `strike with his pen at ${tg.tiles[0] ? `${tg.tiles[0].x},${tg.tiles[0].y}` : '?'}`,
  (s, e) => {
    const to = nearestMember(s, e.pos);
    return to ? { label: 'pen', tiles: [{ ...to.pos }], units: [to.id] } : null;
  },
  (ctx, e, tg) => {
    const at = tg.tiles[0];
    const victim = at ? unitAt(ctx.s, at) : null;
    if (!victim || victim.kind !== 'member' || !isAlive(victim)) {
      emit(ctx, { type: 'miss', source: 'Pen' });
      return;
    }
    const dir = DIRS.find(
      (d) => step(e.pos, d).x === victim.pos.x && step(e.pos, d).y === victim.pos.y,
    );
    dealDamage(ctx, victim, POSTMASTER_TUNING.pen, 'Pen', [], { heading: dir ?? null, at: e.pos });
  },
);

export const WAX_SCRIPT: ScriptStep = stepOf(
  WAX_STEP,
  () => 'seal a tile in wax',
  (s, e) => {
    const to = nearestMember(s, e.pos);
    return to ? { label: 'seal', tiles: [{ ...to.pos }], units: [] } : null;
  },
  (ctx, e, tg) => {
    const at = tg.tiles[0];
    if (!at || !canSeal(ctx.s, at)) {
      emit(ctx, { type: 'miss', source: 'Seal' });
      return;
    }
    placeSeal(ctx, at, e.id);
  },
);

/** Never planned (the script wins); it exists for the death hook. */
export const POSTMASTER_FOE: FoeBehaviour = {
  id: POSTMASTER_BEHAVIOUR,
  plan: () => null,
  resolve: () => {},
  onDeath(ctx, e) {
    withdrawClock(ctx, e.id);
    sealerFell(ctx, e.id);
  },
};

export const STAND_IN_STEPS: readonly ScriptStep[] = [SERVE_SCRIPT, PEN_SCRIPT, WAX_SCRIPT];

/** The heart's foes for IQ-10 to place: the postmaster (token `p`), a Sealer and two dead letters. */
export const HEART_ROSTER = ['postmaster', 'sealer', 'deadLetter', 'deadLetter'] as const;
