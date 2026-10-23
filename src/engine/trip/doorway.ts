import type { ApprenticeId } from '$data';
import { compiledFor, pageOf, validateLoadout } from '../run';
import type { Profile, Spell, SpellKey, Trip } from '../types';
import { chargesLeftOf, copyRune, need, perMember } from './shared';

/** What a Source is, for carrying its charges across a rewire: a rune, or a Spell Glyph. */
const sourceType = (sp: Spell): string => (sp.glyph ? `glyph:${sp.glyph}` : `rune:${sp.source}`);

/**
 * Charges after rewiring (plan S12). A Source that stays on its cell keeps its count. The Sources
 * that moved or are new take the remaining counts of Sources (across both members) that no longer
 * have a cell (across the party): first of their own type (rune or Glyph), then of any Source with the same inner
 * source rune (a Glyph swapped for its loose Bolt), highest first, never above their own maximum.
 * With none left to take (a second owned copy) they start full. Nothing is ever refilled.
 */
function carryCharges(before: Profile, after: Profile, t: Trip): Trip['charges'] {
  const next = perMember(t.party, (): Record<SpellKey, number> => ({}));
  const slot = (m: ApprenticeId) => chargesLeftOf({ charges: next }, m);
  const olds = t.party.flatMap((m) =>
    compiledFor(before, m).spells.map((sp) => ({
      m,
      sp,
      type: sourceType(sp),
      left: chargesLeftOf(t, m)[sp.key] ?? sp.charges,
    })),
  );
  const fresh = t.party.flatMap((m) =>
    compiledFor(after, m).spells.map((sp) => ({ m, sp, type: sourceType(sp) })),
  );
  const stays = (o: { m: ApprenticeId; sp: Spell; type: string }) =>
    fresh.some((f) => f.m === o.m && f.sp.key === o.sp.key && f.type === o.type);
  // Counts of Sources whose cell is gone, highest first.
  const spare = olds.filter((o) => !stays(o)).sort((a, b) => b.left - a.left);
  const kept = new Map(olds.map((o) => [`${o.m}|${o.sp.key}|${o.type}`, o.left]));
  // Biggest maximum first, so the Source that holds more gets the larger spare count.
  const moved = fresh
    .filter((f) => !kept.has(`${f.m}|${f.sp.key}|${f.type}`))
    .sort((a, b) => b.sp.charges - a.sp.charges);
  for (const f of fresh) {
    const left = kept.get(`${f.m}|${f.sp.key}|${f.type}`);
    if (left !== undefined) slot(f.m)[f.sp.key] = Math.min(left, f.sp.charges);
  }
  const take = (match: (o: (typeof spare)[number], f: (typeof moved)[number]) => boolean) => {
    for (const f of moved) {
      if (slot(f.m)[f.sp.key] !== undefined) continue;
      const i = spare.findIndex((o) => match(o, f));
      const [o] = i < 0 ? [] : spare.splice(i, 1);
      if (o) slot(f.m)[f.sp.key] = Math.min(o.left, f.sp.charges);
    }
  };
  take((o, f) => o.type === f.type);
  take((o, f) => o.sp.source === f.sp.source);
  for (const f of moved) slot(f.m)[f.sp.key] ??= f.sp.charges;
  return next;
}

/**
 * Leaves a quiet doorway (plan S11/S12): the profile takes the rewired lattices, and each Source
 * keeps the charges its rune (or Glyph) had before, so rewiring never refills a spell. Throws if
 * the party's new pages aren't ready. The trip goes back to looting if picks remain, else the Crossroads.
 */
export function applyDoorway(
  p: Profile,
  t: Trip,
  lattices: Profile['lattices'],
): { profile: Profile; trip: Trip } {
  need(t, 'doorway');
  const copied = p.household.members.map((m) => [m, pageOf({ lattices }, m).map(copyRune)]);
  const profile: Profile = { ...p, lattices: Object.fromEntries(copied) };
  const first = Object.values(validateLoadout(profile, t.party))[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  const more = t.picksLeft > 0 && t.offers.length > 0;
  const trip: Trip = {
    ...t,
    charges: carryCharges(p, profile, t),
    offers: more ? t.offers : [],
    picksLeft: more ? t.picksLeft : 0,
    status: more ? 'looting' : 'crossroads',
  };
  return { profile, trip };
}
