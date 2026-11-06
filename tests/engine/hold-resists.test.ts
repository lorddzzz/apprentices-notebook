import { describe, expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { libraryOf } from '$engine';
import { grantRightOfWay } from '$engine/districts/bridges/rightOfWay';
import { placeSeal } from '$engine/districts/inkQuarter/wax';
import { board, cast, draft, unitAtLabel, withLattices } from '../scenarios/harness';

/** Every hold site honours right of way: Rivet (solvents) and a wax seal, like Hold and the vat edge. */
const impulseRivet: InventionDef = {
  id: 'inv:impulse-rivet',
  name: 'impulse',
  method: 'conduct',
  parts: ['shove'],
  solvent: 'rivet',
};

describe('right of way refuses every hold', () => {
  test('Rivet does not hold a right-of-way unit while the keystone stands', () => {
    const page = { draughtsman: 'Bolt> inv:impulse-rivet' };
    const opts = { inventions: libraryOf([impulseRivet]) };
    const s = withLattices('D r r {keystone:2}\n. = = .', page, opts);
    const id = unitAtLabel(s, 'B1').id;
    const flagged = draft(s, (ctx) => grantRightOfWay(ctx.s, id)).state;
    const r = cast(flagged, 'draughtsman', 'right');
    expect(r.state.units.find((u) => u.id === id)?.held).toBe(0);
    const plain = cast(s, 'draughtsman', 'right');
    expect(plain.state.units.find((u) => u.id === id)?.held).toBeGreaterThan(0);
  });

  test('a wax seal does not hold a right-of-way unit', () => {
    const s = board('. r . {keystone:2}');
    const u = unitAtLabel(s, 'B1');
    const r = draft(s, (ctx) => {
      grantRightOfWay(ctx.s, u.id);
      placeSeal(ctx, { ...u.pos }, 'x', 2);
    });
    expect(r.state.units.find((x) => x.id === u.id)?.held).toBe(0);
    expect(r.events.some((e) => e.type === 'bridges:trickResists')).toBe(true);
  });
});
