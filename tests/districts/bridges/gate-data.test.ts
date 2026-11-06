import { describe, expect, test } from 'vitest';
import { DISTRICTS, type DistrictId, LOOT_TABLES, PLAYABLE_DISTRICTS } from '$data';
import {
  BRIDGES_HEARING,
  BRIDGES_KEY_HINT,
  BRIDGES_LEDGER,
  BRIDGES_PASS_CARD,
  BRIDGES_PASS_GATE,
} from '$data/districts/bridges';
import { WARDENS_PASS } from '$data/districts/canals';
import { keyOffer, newProfile, startTrip } from '$engine';

/** BR-12 data shapes: the gate, the map hint, the pass card, the hearing lines and the lore. */

describe('BR-12 key gate (P14)', () => {
  test('the bridges open by the pass (BR-R); it is data the district owns', () => {
    expect(DISTRICTS.bridges.gate).toEqual(BRIDGES_PASS_GATE);
    expect(PLAYABLE_DISTRICTS).toContain('bridges');
    expect(BRIDGES_PASS_GATE).toEqual(WARDENS_PASS);
    expect(BRIDGES_PASS_GATE).toMatchObject({
      kind: 'key',
      from: 'canals',
      afterRoom: 3,
      guaranteed: true,
    });
    expect(Object.hasOwn(LOOT_TABLES, BRIDGES_PASS_GATE.table)).toBe(true);
  });

  test('the key is offered after canal room 4 only, once heard, and keyOffer reads it', () => {
    const p = newProfile();
    const heard: DistrictId[] = [...p.city.heard, 'bridges'];
    const open: DistrictId[] = [...p.city.open, 'canals'];
    const withCity = { ...p, city: { ...p.city, heard, open } };
    const t = startTrip(withCity, 3, 'canals');
    const tables = { ...DISTRICTS, bridges: { ...DISTRICTS.bridges, gate: BRIDGES_PASS_GATE } };
    expect(keyOffer(withCity, t, 'canalDeep', tables, 3)).toMatchObject({
      district: 'bridges',
      guaranteed: true,
    });
    expect(keyOffer(withCity, t, 'canalDeep', tables, 2)).toBeNull();
  });

  test('map hint and pass card read as copy', () => {
    expect(BRIDGES_KEY_HINT).toMatch(/pass/);
    expect(BRIDGES_PASS_CARD.title.length).toBeGreaterThan(0);
    expect(BRIDGES_PASS_CARD.text.length).toBeGreaterThan(0);
  });
});

describe('BR-12 hearing lines (P15)', () => {
  test('both lines are written, the rumour keeps its five trips', () => {
    expect(BRIDGES_HEARING).toHaveLength(2);
    for (const c of BRIDGES_HEARING) expect(c.text?.length ?? 0).toBeGreaterThan(0);
    expect(BRIDGES_HEARING[1]).toMatchObject({ kind: 'trips', atLeast: 5, voice: 'rumour' });
  });
});

describe('BR-12 mason ledger lines (P18)', () => {
  test('about ten lines, unique ids, each a short paragraph', () => {
    expect(BRIDGES_LEDGER.length).toBeGreaterThanOrEqual(8);
    expect(BRIDGES_LEDGER.length).toBeLessThanOrEqual(12);
    expect(new Set(BRIDGES_LEDGER.map((l) => l.id)).size).toBe(BRIDGES_LEDGER.length);
    for (const l of BRIDGES_LEDGER) {
      const words = l.text.trim().split(/\s+/).length;
      expect(words, l.id).toBeGreaterThanOrEqual(25);
      expect(words, l.id).toBeLessThanOrEqual(70);
      expect(l.title.length, l.id).toBeGreaterThan(0);
    }
  });

  test('a span card at each Crossroads (rooms 1-4) for both span kinds, plus the three singles', () => {
    const spans = BRIDGES_LEDGER.flatMap((l) => (l.at.kind === 'span' ? [l.at] : []));
    for (const after of [0, 1, 2, 3]) {
      for (const span of ['sound', 'crumbling'] as const) {
        expect(spans.filter((s) => s.after === after && s.span === span)).toHaveLength(1);
      }
    }
    const kinds = BRIDGES_LEDGER.map((l) => l.at.kind);
    expect(kinds.filter((k) => k === 'watchpost')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'chief')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'heart')).toHaveLength(1);
  });
});
