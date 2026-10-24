import { encountersOf } from '$data';
import { hearAfterTrip } from '../city';
import type { Profile, Trip } from '../types';
import { takeChoice } from './choices';
import { bankLoot, kindOf, type OfferRegistry, offerRegistry } from './offerKinds';
import { returnCheck } from './ret';
import { rememberCheckpoint } from './shape';
import { need } from './shared';

/**
 * Takes offer `index`: the pick is spent, then the item's kind decides what taking it does (most
 * go into the trip's loot; a doorway opens field rewiring instead, plan S11; DK-7).
 */
export function pickLoot(t: Trip, index: number, reg: OfferRegistry = offerRegistry()): Trip {
  need(t, 'looting');
  const item = t.offers[index];
  if (!item) throw new Error(`No offer ${index}`);
  const spent: Trip = {
    ...t,
    loot: [...t.loot],
    offers: t.offers.filter((_, i) => i !== index),
    picksLeft: t.picksLeft - 1,
  };
  // The kind acts before "done" is read, so a kind that raises `picksLeft` keeps the looting open.
  const after = kindOf(item, reg).onPick(spent, item);
  const done = after.picksLeft <= 0 || after.offers.length === 0;
  const heart = encountersOf(t.district)[t.encounter]?.heart ?? false;
  return {
    ...after,
    offers: done ? [] : after.offers,
    picksLeft: done ? 0 : after.picksLeft,
    status:
      after.status === 'doorway'
        ? 'doorway'
        : done
          ? heart
            ? 'cleared'
            : 'crossroads'
          : 'looting',
  };
}

/**
 * Deeper into the district: the next encounter becomes current. The default way on; a district
 * whose module names its own ways (span choices, the doorway) goes through `chooseAt` (P4).
 */
export function pushOn(t: Trip): Trip {
  return takeChoice(t, 'push');
}

/**
 * Banks the trip's loot into the profile through each item's kind (rune and method pages teach,
 * P34; keys open their district, K-23), then the trip counts and rumours are heard (K-20) and a
 * reached checkpoint is remembered (P5). Throws where the way home is shut (K-4, P3).
 */
export function returnHome(p: Profile, t: Trip, reg: OfferRegistry = offerRegistry()): Profile {
  need(t, 'crossroads', 'cleared');
  const check = returnCheck(t);
  if (!check.ok) throw new Error(check.why || 'There is no landing here');
  const banked = bankLoot(p, t.loot, reg);
  return rememberCheckpoint(hearAfterTrip(banked, t, 'returned').profile, t);
}
