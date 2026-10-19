import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  type Cluster,
  type Coord,
  clustersOf,
  compileGlyph,
  type FiredCell,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  recordProof,
  setMemberLattice,
} from '$engine';
import {
  fairCopyUnlocked,
  fairTap,
  glowCells,
  NO_SELECTION,
  openCellOf,
  previewFairCopy,
} from '../../src/app/faircopy';

const M = 'draughtsman';
const c = (x: number, y: number) => ({ x, y });

/** A profile whose Draughtsman page holds `ascii`, with `casts` copies of the whole spell as proof. */
function proven(ascii: string, casts = TUNING.provenCasts): Profile {
  let p = setMemberLattice(newProfile(), M, parseLattice(ascii));
  const lattice = latticeOf(p, M);
  const whole = clustersOf(lattice)
    .filter((cl) => cl.kind === 'spell')
    .sort((a, b) => b.cells.length - a.cells.length)[0];
  if (!whole) throw new Error('no spell cluster');
  const mask: FiredCell[] = whole.cells.map((at) => {
    const r = lattice.runes.find((x) => x.at.x === at.x && x.at.y === at.y);
    if (!r || 'glyph' in r) throw new Error('no rune');
    return r.dir ? { at, rune: r.rune, dir: r.dir } : { at, rune: r.rune };
  });
  for (let i = 0; i < casts; i++) p = recordProof(p, M, [mask]);
  return p;
}

const CHAIN = 'Bolt> Ink Tally Spark .';

function selected(p: Profile, at = c(1, 0)): Cluster {
  const r = fairTap(p, M, NO_SELECTION, at);
  if (!r.state.cluster) throw new Error(r.message ?? 'nothing selected');
  return r.state.cluster;
}

describe('glow and select', () => {
  test('nothing glows before the fifth cast, everything of the proven spell after', () => {
    expect(glowCells(proven(CHAIN, TUNING.provenCasts - 1), M).size).toBe(0);
    expect(fairCopyUnlocked(proven(CHAIN, TUNING.provenCasts - 1))).toBe(false);
    const p = proven(CHAIN);
    expect([...glowCells(p, M)].sort()).toEqual(['0,0', '1,0', '2,0', '3,0']);
    expect(fairCopyUnlocked(p)).toBe(true);
  });

  test('tapping a glowing cell selects the maximal proven cluster', () => {
    const cl = selected(proven(CHAIN));
    expect(cl.cells).toHaveLength(4);
    expect(cl.root).toEqual(c(0, 0));
  });

  test('proof from the other member counts (masks are combined)', () => {
    const p0 = proven(CHAIN);
    const moved: Profile = {
      ...p0,
      proof: { ...p0.proof, draughtsman: [], stoker: p0.proof.draughtsman },
    };
    expect(selected(moved).cells).toHaveLength(4);
  });

  test('tapping an unproven cell selects nothing and says why', () => {
    const p = proven('Bolt> Ink Tally Spark Oil', 0);
    const r = fairTap(p, M, NO_SELECTION, c(1, 0));
    expect(r.state.cluster).toBeNull();
    expect(r.message).toMatch(/proven/i);
  });
});

describe('trim', () => {
  test('tapping the tail drops it; the smaller cluster is still selected', () => {
    const p = proven(CHAIN);
    const r = fairTap(p, M, { cluster: selected(p) }, c(3, 0));
    expect(r.message).toBeNull();
    expect(r.state.cluster?.cells).toEqual([c(0, 0), c(1, 0), c(2, 0)]);
  });

  test('cannot trim below the minimum', () => {
    const p = proven(CHAIN);
    const three = fairTap(p, M, { cluster: selected(p) }, c(3, 0)).state;
    const r = fairTap(p, M, three, c(2, 0));
    expect(r.state).toBe(three);
    expect(r.message).toContain(String(TUNING.glyphMinCells));
  });

  test('the root and a middle cell cannot be trimmed', () => {
    const p = proven(CHAIN);
    const sel = { cluster: selected(p) };
    expect(fairTap(p, M, sel, c(0, 0)).state).toBe(sel);
    const mid = fairTap(p, M, sel, c(1, 0));
    expect(mid.state).toBe(sel);
    expect(mid.message).toMatch(/end/i);
  });
});

