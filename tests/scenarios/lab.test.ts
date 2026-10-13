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
  expect(scenarioById('oil-chain')?.title).toBe('Oil chain');
  expect(scenarioById('nope')).toBeNull();
});

test('scenarioBattle in lab mode: no charges spent, spells from the scenario lattices', () => {
  const def = scenarioById('oil-chain') as ScenarioDef;
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
  expect(describeSpell(memberById(s, 'draughtsman').spells[0] ?? fail())).toBe(
    'Bolt (2 damage) → Ink 3×3',
  );
});

test('labSetLattice recompiles spells and refills charges', () => {
  const s = scenarioBattle({ title: 'lab', board: 'D . d', lattices: { draughtsman: 'Bolt>' } });
  const spent = cast(s, 'draughtsman', 'right').state;
  expect(memberById(spent, 'draughtsman').charges['0,0']).toBe(4);
  const next = labSetLattice(spent, 'draughtsman', 'Amp .\nBolt> Spark');
  const m = memberById(next, 'draughtsman');
  expect(m.spells.map(describeSpell)).toEqual(['Bolt (3 damage) → Spark (1 damage)']);
  expect(m.charges).toEqual({ '0,1': 5 });
  expect(memberById(spent, 'draughtsman').spells).toHaveLength(1); // input untouched
  expect(memberById(spent, 'draughtsman').spells[0]?.key).toBe('0,0');
});

test('UI contract: castableSpells, aimPreview path, labSetCell errors', () => {
  const s = scenarioBattle(scenarioById('steam-arc') as ScenarioDef, { lab: true });
  const [entry] = castableSpells(s, 'draughtsman');
  expect(entry?.charges).toBe(5);
  expect(entry?.usable).toBe(true);
  expect(entry?.spell.path.map((p) => p.dir)).toEqual(['right', 'right']);
  expect(aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' })).toEqual({
    path: [parseLabel('B1'), parseLabel('C1')],
    targets: [parseLabel('C1')],
  });
  expect(() => labSetCell(s, parseLabel('B1'), 'r=')).toThrow(/brass plate.*B1/);
  expect(() => labSetCell(s, parseLabel('B1'), 'q')).toThrow(/Unknown character "q" in cell B1/);
});

function fail(): never {
  throw new Error('missing spell');
}
