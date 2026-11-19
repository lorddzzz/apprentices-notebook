import type { RuneId } from '$data';
import { OWNER } from '$data/apprentices/owner';
import { ownerDoor } from '../door';
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
  if (ownerDoor(p) !== 'open') throw new Error('The owner’s door is not open');
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
  const members = p.household.members;
  return {
    household: [...members.filter((m) => m !== 'owner'), ...members.filter((m) => m === 'owner')],
    // A save from before the ledger shipped has the city's own opening order.
    districts: [...(ledger.districts.length > 0 ? ledger.districts : p.city.open)],
    idioms: p.named.filter((n) => n.startsWith('idiom:')),
    casts: ledger.casts,
    trips: p.city.trips,
    biggest: ledger.biggest,
  };
}

/** The credits have been watched or skipped (EN-11); idempotent. */
export function seeCredits(p: Profile): Profile {
  if (endingOf(p).creditsSeen) return p;
  return { ...p, ending: { ...endingOf(p), creditsSeen: true } };
}
