import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ArrivalCause, CoreArrivalCause, CoreEnteredTable } from '$engine/arrival';
import { type Ctx, emit } from '$engine/ctx';
import type { BattleState } from '$engine/types';

const who = { id: 'rat-1', name: 'rat', at: { x: 0, y: 0 }, member: false };

describe('FD-0 contracts', () => {
  it('core causes are exactly the declared arrival causes', () => {
    expectTypeOf<CoreArrivalCause>().toEqualTypeOf<ArrivalCause>();
    const table: CoreEnteredTable = {
      walk: 'landing',
      push: 'each',
      slide: 'each',
      pull: 'each',
      hop: 'landing',
      swap: 'landing',
      drift: 'landing',
      draw: 'landing',
      return: 'landing',
      carry: 'landing',
    };
    expect(Object.keys(table)).toHaveLength(10);
  });

  it('an injected event cap cuts a cast early', () => {
    // A bare ctx: runDraft results are recorded by the projection guard, which needs a real board.
    const ctx: Ctx = {
      s: {} as BattleState,
      log: [],
      cast: { events: 0, capped: false },
      meta: {},
      footnotes: {},
      eventCap: 2,
    };
    for (let i = 0; i < 5; i++) emit(ctx, { type: 'stunned', unit: who });
    const log = ctx.log;
    expect(log.map((e) => e.type)).toEqual(['stunned', 'stunned', 'fizzles']);
  });
});
