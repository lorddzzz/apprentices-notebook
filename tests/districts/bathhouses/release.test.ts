import { describe, expect, test } from 'vitest';
import { DISTRICTS, encountersOf, PLAYABLE_DISTRICTS } from '$data';
import { BATH_THRESHOLD, DOME_HEAT } from '$data/districts/bathhouses';
import {
  type BattleState,
  districtState,
  newProfile,
  newSave,
  type Profile,
  solveThreshold,
  type Trip,
} from '$engine';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import { parseBathState } from '$engine/districts/bathhouses/types';
import {
  endBattle,
  goHome,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../../src/app/flow';
import { planThreshold, thresholdStart } from '../../../src/app/threshold';

/** BH-18: the district is open: the dome opens it, and a whole trip (rooms 1-4 and the heart) plays. */

const heard = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: [...p.city.heard, 'bathhouses'] } };
};

describe('the gate', () => {
  test('playable, barred by the dome until it is solved, open after', () => {
    expect(PLAYABLE_DISTRICTS).toContain('bathhouses');
    expect(DISTRICTS.bathhouses.gate).toEqual({ kind: 'threshold', room: BATH_THRESHOLD });
    expect(districtState(heard(), 'bathhouses')).toBe('heard');
    const plan = planThreshold(heard(), 'bathhouses');
    expect(plan.ok).toBe(true);
    const solved = solveThreshold(heard(), 'bathhouses');
    expect(districtState(solved, 'bathhouses')).toBe('open');
    expect(planThreshold(solved, 'bathhouses').ok).toBe(false);
  });

  test('the dome starts with the gauge listed at heat 1 (the app lists the threshold rules)', () => {
    const s = thresholdStart(heard(), BATH_THRESHOLD).state;
    const g = boilOverState(s);
    expect(g).not.toBeNull();
    expect(g?.heat).toBe(DOME_HEAT);
    expect(g?.pressure).toBe(0);
  });
});

describe('a whole trip', () => {
  test('rooms 1-4 and the heart set up and close; the gauge is listed at each board; the trip clears', () => {
    expect(encountersOf('bathhouses')).toHaveLength(5);
    for (const seed of [1, 2, 3, 4]) {
      let save = { ...newSave(seed), profile: solveThreshold(heard(), 'bathhouses') };
      save = setOut(save, 'bathhouses');
      const heats: number[] = [];
      const titles: string[] = [];
      for (let guard = 0; guard < 40 && save.trip; guard++) {
        const t: Trip = save.trip;
        if (t.status === 'fight') {
          const s: BattleState = structuredClone(startBattle(save).state);
          heats.push(boilOverState(s)?.heat ?? 0);
          titles.push(s.title);
          s.phase = 'won';
          for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
          save = endBattle(save, s, []).save;
        } else if (t.status === 'looting') save = takeOffer(save, 0);
        else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
        else if (t.status === 'crossroads') save = pushOnward(save);
        else break;
      }
      expect(heats, `seed ${seed}`).toEqual([1, 2, 3, 4, 4]);
      expect(titles.at(-1)).toBe("The steward's caldarium");
      expect(save.trip?.status).toBe('cleared');
      expect(parseBathState(save.trip?.kit?.state).pendingCool).toBe(0);
      expect(goHome(save).profile.city.hearts).toContain('bathhouses');
    }
  });
});

test('every bathhouse room has its own id', async () => {
  const { BATHHOUSES_KIT } = await import('$data/districts/bathhouses');
  const ids = (BATHHOUSES_KIT.rooms ?? []).map((r: { id: string }) => r.id);
  expect(ids.length).toBe(5);
  expect(new Set(ids).size).toBe(ids.length);
});
