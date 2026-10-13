import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  blockingAuras,
  type CanonCell,
  type Cluster,
  canonical,
  clustersOf,
  createRng,
  type FiredCell,
  type Lattice,
  matchIdioms,
  maximalProven,
  parseLattice,
  provenCount,
  sharedCells,
  sharingSpells,
  toGlyphDef,
} from '$engine';
import { turnDir } from '../../src/engine/cluster';

const c = (x: number, y: number) => ({ x, y });
const at = (cl: Cluster) => cl.cells.map((p) => `${p.x},${p.y}`).join(' ');

/** The cluster's lattice runes as fired cells. */
function cellsOf(l: Lattice, cl: Cluster): FiredCell[] {
  return cl.cells.map((p) => {
    const r = l.runes.find((x) => x.at.x === p.x && x.at.y === p.y);
    if (!r || 'glyph' in r) throw new Error('no rune');
    return r.dir ? { at: p, rune: r.rune, dir: r.dir } : { at: p, rune: r.rune };
  });
}

/** Rotates by `t` quarter turns and translates. */
function moved(cells: readonly CanonCell[], t: number, dx: number, dy: number): FiredCell[] {
  return cells.map((p) => {
    let q = { x: p.at.x, y: p.at.y };
    for (let i = 0; i < t; i++) q = { x: 0 - q.y, y: q.x };
    const out: FiredCell = { at: c(q.x + dx, q.y + dy), rune: p.rune as FiredCell['rune'] };
    if (p.dir) out.dir = turnDir(p.dir, t);
    return out;
  });
}

const mirrored = (cells: readonly CanonCell[]): FiredCell[] =>
  cells.map((p) => {
    const out: FiredCell = { at: c(0 - p.at.x, p.at.y), rune: p.rune as FiredCell['rune'] };
    if (p.dir) out.dir = p.dir === 'left' ? 'right' : p.dir === 'right' ? 'left' : p.dir;
    return out;
  });

const CHAIN = parseLattice('Bolt> Ink OnInked Spark');
const FORK = parseLattice('. Ink .\nBolt> Fork .\n. Oil .');

describe('clustersOf', () => {
  test('a chain gives every prefix-closed run from each root, 3..8 cells', () => {
    expect(clustersOf(CHAIN).map(at).sort()).toEqual([
      '0,0 1,0 2,0',
      '0,0 1,0 2,0 3,0',
      '1,0 2,0 3,0',
    ]);
  });

  test('kind: spell iff the root is a Source', () => {
    const kinds = clustersOf(CHAIN).map((x) => [x.root.x, x.kind]);
    expect(kinds).toEqual([
      [0, 'spell'],
      [0, 'spell'],
      [1, 'payload'],
    ]);
  });

  test('sizes stay within the Glyph bounds and every cluster is prefix-closed from its root', () => {
    const l = parseLattice('Bolt> Fork Ink OnInked Spark\n. Oil Fork . Brass');
    for (const cl of clustersOf(l)) {
      expect(cl.cells.length).toBeGreaterThanOrEqual(TUNING.glyphMinCells);
      expect(cl.cells.length).toBeLessThanOrEqual(TUNING.glyphMaxCells);
      expect(cl.cells[0]).toEqual(cl.root);
    }
  });

  test('a Fork gives every subset of branches; a branch cell never appears without the Fork', () => {
    const cl = clustersOf(FORK).filter((x) => x.kind === 'spell');
    expect(cl.map(at).sort()).toEqual(['0,1 1,1 1,0', '0,1 1,1 1,0 1,2', '0,1 1,1 1,2']);
  });

  test('cells beyond 8 are never grouped', () => {
    const l = parseLattice('Bolt> Ink Oil Steam Brass Spark Ink Oil Steam');
    const sizes = clustersOf(l).map((x) => x.cells.length);
    expect(Math.max(...sizes)).toBe(8);
  });

  test('every aura touching the cluster comes with it', () => {
    const l = parseLattice('Amp . . .\nBolt> Ink OnInked Spark\n. . Amp .');
    const [first, second, third] = clustersOf(l);
    expect(first?.auras).toEqual([c(0, 0)]); // Amp above the Bolt (nothing powers OnInked)
    expect(second?.auras).toEqual([c(0, 0)]);
    expect(third?.root).toEqual(c(1, 1));
    expect(third?.auras).toEqual([]);
  });

  test('a Glyph socket is never inside a cluster', () => {
    const l = parseLattice('Bolt> Ink G:p> Spark');
    const lib = {
      p: {
        id: 'p',
        name: 'p',
        kind: 'payload' as const,
        cells: [{ at: c(0, 0), rune: 'oil' as const }],
        entry: c(0, 0),
        exits: [],
        idiom: null,
      },
    };
    for (const cl of clustersOf(l, lib)) expect(at(cl)).not.toContain('2,0');
  });
});

