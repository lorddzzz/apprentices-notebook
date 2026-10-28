import { describe, expect, test } from 'vitest';
import {
  AURA_DIAGONAL,
  capstoneKey,
  FOOTNOTES,
  SOLVENT_IDS,
  TUNING,
  VARIANTS,
  type VariantDef,
} from '$data';
import {
  type CompiledLattice,
  clustersOf,
  compiledFor,
  compileGlyph,
  compileLattice,
  type FiredCell,
  footnoteIds,
  glyphLibrary,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  recordProof,
  setMemberLattice,
  stepShape,
  writeFootnote,
} from '$engine';

/**
 * The `auraDiagonal` capstone on the run layer (plan FN P7, FN-11): `compiledFor` reads it from
 * the profile; clusters, Glyph definitions and proof masks stay orthogonal and profile-free.
 */

const COIL_CAP = capstoneKey('coil');
// Coil at B1 sits above Ink (orthogonal) and diagonal to Bolt and Spark.
const FLAT = '. Coil . .\nBolt> Ink Spark .';

function profileWith(lattice: string): Profile {
  const solvents = Object.fromEntries(SOLVENT_IDS.map((s) => [s, 2])) as Profile['solvents'];
  let p: Profile = {
    ...newProfile(),
    vellum: 3,
    solvents,
    known: [...newProfile().known, 'coil', 'steep', 'afterglow'],
    footnotes: { coil: { points: FOOTNOTES.levels.rune[2], slots: {} } },
  };
  p = setMemberLattice(p, 'draughtsman', parseLattice(lattice));
  return p;
}

function written(p: Profile, id: string, variants: readonly VariantDef[] = VARIANTS): Profile {
  const r = writeFootnote(p, 'coil', COIL_CAP, id, { variants });
  if ('error' in r) throw new Error(r.error);
  return r.profile;
}

/** Each spell's flow with its auras, coordinates left out, plus the source's auras. */
const behaviour = (c: CompiledLattice) =>
  c.spells.map((s) => [s.source, s.sourceAuras, stepShape(s.first)]);

const fullMask = (lattice: string): FiredCell[] => [
  ...(compileLattice(parseLattice(lattice)).spells[0]?.cells ?? []),
];

describe('compiling with the capstone', () => {
  test('the aura capstones are authored and stored under the capstone key', () => {
    for (const [aura, id] of Object.entries(AURA_DIAGONAL)) {
      expect(VARIANTS.find((v) => v.id === id)).toMatchObject({
        subject: aura,
        slot: { capstone: true },
      });
    }
    const p = written(profileWith(FLAT), AURA_DIAGONAL.coil);
    expect(footnoteIds(p)).toEqual({ [COIL_CAP]: 'coil-diagonal' });
  });

  test('compiledFor adds diagonal touches only once the capstone is written', () => {
    const p = profileWith(FLAT);
    const before = compiledFor(p, 'draughtsman');
    expect(before.spells[0]?.sourceAuras).toEqual([]);
    expect(before.auraTouches.map((t) => t.to)).toEqual([{ x: 1, y: 1 }]);
    const after = compiledFor(written(p, AURA_DIAGONAL.coil), 'draughtsman');
    expect(after.spells[0]?.sourceAuras).toEqual(['coil']);
    expect(after.auraTouches.map((t) => t.to)).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
  });

  test('a diagonal aura on its own adds its ink to the spell only with the capstone', () => {
    const p = profileWith('. . Coil\nBolt> Ink .');
    const ink = (q: Profile) => compiledFor(q, 'draughtsman').spells[0]?.ink ?? 0;
    expect(ink(written(p, AURA_DIAGONAL.coil))).toBe(ink(p) + TUNING.inkCost.aura);
  });

  test('each aura cell touching a step counts once, orthogonal ones first', () => {
    // Steep at B1 is above Ink and diagonal to Spark; Steep at D1 is diagonal to Spark only.
    const l = parseLattice('. Steep . Steep\nBolt> Ink Spark .');
    const c = compileLattice(l, {}, {}, null, { diagonalAuras: ['steep'] });
    const first = c.spells[0]?.first;
    expect(first?.role === 'kind' ? first.auras : null).toEqual(['steep']);
    const next = first && 'next' in first ? first.next : null;
    expect(next?.role === 'kind' ? next.auras : null).toEqual(['steep', 'steep']);
  });
});

