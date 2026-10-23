import {
  DISTRICTS,
  type DistrictId,
  encountersOf,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
} from '$data';
import { applyAction, createEncounterBattle } from '../battle';
import { footnoteTexts } from '../footnotes';
import { deriveSeed } from '../rng';
import { compiledFor, inventionLibrary, validateLoadout } from '../run';
import { emptyStats } from '../tripStats';
import type { Action, ActionResult, PartyInit, Profile, SpellKey, Trip } from '../types';
import { variantFor } from './place';
import { need, perMember } from './shared';

export function chargesOf(p: Profile, m: MemberId): Record<SpellKey, number> {
  return Object.fromEntries(compiledFor(p, m).spells.map((sp) => [sp.key, sp.charges]));
}

/** A new trip into an open district with full HP and full charges. Throws if the loadout has issues. */
export function startTrip(p: Profile, seed: number, district: DistrictId = 'seam'): Trip {
  const issues = validateLoadout(p);
  const first = Object.values(issues)[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  if (!p.city.open.includes(district)) throw new Error(`${DISTRICTS[district].name} is not open`);
  return {
    district,
    seed,
    encounter: 0,
    status: 'fight',
    hp: perMember((m) => MEMBERS[m].hp),
    charges: perMember((m) => chargesOf(p, m)),
    loot: [],
    offers: [],
    picksLeft: 0,
    actions: [],
    stats: emptyStats(),
  };
}

/**
 * The current encounter's battle: the party enters with the trip's HP and charges, then the
 * trip's recorded actions are replayed (a reload resumes the fight). Throws if one is illegal.
 */
export function beginEncounter(p: Profile, t: Trip): ActionResult {
  need(t, 'fight');
  const enc = encountersOf(t.district)[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  const party: Partial<Record<MemberId, PartyInit>> = {};
  for (const m of MEMBER_IDS) {
    const spells = compiledFor(p, m).spells;
    party[m] = {
      hp: t.hp[m],
      spells,
      charges: { ...chargesOf(p, m), ...t.charges[m] },
    };
  }
  const first = createEncounterBattle(
    enc,
    party,
    deriveSeed(t.seed, t.encounter),
    variantFor(t, t.encounter),
    t.district,
    inventionLibrary(p),
  );
  let state = first.state;
  const events = [...first.events];
  const footnotes = footnoteTexts(p);
  for (const a of t.actions) {
    const r = applyAction(state, a, footnotes);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

/** Remembers a battle action so a reload can replay the fight up to here. */
export function recordAction(t: Trip, action: Action): Trip {
  need(t, 'fight');
  return { ...t, actions: [...t.actions, structuredClone(action)] };
}
