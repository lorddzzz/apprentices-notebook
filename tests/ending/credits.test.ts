import { expect, test } from 'vitest';
import { newProfile } from '$engine';
import { creditsOf, endingOf, seeCredits } from '$engine/drawing';

test('idioms are the idiom: entries of named, and trips come from the city', () => {
  const p = newProfile();
  const c = creditsOf({
    ...p,
    named: ['compound:stain', 'idiom:bonfire', 'burst:fire'],
    city: { ...p.city, trips: 7 },
  });
  expect(c.idioms).toEqual(['idiom:bonfire']);
  expect(c.trips).toBe(7);
});

test('a ledger with districts wins over the city order; none gives the city order', () => {
  const p = newProfile();
  const city = { ...p.city, open: ['seam' as const, 'canals' as const] };
  expect(creditsOf({ ...p, city }).districts).toEqual(['seam', 'canals']);
  const ledger = { casts: 1, biggest: null, districts: ['canals' as const, 'seam' as const] };
  expect(creditsOf({ ...p, city, ledger }).districts).toEqual(['canals', 'seam']);
});

test('seeCredits sets creditsSeen once and keeps handover', () => {
  const p = { ...newProfile(), ending: { handover: true, creditsSeen: false } };
  const seen = seeCredits(p);
  expect(endingOf(seen)).toEqual({ handover: true, creditsSeen: true });
  expect(seeCredits(seen)).toBe(seen);
});
