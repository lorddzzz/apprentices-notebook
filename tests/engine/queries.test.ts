import { expect, test } from 'vitest';
import type { SourceRuneId } from '$data';
import {
  aimPreview,
  blocksUnits,
  canUndoMove,
  castableSpells,
  distanceField,
  intentPreview,
  isCloud,
  isPlate,
  key,
  label,
  legalAims,
  legalMoves,
  parseKey,
  reachable,
  type Spell,
  shoveDirs,
  tileAt,
  travel,
  unitAt,
} from '$engine';
import { act, board, unitAtLabel } from '../scenarios/harness';

const labels = (cs: readonly { x: number; y: number }[]) => cs.map(label);
const at = (x: number, y: number) => ({ x, y });

function spell(source: SourceRuneId, k = '0,0'): Spell {
  return {
    key: k,
    at: at(0, 0),
    source,
    sourceAuras: [],
    first: null,
    charges: 2,
    path: [],
    ink: 2,
  };
}

test('travel stops at a cloud before the unit in it', () => {
  const s = board('D . r~ .');
  const r = travel(s, at(0, 0), 'right', 6);
  expect(r.reason).toBe('cloud');
  expect(labels(r.path)).toEqual(['B1', 'C1']);
});

test('travel stops at unit, plate, end; none when first tile off-board', () => {
  const s = board('D . r . = .');
  const hit = travel(s, at(0, 0), 'right', 6);
  expect(hit.reason).toBe('unit');
  expect(hit.reason === 'unit' && hit.unit.id).toBe('rat-1');
  expect(hit.stop && label(hit.stop)).toBe('C1');
  expect(travel(s, at(2, 0), 'right', 6)).toMatchObject({ reason: 'blocked', stop: at(4, 0) });
  expect(travel(s, at(4, 0), 'right', 6)).toMatchObject({ reason: 'end', stop: at(5, 0) });
  expect(travel(s, at(0, 0), 'left', 6)).toEqual({ reason: 'none', path: [], stop: null });
  expect(travel(s, at(0, 0), 'right', 1)).toMatchObject({ reason: 'end', stop: at(1, 0) });
  expect(travel(s, at(1, 0), 'right', 6, 'rat-1')).toMatchObject({ reason: 'blocked' });
});

test('reachable ≤3, not through units or plates, BFS path in DIRS order', () => {
  const s = board(`
    D . . . .
    = r . . .
    . . . . d
  `);
  const d = unitAtLabel(s, 'A1');
  const reach = reachable(s, d, 3);
  expect(labels([...reach.keys()].map(parseKey))).toEqual(['B1', 'C1', 'D1', 'C2']);
  expect(reach.has(key(at(1, 1)))).toBe(false);
  expect(reach.get('2,1')).toEqual({ dist: 3, path: [at(1, 0), at(2, 0), at(2, 1)] });
  expect(labels(legalMoves(s, 'draughtsman'))).toEqual(['B1', 'C1', 'D1', 'C2']);

  const open = board('D . .\n. . .\n. . d');
  // right is tried before down, so the path to B2 goes through B1
  expect(reachable(open, unitAtLabel(open, 'A1'), 3).get('1,1')?.path).toEqual([
    at(1, 0),
    at(1, 1),
  ]);
});

test('plates and clouds are states: plate-like compounds block, cloud-like ones hide', () => {
  const s = board('= # {wall} {skid} {kettle} ~ {bank} {fog} {brand} o g');
  const t = (x: number) => tileAt(s, at(x, 0));
  expect([0, 1, 2, 3, 4].map((x) => isPlate(t(x)))).toEqual([true, true, true, true, true]);
  expect([5, 6, 7, 8].map((x) => isCloud(t(x)))).toEqual([true, true, true, true]);
  expect(isPlate(t(9)) || isCloud(t(9))).toBe(false);
  expect(blocksUnits(t(10))).toBe(true); // a lock gate
  expect(blocksUnits(t(5))).toBe(false); // a cloud hides but doesn't block a walk
});

test('distanceField walks around blockers; self tile counts as open', () => {
  const s = board('D = r\n. . .');
  const field = distanceField(s, at(0, 0), 'rat-1');
  expect(field.get('2,0')).toBe(4);
  expect(field.has('1,0')).toBe(false);
  expect(distanceField(s, at(0, 0)).has('2,0')).toBe(false);
});

