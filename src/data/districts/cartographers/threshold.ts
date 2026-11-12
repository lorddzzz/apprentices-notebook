import type { ThresholdSpec } from '../index';

/**
 * The redraft threshold, "the drafting table" (P16): a stub. CG-11 replaces the board with pencil
 * over blank paper (fixed fates shown a round ahead) and the goal with reaching the inked far
 * bench within four rounds. Until then it is a plain hall with the district's four `P`; nothing
 * sets it as `gate` or `threshold` (CG-14 flips the gate).
 */
export const CARTOGRAPHERS_THRESHOLD: ThresholdSpec = {
  name: 'The drafting table',
  board: [
    '. . . . . .',
    '. . . . . .',
    '. . . . . .',
    '. . . . . .',
    '. . . . . .',
    'P . . . . P',
    '. P . . P .',
  ].join('\n'),
  goal: { all: [] },
  note: 'A long bench of unfinished paper. The far end is inked; the rest is only drawn.',
  goalText: 'Reach the inked bench.',
  solvedArt: 'cartographers-bench',
};
