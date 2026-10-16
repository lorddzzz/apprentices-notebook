import { describe, expect, test } from 'vitest';
import { createBattle, describeLog, enemies } from '$engine';
import { act, board, expectLog, expectLogIncludes } from '../scenarios/harness';

const create = (ascii: string) => createBattle({ title: 'test', seed: 1, board: ascii });
const endTurn = (ascii: string) => act(board(ascii), { type: 'endTurn' });

describe('round 1', () => {
  test('round 1 telegraphs without moving', () => {
    expectLog(create('r . D').events, [
      'Encounter: test',
      'Round 1',
      'Enemies move',
      'rat at A1 waits',
      'Your turn',
    ]);
    expectLogIncludes(create('r D').events, ['rat at A1 will bite right']);
  });
});

describe('rat (chaser)', () => {
  test('rat chases nearest member and trails oil', () => {
    const r = endTurn('r . . . .\n. . . . .\n. . . . D');
    expectLogIncludes(r.events, [
      'rat at A1 moves to D1',
      'oil coats A1, B1, C1, D1',
      'rat at D1 waits',
    ]);
  });

  test('rat bites when it reaches', () => {
    const r = endTurn('r . D');
    expectLogIncludes(r.events, [
      'rat at A1 moves to B1',
      'oil coats A1, B1',
      'rat at B1 will bite right',
    ]);
  });

  test('bite targets the nearest member; ties go to the earlier party member', () => {
    expectLogIncludes(create('S r D').events, ['rat at B1 will bite right']);
  });

  test('chooses the target by walking distance, ties to the earlier party member', () => {
    // The Stoker and the Draughtsman are both two steps away: the rat heads for the Draughtsman.
    const r = endTurn('S . r . D');
    expectLogIncludes(r.events, [
      'rat at C1 moves to D1',
      'oil coats C1, D1',
      'rat at D1 will bite right',
    ]);
  });

  test('tie-breaks are reading order', () => {
    // C2 and B3 are both one step from D and three from the rat: the upper-left one wins.
    const r = endTurn('r . .\n. . .\n. . D');
    expectLogIncludes(r.events, [
      'rat at A1 moves to C2',
      'oil coats A1, B1, C1, C2',
      'rat at C2 will bite down',
    ]);
  });

  test('routes around plates', () => {
    const r = endTurn('r = D\n. . .\n. . .');
    expectLogIncludes(r.events, [
      'rat at A1 moves to C2',
      'oil coats A1, A2, B2, C2',
      'rat at C2 will bite up',
    ]);
  });
});

describe('sentry (liner)', () => {
  test('sentry lines up', () => {
    expectLog(create('b . D').events, [
      'Encounter: test',
      'Round 1',
      'Enemies move',
      'sentry at A1 will fire right',
      'Your turn',
    ]);
  });

  test('steps sideways to get a shot', () => {
    const r = endTurn('b . .\n. . .\n. D .');
    expectLogIncludes(r.events, ['sentry at A1 moves to B1', 'sentry at B1 will fire down']);
  });

  test('sentry falls back toward nearest member', () => {
    const r = endTurn('b . .\n. . .\n. . D');
    expectLogIncludes(r.events, ['sentry at A1 moves to B1', 'sentry at B1 will fire down']);
  });

  test('round 1 fallback aims along the dominant axis without moving', () => {
    expectLogIncludes(create('b . .\n. . .\n. . D').events, ['sentry at A1 will fire down']);
    expectLogIncludes(create('b . . . D\n. . . . .').events, ['sentry at A1 will fire right']);
  });
});

describe('familiar (spitter)', () => {
  test('familiar keeps range 2', () => {
    expectLogIncludes(create('f . D').events, ['familiar at A1 will spit right']);
    const r = endTurn('f .\n. .\n. .\nD .');
    expectLogIncludes(r.events, ['familiar at A1 moves to A2', 'familiar at A2 will spit down']);
  });
});

describe('dummy', () => {
  test('waits forever', () => {
    expectLogIncludes(endTurn('D d').events, ['dummy at B1 waits']);
  });
});

describe('intents', () => {
  test('intent order follows unit order', () => {
    const s = board('r D r');
    expect(
      enemies(s).map((e) => [
        e.id,
        e.intent?.kind === 'attack' ? e.intent.dir : null,
        e.intent?.order,
      ]),
    ).toEqual([
      ['rat-1', 'right', 1],
      ['rat-2', 'left', 2],
    ]);
  });

  test('waiting enemies take no order number', () => {
    const s = board('r . . . D b');
    expect(enemies(s).map((e) => e.intent?.order ?? null)).toEqual([null, 1]);
  });

  test('later enemies see earlier moves', () => {
    // Alone, the second rat would also pick B2; it sees the first rat there and takes C3.
    const r = endTurn('r . r\n. . .\n. D .');
    const lines = describeLog(r.events);
    expect(lines).toContain('rat at A1 moves to B2');
    expect(lines).toContain('rat at C1 moves to C3');
  });
});
