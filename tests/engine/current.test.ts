import { describe, expect, test } from 'vitest';
import { burnGates, drift, driftPreview, parseLabel, tileAt } from '$engine';
import { board, draft } from '../scenarios/harness';

describe('driftPreview', () => {
  test('is pure: the state it reads is unchanged', () => {
    const s = board('w>o w>o w>\nrw> w>\nS . . d');
    const before = JSON.stringify(s);
    const p = driftPreview(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(p.floats).toHaveLength(2);
    expect(p.units).toEqual([{ unit: 'rat-1', from: { x: 0, y: 1 }, to: { x: 1, y: 1 } }]);
  });

  test('is empty on a board with no water', () => {
    expect(driftPreview(board('S r o'))).toEqual({ floats: [], units: [] });
  });

  test('a float that stays on land at the lane end is not listed', () => {
    expect(driftPreview(board('w>o .\nS d')).floats).toEqual([]);
  });
});

describe('drift', () => {
  test('emits nothing when nothing moves', () => {
    expect(draft(board('S w> d'), drift).events).toEqual([]);
  });

  test('a float never displaces a cloud: it stays where it is', () => {
    const s = draft(board('w>* w>~ .\nS . d'), (ctx) => {
      drift(ctx);
    });
    expect(tileAt(s.state, parseLabel('A1')).state?.id).toBe('fire');
    expect(tileAt(s.state, parseLabel('B1')).state?.id).toBe('cloud');
  });

  test('a lit float joining a slick sets it alight; floats move as one layer', () => {
    const s = draft(board('w>* w>o w>i\nS . d'), (ctx) => {
      drift(ctx);
    });
    expect(tileAt(s.state, parseLabel('A1')).state).toBeNull();
    expect(tileAt(s.state, parseLabel('B1')).state?.id).toBe('fire');
    expect(tileAt(s.state, parseLabel('C1')).state?.id).toBe('slick');
  });
});

describe('burnGates', () => {
  test('burns every gate beside fire, in reading order, once', () => {
    const r = draft(board('g * g\nS . d'), burnGates);
    expect(r.events.map((e) => e.type)).toEqual(['gateBurns', 'gateBurns']);
    expect(draft(r.state, burnGates).events).toEqual([]);
  });
});
