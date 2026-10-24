import { APPRENTICE_IDS, type ApprenticeId, DISTRICTS, RECRUITS } from '$data';
import type { Profile } from '$engine';
import { isRevealed } from '$engine/recruits';
import { type CardView, cardOf } from './study';

/** One page of the Codex Household tab (recruitment plan P13). */
export interface HouseholdRow {
  card: CardView;
  /** Where they came from: the founders' own line, a district, or the attic door. */
  met: string;
}

const metOf = (id: ApprenticeId): string => {
  if (!Object.hasOwn(RECRUITS, id)) return 'Here from the start';
  const { found } = RECRUITS[id as keyof typeof RECRUITS];
  return 'district' in found
    ? `Met in ${DISTRICTS[found.district].name}`
    : 'Came by a note under the attic door';
};

/**
 * The household and every revealed recruit, in registry order (§1: nobody unrevealed is named).
 * Deliberately outside `codexView`, so the "x / y known" count never hints at the missing.
 */
export function householdRows(p: Profile): HouseholdRow[] {
  return APPRENTICE_IDS.filter((id) => isRevealed(p, id)).map((id) => ({
    card: cardOf(p, id),
    met: metOf(id),
  }));
}
