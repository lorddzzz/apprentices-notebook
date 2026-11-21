import { expect, test } from 'vitest';
import { encountersOf } from '$data';
import {
  type Action,
  applyAction,
  compiledFor,
  createEncounterBattle,
  deriveSeed,
  legalMoves,
  memberById,
  newProfile,
  parseLabel,
  startTrip,
  tileAt,
} from '$engine';
import { startSeedFor } from '$engine/rooms';
import { botFight } from '$engine/sim';
import { roomSetupFor, setUpRoom } from '$engine/trip/setup';
import { shapeOf } from '$engine/trip/shape';
import { withLattices } from '../scenarios/harness';

test('CAL-F1: a hypothetical move that downs the mover never scores a basic action', () => {
  const initial = structuredClone(
    withLattices('S . D r', { draughtsman: 'Bolt> Strike' }, { hp: { A1: 1, D1: 1 } }),
  );
  const to = parseLabel('B1');
  const move: Action = { type: 'move', unit: 'stoker', to };
  tileAt(initial, to).jar = {
    owner: 'rat-1',
    event: 'step',
    rest: { role: 'action', rune: 'strike', at: { x: 0, y: 0 }, auras: [], next: null },
    heading: null,
    origin: { caster: 'rat-1', spell: 'test', cast: 0 },
  };
  expect(legalMoves(initial, 'stoker')).toEqual([to]);
  const hypothetical = applyAction(initial, move);
  expect(hypothetical.events.map((event) => event.type)).toContain('jarOpened');
  expect(memberById(hypothetical.state, 'stoker').hp).toBe(0);
  expect(hypothetical.state.phase).toBe('player');

  const result = botFight(initial, 40, ['stoker', 'draughtsman']);
  expect(result.state.phase).toBe('won');
  expect(result.actions).not.toContainEqual(move);
});

test('CAL-F1: the lamp market at 42 Lamplighter HP plays to an end (fresh pair, seed 9)', () => {
  const encounter = 3;
  const room = encountersOf('canals')[encounter];
  if (!room) throw new Error('Missing canals room 4');
  const variant = room.variants.findIndex((layout) => layout.name === 'The lamp market');
  expect(variant).toBeGreaterThanOrEqual(0);

  const base = newProfile();
  const profile = { ...base, city: { ...base.city, open: [...base.city.open, 'canals' as const] } };
  const trip = { ...startTrip(profile, 9, 'canals'), encounter };
  const party = Object.fromEntries(
    trip.party.map((id) => [
      id,
      { hp: trip.hp[id], spells: compiledFor(profile, id).spells, charges: trip.charges[id] },
    ]),
  );
  const { state } = createEncounterBattle(
    { ...room, enemyHp: { lamplighter: 42 } },
    party,
    deriveSeed(trip.seed, encounter),
    variant,
    'canals',
    {},
    { lineup: trip.party, startSeed: startSeedFor(trip, encounter) },
  );
  const shape = shapeOf('canals', trip);
  const initial = setUpRoom(state, shape, roomSetupFor(trip, shape));
  expect(initial.units).toContainEqual(expect.objectContaining({ def: 'lamplighter', hp: 42 }));

  const result = botFight(initial, 40, trip.party, { gauge: true, cracks: true, budget: 600 });
  expect(result.exhausted).toBe(false);
  expect(result.state.phase).not.toBe('player');
});
