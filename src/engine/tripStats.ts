import type { EventLog } from './events';
import type { Profile, TripStats } from './types';

/** A trip's stats before its first fight. */
export function emptyStats(): TripStats {
  return { fights: 0, spells: [], biggestChain: null, discoveries: [], proofCasts: 0 };
}

/**
 * Folds one finished encounter's event log into the trip's stats (plan S16). `known` is the
 * profile as it was before this encounter, so first discoveries can be told apart.
 * W0 stub: counts the fight only. S1 fills in casts, damage, kills, chains and discoveries.
 */
export function accumulateStats(stats: TripStats, _log: EventLog, _known: Profile): TripStats {
  return { ...stats, fights: stats.fights + 1 };
}
