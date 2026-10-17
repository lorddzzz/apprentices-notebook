import { expect, test } from 'vitest';
import {
  available,
  latticeOf,
  masksFrom,
  newSave,
  parseLattice,
  placeOf,
  recordProof,
  type SaveData,
  setMemberLattice,
  socketAt,
  startTrip,
  type Trip,
  type TripStatus,
} from '$engine';
import {
  editAndPersist,
  editLattice,
  endBattle,
  goHome,
  importSave,
  leaveDoorway,
  nearProof,
  resolveScreen,
  setOut,
  startBattle,
  tripHighlights,
  type WipeSummary,
} from '../../src/app/flow';
import { GameStore } from '../../src/app/game.svelte';
import type { Route } from '../../src/app/routes';
import {
  loadSave,
  memoryBackend,
  parseSaveText,
  SAVE_KEY,
  type SaveBackend,
  saveText,
  writeSave,
} from '../../src/app/save';
import { NO_TOOL, type ShelfTool } from '../../src/app/study';
import { cast, withLattices } from '../scenarios/harness';

const rune = (r: Extract<ShelfTool, { kind: 'rune' }>['rune']): ShelfTool => ({
  kind: 'rune',
  rune: r,
});

const save0 = (): SaveData => newSave(42);
const tripAt = (status: TripStatus): Trip => ({ ...startTrip(save0().profile, 1), status });
const wipe: WipeSummary = { encounter: 'Three rats', lost: [], learned: [] };

// ── resolveScreen (UI plan §1.2) ──

test('resolveScreen: no trip, no wipe', () => {
  const r = (route: Route) => resolveScreen(route, null, null);
  expect(r('study')).toEqual({ screen: 'study', redirect: null });
  expect(r('trip')).toEqual({ screen: 'study', redirect: 'study' });
  expect(r('codex')).toEqual({ screen: 'codex', redirect: null });
  expect(r('lab')).toEqual({ screen: 'lab', redirect: null });
  expect(r('gallery')).toEqual({ screen: 'gallery', redirect: null });
});

test('resolveScreen: a pending wipe shows the wiped screen on the trip route', () => {
  const r = (route: Route) => resolveScreen(route, null, wipe);
  expect(r('study')).toEqual({ screen: 'wiped', redirect: 'trip' });
  expect(r('trip')).toEqual({ screen: 'wiped', redirect: null });
  expect(r('codex')).toEqual({ screen: 'codex', redirect: null });
  expect(r('lab').screen).toBe('lab');
  expect(r('gallery').screen).toBe('gallery');
});

test('resolveScreen: the trip status picks the screen, whatever the URL says', () => {
  const expected: [TripStatus, string][] = [
    ['fight', 'battle'],
    ['looting', 'loot'],
    ['crossroads', 'crossroads'],
    ['cleared', 'cleared'],
  ];
  for (const [status, screen] of expected) {
    const trip = tripAt(status);
    expect(resolveScreen('trip', trip, null)).toEqual({ screen, redirect: null });
    expect(resolveScreen('study', trip, null)).toEqual({ screen, redirect: 'trip' });
    expect(resolveScreen('codex', trip, null)).toEqual({ screen: 'codex', redirect: null });
    expect(resolveScreen('lab', trip, null)).toEqual({ screen: 'lab', redirect: null });
    expect(resolveScreen('gallery', trip, null)).toEqual({ screen: 'gallery', redirect: null });
  }
});

// ── loadSave / writeSave ──

test('loadSave: empty backend gives a new game seeded from the clock', () => {
  const b = memoryBackend();
  const { save, recovered } = loadSave(b, 1234);
  expect(recovered).toBe(false);
  expect(save).toEqual(newSave(1234));
  expect(b.read()).toBeNull();
});

