import {
  type BattleState,
  blocksUnits,
  type Coord,
  DIRS,
  type EnemyUnit,
  inBoard,
  isAlive,
  members,
  step,
  tileAt,
  unitAt,
} from '$engine';
import { dealDamage } from '$engine/damage';
import { makeTrickObject, removeTrickObject } from '$engine/rivals/tricks';
import type { GoalDef, TrickDef } from '$engine/rivals/types';
import { type Fixture, fixtureDef } from './harness';
import { coordOf, json, num } from './json';

/**
 * The clock contract (ink quarter's postmaster, district-ink-makers §heart): an **action trick**
 * that serves a writ, a **trick-owned object** on a stamp tile, and a **round-end** step through
 * DK's slots. Stand an apprentice on the stamp by its due round and the writ is met; otherwise it
 * collects from everyone. A district **goal** (`registerGoal`) decides when to serve.
 */

export const CLOCK_ID = 'inkQuarter:fixtureClock';
const SERVE = 'inkQuarter:fixtureServe';
/** Rounds the party has to answer, counting the one it is served in. */
export const CLOCK_ROUNDS = 2;
export const CLOCK_DAMAGE = 1;

const writsOf = (u: EnemyUnit) => u.rival?.objects.filter((o) => o.trick === CLOCK_ID) ?? [];

/** The stamp: his first free neighbour in `DIRS` order. */
function stampFor(u: EnemyUnit, s: BattleState): Coord | null {
  for (const d of DIRS) {
    const c = step(u.pos, d);
    if (inBoard(s, c) && !blocksUnits(tileAt(s, c)) && !unitAt(s, c)) return c;
  }
  return null;
}

export const CLOCK_TRICK: TrickDef<null> = {
  id: CLOCK_ID,
  name: 'the clock writ',
  init: () => null,
  action: {
    // One writ at a time: while one is out, there is nothing to serve.
    plan(state, unit) {
      if (writsOf(unit).length) return [];
      const at = stampFor(unit, state);
      return at ? [{ lock: null, data: json(at) }] : [];
    },
    resolve(ctx, unit, intent, own) {
      const at = coordOf(intent.data);
      if (at) makeTrickObject(ctx, unit, at, { due: ctx.s.round + CLOCK_ROUNDS - 1 });
      return own;
    },
  },
  roundEnd: {
    slot: 'late',
    step(ctx, unit, own) {
      for (const w of writsOf(unit)) {
        const on = w.at ? unitAt(ctx.s, w.at) : null;
        if (on?.kind === 'member' && isAlive(on)) {
          removeTrickObject(ctx, w.id, 'opened'); // met: an apprentice stands on the stamp
        } else if (ctx.s.round >= num(w.data, 'due')) {
          removeTrickObject(ctx, w.id, 'gone');
          for (const m of members(ctx.s).filter(isAlive))
            dealDamage(ctx, m, CLOCK_DAMAGE, 'the clock writ');
        }
      }
      return own;
    },
  },
  draw(_state, _unit, shown) {
    const at = 'lock' in shown ? coordOf(shown.data) : null;
    return { label: 'clock writ', tiles: at ? [at] : [], units: [], countdown: CLOCK_ROUNDS };
  },
  describe: () => 'serves a writ: stand an apprentice on the stamp before it falls due',
};

/** Serve when the trick would put a writ down (an object made). */
export const SERVE_GOAL: GoalDef = {
  id: SERVE,
  accepts: (o) => o.made.some((r) => r.kind === 'trick'),
  score: () => 0,
};

export const CLOCK: Fixture = {
  def: fixtureDef('fixtureClock', {
    trick: CLOCK_ID,
    routine: [{ goal: SERVE, action: { kind: 'trick' } }],
  }),
  trick: CLOCK_TRICK,
  goals: [SERVE_GOAL],
};