describe('previewFairCopy', () => {
  test('ink before and after, with the cells saved', () => {
    const p = proven(CHAIN);
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.chain.map((s) => s.rune)).toEqual(['bolt', 'ink', 'tally', 'spark']);
    expect(pv.chain[0]?.dir).toBe('right');
    expect(pv.inkAfter).toBe(pv.inkBefore - Math.floor(4 / 3));
  });

  test('outside runes the collapse strands are listed by name when they cannot slide', () => {
    // The exit cell (A2, below the socket) is a hole: nothing moves, the warning lists the pair.
    const p = proven('Bolt> Ink Bendv . .\nx . Tally . .\n. . Spark . .');
    const bend = fairTap(p, M, { cluster: selected(p) }, c(2, 2)).state;
    const trimmed = fairTap(p, M, bend, c(2, 1)).state.cluster;
    if (!trimmed) throw new Error('no trim');
    const pv = previewFairCopy(p, M, trimmed);
    expect(pv.slides).toBe(0);
    expect(pv.disconnected).toEqual([
      { at: c(2, 1), name: 'Tally' },
      { at: c(2, 2), name: 'Spark' },
    ]);
    expect(previewFairCopy(p, M, selected(p)).disconnected).toEqual([]);
  });
  test('an aura touching the cluster and a cell outside it blocks, naming it (P3)', () => {
    const p = proven('Bolt> Ink Bendv . .\n. Coil Spark . .');
    const whole = selected(p);
    expect(previewFairCopy(p, M, whole).blocking).toEqual([]); // Coil touches Ink and Spark: both inside
    const trimmed = fairTap(p, M, { cluster: whole }, c(2, 1)).state.cluster;
    if (!trimmed) throw new Error('no trim');
    expect(previewFairCopy(p, M, trimmed).blocking).toEqual([
      'The Coil at B2 also powers runes outside the selection',
    ]);
  });

  test('a second spell entering from the side blocks, naming its source', () => {
    const p = proven('Bolt> Ink Tally Spark .\n. Bolt^ . . .');
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.blocking).toEqual(['The Bolt at B2 also flows through this selection']);
  });

  test('a Fair copy costs a vellum; affordability follows the vellum', () => {
    const base = proven('Bolt> Oil Ink .');
    const none = previewFairCopy(base, M, selected(base));
    expect(none.costLine).toBe('Fair-copy (1 vellum)');
    expect(none.canAfford).toBe(false);
    const rich = { ...base, vellum: 1 };
    expect(previewFairCopy(rich, M, selected(rich)).canAfford).toBe(true);
  });

  test('the same pattern costs a vellum every time: idioms are log patterns now (P7)', () => {
    const p = proven('Bolt> Ink Tally Spark .');
    const owned: Profile = {
      ...p,
      glyphs: [
        {
          id: 'g1',
          name: 'x',
          kind: 'spell',
          cells: [],
          entry: c(0, 0),
          exits: [],
          idiom: null,
          version: 1,
          params: [],
          extraExit: null,
        },
      ],
    };
    expect(previewFairCopy(p, M, selected(p)).costLine).toBe('Fair-copy (1 vellum)');
    expect(previewFairCopy(owned, M, selected(owned)).costLine).toBe('Fair-copy (1 vellum)');
  });
});

/** The cluster after trimming `taps` from the whole selection, in order. */
function trimmedBy(p: Profile, taps: Coord[], start = c(1, 0)): Cluster {
  let state = { cluster: selected(p, start) };
  for (const t of taps) state = fairTap(p, M, state, t).state as typeof state;
  return state.cluster;
}

const at = (p: Profile, x: number, y: number) =>
  latticeOf(p, M).runes.find((r) => r.at.x === x && r.at.y === y);