test('loadSave: garbage is kept as the corrupt copy and replaced by a new game', () => {
  const b = memoryBackend('{"this is":"not a save"');
  const { save, recovered } = loadSave(b, 5);
  expect(recovered).toBe(true);
  expect(save).toEqual(newSave(5));
  expect(b.corrupt).toBe('{"this is":"not a save"');
  // valid JSON that isn't a save, and a save from the future, are kept too
  const odd = memoryBackend('{"version":0,"data":{"profile":1}}');
  expect(loadSave(odd, 5).recovered).toBe(true);
  expect(odd.corrupt).toBe('{"version":0,"data":{"profile":1}}');
  const future = memoryBackend('{"version":99,"data":{}}');
  expect(loadSave(future, 5).recovered).toBe(true);
});

test('loadSave: valid text gives the same SaveData back', () => {
  const edited = editLattice(save0(), 'draughtsman', { x: 2, y: 1 }, rune('spark'), false).save;
  const b = memoryBackend();
  writeSave(b, edited);
  const { save, recovered } = loadSave(b, 999);
  expect(recovered).toBe(false);
  expect(save).toEqual(edited);
  expect(b.corrupt).toBeNull();
});

test('loadSave: a blocked storage reads as an empty one', () => {
  const blocked: SaveBackend = {
    read: () => {
      throw new Error('denied');
    },
    write: () => {},
    keepCorrupt: () => {},
  };
  expect(loadSave(blocked, 3)).toEqual({ save: newSave(3), recovered: false });
});

test('the local backend key is namespaced and the corrupt copy sits beside it', () => {
  expect(SAVE_KEY).toBe('apprentices-notebook:save');
});

// ── study reducers ──

test('a placement is saved once; inspecting, rejecting and ignoring never write', () => {
  const writes: string[] = [];
  const b: SaveBackend = { read: () => null, write: (t) => writes.push(t), keepCorrupt: () => {} };
  const s0 = save0();

  // place Spark right of Ink (x=2): saved
  const placed = editAndPersist(b, s0, 'draughtsman', { x: 2, y: 1 }, rune('spark'), false);
  expect(placed.changed).toBe(true);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toBe(saveText(placed.save));
  expect(socketAt(latticeOf(placed.save.profile, 'draughtsman'), { x: 2, y: 1 })).toMatchObject({
    rune: 'spark',
  });

  // inspect Ink (no tool): not saved
  editAndPersist(b, placed.save, 'draughtsman', { x: 1, y: 1 }, NO_TOOL, false);
  // reject (no Bolt left): not saved
  const rejected = editAndPersist(
    b,
    placed.save,
    'draughtsman',
    { x: 3, y: 1 },
    rune('bolt'),
    false,
  );
  expect(rejected.message).toBe('No Bolt left');
  expect(rejected.save).toBe(placed.save);
  // hole: not saved
  editAndPersist(b, placed.save, 'draughtsman', { x: 0, y: 2 }, rune('ink'), false);
  expect(writes).toHaveLength(1);
});

test('a rotate and a long-press removal each write; the other member and the trip are untouched', () => {
  const writes: string[] = [];
  const b: SaveBackend = { read: () => null, write: (t) => writes.push(t), keepCorrupt: () => {} };
  const s0 = save0();
  const turned = editAndPersist(b, s0, 'draughtsman', { x: 0, y: 1 }, NO_TOOL, false);
  expect(turned.decision.kind).toBe('rotate');
  const lifted = editAndPersist(b, turned.save, 'draughtsman', { x: 1, y: 1 }, NO_TOOL, true);
  expect(lifted.decision.kind).toBe('remove');
  expect(writes).toHaveLength(2);
  expect(lifted.save.profile.lattices.stoker).toEqual(s0.profile.lattices.stoker);
  expect(lifted.save.trip).toBeNull();
  expect(lifted.save.seedCounter).toBe(s0.seedCounter);
});

