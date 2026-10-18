import type { Coord } from '../grid';
import type { BattleState } from './model';

/** Connected tiles (E2). Each returns the network containing `at` in reading order, or []. */
export function brassNet(_s: BattleState, _at: Coord): Coord[] {
  throw new Error('not implemented (E2)');
}
export function cloudNet(_s: BattleState, _at: Coord): Coord[] {
  throw new Error('not implemented (E2)');
}
export function oilNet(_s: BattleState, _at: Coord): Coord[] {
  throw new Error('not implemented (E2)');
}
/** Toll: every tile connected to `at` by the same state or compound. */
export function sameStateNet(_s: BattleState, _at: Coord): Coord[] {
  throw new Error('not implemented (E2)');
}