describe('Glyph and proof stay profile-free', () => {
  test('clusters ignore the capstone (no profile reaches them)', () => {
    const p = written(profileWith(FLAT), AURA_DIAGONAL.coil);
    const l = latticeOf(p, 'draughtsman');
    expect(clustersOf(l, glyphLibrary(p))).toEqual(
      clustersOf(latticeOf(profileWith(FLAT), 'draughtsman')),
    );
  });

  test('a Glyph compiled with or without the capstone is the same record', () => {
    const masks = Array.from({ length: TUNING.provenCasts }, () => fullMask(FLAT));
    const plain = recordProof(profileWith(FLAT), 'draughtsman', masks);
    const capped = written(plain, AURA_DIAGONAL.coil);
    const cluster = (q: Profile) => {
      const found = clustersOf(latticeOf(q, 'draughtsman')).find(
        (x) => x.kind === 'spell' && x.cells.length === 3,
      );
      if (!found) throw new Error('no cluster');
      return found;
    };
    const a = compileGlyph(plain, 'draughtsman', cluster(plain), 'Coiled');
    const b = compileGlyph(capped, 'draughtsman', cluster(capped), 'Coiled');
    expect(b.glyphs).toEqual(a.glyphs);
    expect(b.lattices).toEqual(a.lattices);
    expect(b.proof).toEqual(a.proof);
    // Inside the Glyph the Coil reaches diagonally as on the flat page (identity holds).
    expect(behaviour(compiledFor(b, 'draughtsman'))).toEqual(
      behaviour(compiledFor(capped, 'draughtsman')),
    );
    expect(behaviour(compiledFor(a, 'draughtsman'))).toEqual(
      behaviour(compiledFor(plain, 'draughtsman')),
    );
  });

  test('re-picking the capstone does not corrupt Glyph records', () => {
    const other: VariantDef = {
      id: 't-coil-other',
      subject: 'coil',
      slot: { capstone: true },
      text: 'The other capstone.',
    };
    const variants = [...VARIANTS, other];
    const masks = Array.from({ length: TUNING.provenCasts }, () => fullMask(FLAT));
    const base = recordProof(profileWith(FLAT), 'draughtsman', masks);
    const cluster = clustersOf(latticeOf(base, 'draughtsman')).find(
      (x) => x.kind === 'spell' && x.cells.length === 3,
    );
    if (!cluster) throw new Error('no cluster');
    const glyphed = compileGlyph(base, 'draughtsman', cluster, 'Coiled');
    const diag = written(glyphed, AURA_DIAGONAL.coil, variants);
    const repicked = written(diag, other.id, variants);
    const back = written(repicked, AURA_DIAGONAL.coil, variants);
    expect(repicked.solvents).toEqual(diag.solvents); // re-picking is free
    for (const q of [diag, repicked, back]) {
      expect(q.glyphs).toEqual(glyphed.glyphs);
      expect(q.lattices).toEqual(glyphed.lattices);
      expect(q.proof).toEqual(glyphed.proof);
    }
    expect(compiledFor(repicked, 'draughtsman')).toEqual(compiledFor(glyphed, 'draughtsman'));
    expect(compiledFor(back, 'draughtsman')).toEqual(compiledFor(diag, 'draughtsman'));
    expect(compiledFor(diag, 'draughtsman')).not.toEqual(compiledFor(glyphed, 'draughtsman'));
  });
});
