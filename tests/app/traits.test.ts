import { expect, test } from 'vitest';
import type { EnemyId } from '$data';
import { unitTraits } from '../../src/app/describe';

const enemy = (def: EnemyId, extra = {}) => ({
  kind: 'enemy' as const,
  def,
  inked: false,
  brass: false,
  oilSoaked: false,
  ...extra,
});

test('enemy traits spell out their effect', () => {
  expect(unitTraits(enemy('rat', { oilSoaked: true }))).toEqual([
    'oil-soaked (fire +1)',
    'leaves an oil trail',
  ]);
  expect(unitTraits(enemy('sentry', { brass: true }))).toEqual(['brass (conducts spark)']);
  expect(unitTraits(enemy('familiar'))).toEqual(['its spit inks']);
  expect(unitTraits(enemy('rat', { inked: true }))[0]).toBe('inked (+1 damage taken)');
});

test('members show their affinity', () => {
  const m = { kind: 'member' as const, inked: false, brass: false, oilSoaked: false };
  expect(unitTraits({ ...m, def: 'stoker' })).toEqual(['Spark and Oil runes +1']);
  expect(unitTraits({ ...m, def: 'draughtsman' })).toEqual(['Ink runes +1']);
});
