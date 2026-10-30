import { type EnemyId, encountersOf, type LineId, type Meets, TUNING } from '$data';
import type { PaperId } from '$data/districts/index';
import { hearAfterTrip, hearFromBattle } from '../city';
import { KIT } from '../districts/kit';
import { type EventLog, namedIn } from '../events';
import { awardFootnotePoints, pointLines, rivalCasters } from '../footnotes';
import { witnessedIn } from '../lines';
import { findPaper } from '../papers';
import { recordGlyphCasts, tierUps } from '../profiler';
import { masksFrom } from '../proof';
import { memberById } from '../queries';
import { bankPages } from '../rivals/pages';
import { compiledFor, recordProof } from '../run';
import { awardsPage } from '../standIn';
import { accumulateStats } from '../tripStats';
import type { ActionResult, BattleState, Profile, Trip, TripStats } from '../types';
import { wipeLoot } from './offerKinds';
import { ownedBy, rollOffers } from './offers';
import { afterRoomWon, roomRoll } from './setup';
import { markCheckpoint, rememberCheckpoint, shapeOf } from './shape';
import { need, perMember, withAll } from './shared';
import { beginEncounter } from './start';

/**
 * Each firing of a line in a log (P39): a run of events stamped with the same line is one firing,
 * so a crush and the damage it deals count once, and two crushes in a row count twice only when
 * something else happened between them.
 */
export function firedLines(log: EventLog): LineId[] {
  return pointLines(log);
}

/** What a fight showed the household: terrain, states, compounds and kinds of foe (the Bench palette, P37). */
export function metIn(b: BattleState, log: EventLog): { met: Meets[]; foes: EnemyId[] } {
  const met = new Set<Meets>();
  const foes = new Set<EnemyId>();
  for (const u of b.units) {
    if (u.kind !== 'enemy') continue;
    foes.add(u.def);
    met.add(u.elite ? 'elite' : 'minion');
  }
  for (const t of b.tiles) {
    if (t.terrain.water) met.add('water');
    if (t.terrain.drop) met.add('drop');
    if (t.state) met.add(t.state.id);
    if (t.jar) met.add('jar');
    if (t.terrain.vent) met.add('vent');
    if (t.terrain.lamp) met.add('lamp');
    const key = t.piece && KIT.pieces[t.piece.id]?.bench?.met;
    if (key) met.add(key);
  }
  for (const e of log) {
    switch (e.type) {
      case 'landed':
        met.add(e.makes);
        break;
      case 'mixed':
        met.add(e.compound);
        break;
      case 'washed':
        met.add(e.was);
        met.add(e.now);
        break;
      case 'marked':
        met.add('mark');
        break;
      case 'collared':
        met.add('collar');
        break;
      case 'shieldGained':
        met.add('shielded');
        break;
      case 'held':
        met.add('held');
        break;
      case 'jarSealed':
        met.add('jar');
        break;
      case 'dropped':
        met.add('drop');
        break;
    }
  }
  for (const id of witnessedIn(log)) met.add(id.slice(id.indexOf(':') + 1) as Meets);
  return { met: [...met], foes: [...foes] };
}

/**
 * What a finished trip fight teaches the household, won or lost (D7, D4, P39, P37): named results,
 * the lines that fired (witnessed, whoever cast them), a footnote point per household firing for
 * each known subject (rival casts earn none), and what the fight met.
 */
export function learnFromFight(p: Profile, b: BattleState, log: EventLog): Profile {
  const seen = metIn(b, log);
  const learned: Profile = {
    ...p,
    named: withAll(p.named, namedIn(log)),
    witnessed: withAll(p.witnessed, witnessedIn(log)),
    met: withAll(p.met, seen.met),
    foesMet: withAll(p.foesMet, seen.foes),
  };
  return awardFootnotePoints(learned, pointLines(log, rivalCasters(b)));
}

/** A closed battle; `paper` is the room's paper when this win filed it for the first time. */
export interface EncounterEnd {
  profile: Profile;
  trip: Trip | null;
  outcome: 'won' | 'wiped';
  stats: TripStats;
  paper?: PaperId;
}

/**
 * Closes a finished battle. Named results are kept either way (knowledge isn't loot).
 * Won: HP and charges carry over for the party (a downed member returns at 1 HP) and loot is
 * offered. Wiped (every party member down): the trip ends and its pending loot is lost. `log` is the whole fight's event log; it
 * feeds the trip's stats, returned either way so a wipe can still show the trip page.
 */
