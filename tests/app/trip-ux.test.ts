import { render } from 'svelte/server';
import { expect, test } from 'vitest';
import {
  applyAction,
  type GameEvent,
  type LootItem,
  newProfile,
  newSave,
  placeOf,
  startTrip,
} from '$engine';
import {
  endBattle,
  recordBattleAction,
  resolveScreen,
  setOut,
  startBattle,
} from '../../src/app/flow';
import { GameStore } from '../../src/app/game.svelte';
import { game as appGame } from '../../src/app/instance';
import { router } from '../../src/app/router.svelte';
import { memoryBackend, saveText } from '../../src/app/save';
import { carriedHome, offerNovelty, wipeCause, wipeFixture, wipeRooms } from '../../src/app/tripUx';
import { placeInText } from '../../src/app/tripviews';
import { viewOf } from '../../src/app/view';
import Wiped from '../../src/ui/screens/Wiped.svelte';

const rune: LootItem = { kind: 'rune', rune: 'fork' };
const ink: LootItem = { kind: 'ink', amount: 1 };
const method: LootItem = { kind: 'method', method: 'bind' };
const solvent: LootItem = { kind: 'solvent', solvent: 'wax' };
const recruit: LootItem = { kind: 'recruit', apprentice: 'runaway' };

test('offerNovelty: new rune, known rune, ink never', () => {
  const profile = newProfile();
  profile.known = ['ink'];
  expect(offerNovelty(profile, rune)).toBe('new');
  expect(offerNovelty(profile, { kind: 'rune', rune: 'ink' })).toBeNull();
  for (const item of [
    ink,
    { kind: 'vellum', amount: 2 },
    { kind: 'doorway' },
    { kind: 'key', district: 'seam' },
    { kind: 'seam:unknown', data: null },
  ] satisfies LootItem[]) {
    expect(offerNovelty(profile, item)).toBeNull();
  }
});

test('offerNovelty: method, solvent, recruit', () => {
  const profile = newProfile();
  const items = [method, solvent, recruit];
  expect(items.map((item) => offerNovelty(profile, item))).toEqual(['new', 'new', 'new']);

  profile.methods.push(method.method);
  profile.solventsFound.push(solvent.solvent); // Now spent, but previously found.
  profile.household.members.push(recruit.apprentice); // Joined, even if not in a trip slot.
  expect(items.map((item) => offerNovelty(profile, item))).toEqual([null, null, null]);
});

test('carriedHome: firsts lead, order stable', () => {
  const profile = newProfile();
  profile.known = ['ink'];
  const known: LootItem = { kind: 'rune', rune: 'ink' };
  const loot = [ink, solvent, known, rune, recruit];
  expect(carriedHome(profile, loot)).toEqual([
    { item: solvent, first: true },
    { item: rune, first: true },
    { item: recruit, first: true },
    { item: ink, first: false },
    { item: known, first: false },
  ]);
  expect(loot).toEqual([ink, solvent, known, rune, recruit]);
});

test('carriedHome: identical unbanked finds mark one first', () => {
  const profile = newProfile();
  profile.known = [];
  const anotherRune = { ...rune };
  const anotherMethod = { ...method };
  const finds = carriedHome(profile, [rune, ink, anotherRune, method, anotherMethod]);
  expect(finds).toEqual([
    { item: rune, first: true },
    { item: method, first: true },
    { item: ink, first: false },
    { item: anotherRune, first: false },
    { item: anotherMethod, first: false },
  ]);
  expect(finds[0]?.item).toBe(rune);
  expect(finds[3]?.item).toBe(anotherRune);
  expect(profile.known).toEqual([]);
  expect(profile.methods).toEqual([]);
});

function cartographersProfile() {
  const profile = newProfile();
  profile.city.open.push('cartographers');
  profile.city.checkpoints = { cartographers: 2 };
  return profile;
}

test('wipeRooms: cleared then fell', () => {
  const trip = startTrip(newProfile(), 42);
  trip.encounter = 1;
  trip.stats.fights = 1;
  expect(wipeRooms(trip)).toEqual([
    { place: placeOf(trip, 0), result: 'cleared' },
    { place: placeOf(trip), result: 'fell' },
  ]);
});

