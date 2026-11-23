import { describe, expect, test } from 'vitest';
import {
  FIRST_EVENING,
  LOWEST_FLOOR_LINE,
  MAP_HEADING,
  WIPE_LINES,
  wipeLine,
} from '$data/narration';
import { RIVALS } from '$data/rivals';
import { isFirstEvening } from '../../src/app/firstEvening';

describe('narration lines (narrative-audit §2)', () => {
  test('the city is named on the map and nowhere is the owner', () => {
    expect(MAP_HEADING).toContain('Halvemeer');
    const all = [
      ...Object.values(FIRST_EVENING),
      MAP_HEADING,
      LOWEST_FLOOR_LINE,
      ...WIPE_LINES,
    ].join(' ');
    expect(all).not.toMatch(/Marit|Vos/);
  });

  test('a wipe line is one of three, and the same place reads the same', () => {
    expect(new Set(WIPE_LINES).size).toBe(3);
    for (const place of ['The towpath', 'The dome', 'The great bell', '']) {
      expect(WIPE_LINES).toContain(wipeLine(place));
      expect(wipeLine(place)).toBe(wipeLine(place));
    }
  });

  test('no line ends in an exclamation mark', () => {
    const all = [...Object.values(FIRST_EVENING), MAP_HEADING, LOWEST_FLOOR_LINE, ...WIPE_LINES];
    for (const line of all) expect(line).not.toContain('!');
  });

  test('every rival steps in with a line', () => {
    for (const id of [
      'lamplighter',
      'postmaster',
      'bathSteward',
      'chiefWarden',
      'carillonneur',
      'registrar',
    ] as const) {
      expect(RIVALS[id]?.opening?.length).toBeGreaterThan(10);
    }
  });
});

describe('the first evening', () => {
  test('shows on a notebook that has never cast, and never out on a trip', () => {
    expect(isFirstEvening({}, false)).toBe(true);
    expect(isFirstEvening({}, true)).toBe(false);
  });
  test('ends with the first cast', () => {
    const ledger = { casts: 1, biggest: null, districts: [] };
    expect(isFirstEvening({ ledger }, false)).toBe(false);
  });
});
