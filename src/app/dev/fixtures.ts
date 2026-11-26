import { DISTRICTS, type DistrictId } from '$data';
import {
  type Action,
  memberById,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  type SaveData,
} from '$engine';
import type { WipeSummary } from '../flow';
import type { GameStore } from '../game.svelte';
import type { Route } from '../routes';
import type { ThresholdStore } from '../threshold.svelte';

/**
 * UF-4 / C8: dev-only state fixtures, opened at `#/fixture?name=<id>[&step=n][&grey=1]`. Each
 * builds its save from engine calls (never from recorded JSON or `tests/`), so a save-version bump
 * cannot rot it. The loader (`loader.ts`) puts the save in a memory backend, runs `setup` for
 * state a save cannot hold, enters `route` and waits for `expect` before tapping `taps`.
 */

export type FixtureId = 'threshold-canals-burnt' | 'study-fresh';

/** What a setup recipe may reach besides the game: the app's transient stores and the URL's step. */
export interface FixtureContext {
  threshold: ThresholdStore;
  /** `&step=n`, or null. Recipes that freeze a replay at a step read it (FT-3's `freezeAt`). */
  step: number | null;
}

export interface Fixture {
  id: FixtureId;
  route: Route;
  params?: Record<string, string>;
  /** The save the memory backend starts from. */
  save: () => SaveData;
  /** Transient state a save cannot hold (`game.found`, `threshold.solved`, a replay). Throws when it cannot be reached. */
  setup?: (game: GameStore, ctx: FixtureContext) => void;
  /** A pending wipe for the Wiped screen (`game.wipe`). */
  wipe?: () => WipeSummary;
  /** The testid that proves the requested state mounted; taps wait for it. */
  expect: string;
  /** Testids clicked in order once `expect` has mounted. */
  taps?: string[];
  note: string;
}

// ── The canal lock (the repo's lock-solve recording, tests/fixtures/district-kit) ──

const SPARK_S = ['x Boltv x', '. Spark .', '. .     .', '. .     .', '. .     .', 'x .     x'].join(
  '\n',
);
const SHOVE_D = ['.     .   .     . .', 'Bolt> Oil Shove . .', 'x     .   .     . x'].join('\n');

/** The notebook the lock is solved with: the canals heard but barred; Pell carries Bolt, Oil, Shove. */
export function lockProfile(): Profile {
  const p = newProfile();
  const heard: DistrictId[] = ['seam', 'canals'];
  return {
    ...p,
    lattices: {
      ...p.lattices,
      draughtsman: [...parseLattice(SHOVE_D).runes],
      stoker: [...parseLattice(SPARK_S).runes],
    },
    city: { ...p.city, heard, open: ['seam'], fresh: [] },
  };
}

/** The recorded solve: one cast of Pell's first spell, aimed right (the rat is shoved into the water). */
export function lockSolveAction(state: Parameters<typeof memberById>[0]): Action {
  const spell = memberById(state, 'draughtsman').spells[0];
  if (!spell) throw new Error('Pell has no spell for the lock');
  return {
    type: 'cast',
    unit: 'draughtsman',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'right' },
  };
}

const FIXTURE_SEED = 1;

export const FIXTURES: Record<FixtureId, Fixture> = {
  'threshold-canals-burnt': {
    id: 'threshold-canals-burnt',
    route: 'threshold',
    params: { d: 'canals' },
    save: () => ({ ...newSave(FIXTURE_SEED), profile: lockProfile() }),
    setup: (_game, { threshold }) => {
      const gate = DISTRICTS.canals.gate;
      if (gate.kind !== 'threshold') throw new Error('The canals have no threshold');
      const plan = threshold.load('canals');
      const session = threshold.session;
      if (!plan.ok || session === null) throw new Error(plan.ok ? 'No lock session' : plan.why);
      void session.dispatch(lockSolveAction(session.state));
      session.skip();
      if (!threshold.won) throw new Error('The lock-solve replay did not win the lock');
      threshold.finish();
    },
    expect: 'threshold-solved',
    note: 'The canal lock just solved by replaying the recorded Bolt, Oil, Shove cast: the gate burns (transient threshold.solved).',
  },
  'study-fresh': {
    id: 'study-fresh',
    route: 'study',
    save: () => newSave(FIXTURE_SEED),
    expect: 'study',
    note: 'A brand-new notebook in the Study.',
  },
};

export function fixtureIds(): FixtureId[] {
  return Object.keys(FIXTURES) as FixtureId[];
}

export function isFixtureId(name: string | null): name is FixtureId {
  return name !== null && Object.hasOwn(FIXTURES, name);
}
