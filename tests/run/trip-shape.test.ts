import { describe, expect, test, vi } from 'vitest';
import {
  type BattleState,
  beginEncounter,
  canReturn,
  choicesAt,
  closeBattle,
  type DistrictShape,
  finishEncounter,
  NO_WAY_HOME,
  newProfile,
  newSave,
  nextLanding,
  type Profile,
  parseSaveData,
  pickLoot,
  placeOf,
  pushOn,
  returnCheck,
  returnHome,
  shapeOf,
  startTrip,
  type Trip,
  takeChoice,
  variantFor,
} from '$engine';
import { chooseAt, crossroadsChoices, returnPolicy } from '$engine/districts/index';
import type { TripShapeDef } from '$engine/districts/types';

/**
 * DK-5a: the trip shape's return side. The canals are given the Cartographers' shape here (free
 * home after rooms 1–3, the doorway after room 3 as checkpoint and point of no return) so the
 * real trip flow runs through it; module hooks run on fixture shapes.
 */
vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      canals: {
        id: 'canals',
        ret: { kind: 'until', after: 2 },
        checkpoint: { after: 2, name: 'The quiet doorway' },
      },
    },
  };
});

const withCanals = (p: Profile): Profile => ({
  ...p,
  city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
});

function fought(b: BattleState, phase: 'won' | 'lost'): BattleState {
  const s = structuredClone(b);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return s;
}

/** Wins the current room and takes the first offer until the Crossroads. */
function clear(p: Profile, t: Trip): Trip {
  const r = finishEncounter(p, t, fought(beginEncounter(p, t).state, 'won'));
  let trip = r.trip;
  if (!trip) throw new Error('expected a trip');
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}

/** A canal trip walked to the Crossroads after `room` with the default push. */
function walkTo(p: Profile, room: number): Trip {
  let t = clear(p, startTrip(p, 7, 'canals'));
  for (let i = 0; i < room; i++) t = clear(p, pushOn(t));
  return t;
}

describe('return policy (P3)', () => {
  test('the Seam and the canals read their ret as built', async () => {
    const real =
      await vi.importActual<typeof import('$data/districts/index')>('$data/districts/index');
    expect(real.DISTRICT_KIT.seam?.ret).toEqual({ kind: 'any' });
    expect(real.DISTRICT_KIT.canals?.ret).toEqual({ kind: 'landings', after: [0, 2, 4] });
    expect(startTrip(newProfile(), 1).kit).toBeUndefined();
  });

  test('until: free up to the doorway, shut beyond it, the heart always home', () => {
    const p = withCanals(newProfile());
    const at2 = walkTo(p, 2);
    expect(returnPolicy(at2)).toEqual({ ok: true });
    const at3 = clear(p, pushOn(at2));
    expect(returnPolicy(at3)).toEqual({
      ok: false,
      why: 'No way home until the heart.',
      next: 4,
    });
    expect(canReturn(at3)).toBe(false);
    expect(nextLanding(at3)).toBe(placeOf(at3, 4));
    expect(() => returnHome(p, at3)).toThrow('No way home until the heart.');
    const heart = clear(p, pushOn(at3));
    expect(heart.status).toBe('cleared');
    expect(returnPolicy(heart)).toEqual({ ok: true });
  });

  test('a module block greys the way home with its reason, never at the heart', () => {
    const blocked: DistrictShape = {
      ...shapeOf('canals'),
      ret: { kind: 'any' },
      trip: fixtureShape({ block: 'The term you signed keeps you here.' }),
    };
    const t = { ...walkTo(withCanals(newProfile()), 0) };
    expect(returnCheck(t, blocked)).toEqual({
      ok: false,
      why: 'The term you signed keeps you here.',
    });
    expect(returnCheck({ ...t, encounter: 4, status: 'cleared' }, blocked)).toEqual({ ok: true });
  });
});

/** A fixture shape: span choices with variant pools, and an optional block. */
function fixtureShape(opts: { block?: string; spans?: boolean }): TripShapeDef {
  return {
    id: 'canals:fixture',
    initState: () => 0,
    parseState: (raw) => (typeof raw === 'number' ? raw : 0),
    ...(opts.block ? { returnBlocks: () => [{ why: opts.block ?? '' }] } : {}),
    ...(opts.spans
      ? {
          choices: () => [
            { id: 'sound', label: 'The sound span', kind: 'push' as const, variantPool: [0] },
            {
              id: 'crumbling',
              label: 'The crumbling span',
              kind: 'push' as const,
              variantPool: [2],
            },
          ],
        }
      : {}),
  };
}

