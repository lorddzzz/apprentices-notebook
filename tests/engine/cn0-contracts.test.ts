import { describe, expect, test } from 'vitest';
import { ENEMIES, ENEMY_IDS } from '$data';
import {
  BARGE,
  CANAL_LEDGERS,
  MOOR_PIECE,
  RIVALS_LIVE,
  WARDENS_PASS,
} from '$data/districts/canals';
import { DISTRICTS } from '$data/districts/index';
import { KIT } from '$engine/districts';
import { MOOR_DEF, rivalSlot } from '$engine/districts/canals';

/** CN-0: the canals revisit's contracts are declared and inert until their tasks wire them. */
describe('CN-0 contracts', () => {
  test('the barge is a floating bystander, registered but not yet placeable', () => {
    expect(ENEMIES.barge).toBe(BARGE);
    expect(BARGE).toMatchObject({ token: 'k', hp: 1, attack: null, floats: true, bystander: true });
    expect(ENEMY_IDS).not.toContain('barge');
  });

  test('the mooring piece is in the kit and does nothing yet', () => {
    expect(KIT.pieces[MOOR_PIECE]).toBe(MOOR_DEF);
    expect(KIT.tokens.moor).toBe(MOOR_DEF);
    expect(MOOR_DEF.solid).toBe('none');
    expect(MOOR_DEF.triggers).toEqual({});
  });

  test("room 4's rival slot falls back to the Snuffer while the Lamplighter is off", () => {
    expect(RIVALS_LIVE.lamplighter).toBe(false);
    expect(rivalSlot('lamplighter')).toBe('snuffer');
    expect(rivalSlot('lamplighter', { lamplighter: true })).toBe('lamplighter');
  });

  test("the lamp-mother's rhythm is data, at today's numbers", () => {
    expect(ENEMIES.mother.summon).toEqual({ cap: 4, flareEvery: 3 });
  });

  test('the pass, ledgers and recruit placement are declared; the bridges are not yet keyed', () => {
    expect(WARDENS_PASS).toMatchObject({ from: 'canals', afterRoom: 3, guaranteed: true });
    expect(DISTRICTS.bridges.gate.kind).toBe('drawing');
    expect(CANAL_LEDGERS.map((l) => l.id)).toEqual(
      [1, 2, 3, 4, 5].map((n) => `canals:ledger-${n}`),
    );
    expect(DISTRICTS.canals.papers).toBeUndefined();
    expect(DISTRICTS.canals.recruit).toEqual([{ apprentice: 'runaway', room: 2 }]);
  });
});
