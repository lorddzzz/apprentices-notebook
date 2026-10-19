import { describe, expect, test } from 'vitest';
import { type BattleState, describeLog, parseLabel, tileAt, unitAt } from '$engine';
import { dealDamage } from '$engine/damage';
import { act, board, draft, expectLog, expectLogIncludes } from './harness';

/** The canal foes (K-13 to K-17): eel, Snuffer, lamp-moth, lamp-mother. */

const endTurn = { type: 'endTurn' } as const;
const tile = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl));

/** Ends `n` turns, returning the final state and every log line. */
function play(s: BattleState, n: number) {
  const lines: string[] = [];
  let state = s;
  for (let i = 0; i < n; i++) {
    const r = act(state, endTurn);
    state = r.state;
    lines.push(...r.lines);
  }
  return { state, lines };
}

describe('eel (K-14)', () => {
  const lane = `
    . . . . . .
    D w> w> w> w> ew>
    . . . . . .
  `;

  test('swims up the lane to the tile beside a member and telegraphs a lunge', () => {
    const r = act(board(lane), endTurn);
    expectLog(r.events, [
      'Enemies act',
      'Round 2',
      'Enemies move',
      'eel at F2 moves to B2',
      'eel at B2 will lunge left',
      'Your turn',
    ]);
  });

  test('lunges only from water, and the eel never stands on land', () => {
    const r = play(board(lane), 3);
    expect(r.lines).toContain('eel at B2 lunges left');
    expect(r.lines).toContain('Lunge hits Draughtsman for 2');
    const eel = r.state.units.find((u) => u.def === 'eel');
    expect(
      eel && tile(r.state, `${'ABCDEF'[eel.pos.x]}${eel.pos.y + 1}`).terrain.water,
    ).not.toBeNull();
  });

  test('a member two tiles from the water is not lunged at', () => {
    const s = board(`
      . . . . . .
      . . . . . .
      D . w> w> w> ew>
    `);
    const r = play(s, 2);
    expect(r.lines.filter((l) => l.includes('lunge'))).toEqual([]);
  });

  test('with no member reachable by water it holds', () => {
    const s = board(`
      D . . . . .
      . . . . . .
      . . w> w> ew> .
    `);
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['eel at E3 waits']);
    expect(unitAt(r.state, parseLabel('E3'))?.def).toBe('eel');
  });

  test('a grate in the lane stops the eel', () => {
    const s = board(`
      . . . . . .
      D w> w>h w> ew> .
    `);
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['eel at E2 waits']);
    expect(unitAt(r.state, parseLabel('E2'))?.def).toBe('eel');
  });
});

describe('Snuffer (K-15)', () => {
  test('puts out fire in its 3x3, after the burn', () => {
    const s = board(
      `
      . . . . .
      . n r* . * o
      D . . . .
    `,
      { hp: { C2: 1 } },
    );
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['Fire hits rat at C2 for 1']);
    const lines = describeLog(r.events);
    const burnAt = lines.findIndex((l) => l.startsWith('Fire hits rat'));
    const snuffAt = lines.findIndex((l) => l.includes('snuffs'));
    expect(burnAt).toBeGreaterThanOrEqual(0);
    expect(snuffAt).toBeGreaterThan(burnAt);
    expect(tile(r.state, 'C2').state).toBeNull();
    expect(tile(r.state, 'E2').state).toMatchObject({ id: 'fire', rounds: 1 }); // outside the 3x3
  });
});