describe('tidy: stranded runes slide up (S13)', () => {
  test('a lone tail slides onto the exit cell and the preview says so', () => {
    const p = { ...proven(CHAIN), vellum: 1 };
    const cl = trimmedBy(p, [c(3, 0)]);
    const pv = previewFairCopy(p, M, cl);
    expect(pv.slides).toBe(1);
    expect(pv.disconnected).toEqual([]);
    const after = latticeOf(compileGlyph(p, M, cl, 'Cash'), M);
    expect(after.runes.map((r) => ('glyph' in r ? 'G' : r.rune))).toEqual(['G', 'spark']);
    expect(after.runes[1]?.at).toEqual(c(1, 0));
  });

  test('a block keeps its relative positions and arrows', () => {
    const p = { ...proven('Bolt> Ink Tally Bendv .\n. . . Oil .\n. . . Spark .'), vellum: 1 };
    const cl = trimmedBy(p, [c(3, 2), c(3, 1), c(3, 0)]);
    expect(cl.cells).toHaveLength(3);
    const pv = previewFairCopy(p, M, cl);
    expect(pv.slides).toBe(3);
    const next = compileGlyph(p, M, cl, 'Cash');
    expect(at(next, 1, 0)).toEqual({ at: c(1, 0), rune: 'bend', dir: 'down' });
    expect(at(next, 1, 1)).toMatchObject({ rune: 'oil' });
    expect(at(next, 1, 2)).toMatchObject({ rune: 'spark' });
    expect(at(next, 3, 0)).toBeUndefined();
  });

  test('a turn out of the cluster still lands on the exit cell', () => {
    // Flow leaves downward from the Bend: the socket's neighbour below it, A2.
    const p = { ...proven('Bolt> Ink Bendv . .\n. . Tally . .'), vellum: 1 };
    const cl = trimmedBy(p, [c(2, 1)]);
    expect(cl.cells).toHaveLength(3);
    expect(previewFairCopy(p, M, cl).slides).toBe(1);
    const next = compileGlyph(p, M, cl, 'Turn');
    expect(at(next, 0, 1)).toMatchObject({ rune: 'tally' });
    expect(at(next, 2, 1)).toBeUndefined();
  });

  test('nothing slides when a target cell is a hole', () => {
    // The Draughtsman's page has holes at A3 and E3; the exit cell below the socket is A3.
    const p = { ...proven('. . . . .\nBolt> Ink Bendv . .\n. . Tally . .'), vellum: 1 };
    const cl = trimmedBy(p, [c(2, 2)], c(1, 1));
    expect(cl.cells).toHaveLength(3);
    const pv = previewFairCopy(p, M, cl);
    expect(pv.slides).toBe(0);
    expect(pv.disconnected.map((d) => d.name)).toEqual(['Tally']);
    const next = compileGlyph(p, M, cl, 'Held');
    expect(at(next, 2, 2)).toMatchObject({ rune: 'tally' });
  });

  test('nothing slides when a target cell is occupied', () => {
    const p = { ...proven('Bolt> Ink Bendv . .\nOil . Tally . .\n. . Spark . .'), vellum: 1 };
    const cl = trimmedBy(p, [c(2, 2), c(2, 1)]);
    const pv = previewFairCopy(p, M, cl);
    expect(pv.slides).toBe(0);
    expect(pv.disconnected).toHaveLength(2);
    const next = compileGlyph(p, M, cl, 'Held');
    expect(at(next, 0, 1)).toMatchObject({ rune: 'oil' });
    expect(at(next, 2, 1)).toMatchObject({ rune: 'tally' });
  });

  test('nothing slides when the exit cell is outside the lattice', () => {
    // Flow leaves to the left of a socket on the left edge: there is no cell to land on.
    const p = { ...proven('. Spark Bend< . .\nBolt> Ink Bend^ . .'), vellum: 1 };
    const cl = trimmedBy(p, [c(1, 0)]);
    expect(cl.cells).toHaveLength(4);
    const pv = previewFairCopy(p, M, cl);
    expect(pv.slides).toBe(0);
    expect(pv.disconnected).toEqual([{ at: c(1, 0), name: 'Spark' }]);
  });
});

describe('leave a cell open (M21, M22)', () => {
  test('only Kind and Action runes can be left open', () => {
    const p = proven(CHAIN);
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.chain.map((s) => s.openable)).toEqual([false, true, false, true]);
  });

  test('a step knows its cell in the Glyph frame (a Bend is a Shape cell, so it cannot be open)', () => {
    const p = proven('Bolt> Ink Bendv . .\n. . Tally . .\n. . Spark . .');
    const pv = previewFairCopy(p, M, selected(p));
    expect(pv.chain.map((s) => s.local)).toEqual(pv.chain.map((s) => s.at));
    expect(pv.chain.map((s) => s.openable)).toEqual([false, true, false, false, true]);
    expect(openCellOf(pv, c(1, 0))).toEqual(c(1, 0));
    expect(openCellOf(pv, c(2, 0))).toBeNull(); // the Bend
  });

  test('openCellOf is null for nothing, a Source, or a cell that is not in the selection', () => {
    const p = proven(CHAIN);
    const pv = previewFairCopy(p, M, selected(p));
    expect(openCellOf(pv, null)).toBeNull();
    expect(openCellOf(null, c(1, 0))).toBeNull();
    expect(openCellOf(pv, c(0, 0))).toBeNull();
    expect(openCellOf(pv, c(4, 0))).toBeNull();
  });

  test('the chosen cell goes to compileGlyph as params; none leaves the Glyph closed', () => {
    const p = { ...proven(CHAIN), vellum: 5 };
    const cluster = selected(p);
    const open = openCellOf(previewFairCopy(p, M, cluster), c(3, 0));
    expect(compileGlyph(p, M, cluster, 'Open', open).glyphs[0]?.params).toEqual(['3,0']);
    expect(compileGlyph(p, M, cluster, 'Closed', null).glyphs[0]?.params).toEqual([]);
  });
});
