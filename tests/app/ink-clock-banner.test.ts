import { describe, expect, test } from 'vitest';
import {
  applyAction,
  type BattleState,
  type EnemyUnit,
  type GameEvent,
  scenarioBattle,
} from '$engine';
import { clockState } from '$engine/districts/inkQuarter/clock';
import { intentPhrase } from '../../src/app/describe';
import { clockBanner } from '../../src/app/inkClock';

/** The heart's clock banner words and the stand-in's step phrases (IQ-18). */

const endTurn = { type: 'endTurn' } as const;
const BOARD = 'D . . . . .\n. . . . . .\n. . . . . p';

function start(): { s: BattleState; log: GameEvent[] } {
  return { s: scenarioBattle({ board: BOARD, title: 'x' } as never, { lab: true }), log: [] };
}
function step(h: { s: BattleState; log: GameEvent[] }): void {
  const r = applyAction(h.s, endTurn);
  h.s = r.state;
  h.log.push(...r.events);
}
const pm = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'postmaster');
  if (!u || u.kind !== 'enemy') throw new Error('no postmaster');
  return u;
};

describe('clockBanner', () => {
  test('nothing before a writ is served', () => {
    const h = start();
    expect(clockBanner(h.s, h.log)).toBeNull();
  });

  test('an open writ names the seal, the stamp and the rounds left', () => {
    const h = start();
    step(h);
    const b = clockBanner(h.s, h.log);
    expect(b?.kind).toBe('open');
    expect(b?.text).toBe(
      "The postmaster's writ: break his seal (F2) or stand on his stamp (B1) — 2 rounds",
    );
    step(h);
    step(h);
    const last = clockBanner(h.s, h.log);
    if (last?.kind === 'open') expect(last.left).toBeLessThanOrEqual(1);
  });

  test('a stagger reads as stunned; a spent one as answered', () => {
    const h = start();
    step(h);
    const s = structuredClone(h.s);
    const st = clockState(s);
    s.rules = {
      ...s.rules,
      'inkQuarter:clock': { writ: null, stagger: [pm(s).id], ready: { [pm(s).id]: s.round + 2 } },
    };
    expect(st.writ).not.toBeNull();
    expect(clockBanner(s, [])?.kind).toBe('stunned');
    s.rules = {
      ...s.rules,
      'inkQuarter:clock': { writ: null, stagger: [], ready: { [pm(s).id]: s.round + 2 } },
    };
    const lifted: GameEvent[] = [
      { type: 'inkQuarter:clockLifted', data: { by: 'seal' } } as GameEvent,
    ];
    expect(clockBanner(s, lifted)?.kind).toBe('answered');
    const gone: GameEvent[] = [
      { type: 'inkQuarter:clockCollected', data: { marks: 2 } } as GameEvent,
    ];
    expect(clockBanner(s, gone)?.text).toContain('2 marks paid');
    expect(clockBanner(s, [])).toBeNull();
    s.round += 5;
    expect(clockBanner(s, gone)).toBeNull();
  });
});

describe('the stand-in postmaster phrases', () => {
  test('serve, pen and the stunned step read in board labels', () => {
    const h = start();
    expect(intentPhrase(h.s, pm(h.s))).toMatch(
      /^will serve a clock writ: seal \w\d, stamp \w\d \(1st\)$/,
    );
    step(h);
    expect(intentPhrase(h.s, pm(h.s))).toMatch(/^will strike with his pen at A1 \(1st\)$/);
  });
});
