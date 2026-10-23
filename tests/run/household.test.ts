import { describe, expect, test } from 'vitest';
import { APPRENTICES, type ApprenticeId, TUNING } from '$data';
import {
  compiledFor,
  inHousehold,
  joinHousehold,
  latticeOf,
  newProfile,
  newSave,
  type Profile,
  pageOf,
  parseLattice,
  proofOf,
  returnHome,
  setSlot,
  startTrip,
  type Trip,
  tripParty,
  validateLoadout,
} from '$engine';
import { parseSaveText, saveText } from '../../src/app/save';

/** A household with only the Draughtsman, so the Stoker can join as a newcomer. */
function draughtsmanAlone(): Profile {
  const p = newProfile();
  const { stoker: _page, ...lattices } = p.lattices;
  const { stoker: _proof, ...proof } = p.proof;
  return {
    ...p,
    household: { members: ['draughtsman'], slots: ['draughtsman', null, null] },
    lattices,
    proof,
  };
}

describe('a fresh household (HC P8)', () => {
  test('the pair has joined and sits in slots 1 and 2', () => {
    const p = newProfile();
    expect(p.household).toEqual({
      members: ['draughtsman', 'stoker'],
      slots: ['draughtsman', 'stoker', null],
    });
    expect(tripParty(p)).toEqual(['draughtsman', 'stoker']);
    expect(Object.keys(p.lattices).sort()).toEqual(['draughtsman', 'stoker']);
    expect(proofOf(p, 'stoker')).toEqual([]);
  });

  test('ink is one household allowance (P6)', () => {
    expect(newProfile().ink).toBe(TUNING.startInk);
  });

  test('a v9 save round-trips through text', () => {
    let p = newProfile();
    p = setSlot(p, 0, null);
    p = setSlot(p, 2, 'draughtsman');
    const save = { ...newSave(7), profile: { ...p, ink: 13 } };
    const text = saveText(save);
    expect(JSON.parse(text).version).toBe(9);
    expect(parseSaveText(text)).toEqual(save);
  });
});

describe('joinHousehold', () => {
  test('a newcomer lands on the bench with their starter page and empty proof', () => {
    const p = joinHousehold(draughtsmanAlone(), 'stoker');
    expect(p.household.members).toEqual(['draughtsman', 'stoker']);
    expect(p.household.slots).toEqual(['draughtsman', null, null]);
    expect(inHousehold(p, 'stoker')).toBe(true);
    expect(pageOf(p, 'stoker')).toEqual(parseLattice(APPRENTICES.stoker.starterPage).runes);
    expect(proofOf(p, 'stoker')).toEqual([]);
  });

  test('the starter page compiles and fits the current ink', () => {
    const p = joinHousehold(draughtsmanAlone(), 'stoker');
    expect(compiledFor(p, 'stoker').spells.length).toBeGreaterThan(0);
    expect(validateLoadout(p)).toEqual({});
  });

  test('is idempotent: someone already in keeps their page and proof', () => {
    const p = newProfile();
    const edited = {
      ...p,
      lattices: { ...p.lattices, stoker: [] },
      proof: { ...p.proof, stoker: [[{ at: { x: 0, y: 0 }, rune: null }]] },
    };
    expect(joinHousehold(edited, 'stoker')).toBe(edited);
  });

  test('refuses an id outside the registry', () => {
    expect(() => joinHousehold(newProfile(), 'ghost' as ApprenticeId)).toThrow(/No apprentice/);
  });

  test('page and proof reads throw for someone outside the household', () => {
    const p = draughtsmanAlone();
    expect(inHousehold(p, 'stoker')).toBe(false);
    expect(() => latticeOf(p, 'stoker')).toThrow(/not in the household/);
    expect(() => proofOf(p, 'stoker')).toThrow(/not in the household/);
  });
});

describe('setSlot and tripParty', () => {
  test('fills, moves and empties slots; the party is the filled slots in order', () => {
    let p = setSlot(newProfile(), 0, null);
    expect(tripParty(p)).toEqual(['stoker']);
    p = setSlot(p, 2, 'draughtsman');
    expect(p.household.slots).toEqual([null, 'stoker', 'draughtsman']);
    expect(tripParty(p)).toEqual(['stoker', 'draughtsman']);
    p = setSlot(setSlot(p, 1, null), 2, null);
    expect(tripParty(p)).toEqual([]);
  });

  test('re-setting the same slot to the same apprentice is allowed', () => {
    const p = newProfile();
    expect(setSlot(p, 0, 'draughtsman').household).toEqual(p.household);
  });

  test('refuses a duplicate, an outsider, and any change during a trip', () => {
    const p = newProfile();
    expect(() => setSlot(p, 2, 'stoker')).toThrow(/another slot/);
    expect(() => setSlot(draughtsmanAlone(), 1, 'stoker')).toThrow(/not in the household/);
    const trip: Trip = startTrip(p, 1);
    expect(() => setSlot(p, 0, null, trip)).toThrow(/trip/);
  });
});

test('an ink pick raises the one household allowance (P6)', () => {
  const p = newProfile();
  const t: Trip = { ...startTrip(p, 1), status: 'crossroads', loot: [{ kind: 'ink', amount: 2 }] };
  const home = returnHome(p, t);
  expect(home.ink).toBe(p.ink + 2);
});
