import { expect, test } from 'vitest';
import {
  assertImportStructure,
  assertImportText,
  IMPORT_POLICY,
  importBudget,
  ResourceLimitError,
} from '$engine';

test('UTF-8 limits count astral and replacement characters without an encoded allocation', () => {
  for (const text of ['abc', 'č', '漢', '😀', '\ud800']) {
    const bytes = new TextEncoder().encode(text).length;
    expect(() => assertImportText(text, bytes)).not.toThrow();
    expect(() => assertImportText(text, bytes - 1)).toThrow(ResourceLimitError);
  }
  expect(() => assertImportText('a'.repeat(IMPORT_POLICY.maxBytes))).not.toThrow();
  expect(() => assertImportText('a'.repeat(IMPORT_POLICY.maxBytes + 1))).toThrow(
    ResourceLimitError,
  );
});

test('aggregate budgets accept the boundary and refuse the next entry atomically', () => {
  const b = importBudget();
  b.collection(IMPORT_POLICY.maxCollectionEntries);
  expect(() => b.collection(IMPORT_POLICY.maxCollectionEntries + 1)).toThrow(ResourceLimitError);
  for (const [resource, limit] of [
    ['entries', IMPORT_POLICY.maxTotalEntries],
    ['tokens', IMPORT_POLICY.maxTokens],
    ['work', IMPORT_POLICY.maxWork],
  ] as const) {
    b.spend(resource, limit);
    expect(() => b.spend(resource)).toThrow(ResourceLimitError);
  }
});

test('iterative structure preflight counts arrays/fields and protects nesting', () => {
  const input = { a: Array.from({ length: 100 }, () => ({ x: 1, y: 2 })) };
  const original = structuredClone(input);
  assertImportStructure(input);
  expect(input).toEqual(original);
  expect(() =>
    assertImportStructure(Array(IMPORT_POLICY.maxCollectionEntries + 1).fill(0)),
  ).toThrow(ResourceLimitError);
  let nested: unknown = {};
  for (let i = 0; i < IMPORT_POLICY.maxDepth; i++) nested = { nested };
  expect(() => assertImportStructure(nested)).not.toThrow();
  expect(() => assertImportStructure({ nested })).toThrow(ResourceLimitError);
  const aggregate = Array.from({ length: 4 }, () => Array<number>(24_999).fill(0));
  expect(() => assertImportStructure(aggregate)).not.toThrow(); // 4 + 99,996 slots
  aggregate[0]?.push(0);
  expect(() => assertImportStructure(aggregate)).toThrow(ResourceLimitError);
  expect(new ResourceLimitError('work', 10).kind).toBe('resource-limit');
});
