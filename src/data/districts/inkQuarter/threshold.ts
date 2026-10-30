import type { ThresholdSpec } from '../index';

/**
 * The quarter's threshold room, "return to sender" (ink-quarter plan P11, IQ-11): a free,
 * retryable board with no foes. An undelivered letter (the inert `letter` foe, unit id
 * `letter-1`) lies on its desk with the return stamp one tile beyond it, across
 * the room from the party. No start point has the desk in a straight line (two plates flank the
 * lane), so a Bolt from where you start cannot reach: walk into the lane below the desk, then
 * `Bolt > Shove` pushes the letter onto the stamp and it flies back to its desk. The goal asks for
 * that send-back by the letter, so an apprentice who steps on the stamp herself opens nothing.
 */
export const INK_THRESHOLD: ThresholdSpec = {
  name: 'The dead-letter office',
  board: [
    '. . . . . .',
    '. . . . . .',
    '. . {return} . . .',
    '. . a . . .',
    '. = . = . .',
    '. . . . . .',
    'P . . . . P',
    '. P . . P .',
  ].join('\n'),
  goal: { happens: 'inkQuarter:sentBack', unit: 'letter-1' },
  note: 'A letter has sat on its desk since before the doors were barred. The office will not open for a body on the stamp; it opens for the post.',
  goalText: 'Send the letter back to its desk.',
  solvedArt: 'ink-returned',
};