test('wipeRooms: checkpoint start lists only rooms fought', () => {
  const trip = startTrip(cartographersProfile(), 42, 'cartographers', { at: 'checkpoint' });
  expect(trip.encounter).toBe(3);
  expect(wipeRooms(trip)).toEqual([{ place: placeOf(trip), result: 'fell' }]);

  trip.encounter = 4;
  trip.stats.fights = 1;
  expect(wipeRooms(trip)).toEqual([
    { place: placeOf(trip, 3), result: 'cleared' },
    { place: placeOf(trip), result: 'fell' },
  ]);
});

test('wipeRooms: start from zero across the checkpoint lists all', () => {
  const trip = startTrip(cartographersProfile(), 42, 'cartographers');
  if (!trip.kit) throw new Error('The Cartographers have a trip kit');
  trip.kit.checkpoint = true; // The same flag can also mean reached during this trip.
  trip.encounter = 3;
  trip.stats.fights = 3;
  expect(wipeRooms(trip)).toEqual([
    { place: placeOf(trip, 0), result: 'cleared' },
    { place: placeOf(trip, 1), result: 'cleared' },
    { place: placeOf(trip, 2), result: 'cleared' },
    { place: placeOf(trip), result: 'fell' },
  ]);
});

function loseInTheSeam() {
  let save = setOut(newSave(42));
  let { state, events } = startBattle(save);
  for (let turn = 0; turn < 30 && state.phase === 'player'; turn++) {
    const action = { type: 'endTurn' } as const;
    const next = applyAction(state, action);
    save = recordBattleAction(save, action);
    state = next.state;
    events = [...events, ...next.events];
  }
  if (state.phase !== 'lost') throw new Error('Expected the Seam foes to win');
  return { save, state, events };
}

test('wipeCause: names the attack that downed the last casualty', () => {
  const { state, events } = loseInTheSeam();
  const hit = events.findLast((e) => e.type === 'damage' && e.target.member && e.hpLeft === 0);
  const attack = events.findLast((e) => e.type === 'attack');
  if (hit?.type !== 'damage' || attack?.type !== 'attack')
    throw new Error('Expected a lethal bite');
  expect(hit.source).toBe('Bite');
  expect(wipeCause(state, events)).toContain(attack.unit.name);
  expect(wipeCause(state, events)).toContain(hit.source);
  expect(wipeCause(state, events)).toContain(hit.target.name);
});

test('wipeCause: neutral line when no cause is provable', () => {
  const { state, events } = loseInTheSeam();
  const partyDeaths = events.filter((e) => e.type === 'died' && e.unit.member);
  const firstDeath = partyDeaths[0];
  const lastDeath = partyDeaths.at(-1);
  if (!firstDeath || lastDeath?.type !== 'died') throw new Error('Expected a party casualty');
  const earlier = events
    .slice(0, events.indexOf(lastDeath))
    .filter((e) => !(e.type === 'damage' && e.hpLeft === 0 && e.target.id === lastDeath.unit.id));
  const expected = `The party fell in ${placeInText(state.title)}.`;
  expect(wipeCause(state, earlier.concat(lastDeath, { type: 'lost' }))).toBe(expected);
  expect(wipeCause(state, events.slice(0, events.indexOf(firstDeath) + 1))).toBe(expected);
  expect(wipeCause(state, [])).toBe(expected);
});

test('wipeCause: an old attack does not take credit for the final hazard or fall', () => {
  const { state, events } = loseInTheSeam();
  const attack = events.findLast((e) => e.type === 'attack');
  const down = events.findLast((e) => e.type === 'died' && e.unit.member);
  if (attack?.type !== 'attack' || down?.type !== 'died') throw new Error('Expected a casualty');
  const hazard: GameEvent = {
    type: 'damage',
    target: down.unit,
    amount: 1,
    hpLeft: 0,
    source: 'Fire',
    bonus: [],
  };
  expect(wipeCause(state, [attack, hazard, down, { type: 'lost' }])).toBe(
    `Fire hits ${down.unit.name} for 1, and ${down.unit.name} is down.`,
  );
  const fallen = {
    ...state,
    units: state.units.map((u) =>
      u.id === down.unit.id ? { ...u, hp: 1, out: 'fell' as const } : u,
    ),
  };
  expect(wipeCause(fallen, [attack, { type: 'outOfRoom', unit: down.unit, cause: 'fell' }])).toBe(
    `${down.unit.name} falls out of the room.`,
  );
});

test('endBattle: wipe carries rooms and final', () => {
  const { save, state, events } = loseInTheSeam();
  if (!save.trip) throw new Error('Expected an incoming trip');
  const end = endBattle(save, state, events);
  expect(end.wipe).toMatchObject({
    encounter: state.title,
    rooms: [{ place: placeOf(save.trip), result: 'fell' }],
    cause: wipeCause(state, events),
    lost: [],
    learned: [],
  });
  expect(end.wipe?.final).toBe(state);
  expect(end.save.trip).toBeNull();
});

