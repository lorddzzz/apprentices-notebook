import { afterEach, expect, test, vi } from 'vitest';
import { type EnemyUnit, scenarioBattle } from '$engine';
import { withFootnotes } from '../scenarios/footnoteHarness';

/** EN-14: the battle's rival sheet reads the rival's plan with the household's footnotes, like the board. */

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

test('the session passes its footnotes to the rival sheet', async () => {
  const { BattleSession } = await import('../../src/app/battle.svelte');
  const s = scenarioBattle({
    board: 'L D . .',
    pins: { A1: { kind: 'rivalStrike', dir: 'right', order: 1 } },
  });
  const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
  if (!rival) throw new Error('no rival');
  const written = withFootnotes(['touch-unit-reach']);
  const session = new BattleSession({ state: s, events: [] }, 'lab', { footnotes: written });
  session.input = { kind: 'inspect', at: rival.pos, member: null, moves: [] };
  seen.length = 0;
  expect(session.rivalSheet?.plan).toContain('Pell will be hurt');
  expect(seen.at(-1)).toEqual(written);
});
