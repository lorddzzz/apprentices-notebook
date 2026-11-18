import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { type Profile, pickLoot, startTrip, type Trip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import { parseInkState } from '$engine/districts/inkQuarter/types';
import { parseInkedState } from '$engine/drawing/trip';
import type { EventLog } from '$engine/events';
import { keptLoot } from '$engine/trip/finish';
import { shapeInput, shapeOf } from '$engine/trip/shape';
import { fullHousehold } from './fixtures';

/** R2: the lent hooks of a drawn trip read the lent state, the termed card, the sandbox rule. */

const INKED = 'inkedPage' as const;
const TERMED = 'inkQuarter:termed' as const;
const BIND = 'inkQuarter:term-bind';

const drawing = (shape: Drawing['shape'], length: Drawing['length'] = 4): Drawing => ({
  name: 'Lent',
  rule: null,
  foes: ['rat', 'sentry'],
  pieces: [],
  shape,
  length,
  heart: 'marginalia',
});

const tripOf = (p: Profile, d: Drawing, seed = 5): Trip =>
  startTrip({ ...p, drawings: [d, null, null] }, seed, INKED, { page: 0 });

const inputAt = (t: Trip, room: number, p?: Profile) => {
  const at = { ...t, encounter: room };
  return shapeInput(at, shapeOf(INKED, at), p);
};

const rounds = (n: number): EventLog => [{ type: 'round', round: n }] as unknown as EventLog;

describe('R2: the terms shape in a drawn trip', () => {
  const p = fullHousehold();
  const bind = { kind: TERMED, data: { def: BIND } } as const;

  it('signs a term, breaks it, takes its held page back, and the state still parses', () => {
    const t0 = tripOf(p, drawing('inkQuarter:terms'));
    const looting: Trip = { ...t0, encounter: 1, status: 'looting', offers: [bind], picksLeft: 1 };
    const signed = pickLoot(looting, 0);
    // The term is signed in the lent (inner) state; the drawn trip's own state still parses.
    const own = parseInkedState(signed.kit?.state);
    expect(parseInkState(own.inner).terms).toMatchObject([
      { def: BIND, signedAt: 1, status: 'open' },
    ]);
    expect(signed.loot).toMatchObject([{ kind: TERMED, held: true }]);

    // The next room is won too slowly: the term breaks and its held page is taken back.
    const next: Trip = { ...signed, encounter: 2, status: 'fight' };
    const after = INKED_TRIP.afterRoom?.(inputAt(next, 2), rounds(9), true);
    const broken: Trip = next.kit ? { ...next, kit: { ...next.kit, state: after ?? null } } : next;
    expect(parseInkState(parseInkedState(broken.kit?.state).inner).terms[0]?.status).toBe('broken');
    expect(INKED_TRIP.lootAfterRoom?.(inputAt(broken, 2))).toEqual([]);

    // Paid in time, the page is kept and no longer held.
    const paidState = INKED_TRIP.afterRoom?.(inputAt(next, 2), rounds(3), true);
    const paid: Trip = next.kit
      ? { ...next, kit: { ...next.kit, state: paidState ?? null } }
      : next;
    expect(INKED_TRIP.lootAfterRoom?.(inputAt(paid, 2))).toMatchObject([
      { kind: TERMED, data: { def: BIND } },
    ]);
    expect(INKED_TRIP.lootAfterRoom?.(inputAt(paid, 2))[0]).not.toHaveProperty('held');
  });

  it('offers the termed card in every room but the heart, once, and none while a term is open', () => {
    for (const length of [3, 4, 5, 6] as const) {
      const t = tripOf(p, drawing('inkQuarter:terms', length));
      for (let room = 0; room < length; room++) {
        const extra = INKED_TRIP.offersFor?.(inputAt(t, room))?.extra ?? [];
        const cards = extra.filter((i) => i.kind === TERMED);
        expect(cards.length, `room ${room + 1} of ${length}`).toBe(room === length - 1 ? 0 : 1);
      }
    }
    const t = tripOf(p, drawing('inkQuarter:terms'));
    const signed = pickLoot(
      { ...t, encounter: 1, status: 'looting', offers: [bind], picksLeft: 1 },
      0,
    );
    expect(INKED_TRIP.offersFor?.(inputAt(signed, 2))?.extra ?? []).toEqual([]);
  });

  it('offers no termed card on another shape', () => {
    const t = tripOf(p, drawing('plain'));
    expect(INKED_TRIP.offersFor?.(inputAt(t, 0))?.extra).toBeUndefined();
  });
});

describe('R2: the household pages come first', () => {
  const poor = (): Profile => {
    const h = fullHousehold();
    return { ...h, known: h.known.filter((r) => !['jar', 'fuse', 'afterglow'].includes(r)) };
  };

  it('a page the household holds never takes an offer slot', () => {
    const h = poor();
    const d: Drawing = { ...drawing('plain', 4), rule: 'canals:current', foes: ['eel', 'moth'] };
    for (let seed = 1; seed <= 30; seed++) {
      const t = tripOf(h, d, seed);
      for (let room = 0; room < 4; room++) {
        for (const s of INKED_TRIP.offersFor?.(inputAt(t, room, h))?.guaranteed ?? []) {
          if (s.kind === 'rune') expect(h.known, `seed ${seed} room ${room}`).not.toContain(s.rune);
          if (s.kind === 'method') expect(h.methods).not.toContain(s.method);
        }
      }
    }
  });
});

describe('R2: one sandbox rule', () => {
  it('a drawn trip banks only the kinds that opt in', () => {
    const p = fullHousehold();
    const t = tripOf(p, { ...drawing('bathhouses:heat'), rule: 'bathhouses:boilOver' });
    // The plunge is a lent shape's extra card: picked on the drawn trip (it reads the lent state),
    // but its kind has no `sandbox` flag, so it is not banked.
    const plunge = { kind: 'bathhouses:plunge', data: {} } as const;
    const picked = pickLoot(
      { ...t, encounter: 0, status: 'looting', offers: [plunge], picksLeft: 1 },
      0,
    );
    expect(picked.loot).toContainEqual(plunge);
    expect(parseInkedState(picked.kit?.state).inner).toMatchObject({ pendingCool: 1 });
    const loot: Trip['loot'] = [
      ...picked.loot,
      { kind: 'rune', rune: 'bolt' },
      { kind: 'ink', amount: 1 },
      { kind: 'key', district: 'canals' },
      { kind: 'recruit', apprentice: 'draughtsman' } as Trip['loot'][number],
    ];
    expect(keptLoot({ ...picked, loot }).map((i) => i.kind)).toEqual(['rune', 'ink']);
    // A real district's trip keeps the lot.
    expect(keptLoot({ ...picked, district: 'canals', loot })).toEqual(loot);
  });
});
