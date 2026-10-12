import { expect, test } from 'vitest';
import { createRng, deriveSeed, pickWeighted } from '$engine';

test('same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  expect(Array.from({ length: 5 }, () => a.next())).toEqual(
    Array.from({ length: 5 }, () => b.next()),
  );
});

test('different seeds diverge', () => {
  expect(createRng(1).next()).not.toBe(createRng(2).next());
});

test('state resumes the sequence exactly', () => {
  const a = createRng(7);
  a.next();
  a.next();
  const resumed = createRng(a.state());
  expect(resumed.next()).toBe(a.next());
});

test('int stays within inclusive bounds', () => {
  const r = createRng(99);
  for (let i = 0; i < 200; i++) {
    const v = r.int(3, 5);
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(5);
  }
});

test('deriveSeed is stable and salt-sensitive', () => {
  expect(deriveSeed(123, 1)).toBe(deriveSeed(123, 1));
  expect(deriveSeed(123, 1)).not.toBe(deriveSeed(123, 2));
  expect(deriveSeed(123, 1)).not.toBe(deriveSeed(124, 1));
});

test('pickWeighted respects zero weights', () => {
  const r = createRng(5);
  for (let i = 0; i < 200; i++) {
    expect(pickWeighted(r, [0, 3, 0, 1])).not.toBe(0);
    expect(pickWeighted(r, [0, 3, 0, 1])).not.toBe(2);
  }
  expect(() => pickWeighted(r, [0, 0])).toThrow();
});
