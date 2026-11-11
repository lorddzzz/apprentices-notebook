import { describe, expect, it } from 'vitest';
import type { BoardRule, RuleId } from '$engine/districts/types';
import { settleRules } from '$engine/rules';
import { board, draft } from '../scenarios/harness';

/**
 * P18: `settleRules` runs every active rule's `settle`, slots carry, afterChemistry, late, inside a
 * slot by `order` then id, and each returned state replaces the rule's own.
 */

type Seen = { id: string; own: unknown }[];

function rule(
  id: RuleId,
  slot: BoardRule['slot'],
  order: number,
  seen: Seen,
  withSettle = true,
): BoardRule {
  return {
    id,
    slot,
    order,
    scope: 'district',
    activatedBy: { kind: 'district' },
    init: () => 0,
    step: (_ctx, own) => own,
    ...(withSettle
      ? {
          settle: (_ctx, own) => {
            seen.push({ id, own });
            return (own as number) + 1;
          },
        }
      : {}),
  };
}

describe('settleRules', () => {
  it("settleRules runs each active rule's settle in slot order", () => {
    const seen: Seen = [];
    const rules = [
      rule('seam:t-late-b', 'late', 5, seen),
      rule('seam:t-late-a', 'late', 5, seen),
      rule('seam:t-after-2', 'afterChemistry', 20, seen),
      rule('seam:t-after-1', 'afterChemistry', 10, seen),
      rule('seam:t-carry', 'carry', 99, seen),
      rule('seam:t-no-settle', 'carry', 1, seen, false),
      rule('seam:t-unlisted', 'carry', 2, seen), // not listed for this fight: inactive
    ];
    const s = board('D . r');
    s.rules = {
      'seam:t-late-b': 10,
      'seam:t-late-a': 20,
      'seam:t-after-2': 30,
      'seam:t-after-1': 40,
      'seam:t-carry': 50,
      'seam:t-no-settle': 60,
    };
    const r = draft(s, (ctx) => settleRules(ctx, rules));
    expect(seen.map((x) => x.id)).toEqual([
      'seam:t-carry',
      'seam:t-after-1',
      'seam:t-after-2',
      'seam:t-late-a',
      'seam:t-late-b',
    ]);
    expect(seen.map((x) => x.own)).toEqual([50, 40, 30, 20, 10]);
    // Each returned state replaced the rule's own; rules without `settle` are left as they were.
    expect(r.state.rules).toMatchObject({
      'seam:t-carry': 51,
      'seam:t-after-1': 41,
      'seam:t-after-2': 31,
      'seam:t-late-a': 21,
      'seam:t-late-b': 11,
      'seam:t-no-settle': 60,
    });
    expect(r.state.rules).not.toHaveProperty('seam:t-unlisted');
  });

  it('settleRules is a no-op with nothing queued', () => {
    // Off the foundry no rule has anything to settle: the default rule list changes nothing.
    const plain = board('D . r');
    const a = draft(plain, (ctx) => settleRules(ctx));
    expect(a.events).toEqual([]);
    expect(a.state).toEqual(plain);
    // With bells on the board the bell rule is active but its queue is empty: same.
    const bells = board('D . {bell:low} . {bell:mid} r');
    const b = draft(bells, (ctx) => settleRules(ctx));
    expect(b.events).toEqual([]);
    expect(b.state.rules).toEqual(bells.rules);
  });
});
