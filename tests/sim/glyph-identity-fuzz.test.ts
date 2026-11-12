import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  blockingAuras,
  clustersOf,
  compileGlyph,
  compileLattice,
  createRng,
  disconnected,
  FOUNDERS,
  glyphLibrary,
  isSocket,
  type Lattice,
  latticeOf,
  newProfile,
  provenCount,
  recordProof,
  roleOf,
  setMemberLattice,
  sharingSpells,
  step,
  tidyCollapse,
  toGlyphDef,
} from '$engine';
import {
  BIG,
  flatCompile,
  isGlyphSocket,
  pickOf,
  provenGlyphs,
  randomArgs,
  randomLattice,
  sameCasts,
  shapeOf,
  stamped,
  worldDir,
} from '../scenarios/glyph-identity-kit';

/** The fuzz halves of tests/scenarios/glyph-identity.test.ts (S13, M28), kept out of check:fast. */

describe('fuzz: a tidied Fair Copy keeps the cast (S13 identity)', () => {
  test('over random proven clusters on both pages, every tidied compile casts the same', () => {
    let tidied = 0;
    let refused = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const rng = createRng(seed * 7919);
      for (const m of FOUNDERS) {
        const lattice = randomLattice(rng, shapeOf(m));
        let p = setMemberLattice(newProfile(), m, lattice);
        const masks = compileLattice(latticeOf(p, m)).spells.map((sp) => [...(sp.cells ?? [])]);
        for (let i = 0; i < TUNING.provenCasts; i++) p = recordProof(p, m, masks);
        const l = latticeOf(p, m);
        const allMasks = FOUNDERS.flatMap((id) => p.proof[id] ?? []);
        const candidates = clustersOf(l).filter(
          (c) =>
            c.cells.length >= TUNING.glyphMinCells &&
            c.cells.length <= TUNING.glyphMaxCells &&
            blockingAuras(l, c).length === 0 &&
            sharingSpells(l, c).length === 0 &&
            provenCount(l, c, allMasks) >= TUNING.provenCasts &&
            disconnected(l, c).length > 0,
        );
        for (let k = 0; k < 3 && candidates.length > 0; k++) {
          const cluster = pickOf(rng, candidates);
          const def = toGlyphDef(l, cluster, 'Fuzz', 'gz');
          const tidy = tidyCollapse(l, cluster, def);
          if (tidy.slid === 0) {
            refused += 1;
            continue;
          }
          tidied += 1;
          const next = compileGlyph({ ...p, vellum: 9 }, m, cluster, 'Fuzz');
          const compiled = latticeOf(next, m);
          expect(disconnected(l, cluster)).not.toHaveLength(0);
          expect(compiled.runes.length).toBe(
            l.runes.length - cluster.cells.length - cluster.auras.length + 1,
          );
          const why = sameCasts(l, compiled, glyphLibrary(next));
          if (why)
            throw new Error(
              `seed ${seed} ${m}: ${why}\n${JSON.stringify(l.runes)}\n${JSON.stringify(cluster)}`,
            );
        }
      }
    }
    expect(tidied).toBeGreaterThanOrEqual(30);
    console.log('fuzz tidied', tidied, 'refused', refused);
  }, 120_000);

  test('on a roomy page too (tidyCollapse alone)', () => {
    let tidied = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed * 104729);
      const l = randomLattice(rng, BIG);
      const candidates = clustersOf(l).filter(
        (c) =>
          c.cells.length >= TUNING.glyphMinCells &&
          c.cells.length <= TUNING.glyphMaxCells &&
          blockingAuras(l, c).length === 0 &&
          sharingSpells(l, c).length === 0 &&
          disconnected(l, c).length > 0,
      );
      for (let k = 0; k < 3 && candidates.length > 0; k++) {
        const cluster = pickOf(rng, candidates);
        const def = toGlyphDef(l, cluster, 'Fuzz', 'gz');
        const tidy = tidyCollapse(l, cluster, def);
        if (tidy.slid === 0) continue;
        tidied += 1;
        const why = sameCasts(l, tidy.lattice, { gz: def });
        if (why)
          throw new Error(
            `seed ${seed}: ${why}\n${JSON.stringify(l.runes)}\n${JSON.stringify(cluster)}`,
          );
      }
    }
    console.log('roomy tidied', tidied);
    expect(tidied).toBeGreaterThanOrEqual(40);
  }, 120_000);
});