describe('canonical', () => {
  const ell: FiredCell[] = [
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'bend', dir: 'down' },
    { at: c(1, 1), rune: 'ink' },
  ];

  test('invariant under rotation and translation', () => {
    const base = canonical(ell);
    for (let t = 0; t < 4; t++) {
      expect(canonical(moved(ell, t, 5, -3))).toBe(base);
    }
  });

  test('a mirror image is a different pattern', () => {
    expect(canonical(mirrored(ell))).not.toBe(canonical(ell));
  });

  test('different runes or arrows differ', () => {
    expect(
      canonical(ell.map((p) => (p.rune === 'ink' ? { ...p, rune: 'oil' as const } : p))),
    ).not.toBe(canonical(ell));
    expect(
      canonical(ell.map((p) => (p.dir === 'down' ? { ...p, dir: 'up' as const } : p))),
    ).not.toBe(canonical(ell));
  });

  test('cell order does not matter', () => {
    expect(canonical([...ell].reverse())).toBe(canonical(ell));
  });
});

describe('provenCount', () => {
  const [full] = clustersOf(CHAIN).filter((x) => x.cells.length === 4);
  if (!full) throw new Error('no 4-cell cluster');
  const cells = cellsOf(CHAIN, full);

  test('counts masks holding the cluster, rotated and moved, with spare cells around', () => {
    const masks = [
      moved(cells, 0, 0, 0),
      moved(cells, 1, 4, 2),
      moved(cells, 3, -7, 1),
      [...moved(cells, 2, 1, 1), { at: c(9, 9), rune: 'oil' as const }],
    ];
    expect(provenCount(CHAIN, full, masks)).toBe(4);
  });

  test('a missing cell, a wrong arrow, a wrong rune or a mirror image does not count', () => {
    const masks = [
      cells.slice(0, 3),
      cells.map((p) => (p.dir ? { ...p, dir: 'down' as const } : p)),
      cells.map((p) => (p.rune === 'ink' ? { ...p, rune: 'oil' as const } : p)),
    ];
    expect(provenCount(CHAIN, full, masks)).toBe(0);
  });

  test('a mirror image of a turning pattern does not count', () => {
    const ell = parseLattice('Bolt> Bendv\n.     Ink');
    const cl = clustersOf(ell)[0];
    if (!cl) throw new Error('no cluster');
    const mine = cellsOf(ell, cl);
    expect(provenCount(ell, cl, [moved(mine, 1, 2, 2)])).toBe(1);
    expect(provenCount(ell, cl, [mirrored(mine)])).toBe(0);
  });

  test('a pattern proven elsewhere counts when rebuilt in another lattice', () => {
    const other = parseLattice('. . . .\nBolt> Ink OnInked Spark');
    const theirs = clustersOf(other).filter((x) => x.cells.length === 4)[0];
    if (!theirs) throw new Error('no cluster');
    expect(provenCount(other, theirs, [moved(cells, 0, 3, 3)])).toBe(1);
  });

  test('heredity (property): a prefix-closed sub-cluster is at least as proven as the cluster', () => {
    const rng = createRng(2024);
    const l = parseLattice('. Ink OnInked .\nBolt> Fork Spark .\n. Oil Brass .');
    const all = clustersOf(l);
    const pool = all.flatMap((x) => cellsOf(l, x));
    for (let round = 0; round < 25; round++) {
      const masks: FiredCell[][] = [];
      for (let i = 0; i < 12; i++) {
        const src = all[rng.int(0, all.length - 1)];
        if (!src) continue;
        const kept = moved(cellsOf(l, src), rng.int(0, 3), rng.int(-4, 4), rng.int(-4, 4)).filter(
          () => rng.next() > 0.15,
        );
        const noise = pool[rng.int(0, pool.length - 1)];
        masks.push(noise ? [...kept, { ...noise, at: c(rng.int(-5, 9), rng.int(-5, 9)) }] : kept);
      }
      const counts = new Map(all.map((x) => [x, provenCount(l, x, masks)]));
      for (const big of all) {
        for (const small of all) {
          if (small.root.x !== big.root.x || small.root.y !== big.root.y) continue;
          if (!small.cells.every((p) => big.cells.some((q) => q.x === p.x && q.y === p.y)))
            continue;
          expect(counts.get(small) ?? 0).toBeGreaterThanOrEqual(counts.get(big) ?? 0);
        }
      }
    }
  });
});

