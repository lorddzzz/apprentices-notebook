import { expect, test } from 'vitest';
import { ENCOUNTERS, TUNING } from '$data';
import {
  type Aim,
  applyAction,
  type BattleState,
  beginEncounter,
  blockingAuras,
  clustersOf,
  compiledFor,
  compileGlyph,
  createBattle,
  describeLog,
  distil,
  finishEncounter,
  glyphLibrary,
  inkUsed,
  isGlyph,
  latticeOf,
  masksFrom,
  newProfile,
  type Profile,
  pickLoot,
  provenCount,
  recordProof,
  returnHome,
  rollOffers,
  setMemberLattice,
  setSocket,
  startTrip,
  validateLoadout,
} from '$engine';

/**
 * The whole research loop (plan D2): trip loot → solvent → distil Smear → place it → prove a
 * cluster by casting → Fair Copy → the Glyph casts exactly what the flat lattice cast.
 */

const BOARD = 'D . r r r\n. . . r .\n. . . . .';
const AIM: Aim = { kind: 'dir', dir: 'right' };

/** A trip seed whose first offers include Pitch (found, not hard-coded). */
function pitchSeed(): number {
  const table = ENCOUNTERS[0]?.loot ?? 'shallow';
  for (let seed = 1; seed < 500; seed++) {
    const offers = rollOffers(seed, 0, table);
    if (offers.some((o) => o.kind === 'solvent' && o.solvent === 'pitch')) return seed;
  }
  throw new Error('no seed offers pitch');
}

/** Wins the current fight by fiat (this test is about loot, not fighting). */
function won(p: Profile, seed: number): ReturnType<typeof finishEncounter> {
  const trip = startTrip(p, seed);
  const begun = beginEncounter(p, trip).state;
  const done: BattleState = {
    ...begun,
    phase: 'won',
    units: begun.units.map((u) => (u.kind === 'enemy' ? { ...u, hp: 0 } : u)),
  };
  return finishEncounter(p, trip, done);
}

function castBoard(p: Profile) {
  const spells = compiledFor(p, 'draughtsman').spells;
  const state = createBattle({
    title: 'loop',
    seed: 3,
    board: BOARD,
    party: { draughtsman: { spells } },
  }).state;
  const key = spells[0]?.key;
  if (key === undefined) throw new Error('no spell');
  return applyAction(state, { type: 'cast', unit: 'draughtsman', spell: key, aim: AIM });
}

