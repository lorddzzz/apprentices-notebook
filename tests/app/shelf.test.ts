import { describe, expect, test } from 'vitest';
import {
  joinHousehold,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  setSlot,
  startTrip,
  tripParty,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend, saveText } from '../../src/app/save';
import {
  benchOf,
  bookmarksOf,
  cardOf,
  leaveHome,
  loadoutBlocker,
  NO_PARTY,
  openMemberFor,
  placeInSlot,
  seatsOf,
  TRIP_LOCK,
  visibleSlots,
} from '../../src/app/study';

/** The pair in seats 1 and 2, with the runaway, the notary and the warden waiting on the bench. */
const crowded = (): Profile =>
  ['runaway', 'notary', 'warden'].reduce(
    (p, id) => joinHousehold(p, id as 'runaway' | 'notary' | 'warden'),
    newProfile(),
  );

const profileOf = (p: Profile): Profile => p;
const slots = (p: Profile) => p.household.slots;

function game(profile: Profile = newProfile()): GameStore {
  const save: SaveData = { ...newSave(1), profile };
  return new GameStore(memoryBackend(saveText(save)), () => 1);
}

describe('which seats the shelf shows (HC P8)', () => {
  test('a two-person household shows two seats, never an empty third', () => {
    const p = newProfile();
    expect(visibleSlots(p)).toBe(2);
    expect(seatsOf(p)).toEqual(['draughtsman', 'stoker']);
    expect(benchOf(p)).toEqual([]);
  });

  test('a third member brings the third seat, empty until someone is brought', () => {
    const p = joinHousehold(newProfile(), 'runaway');
    expect(visibleSlots(p)).toBe(3);
    expect(seatsOf(p)).toEqual(['draughtsman', 'stoker', null]);
    expect(benchOf(p)).toEqual(['runaway']);
  });

  test('never more than three, and the bench keeps join order', () => {
    const p = crowded();
    expect(visibleSlots(p)).toBe(3);
    expect(benchOf(p)).toEqual(['runaway', 'notary', 'warden']);
  });
});

describe('filling and emptying seats', () => {
  test('bring fills the first empty seat and takes them off the bench', () => {
    const r = placeInSlot(crowded(), null, 'notary');
    expect('profile' in r && slots(r.profile)).toEqual(['draughtsman', 'stoker', 'notary']);
    expect('profile' in r && benchOf(r.profile)).toEqual(['runaway', 'warden']);
  });

  test('a full table says so rather than bumping someone', () => {
    const full = placeInSlot(crowded(), null, 'runaway');
    if (!('profile' in full)) throw new Error('expected the seat to fill');
    expect(placeInSlot(full.profile, null, 'notary')).toEqual({
      why: 'Every seat is taken: send someone home first',
    });
  });

  test('dropping a bench card on an occupied seat sends the sitter to the bench', () => {
    const r = placeInSlot(crowded(), null, 'warden', 0);
    if (!('profile' in r)) throw new Error('expected the seat to fill');
    expect(slots(r.profile)).toEqual(['warden', 'stoker', null]);
    expect(benchOf(r.profile)).toEqual(['draughtsman', 'runaway', 'notary']);
  });

  test('dragging a seated card onto another seat swaps the two', () => {
    const r = placeInSlot(newProfile(), null, 'draughtsman', 1);
    if (!('profile' in r)) throw new Error('expected a swap');
    expect(slots(r.profile)).toEqual(['stoker', 'draughtsman', null]);
  });

  test('dragging a seated card onto an empty seat moves it', () => {
    const r = placeInSlot(crowded(), null, 'stoker', 2);
    if (!('profile' in r)) throw new Error('expected a move');
    expect(slots(r.profile)).toEqual(['draughtsman', null, 'stoker']);
  });

  test('a seat that is not shown cannot be filled', () => {
    expect(placeInSlot(newProfile(), null, 'draughtsman', 2)).toEqual({
      why: 'There is no such seat',
    });
  });

  test('leave home empties the seat and keeps their page', () => {
    const p = newProfile();
    const r = leaveHome(p, null, 'stoker');
    if (!('profile' in r)) throw new Error('expected the seat to empty');
    expect(slots(r.profile)).toEqual(['draughtsman', null, null]);
    expect(r.profile.lattices.stoker).toEqual(p.lattices.stoker);
    expect(benchOf(r.profile)).toEqual(['stoker']);
  });

  test('someone outside the household cannot be brought', () => {
    expect(placeInSlot(newProfile(), null, 'warden')).toEqual({
      why: 'They are not in the household',
    });
  });
});

