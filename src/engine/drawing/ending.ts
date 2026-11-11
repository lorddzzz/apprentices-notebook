import type { Profile } from '../types';
import { notBuilt } from './stub';
import type { Credits } from './types';

/** The handover (ending §1.1): the owner joins, gifted pages are learned, `ending.handover` is set; idempotent. EN-10. */
export function handover(_p: Profile): Profile {
  return notBuilt('EN-10');
}

/** The credits (ending §1.1), derived from the profile: districts in opening order, idioms, ledger counts. EN-11. */
export function creditsOf(_p: Profile): Credits {
  return notBuilt('EN-11');
}
