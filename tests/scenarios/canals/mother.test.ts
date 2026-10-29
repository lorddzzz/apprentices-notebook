import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { act, board } from '../harness';

/** CN-1 (BL-91, P10): the lamp-mother's cadence reads `summon` from her data. */

const endTurn = { type: 'endTurn' } as const;

const callsAndFlares = (lines: string[]) =>
  lines.filter((l) => l.startsWith('lamp-mother') && /calls|flares|waits/.test(l));

function play(start: ReturnType<typeof board>, n: number) {
  const lines: string[] = [];
  let state = start;
  for (let i = 0; i < n; i++) {
    const r = act(state, endTurn);
    state = r.state;
    lines.push(...r.lines);
  }
  return { state, lines };
}

describe('lamp-mother cadence (CN-1)', () => {
  const pool = `
    l . . . l
    . . Mw> . .
    . . . . .
    D . . . .
  `;

  test('her rhythm is data', () => {
    expect(ENEMIES.mother.summon).toEqual({ cap: 4, flareEvery: 3 });
  });

  test('nearest lamp occupied: the next free lamp is called the same round', () => {
    const r = act(board(pool.replace('l .', 'dl .')), endTurn);
    expect(callsAndFlares(r.lines)[0]).toBe('lamp-mother at C2 calls lamp-moth at E1');
  });

  test('every lamp occupied: no call that round', () => {
    const r = act(board(pool.replace('l .', 'dl .').replace('. l', '. dl')), endTurn);
    expect(callsAndFlares(r.lines)).toEqual(['lamp-mother at C2 waits']);
  });

  test('a call every non-flare round, a flare on 3 and 6', () => {
    const wide = `
      l . . . l . . . l . . l
      . . Mw> . . . . . . . . .
      . . . . . . . . . . . .
      D . . . . . . . . . . .
    `;
    const r = play(board(wide), 6);
    expect(callsAndFlares(r.lines).map((l) => l.replace(/ at \w+$/, ''))).toEqual([
      'lamp-mother at C2 calls lamp-moth',
      'lamp-mother at C2 calls lamp-moth',
      'lamp-mother at C2 flares',
      'lamp-mother at C2 calls lamp-moth',
      'lamp-mother at C2 calls lamp-moth',
      'lamp-mother at C2 flares',
    ]);
  });

  test('the cap of four holds', () => {
    const four = `
      l . . . . . . . . .
      . . Mw> . . . . . . .
      . . . . . . . . . .
      D . . . . . m m m m
    `;
    const r = act(board(four), endTurn);
    expect(callsAndFlares(r.lines)).toEqual(['lamp-mother at C2 waits']);
    expect(r.state.units.filter((u) => u.def === 'moth')).toHaveLength(4);
  });
});
