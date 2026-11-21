import { expect, it } from 'vitest';
import type { Drawing } from '$data';
import { baseBudget, generateRoom } from '$engine/drawing';
import { inputFor } from './fixtures';

/** CAL-5G: the generator's walk and its reach rule. */

// An eel on a board with no lanes has nowhere to stand: every attempt is held back by the guardrails.
const NO_LANES: Drawing = {
  name: 'Eel without lanes',
  rule: null,
  foes: ['eel'],
  pieces: [],
  shape: 'plain',
  length: 3,
  heart: 'marginalia',
};

it('CAL-5G: a held-back attempt keeps its budget', () => {
  const input = inputFor(NO_LANES, 1, 1);
  const room = generateRoom(input);
  const walk = room.trials.filter((t) => t.attempt <= 4);
  expect(walk.length).toBe(4);
  expect(walk.every((t) => t.won === null)).toBe(true);
  expect(walk.map((t) => t.budget)).toEqual(Array(4).fill(baseBudget(input)));
});
