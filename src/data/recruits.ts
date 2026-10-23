import type { ApprenticeDef } from './types';

/**
 * The seven recruits (party.md §2), owned by RC. Spread into `APPRENTICES`, so each key becomes an
 * `ApprenticeId`. Keep `ApprenticeId` out of this object's `satisfies` type (use
 * `ApprenticeDef<string>`), or the registry's key type turns circular.
 */
export const RECRUITS = {} as const satisfies Readonly<Record<string, ApprenticeDef<string>>>;
