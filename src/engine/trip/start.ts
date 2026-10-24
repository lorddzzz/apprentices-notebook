import { APPRENTICES, type ApprenticeId, DISTRICTS, type DistrictId, encountersOf } from '$data';
import { applyAction, createEncounterBattle } from '../battle';
import type { StartAt } from '../districts/types';
import { footnoteIds } from '../footnotes';
import { tripParty } from '../household';
import { deriveSeed } from '../rng';
import { startSeedFor } from '../rooms';
import { compiledFor, inventionLibrary, validateLoadout } from '../run';
import { emptyStats } from '../tripStats';
import type { Action, ActionResult, PartyInit, Profile, SpellKey, Trip } from '../types';
import { variantFor } from './place';
import { checkpointRoom, newTripKit, shapeOf } from './shape';
import { chargesLeftOf, hpOf, need, perMember } from './shared';

export function chargesOf(p: Profile, m: ApprenticeId): Record<SpellKey, number> {
  return Object.fromEntries(compiledFor(p, m).spells.map((sp) => [sp.key, sp.charges]));
}

/**
 * A new trip into an open district with the slotted apprentices (1–3, slot order, HC-4) at full
 * HP and full charges. Only their pages are checked; the bench may hold an unfinished one.
 * Throws with nobody slotted or a party page that has issues.
 *
 * `at: 'checkpoint'` starts past a checkpoint the city remembers (P5): the first fight is the
 * room after it, still at full HP and charges. Throws when the district has none reached.
 */
export function startTrip(
  p: Profile,
  seed: number,
  district: DistrictId = 'seam',
  opts: { at?: StartAt } = {},
): Trip {
  const party = tripParty(p);
  if (party.length === 0) throw new Error('Nobody is in a trip slot');
  const issues = validateLoadout(p, party);
  const first = Object.values(issues)[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  if (!p.city.open.includes(district)) throw new Error(`${DISTRICTS[district].name} is not open`);
  const shape = shapeOf(district);
  const kit = newTripKit(shape);
  let encounter = 0;
  if (opts.at === 'checkpoint') {
    const cp = shape.checkpoint;
    if (!cp || !kit || p.city.checkpoints?.[district] !== cp.after) {
      throw new Error(`${DISTRICTS[district].name} has no checkpoint reached`);
    }
    encounter = checkpointRoom(cp);
    kit.checkpoint = true;
  }
  const trip: Trip = {
    district,
    seed,
    encounter,
    status: 'fight',
    party,
    hp: perMember(party, (m) => APPRENTICES[m].hp),
    charges: perMember(party, (m) => chargesOf(p, m)),
    loot: [],
    offers: [],
    picksLeft: 0,
    actions: [],
    stats: emptyStats(),
  };
  if (kit) trip.kit = kit;
  return trip;
}

/**
 * The current encounter's battle: the party enters with the trip's HP and charges on start points
 * drawn from the trip seed (`startSeedFor`, HC P4), then the trip's recorded actions are replayed
 * (a reload resumes the fight). Throws if one is illegal.
 */
export function beginEncounter(p: Profile, t: Trip): ActionResult {
  need(t, 'fight');
  const enc = encountersOf(t.district)[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  const party = perMember(
    t.party,
    (m): PartyInit => ({
      hp: hpOf(t, m),
      spells: compiledFor(p, m).spells,
      charges: { ...chargesOf(p, m), ...chargesLeftOf(t, m) },
    }),
  );
  const first = createEncounterBattle(
    enc,
    party,
    deriveSeed(t.seed, t.encounter),
    variantFor(t, t.encounter),
    t.district,
    inventionLibrary(p),
    { lineup: t.party, startSeed: startSeedFor(t, t.encounter) },
  );
  let state = first.state;
  const events = [...first.events];
  const footnotes = footnoteIds(p);
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