describe('the trip lock', () => {
  const trip = () => {
    const p = newProfile();
    return { p, trip: startTrip(p, 1) };
  };

  test('both actions are refused while a trip is out, and the profile is untouched', () => {
    const { p, trip: t } = trip();
    expect(placeInSlot(crowded(), t, 'notary')).toEqual({ why: TRIP_LOCK });
    expect(leaveHome(p, t, 'stoker')).toEqual({ why: TRIP_LOCK });
  });

  test('the store refuses by tap and by drag, and writes nothing', () => {
    const base = crowded();
    const g = game(base);
    g.save = { ...g.save, trip: startTrip(base, 1) };
    expect(g.bring('notary')).toBe(TRIP_LOCK);
    expect(g.bring('notary', 1)).toBe(TRIP_LOCK);
    expect(g.sendHome('stoker')).toBe(TRIP_LOCK);
    expect(slots(g.profile)).toEqual(['draughtsman', 'stoker', null]);
  });

  test('the store fills and empties seats at home, and saves them', () => {
    const backend = memoryBackend(saveText({ ...newSave(1), profile: crowded() }));
    const g = new GameStore(backend, () => 1);
    expect(g.bring('runaway')).toBeNull();
    expect(g.sendHome('draughtsman')).toBeNull();
    expect(slots(g.profile)).toEqual([null, 'stoker', 'runaway']);
    const again = new GameStore(backend, () => 1);
    expect(slots(again.profile)).toEqual([null, 'stoker', 'runaway']);
  });
});

describe('the lattice editor bookmarks (HC P11)', () => {
  test('the slotted party in slot order', () => {
    const p = setSlot(crowded(), 2, 'notary');
    expect(bookmarksOf(p, 'stoker')).toEqual(['draughtsman', 'stoker', 'notary']);
  });

  test('plus the open page when its owner is on the bench', () => {
    expect(bookmarksOf(crowded(), 'warden')).toEqual(['draughtsman', 'stoker', 'warden']);
  });

  test('a page stays open after its owner is sent home', () => {
    const r = leaveHome(newProfile(), null, 'stoker');
    if (!('profile' in r)) throw new Error('expected the seat to empty');
    expect(bookmarksOf(r.profile, 'stoker')).toEqual(['draughtsman', 'stoker']);
  });

  test('the open page falls back to someone in the household', () => {
    expect(openMemberFor(newProfile(), 'warden')).toBe('draughtsman');
    expect(openMemberFor(crowded(), 'warden')).toBe('warden');
  });
});

describe('cards and the dormant flag (HC P12)', () => {
  test('the founders are never dormant, though Jar and Fork are not in a new notebook', () => {
    const p = newProfile();
    expect(p.known).not.toContain('jar');
    expect(cardOf(p, 'draughtsman').dormant).toBe(false);
    expect(cardOf(p, 'stoker').dormant).toBe(false);
  });

  test('a recruit whose habit leans on an unknown rune is dormant, and names it', () => {
    const p = crowded();
    const card = cardOf(p, 'runaway');
    expect(p.known).not.toContain('fuse');
    expect(card.dormant).toBe(true);
    expect(card.habit?.leansOn).toBe('Fuse');
    expect(cardOf({ ...p, known: [...p.known, 'fuse'] }, 'runaway').dormant).toBe(false);
  });

  test('a card reads only registry fields: body, school chips, seat', () => {
    const card = cardOf(crowded(), 'stoker');
    expect(card.def).toMatchObject({ name: 'Stoker', hp: 8, move: 3, action: 'shove' });
    expect(card.trained).toBe('Seam');
    expect(card.gifted).toBeNull(); // trained and gifted in one school: one chip
    expect(card.slot).toBe(1);
    expect(cardOf(crowded(), 'warden').slot).toBeNull();
  });
});

describe('Set Out needs a party', () => {
  test('an empty party is named as the blocker', () => {
    const p = profileOf(setSlot(setSlot(newProfile(), 0, null), 1, null));
    expect(tripParty(p)).toEqual([]);
    expect(loadoutBlocker(p)).toBe(NO_PARTY);
  });

  test('the store refuses to set out with nobody slotted', () => {
    const p = setSlot(setSlot(newProfile(), 0, null), 1, null);
    const g = game(p);
    expect(g.setOut('seam')).toMatch(/Nobody is in a trip slot/);
    expect(g.save.trip).toBeNull();
  });

  test('a benched page with problems does not block a party that is ready', () => {
    const p = crowded(); // the runaway's starter page uses runes a new notebook does not know
    expect(loadoutBlocker(p)).toBeNull();
    const r = placeInSlot(setSlot(p, 1, null), null, 'runaway');
    if (!('profile' in r)) throw new Error('expected the seat to fill');
    expect(loadoutBlocker(r.profile)).toMatch(/^Lamp-pole runaway: /);
  });
});
