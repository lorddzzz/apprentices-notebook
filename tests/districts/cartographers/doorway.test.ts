import { describe, expect, test } from 'vitest';
import {
  applyDoorway,
  type BattleState,
  choicesAt,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pushOn,
  type SaveData,
  type Trip,
  takeChoice,
} from '$engine';
import { chooseWay, crossroadsView, setOutAt } from '../../../src/app/crossroads';
import { endBattle, leaveDoorway, startBattle, takeOffer } from '../../../src/app/flow';

/** CG-8b (cartographers-plan P13): the Through-the-doorway choice opens the quiet doorway, then room 4. */

const DISTRICT = 'cartographers';
const open = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: [...p.city.heard, DISTRICT], open: [...p.city.open, DISTRICT] },
  };
};
const tripOf = (save: SaveData): Trip => {
  if (!save.trip) throw new Error('expected a trip');
  return save.trip;
};
const out = (seed: number): SaveData =>
  setOutAt({ ...newSave(seed), profile: open() }, DISTRICT, 'start');

function winRoom(save: SaveData): SaveData {
  const s: BattleState = structuredClone(startBattle(save).state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return endBattle(save, s, []).save;
}
function toCrossroads(save: SaveData): SaveData {
  let next = winRoom(save);
  while (tripOf(next).status === 'looting') next = takeOffer(next, 0);
  if (tripOf(next).status === 'doorway') next = leaveDoorway(next, next.profile);
  return next;
}
/** A trip standing at the Crossroads after room 3. */
function atDoorwayCrossroads(seed: number): SaveData {
  let save = out(seed);
  for (let room = 0; room < 3; room++) {
    save = toCrossroads(save);
    if (room < 2) save = chooseWay(save, 'push');
  }
  expect(tripOf(save).status).toBe('crossroads');
  expect(tripOf(save).encounter).toBe(2);
  return save;
}

describe('CG-8b the through-doorway', () => {
  test('CG-8b: through the doorway opens the rewiring, then room 4', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const save = atDoorwayCrossroads(seed);
      const view = crossroadsView(tripOf(save));
      expect(view.ways).toHaveLength(1);
      expect(view.ways[0]?.sub).toMatch(/^Rewire at the quiet doorway, then .+ \(depth 4 of 6\)$/);
      const at = chooseWay(save, 'doorway');
      const t = tripOf(at);
      expect(t.status, `seed ${seed}`).toBe('doorway');
      expect(t.encounter).toBe(2);
      expect(t.kit?.choices.at(-1)).toMatchObject({ after: 2, id: 'doorway' });
      expect(t.kit?.checkpoint).toBe(true);
      const through = applyDoorway(at.profile, t, at.profile.lattices);
      expect(through.trip.status).toBe('fight');
      expect(through.trip.encounter).toBe(3);
      expect(through.trip.charges).toEqual(t.charges);
      // The app's way out of the Study does the same.
      expect(tripOf(leaveDoorway(at, at.profile)).encounter).toBe(3);
      // No way back once through: the Crossroads after room 4 shuts the way home.
      const next = toCrossroads(leaveDoorway(at, at.profile));
      expect(choicesAt(tripOf(next)).find((c) => c.kind === 'return')?.disabled).toBeTruthy();
    }
  });

  test('CG-8b: a doorway from loot still returns to the cards or the Crossroads', () => {
    const t = tripOf(out(4));
    const p = open();
    const cards: Trip = {
      ...t,
      status: 'doorway',
      offers: [{ kind: 'vellum', amount: 1 }],
      picksLeft: 1,
    };
    expect(applyDoorway(p, cards, p.lattices).trip).toMatchObject({
      status: 'looting',
      encounter: 0,
    });
    const none: Trip = { ...t, status: 'doorway', offers: [], picksLeft: 0 };
    expect(applyDoorway(p, none, p.lattices).trip).toMatchObject({
      status: 'crossroads',
      encounter: 0,
    });
    // A loot doorway in room 3, before the choice is taken, still goes to the Crossroads.
    const late: Trip = {
      ...tripOf(atDoorwayCrossroads(8)),
      status: 'doorway',
      offers: [],
      picksLeft: 0,
    };
    expect(applyDoorway(p, late, p.lattices).trip).toMatchObject({
      status: 'crossroads',
      encounter: 2,
    });
  });

  test('CG-8b: pushOn takes the only way on', () => {
    const t = tripOf(atDoorwayCrossroads(5));
    const via = pushOn(t);
    expect(via).toEqual(takeChoice(t, 'doorway'));
    expect(via.status).toBe('doorway');
    // A room whose module names no way takes the default push.
    const early = tripOf(toCrossroads(out(5)));
    expect(pushOn(early)).toMatchObject({ status: 'fight', encounter: 1 });
  });

  test('CG-8b: a reload in the through-doorway resumes it', () => {
    const at = chooseWay(atDoorwayCrossroads(6), 'doorway');
    const reloaded = parseSaveData(JSON.parse(JSON.stringify(at)));
    expect(reloaded).toEqual(at);
    const t = tripOf(reloaded);
    expect(t.status).toBe('doorway');
    const next = applyDoorway(reloaded.profile, t, reloaded.profile.lattices).trip;
    expect(next).toMatchObject({ status: 'fight', encounter: 3 });
  });
});
