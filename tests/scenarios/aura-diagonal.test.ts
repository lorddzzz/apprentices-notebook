import { describe, expect, test } from 'vitest';
import { type AuraRuneId, MEMBERS } from '$data';
import {
  type BattleState,
  compileLattice,
  type GameEvent,
  parseLabel,
  parseLattice,
  type Spell,
  tileAt,
} from '$engine';
import { act, cast, withLattices } from './harness';

/**
 * The `auraDiagonal` capstone (plan FN P7, FN-11): an aura with it also touches the 4 diagonal
 * cells. Each aura sits diagonal to the rune it should power, so only the capstone reaches it.
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const layer = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).state;

/** The Draughtsman's spells compiled from `lattice`, with `diagonal` auras reaching diagonally. */
const spells = (lattice: string, diagonal: AuraRuneId[]): Spell[] =>
  compileLattice(parseLattice(lattice), {}, {}, MEMBERS.draughtsman.lean, {
    diagonalAuras: diagonal,
  }).spells;

const battle = (
  board: string,
  lattice: string,
  diagonal: AuraRuneId[],
  hp: Record<string, number> = {},
): BattleState =>
  withLattices(board, {}, { party: { draughtsman: { spells: spells(lattice, diagonal) } }, hp });

describe('afterglow-diagonal', () => {
  // Afterglow at D1 is diagonal to the Oil at C2: Ink then Oil make a stain.
  const LATTICE = '. . . Afterglow\nBolt> Ink Oil .';
  const lasts = (start: BattleState): number => {
    let s = cast(start, 'draughtsman', 'right').state;
    let rounds = 0;
    while (layer(s, 'D1') && rounds < 6) {
      s = endTurn(s).state;
      if (layer(s, 'D1')) rounds++;
    }
    return rounds;
  };

  test('without the capstone the diagonal Afterglow does nothing', () => {
    const board = 'D . . .\nd . . .';
    const plain = withLattices(board, { draughtsman: 'Bolt> Ink Oil' });
    expect(lasts(battle(board, LATTICE, []))).toBe(lasts(plain));
  });

  test('with the capstone the stain lasts one round longer', () => {
    const board = 'D . . .\nd . . .';
    const plain = withLattices(board, { draughtsman: 'Bolt> Ink Oil' });
    expect(lasts(battle(board, LATTICE, ['afterglow']))).toBe(lasts(plain) + 1);
  });

  test('the capstone of another aura does not widen Afterglow', () => {
    const board = 'D . . .\nd . . .';
    const plain = withLattices(board, { draughtsman: 'Bolt> Ink Oil' });
    expect(lasts(battle(board, LATTICE, ['steep', 'coil']))).toBe(lasts(plain));
  });
});

describe('steep-diagonal', () => {
  // Steep at D1 is diagonal to the Oil at C2: Steam then Oil make a grease fog.
  const LATTICE = '. . . Steep\nBolt> Steam Oil .';
  const BOARD = 'D . . .\nd . . .';

  test('without the capstone the fog does not spread', () => {
    const made = cast(battle(BOARD, LATTICE, []), 'draughtsman', 'right').state;
    expect(layer(made, 'D1')?.id).toBe('greaseFog');
    expect(layer(made, 'D1')?.steep).toBeFalsy();
  });

  test('with the capstone the fog spreads each round', () => {
    const made = cast(battle(BOARD, LATTICE, ['steep']), 'draughtsman', 'right').state;
    expect(layer(made, 'D1')).toMatchObject({ id: 'greaseFog', steep: true });
    const one = endTurn(made);
    for (const lbl of ['D1', 'C1', 'D2']) expect(layer(one.state, lbl)?.id, lbl).toBe('greaseFog');
  });
});

describe('coil-diagonal', () => {
  // Coil at C1 is diagonal to the Spark at B2. A storm hits the units in the cloud; with Coil,
  // the ones beside it too (the dummy at D1).
  const LATTICE = '. . Coil\nBolt> Spark .';
  const BOARD = 'D . d~ d';
  const HP = { C1: 20, D1: 20 };
  const hitAtD1 = (events: readonly GameEvent[]): number =>
    events.filter((e) => e.type === 'damage' && e.target.at.x === 3 && e.target.at.y === 0).length;

  test('without the capstone the storm stays in the cloud', () => {
    const r = cast(battle(BOARD, LATTICE, [], HP), 'draughtsman', 'right');
    expect(hitAtD1(r.events)).toBe(0);
  });

  test('with the capstone the storm reaches the unit beside the cloud', () => {
    const r = cast(battle(BOARD, LATTICE, ['coil'], HP), 'draughtsman', 'right');
    expect(hitAtD1(r.events)).toBeGreaterThan(0);
  });
});
