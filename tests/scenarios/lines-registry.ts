import { appendFileSync } from 'node:fs';
import { afterAll, vi } from 'vitest';
import type { LineId } from '$data';
import { type GameEvent, witnessedIn } from '$engine';
import * as ctxModule from '$engine/ctx';

/**
 * Which fine-print lines the test suite has fired (L1). Vitest isolates test files, so one file's
 * registry only sees its own tests. `tests/data/lines.test.ts` therefore imports the scenario and
 * engine test files into itself after calling `trackFiredLines()`. Two files (`push`, `actions`)
 * mock `$engine/hooks` and cannot share a module graph, so the integrity test runs them in a child
 * vitest with `LINES_OUT` set: the harness (which they import) then appends their fired lines to
 * that file in an `afterAll`.
 *
 * Every engine action goes through `runDraft`, so spying on it sees every log, whichever helper
 * (harness, chemHarness or a bare `applyAction`) a test used. The harness helpers also call
 * `recordLog` directly.
 */
export const firedLines = new Set<LineId>();

export function recordLog(log: readonly GameEvent[]): void {
  for (const id of witnessedIn(log)) firedLines.add(id);
}

let tracking = false;

/** Starts feeding `firedLines` from every `runDraft` in this test file (idempotent). */
export function trackFiredLines(): void {
  if (tracking) return;
  tracking = true;
  const real = ctxModule.runDraft;
  vi.spyOn(ctxModule, 'runDraft').mockImplementation((...args) => {
    const r = real(...args);
    recordLog(r.events);
    return r;
  });
}

/** In a child run (`LINES_OUT` set): tracks this file's lines and appends them when it finishes. */
export function feedLinesOut(): void {
  const out = process.env.LINES_OUT;
  if (!out) return;
  trackFiredLines();
  afterAll(() => appendFileSync(out, `${JSON.stringify([...firedLines])}\n`));
}