test('a failing write is reported, and the edit still applies', () => {
  const b: SaveBackend = {
    read: () => null,
    write: () => {
      throw new Error('quota');
    },
    keepCorrupt: () => {},
  };
  const r = editAndPersist(b, save0(), 'draughtsman', { x: 2, y: 1 }, rune('spark'), false);
  expect(r.changed).toBe(true);
  expect(r.message).toBe('Could not write the save');
});

test('the shelf tool follows the edit (drops when the last copy is placed)', () => {
  // Stoker's start lattice leaves one Spark spare in the collection of 2; the Draughtsman holds none.
  const s0 = save0();
  expect(available(s0.profile, 'spark')).toBeGreaterThan(0);
  let save = s0;
  let tool = rune('spark');
  let x = 2;
  while (tool.kind === 'rune' && x < 5) {
    const r = editLattice(save, 'draughtsman', { x, y: 1 }, tool, false);
    save = r.save;
    tool = r.tool as typeof tool;
    x += 1;
  }
  expect(available(save.profile, 'spark')).toBe(0);
});

test('importSave: accepts exported text, refuses anything else with a readable reason', () => {
  const s = editLattice(save0(), 'draughtsman', { x: 2, y: 1 }, rune('spark'), false).save;
  expect(importSave(`  ${saveText(s)}\n`)).toEqual(s);
  expect(() => importSave('hello')).toThrow('Not a valid save');
  expect(() => importSave('')).toThrow('Not a valid save');
  expect(() => importSave('{"version":0,"data":{"nope":true}}')).toThrow('Not a valid save');
  expect(() => importSave('{"version":99,"data":{}}')).toThrow(/newer/);
});

// ── a quiet doorway (plan S11) ──

const inDoorway = (): SaveData => ({
  ...save0(),
  trip: {
    ...startTrip(save0().profile, 1),
    status: 'doorway',
    charges: { draughtsman: { '0,1': 2 }, stoker: { '1,0': 4 } },
  },
});

test('resolveScreen: the doorway is the Study in field mode, on the trip route', () => {
  const trip = inDoorway().trip;
  expect(resolveScreen('trip', trip, null)).toEqual({ screen: 'study', redirect: null });
  expect(resolveScreen('study', trip, null)).toEqual({ screen: 'study', redirect: 'trip' });
  expect(resolveScreen('codex', trip, null)).toEqual({ screen: 'codex', redirect: null });
  expect(resolveScreen('bench', trip, null)).toEqual({ screen: 'study', redirect: 'trip' });
});

test('a reload in the doorway resumes it (save round trip, then the screen)', () => {
  const b = memoryBackend();
  writeSave(b, inDoorway());
  const { save, recovered } = loadSave(b, 1);
  expect(recovered).toBe(false);
  expect(save.trip?.status).toBe('doorway');
  expect(parseSaveText(saveText(save))).toEqual(save);
  expect(resolveScreen('trip', save.trip, null).screen).toBe('study');
  expect(new GameStore(b, () => 1).inDoorway).toBe(true);
});

test('doorway edits stay a draft: nothing is saved until Done, and a reload drops the draft', () => {
  const writes: string[] = [];
  let text: string | null = saveText(inDoorway());
  const backend: SaveBackend = {
    read: () => text,
    write: (t) => {
      writes.push(t);
      text = t;
    },
    keepCorrupt: () => {},
  };
  const game = new GameStore(backend, () => 1);
  const before = game.save.profile;
  game.selectMember('draughtsman');
  game.tapSocket({ x: 1, y: 1 }, true); // long-press removes the Ink
  expect(socketAt(latticeOf(game.studyProfile, 'draughtsman'), { x: 1, y: 1 })).toBeNull();
  expect(game.save.profile).toBe(before);
  expect(writes).toHaveLength(0);

  // reload: still in the doorway, with the banked pages
  const again = new GameStore(backend, () => 2);
  expect(again.inDoorway).toBe(true);
  expect(socketAt(latticeOf(again.studyProfile, 'draughtsman'), { x: 1, y: 1 })).not.toBeNull();

  // Done takes the draft: pages saved, trip on to the Crossroads (no picks left)
  expect(game.finishDoorway()).toBeNull();
  expect(game.save.trip?.status).toBe('crossroads');
  expect(socketAt(latticeOf(game.save.profile, 'draughtsman'), { x: 1, y: 1 })).toBeNull();
  expect(game.save.trip?.charges).toEqual({ draughtsman: { '0,1': 2 }, stoker: { '1,0': 4 } });
  expect(writes).toHaveLength(1);
  expect(game.inDoorway).toBe(false);
});

