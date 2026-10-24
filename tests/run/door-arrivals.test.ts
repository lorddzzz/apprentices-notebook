import { describe, expect, test } from 'vitest';
import { type InventionDef, type RuneId, TUNING } from '$data';
import {
  inHousehold,
  joinHousehold,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import {
  doorArrivals,
  isRevealed,
  knockAtDoor,
  noteMilestone,
  preconditionsOf,
  welcome,
} from '$engine/recruits';
import {
  endBattle,
  goHome,
  importSave,
  setOut,
  settleAtDoor,
  startBattle,
} from '../../src/app/flow';
import { saveText } from '../../src/app/save';

/** RC-6 (recruitment plan P3, P4, P12): door arrivals, the notes under the attic door. */

const INV: InventionDef = {
  id: 'inv:lantern',
  name: 'Lantern',
  method: 'repeat',
  parts: ['spark'],
  solvent: null,
};

const learn = (p: Profile, runes: readonly RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
const named = (p: Profile, ...n: string[]): Profile => ({ ...p, named: [...p.named, ...n] });
/** `n` proof masks for the draughtsman, each firing the invention's cell (P4). */
const proven = (p: Profile, n = TUNING.provenCasts): Profile => ({
  ...p,
  inventions: [INV],
  proof: {
    ...p.proof,
    draughtsman: Array.from({ length: n }, () => [{ at: { x: 1, y: 1 }, rune: INV.id }]),
  },
});
/** Everything the Copyist waits for except the runaway in the household. */
const copyistBeats = (p: Profile): Profile =>
  named(learn(p, preconditionsOf('copyist').runes.all), 'idiom:bonfire');
/** Everything the exile waits for. */
const exileBeats = (p: Profile): Profile => proven(learn(p, preconditionsOf('exile').runes.all));
const notes = (p: Profile) => p.recruits?.notes ?? [];

/** A save at the Seam's first crossroads, ready to return home with `loot`. */
function atCrossroads(profile: Profile, loot: Trip['loot'] = []): SaveData {
  const save = { ...newSave(7), profile };
  return { ...save, trip: { ...startTrip(profile, 1), status: 'crossroads', loot } };
}

describe('doorArrivals (P3, P4)', () => {
  test('a fresh notebook has no one at the door, and knocking changes nothing', () => {
    const p = newProfile();
    expect(doorArrivals(p)).toBeNull();
    expect(knockAtDoor(p)).toBe(p);
    expect(p.recruits).toBeUndefined();
  });

  test('the Copyist never knocks before the runaway joins', () => {
    const p = copyistBeats(newProfile());
    expect(doorArrivals(p)).toBeNull();
    expect(doorArrivals(joinHousehold(p, 'runaway'))).toBe('copyist');
  });

  test('each of her beats is needed: idiom, Touch', () => {
    const p = joinHousehold(copyistBeats(newProfile()), 'runaway');
    expect(doorArrivals({ ...p, named: [] })).toBeNull();
    expect(doorArrivals({ ...p, known: p.known.filter((r) => r !== 'touch') })).toBeNull();
  });

  test('the exile needs all three Board pages and a proven invention', () => {
    const p = exileBeats(newProfile());
    expect(doorArrivals(p)).toBe('exile');
    expect(doorArrivals(proven(p, TUNING.provenCasts - 1))).toBeNull();
    expect(doorArrivals({ ...p, known: p.known.filter((r) => r !== 'erase') })).toBeNull();
  });

  test('at most one note per homecoming, door A first', () => {
    const p = exileBeats(joinHousehold(copyistBeats(newProfile()), 'runaway'));
    const first = knockAtDoor(p);
    expect(notes(first)).toEqual(['copyist']);
    const second = knockAtDoor(first);
    expect(notes(second)).toEqual(['copyist', 'exile']);
    expect(knockAtDoor(second)).toBe(second);
  });

  test('no note on the homecoming a district recruit joined', () => {
    const p = exileBeats(newProfile());
    expect(knockAtDoor(p, true)).toBe(p);
  });

  test('a lapsed proof keeps a written note', () => {
    const p = knockAtDoor(exileBeats(newProfile()));
    const lapsed: Profile = { ...p, proof: { ...p.proof, draughtsman: [] } };
    expect(doorArrivals(lapsed)).toBeNull();
    expect(notes(knockAtDoor(lapsed))).toEqual(['exile']);
    expect(isRevealed(lapsed, 'exile')).toBe(true);
    expect(inHousehold(welcome(lapsed, 'exile'), 'exile')).toBe(true);
  });
});

describe('welcome and isRevealed', () => {
  test('welcome removes the note and seats her on the bench with her page', () => {
    const p = knockAtDoor(exileBeats(newProfile()));
    expect(isRevealed(newProfile(), 'exile')).toBe(false);
    expect(isRevealed(p, 'exile')).toBe(true);
    const w = welcome(p, 'exile');
    expect(notes(w)).toEqual([]);
    expect(inHousehold(w, 'exile')).toBe(true);
    expect(w.household.slots).toEqual(p.household.slots);
    expect(w.lattices.exile?.length).toBeGreaterThan(0);
    expect(isRevealed(w, 'exile')).toBe(true);
  });

  test('welcome is idempotent, and refused without a note', () => {
    const w = welcome(knockAtDoor(exileBeats(newProfile())), 'exile');
    expect(welcome(w, 'exile')).toBe(w);
    expect(() => welcome(newProfile(), 'copyist')).toThrow();
  });

  test('a welcomed arrival never knocks again', () => {
    const w = welcome(knockAtDoor(exileBeats(newProfile())), 'exile');
    expect(doorArrivals(w)).toBeNull();
  });

  test('the note names the milestone (P12)', () => {
    const p = exileBeats(joinHousehold(copyistBeats(newProfile()), 'runaway'));
    expect(noteMilestone(p, 'copyist')).toBe('idiom:bonfire');
    expect(noteMilestone(p, 'exile')).toBe('Lantern');
    expect(noteMilestone(p, 'runaway')).toBeNull();
  });
});

describe('the flow: home, wipe, load', () => {
  test('goHome on a fresh notebook writes no field', () => {
    const home = goHome(atCrossroads(newProfile()));
    expect(home.profile.recruits).toBeUndefined();
  });

  test('the runaway joins on one homecoming, the Copyist knocks on the next', () => {
    const p = copyistBeats(newProfile());
    const first = goHome(atCrossroads(p, [{ kind: 'recruit', apprentice: 'runaway' }]));
    expect(inHousehold(first.profile, 'runaway')).toBe(true);
    expect(notes(first.profile)).toEqual([]);
    const second = goHome(atCrossroads(first.profile));
    expect(notes(second.profile)).toEqual(['copyist']);
  });

  test('a wipe sends the party home and a ready arrival knocks', () => {
    const save = setOut({ ...newSave(7), profile: exileBeats(newProfile()) });
    const end = endBattle(save, { ...startBattle(save).state, phase: 'lost' });
    expect(end.outcome).toBe('wiped');
    expect(notes(end.save.profile)).toEqual(['exile']);
  });

  test('a won fight writes nothing (still out)', () => {
    const save = setOut({ ...newSave(7), profile: exileBeats(newProfile()) });
    const end = endBattle(save, { ...startBattle(save).state, phase: 'won' });
    expect(end.save.profile.recruits).toBeUndefined();
  });

  test('on load at home a ready arrival knocks; out on a trip nothing changes', () => {
    const home = { ...newSave(7), profile: exileBeats(newProfile()) };
    expect(notes(settleAtDoor(home).profile)).toEqual(['exile']);
    expect(notes(importSave(saveText(home)).profile)).toEqual(['exile']);
    const out = setOut(home);
    expect(settleAtDoor(out)).toBe(out);
    const fresh = newSave(7);
    expect(settleAtDoor(fresh)).toBe(fresh);
  });
});

describe('save parsing', () => {
  const withNotes = (n: unknown) => {
    const save = newSave(7);
    return { ...save, profile: { ...save.profile, recruits: { notes: n } } };
  };
  const parse = (data: unknown) => parseSaveData(JSON.parse(JSON.stringify(data)));

  test('notes round-trip; an absent field reads as none', () => {
    expect(parse(withNotes(['copyist', 'exile'])).profile.recruits).toEqual({
      notes: ['copyist', 'exile'],
    });
    expect(parse(newSave(7)).profile.recruits).toBeUndefined();
  });

  test('refuses district recruits, unknown ids, repeats, members and extra fields', () => {
    for (const n of [['runaway'], ['nobody'], ['exile', 'exile'], ['draughtsman']])
      expect(() => parse(withNotes(n))).toThrow();
    const save = newSave(7);
    const welcomed = joinHousehold(save.profile, 'exile');
    expect(() =>
      parse({ ...save, profile: { ...welcomed, recruits: { notes: ['exile'] } } }),
    ).toThrow();
    expect(() =>
      parse({ ...save, profile: { ...save.profile, recruits: { notes: [], x: 1 } } }),
    ).toThrow();
  });
});
