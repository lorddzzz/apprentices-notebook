import { expect, test } from 'vitest';
import { type InventionDef, MEMBERS, METHODS, type RuneRef } from '$data';
import {
  compiledFor,
  compileLattice,
  glyphCost,
  growingLattice,
  type ImportBudget,
  inkOf,
  inkPricer,
  inkUsed,
  inventionInk,
  inventionIssue,
  libraryOf,
  newSave,
  ResourceLimitError,
} from '$engine';
import { loadSave, memoryBackend, parseSaveText, saveText } from '../../src/app/save';

function chain(length: number, duplicate = false): InventionDef[] {
  const definitions: InventionDef[] = [];
  let previous: RuneRef = 'strike';
  for (let i = 0; i < length; i++) {
    const id = `inv:chain-${i}` as const;
    definitions.push({
      id,
      name: `Chain ${i}`,
      method: 'repeat',
      parts: duplicate ? [previous, previous] : [previous],
      solvent: null,
    });
    previous = id;
  }
  return definitions;
}

test('an imported 2500-node invention chain compiles and prices with the member lean', () => {
  const save = newSave(1);
  save.profile.inventions = chain(2500);
  save.profile.lattices.draughtsman = [
    { at: { x: -1, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 0, y: 0 }, rune: 'inv:chain-2499' },
  ];
  const restored = parseSaveText(saveText(save));
  expect(restored).toEqual(save);
  const lib = libraryOf(restored.profile.inventions);
  const lean = MEMBERS.draughtsman.lean;
  const cost = inkOf('strike', {}, lean) + 2500 * METHODS.repeat.ink;
  expect(inkOf('inv:chain-2499', lib, lean)).toBe(cost);
  expect(compiledFor(restored.profile, 'draughtsman').spells[0]?.ink).toBe(
    cost + inkOf('bolt', {}, lean),
  );
  const last = restored.profile.inventions.at(-1);
  if (!last) throw new Error('expected invention');
  expect(inventionInk(last, lib)).toBe(inkOf('strike') + 2500 * METHODS.repeat.ink);
});

test('a repeated DAG pays repeated parts while evaluating shared dependencies once', () => {
  const lib = libraryOf(chain(40, true));
  let work = 0;
  const budget: ImportBudget = {
    spend: (resource, amount = 1) => {
      if (resource === 'work') work += amount;
    },
    collection: () => {},
    text: () => {},
  };
  const price = inkPricer(lib, null, budget);
  expect(price('inv:chain-39')).toBe((inkOf('strike') + 2) * 2 ** 40 - 2);
  expect(work).toBeLessThan(300);
  const before = work;
  expect(price('inv:chain-39')).toBe((inkOf('strike') + 2) * 2 ** 40 - 2);
  expect(work - before).toBe(1);
});

test('one lattice pricing operation shares memoized invention costs across occupied cells', () => {
  const definitions = chain(2500);
  const raw = libraryOf(definitions);
  let lookups = 0;
  const lib = new Proxy(raw, {
    get: (target, property) => {
      if (typeof property !== 'string' || !property.startsWith('inv:')) return undefined;
      lookups++;
      return target[property as InventionDef['id']];
    },
  });
  const lattice = growingLattice(
    Array.from({ length: 256 }, (_, x) => ({
      at: { x, y: 0 },
      rune: 'inv:chain-2499' as const,
    })),
  );
  expect(inkUsed(lattice, {}, lib)).toBe(256 * (inkOf('strike') + 2500 * METHODS.repeat.ink));
  expect(lookups).toBeLessThan(6000);
});

test('unsafe invention arithmetic refuses an import as a resource issue and retains original storage', () => {
  const save = newSave(1);
  save.profile.inventions = chain(53, true);
  const text = saveText(save);
  const backend = memoryBackend(text);
  expect(() => parseSaveText(text)).toThrow(ResourceLimitError);
  expect(loadSave(backend, 2).refused?.message).toMatch(/arithmetic/);
  expect(backend.read()).toBe(text);
  expect(backend.corrupt).toBeNull();
});

test('unsafe aggregate placement prices are rejected before compilation', () => {
  const save = newSave(1);
  save.profile.inventions = chain(50, true);
  save.profile.lattices.draughtsman = Array.from({ length: 4 }, (_, x) => ({
    at: { x, y: 0 },
    rune: 'inv:chain-49',
  }));
  expect(() => parseSaveText(saveText(save))).toThrow(ResourceLimitError);
});

test('bare Glyph body expansion is charged before import, independently of arguments', () => {
  const save = newSave(1);
  save.profile.glyphs = [
    {
      id: 'large',
      name: 'Large',
      kind: 'payload',
      cells: Array.from({ length: 4096 }, (_, x) => ({ at: { x, y: 0 }, rune: 'ink' })),
      entry: { x: 0, y: 0 },
      exits: [],
      version: 1,
      params: [],
      extraExit: null,
      idiom: null,
    },
  ];
  save.profile.lattices.draughtsman = Array.from({ length: 256 }, (_, x) => ({
    at: { x, y: 0 },
    glyph: 'large',
    dir: 'right',
  }));
  const text = saveText(save);
  const backend = memoryBackend(text);
  expect(() => parseSaveText(text)).toThrow(ResourceLimitError);
  expect(loadSave(backend, 2).refused?.message).toMatch(/work/);
  expect(backend.read()).toBe(text);
  expect(backend.corrupt).toBeNull();
});

test('256 ordinary eight-cell Glyphs remain admissible and compile independently', () => {
  const save = newSave(1);
  save.profile.glyphs = [
    {
      id: 'small',
      name: 'Small',
      kind: 'spell',
      cells: Array.from({ length: 8 }, (_, x) =>
        x === 0
          ? { at: { x, y: 0 }, rune: 'bolt', dir: 'right' }
          : { at: { x, y: 0 }, rune: 'ink' },
      ),
      entry: { x: 0, y: 0 },
      exits: [],
      version: 1,
      params: [],
      extraExit: null,
      idiom: null,
    },
  ];
  save.profile.lattices.draughtsman = Array.from({ length: 256 }, (_, x) => ({
    at: { x: x * 20, y: 0 },
    glyph: 'small',
    dir: 'right',
  }));
  const restored = parseSaveText(saveText(save));
  const lattice = growingLattice(restored.profile.lattices.draughtsman);
  const def = restored.profile.glyphs[0];
  if (!def) throw new Error('expected Glyph');
  // A per-Glyph linear neighbor search would throw instead of hiding quadratic work in timing.
  Object.defineProperty(lattice.runes, 'find', {
    value: () => {
      throw new Error('page scan');
    },
  });
  expect(inkUsed(lattice, { small: def })).toBe(256 * glyphCost(def));
  expect(compileLattice(lattice, { small: def }).spells).toHaveLength(256);
  const compiled = compiledFor(restored.profile, 'draughtsman');
  expect(compiled.spells).toHaveLength(256);
  expect(compiled.spells.every((spell) => spell.path.length === 8)).toBe(true);
});

test('cycle checks follow deep dependencies without changing runtime nesting rules', () => {
  const definitions = chain(2500);
  const first = definitions[0];
  if (!first) throw new Error('expected invention');
  expect(
    inventionIssue(
      { ...first, parts: ['inv:chain-2499'] },
      {
        runes: ['strike'],
        methods: ['repeat'],
        events: [],
        inventions: libraryOf(definitions),
      },
    ),
  ).toBe("an invention can't contain itself");
});
