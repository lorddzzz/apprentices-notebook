import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
import { newProfile, type Profile } from '$engine';
import { NOTHING_BELOW, TUNED_LINE, underSeam } from '../../src/app/city';

/** SM-11: what the slot under the Seam shows for 0, 1 and 5 floors and for small parties. */
const past = (hearts: readonly DistrictId[], open: readonly DistrictId[] = []): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, hearts: [...hearts], open: ['seam', ...open] } };
};
const FIVE: DistrictId[] = ['canals', 'inkQuarter', 'bathhouses', 'bridges', 'foundry'];

describe('the stair under the Seam', () => {
  test('no stair before the Marginalia falls, whatever floors exist', () => {
    const u = underSeam(past([]), 3, FIVE);
    expect(u).toMatchObject({ stair: false, floors: [], canSetOut: false, quiet: null });
  });

  test('0 floors: the stair shows with nothing below, and Set out is off', () => {
    const u = underSeam(past(['seam']), 3, []);
    expect(u).toMatchObject({ stair: true, floors: [], canSetOut: false, quiet: NOTHING_BELOW });
  });

  test('1 floor: one label, Set out on, no quiet line for a trio', () => {
    const u = underSeam(past(['seam'], ['canals']), 3, ['canals']);
    expect(u.floors).toHaveLength(1);
    expect(u.floors[0]?.label.startsWith('Floor 1: ')).toBe(true);
    expect(u).toMatchObject({ canSetOut: true, quiet: null });
  });

  test('5 floors: labels numbered in the order given', () => {
    const u = underSeam(past(['seam']), 3, FIVE);
    expect(u.floors.map((f) => f.id)).toEqual(FIVE);
    expect(u.floors.map((f) => f.label.slice(0, 8))).toEqual([
      'Floor 1:',
      'Floor 2:',
      'Floor 3:',
      'Floor 4:',
      'Floor 5:',
    ]);
  });

  test('fewer than three slotted says tuned for three, once', () => {
    expect(underSeam(past(['seam']), 2, ['canals']).quiet).toBe(TUNED_LINE);
    expect(underSeam(past(['seam']), 1, ['canals']).quiet).toBe(TUNED_LINE);
    expect(underSeam(past(['seam']), 3, ['canals']).quiet).toBeNull();
  });

  test('the real profile reads the real floors: the canals ship one once opened', () => {
    const u = underSeam(past(['seam'], ['canals']));
    expect(u.floors.map((f) => f.id)).toEqual(['canals']);
  });
});