describe('maximalProven', () => {
  const [full] = clustersOf(CHAIN).filter((x) => x.cells.length === 4);
  if (!full) throw new Error('no 4-cell cluster');
  const cells = cellsOf(CHAIN, full);
  const times = (n: number, m: FiredCell[]) => Array.from({ length: n }, () => m);

  test('needs provenCasts masks', () => {
    expect(maximalProven(CHAIN, c(0, 0), times(TUNING.provenCasts - 1, cells))).toBeNull();
    const got = maximalProven(CHAIN, c(0, 0), times(TUNING.provenCasts, cells));
    expect(got && at(got)).toEqual('0,0 1,0 2,0 3,0');
  });

  test('is the largest cluster containing the cell', () => {
    const masks = [...times(5, cells.slice(0, 3)), ...times(2, cells)];
    const got = maximalProven(CHAIN, c(1, 0), masks);
    expect(got && at(got)).toEqual('0,0 1,0 2,0');
    expect(maximalProven(CHAIN, c(3, 0), masks)).toBeNull(); // the Spark never proved
  });
});

describe('blockingAuras', () => {
  test('an aura that also powers a cell outside the cluster blocks', () => {
    const l = parseLattice('Bolt> Ink Bendv\n. Amp Spark');
    // Amp at B2 touches Ink (inside) and Spark (outside the 3-cell cluster).
    const cl = clustersOf(l).find((x) => x.cells.length === 3 && x.root.x === 0);
    if (!cl) throw new Error('no cluster');
    expect(cl.auras).toEqual([c(1, 1)]);
    expect(blockingAuras(l, cl)).toEqual([c(1, 1)]);
  });

  test('an aura that touches only the cluster does not', () => {
    const l = parseLattice('Amp . . .\nBolt> Ink OnInked Spark');
    const cl = clustersOf(l)[0];
    if (!cl) throw new Error('no cluster');
    expect(blockingAuras(l, cl)).toEqual([]);
  });
});

describe('sharedCells', () => {
  test('another spell flowing into a cluster cell shares it', () => {
    const l = parseLattice('Bolt> Ink OnInked Spark\n. Bolt^ . .');
    const cl = clustersOf(l).find((x) => x.cells.length === 3 && x.root.x === 0);
    if (!cl) throw new Error('no cluster');
    expect(sharedCells(l, cl)).toEqual([c(1, 0)]);
    expect(sharingSpells(l, cl)).toEqual([{ cell: c(1, 0), source: c(1, 1) }]);
  });

  test('a lone spell shares nothing', () => {
    const l = parseLattice('Bolt> Ink OnInked Spark');
    const cl = clustersOf(l)[0];
    if (!cl) throw new Error('no cluster');
    expect(sharedCells(l, cl)).toEqual([]);
  });
});

