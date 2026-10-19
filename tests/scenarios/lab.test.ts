import { describe, expect, test } from 'vitest';
import { SCENARIOS, type ScenarioDef } from '$data';
import {
  aimPreview,
  castableSpells,
  describeSpell,
  labSetCell,
  labSetLattice,
  memberById,
  parseLabel,
  parseLattice,
  runScenario,
  scenarioBattle,
  scenarioById,
} from '$engine';
import { cast, expectLog } from './harness';

describe('every Lab scenario replays to its expected log', () => {
  for (const def of SCENARIOS) {
    test(def.id, () => {
      expectLog(runScenario(def).events, def.expected);
    });
  }
});

test('scenario ids are unique and kebab-case', () => {
  const ids = SCENARIOS.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(scenarioById('sandbox')?.title).toBe('Sandbox');
  expect(scenarioById('nope')).toBeNull();
});

test('redesign lessons cover the five spells, first invention and named idioms', () => {
  const ids = [
    'oil-then-spark',
    'spark-then-oil',
    'the-wall',
    'brand-cloud',
    'recoil',
    'impulse',
    'lantern-walk',
    'long-drop',
    'steam-room',
    'peal',
  ];
  for (const id of ids) {
    const def = scenarioById(id);
    expect(def, id).not.toBeNull();
    expect(def?.demo.length, id).toBeGreaterThan(0);
    expect(def?.expected.length, id).toBeGreaterThan(0);
  }
  for (const [id, idiom] of [
    ['the-wall', 'theWall'],
    ['lantern-walk', 'lanternWalk'],
    ['long-drop', 'longDrop'],
    ['steam-room', 'steamRoom'],
    ['peal', 'peal'],
  ]) {
    const def = scenarioById(id ?? '');
    if (!def) throw new Error(`missing ${id}`);
    expect(runScenario(def).state.named, id).toContain(`idiom:${idiom}`);
  }
});

test('Recoil lesson spreads its bound action and releases each copy once', () => {
  const def = scenarioById('recoil');
  if (!def) throw new Error('missing Recoil');
  const result = runScenario(def);
  expect(result.events.filter((e) => e.type === 'markSpread')).toHaveLength(1);
  expect(result.events.filter((e) => e.type === 'released')).toHaveLength(3);
  expect(result.state.inventions['inv:recoil']?.name).toBe('Recoil');
});

test('scenarioBattle in lab mode: no charges spent, spells from the scenario lattices', () => {
  const def: ScenarioDef = {
    id: 'oil',
    title: 'Oil',
    note: '',
    board: 'S . d',
    lattices: { stoker: 'Bolt> Oil Spark' },
    demo: [],
    expected: [],
  };
  const s = scenarioBattle(def, { lab: true });
  expect(s.lab).toBe(true);
  expect(s.phase).toBe('player');
  const after = cast(s, 'stoker', 'right').state;
  expect(memberById(after, 'stoker').charges['0,0']).toBe(5);
});

test('scenarioBattle falls back to the given (profile) lattices for omitted members', () => {
  const def = scenarioById('sandbox') as ScenarioDef;
  const bare = scenarioBattle(def, { lab: true });
  expect(memberById(bare, 'draughtsman').spells).toEqual([]);
  const s = scenarioBattle(def, {
    lab: true,
    lattices: { draughtsman: parseLattice('Bolt> Ink') },
  });
  expect(describeSpell(memberById(s, 'draughtsman').spells[0] ?? fail())).toBe('Bolt → Ink');
});

test('labSetLattice recompiles spells and refills charges', () => {
  const s = scenarioBattle({ title: 'lab', board: 'D . d', lattices: { draughtsman: 'Bolt>' } });
  const spent = cast(s, 'draughtsman', 'right').state;
  expect(memberById(spent, 'draughtsman').charges['0,0']).toBe(4);
  const next = labSetLattice(spent, 'draughtsman', 'Coil .\nBolt> Spark');
  const m = memberById(next, 'draughtsman');
  expect(m.spells.map((sp) => describeSpell(sp))).toEqual(['Bolt → Spark']);
  expect(m.spells[0]?.sourceAuras).toEqual(['coil']);
  expect(m.charges).toEqual({ '0,1': 5 });
  expect(memberById(spent, 'draughtsman').spells).toHaveLength(1); // input untouched
  expect(memberById(spent, 'draughtsman').spells[0]?.key).toBe('0,0');
});

test('UI contract: castableSpells, aimPreview path, labSetCell errors', () => {
  const s = scenarioBattle(
    { title: 'lab', board: 'D . ~ . d', lattices: { draughtsman: 'Bolt> Spark' } },
    { lab: true },
  );
  const [entry] = castableSpells(s, 'draughtsman');
  expect(entry?.charges).toBe(5);
  expect(entry?.usable).toBe(true);
  expect(entry?.spell.path.map((p) => p.dir)).toEqual(['right', 'right']);
  expect(aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' })).toEqual({
    path: [parseLabel('B1'), parseLabel('C1')],
    targets: [parseLabel('C1')],
  });
  expect(() => labSetCell(s, parseLabel('B1'), 'r=')).toThrow(/plate.*B1/);
  expect(() => labSetCell(s, parseLabel('B1'), 'q')).toThrow(/Unknown character "q" in cell B1/);
});

function fail(): never {
  throw new Error('missing spell');
}
