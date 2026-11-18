import { describe, expect, it } from 'vitest';
import type { Ctx } from '$engine/ctx';
import '$engine/districts';
import { hurtByPulse } from '$engine/districts/foundry/ring';
import { board } from '../../scenarios/harness';
import { unit } from './helpers';

/** CL-6 review fixes (pack R6): the foundry's rules the N2 review found loose. */

describe('R6-4: a pulse reaches two tiles out in line only when the ring is Coil-widened', () => {
  const ctxOf = (ascii: string): Ctx => ({
    s: board(ascii),
    log: [],
    cast: null,
    meta: {},
    footnotes: {},
  });
  // The bell at (1,0); the rat stands two tiles out in line, where an earlier pulse left it.
  const ASCII = 'D {bell:low} . r .\n. . . . .\n. . . . .';

  it('a plain ring spares a unit that is no longer beside the bell', () => {
    const ctx = ctxOf(ASCII);
    const rat = unit(ctx.s, 'rat-1');
    const hp = rat.hp;
    hurtByPulse(ctx, rat, { x: 1, y: 0 }, null);
    expect(rat.hp).toBe(hp);
    expect(rat.pos).toEqual({ x: 3, y: 0 });
  });

  it('a widened ring still reaches it', () => {
    const ctx = ctxOf(ASCII);
    const rat = unit(ctx.s, 'rat-1');
    const hp = rat.hp;
    hurtByPulse(ctx, rat, { x: 1, y: 0 }, null, undefined, undefined, true);
    expect(rat.hp).toBeLessThan(hp);
  });
});
