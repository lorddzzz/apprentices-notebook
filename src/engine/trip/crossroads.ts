import { encountersOf } from '$data';
import { bankKeys, canReturn, hearAfterTrip } from '../city';
import type { Profile, Trip } from '../types';

import { need } from './shared';

export function pickLoot(t: Trip, index: number): Trip {
  need(t, 'looting');
  const item = t.offers[index];
  if (!item) throw new Error(`No offer ${index}`);
  const offers = t.offers.filter((_, i) => i !== index);
  const picksLeft = t.picksLeft - 1;
  const done = picksLeft <= 0 || offers.length === 0;
  const heart = encountersOf(t.district)[t.encounter]?.heart ?? false;
  // A doorway costs the pick but is never banked: it opens field rewiring (plan S11).
  const doorway = item.kind === 'doorway';
  return {
    ...t,
    loot: doorway ? t.loot : [...t.loot, item],
    offers: done ? [] : offers,
    picksLeft: done ? 0 : picksLeft,
    status: doorway ? 'doorway' : done ? (heart ? 'cleared' : 'crossroads') : 'looting',
  };
}

/** Deeper into the district: the next encounter becomes current. */
export function pushOn(t: Trip): Trip {
  need(t, 'crossroads');
  if (t.encounter + 1 >= encountersOf(t.district).length)
    throw new Error('There is nothing deeper');
  return { ...t, encounter: t.encounter + 1, status: 'fight' };
}

/**
 * Banks the trip's loot into the profile (rune and method pages teach, P34; keys open their
 * district, K-23), then the trip counts and rumours are heard (K-20). Throws away from a landing (K-4).
 */
export function returnHome(p: Profile, t: Trip): Profile {
  need(t, 'crossroads', 'cleared');
  if (!canReturn(t)) throw new Error('There is no landing here');
  const known = [...p.known];
  const methods = [...p.methods];
  let ink = p.ink;
  const solvents = { ...p.solvents };
  const solventsFound = [...p.solventsFound];
  let vellum = p.vellum;
  for (const item of t.loot) {
    if (item.kind === 'rune' && !known.includes(item.rune)) known.push(item.rune);
    else if (item.kind === 'method' && !methods.includes(item.method)) methods.push(item.method);
    else if (item.kind === 'ink') ink += item.amount;
    else if (item.kind === 'solvent') {
      solvents[item.solvent] += 1;
      if (!solventsFound.includes(item.solvent)) solventsFound.push(item.solvent);
    } else if (item.kind === 'vellum') vellum += item.amount;
  }
  const banked = bankKeys({ ...p, known, methods, ink, solvents, solventsFound, vellum }, t.loot);
  return hearAfterTrip(banked, t, 'returned').profile;
}