export function finishEncounter(
  p: Profile,
  t: Trip,
  b: BattleState,
  log: EventLog = [],
  foughtWith: Profile = p,
): EncounterEnd {
  need(t, 'fight');
  if (b.phase === 'player') throw new Error('The battle is not over');
  // The spells as fought: a tier earned in this very fight (e.g. an extra exit) must not add cells.
  const fought = perMember(t.party, (m) => compiledFor(foughtWith, m).spells);
  const stats = accumulateStats(t.stats, log, p, fought);
  const learned = learnFromFight(p, b, log);
  if (b.phase === 'lost') return { profile: learned, trip: null, outcome: 'wiped', stats };
  // The room's paper is filed at once, so a later wipe keeps it (lore registry, DK §9).
  const filed = findPaper(learned, t.district, t.encounter);
  const paper = filed.papers.length > learned.papers.length ? filed.papers.at(-1) : undefined;
  const profile = bankPages(filed, b, t.district, awardsPage);

  const enc = encountersOf(t.district)[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  // The room's bonus and the module's `afterRoom` write the kit; then its offers (P7, P13).
  const shape = shapeOf(t.district);
  const marked = afterRoomWon(t, b, log, shape);
  const roll = roomRoll(marked.trip, enc, marked.bonus, shape);
  const withKit = {
    profile: p,
    trip: marked.trip,
    ...(roll.registry ? { registry: roll.registry } : {}),
  };
  const trip: Trip = {
    ...marked.trip,
    status: 'looting',
    // A member out of the room is hauled back at 1 HP, like a downed one (P11).
    hp: perMember(t.party, (m) => {
      const u = memberById(b, m);
      return u.out ? TUNING.reviveHp : Math.max(TUNING.reviveHp, u.hp);
    }),
    charges: perMember(t.party, (m) => ({ ...memberById(b, m).charges })),
    loot: [...marked.trip.loot],
    offers: rollOffers(t.seed, t.encounter, roll.table, t.party, null, ownedBy(p, t), withKit),
    picksLeft: roll.picks,
    actions: [],
    stats,
  };
  return {
    profile,
    trip: markCheckpoint(trip),
    outcome: 'won',
    stats,
    ...(paper ? { paper } : {}),
  };
}

/**
 * Closes a finished trip battle (M7, M16): one replay writes proof and Glyph records
 * (`recordTripCasts`, win or wipe), then `finishEncounter`; the records' tier-ups go into the trip's
 * stats. Lab, Bench and desk battles never come here.
 */
export function closeBattle(p: Profile, t: Trip, b: BattleState, log: EventLog = []): EncounterEnd {
  const recorded = recordTripCasts(p, t);
  const r = finishEncounter(recorded, t, b, log, p);
  const ups = tierUps(p, recorded);
  // Hearing is kept on a wipe (K-20): owner conditions on this log, then rumours if the trip ended.
  const owner = hearFromBattle(r.profile, t, log);
  // A wipe past the checkpoint still leaves it in the city (P5).
  // On a wipe the loot is lost, except what a kind's `onWipe` keeps (DK-7).
  const wiped =
    r.outcome === 'wiped' ? hearAfterTrip(wipeLoot(owner.profile, t.loot), t, 'wiped') : null;
  const after = wiped
    ? { ...wiped, profile: rememberCheckpoint(wiped.profile, t) }
    : { profile: owner.profile, heard: [] };
  const heard = [...owner.heard, ...after.heard];
  if (ups.length === 0 && heard.length === 0 && after.profile === r.profile) return r;
  const stats: TripStats = {
    ...r.stats,
    elegance: [...r.stats.elegance, ...ups],
    heard: [...r.stats.heard, ...heard],
  };
  return { ...r, profile: after.profile, stats, trip: r.trip ? { ...r.trip, stats } : null };
}

/**
 * Writes proof and Glyph records for a trip's current fight, win or wipe (plan P7, M7): the trip's
 * actions replay deterministically, so the full log comes from `beginEncounter`, once. Records
 * read the profile as at battle start and are written after. A fight that no longer replays
 * records nothing. Lab and Bench battles never reach this.
 */
export function recordTripCasts(p: Profile, t: Trip): Profile {
  let events: ActionResult['events'];
  try {
    events = beginEncounter(p, t).events;
  } catch {
    return p;
  }
  const proven = t.party.reduce((acc, m) => recordProof(acc, m, masksFrom(events, m)), p);
  return { ...proven, glyphRecords: recordGlyphCasts(p, events).glyphRecords };
}