test('research loop: solvent, Smear, proof, Fair Copy, identical cast', () => {
  // 1. A trip that banks Pitch.
  const seed = pitchSeed();
  let p = newProfile();
  const fin = won(p, seed);
  expect(fin.outcome).toBe('won');
  const trip0 = fin.trip;
  if (!trip0) throw new Error('trip ended');
  const idx = trip0.offers.findIndex((o) => o.kind === 'solvent' && o.solvent === 'pitch');
  expect(idx).toBeGreaterThanOrEqual(0);
  p = returnHome(fin.profile, pickLoot(trip0, idx));
  expect(p.solvents.pitch).toBe(1);

  // 2. Distil Smear (Ink + Oil + Pitch).
  const smearBefore = p.collection.smear;
  p = distil(p, { left: 'ink', right: 'oil', solvent: 'pitch' });
  expect(p.collection.smear).toBe(smearBefore + 1);
  expect(p.solvents.pitch).toBe(0);
  expect(p.bench.known).toContain('smear');

  // 3. Place it behind Ink: Bolt> Ink Smear.
  p = setMemberLattice(
    p,
    'draughtsman',
    setSocket(latticeOf(p, 'draughtsman'), { x: 2, y: 1 }, 'smear'),
  );
  expect(validateLoadout(p)).toEqual({});

  // 4. Cast it for real until the whole spell is proven.
  const flat = castBoard(p);
  const flatLines = describeLog(flat.events);
  expect(flatLines).toContain('rat at D1 is inked'); // Smear passes the mark on
  const lattice = latticeOf(p, 'draughtsman');
  const cluster = clustersOf(lattice).find((c) => c.kind === 'spell' && c.cells.length === 3);
  if (!cluster) throw new Error('no 3-cell spell cluster');
  expect(provenCount(lattice, cluster, p.proof.draughtsman)).toBe(0);
  for (let i = 0; i < TUNING.provenCasts; i++) {
    const r = castBoard(p);
    p = recordProof(p, 'draughtsman', masksFrom(r.events, 'draughtsman'));
  }
  expect(provenCount(lattice, cluster, p.proof.draughtsman)).toBe(TUNING.provenCasts);
  expect(blockingAuras(lattice, cluster)).toEqual([]);

  // 5. Fair Copy: the first compile costs vellum (no idiom here).
  expect(() => compileGlyph(p, 'draughtsman', cluster, 'Scribble')).toThrow(/vellum/i);
  p = { ...p, vellum: p.vellum + TUNING.compileVellum };
  const compiled = compileGlyph(p, 'draughtsman', cluster, 'Scribble');
  expect(compiled.glyphs).toHaveLength(1);
  const after = latticeOf(compiled, 'draughtsman');
  expect(after.runes.filter(isGlyph)).toHaveLength(1);
  expect(after.runes).toHaveLength(1);
  expect(validateLoadout(compiled)).toEqual({});
  expect(inkUsed(after, glyphLibrary(compiled))).toBeLessThanOrEqual(
    compiled.inkCapacity.draughtsman,
  );

  // 6. The Glyph casts exactly what the flat lattice did.
  const glyphCast = castBoard(compiled);
  expect(describeLog(glyphCast.events)).toEqual(flatLines);
  // The spell objects differ by design (Glyph path); the board and units must not.
  const world = (s: BattleState) =>
    JSON.stringify([
      s.tiles,
      s.units.map((u) => [u.id, u.pos, u.hp, u.shield, u.inked, u.oilSoaked]),
      s.rngState,
    ]);
  expect(world(glyphCast.state)).toBe(world(flat.state));
});

/**
 * ENGINE GAP (reported, not fixed): `compileGlyph` collapses a cluster even when another spell
 * flows through one of its cells (a side entry). The second Bolt below points at the Ink cell;
 * after the Fair Copy that cell is empty and the second spell silently dies.
 */
test.fails('Fair Copy keeps a second spell that enters the cluster from the side', () => {
  let p = newProfile();
  p = { ...p, vellum: 2, collection: { ...p.collection, bolt: p.collection.bolt + 1 } };
  let lat = setSocket(latticeOf(p, 'draughtsman'), { x: 2, y: 1 }, 'spark');
  lat = setSocket(lat, { x: 1, y: 2 }, 'bolt', 'up');
  p = setMemberLattice(p, 'draughtsman', lat);
  expect(validateLoadout(p)).toEqual({});

  const board = 'D r r . .\nr . . . .\n. . . . .';
  const cast = (q: Profile, spell: string, dir: 'right' | 'down') => {
    const spells = compiledFor(q, 'draughtsman').spells;
    const state = createBattle({
      title: 'x',
      seed: 3,
      board,
      party: { draughtsman: { spells } },
    }).state;
    return applyAction(state, {
      type: 'cast',
      unit: 'draughtsman',
      spell,
      aim: { kind: 'dir', dir },
    });
  };
  const flatSide = describeLog(cast(p, '1,2', 'down').events);

  const first = cast(p, '0,1', 'right');
  for (let i = 0; i < TUNING.provenCasts; i++) {
    p = recordProof(p, 'draughtsman', masksFrom(first.events, 'draughtsman'));
  }
  const cluster = clustersOf(latticeOf(p, 'draughtsman')).find(
    (c) => c.kind === 'spell' && c.root.x === 0 && c.cells.length === 3,
  );
  if (!cluster) throw new Error('no cluster');
  const compiled = compileGlyph(p, 'draughtsman', cluster, 'Row');
  expect(describeLog(cast(compiled, '1,2', 'down').events)).toEqual(flatSide);
});
