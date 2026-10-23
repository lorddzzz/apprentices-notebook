import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  type Cluster,
  canPlaceGlyph,
  clustersOf,
  compileGlyph,
  compileLattice,
  type FiredCell,
  glyphLibrary,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  proofOf,
  provenCount,
  recordProof,
  renameGlyph,
  setMemberLattice,
  stepShape,
  validateLoadout,
} from '$engine';

/**
 * Proof and the Fair Copy on the run layer. W0b: the steps don't act yet, so the masks here are
 * what a cast that ran every cell would leave (E1's traces will produce them for real).
 */

const c = (x: number, y: number) => ({ x, y });

/** The mask of a cast in which every cell of `lattice`'s first spell fired. */
function fullMask(lattice: string): FiredCell[] {
  const cells = compileLattice(parseLattice(lattice)).spells[0]?.cells;
  if (!cells) throw new Error('no spell');
  return [...cells];
}

/** A profile whose draughtsman holds `lattice` and whose proof holds `masks` as draughtsman casts. */
function profileWith(lattice: string, masks: FiredCell[][] = [], vellum = 1): Profile {
  let p: Profile = { ...newProfile(), vellum, known: [...newProfile().known, 'bend', 'coil'] };
  p = setMemberLattice(p, 'draughtsman', parseLattice(lattice));
  p = setMemberLattice(p, 'stoker', { shape: parseLattice('. .').shape, runes: [] });
  return recordProof(p, 'draughtsman', masks);
}

const times = (n: number, m: FiredCell[]): FiredCell[][] => Array.from({ length: n }, () => m);
const big = (p: Profile, cells: number): Cluster => {
  const found = clustersOf(latticeOf(p, 'draughtsman'), glyphLibrary(p)).find(
    (x) => x.cells.length === cells && x.kind === 'spell',
  );
  if (!found) throw new Error('no cluster');
  return found;
};

const CHAIN = 'Bolt> Ink Oil Spark .';
const mask = fullMask('Bolt> Ink Oil Spark');

describe('recordProof', () => {
  test('appends, newest last, and never mutates the profile', () => {
    const p = newProfile();
    const a = recordProof(p, 'draughtsman', [[{ at: c(0, 0), rune: 'bolt', dir: 'right' }]]);
    const b = recordProof(a, 'draughtsman', [[{ at: c(1, 0), rune: 'ink' }]]);
    expect(p.proof.draughtsman).toEqual([]);
    expect(proofOf(b, 'draughtsman').map((m) => m[0]?.rune)).toEqual(['bolt', 'ink']);
    expect(b.proof.stoker).toEqual([]);
  });

  test('keeps the newest proofMasksPerMember per member', () => {
    const many = Array.from({ length: TUNING.proofMasksPerMember + 5 }, (_, i) => [
      { at: c(i, 0), rune: 'ink' as const },
    ]);
    const p = recordProof(newProfile(), 'stoker', many);
    expect(p.proof.stoker).toHaveLength(TUNING.proofMasksPerMember);
    expect(proofOf(p, 'stoker')[0]?.[0]?.at.x).toBe(5);
    expect(proofOf(p, 'stoker').at(-1)?.[0]?.at.x).toBe(TUNING.proofMasksPerMember + 4);
  });
});

describe('the fifth cast proves a cluster', () => {
  test('four meaningful casts are not enough, the fifth proves it', () => {
    let p = profileWith(CHAIN);
    const cluster = big(p, 4);
    for (let i = 1; i < TUNING.provenCasts; i++) {
      p = recordProof(p, 'draughtsman', [mask]);
      expect(provenCount(latticeOf(p, 'draughtsman'), cluster, proofOf(p, 'draughtsman'))).toBe(i);
    }
    p = recordProof(p, 'draughtsman', [mask]);
    expect(provenCount(latticeOf(p, 'draughtsman'), cluster, proofOf(p, 'draughtsman'))).toBe(
      TUNING.provenCasts,
    );
  });
});

