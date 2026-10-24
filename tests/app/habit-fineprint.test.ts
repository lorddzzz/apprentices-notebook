import { expect, test } from 'vitest';
import type { LineId } from '$data';
import { habitFinePrint } from '$engine';

test('habitFinePrint: nothing witnessed lists no lines and counts them all', () => {
  const r = habitFinePrint({ witnessed: [] }, 'longTouch');
  expect(r.seen).toEqual([]);
  expect(r.unseen).toBe(2);
});

test('habitFinePrint: witnessed lines list, the rest are only counted', () => {
  const r = habitFinePrint({ witnessed: ['longTouch:cloud'] }, 'longTouch');
  expect(r.seen.map((l) => l.id)).toEqual(['longTouch:cloud']);
  expect(r.unseen).toBe(1);
});

test('habitFinePrint: other subjects never leak in, and a habit with no rows is empty', () => {
  const r = habitFinePrint(
    { witnessed: ['markTwice:deepMark', 'bolt:cloud'] as LineId[] },
    'twoJars',
  );
  expect(r.seen).toEqual([]);
  expect(r.unseen).toBe(0);
});
