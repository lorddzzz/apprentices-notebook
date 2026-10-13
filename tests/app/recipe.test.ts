import { expect, test } from 'vitest';
import { INTERACTION_IDS, type MaterialId } from '$data';
import { compileLattice, parseLattice, type Spell } from '$engine';
import { spellRecipe, stepNumbers } from '../../src/app/recipe';

function only(text: string, affinity: readonly MaterialId[] = []): Spell {
  const [s] = compileLattice(parseLattice(text), affinity).spells;
  if (!s) throw new Error('no spell');
  return s;
}
const all = INTERACTION_IDS;
const recipe = (text: string, affinity: MaterialId[] = [], known = all) =>
  spellRecipe(only(text, affinity), affinity, known);

test('oil then spark: the oil ignites', () => {
  const r = recipe('Bolt> Oil Spark');
  expect(r.source).toBe('Bolt hits the first thing in line for 2 damage.');
  expect(r.steps.map((s) => [s.n, s.rune])).toEqual([
    [1, 'oil'],
    [2, 'spark'],
  ]);
  expect(r.steps[1]?.reactions).toEqual(['the oil ignites: fire for 2 rounds']);
  expect(r.steps.every((s) => s.note === null)).toBe(true);
});

test('spark then oil: no fire, and the late oil says why', () => {
  const r = recipe('Bolt> Spark Oil');
  expect(r.steps[0]?.reactions).toEqual([]);
  expect(r.steps[1]?.note).toBe("The Spark (1) comes before this oil, so it won't reach it.");
});

test('brass and steam before spark: conduct and arc', () => {
  const r = recipe('Bolt> Brass Steam Spark');
  expect(r.steps[2]?.reactions).toEqual([
    'it runs through all connected brass',
    'it arcs through the whole steam cloud',
  ]);
});

test('steam keeps oil from lighting, and puts fire out', () => {
  expect(recipe('Bolt> Oil Steam Spark').steps[2]?.reactions).toContain(
    'the steam keeps the oil from lighting',
  );
  expect(recipe('Bolt> Oil Spark Steam').steps[2]?.reactions).toEqual([
    'it puts the fire out (the oil stays)',
  ]);
});

test('a Fork numbers the left branch first, and the right branch sees it', () => {
  // Bolt points right into the Fork: left turns up (Oil), right turns down (Spark).
  const r = recipe('. Oil\nBolt> Fork\n. Spark');
  expect(r.steps.map((s) => s.rune)).toEqual(['oil', 'spark']);
  expect(r.steps[1]?.reactions).toEqual(['the oil ignites: fire for 2 rounds']);
  expect(r.notes).toContain(
    'A Fork runs one branch to the end, then the other: follow the numbers.',
  );
  expect([...stepNumbers(r)]).toEqual([
    ['1,0', 1],
    ['1,2', 2],
  ]);
});

test('unknown interactions are hinted, not named', () => {
  const r = recipe('Bolt> Oil Spark', [], []);
  expect(r.steps[1]?.reactions).toEqual([
    'something happens with the oil (not in your notebook yet)',
  ]);
});

test('affinity, area and triggers read out', () => {
  const r = recipe('Bolt> Ink OnInked Spark', ['ink']);
  expect(r.steps[0]?.text).toMatch(
    /^Ink marks the tile it hits and 1 tile around it \(\+1 affinity\)/,
  );
  expect(r.steps[1]).toMatchObject({ rune: 'onInked', depth: 0, note: null });
  expect(r.steps[2]).toMatchObject({ rune: 'spark', depth: 1 });
  expect(r.steps[2]?.reactions).toEqual(['an inked survivor detonates']);
  expect(recipe('Bolt> OnInked Spark').steps[0]?.note).toMatch(/Nothing earlier inks/);
  const kill = recipe('Bolt> OnKill Oil');
  expect(kill.steps[1]?.text).toMatch(/^Oil coats those tiles/);
});
