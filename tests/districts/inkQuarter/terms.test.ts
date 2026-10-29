import { describe, expect, test } from 'vitest';
import type { TermDef } from '$data/districts/inkQuarter/types';
import type { GameEvent } from '$engine';
import { KIT } from '$engine/districts';
import { releaseHeld, TERMED, TERMED_KIND } from '$engine/districts/inkQuarter/offers';
import {
  checkTermDefs,
  conditionMet,
  settleTerms,
  signTerm,
  termBlocks,
  termEvents,
} from '$engine/districts/inkQuarter/terms';
import { type InkTripState, initInkState, openTerm } from '$engine/districts/inkQuarter/types';
import type { Trip } from '$engine/types';

/** IQ-3: terms as pure functions (signing, settling, the return block, events, the data check). */

const def = (id: string, over: Partial<TermDef> = {}): TermDef => ({
  id: `inkQuarter:${id}`,
  reward: { kind: 'page', spec: { kind: 'method', method: 'bind' } },
  stake: { kind: 'reward' },
  condition: { kind: 'winRoom' },
  rooms: [1],
  text: { reward: 'Bind', condition: 'win the next room', penalty: 'Bind is taken back' },
  ...over,
});

const member = { id: 'stoker', name: 'stoker', at: { x: 0, y: 0 }, member: true };
const foe = { ...member, id: 'rat-1', name: 'rat', member: false };
const rounds = (n: number): GameEvent[] =>
  Array.from({ length: n }, (_, i) => ({ type: 'round', round: i + 1 }));

describe('conditions (P6)', () => {
  test('winRoom holds on any win', () => {
    expect(conditionMet({ kind: 'winRoom' }, [])).toBe(true);
  });
  test('withinRounds counts the rounds the fight began', () => {
    const c = { kind: 'withinRounds', rounds: 3 } as const;
    expect(conditionMet(c, rounds(3))).toBe(true);
    expect(conditionMet(c, rounds(4))).toBe(false);
  });
  test('noneDowned fails on a downed or fallen apprentice, not on a dead foe', () => {
    const c = { kind: 'noneDowned' } as const;
    expect(conditionMet(c, [{ type: 'died', unit: foe }])).toBe(true);
    expect(conditionMet(c, [{ type: 'died', unit: member }])).toBe(false);
    expect(conditionMet(c, [{ type: 'outOfRoom', unit: member, cause: 'fell' }])).toBe(false);
  });
});

describe('sign and settle (P5)', () => {
  const defs = [def('fast', { condition: { kind: 'withinRounds', rounds: 2 } })];
  const signed = signTerm(initInkState(), 'inkQuarter:fast', 0);

  test('signing opens one term; a second is refused while it is open', () => {
    expect(signed.terms).toEqual([
      { id: 't0', def: 'inkQuarter:fast', signedAt: 0, status: 'open' },
    ]);
    expect(() => signTerm(signed, 'inkQuarter:bind', 0)).toThrow('A term is already open');
  });

  test('the signing room never settles it; the next won room does', () => {
    expect(settleTerms(signed, 0, rounds(1), defs)).toBe(signed);
    expect(openTerm(settleTerms(signed, 1, rounds(2), defs))).toBeNull();
    expect(settleTerms(signed, 1, rounds(2), defs).terms[0]?.status).toBe('paid');
    expect(settleTerms(signed, 1, rounds(3), defs).terms[0]?.status).toBe('broken');
  });

  test('a term no longer listed settles as paid (an old save never strands the party)', () => {
    expect(settleTerms(signed, 1, rounds(9), []).terms[0]?.status).toBe('paid');
  });

  test('after settling, a new term may be signed', () => {
    const paid = settleTerms(signed, 1, rounds(1), defs);
    expect(signTerm(paid, 'inkQuarter:bind', 1).terms.map((t) => t.id)).toEqual(['t0', 't1']);
  });

  test('an open term blocks the way home with its condition', () => {
    expect(termBlocks(signed, defs)).toEqual([
      { why: 'A signed term holds you here: win the next room.' },
    ]);
    expect(termBlocks(settleTerms(signed, 1, rounds(1), defs), defs)).toEqual([]);
    expect(termBlocks(signed, [])).toEqual([{ why: 'A signed term holds you here.' }]);
  });
});

