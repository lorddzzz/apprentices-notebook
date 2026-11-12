import { expect, vi } from 'vitest';
import type { LineId } from '$data';
import { type BattleState, type GameEvent, witnessedIn } from '$engine';
import * as ctxModule from '$engine/ctx';

/**
 * The one registrar of the engine suites for the two guards that read them (BL-110): the lines
 * integrity test (L1) and the projection drift guard. Vitest isolates test files, so a guard
 * imports the suites into itself; importing this module does it once, with one spy on `runDraft`
 * (which every engine action goes through) feeding one record, `runs`. The lines guard reads the
 * fired lines off it, the projection guard replays it. New scenario files are picked up by the glob.
 *
 * push.test and actions.test mock '$engine/hooks', and pieces.test and trip-shape-state.test mock
 * the kit, each for a whole module graph: they stay out of the shared run (the lines guard runs
 * the first two in a child vitest, see lines-registry.ts).
 */
export interface Run {
  test: string;
  /** The test file's path, so a guard can skip a suite whose logs it cannot judge. */
  file: string;
  prev: BattleState;
  next: BattleState;
  events: GameEvent[];
}

export const runs: Run[] = [];

const real = ctxModule.runDraft;
vi.spyOn(ctxModule, 'runDraft').mockImplementation((...args) => {
  const r = real(...args);
  const state = expect.getState();
  runs.push({
    test: state.currentTestName ?? '?',
    file: state.testPath ?? '?',
    prev: args[0],
    next: r.state,
    events: r.events,
  });
  return r;
});

/** The lines the shared run's logs fired. */
export function linesOfRuns(): Set<LineId> {
  const fired = new Set<LineId>();
  for (const run of runs) for (const id of witnessedIn(run.events)) fired.add(id);
  return fired;
}

import.meta.glob(
  [
    '../scenarios/*.test.ts',
    '../engine/*.test.ts',
    '!../scenarios/push.test.ts',
    '!../scenarios/actions.test.ts',
    '!../engine/pieces.test.ts', // mocks the kit with fixture pieces
    '!../engine/trip-shape-state.test.ts', // mocks the kit with a fixture trip shape
  ],
  { eager: true },
);
