import { describe, expect, test } from 'vitest';
import { MEMBER_IDS, type MemberId, TUNING } from '$data';
import {
  type Action,
  applyAction,
  available,
  type BattleState,
  type Cluster,
  canPlace,
  canPlaceGlyph,
  clustersOf,
  compileGlyph,
  compileLattice,
  describeLog,
  type FiredCell,
  glyphLibrary,
  isLegal,
  latticeOf,
  legalAims,
  masksFrom,
  memberById,
  newProfile,
  newSave,
  type Profile,
  parseLattice,
  provenCount,
  recogniseIdioms,
  recordProof,
  renameGlyph,
  type SaveData,
  setMemberLattice,
  validateLoadout,
} from '$engine';
import { endBattle, recordBattleAction, setOut, startBattle } from '../../src/app/flow';
import { board, cast, withLattices } from '../scenarios/harness';

const c = (x: number, y: number) => ({ x, y });

/** The mask a real cast of `lattice` leaves on a one-rat board. */
function realMask(
  lattice: string,
  ground = 'D . d',
  member: MemberId = 'draughtsman',
): FiredCell[] {
  const s = withLattices(ground, { [member]: lattice });
  const [mask] = masksFrom(cast(s, member, 'right').events, member);
  if (!mask) throw new Error('the cast was not meaningful');
  return mask;
}