describe('term events (P5)', () => {
  const s0 = initInkState();
  const s1 = signTerm(s0, 'inkQuarter:bind', 1);
  const paid: InkTripState = {
    terms: [{ ...(s1.terms[0] as InkTripState['terms'][0]), status: 'paid' }],
  };
  const broken: InkTripState = {
    terms: [{ ...(s1.terms[0] as InkTripState['terms'][0]), status: 'broken' }],
  };
  const data = (room: number) => ({ term: 't0', def: 'inkQuarter:bind', room });

  test('signing, paying and breaking are events', () => {
    expect(termEvents(s0, s1, 1)).toEqual([{ type: 'inkQuarter:termSigned', data: data(1) }]);
    expect(termEvents(s1, paid, 2)).toEqual([{ type: 'inkQuarter:termPaid', data: data(2) }]);
    expect(termEvents(s1, broken, 2)).toEqual([{ type: 'inkQuarter:termBroken', data: data(2) }]);
    expect(termEvents(paid, paid, 3)).toEqual([]);
  });

  test('each has a log line in the module', () => {
    const line = (type: string) =>
      KIT.events[type as 'inkQuarter:x']?.describe({ type: type as 'inkQuarter:x', data: data(1) });
    // The shipped term list is empty, so the lines fall back to their plain wording.
    expect(line('inkQuarter:termSigned')).toBe('a term is signed');
    expect(line('inkQuarter:termPaid')).toBe('the term is paid');
    expect(line('inkQuarter:termBroken')).toBe('the term is broken');
  });
});

describe('the data check (P5, P7)', () => {
  test('a clean list passes', () => {
    expect(checkTermDefs([def('bind', { guaranteedWhileLacking: 'bind' })], 5)).toEqual([]);
  });

  test('rejects a term at the heart', () => {
    expect(checkTermDefs([def('late', { rooms: [3, 4] })], 5)).toEqual([
      'inkQuarter:late: a term at the heart',
    ]);
  });

  test('rejects rooms off the trip, no rooms, repeats, bad rewards and guarantees', () => {
    expect(
      checkTermDefs(
        [
          def('a', { rooms: [] }),
          def('b', { rooms: [7] }),
          def('b'),
          def('c', { reward: { kind: 'page', spec: { kind: 'vellum', amount: 1 } } }),
          def('d', { guaranteedWhileLacking: 'wax' }),
          def('e', { reward: { kind: 'extraPick' }, guaranteedWhileLacking: 'bind' }),
          def('f', { condition: { kind: 'withinRounds', rounds: 0 } }),
        ],
        5,
      ),
    ).toEqual([
      'inkQuarter:a: offered in no room',
      'inkQuarter:b: no room 7',
      'inkQuarter:b: listed twice',
      'inkQuarter:c: reward is not a page',
      'inkQuarter:d: guaranteed while lacking a page it does not reward',
      'inkQuarter:e: guaranteed while lacking a page it does not reward',
      'inkQuarter:f: within 0 rounds',
    ]);
  });
});

describe('the termed offer kind (P7)', () => {
  test('is registered by the module', () => {
    expect(KIT.offerKinds[TERMED]).toBe(TERMED_KIND);
  });

  test('parses offers and signed pages, rejects the rest', () => {
    const offer = { kind: TERMED, data: { def: 'inkQuarter:bind' } };
    const held = { kind: TERMED, data: { def: 'inkQuarter:bind', term: 't0' }, held: true };
    const kept = { kind: TERMED, data: { def: 'inkQuarter:bind', term: 't0' } };
    for (const ok of [offer, held, kept]) {
      expect(TERMED_KIND.parse(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
    }
    for (const bad of [
      { kind: 'rune', data: { def: 'inkQuarter:bind' } },
      { kind: TERMED, data: { def: 'canals:bind' } },
      { kind: TERMED, data: { def: 'inkQuarter:' } },
      { kind: TERMED, data: {} },
      { ...offer, held: true },
      { ...kept, data: { ...kept.data, term: '' } },
      { ...kept, held: false },
    ]) {
      expect(TERMED_KIND.parse(bad)).toBeNull();
    }
  });

  test('a held page is kept when its term is paid and taken back when broken', () => {
    const page = (term: string) => ({
      kind: TERMED,
      data: { def: 'inkQuarter:bind', term },
      held: true as const,
    });
    const trip = (state: InkTripState) =>
      ({
        loot: [{ kind: 'ink', amount: 2 }, page('t0'), page('t1'), page('t2')],
        kit: { state, choices: [], checkpoint: false, bonuses: [] },
      }) as unknown as Trip;
    const state: InkTripState = {
      terms: [
        { id: 't0', def: 'inkQuarter:bind', signedAt: 0, status: 'paid' },
        { id: 't1', def: 'inkQuarter:wax', signedAt: 1, status: 'broken' },
        { id: 't2', def: 'inkQuarter:sand', signedAt: 2, status: 'open' },
      ],
    };
    expect(releaseHeld(trip(state)).loot).toEqual([
      { kind: 'ink', amount: 2 },
      { kind: TERMED, data: { def: 'inkQuarter:bind', term: 't0' } },
      page('t2'),
    ]);
    const settled = trip({ terms: [] });
    expect(releaseHeld(settled)).toBe(settled);
  });
});