test('Done is refused while a page is not ready, and nothing changes', () => {
  const save = inDoorway();
  const lattices = structuredClone(save.profile.lattices);
  lattices.draughtsman.push({ at: { x: 3, y: 1 }, rune: 'bolt', dir: 'right' });
  // the third Bolt is not owned
  expect(() => leaveDoorway(save, { ...save.profile, lattices })).toThrow(/not ready/);
  expect(save.trip?.status).toBe('doorway');
});

test('Done returns to the loot when picks remain', () => {
  const save = inDoorway();
  const trip = {
    ...(save.trip as Trip),
    offers: [{ kind: 'vellum' as const, amount: 1 }],
    picksLeft: 1,
  };
  const r = leaveDoorway({ ...save, trip }, save.profile);
  expect(r.trip?.status).toBe('looting');
  expect(resolveScreen('trip', r.trip, null).screen).toBe('loot');
});

// ── The trip page (seam-deepening S16, S17) ──

const fightLog = () =>
  cast(withLattices('D . r', { draughtsman: 'Bolt> Spark' }), 'draughtsman', 'right').events;

test('a won fight folds its whole log into the trip stats', () => {
  const save = setOut(newSave(7));
  const battle = { ...startBattle(save).state, phase: 'won' as const };
  const end = endBattle(save, battle, fightLog());
  expect(end.outcome).toBe('won');
  expect(end.save.trip?.stats.fights).toBe(1);
  expect(end.save.trip?.stats.spells).toMatchObject([
    { member: 'draughtsman', spell: '0,0', name: 'Bolt', casts: 1, damage: 2, kills: 1 },
  ]);
  expect(end.save.lastTrip).toBeNull(); // the trip is still going
});

test('a wipe keeps the stats in lastTrip and ends the trip', () => {
  const save = setOut(newSave(7));
  const battle = { ...startBattle(save).state, phase: 'lost' as const };
  const end = endBattle(save, battle, fightLog());
  expect(end.outcome).toBe('wiped');
  expect(end.save.trip).toBeNull();
  expect(end.save.lastTrip).toMatchObject({ outcome: 'wiped', encounter: 0 });
  expect(end.save.lastTrip?.stats.spells[0]?.casts).toBe(1);
});

test('returning home keeps the recap; the next trip clears it', () => {
  const won = endBattle(
    setOut(newSave(7)),
    { ...startBattle(setOut(newSave(7))).state, phase: 'won' },
    fightLog(),
  );
  const trip = { ...(won.save.trip as Trip), status: 'crossroads' as const };
  const home = goHome({ ...won.save, trip });
  expect(home.trip).toBeNull();
  expect(home.lastTrip).toEqual({
    district: 'seam',
    outcome: 'returned',
    encounter: 0,
    place: placeOf(trip),
    stats: trip.stats,
  });
  expect(setOut(home).lastTrip).toBeNull();
});

test('the store: Return home leaves the recap in the save, and leaving the page clears the wipe', () => {
  const b = memoryBackend();
  writeSave(b, { ...save0(), trip: tripAt('crossroads') });
  const game = new GameStore(b, () => 1);
  game.returnHome();
  expect(game.save.lastTrip?.outcome).toBe('returned');
  expect(new GameStore(b, () => 2).save.lastTrip?.outcome).toBe('returned'); // survives a reload
  game.wipe = wipe;
  game.leaveTripPage();
  expect(game.wipe).toBeNull();
});

