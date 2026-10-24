import { encountersOf } from '$data';
import { bankKeys, hearAfterTrip } from '../city';
import type { Profile, Trip } from '../types';
import { takeChoice } from './choices';
import { returnCheck } from './ret';
import { rememberCheckpoint } from './shape';
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

/**
 * Deeper into the district: the next encounter becomes current. The default way on; a district
 * whose module names its own ways (span choices, the doorway) goes through `chooseAt` (P4).
 */
export function pushOn(t: Trip): Trip {
  return takeChoice(t, 'push');
}

/**
 * Banks the trip's loot into the profile (rune and method pages teach, P34; keys open their
 * district, K-23), then the trip counts and rumours are heard (K-20) and a reached checkpoint is
 * remembered (P5). Throws where the way home is shut (K-4, P3).
 */
export function returnHome(p: Profile, t: Trip): Profile {
  need(t, 'crossroads', 'cleared');
  const check = returnCheck(t);
  if (!check.ok) throw new Error(check.why || 'There is no landing here');
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
  return rememberCheckpoint(hearAfterTrip(banked, t, 'returned').profile, t);
}
