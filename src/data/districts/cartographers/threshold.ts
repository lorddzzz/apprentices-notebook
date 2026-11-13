import type { ThresholdSpec } from '../index';

/**
 * The redraft threshold, "the drafting table" (cartographers-plan P16; CG-11): a 6x7 sheet of
 * pencil over blank paper, no foes, every fate fixed and shown a round ahead. The far end is the
 * inked bench (B1 to E1); the goal is for an apprentice to stand on it within four rounds.
 *
 * Reading the pencil is the lesson: columns C and D are inked at the end of round 2, everything
 * beside them is mostly rubbed out (a unit still standing on a rubbed tile is erased). Movement
 * alone solves it from every `P` with every apprentice's kit (the slowest walk 2 tiles a round,
 * which still reaches the bench in four rounds with two steps to spare).
 * Board tokens: `{blank}` no paper, `{pencil:ink@n}` / `{pencil:rub@n}` the hand's fate and the
 * round whose end resolves it, `P` start points on plain paper.
 */
const SHEET = [
  '{blank} . . . . {blank}',
  '{blank} {pencil:rub@1} {pencil:ink@2} {pencil:ink@2} {pencil:rub@2} {blank}',
  '{pencil:rub@1} {pencil:rub@2} {pencil:ink@2} {pencil:ink@2} {pencil:rub@1} {pencil:rub@2}',
  '{pencil:ink@1} {pencil:rub@2} {pencil:ink@2} {pencil:ink@2} {pencil:rub@1} {pencil:ink@1}',
  '{pencil:rub@2} {pencil:rub@1} {pencil:ink@2} {pencil:ink@2} {pencil:rub@3} {pencil:rub@1}',
  'P {pencil:rub@1} {pencil:ink@2} {pencil:ink@2} {pencil:rub@2} P',
  '{blank} P {pencil:ink@2} {pencil:ink@2} P {blank}',
];

/** The bench's tiles, in the threshold language's cell labels. */
export const BENCH_TILES = ['B1', 'C1', 'D1', 'E1'] as const;
/** The rounds the bench must be reached in (the two lanes are inked at the end of round 2). */
export const BENCH_ROUNDS = 4;

const NOTE =
  'A long bench of unfinished paper. The far end is inked; the rest is only drawn, and the hand rubs out what it has marked.';
const GOAL = { reach: BENCH_TILES, byRound: BENCH_ROUNDS } as const;

export const CARTOGRAPHERS_THRESHOLD: ThresholdSpec = {
  name: 'The drafting table',
  board: SHEET.join('\n'),
  goal: GOAL,
  note: NOTE,
  goalText: 'Reach the inked bench within four rounds.',
  solvedArt: 'cartographers-bench',
};

/** The lay-figure's tile: on pencil rubbed at the end of round 2, beside the left lane. */
export const LAY_FIGURE_TILE = 'C4';

/**
 * The second sheet: a lay-figure (a bystander) stands in the left lane on pencil due to be rubbed
 * out at the end of round 2. Walking past it still reaches the bench, and the figure is lost; a
 * Shove from the tile below (or a Pull or a Swap) moves it onto inked paper first. The goal is the
 * same bench in the same four rounds.
 */
export const CARTOGRAPHERS_THRESHOLD_LAY_FIGURE: ThresholdSpec = {
  ...CARTOGRAPHERS_THRESHOLD,
  name: 'The drafting table, second sheet',
  board: SHEET.map((row, y) =>
    y === 3 ? row.replace('{pencil:ink@2}', 'k{pencil:rub@2}') : row,
  ).join('\n'),
  note: `${NOTE} A lay-figure stands on pencil that is marked to go.`,
  goalText: 'Reach the inked bench within four rounds. Save the lay-figure if you can.',
};
