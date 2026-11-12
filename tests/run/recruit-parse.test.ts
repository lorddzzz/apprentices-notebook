import { describe, expect, test } from 'vitest';
import { RECRUITS } from '$data';
import { parseLootItem } from '$engine/trip/offerKinds';

/** FU-20 (RC-4): the recruit card parse takes the recruits only. */
describe('the recruit card parse', () => {
  test('FU-20: a recruit card naming a founder or an unknown id is rejected by the save parser', () => {
    for (const apprentice of Object.keys(RECRUITS)) {
      expect(parseLootItem({ kind: 'recruit', apprentice })).toEqual({
        kind: 'recruit',
        apprentice,
      });
    }
    for (const apprentice of ['draughtsman', 'stoker', 'nobody', '']) {
      expect(parseLootItem({ kind: 'recruit', apprentice })).toBeNull();
    }
  });
});
