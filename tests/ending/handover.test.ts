import { expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { handover, missingGifts } from '$engine/drawing';

const doorOpen = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, doorSeen: true, hearts: [...p.city.hearts, 'cartographers'] } };
};

test('the owner joins last, with their page, and ending.handover is set', () => {
  const after = handover(doorOpen());
  expect(after.household.members.at(-1)).toBe('owner');
  expect(after.lattices.owner).toBeDefined();
  expect(after.ending).toEqual({ handover: true, creditsSeen: false });
});

test('Splash and Steam are the gifts, and only the missing are added', () => {
  const p = doorOpen();
  expect(missingGifts({ ...p, known: ['spark'] })).toEqual(['splash', 'steam']);
  const after = handover({ ...p, known: [...p.known, 'splash'] });
  expect(after.known.filter((k) => k === 'splash')).toHaveLength(1);
  expect(after.known).toContain('steam');
});

test('a sealed door refuses', () => {
  const p = doorOpen();
  expect(() => handover({ ...p, city: { ...p.city, hearts: ['seam'] } })).toThrow();
});
