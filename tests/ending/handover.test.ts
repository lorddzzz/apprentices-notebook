import { expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { ownerDoor } from '$engine/districts/lowerSeam';
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

test('the handover opens exactly when the lower Seam shows the door open', () => {
  const p = newProfile();
  for (const doorSeen of [false, true]) {
    for (const hearts of [['seam'], ['seam', 'cartographers']] as const) {
      const q = { ...p, city: { ...p.city, doorSeen, hearts: [...hearts] } };
      if (ownerDoor(q) === 'open') expect(() => handover(q)).not.toThrow();
      else expect(() => handover(q)).toThrow('The owner’s door is not open');
    }
  }
});