test('legalAims: bolt dirs on board, splash range 3, touch self + adjacent tiles, vat range 1', () => {
  const party = {
    draughtsman: {
      spells: [spell('bolt'), spell('splash', '1,0'), spell('touch', '2,0'), spell('vat', '3,0')],
    },
  };
  const s = board(
    `
    D S . . . .
    . . . . . .
    . . . . . .
    . . . . . .
    . . . . . d
  `,
    { party },
  );
  expect(legalAims(s, 'draughtsman', '0,0')).toEqual([
    { kind: 'dir', dir: 'right' },
    { kind: 'dir', dir: 'down' },
  ]);
  const splash = legalAims(s, 'draughtsman', '1,0');
  expect(splash).toHaveLength(16);
  expect(splash).toContainEqual({ kind: 'tile', at: at(3, 3) });
  expect(splash).not.toContainEqual({ kind: 'tile', at: at(4, 0) });
  expect(legalAims(s, 'draughtsman', '2,0')).toEqual([
    { kind: 'self' },
    { kind: 'tile', at: at(1, 0) },
    { kind: 'tile', at: at(0, 1) },
  ]);
  expect(legalAims(s, 'draughtsman', '3,0')).toHaveLength(4);
  expect(legalAims(s, 'draughtsman', '9,9')).toEqual([]);
  expect(legalAims(s, 'stoker', '0,0')).toEqual([]);
});

test('castableSpells and aimPreview', () => {
  const party = {
    draughtsman: {
      spells: [spell('bolt'), spell('splash', '1,0')],
      charges: { '0,0': 0, '1,0': 2 },
    },
  };
  const s = board('D . r~ .\n. . . d', { party });
  expect(castableSpells(s, 'draughtsman').map((c) => [c.spell.key, c.charges, c.usable])).toEqual([
    ['0,0', 0, false],
    ['1,0', 2, true],
  ]);
  const bolt = aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' });
  expect(labels(bolt.path)).toEqual(['B1', 'C1']);
  expect(labels(bolt.targets)).toEqual(['C1']);
  const splash = aimPreview(s, 'draughtsman', '1,0', { kind: 'tile', at: at(3, 1) });
  expect(labels(splash.targets)).toEqual(['C1', 'D1', 'C2', 'D2']);
  expect(aimPreview(s, 'draughtsman', '1,0', { kind: 'dir', dir: 'right' }).targets).toEqual([]);
});

test('shoveDirs, legalMoves and canUndoMove follow the member state', () => {
  const s = board('D r .\n. . d');
  expect(shoveDirs(s, 'draughtsman')).toEqual(['right']);
  expect(shoveDirs(s, 'rat-1')).toEqual([]);
  const moved = act(s, { type: 'move', unit: 'draughtsman', to: at(0, 1) });
  expect(legalMoves(moved.state, 'draughtsman')).toEqual([]);
  expect(canUndoMove(moved.state, 'draughtsman')).toBe(true);
  expect(shoveDirs(moved.state, 'draughtsman')).toEqual([]);
  expect(unitAt(moved.state, at(0, 0))).toBeNull();
});

test('intentPreview shows the path and the unit that would be hit', () => {
  const s = board('b . r . D\nf . . . .', { intents: { A1: 'right', A2: 'right' } });
  const sentry = unitAtLabel(s, 'A1');
  const familiar = unitAtLabel(s, 'A2');
  if (sentry.kind !== 'enemy' || familiar.kind !== 'enemy') throw new Error('enemies expected');
  expect(intentPreview(s, sentry)).toEqual({ path: [at(1, 0), at(2, 0)], hit: at(2, 0) });
  expect(intentPreview(s, familiar)).toEqual({ path: [at(1, 1), at(2, 1)], hit: null });
  const rat = unitAtLabel(s, 'C1');
  if (rat.kind !== 'enemy') throw new Error('enemy expected');
  expect(intentPreview(s, rat)).toBeNull();
  const biter = board('r D', { intents: { A1: 'right' } });
  const r = unitAtLabel(biter, 'A1');
  if (r.kind !== 'enemy') throw new Error('enemy expected');
  expect(intentPreview(biter, r)).toEqual({ path: [at(1, 0)], hit: at(1, 0) });
});
