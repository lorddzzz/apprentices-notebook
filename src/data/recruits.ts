import type { ApprenticeId } from './apprentices';
import type { ApprenticeDef, DistrictId, RuneId } from './types';

/** A story beat a recruit waits for (recruitment plan P1); a list, all must hold. */
export type Beat<Id extends string = ApprenticeId> =
  | { kind: 'landmark' } // met at their district's landmark room
  | { kind: 'joined'; who: Id } // someone already in the household
  | { kind: 'idiomNamed' } // any `idiom:*` in `profile.named` (P4)
  | { kind: 'provenInvention' }; // an invention proven in TUNING.provenCasts masks (P4)

/** Where a recruit is found: a district's landmark offer, or a note under the attic door (P3). */
export type RecruitFound = { district: DistrictId } | { door: 'A' | 'B' };

/**
 * A recruit's kit plus how they join (P1). `runes.all` holds the habit/school runes typed by hand;
 * starter-page runes are derived by `preconditionsOf` (parsed from `starterPage`, minus START_KNOWN).
 */
export interface RecruitDef<Id extends string = ApprenticeId> extends ApprenticeDef<Id> {
  found: RecruitFound;
  beat: readonly Beat<Id>[];
  runes: { all: readonly RuneId[]; any?: readonly RuneId[] };
}

/** `DistrictDef.recruit` (P8): the landmark room (0-based) where this apprentice is offered. */
export interface RecruitPlacement {
  apprentice: ApprenticeId;
  room: number;
}

/** `DistrictDef.recruitPages` (P8): pages guaranteed in these rooms while `for` waits on them. */
export type RecruitPages = {
  for: ApprenticeId;
  rooms: readonly number[];
} & ({ runes: readonly RuneId[] } | { any: readonly RuneId[] });

/**
 * Habit ids for the seven recruits (P10, fixed with AH P10). AH-W0 adds them to `HabitId`; until
 * then RC-1 entries cannot name them.
 */
export const RECRUIT_HABITS = {
  runaway: 'fuseOnStep',
  notary: 'markTwice',
  towelBearer: 'steamproof',
  warden: 'holdTwo',
  tuner: 'nearUnison',
  copyist: 'longTouch',
  exile: 'restoreErase',
} as const;

/**
 * The seven recruits (party.md §2), owned by RC. Spread into `APPRENTICES`, so each key becomes an
 * `ApprenticeId`. Keep `ApprenticeId` out of this object's `satisfies` type (use
 * `RecruitDef<string>`), or the registry's key type turns circular. RC-1 fills it.
 */
/** A starter page: the chain on the middle row of a 5x3 sheet, spare sockets around it (RC-1 proposal). */
const page = (chain: string): string => {
  const used = chain.split(' ').length;
  const rest = Array.from({ length: 5 - used }, () => '.').join(' ');
  return ['. . . . .', rest ? `${chain} ${rest}` : chain, 'x . . . x'].join('\n');
};

export const RECRUITS = {
  runaway: {
    id: 'runaway',
    name: 'Lamp-pole runaway',
    token: 'R',
    look: { hue: 'amber', shape: 'triangle' },
    hp: 6,
    move: 3,
    action: 'pull',
    lean: { trained: 'timing', gifted: 'seam' },
    habit: RECRUIT_HABITS.runaway,
    starterPage: page('Touch> Oil Spark'),
    blurb: "A Lamplighter's apprentice who ran off with the pole, and hooks things with it.",
    found: { district: 'canals' },
    beat: [{ kind: 'landmark' }],
    runes: { all: ['fuse'] },
  },
  notary: {
    id: 'notary',
    name: 'Junior notary',
    token: 'N',
    look: { hue: 'moss', shape: 'diamond' },
    hp: 6,
    move: 3,
    action: 'swap',
    lean: { trained: 'contracts', gifted: 'seam' },
    habit: RECRUIT_HABITS.notary,
    starterPage: page('Splash> Ink Steam'),
    blurb: 'A clerk who stamps things true, and swaps desks with anyone.',
    found: { district: 'inkQuarter' },
    beat: [{ kind: 'landmark' }],
    runes: { all: ['tally'] },
  },
  towelBearer: {
    id: 'towelBearer',
    name: 'Towel-bearer',
    token: 'B',
    look: { hue: 'teal', shape: 'hexagon' },
    hp: 9,
    move: 2,
    action: 'pull',
    lean: { trained: 'areas', gifted: 'seam' },
    habit: RECRUIT_HABITS.towelBearer,
    starterPage: page('Splash> Steam'),
    blurb: 'Big, calm and steam-soaked; holds the cloud while foes boil in it.',
    found: { district: 'bathhouses' },
    beat: [{ kind: 'landmark' }],
    runes: { all: [], any: ['vat', 'seep', 'steep'] },
  },
  warden: {
    id: 'warden',
    name: 'Defector warden',
    token: 'W',
    look: { hue: 'plum', shape: 'pentagon' },
    hp: 7,
    move: 3,
    action: 'shove',
    lean: { trained: 'structure', gifted: 'seam' },
    habit: RECRUIT_HABITS.warden,
    starterPage: page('Bolt> Shove Strike'),
    blurb: "Left the keystone watch and brought the wardens' chalk to your side.",
    found: { district: 'bridges' },
    beat: [{ kind: 'landmark' }],
    runes: { all: ['hold'] },
  },
  tuner: {
    id: 'tuner',
    name: 'Tuner',
    token: 'T',
    look: { hue: 'rose', shape: 'star' },
    hp: 6,
    move: 3,
    action: 'swap',
    lean: { trained: 'resonance', gifted: 'seam' },
    habit: RECRUIT_HABITS.tuner,
    starterPage: page('Bolt> Brass Strike'),
    blurb: 'Listens for what is slightly out of tune.',
    found: { district: 'foundry' },
    beat: [{ kind: 'landmark' }],
    runes: { all: ['unison'] },
  },
  copyist: {
    id: 'copyist',
    name: 'The Copyist',
    token: 'C',
    look: { hue: 'ochre', shape: 'cross' },
    hp: 6,
    move: 3,
    action: 'hop',
    lean: { trained: 'seam', gifted: 'seam' },
    habit: RECRUIT_HABITS.copyist,
    starterPage: page('Touch> Ink Strike'),
    blurb: 'A student who has been copying pamphlets about your notebook.',
    found: { door: 'A' },
    beat: [{ kind: 'joined', who: 'runaway' }, { kind: 'idiomNamed' }],
    runes: { all: ['touch'] },
  },
  exile: {
    id: 'exile',
    name: 'Erased student',
    token: 'E',
    look: { hue: 'indigo', shape: 'drop' },
    hp: 6,
    move: 3,
    action: 'hop',
    lean: { trained: 'board', gifted: 'board' },
    habit: RECRUIT_HABITS.exile,
    starterPage: page('Bolt> Oil Draw'),
    blurb: 'A guild student rubbed from the register; a grumpy Cartographer in exile.',
    found: { door: 'B' },
    beat: [{ kind: 'provenInvention' }],
    runes: { all: ['swap', 'draw', 'erase'] },
  },
} as const satisfies Readonly<Record<string, RecruitDef<string>>>;
