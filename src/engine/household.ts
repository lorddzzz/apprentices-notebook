import { APPRENTICES, type ApprenticeId, isApprenticeId } from '$data';
import { parseLattice } from './notation';
import { copyRune } from './trip/shared';
import type { Household, Profile, SlotIndex, Trip, TripSlots } from './types';

export type { Household, SlotIndex, TripSlots } from './types';

/**
 * The household (HC plan §4, party.md §0b): who has joined and the three trip slots. Pure: every
 * operation returns a new profile.
 */

/** Who a fresh notebook starts with, in slots 1 and 2 (HC P8). */
export const FOUNDERS: readonly ApprenticeId[] = ['draughtsman', 'stoker'];

/** An empty household: nobody joined, every slot empty. `newProfile` joins the founders. */
export const emptyHousehold = (): Household => ({ members: [], slots: [null, null, null] });

/**
 * Adds an apprentice on the bench with their starter page, empty proof and the household's
 * current ink (one allowance, P6). Idempotent: someone already in the household is left as they
 * are. Never fills a slot. Throws for an id outside the registry.
 */
export function joinHousehold(p: Profile, id: ApprenticeId): Profile {
  if (!isApprenticeId(id)) throw new Error(`No apprentice ${String(id)}`);
  if (inHousehold(p, id)) return p;
  const page = parseLattice(APPRENTICES[id].starterPage).runes.map(copyRune);
  return {
    ...p,
    household: { ...p.household, members: [...p.household.members, id] },
    lattices: { ...p.lattices, [id]: page },
    proof: { ...p.proof, [id]: [] },
  };
}

export function inHousehold(p: Profile, id: ApprenticeId): boolean {
  return p.household.members.includes(id);
}

/**
 * Puts an apprentice in a slot, or empties it with `null`. Refused (throws) during a trip (pass
 * the save's trip), for someone outside the household, or for someone already in another slot.
 */
export function setSlot(
  p: Profile,
  slot: SlotIndex,
  id: ApprenticeId | null,
  trip: Trip | null = null,
): Profile {
  if (trip) throw new Error('The household is out on a trip');
  if (id !== null) {
    if (!inHousehold(p, id)) throw new Error(`${String(id)} is not in the household`);
    if (p.household.slots.some((s, i) => s === id && i !== slot))
      throw new Error(`${APPRENTICES[id].name} is already in another slot`);
  }
  const slots = [...p.household.slots] as TripSlots;
  slots[slot] = id;
  return { ...p, household: { ...p.household, slots } };
}

/** The filled slots in slot order: the party a trip would set out with (0–3 apprentices). */
export function tripParty(p: Profile): ApprenticeId[] {
  return p.household.slots.filter((s): s is ApprenticeId => s !== null);
}