describe('identity (M28a): a Glyph with arguments casts what the stamped flat cluster casts', () => {
  test('Kind and Action arguments, with the tail, over proven clusters', () => {
    let n = 0;
    for (const g of provenGlyphs(150, 2)) {
      const rng = createRng(n * 31 + 7);
      const args = randomArgs(rng, g.def);
      if (Object.keys(args).length === 0) continue;
      n += 1;
      const lib = { [g.def.id]: { ...g.def, params: Object.keys(args) } };
      const compiled: Lattice = {
        shape: g.compiled.shape,
        runes: g.compiled.runes.map((r) => (r === g.socket ? { ...g.socket, args } : r)),
      };
      const why = sameCasts(stamped(g.l, g.cluster, g.socket.dir, args), compiled, lib);
      if (why) throw new Error(`${why}\n${JSON.stringify(args)}\n${JSON.stringify(g.l.runes)}`);
    }
    expect(n).toBeGreaterThanOrEqual(25);
  }, 120_000);

  test('on a lone Spell Glyph (no tail to re-lay)', () => {
    let n = 0;
    for (const g of provenGlyphs(150, 2)) {
      if (g.cluster.kind !== 'spell') continue;
      const rng = createRng(n * 17 + 3);
      const args = randomArgs(rng, g.def);
      if (Object.keys(args).length === 0) continue;
      n += 1;
      const lib = { [g.def.id]: { ...g.def, params: Object.keys(args) } };
      const inCluster = new Set(
        [...g.cluster.cells, ...g.cluster.auras].map((p) => `${p.x},${p.y}`),
      );
      const lone: Lattice = {
        shape: g.l.shape,
        runes: g.l.runes.filter((r) => inCluster.has(`${r.at.x},${r.at.y}`)),
      };
      const compiled: Lattice = { shape: g.l.shape, runes: [{ ...g.socket, args }] };
      const why = sameCasts(stamped(lone, g.cluster, g.socket.dir, args), compiled, lib);
      if (why) throw new Error(`${why}\n${JSON.stringify(args)}\n${JSON.stringify(lone.runes)}`);
    }
    expect(n).toBeGreaterThanOrEqual(15);
  }, 120_000);
});

describe('extra exit invariants (M28b) over proven clusters', () => {
  test('an extra side onto nothing changes no cast; reached cells never shrink; nothing throws', () => {
    let quiet = 0;
    let busy = 0;
    for (const g of provenGlyphs(150, 2)) {
      for (const side of ['up', 'right', 'down'] as const) {
        const withExtra = { [g.def.id]: { ...g.def, extraExit: side } };
        const without = { [g.def.id]: { ...g.def, extraExit: null } };
        const world = worldDir(side, g.socket.dir);
        const out = step(g.socket.at, world);
        const there = g.compiled.runes.find((r) => r.at.x === out.x && r.at.y === out.y);
        const onNothing =
          !isSocket(g.compiled.shape, out) ||
          !there ||
          (!isGlyphSocket(there) && ['aura', 'source'].includes(roleOf(there.rune) ?? ''));
        const a = flatCompile(g.compiled, withExtra);
        const b = flatCompile(g.compiled, without);
        const reachedWithout = new Set(b.reached);
        const reachedWith = new Set(a.reached);
        if (onNothing) {
          quiet += 1;
          const why = sameCasts(g.compiled, g.compiled, withExtra, without);
          if (why) throw new Error(`extra ${side} onto nothing changed a cast\n${why}`);
          expect([...reachedWith].sort()).toEqual([...reachedWithout].sort());
        } else {
          busy += 1;
        }
        for (const k of reachedWithout) expect(reachedWith.has(k)).toBe(true);
      }
    }
    expect(quiet).toBeGreaterThanOrEqual(30);
    expect(busy).toBeGreaterThanOrEqual(5);
  }, 120_000);
});
