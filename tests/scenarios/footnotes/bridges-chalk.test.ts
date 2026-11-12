import { describe, expect, test } from 'vitest';
import { type InventionDef, SOLVENT_IDS } from '$data';
import { libraryOf, parseLabel } from '$engine';
import { withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith } from './castHelper';

/** BR-19b: Chalk's one margin line (`chalk:network`) and its two capstones. */

const at = parseLabel;
const inv = (id: string, solvent: InventionDef['solvent']): InventionDef => ({
  id: `inv:${id}`,
  name: id,
  method: 'conduct',
  parts: ['shove'],
  solvent,
});
const opts = {
  inventions: libraryOf([inv('impulse', null), ...SOLVENT_IDS.map((s) => inv(`impulse-${s}`, s))]),
};

/** Casts Chalk's conduct and returns the ids each conducted action reached, and the log lines. */
function chalk(ascii: string, fns: readonly string[]) {
  const s = withLattices(ascii, { draughtsman: 'Bolt> inv:impulse-chalk' }, opts);
  const r = castWith(s, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
  const conducted = r.events.flatMap((e) => (e.type === 'conducted' ? [e] : []));
  const reached = conducted.flatMap((e) => e.units.map((u) => u.id)).sort();
  return { reached, conducted, state: r.state, events: r.events };
}

// A brass pair at D1 and E1 (the far end), fog at F1. rat-1 at C1 starts the cast. rat-3 stands
// at C2 (reachable only from the near brass), the stoker at E3 and rat-2 at G1 only from the far one.
const NET = 'D . r = = _ r\n. . r . . . .\n. . . . S . .';

describe('chalk:network', () => {
  test('chalk:network combos: square or end, with kin (ring is not built yet)', () => {
    const plain = chalk(NET, []);
    // Chalk alone reaches two tiles out from every brass tile.
    expect(plain.reached).toEqual(['rat-1', 'rat-2', 'rat-3', 'stoker'].sort());
    // square + kin / end + kin: the line is the Chalk line either way.
    for (const l1 of ['chalk-network-square', 'chalk-network-end']) {
      const r = chalk(NET, [l1, 'chalk-network-kin']);
      expect(r.conducted[0]?.line).toBe('chalk:network');
      // kin: the stoker is only in Chalk's extra reach, so it is passed over.
      expect(r.reached, l1).not.toContain('stoker');
    }
    // end: the extra tile only past the far brass, so the unit at C2 (the near end) is left alone.
    const end = chalk(NET, ['chalk-network-end']);
    expect(end.reached).toEqual(['rat-1', 'rat-2', 'stoker']);
    // square: the extra step may be a diagonal one, so G2 (two across, one down from E1) is in.
    const wide = chalk('D . r = = . .\n. . . . . . r', []);
    expect(wide.reached).toEqual(['rat-1']);
    const square = chalk('D . r = = . .\n. . . . . . r', ['chalk-network-square']);
    expect(square.reached).toEqual(['rat-1', 'rat-2']);
  });

  test('chalk-cap-circle: a unit reached across fog brings the units beside it, one step weaker', () => {
    const ascii = 'D . r = = _ r\n. . . . . . r\n. . . . . . .';
    const plain = chalk(ascii, []);
    expect(plain.reached).toEqual(['rat-1', 'rat-2']);
    const circle = chalk(ascii, ['chalk-cap-circle']);
    expect(circle.reached).toEqual(['rat-1', 'rat-2', 'rat-3']);
    // The far unit across the fog is pushed in full (off the room's edge); the one beside it,
    // a step weaker, goes no tile at all.
    expect(circle.state.units.find((u) => u.id === 'rat-3')?.pos).toEqual(at('G2'));
  });

  test('chalk-cap-line: a conducted action ends at brass, Chalk draws it on from the next brass', () => {
    const ascii = 'D . r = = . . = r';
    const plain = chalk(ascii, []);
    expect(plain.reached).toEqual(['rat-1']);
    const line = chalk(ascii, ['chalk-cap-line']);
    expect(line.reached).toEqual(['rat-1', 'rat-2']);
    expect(line.conducted).toHaveLength(2);
    expect(line.conducted[1]?.line).toBe('chalk:network');
  });
});
