import { describe, expect, test } from 'vitest';
import { type BattleState, legalMoves, parseLabel, unitAt } from '$engine';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts';
import { placeSeal, sealAt } from '$engine/districts/inkQuarter/wax';
import { moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { intentPhrase } from '../../../src/app/describe';
import { act, board, draft, expectLog, expectLogIncludes } from '../../scenarios/harness';

/**
 * The Sealer and the wax seal (ink-quarter plan P8; IQ-5b). Token `z` is the Sealer, `{wax:N}` the
 * seal (N rounds left). A seal holds whoever stands on it for as long as it lasts.
 */

const at = parseLabel;
const foe = (s: BattleState, def: string) => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (!u || u.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};
const stoker = (s: BattleState) => {
  const u = s.units.find((v) => v.id === 'stoker');
  if (!u) throw new Error('no Stoker');
  return u;
};
const waxLeft = (s: BattleState, lbl: string) =>
  (sealAt(s, at(lbl))?.data as { rounds: number } | undefined)?.rounds;

describe('the Sealer', () => {
  test('marks the tile of the nearest apprentice within three, and says so', () => {
    const s = board('S . z');
    expect(intentPhrase(s, foe(s, 'sealer'))).toBe('will seal A1 in wax: step off to dodge (1st)');
    expect(foe(s, 'sealer').intent).toMatchObject({
      kind: 'behaviour',
      id: 'inkQuarter:sealer',
      telegraph: { label: 'seal', tiles: [{ x: 0, y: 0 }] },
    });
  });

  test('an apprentice out of reach is not marked; it walks closer instead', () => {
    const s = board('S . . . z');
    expect(foe(s, 'sealer').intent).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(unitAt(r.state, at('D1'))?.def).toBe('sealer');
  });

  test('held unit: the seal lands on whoever still stands there and holds them', () => {
    const s = board('S . z');
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['a wax seal lands at A1', 'Stoker is held']);
    expect(waxLeft(r.state, 'A1')).toBe(1); // wore a round at this turn's end
    expect(stoker(r.state).held).toBe(1); // 2 from the landing, 1 after the new round began
    expect(legalMoves(r.state, 'stoker')).toEqual([]);
  });

  test('dodge: stepping off the marked tile leaves the wax empty, and nobody held', () => {
    const s = board('S . z');
    const moved = act(s, { type: 'move', unit: 'stoker', to: at('B1') }).state;
    const r = act(moved, { type: 'endTurn' });
    expectLogIncludes(r.events, ['a wax seal lands at A1']);
    expect(r.lines.some((l) => l.includes('is held'))).toBe(false);
    expect(sealAt(r.state, at('A1'))).not.toBeNull();
    expect(stoker(r.state).held).toBe(0);
  });

  test('stepping onto a standing seal holds the walker for as long as it lasts', () => {
    const s = board('D . {wax:2} .');
    const r = draft(s, (ctx) => {
      const d = unitAt(ctx.s, at('A1'));
      if (d?.kind !== 'member') throw new Error('no Draughtsman');
      moveMember(ctx, d, at('C1'));
    });
    expectLog(r.events, ['Draughtsman moves to C1', 'Draughtsman is held']);
    expect(unitAt(r.state, at('C1'))?.held).toBe(2);
  });

  test('shove out is refused: a held unit on a seal does not move', () => {
    const s = board('S . z');
    const sealed = act(s, { type: 'endTurn' }).state;
    const r = draft(sealed, (ctx) => {
      push(ctx, stoker(ctx.s), 'right', 1, null);
    });
    expectLogIncludes(r.events, ['Stoker is held']);
    expect(stoker(r.state).pos).toEqual(at('A1'));
  });

  test('the seal lasts 2 rounds and then falls off; the hold lapses with it', () => {
    const s = board('S . z');
    const r1 = act(s, { type: 'endTurn' });
    expect(waxLeft(r1.state, 'A1')).toBe(1);
    const r2 = act(r1.state, { type: 'endTurn' });
    expect(sealAt(r2.state, at('A1'))).toBeNull();
    expect(stoker(r2.state).held).toBe(0);
  });

  test('fire melts it: a seal on a burning tile is gone at turn end and its bearer is free', () => {
    const s = board('S{wax:2} . .');
    const lit = structuredClone(s);
    const t = lit.tiles[0];
    if (!t) throw new Error('board');
    t.state = { id: 'fire', rounds: 3, origin: null };
    const held = draft(lit, (ctx) => {
      stoker(ctx.s).held = 2;
    }).state;
    const r = act(held, { type: 'endTurn' });
    expectLogIncludes(r.events, ['the wax seal at A1 is gone: fire melts it']);
    expect(sealAt(r.state, at('A1'))).toBeNull();
    expect(stoker(r.state).held).toBe(0);
  });

  test('fire melts it as it lands: a seal marked onto a burning tile is spent', () => {
    const s = board('S . z');
    const lit = structuredClone(s);
    const t = lit.tiles[0];
    if (!t) throw new Error('board');
    t.state = { id: 'fire', rounds: 3, origin: null };
    const r = act(lit, { type: 'endTurn' });
    expectLogIncludes(r.events, ['the wax seal at A1 is gone: fire melts it']);
    expect(sealAt(r.state, at('A1'))).toBeNull();
  });

  test('Sealer death: its seals vanish and free their bearers; a stake seal stays', () => {
    const s = board('S . z . {wax:2}');
    const sealed = act(s, { type: 'endTurn' }).state;
    expect(sealAt(sealed, at('A1'))).not.toBeNull();
    const r = draft(sealed, (ctx) => {
      dealDamage(ctx, foe(ctx.s, 'sealer'), 9, 'Strike');
    });
    expectLogIncludes(r.events, ['the wax seal at A1 is gone: its Sealer fell']);
    expect(sealAt(r.state, at('A1'))).toBeNull();
    expect(stoker(r.state).held).toBe(0);
    expect(waxLeft(r.state, 'E1')).toBe(1); // placed by no Sealer: untouched
  });

  test('a target that cannot take a seal now (another piece there) fizzles', () => {
    const s = board('S . z');
    const blocked = structuredClone(s);
    const t = blocked.tiles[0];
    if (!t) throw new Error('board');
    t.piece = { id: 'inkQuarter:return', data: null };
    const r = act(blocked, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Seal hits nothing']);
  });

  test('it does not mark an apprentice already held under a seal', () => {
    const s = board('S{wax:2} . z');
    expect(foe(s, 'sealer').intent).toBeNull();
  });
});

describe('placing a seal (the stake and the clock reuse it)', () => {
  test('placeSeal sets a seal with no owner and holds its occupant', () => {
    const s = board('S . .');
    const r = draft(s, (ctx) => {
      expect(placeSeal(ctx, at('A1'))).toBe(true);
    });
    expectLog(r.events, ['a wax seal lands at A1', 'Stoker is held']);
    expect(sealAt(r.state, at('A1'))?.data).toEqual({ rounds: 2, by: '' });
  });

  test('placeSeal refuses a tile with another piece, the drop or the edge', () => {
    const s = board('S {return} _');
    draft(s, (ctx) => {
      expect(placeSeal(ctx, at('B1'))).toBe(false);
      expect(placeSeal(ctx, at('C1'))).toBe(false);
      expect(placeSeal(ctx, { x: 9, y: 9 })).toBe(false);
    });
  });

  test('the token round-trips with and without a Sealer', () => {
    const p = KIT.tokens.wax;
    expect(p?.data?.parse?.('2:sealer-1')).toEqual({ rounds: 2, by: 'sealer-1' });
    expect(p?.data?.write?.({ rounds: 2, by: 'sealer-1' })).toBe('2:sealer-1');
    expect(p?.data?.write?.({ rounds: 1, by: '' })).toBe('1');
  });
});
