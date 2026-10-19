import { expect, test } from 'vitest';
import type { EnemyId, MemberId } from '$data';
import { traitSource, unitTraits } from '../../src/app/describe';
import { battleOf } from './battleFixtures';

const enemy = (def: EnemyId, extra = {}) => ({
  kind: 'enemy' as const,
  def,
  mark: null,
  collar: false,
  shackle: false,
  held: false,
  stunned: false,
  ...extra,
});
const member = (def: MemberId) => ({ ...enemy('rat'), kind: 'member' as const, def });

test('enemy traits spell out their effect', () => {
  expect(unitTraits(enemy('rat'))).toEqual(['leaves an oil trail']);
  expect(unitTraits(enemy('sentry', { collar: true }))).toEqual(['collared (conducts Spark)']);
  expect(unitTraits(enemy('familiar'))).toEqual(['its spit inks']);
  expect(unitTraits(enemy('rat', { mark: 'plain' }))[0]).toBe('marked (a Spark bursts it)');
  expect(unitTraits(enemy('rat', { mark: 'deep' }))[0]).toBe('deeply marked (two Sparks to clear)');
});

test('shackles, holds and stuns are named, a shackle outranks a collar', () => {
  expect(unitTraits(enemy('dummy', { shackle: true, collar: true }))).toEqual([
    'shackled (cannot move)',
  ]);
  expect(unitTraits(enemy('dummy', { held: true, stunned: true }))).toEqual([
    'held in place',
    'stunned (skips its next action)',
  ]);
});

test('members show their lean', () => {
  expect(unitTraits(member('stoker'))).toEqual(['trained in Seam', 'gifted in Seam']);
  expect(unitTraits(member('draughtsman'))).toEqual(['trained in Timing', 'gifted in Contracts']);
});

test('engine units read the same as board views', () => {
  const s = battleOf(
    'D r!!&$ . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. . . . . .\n. S . . . .',
  );
  const rat = s.units.find((u) => u.def === 'rat');
  if (!rat) throw new Error('no rat');
  expect(traitSource(rat)).toMatchObject({ mark: 'deep', collar: true, shackle: true });
  expect(unitTraits(traitSource(rat))).toEqual([
    'deeply marked (two Sparks to clear)',
    'shackled (cannot move)',
    'leaves an oil trail',
  ]);
});
