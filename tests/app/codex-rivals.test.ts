import { expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { partsOf, rivalPageRows } from '../../src/app/codexRivals';

/** The Codex recovered-page rows (rivals plan RV-17, P12). */

const held = (known: Profile['known']): Profile => ({
  ...newProfile(),
  known,
  pages: ['lamplighter:lantern'],
});

test('no page is listed until one is held', () => {
  expect(rivalPageRows(newProfile())).toEqual([]);
});

test('parts are the distinct runes of the wiring, in reading order', () => {
  expect(partsOf('Bolt> Jar Oil Spark', []).map((x) => x.rune)).toEqual([
    'bolt',
    'jar',
    'oil',
    'spark',
  ]);
  expect(partsOf('Bolt> Oil Oil', []).map((x) => x.rune)).toEqual(['bolt', 'oil']);
});

test('owned and missing parts follow the known runes', () => {
  const [row] = rivalPageRows(held(['bolt', 'oil']));
  expect(row?.parts.filter((x) => x.owned).map((x) => x.rune)).toEqual(['bolt', 'oil']);
  expect(row?.parts.filter((x) => !x.owned).map((x) => x.rune)).toEqual(['jar', 'spark']);
  expect(row?.ownedCount).toBe(2);
});

test('the trick is listed apart from the parts, marked his alone', () => {
  const [row] = rivalPageRows(held([]));
  expect(row?.trick?.name).toBe('The long wick');
  expect(row?.trick?.text).toContain('not in the trial');
  expect(row?.parts).toHaveLength(4);
});