describe('toGlyphDef', () => {
  test('a Spell Glyph rotates its entry to local right, entry at the origin', () => {
    const l = parseLattice('Boltv\nInk\nOnInked\nSpark'.replace(/\n/g, '\n'));
    const cl = clustersOf(l).find((x) => x.cells.length === 4 && x.kind === 'spell');
    if (!cl) throw new Error('no cluster');
    const def = toGlyphDef(l, cl, 'Down', 'g1');
    expect(def).toMatchObject({ id: 'g1', name: 'Down', kind: 'spell', entry: c(0, 0) });
    expect(def.cells).toEqual([
      { at: c(0, 0), rune: 'bolt', dir: 'right' },
      { at: c(1, 0), rune: 'ink' },
      { at: c(2, 0), rune: 'onInked' },
      { at: c(3, 0), rune: 'spark' },
    ]);
  });

  test('exits are where the flow leaves the cluster, in local terms', () => {
    const cl = clustersOf(CHAIN).find((x) => x.cells.length === 3 && x.root.x === 0);
    if (!cl) throw new Error('no cluster');
    const def = toGlyphDef(CHAIN, cl, 'Cut', 'g2');
    expect(def.exits).toEqual([{ from: c(2, 0), dir: 'right' }]);
  });

  test('auras travel into the Glyph, in the local frame', () => {
    const l = parseLattice('Amp . . .\nBolt> Ink OnInked Spark');
    const cl = clustersOf(l)[0];
    if (!cl) throw new Error('no cluster');
    const def = toGlyphDef(l, cl, 'Amped', 'g1');
    expect(def.cells).toContainEqual({ at: c(0, -1), rune: 'amplify' });
  });

  test('a payload cluster enters along its travel direction', () => {
    const cl = clustersOf(CHAIN).find((x) => x.kind === 'payload');
    if (!cl) throw new Error('no cluster');
    const def = toGlyphDef(CHAIN, cl, 'Mark', 'g1');
    expect(def.kind).toBe('payload');
    expect(def.cells.map((x) => x.rune)).toEqual(['ink', 'onInked', 'spark']);
    expect(def.cells[1]?.at).toEqual(c(1, 0));
  });

  test('carries the first matching idiom, or null', () => {
    const l = parseLattice('Bolt> OnInked Spark');
    const cl = clustersOf(l)[0];
    if (!cl) throw new Error('no cluster');
    expect(toGlyphDef(l, cl, 'x', 'g1').idiom).toBe('cashingIn');
    const dull = parseLattice('Bolt> Ink Oil Spark');
    const plain = clustersOf(dull)[0];
    if (!plain) throw new Error('no cluster');
    expect(toGlyphDef(dull, plain, 'x', 'g1').idiom).toBeNull();
  });
});

describe('matchIdioms', () => {
  test('Cashing In: a Source, then a Mark trigger, then a Heat or Charge payload', () => {
    expect(matchIdioms(parseLattice('Bolt> OnInked Spark'))).toEqual(['cashingIn']);
  });

  test('an ordered subsequence: other runes may sit between the steps, the order may not change', () => {
    expect(matchIdioms(parseLattice('Bolt> Bendv\n. OnInked\n. Spark'))).toEqual(['cashingIn']);
    expect(matchIdioms(parseLattice('Bolt> Ink OnInked Spark'))).toEqual(['cashingIn']);
    expect(matchIdioms(parseLattice('Bolt> Spark OnInked'))).toEqual([]);
    expect(matchIdioms(parseLattice('Bolt> Ink Spark'))).toEqual([]);
  });

  test('Bonfire: a reach-vapor source, then Slick, then Heat', () => {
    expect(matchIdioms(parseLattice('Splash> Oil Spark'))).toEqual(['bonfire']);
    expect(matchIdioms(parseLattice('Bolt> Oil Spark'))).toEqual([]);
  });

  test('Undertaker: any Source, a Vapor-return trigger, then a material', () => {
    expect(matchIdioms(parseLattice('Bolt> OnKill Oil'))).toEqual(['undertaker']);
  });

  test('a branch of a Fork can match on its own', () => {
    expect(matchIdioms(parseLattice('. Ink .\nBolt> Fork .\n. Oil .'))).toEqual([]);
    expect(matchIdioms(parseLattice('. Spark .\n. OnInked .\nBolt> Fork .\n. Ink .'))).toEqual([
      'cashingIn',
    ]);
  });
});
