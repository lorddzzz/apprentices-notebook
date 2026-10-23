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
export const RECRUITS = {} as const satisfies Readonly<Record<string, RecruitDef<string>>>;
