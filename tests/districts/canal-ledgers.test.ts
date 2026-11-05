import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { CANAL_LEDGERS } from '$data/districts/canals';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  startTrip,
  type Trip,
} from '$engine';
import { findLandingPaper, papersView } from '$engine/papers';

/** CN-9 (canals revisit P9): the lamp-ledgers, delivered at landings through the real canals. */

const ids = CANAL_LEDGERS.map((l) => l.id);
const open = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, open: [...p.city.open, 'canals'] } };
};

function fought(b: BattleState, phase: 'won' | 'lost'): BattleState {
  const s = structuredClone(b);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return s;
}

/** Wins the current room and takes the first offers. */
function clear(p: Profile, t: Trip): { profile: Profile; trip: Trip } {
  const r = finishEncounter(p, t, fought(beginEncounter(p, t).state, 'won'));
  let trip = r.trip;
  if (!trip) throw new Error('expected a trip');
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return { profile: r.profile, trip };
}

/** A trip's rooms 0..last: the papers filed after each win. */
function runRooms(p: Profile, seed: number, last: number): Profile[] {
  const filed: Profile[] = [];
  let profile = p;
  let trip = startTrip(p, seed, 'canals');
  for (let room = 0; room <= last; room++) {
    const r = clear(profile, room === 0 ? trip : pushOn(trip));
    profile = r.profile;
    trip = r.trip;
    filed.push(profile);
  }
  return filed;
}

describe('canal lamp-ledgers (CN-9)', () => {
  test('five non-empty leaves of 40-90 words, registered on the canals', () => {
    expect(CANAL_LEDGERS).toHaveLength(5);
    for (const l of CANAL_LEDGERS) {
      const words = l.text.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(40);
      expect(words).toBeLessThanOrEqual(90);
    }
    expect(DISTRICTS.canals.papers).toBe(CANAL_LEDGERS);
  });

  test('leaf n at landing n in order: one leaf per landing, nothing between', () => {
    // Landings are after rooms 1, 3 and 5 (indices 0, 2, 4); the rest of the rooms file nothing.
    const filed = runRooms(open(), 7, 4);
    expect(filed.map((p) => p.papers)).toEqual([
      [ids[0]],
      [ids[0]],
      [ids[0], ids[1]],
      [ids[0], ids[1]],
      [ids[0], ids[1], ids[2]],
    ]);
  });

  test('never repeated: the next trip files the next unread leaves, then nothing more', () => {
    const first = runRooms(open(), 7, 4).at(-1);
    if (!first) throw new Error('no profile');
    const second = runRooms(first, 8, 4).at(-1);
    expect(second?.papers).toEqual(ids);
    // Every leaf read: a fifth landing files nothing.
    const third = runRooms(second as Profile, 9, 4).at(-1);
    expect(third?.papers).toEqual(ids);
  });

  test('banked at once and kept on a wipe', () => {
    const p0 = open();
    const t0 = startTrip(p0, 11, 'canals');
    const r = finishEncounter(p0, t0, fought(beginEncounter(p0, t0).state, 'won'));
    // Filed in the result before any loot is picked or the trip is banked.
    expect(r.profile.papers).toEqual([ids[0]]);
    expect(r.paper).toBe(ids[0]);
    const trip = r.trip;
    if (!trip) throw new Error('expected a trip');
    const next = pushOn(pickLooted(trip));
    const wiped = finishEncounter(
      r.profile,
      next,
      fought(beginEncounter(r.profile, next).state, 'lost'),
    );
    expect(wiped.outcome).toBe('wiped');
    expect(wiped.profile.papers).toEqual([ids[0]]);
  });

  test('a room that is no landing finds nothing; present in the codex data', () => {
    const p = open();
    expect(findLandingPaper(p, 'canals', false)).toBe(p);
    const found = findLandingPaper(findLandingPaper(p, 'canals', true), 'canals', true);
    expect(found.papers).toEqual([ids[0], ids[1]]);
    const view = papersView(found);
    expect(view).toHaveLength(1);
    expect(view[0]?.group).toBe('Lamp-ledgers');
    expect(view[0]?.papers.map((x) => x.title)).toEqual(['The route', 'Lamp counts']);
    expect(view[0]?.papers.every((x) => x.text.length > 0)).toBe(true);
  });

  test('saves round-trip the filed leaves', () => {
    const p = findLandingPaper(newProfile(), 'canals', true);
    const back = parseSaveData(JSON.parse(JSON.stringify({ ...newSave(1), profile: p }))).profile;
    expect(back.papers).toEqual([ids[0]]);
  });
});

function pickLooted(t: Trip): Trip {
  let trip = t;
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}
