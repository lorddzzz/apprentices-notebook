import type { Profile } from '$engine';
import { ledgerOf } from '$engine/drawing';

/** The attic's first evening shows until the notebook has cast once (nothing is stored). */
export const isFirstEvening = (p: Pick<Profile, 'ledger'>, onTrip: boolean): boolean =>
  !onTrip && ledgerOf(p).casts === 0;
