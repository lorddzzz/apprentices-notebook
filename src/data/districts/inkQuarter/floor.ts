import type { IntrusionSpec } from '../index';

const board = (rows: readonly string[]): string => rows.join('\n');

/**
 * The ink-makers' lower-Seam floor (IQ-12; ink-quarter plan P12). The return stamp only, two
 * tiles per room, and its piece-scoped snapshot rule: the board brings both, the fight lists no
 * district rule. Seam foes only (rat `r`, sentry `b`), no `P` beside a foe, tuned for three
 * apprentices. A foe that ends a round on a stamp is sent back to where its round began.
 */
export const INK_INTRUSION: IntrusionSpec = {
  district: 'inkQuarter',
  pieces: ['inkQuarter:return'],
  rules: ['inkQuarter:writs'],
  rooms: [
    board([
      '. . . r . .',
      '. {return} . . . .',
      '. . . . b .',
      '. . . {return} . .',
      '. . . . . .',
      'P . P . P .',
      '. . . . . .',
      '. P . . . P',
    ]),
    board([
      '. r . . . .',
      '. . . . . r',
      '. . {return} . . .',
      '. . . . . .',
      '. {return} . . . .',
      '. . . . . .',
      'P . P . P .',
      '. P . . P .',
    ]),
    board([
      '. . b . . r',
      '. . . . . .',
      '{return} . . . {return} .',
      '. . . . . .',
      '. . . . . .',
      'P . P . . .',
      '. . . P . .',
      '. P . . P .',
    ]),
  ],
  loot: 'basics',
};
