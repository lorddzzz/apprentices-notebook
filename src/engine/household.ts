import type { ApprenticeId } from '$data';
import type { Profile } from './types';

/**
 * The household (HC plan §4, party.md §0b): who has joined and the three trip slots.
 * HC-W0 contract only: HC-1 adds `household` and `ink` to `Profile` and fills these bodies.
 */

/** A trip slot, left to right on the shelf. */
export type SlotIndex = 0 | 1 | 2;
export type TripSlots = [ApprenticeId | null, ApprenticeId | null, ApprenticeId | null];
export interface Household {
  /** Everyone who has joined, in join order (the pair first on a fresh save). */
  members: ApprenticeId[];
  /** A fresh save: the pair in slots 0 and 1 (HC P8). Never a duplicate. */
  slots: TripSlots;
}

const stub = (name: string): never => {
  throw new Error(`${name} is an HC-W0 stub (HC-1 builds it)`);
};

/**
 * Adds an apprentice on the bench with their starter page, empty proof and the household's
 * current ink. Idempotent: someone already in the household is left as they are. Never fills a slot.
 */
export function joinHousehold(p: Profile, id: ApprenticeId): Profile {
  return stub(`joinHousehold(${id}, ${p.known.length})`);
}

export function inHousehold(p: Profile, id: ApprenticeId): boolean {
  return stub(`inHousehold(${id}, ${p.known.length})`);
}

/**
 * Puts an apprentice in a slot, or empties it with `null`. Refused (throws) during a trip, for
 * someone outside the household, or for someone already in another slot.
 */
export function setSlot(p: Profile, slot: SlotIndex, id: ApprenticeId | null): Profile {
  return stub(`setSlot(${slot}, ${id}, ${p.known.length})`);
}

/** The filled slots in slot order: the party a trip would set out with (0–3 apprentices). */
export function tripParty(p: Profile): ApprenticeId[] {
  return stub(`tripParty(${p.known.length})`);
}
