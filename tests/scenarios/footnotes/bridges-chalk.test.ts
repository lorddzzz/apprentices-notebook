import { describe, expect, test } from 'vitest';
import { type InventionDef, SOLVENT_IDS } from '$data';
import { libraryOf, parseLabel } from '$engine';
import { runDraft } from '$engine/ctx';
import { fallenBrassTiles } from '$engine/districts/api';
import { roundEnd } from '$engine/turn';
import { fourCombos, withFootnotes } from '../footnoteHarness';
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
// The same pair, but E1 is a cracked span that falls at dusk: the brass there is lost.
// rat-2 at G1 is two from E1 and three from D1, so only the remembered tile reaches it.
const CUT = 'D . r = ={span} . r';
const dusk = (s: ReturnType<typeof withLattices>, fns: readonly string[]) =>
  runDraft(s, (ctx) => roundEnd(ctx), { footnotes: withFootnotes(fns) }).state;
/** A dusk (the fall), then Chalk's conduct on what is left. */
function afterFall(ascii: string, fns: readonly string[], page = 'Bolt> inv:impulse-chalk') {
  const fell = dusk(withLattices(ascii, { draughtsman: page }, opts), fns);
  const r = castWith(fell, { kind: 'dir', dir: 'right' }, withFootnotes(fns));
  const conducted = r.events.flatMap((e) => (e.type === 'conducted' ? [e] : []));
  const reached = conducted.flatMap((e) => e.units.map((u) => u.id)).sort();
  return { reached, conducted, state: r.state, fell, events: r.events };
}
const NET = 'D . r = = _ r\n. . r . . . .\n. . . . S . .';

describe('chalk:network', () => {
  test('chalk:network fourCombos: square or end, then kin or ring', () => {
    const plain = chalk(NET, []);
    // Chalk alone reaches two tiles out from every brass tile.
    expect(plain.reached).toEqual(['rat-1', 'rat-2', 'rat-3', 'stoker'].sort());
    const runs = fourCombos(
      'chalk:network',
      ['chalk-network-square', 'chalk-network-end'],
      ['chalk-network-kin', 'chalk-network-ring'],
      ({ l1, l2 }) => ({
        plain: chalk(NET, [l1, l2]),
        cut: afterFall(CUT, [l1, l2]),
      }),
    );
    for (const {
      combo: { l1, l2 },
      result,
    } of runs) {
      // The line is the Chalk line either way.
      expect(result.plain.conducted[0]?.line, `${l1} ${l2}`).toBe('chalk:network');
      expect(result.cut.conducted[0]?.line, `${l1} ${l2}`).toBe('chalk:network');
      // kin: the stoker is only in Chalk's extra reach, so it is passed over.
      expect(result.plain.reached.includes('stoker'), `${l1} ${l2}`).toBe(
        l2 === 'chalk-network-ring',
      );
      // ring: the brass tile a fall took still reaches, once, so the unit two beyond it is hit.
      expect(result.cut.reached.includes('rat-2'), `${l1} ${l2}`).toBe(l2 === 'chalk-network-ring');
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

describe('chalk-network-ring', () => {
  const RING = ['chalk-network-ring'];

  test('chalk-network-ring: a Chalk conduct on a network cut by a fall reaches from where the brass stood', () => {
    expect(afterFall(CUT, []).reached).toEqual(['rat-1']);
    const ring = afterFall(CUT, RING);
    expect(ring.reached).toEqual(['rat-1', 'rat-2']);
    expect(ring.conducted[0]?.line).toBe('chalk:network');
  });

  test('chalk-network-ring: the remembered tile is spent by the first Chalk conduct that touches it', () => {
    const ring = afterFall(CUT, RING);
    expect(fallenBrassTiles(ring.fell)).toEqual([at('E1')]);
    expect(fallenBrassTiles(ring.state)).toEqual([]);
    // A conduct that does not touch it (a second, far-off network) leaves it remembered.
    const far = afterFall(
      'D . r = ={span} . . .\n. . . . . . . .\n. . . . . . = =',
      RING,
      'Bolt> inv:impulse-chalk',
    );
    expect(fallenBrassTiles(far.fell)).toEqual([at('E1')]);
  });

  test('chalk-network-ring: a plain Conduct, or none written, does not read the fallen tile', () => {
    const none = afterFall(CUT, []);
    expect(fallenBrassTiles(none.fell)).toEqual([]);
    const plain = afterFall(CUT, RING, 'Bolt> inv:impulse');
    expect(plain.reached).toEqual(['rat-1']);
    expect(fallenBrassTiles(plain.state)).toEqual([at('E1')]);
  });

  test('chalk-network-ring: a tile the Mason mends is forgotten', () => {
    const ring = afterFall(CUT, RING);
    const mended = structuredClone(ring.fell);
    const tile = mended.tiles[at('E1').y * mended.width + at('E1').x];
    if (!tile) throw new Error('no tile');
    tile.terrain = { ...tile.terrain, drop: false };
    expect(fallenBrassTiles(mended)).toEqual([]);
    const r = castWith(mended, { kind: 'dir', dir: 'right' }, withFootnotes(RING));
    const reached = r.events.flatMap((e) =>
      e.type === 'conducted' ? e.units.map((u) => u.id) : [],
    );
    expect(reached).toEqual(['rat-1']);
  });
});
