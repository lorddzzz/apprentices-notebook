import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { LINES } from '$data';
import { firedLines, trackFiredLines } from '../scenarios/lines-registry';

// Re-register the suites that fire lines inside this file (vitest isolates files), after the spy.
// push.test and actions.test mock '$engine/hooks' for their whole module graph, so they run in a
// child vitest instead (see lines-registry.ts).
const MOCKED = ['push', 'actions'];
trackFiredLines();
import.meta.glob(
  [
    '../scenarios/*.test.ts',
    '../engine/*.test.ts',
    '!../scenarios/push.test.ts',
    '!../scenarios/actions.test.ts',
  ],
  { eager: true },
);

function firedInChildRun(): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'lines-fired-'));
  const out = join(dir, 'fired.jsonl');
  try {
    const vitest = join(
      dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
      'vitest.mjs',
    );
    spawnSync(
      process.execPath,
      [vitest, 'run', ...MOCKED.map((f) => `tests/scenarios/${f}.test.ts`)],
      { env: { ...process.env, LINES_OUT: out }, stdio: 'ignore', timeout: 100_000 },
    );
    return readFileSync(out, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((l) => JSON.parse(l) as string[]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('lines integrity (L1)', () => {
  test('ids are unique and match subject:meets', () => {
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length);
    for (const l of LINES) expect(l.id, l.id).toBe(`${l.subject}:${l.meets}`);
  });

  test('pending rows have no text, written rows have a sentence', () => {
    for (const l of LINES) {
      if (l.pending) expect(l.text, l.id).toBe('');
      else expect(l.text.length, l.id).toBeGreaterThan(10);
    }
  });
});

// Registered after the imported suites, so it runs once they have fired their lines.
describe('lines fired by the suite (L1)', () => {
  const rows = new Set<string>(LINES.map((l) => l.id));
  let fired: Set<string>;

  test('every line the engine fired has a row', () => {
    fired = new Set([...firedLines, ...firedInChildRun()]);
    expect([...fired].filter((id) => !rows.has(id))).toEqual([]);
  }, 120_000);

  // Rows whose behaviour the engine doesn't stamp yet; delete the entry when it does.
  const NOT_YET_STAMPED: string[] = [];

  test('every written row is fired by at least one test', () => {
    const unfired = LINES.filter((l) => !l.pending && !fired.has(l.id)).map((l) => l.id);
    expect(unfired).toEqual(NOT_YET_STAMPED);
  });
});
