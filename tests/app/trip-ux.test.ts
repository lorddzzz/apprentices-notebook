import { expect, test } from 'vitest';
import { type LootItem, newProfile } from '$engine';
import { carriedHome, offerNovelty } from '../../src/app/tripUx';

const rune: LootItem = { kind: 'rune', rune: 'fork' };
const ink: LootItem = { kind: 'ink', amount: 1 };
const method: LootItem = { kind: 'method', method: 'bind' };
const solvent: LootItem = { kind: 'solvent', solvent: 'wax' };
const recruit: LootItem = { kind: 'recruit', apprentice: 'runaway' };

test('offerNovelty: new rune, known rune, ink never', () => {
  const profile = newProfile();
  profile.known = ['ink'];
  expect(offerNovelty(profile, rune)).toBe('new');
  expect(offerNovelty(profile, { kind: 'rune', rune: 'ink' })).toBeNull();
  for (const item of [
    ink,
    { kind: 'vellum', amount: 2 },
    { kind: 'doorway' },
    { kind: 'key', district: 'seam' },
    { kind: 'seam:unknown', data: null },
  ] satisfies LootItem[]) {
    expect(offerNovelty(profile, item)).toBeNull();
  }
});

test('offerNovelty: method, solvent, recruit', () => {
  const profile = newProfile();
  const items = [method, solvent, recruit];
  expect(items.map((item) => offerNovelty(profile, item))).toEqual(['new', 'new', 'new']);

  profile.methods.push(method.method);
  profile.solventsFound.push(solvent.solvent); // Now spent, but previously found.
  profile.household.members.push(recruit.apprentice); // Joined, even if not in a trip slot.
  expect(items.map((item) => offerNovelty(profile, item))).toEqual([null, null, null]);
});

test('carriedHome: firsts lead, order stable', () => {
  const profile = newProfile();
  profile.known = ['ink'];
  const known: LootItem = { kind: 'rune', rune: 'ink' };
  const loot = [ink, solvent, known, rune, recruit];
  expect(carriedHome(profile, loot)).toEqual([
    { item: solvent, first: true },
    { item: rune, first: true },
    { item: recruit, first: true },
    { item: ink, first: false },
    { item: known, first: false },
  ]);
  expect(loot).toEqual([ink, solvent, known, rune, recruit]);
});

test('carriedHome: identical unbanked finds mark one first', () => {
  const profile = newProfile();
  profile.known = [];
  const anotherRune = { ...rune };
  const anotherMethod = { ...method };
  const finds = carriedHome(profile, [rune, ink, anotherRune, method, anotherMethod]);
  expect(finds).toEqual([
    { item: rune, first: true },
    { item: method, first: true },
    { item: ink, first: false },
    { item: anotherRune, first: false },
    { item: anotherMethod, first: false },
  ]);
  expect(finds[0]?.item).toBe(rune);
  expect(finds[3]?.item).toBe(anotherRune);
  expect(profile.known).toEqual([]);
  expect(profile.methods).toEqual([]);
});
