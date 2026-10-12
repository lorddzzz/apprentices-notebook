import { expect, test } from 'vitest';
import { type Migration, memoryBackend, migrate, parse, serialize } from '../../src/app/save';

const steps: Migration[] = [
  (d) => ({ ...(d as object), ink: 10 }), // v0 → v1
  (d) => ({ ...(d as { ink: number }), ink: (d as { ink: number }).ink * 2 }), // v1 → v2
];

test('round-trips through text', () => {
  const text = serialize({ name: 'a' }, 2);
  expect(parse(text, steps)).toEqual({ version: 2, data: { name: 'a' } });
});

test('old saves are migrated step by step', () => {
  const old = serialize({ name: 'a' }, 0);
  expect(parse(old, steps)).toEqual({ version: 2, data: { name: 'a', ink: 20 } });
  expect(migrate({ version: 1, data: { ink: 5 } }, steps)).toEqual({
    version: 2,
    data: { ink: 10 },
  });
});

test('rejects garbage and saves from the future', () => {
  expect(() => parse('{"nope":1}', steps)).toThrow(/valid/);
  expect(() => parse(serialize({}, 9), steps)).toThrow(/newer/);
});

test('memoryBackend round-trips', () => {
  const b = memoryBackend();
  expect(b.read()).toBeNull();
  b.write('hello');
  expect(b.read()).toBe('hello');
  expect(memoryBackend('seed').read()).toBe('seed');
});
