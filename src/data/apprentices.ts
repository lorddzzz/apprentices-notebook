import { RECRUITS } from './recruits';
import type { ApprenticeDef, Lean, MemberDef } from './types';

/** The starting pair (party.md §2): unchanged bodies, leans, habits and Shove. */
const PAIR = {
  draughtsman: {
    id: 'draughtsman',
    name: 'Draughtsman',
    token: 'D',
    look: { hue: 'slate', shape: 'circle' },
    hp: 6,
    move: 3,
    action: 'shove',
    lean: { trained: 'timing', gifted: 'contracts' },
    habit: 'twoJars',
    starterPage: ['.     .   .      . .', 'Bolt> Ink Strike . .', 'x     .   .      . x'].join(
      '\n',
    ),
    blurb: 'Marks his targets in ink before anything else touches them.',
  },
  stoker: {
    id: 'stoker',
    name: 'Stoker',
    token: 'S',
    look: { hue: 'rust', shape: 'square' },
    hp: 8,
    move: 3,
    action: 'shove',
    lean: { trained: 'seam', gifted: 'seam' },
    habit: 'forkAhead',
    starterPage: [
      'x Boltv x',
      '. Oil   .',
      '. Spark .',
      '. .     .',
      '. .     .',
      'x .     x',
    ].join('\n'),
    blurb: 'Keeps the furnace lit and trusts a good fire to settle most arguments.',
  },
} as const satisfies Readonly<Record<string, ApprenticeDef<string>>>;

const REGISTRY = { ...PAIR, ...RECRUITS };

/** Every apprentice the game knows (HC P1): the registry's keys, the pair first, then RC's recruits. */
export type ApprenticeId = keyof typeof REGISTRY;

export const APPRENTICES: Readonly<Record<ApprenticeId, ApprenticeDef>> = REGISTRY;

/** Registry order; stable tie-breaks (foe targeting, HC P15) use it. */
export const APPRENTICE_IDS = Object.keys(REGISTRY) as readonly ApprenticeId[];

export const isApprenticeId = (id: string): id is ApprenticeId => Object.hasOwn(REGISTRY, id);

/** The lean a unit of this apprentice carries in battle: schools plus habit. */
export const leanOf = (id: ApprenticeId): Lean => {
  const a = APPRENTICES[id];
  return { trained: a.lean.trained, gifted: a.lean.gifted, habit: a.habit };
};

/** @deprecated Every registry id; HC-1/HC-4 move callers to the household or the trip party. */
export const MEMBER_IDS: readonly ApprenticeId[] = APPRENTICE_IDS;

/** A page's fixed geometry: every token a socket, holes kept. */
const shapeOf = (page: string): string =>
  page
    .split('\n')
    .map((row) =>
      row
        .trim()
        .split(/\s+/)
        .map((t) => (t === 'x' ? 'x' : '.'))
        .join(' '),
    )
    .join('\n');

/** @deprecated Pre-household view of the registry; prefer `APPRENTICES` and `leanOf`. */
export const MEMBERS = Object.fromEntries(
  APPRENTICE_IDS.map((id): [ApprenticeId, MemberDef] => {
    const a = APPRENTICES[id];
    return [
      id,
      { ...a, lean: leanOf(id), startLattice: a.starterPage, shape: shapeOf(a.starterPage) },
    ];
  }),
) as Readonly<Record<ApprenticeId, MemberDef>>;
