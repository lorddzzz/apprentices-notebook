import { describe, expect, test } from 'vitest';
import { PLAYABLE_DISTRICTS } from '$data';
import { DISTRICTS } from '$data/districts/index';
import { INK_INTRUSION_STUB } from '$data/districts/inkQuarter/types';
import { KIT } from '$engine/districts';
import {
  INK_EVENT_TYPES,
  INK_SHAPE,
  type InkTripState,
  initInkState,
  openTerm,
  parseInkState,
  parseTerm,
} from '$engine/districts/inkQuarter/types';
import { parseBoard } from '$engine/notation';
import { pieceToken } from '$engine/pieces';

/** IQ-W0: the quarter's contracts are registered and inert; the trip state reads strictly. */
describe('IQ-W0 trip state', () => {
  const state: InkTripState = {
    terms: [
      { id: 't0', def: 'inkQuarter:sampler', signedAt: 0, status: 'paid' },
      { id: 't1', def: 'inkQuarter:bind', signedAt: 1, status: 'broken' },
      { id: 't2', def: 'inkQuarter:wax', signedAt: 2, status: 'open' },
    ],
  };

  test('round-trips through JSON and the registered shape', () => {
    const saved: unknown = JSON.parse(JSON.stringify(state));
    expect(parseInkState(saved)).toEqual(state);
    expect(KIT.shapes[INK_SHAPE]?.parseState(saved)).toEqual(state);
    expect(KIT.modules.inkQuarter?.trip?.initState()).toEqual(initInkState());
    expect(openTerm(state)?.id).toBe('t2');
  });

  test('malformed state reads as no terms', () => {
    for (const raw of [undefined, null, 3, 'terms', [], { terms: 'x' }, { terms: {} }]) {
      expect(parseInkState(raw)).toEqual({ terms: [] });
    }
  });

  test('malformed terms are dropped', () => {
    const ok = { id: 'a', def: 'inkQuarter:bind', signedAt: 1, status: 'open' };
    expect(parseTerm(ok)).toEqual(ok);
    for (const bad of [
      null,
      [],
      { ...ok, id: '' },
      { ...ok, id: 4 },
      { ...ok, def: 'canals:bind' },
      { ...ok, def: 'inkQuarter:' },
      { ...ok, signedAt: -1 },
      { ...ok, signedAt: 1.5 },
      { ...ok, signedAt: '1' },
      { ...ok, status: 'void' },
      { id: 'a', def: 'inkQuarter:bind', signedAt: 1 },
    ]) {
      expect(parseTerm(bad)).toBeNull();
      expect(parseInkState({ terms: [bad] })).toEqual({ terms: [] });
    }
  });

  test('a repeated id and a second open term are dropped (one open term, P5)', () => {
    const raw = {
      terms: [
        { id: 'a', def: 'inkQuarter:bind', signedAt: 0, status: 'open' },
        { id: 'a', def: 'inkQuarter:wax', signedAt: 1, status: 'paid' },
        { id: 'b', def: 'inkQuarter:sand', signedAt: 1, status: 'open' },
        { id: 'c', def: 'inkQuarter:sand', signedAt: 2, status: 'broken' },
      ],
    };
    expect(parseInkState(raw).terms.map((t) => t.id)).toEqual(['a', 'c']);
  });
});

describe('IQ-W0 registrations', () => {
  test('the district stays drawn and unplayable', () => {
    expect(DISTRICTS.inkQuarter.gate).toEqual({ kind: 'drawing' });
    expect(DISTRICTS.inkQuarter.rooms).toEqual([]);
    expect(PLAYABLE_DISTRICTS).not.toContain('inkQuarter');
  });

  test('the writ pieces parse and write their tokens, with no triggers yet', () => {
    const s = parseBoard('{return} {order} {forward:b} {address:b} {wax:1} {stamp}');
    const pieces = s.tiles.slice(0, 6).map((t) => t.piece);
    expect(pieces.map((p) => p?.id)).toEqual([
      'inkQuarter:return',
      'inkQuarter:order',
      'inkQuarter:forward',
      'inkQuarter:address',
      'inkQuarter:wax',
      'inkQuarter:clockStamp',
    ]);
    expect(pieces.map((p) => (p ? pieceToken(p) : ''))).toEqual([
      '{return}',
      '{order}',
      '{forward:b}',
      '{address:b}',
      '{wax:1}',
      '{stamp}',
    ]);
    for (const p of pieces) {
      const def = p ? KIT.pieces[p.id] : undefined;
      expect(def?.solid).toBe('none');
      expect(Object.keys(def?.triggers ?? {})).toEqual([]);
    }
    expect(() => parseBoard('{forward:7}')).toThrow();
  });

  test('every event has a log line', () => {
    for (const type of INK_EVENT_TYPES) expect(KIT.events[type]?.describe({ type })).toBeTruthy();
  });

  test('the intrusion stub brings only the return stamp', () => {
    expect(INK_INTRUSION_STUB.pieces).toEqual(['inkQuarter:return']);
    expect(KIT.pieces[INK_INTRUSION_STUB.pieces[0] ?? 'inkQuarter:none']).toBeDefined();
    expect(DISTRICTS.inkQuarter.intrusion).toBeUndefined();
  });
});
