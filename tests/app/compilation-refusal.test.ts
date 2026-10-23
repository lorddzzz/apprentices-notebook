import { expect, test } from 'vitest';
import {
  applyAction,
  compiledFor,
  growingLattice,
  newSave,
  type PlacedRune,
  ResourceLimitError,
  scenarioBattle,
  serializeLattice,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { loadSave, memoryBackend, parseSaveText, saveText } from '../../src/app/save';
import { straightPage } from '../fixtures/growing-pages/pages';

function converging(count: number): PlacedRune[] {
  const runes: PlacedRune[] = [];
  for (let y = 0; y < count; y++)
    runes.push(
      { at: { x: 0, y }, rune: 'bolt', dir: 'right' },
      { at: { x: 1, y }, rune: 'bend', dir: 'down' },
    );
  runes.push({ at: { x: 1, y: count }, rune: 'strike' });
  return runes;
}

test('save loading and manual import refuse converging wiring without replacing either notebook', () => {
  const save = newSave(1);
  save.profile.lattices.draughtsman = converging(1500);
  const text = saveText(save);
  expect(() => parseSaveText(text)).toThrow(ResourceLimitError);
  const stored = memoryBackend(text);
  expect(loadSave(stored, 2)).toMatchObject({ recovered: false, refused: { text } });
  expect(stored.read()).toBe(text);
  expect(stored.corrupt).toBeNull();

  const original = saveText(newSave(3));
  const backend = memoryBackend(original);
  const game = new GameStore(backend, () => 4);
  expect(game.importText(text)).toMatch(/work limit/);
  expect(backend.read()).toBe(original);
  expect(game.save).toEqual(newSave(3));
}, 60_000);

test('both member pages consume the same save reference and compilation allowance', () => {
  const save = newSave(1);
  save.profile.lattices.draughtsman = converging(600);
  expect(() => parseSaveText(saveText(save))).not.toThrow();
  save.profile.lattices.stoker = converging(600);
  expect(() => parseSaveText(saveText(save))).toThrow(
    expect.objectContaining({ resource: 'work' }),
  );
});

test('a 16k connected page remains importable and an accepted scenario keeps cast identity', () => {
  const save = newSave(1);
  save.profile.lattices.draughtsman = straightPage(16_384);
  const accepted = parseSaveText(saveText(save));
  expect(compiledFor(accepted.profile, 'draughtsman').spells[0]?.path).toHaveLength(16_384);

  const page = growingLattice(converging(3));
  const external = scenarioBattle({
    board: 'D . r',
    lattices: { draughtsman: serializeLattice(page) },
  });
  const trusted = scenarioBattle({ board: 'D . r' }, { lattices: { draughtsman: page } });
  const action = {
    type: 'cast',
    unit: 'draughtsman',
    spell: '0,0',
    aim: { kind: 'dir', dir: 'right' },
  } as const;
  const cast = applyAction(external, action);
  expect(cast.events).toEqual(applyAction(trusted, action).events);
  expect(cast.events).toContainEqual(
    expect.objectContaining({
      type: 'damage',
      amount: 2,
      origin: { cast: 1, caster: 'draughtsman', spell: '0,0' },
    }),
  );
  expect(cast.state.units.find((u) => u.kind === 'member')?.charges['0,0']).toBe(4);
});
