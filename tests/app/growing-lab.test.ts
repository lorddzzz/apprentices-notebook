import { afterEach, expect, test } from 'vitest';
import { SCENARIOS } from '$data';
import {
  applyAction,
  compileLattice,
  describeLog,
  memberById,
  parseLattice,
  runScenario,
  serializeLattice,
  startTrip,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import {
  baseOf,
  fallbackLattices,
  formatLattices,
  profileLattices,
  toScenarioDef,
} from '../../src/app/lab';
import { LabStore } from '../../src/app/lab.svelte';
import { framePage, panView, rememberView, sessionView } from '../../src/app/latticeViewport';
import { memoryBackend } from '../../src/app/save';
import { editProfile, editSocket } from '../../src/app/study';

const stores: LabStore[] = [];
afterEach(() => {
  for (const store of stores) store.session?.dispose();
  stores.length = 0;
});
function fresh() {
  const backend = memoryBackend();
  const game = new GameStore(backend, () => 17);
  const lab = new LabStore(game);
  stores.push(lab);
  lab.load('sandbox');
  return { game, lab, backend };
}

test('Lab working pages grow while direct dense scenario execution keeps fixed geometry', () => {
  const { game, lab } = fresh();
  lab.load('oil-then-spark');
  const text = SCENARIOS.find((def) => def.id === 'oil-then-spark')?.lattices?.draughtsman;
  if (!text) throw new Error('missing fixture');
  const fixed = parseLattice(text);
  expect(fixed.shape.kind).toBeUndefined();
  expect(lab.lattices.draughtsman.shape.kind).toBe('growing');
  expect(compileLattice(lab.lattices.draughtsman)).toEqual(compileLattice(fixed));
  for (const pages of [fallbackLattices(), profileLattices(game.profile)]) {
    expect(pages.draughtsman.shape.kind).toBe('growing');
    expect(pages.stoker.shape.kind).toBe('growing');
  }
});

test('signed edits make one undo snapshot; undo and reset preserve state, export and player save', async () => {
  const { game, lab, backend } = fresh();
  const original = structuredClone(game.save);
  const stored = backend.read();
  const initial = lab.lattices.draughtsman;
  lab.member = 'draughtsman';
  lab.setTool({ kind: 'rune', rune: 'bolt' });
  lab.editLattice({ x: -12, y: -4 });
  expect(lab.undoDepth).toBe(1);
  lab.setTool({ kind: 'rune', rune: 'strike' });
  lab.editLattice({ x: -11, y: -4 });
  expect(lab.undoDepth).toBe(2);
  const session = lab.session;
  if (!session) throw new Error('missing session');
  expect(
    memberById(session.state, 'draughtsman').spells.some((spell) => spell.key === '-12,-4'),
  ).toBe(true);
  const before = session.state;
  const log = [...session.log];
  const signed = lab.lattices.draughtsman;
  const exported = toScenarioDef('signed-page', baseOf(before, lab.lattices), [], []);
  expect(exported.lattices?.draughtsman).toContain('@lattice 1 growing');
  expect(parseLattice(exported.lattices?.draughtsman ?? '').runes).toEqual(signed.runes);
  expect(formatLattices(lab.lattices)).toContain('-12,-4 Bolt>');
  const action = {
    type: 'cast',
    unit: 'draughtsman',
    spell: '-12,-4',
    aim: { kind: 'dir', dir: 'up' },
  } as const;
  const cast = applyAction(before, action);
  const replay = runScenario({ ...exported, demo: [action], expected: describeLog(cast.events) });
  expect(replay.lines).toEqual(describeLog(cast.events));
  const played = session.dispatch(action);
  session.skip();
  await played;
  const actedState = session.state;
  const actedLog = [...session.log];
  expect(actedLog.length).toBeGreaterThan(log.length);
  lab.setTool({ kind: 'erase' });
  lab.editLattice({ x: -11, y: -4 });
  expect(lab.undoDepth).toBe(4);
  lab.undo();
  expect(lab.undoDepth).toBe(3);
  expect(lab.lattices.draughtsman).toEqual(signed);
  expect(session.state).toEqual(actedState);
  expect(session.log).toEqual(actedLog);
  lab.undo();
  expect(session.state).toEqual(before);
  expect(session.log).toEqual(log);
  lab.reset();
  expect(lab.undoDepth).toBe(0);
  expect(lab.lattices.draughtsman).toEqual(initial);
  expect(game.save).toEqual(original);
  expect(backend.read()).toBe(stored);
});

test('Lab navigation keys remain stable through edits/undo and isolate members and reset sessions', () => {
  const { lab } = fresh();
  const key = lab.latticeSessionKey('draughtsman');
  const size = { width: 375, height: 320 };
  const view = panView(framePage([], size), { x: 100, y: -80 });
  rememberView(key, view);
  lab.member = 'stoker';
  expect(lab.latticeSessionKey()).not.toBe(key);
  lab.member = 'draughtsman';
  lab.setMode('lattices');
  lab.setTool({ kind: 'rune', rune: 'ink' });
  lab.editLattice({ x: 1000000, y: -1000000 });
  lab.undo();
  expect(lab.latticeSessionKey()).toBe(key);
  expect(sessionView(key, [], size)).toEqual(view);
  expect(lab.undoDepth).toBe(0);
  lab.reset();
  expect(lab.latticeSessionKey()).not.toBe(key);
  expect(sessionView(key, [], size)).toEqual(framePage([], size));
});

test('Study keys separate home, doorway, members and successful notebook replacement only', () => {
  const { game } = fresh();
  const home = game.latticeSessionKey('draughtsman');
  expect(game.latticeSessionKey('stoker')).not.toBe(home);
  game.selectMember('stoker');
  game.selectMember('draughtsman');
  expect(game.latticeSessionKey()).toBe(home);
  const before = game.save;
  const result = editProfile(
    game.profile,
    'draughtsman',
    { x: -4, y: -3 },
    { kind: 'rune', rune: 'ink' },
    false,
  );
  game.setProfile(result.profile);
  expect(game.latticeSessionKey()).toBe(home);
  expect(game.importText('invalid')).not.toBeNull();
  expect(game.latticeSessionKey()).toBe(home);
  const trip = startTrip(before.profile, 99);
  game.save = { ...game.save, trip: { ...trip, status: 'doorway' } };
  const doorway = game.latticeSessionKey();
  expect(doorway).not.toBe(home);
  game.updateProfile((profile) => profile);
  expect(game.latticeSessionKey()).toBe(doorway);
  game.save = { ...game.save, trip: { ...trip, status: 'doorway', encounter: trip.encounter + 1 } };
  expect(game.latticeSessionKey()).not.toBe(doorway);
  game.save = { ...game.save, trip: null };
  expect(game.latticeSessionKey()).toBe(home);
  const text = game.exportText();
  expect(game.importText(text)).toBeNull();
  const imported = game.latticeSessionKey();
  expect(imported).not.toBe(home);
  game.reset();
  expect(game.latticeSessionKey()).not.toBe(imported);
});

test('ordinary edit decisions preserve signed positions, bounds, knowledge and ink rules', () => {
  const { lab } = fresh();
  const original = lab.lattices.draughtsman;
  const at = { x: -30, y: -20 };
  const tool = { kind: 'rune', rune: 'ink' } as const;
  const edit = editSocket({ lattice: original, capacity: null }, at, tool, false);
  expect(edit.decision.kind).toBe('place');
  expect(edit.lattice.runes).toContainEqual({ at, rune: 'ink' });
  expect(edit.lattice.shape.kind === 'growing' && edit.lattice.shape.origin.x).toBe(-31);
  expect(
    editSocket({ lattice: original, capacity: null, known: [] }, at, tool, false).decision.kind,
  ).toBe('reject');
  expect(editSocket({ lattice: original, capacity: 0 }, at, tool, false).decision.kind).toBe(
    'reject',
  );
  expect(serializeLattice(original)).not.toContain('-30,-20');
});
