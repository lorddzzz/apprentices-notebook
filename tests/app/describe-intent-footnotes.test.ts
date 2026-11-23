import { afterEach, expect, test, vi } from 'vitest';
import { type EnemyUnit, scenarioBattle } from '$engine';
import { withFootnotes } from '../scenarios/footnoteHarness';

/** `intentPhrase` reads a rival's strike warning with the footnotes it is given, like its callers. */

const seen: unknown[] = [];
vi.mock('$engine/rivals', async (orig) => {
  const real = await orig<typeof import('$engine/rivals')>();
  return {
    ...real,
    rivalPreview: (...a: Parameters<typeof real.rivalPreview>) => {
      seen.push(a[2]);
      return real.rivalPreview(...a);
    },
  };
});

afterEach(() => {
  seen.length = 0;
});

test('a rival strike warning is previewed with the footnotes passed to intentPhrase', async () => {
  const { intentPhrase } = await import('../../src/app/describe');
  const s = scenarioBattle({
    board: 'L D . .',
    pins: { A1: { kind: 'rivalStrike', dir: 'right', order: 1 } },
  });
  const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
  if (!rival) throw new Error('no rival');
  const written = withFootnotes(['touch-unit-reach']);

  expect(intentPhrase(s, rival)).toContain('Pell will be hurt');
  expect(seen.at(-1)).toEqual({});
  expect(intentPhrase(s, rival, written)).toContain('Pell will be hurt');
  expect(seen.at(-1)).toEqual(written);
});
