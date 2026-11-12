import type { ApprenticeDef } from '../types';

/**
 * The tenth apprentice (party.md §2, ending P18): the one who held the join. Never offered: no
 * `found` or `beat`, so recruit offers and the recruit parse (which read `RECRUITS`) never see
 * them. Joins at the handover (EN-10). Real name, face and art are BL-40.
 */
export const OWNER = {
  owner: {
    id: 'owner',
    name: 'The owner',
    token: 'O',
    look: { hue: 'gilt', shape: 'ring' },
    hp: 5,
    move: 3,
    action: 'pull',
    lean: { trained: 'seam', gifted: 'board' },
    habit: 'mender',
    starterPage: ['. . . . .', 'Splash> Steam Spark . .', 'x . . . x'].join('\n'),
    blurb: 'Held the join together for years, and mends what other hands set side by side.',
  },
} as const satisfies Readonly<Record<string, ApprenticeDef<string>>>;
