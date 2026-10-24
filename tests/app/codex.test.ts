import { expect, test } from 'vitest';
import { codexView, joinHousehold, newProfile, type Profile } from '$engine';
import { householdRows } from '../../src/app/codexHousehold';

/** The Codex Household tab (recruitment plan RC-8, P13). */

const ids = (p: Profile) => householdRows(p).map((r) => r.card.def.id);

test('a fresh save lists the founding pair only, with where they came from', () => {
  const rows = householdRows(newProfile());
  expect(rows.map((r) => r.card.def.id)).toEqual(['draughtsman', 'stoker']);
  expect(rows[0]?.met).toBe('Here from the start');
});

test('a joined recruit appears with her district; an unjoined one does not', () => {
  const p = newProfile();
  expect(ids(p)).not.toContain('runaway');
  const joined = joinHousehold(p, 'runaway');
  expect(ids(joined)).toEqual(['draughtsman', 'stoker', 'runaway']);
  expect(householdRows(joined).find((r) => r.card.def.id === 'runaway')?.met).toContain('canals');
});

test('a note under the door reveals the Copyist; nobody else is named', () => {
  const p: Profile = { ...newProfile(), recruits: { notes: ['copyist'] } };
  expect(ids(p)).toEqual(['draughtsman', 'stoker', 'copyist']);
  expect(householdRows(p).at(-1)?.met).toBe('Came by a note under the attic door');
});

test('the household never changes the "x / y known" count', () => {
  const p = newProfile();
  const more = joinHousehold(p, 'runaway');
  expect(codexView(more).length).toBe(codexView(p).length);
});