describe('Crossroads choices (P4)', () => {
  test('default: push on, then return; the push before the point of no return warns', () => {
    const p = withCanals(newProfile());
    expect(crossroadsChoices(walkTo(p, 1)).map((c) => [c.id, c.warn, c.disabled])).toEqual([
      ['push', undefined, undefined],
      ['return', undefined, undefined],
    ]);
    const at2 = walkTo(p, 2);
    expect(crossroadsChoices(at2)[0]?.warn).toBe(NO_WAY_HOME);
    const at3 = clear(p, pushOn(at2));
    expect(crossroadsChoices(at3).map((c) => [c.id, c.warn, c.disabled])).toEqual([
      ['push', undefined, undefined],
      ['return', undefined, 'No way home until the heart.'],
    ]);
    const heart = clear(p, pushOn(at3));
    expect(choicesAt(heart).map((c) => c.id)).toEqual(['return']);
  });

  test('chooseAt records each way taken; a return choice throws', () => {
    const p = withCanals(newProfile());
    const at1 = walkTo(p, 1);
    expect(at1.kit?.choices).toEqual([{ after: 0, id: 'push' }]);
    const t = chooseAt(at1, 'push');
    expect(t.encounter).toBe(2);
    expect(t.kit?.choices).toEqual([
      { after: 0, id: 'push' },
      { after: 1, id: 'push' },
    ]);
    expect(() => chooseAt(at1, 'return')).toThrow('returnHome');
    expect(() => chooseAt(at1, 'sideways')).toThrow('No choice');
  });

  test('a module replaces push; the choice fixes the next room’s variant pool', () => {
    const spans: DistrictShape = { ...shapeOf('canals'), trip: fixtureShape({ spans: true }) };
    const at0 = walkTo(withCanals(newProfile()), 0);
    expect(choicesAt(at0, spans).map((c) => c.id)).toEqual(['sound', 'crumbling', 'return']);
    expect(() => takeChoice(at0, 'push', spans)).toThrow('No choice');
    for (const [id, variant] of [
      ['sound', 0],
      ['crumbling', 2],
    ] as const) {
      const t = takeChoice(at0, id, spans);
      expect(t.kit?.choices.at(-1)).toEqual({ after: 0, id, pool: [variant] });
      expect(variantFor(t, 1)).toBe(variant);
    }
  });
});

describe('checkpoint (P5)', () => {
  test('reached when its room is won, not before', () => {
    const p = withCanals(newProfile());
    expect(walkTo(p, 1).kit?.checkpoint).toBe(false);
    const at2 = walkTo(p, 2);
    expect(at2.kit?.checkpoint).toBe(true);
    expect(pushOn(at2).kit?.checkpoint).toBe(true);
  });

  test('remembered on a return and on a wipe; trips before it leave the city alone', () => {
    const p = withCanals(newProfile());
    expect(returnHome(p, walkTo(p, 1)).city.checkpoints).toBeUndefined();
    expect(returnHome(p, walkTo(p, 2)).city.checkpoints).toEqual({ canals: 2 });
    const into3 = pushOn(walkTo(p, 2));
    const wiped = closeBattle(p, into3, fought(beginEncounter(p, into3).state, 'lost'));
    expect(wiped.outcome).toBe('wiped');
    expect(wiped.profile.city.checkpoints).toEqual({ canals: 2 });
    const early = startTrip(p, 3, 'canals');
    const lost = closeBattle(p, early, fought(beginEncounter(p, early).state, 'lost'));
    expect(lost.profile.city.checkpoints).toBeUndefined();
  });

  test('startTrip at the checkpoint: the room after it, full HP and charges', () => {
    const p = withCanals(newProfile());
    expect(() => startTrip(p, 5, 'canals', { at: 'checkpoint' })).toThrow('no checkpoint');
    expect(() => startTrip(p, 5, 'seam', { at: 'checkpoint' })).toThrow('no checkpoint');
    const home = returnHome(p, walkTo(p, 2));
    const t = startTrip(home, 5, 'canals', { at: 'checkpoint' });
    const fresh = startTrip(home, 5, 'canals');
    expect(t.encounter).toBe(3);
    expect(t.status).toBe('fight');
    expect(t.hp).toEqual(fresh.hp);
    expect(t.charges).toEqual(fresh.charges);
    expect(t.kit).toEqual({ state: null, choices: [], checkpoint: true, bonuses: [] });
    // No way home until the heart from here, and the heart still ends it.
    const at3 = clear(home, t);
    expect(returnPolicy(at3).ok).toBe(false);
    expect(clear(home, pushOn(at3)).status).toBe('cleared');
  });
});

describe('save (P18)', () => {
  const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
  const saveWith = (profile: Profile, trip: Trip) => ({ ...newSave(1), profile, trip });

  test('the kit and city checkpoints round-trip', () => {
    const p = withCanals(newProfile());
    const home = returnHome(p, walkTo(p, 2));
    for (const trip of [
      walkTo(home, 3),
      startTrip(home, 9, 'canals', { at: 'checkpoint' }),
      pushOn(walkTo(home, 1)),
    ]) {
      const save = saveWith(home, trip);
      expect(parseSaveData(json(save))).toEqual(save);
    }
  });

  test('a kit that does not match its trip is refused', () => {
    const p = withCanals(newProfile());
    const home = returnHome(p, walkTo(p, 2));
    const t = walkTo(home, 2);
    const kit = t.kit;
    if (!kit) throw new Error('expected a kit');
    for (const bad of [
      { ...t, kit: undefined },
      { ...t, kit: { ...kit, checkpoint: false } },
      { ...t, kit: { ...kit, choices: kit.choices.slice(1) } },
      { ...t, kit: { ...kit, choices: [...kit.choices, { after: 2, id: 'push' }] } },
      { ...t, kit: { ...kit, choices: [{ after: 0, id: '' }, ...kit.choices.slice(1)] } },
    ]) {
      expect(() => parseSaveData(json(saveWith(home, bad)))).toThrow('Not a valid save');
    }
    const seam = startTrip(newProfile(), 1);
    expect(() => parseSaveData(json(saveWith(newProfile(), { ...seam, kit })))).toThrow();
    const wrongCp = { ...home, city: { ...home.city, checkpoints: { canals: 1 } } };
    expect(() => parseSaveData(json(saveWith(wrongCp, t)))).toThrow('Not a valid save');
  });
});
