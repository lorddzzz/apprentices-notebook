import type { RuneId } from '$data';
import { OWNER } from '$data/apprentices/owner';
import { joinHousehold } from '../household';
import { parseLattice } from '../notation';
import { isGlyph, type Profile } from '../types';
import { endingOf, ledgerOf } from './profile';
import type { Credits } from './types';

/** The owner's starter-page runes other than Spark, in page order (P18). */
export function giftedRunes(): RuneId[] {
  const ids = parseLattice(OWNER.owner.starterPage).runes.flatMap((r) =>
    isGlyph(r) ? [] : [r.rune as RuneId],
  );
  return [...new Set(ids)].filter((id) => id !== 'spark');
}

/** The gifted runes this profile lacks: what the scene shows as learned. */
export function missingGifts(p: Profile): RuneId[] {
  return giftedRunes().filter((id) => !p.known.includes(id));
}

/** The handover (ending §1.1): the owner joins, gifted pages are learned, `ending.handover` is set; idempotent. */
export function handover(p: Profile): Profile {
  // `ownerDoor(p) === 'open'` (districts/lowerSeam), read here because core engine files may not import a district.
  if (!(p.city.doorSeen && p.city.hearts.includes('cartographers')))
    throw new Error('The owner’s door is not open');
  if (endingOf(p).handover) return p;
  const joined = joinHousehold(p, 'owner');
  return {
    ...joined,
    known: [...joined.known, ...missingGifts(joined)],
    ending: { ...endingOf(p), handover: true },
  };
}

/** The credits (ending §1.1), derived from the profile: districts in opening order, idioms, ledger counts. */
export function creditsOf(p: Profile): Credits {
  const ledger = ledgerOf(p);
  return {
    // A save from before the ledger shipped has the city's own opening order.
    districts: [...(ledger.districts.length > 0 ? ledger.districts : p.city.open)],
    idioms: p.named.filter((n) => n.startsWith('idiom:')),
    casts: ledger.casts,
    trips: p.city.trips,
    biggest: ledger.biggest,
  };
}
