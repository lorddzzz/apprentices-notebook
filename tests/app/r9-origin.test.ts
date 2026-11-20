import { describe, expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { creditsFallback, lastPageAction, ORIGINS, originOf } from '../../src/app/drawing';

const ending = (handover: boolean, creditsSeen: boolean): Profile => ({
  ...newProfile(),
  ending: { handover, creditsSeen },
});

describe('R9: replays go back to where they were opened from', () => {
  test('the from param names an origin, anything else falls back', () => {
    for (const o of ORIGINS) expect(originOf(o, 'study')).toBe(o);
    expect(originOf('codex', 'map')).toBe('codex');
    expect(originOf(null, 'map')).toBe('map');
    expect(originOf('', 'study')).toBe('study');
    expect(originOf('trip', 'study')).toBe('study');
    expect(originOf('https://example.com', 'map')).toBe('map');
  });

  test('the credits go back to the Codex once seen (only the Codex replays them), else the study', () => {
    expect(creditsFallback(ending(true, false))).toBe('study');
    expect(creditsFallback(ending(true, true))).toBe('codex');
  });

  test('the last page of the handover closes on the first visit and only returns on a replay', () => {
    expect(lastPageAction(ending(false, false))).toBe('close');
    expect(lastPageAction(ending(true, false))).toBe('return');
    expect(lastPageAction(ending(true, true))).toBe('return');
  });
});
