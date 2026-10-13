import type { MemberId } from '$data';
import type { Cluster } from './cluster';
import type { EventLog } from './events';
import type { Coord } from './grid';
import type { FiredCell, Lattice } from './types';

/** Proof (design research-and-mastery §4.2, plan P6/P7): cast masks from trace events. */

/** The meaningful player casts of `member` in a log, as fired-cell masks. */
export function masksFrom(_events: EventLog, _member: MemberId): FiredCell[][] {
  throw new Error('not implemented (B2)');
}

/** How many masks contain some rotation and translation of the cluster. */
export function provenCount(
  _l: Lattice,
  _cluster: Cluster,
  _masks: readonly FiredCell[][],
): number {
  throw new Error('not implemented (B2)');
}

/** The largest proven cluster rooted at or containing `at`, or null. */
export function maximalProven(
  _l: Lattice,
  _at: Coord,
  _masks: readonly FiredCell[][],
): Cluster | null {
  throw new Error('not implemented (B2)');
}

/** Ids of the idioms the lattice's spells contain. */
export function matchIdioms(_l: Lattice): string[] {
  throw new Error('not implemented (B2)');
}
