import { describe, expect, it } from 'vitest';
// The engine barrel first: the bridges module has an import cycle that needs this order.
import '$engine';
import type { Trip } from '$engine';
import { BRIDGES_UI } from '../../../src/ui/districts/bridges';
import {
  bindEventCard,
  crossroadsCards,
  foeCount,
  foesLine,
  passView,
  spanCards,
  watchpostView,
} from '../../../src/ui/districts/bridges/ledger';

const trip = (over: Partial<Trip>): Trip =>
  ({
    district: 'bridges',
    status: 'crossroads',
    encounter: 0,
    offers: [],
    ...over,
  }) as unknown as Trip;

describe('bridges crossroads copy (BR-15)', () => {
  it('counts foes from a layout', () => {
    expect(foeCount('j{span} .{span}\nJ{span} P{span}')).toBe(2);
  });
  it('gives two span cards with ledger, floor and loot after each room', () => {
    for (const after of [0, 1, 2, 3]) {
      const cards = spanCards(after);
      expect(cards.map((c) => c.kind)).toEqual(['sound', 'crumbling']);
      for (const c of cards) {
        expect(c.ledger.length).toBeGreaterThan(20);
        expect(c.floor).toMatch(/Stone/);
        expect(c.loot).toMatch(/ink/i);
      }
    }
    expect(foesLine(1, 'sound')).toMatch(/foes?/);
  });
  it('crumbling loot has no ink, sound has', () => {
    const [s, c] = spanCards(0);
    expect(s?.loot).toMatch(/^Steady ink/);
    expect(c?.loot).toMatch(/^No ink/);
  });
  it('shows cards only at a bridges crossroads', () => {
    expect(crossroadsCards(trip({}))).toHaveLength(2);
    expect(crossroadsCards(trip({ status: 'looting' }))).toHaveLength(0);
    expect(crossroadsCards(trip({ district: 'canals' }))).toHaveLength(0);
  });
  it('watchpost and pass notes follow the offers', () => {
    expect(watchpostView(trip({}))).toBeNull();
    const warden = trip({ offers: [{ kind: 'recruit', apprentice: 'warden' }] });
    expect(watchpostView(warden)?.scene).toMatch(/watchpost/);
    expect(passView(trip({ offers: [{ kind: 'key', district: 'bridges' }] }))?.title).toMatch(
      /pass/,
    );
    expect(passView(trip({ offers: [{ kind: 'key', district: 'seam' }] }))).toBeNull();
  });
  it('names the pushed page and registers its card', () => {
    expect(bindEventCard({ kind: 'bindEvent', event: 'pushed' })?.title).toBe('The pushed page');
    expect(bindEventCard({ event: 'nope' })).toBeNull();
    expect(BRIDGES_UI.offerCards?.bindEvent).toBeDefined();
    expect(BRIDGES_UI.crossroadsNote).toBeDefined();
  });
});
