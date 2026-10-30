import type { TermDef } from './types';

/**
 * The quarter's terms (P6, P7): the list the `termed` offer kind rolls from. Rooms are 0-based
 * (0-3 the four rooms; the heart, 4, carries none). Every entry passes `checkTermDefs`
 * (`engine/districts/inkQuarter/terms.ts`). IQ-20 set the rounds from the bot's tables
 * (docs/plans/ink-quarter-calibration.md); the player's playtest retunes them.
 *
 * - Room 1 always carries the sampler (a second pick for ink, never a page).
 * - Bind is guaranteed in room 2 while the household lacks it, with a gentle condition.
 * - Wax and Sand are termed in rooms 2-4; each page is offered on a term until it is found.
 */
export const INK_TERMS: readonly TermDef[] = [
  {
    id: 'inkQuarter:term-sampler',
    reward: { kind: 'extraPick' },
    stake: { kind: 'resources', loss: { kind: 'ink', amount: 2 } },
    condition: { kind: 'withinRounds', rounds: 5 },
    rooms: [0],
    text: {
      reward: 'a second page from this room',
      condition: 'win the next room within 5 rounds',
      penalty: 'lose 2 ink from the trip',
    },
  },
  {
    id: 'inkQuarter:term-bind',
    reward: { kind: 'page', spec: { kind: 'method', method: 'bind' } },
    stake: { kind: 'reward' },
    condition: { kind: 'withinRounds', rounds: 6 },
    rooms: [1],
    guaranteedWhileLacking: 'bind',
    text: {
      reward: 'the Bind page',
      condition: 'win the next room within 6 rounds',
      penalty: 'the Bind page is taken back',
    },
  },
  {
    id: 'inkQuarter:term-wax',
    reward: { kind: 'page', spec: { kind: 'solvent', solvent: 'wax' } },
    stake: { kind: 'reward' },
    condition: { kind: 'withinRounds', rounds: 7 },
    rooms: [1, 2, 3],
    text: {
      reward: 'a pot of Wax',
      condition: 'win the next room within 7 rounds',
      penalty: 'the Wax is taken back',
    },
  },
  {
    id: 'inkQuarter:term-sand',
    reward: { kind: 'page', spec: { kind: 'solvent', solvent: 'sand' } },
    stake: { kind: 'nextRoom', cost: { kind: 'mark' } },
    condition: { kind: 'winRoom' },
    rooms: [1, 2, 3],
    text: {
      reward: 'a pot of Sand',
      condition: 'win the next room',
      penalty: 'one of you starts it marked',
    },
  },
  {
    id: 'inkQuarter:term-ledger',
    reward: { kind: 'extraPick' },
    stake: { kind: 'nextRoom', cost: { kind: 'extraFoe', foe: 'deadLetter' } },
    condition: { kind: 'winRoom' },
    rooms: [2, 3],
    text: {
      reward: 'a second page from this room',
      condition: 'win the next room',
      penalty: 'a dead letter joins the next room',
    },
  },
];