test('endBattle: enriches a recorded loss even without casualty details', () => {
  const { save, state } = loseInTheSeam();
  const summary = endBattle(save, state, [{ type: 'lost' }]).wipe;
  expect(summary).toMatchObject({
    rooms: [{ place: state.title, result: 'fell' }],
    cause: `The party fell in ${placeInText(state.title)}.`,
  });
  expect(summary?.final).toBe(state);
  expect(endBattle(save, state).wipe).toEqual({ encounter: state.title, lost: [], learned: [] });
});

function finishSeamWipe() {
  const { save } = loseInTheSeam();
  const backend = memoryBackend(saveText(save));
  const game = new GameStore(backend, () => 42);
  game.ensureBattle();
  const final = game.battle?.state;
  if (final?.phase !== 'lost') throw new Error('The recorded loss must replay');
  game.finishBattle();
  return { backend, game, final };
}

test('finishBattle opens a wipe with a final board, then dismiss and read the trip', () => {
  const { game, final } = finishSeamWipe();
  const screen = () => resolveScreen(router.route, game.save.trip, game.wipe, game.save.lastTrip);
  expect(game.battle).toBeNull();
  expect(screen().screen).toBe('wiped');
  expect(game.wipe?.final).toBe(final);
  if (!game.wipe?.final) throw new Error('The wipe needs a final board');
  const board = viewOf(game.wipe.final);
  expect(board.phase).toBe('lost');
  expect(board.tiles).toHaveLength(final.width * final.height);
  expect(board.units.filter((unit) => unit.kind === 'member' && unit.alive)).toEqual([]);
  expect(board).not.toHaveProperty('actions');
  expect(board).not.toHaveProperty('focusTargets');

  game.dismissWipe();
  expect(screen().screen).toBe('study');
  game.readTrip();
  expect(screen().screen).toBe('tripPage');
  expect(game.save.lastTrip?.place).toBe(final.title);
  game.leaveTripPage();
});

test('an older minimal summary renders', () => {
  const summary = wipeFixture('nothing-lost');
  expect(Object.keys(summary).sort()).toEqual(['encounter', 'learned', 'lost']);
  const before = appGame.wipe;
  try {
    appGame.wipe = summary;
    const { body } = render(Wiped);
    expect(body).toContain('data-testid="wiped"');
    expect(body).toContain('They had found nothing yet.');
    expect(body).toContain('Read the trip');
  } finally {
    appGame.wipe = before;
  }
});

test('lastTrip survives reload and the serialized save has no final board', () => {
  const { backend, game } = finishSeamWipe();
  expect(game.wipe?.final).toBeDefined();
  expect(game.save.lastTrip?.outcome).toBe('wiped');
  const raw = backend.read();
  expect(raw).toBe(saveText(game.save));
  expect(raw).not.toMatch(/"(?:wipe|final|tiles|units)"\s*:/);
  const reloaded = new GameStore(backend, () => 9);
  expect(reloaded.save.lastTrip).toMatchObject({
    district: game.save.lastTrip?.district,
    outcome: 'wiped',
    place: game.save.lastTrip?.place,
    encounter: game.save.lastTrip?.encounter,
    stats: game.save.lastTrip?.stats,
  });
  expect(reloaded.wipe).toBeNull();
  expect(resolveScreen('trip', reloaded.save.trip, reloaded.wipe, reloaded.save.lastTrip)).toEqual({
    screen: 'study',
    redirect: 'study',
  });
});

test('wipeFixture: the Seam and checkpoint give distinct final boards', () => {
  const seam = wipeFixture('seam');
  expect(seam.rooms?.map((room) => room.result)).toEqual(['cleared', 'fell']);
  expect(seam.rooms?.at(-1)?.place).toBe(seam.final?.title);
  expect(seam.final?.phase).toBe('lost');
  expect(seam.cause).toMatch(/hits .* is down\.$/);

  const first = wipeFixture('first-room');
  expect(first.rooms).toEqual([{ place: first.encounter, result: 'fell' }]);
  expect(first.final?.phase).toBe('lost');
  expect(first.cause).toBe(`The party fell in ${placeInText(first.encounter)}.`);
  expect(first.encounter).not.toBe(seam.encounter);
});
