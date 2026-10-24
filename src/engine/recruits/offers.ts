import { APPRENTICE_IDS } from '$data';
import type { KitLootItem, OfferContributor, OfferKind } from '../districts/types';
import { bankRecruit, guaranteesFor, type RecruitKit, recruitOffers } from '../recruits';
import type { OfferSource } from '../trip/offerKinds';

/**
 * RC's offer source (recruitment plan §4, DK-R1), one line in `OFFER_SOURCES`: the `recruit` kind
 * (RC-4) and the guaranteed-page contributor (RC-3).
 */

type RecruitItem = Extract<KitLootItem, { kind: 'recruit' }>;

/**
 * The recruit card (P7): rolled at her landmark room when ready, after the normal offers; taking
 * it costs the pick; banked with `joinHousehold`; lost on a wipe (no `onWipe`) and offered again
 * on a later trip; one per apprentice per trip. A save naming an unknown apprentice is bad (a
 * founder parses, as DK-7's test card does, and banks as nothing: she is already home).
 */
const recruitKind = (kit?: RecruitKit): OfferKind<RecruitItem> => ({
  id: 'recruit',
  roll: (ctx) => recruitOffers(ctx.profile, ctx.trip, ctx.room, kit),
  onPick: (t, i) => ({ ...t, loot: [...t.loot, i] }),
  onBank: bankRecruit,
  limitPerTrip: 1,
  limitKey: (i) => i.apprentice,
  parse(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const keys = Object.keys(r);
    const apprentice = APPRENTICE_IDS.find((x) => x === r.apprentice);
    return r.kind === 'recruit' && keys.length === 2 && apprentice
      ? { kind: 'recruit', apprentice }
      : null;
  },
  card: 'recruit',
});

/** P5: at most one missing precondition page per roll, after the table's own guarantee. */
const guaranteedPage =
  (kit?: RecruitKit): OfferContributor =>
  (ctx) => {
    const must = guaranteesFor(ctx.profile, ctx.trip, ctx.room, kit);
    return must ? { must } : {};
  };

/** RC's source reading `kit`'s placements (tests pass fixtures; the game reads the districts'). */
export const recruitOffersWith = (kit?: RecruitKit): OfferSource => ({
  kinds: [recruitKind(kit)],
  contributors: [guaranteedPage(kit)],
});

export const RECRUIT_OFFERS: OfferSource = recruitOffersWith();