/** A profile whose draughtsman holds `lattice` and whose proof holds `masks` as draughtsman casts. */
function profileWith(lattice: string, masks: FiredCell[][] = [], vellum = 1): Profile {
  let p: Profile = { ...newProfile(), vellum };
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

describe('recordProof', () => {
  test('appends, newest last, and never mutates the profile', () => {
    const p = newProfile();
    const a = recordProof(p, 'draughtsman', [[{ at: c(0, 0), rune: 'bolt', dir: 'right' }]]);
    const b = recordProof(a, 'draughtsman', [[{ at: c(1, 0), rune: 'ink' }]]);
    expect(p.proof.draughtsman).toEqual([]);
    expect(b.proof.draughtsman.map((m) => m[0]?.rune)).toEqual(['bolt', 'ink']);
    expect(b.proof.stoker).toEqual([]);
  });

  test('keeps the newest proofMasksPerMember per member', () => {
    const many = Array.from({ length: TUNING.proofMasksPerMember + 5 }, (_, i) => [
      { at: c(i, 0), rune: 'ink' as const },
    ]);
    const p = recordProof(newProfile(), 'stoker', many);
    expect(p.proof.stoker).toHaveLength(TUNING.proofMasksPerMember);
    expect(p.proof.stoker[0]?.[0]?.at.x).toBe(5);
    expect(p.proof.stoker.at(-1)?.[0]?.at.x).toBe(TUNING.proofMasksPerMember + 4);
  });
});

describe('proof from a trip', () => {
  /** Plays the first fight greedily: every meaningful cast it finds, then end turn. */
  function fight(save: SaveData, maxCasts: number): { save: SaveData; state: BattleState } {
    let s = save;
    let state = startBattle(s).state;
    let n = 0;
    for (let round = 0; round < 8 && state.phase === 'player' && n < maxCasts; round++) {
      for (const m of MEMBER_IDS) {
        for (const sp of memberById(state, m).spells) {
          for (const aim of legalAims(state, m, sp.key)) {
            if (state.phase !== 'player' || n >= maxCasts) break;
            const action: Action = { type: 'cast', unit: m, spell: sp.key, aim };
            if (isLegal(state, action) !== null) continue;
            const r = applyAction(state, action);
            if (!r.events.some((e) => e.type === 'trace' && e.meaningful)) continue;
            s = recordBattleAction(s, action);
            state = r.state;
            n += 1;
          }
        }
      }
      if (state.phase !== 'player') break;
      const end: Action = { type: 'endTurn' };
      s = recordBattleAction(s, end);
      state = applyAction(state, end).state;
    }
    return { save: s, state };
  }

  const start = (): SaveData => setOut(newSave(7));

  test('a won fight writes proof for each member from the full log', () => {
    const { save, state } = fight(start(), 3);
    const expected = Object.fromEntries(
      MEMBER_IDS.map((m) => [m, masksFrom(startBattle(save).events, m)]),
    );
    expect(expected.draughtsman?.length ?? 0).toBeGreaterThan(0);
    const won = { ...state, phase: 'won' as const };
    const end = endBattle(save, won);
    expect(end.outcome).toBe('won');
    for (const m of MEMBER_IDS) expect(end.save.profile.proof[m]).toEqual(expected[m]);
  });

  test('a wipe still records proof', () => {
    const { save, state } = fight(start(), 2);
    const lost = {
      ...state,
      phase: 'lost' as const,
      units: state.units.map((u) => (u.kind === 'member' ? { ...u, hp: 0 } : u)),
    };
    const end = endBattle(save, lost);
    expect(end.outcome).toBe('wiped');
    expect(end.save.trip).toBeNull();
    expect(end.save.profile.proof.draughtsman.length).toBeGreaterThan(0);
  });

  test('the proof written is the same whichever way the fight is replayed', () => {
    const { save, state } = fight(start(), 2);
    const a = endBattle(save, { ...state, phase: 'won' }).save.profile.proof;
    const b = endBattle(save, { ...state, phase: 'won' }).save.profile.proof;
    expect(a).toEqual(b);
  });

  test('a fight with no casts records nothing', () => {
    const save = start();
    const end = endBattle(save, { ...startBattle(save).state, phase: 'won' });
    expect(end.save.profile.proof).toEqual({ draughtsman: [], stoker: [] });
  });

  test('the Lab has no trip: ending a battle without one throws and writes no proof', () => {
    const lab = withLattices('D . d', { draughtsman: CHAIN }, { lab: true });
    const r = cast(lab, 'draughtsman', 'right');
    expect(masksFrom(r.events, 'draughtsman')).toHaveLength(1); // traced, but nothing stores it
    const save = newSave(7);
    expect(() => endBattle(save, lab)).toThrow();
    expect(save.profile.proof).toEqual({ draughtsman: [], stoker: [] });
  });
});

describe('the fifth cast proves a cluster', () => {
  const mask = realMask('Bolt> Ink Oil Spark');

  test('four meaningful casts are not enough, the fifth proves it', () => {
    let p = profileWith(CHAIN);
    const cluster = big(p, 4);
    for (let i = 1; i < TUNING.provenCasts; i++) {
      p = recordProof(p, 'draughtsman', [mask]);
      expect(provenCount(latticeOf(p, 'draughtsman'), cluster, p.proof.draughtsman)).toBe(i);
    }
    p = recordProof(p, 'draughtsman', [mask]);
    expect(provenCount(latticeOf(p, 'draughtsman'), cluster, p.proof.draughtsman)).toBe(
      TUNING.provenCasts,
    );
  });
});

describe('compileGlyph', () => {
  const mask = realMask('Bolt> Ink Oil Spark');

  test('refuses a cluster that is not proven yet', () => {
    const p = profileWith(CHAIN, times(TUNING.provenCasts - 1, mask));
    expect(() => compileGlyph(p, 'draughtsman', big(p, 4), 'Strike')).toThrow('Not proven');
  });

  test('proof from the other member counts', () => {
    let p = profileWith(CHAIN, times(TUNING.provenCasts - 1, mask));
    p = recordProof(p, 'stoker', [mask]);
    expect(compileGlyph(p, 'draughtsman', big(p, 4), 'Strike').glyphs).toHaveLength(1);
  });

  test('collapses into the entry socket, spends a vellum and casts the same log (P2)', () => {
    const p = profileWith(CHAIN, times(5, mask), 2);
    const out = compileGlyph(p, 'draughtsman', big(p, 4), '  Strike  ');
    expect(out.vellum).toBe(1);
    expect(out.glyphs).toHaveLength(1);
    expect(out.glyphs[0]).toMatchObject({ id: 'g1', name: 'Strike', kind: 'spell', idiom: null });
    expect(out.lattices.draughtsman).toEqual([{ at: c(0, 0), glyph: 'g1', dir: 'right' }]);
    expect(p.lattices.draughtsman).toHaveLength(4); // input untouched

    const spellsOf = (q: Profile) =>
      compileLattice(latticeOf(q, 'draughtsman'), [], glyphLibrary(q)).spells;
    const run = (q: Profile) => {
      const s = board('D . d', { party: { draughtsman: { spells: spellsOf(q) } } });
      return describeLog(cast(s, 'draughtsman', 'right').events);
    };
    expect(run(out)).toEqual(run(p));
    expect(run(out).length).toBeGreaterThan(3);
  });

  test('the second Glyph gets the next id', () => {
    let p = profileWith(
      `${CHAIN}\n. . . . .\nBolt> Oil Spark . .`.replace(/\n\. \. \. \. \.\n/, '\n'),
      [],
      3,
    );
    p = recordProof(p, 'draughtsman', times(5, mask));
    const oilMask = realMask('Bolt> Oil Spark');
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

  test('costs a vellum, and refuses when there is none', () => {
    const p = profileWith(CHAIN, times(5, mask), 0);
    expect(() => compileGlyph(p, 'draughtsman', big(p, 4), 'Strike')).toThrow('vellum');
  });

  test('the first compile of an idiom is free; the next copy of it costs (P11)', () => {
    const cash = realMask('Bolt> OnInked Spark', 'D . d!');
    const p = profileWith('Bolt> OnInked Spark . .', times(5, cash), 0);
    const first = compileGlyph(p, 'draughtsman', big(p, 3), 'Cashing In');
    expect(first.vellum).toBe(0);
    expect(first.glyphs[0]?.idiom).toBe('cashingIn');
    expect(first.idioms).toContain('cashingIn');

    const again = setMemberLattice(first, 'stoker', parseLattice('. . .\nBolt> OnInked Spark'));
    const cluster = clustersOf(latticeOf(again, 'stoker')).find((x) => x.cells.length === 3);
    if (!cluster) throw new Error('no cluster');
    const proven = recordProof(again, 'stoker', times(5, cash));
    expect(() => compileGlyph(proven, 'stoker', cluster, 'Again')).toThrow('vellum');
    expect(compileGlyph({ ...proven, vellum: 1 }, 'stoker', cluster, 'Again').vellum).toBe(0);
  });

  test('an aura that also powers runes outside the selection blocks it (P3)', () => {
    const lattice = 'Bolt> Ink Bendv . .\n. Amp Spark . .';
    const p = profileWith(lattice, times(5, realMask('Bolt> Ink Bendv\n. Amp Spark')));
    const cluster = clustersOf(latticeOf(p, 'draughtsman')).find(
      (x) => x.kind === 'spell' && x.cells.length === 3,
    );
    if (!cluster) throw new Error('no cluster');
    expect(() => compileGlyph(p, 'draughtsman', cluster, 'Strike')).toThrow(
      'The Amplify at B2 also powers runes outside the selection',
    );
  });

  test('an aura that touches only the selection travels into the Glyph', () => {
    const lattice = 'Amp . . . .\nBolt> Ink Oil Spark .';
    const p = profileWith(lattice, times(5, realMask('Amp . . .\nBolt> Ink Oil Spark')));
    const cluster = clustersOf(latticeOf(p, 'draughtsman')).find(
      (x) => x.kind === 'spell' && x.cells.length === 4,
    );
    if (!cluster) throw new Error('no cluster');
    const out = compileGlyph(p, 'draughtsman', cluster, 'Amped');
    expect(out.glyphs[0]?.cells.map((x) => x.rune)).toContain('amplify');
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
    profileWith(CHAIN, times(5, realMask('Bolt> Ink Oil Spark'))),
    'draughtsman',
    (() => {
      const q = profileWith(CHAIN);
      return big(q, 4);
    })(),
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

describe('recogniseIdioms', () => {
  test('adds the idioms found in any member lattice, once', () => {
    const p = profileWith('Bolt> OnInked Spark . .');
    const a = recogniseIdioms(p);
    expect(a.fresh).toEqual(['cashingIn']);
    expect(a.profile.idioms).toEqual(['cashingIn']);
    const b = recogniseIdioms(a.profile);
    expect(b.fresh).toEqual([]);
    expect(b.profile).toBe(a.profile);
  });

  test('nothing to recognise leaves the profile alone', () => {
    const p = profileWith(CHAIN);
    expect(recogniseIdioms(p)).toEqual({ profile: p, fresh: [] });
  });
});

describe('Glyph contents count as placed runes (P1)', () => {
  /** A profile owning exactly one of each chain rune, with the chain collapsed into g1. */
  function collapsed(): Profile {
    let p = compileGlyph(
      profileWith(CHAIN, times(5, realMask('Bolt> Ink Oil Spark'))),
      'draughtsman',
      big(profileWith(CHAIN), 4),
      'Strike',
    );
    p = { ...p, collection: { ...p.collection, bolt: 1, ink: 1, oil: 1, spark: 1 } };
    return p;
  }

  test('available() sees through the socket', () => {
    const p = collapsed();
    for (const r of ['bolt', 'ink', 'oil', 'spark'] as const) expect(available(p, r)).toBe(0);
    const expanded = profileWith(CHAIN);
    expect(available({ ...expanded, collection: p.collection }, 'ink')).toBe(0);
  });

  test('canPlace refuses a rune whose copies are all inside a Glyph', () => {
    const p = collapsed();
    expect(canPlace(p, 'stoker', c(1, 1), 'ink')).toBe('None left');
    expect(
      canPlace({ ...p, collection: { ...p.collection, ink: 2 } }, 'stoker', c(1, 1), 'ink'),
    ).toBe(null);
  });

  test('a Glyph can be placed only if all its inner runes are free', () => {
    const p = collapsed();
    // g1 is already placed for the draughtsman; its runes are used up.
    expect(canPlaceGlyph(p, 'stoker', c(1, 1), 'g1')).toBe('None left');
    // Re-placing it over its own socket is fine (that socket's runes are freed).
    expect(canPlaceGlyph(p, 'draughtsman', c(0, 0), 'g1')).toBeNull();
    const spare = { ...p, collection: { ...p.collection, bolt: 2, ink: 2, oil: 2, spark: 2 } };
    expect(canPlaceGlyph(spare, 'stoker', c(1, 1), 'g1')).toBeNull();
    const short = { ...spare, collection: { ...spare.collection, spark: 1 } };
    expect(canPlaceGlyph(short, 'stoker', c(1, 1), 'g1')).toBe('None left');
    expect(canPlaceGlyph(p, 'stoker', c(1, 1), 'zz')).toBe('Unknown Glyph');
  });

  test('validateLoadout flags a Glyph used beyond what is owned', () => {
    const p = collapsed();
    expect(validateLoadout(p).draughtsman).toBeUndefined();
    const twice = setMemberLattice(p, 'stoker', {
      shape: parseLattice('. .').shape,
      runes: [{ at: c(1, 1), glyph: 'g1', dir: 'right' }],
    });
    const issues = validateLoadout(twice);
    expect(issues.draughtsman?.some((i) => i.kind === 'owned')).toBe(true);
    expect(issues.stoker?.some((i) => i.kind === 'owned')).toBe(true);
    const rich = {
      ...twice,
      collection: { ...twice.collection, bolt: 2, ink: 2, oil: 2, spark: 2 },
    };
    expect(validateLoadout(rich).stoker?.some((i) => i.kind === 'owned') ?? false).toBe(false);
  });
});