test('resolveScreen: the trip page shows the last trip, from home or from a wipe', () => {
  const recap = {
    district: 'seam' as const,
    outcome: 'returned' as const,
    encounter: 1,
    place: 'The scullery',
    stats: tripAt('fight').stats,
  };
  expect(resolveScreen('trip-page', null, null, recap)).toEqual({
    screen: 'tripPage',
    redirect: null,
  });
  expect(resolveScreen('trip-page', null, wipe, recap).screen).toBe('tripPage');
  // no recap: back to the Study (or the pending wipe)
  expect(resolveScreen('trip-page', null, null, null)).toEqual({
    screen: 'study',
    redirect: 'study',
  });
  expect(resolveScreen('trip-page', null, wipe, null).screen).toBe('wiped');
  // out on a trip, the trip decides
  expect(resolveScreen('trip-page', tripAt('looting'), null, recap)).toEqual({
    screen: 'loot',
    redirect: 'trip',
  });
});

test('highlights: discovery first, a chain of 3+, and a chain of 2 is left out', () => {
  const stats = {
    ...tripAt('fight').stats,
    discoveries: ['interaction:ignite'],
    biggestChain: { member: 'stoker' as const, spell: '1,0', name: 'Spark', reactions: 4 },
  };
  const hs = tripHighlights(
    { district: 'seam', outcome: 'returned', encounter: 0, place: 'The coal chute', stats },
    save0().profile,
  );
  expect(hs.map((h) => h.kind)).toEqual(['discovery', 'chain']);
  expect(hs[1]?.text).toContain('Stoker');
  expect(hs[1]?.text).toContain('4 reactions');
  const small = {
    ...stats,
    discoveries: [],
    biggestChain: { ...stats.biggestChain, reactions: 2 },
  };
  expect(
    tripHighlights(
      { district: 'seam', outcome: 'wiped', encounter: 0, place: 'The coal chute', stats: small },
      save0().profile,
    ),
  ).toEqual([]);
});

test('nearProof finds a pattern cast 3 or 4 times, and not one at 5 or at 2', () => {
  const lattice = 'Bolt> Ink Oil Spark .';
  const mask = masksFrom(
    cast(withLattices('D . d', { draughtsman: lattice }), 'draughtsman', 'right').events,
    'draughtsman',
  )[0];
  if (!mask) throw new Error('the cast was not meaningful');
  const withCasts = (n: number) =>
    recordProof(
      setMemberLattice(newSave(1).profile, 'draughtsman', parseLattice(lattice)),
      'draughtsman',
      Array.from({ length: n }, () => mask),
    );
  const near = nearProof(withCasts(4));
  expect(near?.casts).toBe(4);
  expect(near?.member).toBe('draughtsman');
  expect(near?.runes).toContain('Bolt');
  expect(nearProof(withCasts(2))).toBeNull();
  expect(nearProof(withCasts(5))).toBeNull();
  const hs = tripHighlights(
    {
      district: 'seam',
      outcome: 'returned',
      encounter: 0,
      place: 'The coal chute',
      stats: tripAt('fight').stats,
    },
    withCasts(3),
  );
  expect(hs.map((h) => h.kind)).toEqual(['proof']);
  expect(hs[0]?.text).toContain('3 of 5');
});

test('reset throws the notebook away for a new game and saves it', () => {
  const b = memoryBackend();
  writeSave(b, inDoorway());
  const game = new GameStore(b, () => 77);
  expect(game.inDoorway).toBe(true);
  game.reset();
  expect(game.save).toEqual(newSave(77));
  expect(parseSaveText(b.read() ?? '')).toEqual(newSave(77));
  expect(game.inDoorway).toBe(false);
});
