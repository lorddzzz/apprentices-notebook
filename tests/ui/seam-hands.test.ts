import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { type BattleState, newProfile, type Profile } from '$engine';
import { sceneItems } from '../../src/app/bench';
import { overlayFor } from '../../src/app/overlay';
import {
  cycleStrip,
  HAND_HIGHLIGHT,
  HAND_KINDS,
  handHighlights,
  handOf,
  marginaliaOf,
} from '../../src/ui/districts/seam/hands';
import { act, board, parseLabel } from '../scenarios/harness';

/** SM-2: the Marginalia's cycle strip, hand marks, Bench entry and foe line (pure view-model). */

const OPEN = `
. . . . . .
. . S . . .
. . . . . G
. . . . . .
`;
const IDLE = { kind: 'idle' } as const;
const endTurn = { type: 'endTurn' } as const;

/** One round on, with the apprentice kept alive so the cycle can run. */
function nextRound(s: BattleState): BattleState {
  const out = act(s, endTurn).state;
  for (const u of out.units) if (u.kind === 'member') u.hp = u.maxHp = 99;
  return out;
}

describe('the cycle strip', () => {
  test('lists the five hands in cycle order with the first one lit', () => {
    const strip = cycleStrip(board(OPEN));
    expect(strip?.items.map((h) => h.kind)).toEqual(['ink', 'oil', 'steam', 'brass', 'spark']);
    expect(strip?.items.map((h) => h.next)).toEqual([true, false, false, false, false]);
    expect(strip?.text).toBe('writes Ink on B2–D2');
  });

  test('lights the next hand after each round, and the spark hand strikes', () => {
    let s = board(OPEN);
    const lit: string[] = [];
    for (let i = 0; i < 6; i++) {
      lit.push(cycleStrip(s)?.next?.kind ?? 'none');
      s = nextRound(s);
    }
    expect(lit).toEqual(['ink', 'oil', 'steam', 'brass', 'spark', 'ink']);
    // The fifth round's line (the spark hand).
    let t = board(OPEN);
    for (let i = 0; i < 4; i++) t = nextRound(t);
    expect(cycleStrip(t)?.text).toBe('strikes Spark on B2–D2');
  });

  test('is absent without a living Marginalia', () => {
    expect(cycleStrip(board('. . .\n. S .\n. . .'))).toBeNull();
    const s = board(OPEN);
    const g = marginaliaOf(s);
    if (!g) throw new Error('no Marginalia');
    g.hp = 0;
    expect(cycleStrip(s)).toBeNull();
    expect(handHighlights(s)).toEqual([]);
  });
});

describe('the hand marks', () => {
  test('one mark per target tile, carrying the kind, clipped to the board', () => {
    const marks = handHighlights(board(OPEN));
    expect(marks.map((m) => m.at)).toEqual([parseLabel('B2'), parseLabel('C2'), parseLabel('D2')]);
    for (const m of marks) {
      expect(m.key).toBe(HAND_HIGHLIGHT);
      expect(m.data.kind).toBe('ink');
    }
    const corner = board('S . . .\n. . . .\n. . . G');
    expect(handHighlights(corner).map((m) => m.at)).toEqual([parseLabel('A1'), parseLabel('B1')]);
  });

  test('the overlay carries them, and handOf ignores any other intent', () => {
    const s = board(OPEN);
    const marks = overlayFor(s, IDLE).highlights.filter(
      (h) => h.kind === 'district' && h.key === HAND_HIGHLIGHT,
    );
    expect(marks).toHaveLength(3);
    expect(handOf(null)).toBeNull();
    expect(handOf({ kind: 'flare', order: 1 })).toBeNull();
    expect(HAND_KINDS).toHaveLength(5);
  });
});

describe('the Bench entry and the foe line', () => {
  const household = (foesMet: Profile['foesMet']): Profile => ({ ...newProfile(), foesMet });

  test('the Bench offers the Marginalia only once it is met', () => {
    expect(sceneItems(household([]))).not.toContain('G');
    expect(sceneItems(household(['marginalia']))).toContain('G');
  });

  test('has a foe line that names what it does', () => {
    expect(ENEMIES.marginalia.blurb).toMatch(/five hands/);
  });
});
