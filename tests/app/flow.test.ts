import { expect, test } from 'vitest';
import {
  available,
  latticeOf,
  newSave,
  type SaveData,
  socketAt,
  startTrip,
  type Trip,
  type TripStatus,
} from '$engine';
import {
  editAndPersist,
  editLattice,
  importSave,
  resolveScreen,
  type WipeSummary,
} from '../../src/app/flow';
import type { Route } from '../../src/app/routes';
import {
  loadSave,
  memoryBackend,
  SAVE_KEY,
  type SaveBackend,
  saveText,
  writeSave,
} from '../../src/app/save';
import { NO_TOOL, type ShelfTool } from '../../src/app/study';

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
