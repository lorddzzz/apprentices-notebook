import { describe, expect, test } from 'vitest';
import { driftPreview } from '$engine';
import type { BoardRule, RoundEndSlot, RuleId } from '$engine/districts/types';
import { boardRules, isRuleActive, listRules, rulePreview, slotRules } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import { board, draft } from '../scenarios/harness';

/** A fixture rule that records what had happened when it ran, and counts its own runs. */
function fixture(
  id: RuleId,
  slot: RoundEndSlot,
  order: number,
  seen: string[][],
  scope: BoardRule['scope'] = 'piece',
): BoardRule<number> {
  return {
    id,
    slot,
    order,
    scope,
    activatedBy: scope === 'piece' ? { kind: 'terrain', flag: 'water' } : { kind: 'district' },
    init: (_s, config) => (typeof config === 'number' ? config : 0),
    step(ctx, own) {
      seen.push([id, ...ctx.log.map((e) => e.type)]);
      return own + 1;
    },
  };
}

// A float on the current, fire next to a gate: the canals' two rules both emit.
const BOARD = 'w>o w> .\n* g .\nS . d';

describe('round-end rule slots (P8)', () => {
  test('each slot runs where its built-ins sit, in order then id', () => {
    const seen: string[][] = [];
    const rules = [
      ...boardRules(),
      fixture('seam:late', 'late', 0, seen),
      fixture('seam:chemB', 'afterChemistry', 1, seen),
      fixture('seam:chemA', 'afterChemistry', 1, seen),
      fixture('seam:chemFirst', 'afterChemistry', -1, seen),
      fixture('seam:carry', 'carry', 1, seen),
    ];
    const r = draft(board(BOARD), (ctx) => roundEnd(ctx, rules));
    expect(seen.map((s) => s[0])).toEqual([
      'seam:carry',
      'seam:chemFirst',
      'seam:chemA',
      'seam:chemB',
      'seam:late',
    ]);
    const [carry, chemFirst, chemA, , late] = seen;
    // carry: after the current (order 0), before the chemistry and the gates.
    expect(carry).toContain('drift');
    expect(carry).not.toContain('gateBurns');
    // afterChemistry: order -1 runs before the gates (order 0), order 1 after.
    expect(chemFirst).not.toContain('gateBurns');
    expect(chemA).toContain('gateBurns');
    // late: after the whole round end.
    expect(late).toEqual(['seam:late', ...r.events.map((e) => e.type)]);
  });

  test('a rule state threads through round ends', () => {
    const seen: string[][] = [];
    const rules = [...boardRules(), fixture('seam:count', 'late', 0, seen)];
    const once = draft(board(BOARD), (ctx) => roundEnd(ctx, rules)).state;
    const twice = draft(once, (ctx) => roundEnd(ctx, rules)).state;
    expect(once.rules?.['seam:count']).toBe(1);
    expect(twice.rules?.['seam:count']).toBe(2);
  });

  test('the built-in rules keep today order: the canals, then the ink quarter writs, forwards and clock (IQ-1, IQ-2, IQ-6)', () => {
    expect(slotRules('carry', boardRules()).map((r) => r.id)).toEqual(['canals:current']);
    expect(slotRules('afterChemistry', boardRules()).map((r) => r.id)).toEqual(['canals:gates']);
    expect(slotRules('late', boardRules()).map((r) => r.id)).toEqual([
      'inkQuarter:writs',
      'inkQuarter:forwards',
      'inkQuarter:clock',
      'inkQuarter:stakes',
    ]);
  });
});

describe('rule activation (P9)', () => {
  const seen: string[][] = [];
  const piece = fixture('seam:lane', 'late', 0, seen);
  const district = fixture('seam:gauge', 'late', 0, seen, 'district');

  test('a piece-scoped rule comes with its terrain; a district rule never does', () => {
    expect(isRuleActive(piece, board(BOARD))).toBe(true);
    expect(isRuleActive(piece, board('S . d'))).toBe(false);
    expect(isRuleActive(district, board(BOARD))).toBe(false);
  });

  test('a listed rule is active with its config, on any board', () => {
    const s = board('S . d');
    const rules = listRules(s, ['seam:gauge'], { 'seam:gauge': 5 }, [district]);
    expect(rules).toEqual({ 'seam:gauge': 5 });
    const listed = { ...s, rules };
    expect(isRuleActive(district, listed)).toBe(true);
    const r = draft(listed, (ctx) => roundEnd(ctx, [district]));
    expect(r.state.rules?.['seam:gauge']).toBe(6);
  });

  test('an unknown rule id throws', () => {
    expect(() => listRules(board('S . d'), ['seam:nope'])).toThrow(/seam:nope/);
  });

  test('a water-less, gate-less board runs no rule and keeps no state', () => {
    const s = draft(board('S . d'), (ctx) => roundEnd(ctx)).state;
    expect(s.rules ?? {}).toEqual({});
  });
});

describe('rulePreview', () => {
  test("the current's preview is the drift preview, as shapes, and pure", () => {
    const s = board('w>o w>o w>\nrw> w>\nS . . d');
    const before = JSON.stringify(s);
    const p = driftPreview(s);
    expect(rulePreview(s)).toEqual([
      {
        rule: 'canals:current',
        shapes: [
          ...p.floats.map((f) => ({ kind: 'float', from: f.from, to: f.to })),
          ...p.units.map((u) => ({ kind: 'ghost', unit: u.unit, from: u.from, to: u.to })),
        ],
      },
    ]);
    expect(JSON.stringify(s)).toBe(before);
  });

  test('nothing to show on a still board', () => {
    expect(rulePreview(board('S r o'))).toEqual([]);
  });
});
