import { describe, expect, test } from 'vitest';
import {
  openTermLine,
  settledTermLine,
  termLines,
  termStatusLines,
  tripTerms,
} from '../../src/app/inkTerms';

const trip = (terms: unknown[], district = 'inkQuarter') => ({
  district,
  kit: { state: { terms } },
});
const open = { id: 't0', def: 'inkQuarter:term-sampler', signedAt: 0, status: 'open' };

describe('term lines', () => {
  test('a listed term reads its three lines; an unlisted one reads plainly', () => {
    expect(termLines('inkQuarter:term-sampler')).toEqual({
      reward: 'a second page from this room',
      condition: 'win the next room within 5 rounds',
      penalty: 'lose 2 ink from the trip',
    });
    expect(termLines('inkQuarter:term-gone').reward).toContain('no longer listed');
  });

  test('terms are read only on the quarter', () => {
    expect(tripTerms(trip([open]))).toHaveLength(1);
    expect(tripTerms(trip([open], 'seam'))).toEqual([]);
    expect(tripTerms(null)).toEqual([]);
  });
});

describe('the open-term line', () => {
  test('counts rounds against the limit', () => {
    expect(openTermLine(trip([open]), 3)?.count).toEqual({ round: 3, limit: 5, over: false });
    expect(openTermLine(trip([open]), 9)?.count).toEqual({ round: 5, limit: 5, over: true });
  });
  test('a plain win condition has no count; no open term has no line', () => {
    const sand = { id: 't0', def: 'inkQuarter:term-sand', signedAt: 1, status: 'open' };
    expect(openTermLine(trip([sand]), 2)?.count).toBeNull();
    expect(openTermLine(trip([{ ...open, status: 'paid' }]), 2)).toBeNull();
  });
});

describe('the settled line', () => {
  test('a term signed a room back shows paid or broken', () => {
    expect(settledTermLine(trip([{ ...open, status: 'paid' }]), 1)?.status).toBe('paid');
    const broken = settledTermLine(trip([{ ...open, status: 'broken' }]), 1);
    expect(broken).toEqual({
      status: 'broken',
      text: 'The term is broken: lose 2 ink from the trip.',
    });
  });
  test('nothing for an open term or another room', () => {
    expect(settledTermLine(trip([open]), 1)).toBeNull();
    expect(settledTermLine(trip([{ ...open, status: 'paid' }]), 2)).toBeNull();
  });
  test('the status block lists every term', () => {
    const lines = termStatusLines(trip([{ ...open, status: 'paid' }]));
    expect(lines).toEqual([{ status: 'paid', text: 'Term paid: a second page from this room' }]);
  });
});