describe('compileGlyph', () => {
  test('refuses a cluster that is not proven yet', () => {
    const p = profileWith(CHAIN, times(TUNING.provenCasts - 1, mask));
    expect(() => compileGlyph(p, 'draughtsman', big(p, 4), 'Strike')).toThrow('Not proven');
  });

  test('proof from the other member counts', () => {
    let p = profileWith(CHAIN, times(TUNING.provenCasts - 1, mask));
    p = recordProof(p, 'stoker', [mask]);
    expect(compileGlyph(p, 'draughtsman', big(p, 4), 'Strike').glyphs).toHaveLength(1);
  });

  test('collapses into the entry socket, spends a vellum and compiles the same steps (P2)', () => {
    const p = profileWith(CHAIN, times(5, mask), 2);
    const out = compileGlyph(p, 'draughtsman', big(p, 4), '  Strike  ');
    expect(out.vellum).toBe(1);
    expect(out.glyphs).toHaveLength(1);
    expect(out.glyphs[0]).toMatchObject({ id: 'g1', name: 'Strike', kind: 'spell', idiom: null });
    expect(out.lattices.draughtsman).toEqual([{ at: c(0, 0), glyph: 'g1', dir: 'right' }]);
    expect(p.lattices.draughtsman).toHaveLength(4); // input untouched
    const steps = (q: Profile) =>
      compileLattice(latticeOf(q, 'draughtsman'), glyphLibrary(q)).spells.map((s) =>
        stepShape(s.first),
      );
    expect(steps(out)).toEqual(steps(p));
  });

  test('the second Glyph gets the next id', () => {
    let p = profileWith(`${CHAIN}\nBolt> Oil Spark . .`, [], 3);
    p = recordProof(p, 'draughtsman', times(5, mask));
    const oilMask = fullMask('. . .\nBolt> Oil Spark').map((x) => ({ ...x }));
    p = recordProof(p, 'draughtsman', times(5, oilMask));
    const first = clustersOf(latticeOf(p, 'draughtsman')).find(
      (x) => x.cells.length === 4 && x.root.y === 0,
    );
    if (!first) throw new Error('no cluster');
    p = compileGlyph(p, 'draughtsman', first, 'One');
    const second = clustersOf(latticeOf(p, 'draughtsman'), glyphLibrary(p)).find(
      (x) => x.kind === 'spell' && x.root.y === 1,
    );
    if (!second) throw new Error('no cluster');
    p = compileGlyph(p, 'draughtsman', second, 'Two');
    expect(p.glyphs.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  test('every compile costs a vellum, and is refused without one (P7: no free idioms)', () => {
    const p = profileWith(CHAIN, times(5, mask), 0);
    expect(() => compileGlyph(p, 'draughtsman', big(p, 4), 'Strike')).toThrow('vellum');
  });

  test('an aura that also powers runes outside the selection blocks it (P3)', () => {
    const lattice = 'Bolt> Ink Bendv . .\n. Coil Spark . .';
    const p = profileWith(lattice, times(5, fullMask('Bolt> Ink Bendv\n. Coil Spark')));
    const cluster = clustersOf(latticeOf(p, 'draughtsman')).find(
      (x) => x.kind === 'spell' && x.cells.length === 3,
    );
    if (!cluster) throw new Error('no cluster');
    expect(() => compileGlyph(p, 'draughtsman', cluster, 'Strike')).toThrow(
      'The Coil at B2 also powers runes outside the selection',
    );
  });

  test('an aura that touches only the selection travels into the Glyph', () => {
    const lattice = 'Coil . . . .\nBolt> Ink Oil Spark .';
    const p = profileWith(lattice, times(5, fullMask('Coil . . .\nBolt> Ink Oil Spark')));
    const cluster = clustersOf(latticeOf(p, 'draughtsman')).find(
      (x) => x.kind === 'spell' && x.cells.length === 4,
    );
    if (!cluster) throw new Error('no cluster');
    const out = compileGlyph(p, 'draughtsman', cluster, 'Coiled');
    expect(out.glyphs[0]?.cells.map((x) => x.rune)).toContain('coil');
    expect(out.lattices.draughtsman).toHaveLength(1);
  });

  test('a nameless Glyph and an out-of-bounds cluster are refused', () => {
    const p = profileWith(CHAIN, times(5, mask));
    expect(() => compileGlyph(p, 'draughtsman', big(p, 4), '   ')).toThrow('name');
    const tiny = { ...big(p, 4), cells: big(p, 4).cells.slice(0, 2) };
    expect(() => compileGlyph(p, 'draughtsman', tiny, 'Tiny')).toThrow();
  });
});

describe('renameGlyph', () => {
  const p = compileGlyph(
    profileWith(CHAIN, times(5, mask)),
    'draughtsman',
    big(profileWith(CHAIN), 4),
    'Strike',
  );

  test('is free, trims, and rejects empty names', () => {
    const r = renameGlyph(p, 'g1', '  Fire Bolt ');
    expect(r.glyphs[0]?.name).toBe('Fire Bolt');
    expect(r.vellum).toBe(p.vellum);
    expect(() => renameGlyph(p, 'g1', '  ')).toThrow();
    expect(() => renameGlyph(p, 'nope', 'x')).toThrow();
    expect(p.glyphs[0]?.name).toBe('Strike');
  });
});

describe('a Glyph needs its inner runes known, not spare copies (P34)', () => {
  const collapsed = compileGlyph(
    profileWith(CHAIN, times(5, mask)),
    'draughtsman',
    big(profileWith(CHAIN), 4),
    'Strike',
  );

  test('one Glyph can sit on both pages', () => {
    expect(canPlaceGlyph(collapsed, 'stoker', c(1, 1), 'g1')).toBeNull();
    expect(canPlaceGlyph(collapsed, 'draughtsman', c(0, 0), 'g1')).toBeNull();
    expect(canPlaceGlyph(collapsed, 'stoker', c(1, 1), 'zz')).toBe('Unknown Glyph');
  });

  test('a Glyph holding a rune the household forgot is refused and flagged', () => {
    const forgot = { ...collapsed, known: collapsed.known.filter((r) => r !== 'oil') };
    expect(canPlaceGlyph(forgot, 'stoker', c(1, 1), 'g1')).toBe('Not known');
    expect(validateLoadout(forgot).draughtsman?.some((i) => i.kind === 'owned')).toBe(true);
    expect(validateLoadout(collapsed).draughtsman).toBeUndefined();
  });
});