describe('lamp-moth (K-16)', () => {
  test('flies to the nearest fire before any member', () => {
    const s = board(`
      D . . . . . m . . *
    `);
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['lamp-moth at G1 moves to J1']);
  });

  test('with no fire it flies at the nearest member and telegraphs Burst', () => {
    const s = board(`
      D . . . . m
    `);
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['lamp-moth at F1 moves to C1']);
  });

  test('bursts on its intent: lights its slick, 1 to each neighbour, and dies', () => {
    const s = board(`
      . D .
      d mo r
      . . .
    `);
    const r = act(s, endTurn);
    expectLogIncludes(r.events, [
      'lamp-moth at B2 bursts',
      'lamp-moth at B2 dies',
      'fire bursts at B2',
      'Burst hits Draughtsman for 1',
      'Burst hits dummy at A2 for 1',
      'Burst hits rat at C2 for 1',
    ]);
    expect(unitAt(r.state, parseLabel('B2'))).toBeNull();
  });

  test('a moth killed by fire bursts, and its burst kills the next moth, which bursts', () => {
    const s = board('D . . m* m . d');
    const r = act(s, endTurn);
    expectLog(r.events, [
      'Enemies act',
      'Fire hits lamp-moth at D1 for 1',
      'lamp-moth at D1 dies',
      'lamp-moth at D1 bursts',
      'Burst hits lamp-moth at E1 for 1',
      'lamp-moth at E1 dies',
      'lamp-moth at E1 bursts',
      'Round 2',
      'Enemies move',
      'dummy at G1 waits',
      'Your turn',
    ]);
  });

  test('a moth killed by a spell bursts too', () => {
    const r = draft(board('S m d'), (ctx) => {
      const moth = unitAt(ctx.s, parseLabel('B1'));
      if (moth) dealDamage(ctx, moth, 1, 'Spark');
    });
    expectLog(r.events, [
      'Spark hits lamp-moth at B1 for 1',
      'lamp-moth at B1 dies',
      'lamp-moth at B1 bursts',
      'Burst hits Stoker for 1',
      'Burst hits dummy at C1 for 1',
    ]);
  });

  test('AI is deterministic: the same board gives the same log', () => {
    const s = board(`
      D . . . . m
      . . w> w> ew> .
      . . . . . m
    `);
    expect(play(s, 3).lines).toEqual(play(s, 3).lines);
  });
});

describe('lamp-mother (K-17)', () => {
  // Her tile's water flows into land, so a float stays under her.
  const pool = `
    l . . . l
    . . Mw> . .
    . . . . .
    D . . . .
  `;

  test('summons at the lamp nearest a member, with the next free moth id', () => {
    const r = act(board(pool), endTurn);
    expectLogIncludes(r.events, ['lamp-mother at C2 calls lamp-moth at A1']);
    expect(r.state.units.some((u) => u.id === 'moth-1')).toBe(true);
  });

  test('skips a lamp that is taken', () => {
    const r = act(board(pool.replace('l .', 'dl .')), endTurn);
    expect(r.lines.join('\n')).not.toContain('calls');
    expectLogIncludes(r.events, ['lamp-mother at C2 waits']);
  });

  test('skips the fifth moth', () => {
    const four = `
      l . . . . . . . . .
      . . Mw> . . . . . . .
      . . . . . . . . . .
      D . . . . . m m m m
    `;
    const r = act(board(four), endTurn);
    expect(r.lines.join('\n')).not.toContain('calls');
    expect(r.state.units.filter((u) => u.def === 'moth')).toHaveLength(4);
  });

  test('flares every third round: every moth bursts, in reading order', () => {
    const wide = `
      l . . . . . . . . . . .
      . . Mw> . . . . . . . m m
      . . . . . . . . . . . .
      D . . . . . . . . . . .
    `;
    const r = play(board(wide), 3);
    expect(r.lines.filter((l) => /calls|flares|bursts/.test(l))).toEqual([
      'lamp-mother at C2 calls lamp-moth at A1',
      'lamp-moth at A3 bursts',
      'lamp-mother at C2 flares',
      'lamp-moth at E2 bursts',
      'lamp-moth at F2 bursts',
    ]);
  });

  test('burns from fire under her, then snuffs it', () => {
    const r = act(board(pool.replace('Mw>', 'Mw>*')), endTurn);
    const lines = describeLog(r.events);
    const burn = lines.findIndex((l) => l.startsWith('Fire hits lamp-mother'));
    const snuff = lines.findIndex((l) => l.startsWith('lamp-mother at C2 snuffs'));
    expect(burn).toBeGreaterThanOrEqual(0);
    expect(snuff).toBeGreaterThan(burn);
    expect(tile(r.state, 'C2').state).toBeNull();
    expect(unitAt(r.state, parseLabel('C2'))?.hp).toBe(13);
  });

  test('she never moves', () => {
    const r = play(board(pool), 4);
    expect(r.state.units.find((u) => u.def === 'mother')?.pos).toEqual({ x: 2, y: 1 });
  });
});
