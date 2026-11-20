import { expect, it } from 'vitest';
import type { Drawing } from '$data';
import { type Profile, startTrip, type Trip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import { shapeInput, shapeOf } from '$engine/trip/shape';
import { fullHousehold, heartDrawing } from './fixtures';

it('R8.8: drawn terms guarantee missing Bind and skip pages the household or trip holds', () => {
  const drawing: Drawing = { ...heartDrawing('postmaster'), shape: 'inkQuarter:terms', length: 6 };
  const household = fullHousehold();
  const profile: Profile = {
    ...household,
    drawings: [drawing, null, null],
    methods: household.methods.filter((method) => method !== 'bind'),
    solventsFound: [],
    city: { ...household.city, open: [...household.city.open, 'inkedPage'] },
  };
  const card = (trip: Trip, encounter: number, owner?: Profile) => {
    const input = shapeInput({ ...trip, encounter }, shapeOf('inkedPage', trip), owner);
    return INKED_TRIP.offersFor?.(input)?.extra?.find((item) => item.kind === 'inkQuarter:termed');
  };
  const termed = (id: string) => ({
    kind: 'inkQuarter:termed',
    data: { def: `inkQuarter:term-${id}` },
  });

  for (const seed of [1, 2, 3, 4]) {
    const trip = startTrip(profile, seed, 'inkedPage', { page: 0 });
    expect(card(trip, 1, profile)).toEqual(termed('bind'));
    expect(card(trip, 4, profile)).toEqual(termed('bind'));
    const knowsBind: Profile = { ...profile, methods: [...profile.methods, 'bind'] };
    const carriesWax: Trip = { ...trip, loot: [{ kind: 'solvent', solvent: 'wax' }] };
    expect(card(carriesWax, 1, knowsBind)).toEqual(termed('sand'));
    const carriesSand: Trip = {
      ...carriesWax,
      loot: [
        ...carriesWax.loot,
        { kind: 'inkQuarter:termed', data: { def: 'inkQuarter:term-sand', term: '0' } },
      ],
    };
    expect(card(carriesSand, 1, knowsBind)).toEqual(termed('sampler'));
    const carriesBind: Trip = {
      ...carriesSand,
      loot: [...carriesSand.loot, { kind: 'method', method: 'bind' }],
    };
    expect(card(carriesBind, 1)).toEqual(termed('sampler'));
    expect(card(trip, drawing.length - 1, profile)).toBeUndefined();
  }
});
