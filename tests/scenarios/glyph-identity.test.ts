import { describe, expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, type MemberId, type RuneId, TUNING } from '$data';
import {
  type Aim,
  type BattleState,
  blockingAuras,
  type Cluster,
  type Coord,
  clustersOf,
  compileGlyph,
  compileLattice,
  createBattle,
  createRng,
  type Dir,
  describeLog,
  disconnected,
  fairCopy,
  type GlyphDef,
  type GlyphLibrary,
  glyphLibrary,
  type Lattice,
  latticeOf,
  newProfile,
  type Placed,
  type PlacedRune,
  parseLabel,
  parseLattice,
  provenCount,
  type Rng,
  recordProof,
  type Spell,
  type SpellNode,
  setMemberLattice,
  sharingSpells,
  step,
  tidyCollapse,
  toGlyphDef,
  turnLeft,
  turnRight,
} from '$engine';
import { cast } from './harness';

/**
 * Design §9.4, the identity property: compiling a cluster into a Glyph never changes what a cast
 * does. Every case builds the flat lattice and the compiled one (Glyph in the entry socket, the
 * outside tail re-laid from the socket's exit neighbour) and compares the full battle log of the
 * cast on three boards.
 */

const AFFINITY = MEMBERS.draughtsman.affinity;

// ── Independent frame maths (the test does not reuse the engine's rotation) ──

const ORDER: readonly Dir[] = ['right', 'down', 'left', 'up'];
const worldOf = (o: Coord, dir: Dir): Coord => {
  switch (dir) {
    case 'right':
      return { x: o.x, y: o.y };
    case 'down':
      return { x: -o.y, y: o.x };
    case 'left':
      return { x: -o.x, y: -o.y };
    case 'up':
      return { x: o.y, y: -o.x };
  }
};
const localOf = (o: Coord, dir: Dir): Coord => {
  switch (dir) {
    case 'right':
      return { x: o.x, y: o.y };
    case 'down':
      return { x: o.y, y: -o.x };
    case 'left':
      return { x: -o.x, y: -o.y };
    case 'up':
      return { x: -o.y, y: o.x };
  }
};
const localDir = (world: Dir, dir: Dir): Dir =>
  ORDER[(ORDER.indexOf(world) - ORDER.indexOf(dir) + 4) % 4] as Dir;

const norm = (c: Coord): Coord => ({ x: c.x + 0, y: c.y + 0 });

/** Hand-built GlyphDef: the flat runes at `cells`, re-expressed in the frame rooted at `root`. */
function glyphFromFlat(
  id: string,
  kind: GlyphDef['kind'],
  flat: Lattice,
  cells: readonly Coord[],
  root: Coord,
  dir: Dir,
): GlyphDef {
  const runes: PlacedRune[] = [];
  for (const c of cells) {
    const r = flat.runes.find((p) => p.at.x === c.x && p.at.y === c.y);
    if (!r || !('rune' in r)) throw new Error(`no rune at ${c.x},${c.y}`);
    const at = norm(localOf({ x: c.x - root.x, y: c.y - root.y }, dir));
    runes.push(r.dir ? { at, rune: r.rune, dir: localDir(r.dir, dir) } : { at, rune: r.rune });
  }
  return { id, name: id, kind, cells: runes, entry: { x: 0, y: 0 }, exits: [], idiom: null };
}

const libOf = (...defs: GlyphDef[]): GlyphLibrary => Object.fromEntries(defs.map((d) => [d.id, d]));

// ── Battles ──

function battleWith(board: string, spells: Spell[], weak = false): BattleState {
  const state = createBattle({
    title: 'test',
    seed: 1,
    board,
    party: { draughtsman: { spells } },
  }).state;
  if (!weak) return state;
  const s = structuredClone(state);
  for (const u of s.units) if (u.kind === 'enemy') u.hp = Math.min(u.hp, 1);
  return s;
}

const castLog = (state: BattleState, aim: Aim): string[] =>
  describeLog(cast(state, 'draughtsman', aim).events);

interface Board {
  ascii: string;
  tile: Coord;
}
const BOARDS: readonly Board[] = [
  { ascii: 'D . . d . .\n. . . . . .\n. . . S . .', tile: parseLabel('D1') },
  { ascii: 'D . ro o d .\n. r . . . .\n. . . . . .', tile: parseLabel('C1') },
  { ascii: 'D . d . d .\n. r d . . .\n. . o~ . . .', tile: parseLabel('C1') },
];

interface Case {
  name: string;
  flat: string;
  compiled: string;
  glyph: { id: string; kind: GlyphDef['kind']; cells: Coord[]; root: Coord };
  splash?: boolean;
  weak?: boolean;
  mustInclude: string;
}
const c = (x: number, y: number): Coord => ({ x, y });

const CASES: readonly Case[] = [
  {
    name: 'idiom Cashing In (Bolt> Ink OnInked) with a Spark tail',
    flat: '. . . . .\nBolt> Ink OnInked Spark .\n. . . . .',
    compiled: '. . . . .\nG:ci> Spark . . .\n. . . . .',
    glyph: { id: 'ci', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    mustInclude: 'inked',
  },
  {
    name: 'idiom Bonfire (Splash> Oil Spark)',
    flat: '. . . . .\nSplash> Oil Spark . .\n. . . . .',
    compiled: '. . . . .\nG:bf> . . . .\n. . . . .',
    glyph: { id: 'bf', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    splash: true,
    mustInclude: 'oil',
  },
  {
    name: 'idiom Undertaker (Bolt> OnKill Ink)',
    flat: '. . . . .\nBolt> OnKill Ink . .\n. . . . .',
    compiled: '. . . . .\nG:ut> . . . .\n. . . . .',
    glyph: { id: 'ut', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    weak: true,
    mustInclude: 'dies',
  },
  {
    name: 'a Fork exit leading to an outside tail',
    flat: '. Ink . . .\nBolt> Fork . . .\n. Spark . . .\n. Oil . . .',
    compiled: '. . . . .\nG:fk> . . . .\nSpark . . . .\nOil . . . .',
    glyph: { id: 'fk', kind: 'spell', cells: [c(0, 1), c(1, 1), c(1, 0)], root: c(0, 1) },
    mustInclude: 'inked',
  },
  {
    name: 'a trigger inside a payload Glyph, with a tail after it',
    flat: '. . . . .\nBolt> Ink OnInked Spark Oil\n. . . . .',
    compiled: '. . . . .\nBolt> G:pt> Oil . .\n. . . . .',
    glyph: { id: 'pt', kind: 'payload', cells: [c(1, 1), c(2, 1), c(3, 1)], root: c(1, 1) },
    mustInclude: 'inked',
  },
  {
    name: 'an inner Amplify',
    flat: 'Amp Amp . . .\nBolt> Ink Spark . .\n. . . . .',
    compiled: '. . . . .\nG:ia> Spark . . .\n. . . . .',
    glyph: { id: 'ia', kind: 'spell', cells: [c(0, 1), c(1, 1), c(0, 0), c(1, 0)], root: c(0, 1) },
    mustInclude: 'Bolt hits',
  },
  {
    name: 'an outer Amplify (flat: the Amplify touches every inner cell)',
    flat: 'Amp Amp . . .\nBolt> Ink Spark . .\n. . . . .',
    compiled: 'Amp . . . .\nG:oa> Spark . . .\n. . . . .',
    glyph: { id: 'oa', kind: 'spell', cells: [c(0, 1), c(1, 1)], root: c(0, 1) },
    mustInclude: 'Bolt hits',
  },
  {
    name: 'an outer Amplify on a payload Glyph',
    flat: '. Amp Amp . .\nBolt> Ink Oil Spark .\n. . . . .',
    compiled: '. Amp . . .\nBolt> G:pa> Spark . .\n. . . . .',
    glyph: { id: 'pa', kind: 'payload', cells: [c(1, 1), c(2, 1)], root: c(1, 1) },
    mustInclude: 'inked',
  },
];

describe('identity: a Glyph casts exactly what its flat cluster casts', () => {
  for (const k of CASES) {
    test(k.name, () => {
      const flat = parseLattice(k.flat);
      const def = glyphFromFlat(
        k.glyph.id,
        k.glyph.kind,
        flat,
        k.glyph.cells,
        k.glyph.root,
        'right',
      );
      const library = libOf(def);
      const flatSpells = compileLattice(flat, AFFINITY).spells;
      const compiledSpells = compileLattice(parseLattice(k.compiled), AFFINITY, library).spells;
      expect(flatSpells).toHaveLength(1);
      expect(compiledSpells).toHaveLength(1);

      const logs = BOARDS.map((b) => {
        const aim: Aim = k.splash ? { kind: 'tile', at: b.tile } : { kind: 'dir', dir: 'right' };
        const a = castLog(battleWith(b.ascii, flatSpells, k.weak), aim);
        const z = castLog(battleWith(b.ascii, compiledSpells, k.weak), aim);
        expect(z).toEqual(a);
        return a;
      });
      expect(logs.some((log) => log.some((line) => line.includes(k.mustInclude)))).toBe(true);
      expect(new Set(logs.map((log) => log.join('\n'))).size).toBeGreaterThan(1); // boards differ
    });
  }
});

// ── All four rotations ──

/** Local pattern (flow enters at 0,0 travelling right): Bolt, Fork, Ink up, Oil down, Amp over Bolt. */
const PATTERN: PlacedRune[] = [
  { at: c(0, 0), rune: 'bolt', dir: 'right' },
  { at: c(1, 0), rune: 'fork' },
  { at: c(1, -1), rune: 'ink' },
  { at: c(1, 1), rune: 'oil' },
  { at: c(0, -1), rune: 'amplify' },
];
const ROOT = c(4, 4);
const SHAPE = { width: 9, height: 9, holes: [] };
const at = (o: Coord, dir: Dir): Coord => {
  const w = worldOf(o, dir);
  return { x: ROOT.x + w.x, y: ROOT.y + w.y };
};
const TAIL_UP: PlacedRune = { at: c(1, -2), rune: 'spark' };
const TAIL_DOWN: PlacedRune = { at: c(1, 2), rune: 'spark' };

describe('rotation', () => {
  for (const dir of ORDER) {
    test(`a Spell Glyph placed ${dir} casts what the rotated flat cluster casts`, () => {
      const flat: Lattice = {
        shape: SHAPE,
        runes: [...PATTERN, TAIL_UP, TAIL_DOWN].map((p) => ({
          ...p,
          at: at(p.at, dir),
          ...(p.dir ? { dir } : {}),
        })),
      };
      const def: GlyphDef = {
        id: 'rot',
        name: 'Rot',
        kind: 'spell',
        cells: PATTERN,
        entry: c(0, 0),
        exits: [],
        idiom: null,
      };
      // Inner flow leaves up and down (local); the tails sit at the socket's neighbours.
      const compiled: Lattice = {
        shape: SHAPE,
        runes: [
          { at: ROOT, glyph: 'rot', dir },
          { at: at(c(0, -1), dir), rune: 'spark' },
          { at: at(c(0, 1), dir), rune: 'spark' },
        ],
      };
      const fs = compileLattice(flat, AFFINITY).spells;
      const cs = compileLattice(compiled, AFFINITY, libOf(def)).spells;
      expect(cs[0]?.path[0]?.dir).toBe(dir);
      expect(cs[0]?.glyph).toBe('rot');
      for (const b of BOARDS) {
        const aim: Aim = { kind: 'dir', dir: 'right' };
        expect(castLog(battleWith(b.ascii, cs), aim)).toEqual(
          castLog(battleWith(b.ascii, fs), aim),
        );
      }
      const names = (nodes: readonly SpellNode[]): string[] =>
        nodes.flatMap((n) => [n.rune, ...names(n.next)]);
      expect(names(cs[0]?.nodes ?? [])).toEqual(names(fs[0]?.nodes ?? []));
      // Amp over the Bolt reaches it in the local frame whatever the rotation.
      expect(cs[0]?.magnitude).toBe(fs[0]?.magnitude);
      expect(cs[0]?.magnitude).toBe(3);
    });
  }
});

// ── Fair Copy collapses to the same behaviour ──

describe('fairCopy', () => {
  test('a payload cluster entered downward: the collapsed lattice casts the same log', () => {
    const flat = parseLattice('Bolt> Bendv . .\n. Ink . .\n. OnInked . .\n. Spark . .\n. Oil . .');
    const cluster: Cluster = {
      root: c(1, 1),
      cells: [c(1, 1), c(1, 2), c(1, 3)],
      auras: [],
      kind: 'payload',
    };
    const def = glyphFromFlat('dn', 'payload', flat, cluster.cells, cluster.root, 'down');
    const folded = fairCopy(flat, cluster, def);
    expect(folded.runes.find((r) => r.at.x === 1 && r.at.y === 1)).toEqual({
      at: c(1, 1),
      glyph: 'dn',
      dir: 'down',
    });
    expect(folded.runes).toHaveLength(4); // Bolt, Bend, Glyph, Oil
    expect(disconnected(flat, cluster)).toEqual([c(1, 4)]); // Oil no longer touches the exit
    // Re-lay the tail at the socket's exit neighbour and the cast is unchanged.
    const relaid: Lattice = {
      shape: folded.shape,
      runes: folded.runes.map((r) => ('rune' in r && r.rune === 'oil' ? { ...r, at: c(1, 2) } : r)),
    };
    const fs = compileLattice(flat, AFFINITY).spells;
    const cs = compileLattice(relaid, AFFINITY, libOf(def)).spells;
    for (const b of BOARDS) {
      const aim: Aim = { kind: 'dir', dir: 'right' };
      expect(castLog(battleWith(b.ascii, cs), aim)).toEqual(castLog(battleWith(b.ascii, fs), aim));
    }
  });

  test('a spell cluster takes the source arrow; its auras leave with it', () => {
    const flat = parseLattice('Amp . . . .\nBoltv . . . .\nInk . . . .\nSpark . . . .');
    const cluster: Cluster = {
      root: c(0, 1),
      cells: [c(0, 1), c(0, 2)],
      auras: [c(0, 0)],
      kind: 'spell',
    };
    const def = glyphFromFlat(
      'sp',
      'spell',
      flat,
      [...cluster.cells, ...cluster.auras],
      c(0, 1),
      'down',
    );
    const folded = fairCopy(flat, cluster, def);
    expect(folded.runes).toEqual([
      { at: c(0, 1), glyph: 'sp', dir: 'down' },
      { at: c(0, 3), rune: 'spark' },
    ]);
  });

  test('disconnected names the outside runes the collapse strands', () => {
    // After the collapse the Glyph's flow leaves at the socket's neighbour, not at the old tail.
    const flat = parseLattice('Bolt> Ink OnInked Spark .');
    const cluster: Cluster = {
      root: c(0, 0),
      cells: [c(0, 0), c(1, 0), c(2, 0)],
      auras: [],
      kind: 'spell',
    };
    expect(disconnected(flat, cluster)).toEqual([c(3, 0)]);
    // Nothing is stranded when the cluster already ends the flow.
    const whole = parseLattice('Bolt> Ink OnInked . .');
    expect(disconnected(whole, cluster)).toEqual([]);
  });
});

// ── Fuzz: a tidied Fair Copy (stranded runes slid up) casts what the flat lattice cast ──

const SOURCES: RuneId[] = ['bolt', 'splash', 'quill'];
const FLOW: RuneId[] = [
  'ink',
  'oil',
  'spark',
  'steam',
  'brass',
  'smear',
  'torch',
  'fog',
  'mist',
  'brand',
  'onInked',
  'onKill',
  'bend',
  'fork',
];
const AURAS: RuneId[] = ['amplify', 'echo'];

const pickOf = <T>(rng: Rng, xs: readonly T[]): T => xs[rng.int(0, xs.length - 1)] as T;

/** A random flow: a Source, then runes laid by walking outward, forking and bending. */
function randomLattice(rng: Rng, shape: Lattice['shape']): Lattice {
  const runes = new Map<string, Placed>();
  const free = (c: Coord): boolean =>
    c.x >= 0 &&
    c.y >= 0 &&
    c.x < shape.width &&
    c.y < shape.height &&
    !shape.holes.some((h) => h.x === c.x && h.y === c.y) &&
    !runes.has(`${c.x},${c.y}`);
  const put = (r: Placed): void => void runes.set(`${r.at.x},${r.at.y}`, r);
  const frontier: { from: Coord; dir: Dir }[] = [];
  for (let n = rng.int(1, 2), tries = 0; n > 0 && tries < 20; tries++) {
    const at = { x: rng.int(0, shape.width - 1), y: rng.int(0, shape.height - 1) };
    if (!free(at)) continue;
    const dir = pickOf(rng, ['up', 'right', 'down', 'left'] as const);
    put({ at, rune: pickOf(rng, SOURCES), dir });
    frontier.push({ from: at, dir });
    n -= 1;
  }
  for (let placed = 0; frontier.length > 0 && placed < 14; ) {
    const f = frontier.splice(rng.int(0, frontier.length - 1), 1)[0] as (typeof frontier)[number];
    const at = step(f.from, f.dir);
    if (!free(at)) continue;
    const roll = rng.next();
    placed += 1;
    if (roll < 0.15) {
      const out = pickOf(rng, ['up', 'right', 'down', 'left'] as const);
      put({ at, rune: 'bend', dir: out });
      frontier.push({ from: at, dir: out });
    } else if (roll < 0.27) {
      put({ at, rune: 'fork' });
      frontier.push({ from: at, dir: turnLeft(f.dir) }, { from: at, dir: turnRight(f.dir) });
    } else {
      const rune = pickOf(
        rng,
        FLOW.filter((r) => r !== 'bend' && r !== 'fork'),
      );
      put({ at, rune });
      frontier.push({ from: at, dir: f.dir });
    }
  }
  for (let n = rng.int(0, 2); n > 0; n--) {
    const at = { x: rng.int(0, shape.width - 1), y: rng.int(0, shape.height - 1) };
    if (free(at)) put({ at, rune: pickOf(rng, AURAS) });
  }
  const list = [...runes.values()].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  return { shape, runes: list };
}

const AIMS: readonly Aim[] = [
  { kind: 'dir', dir: 'right' },
  { kind: 'dir', dir: 'down' },
  { kind: 'dir', dir: 'left' },
  { kind: 'dir', dir: 'up' },
];

/** Every spell of the two lattices casts the same log on every board and aim. */
function sameCasts(flat: Lattice, tidy: Lattice, library: GlyphLibrary): string | null {
  const a = compileLattice(flat, AFFINITY).spells;
  const b = compileLattice(tidy, AFFINITY, library).spells;
  if (a.length !== b.length) return `spell count ${a.length} vs ${b.length}`;
  for (const [i, sa] of a.entries()) {
    const sb = b[i] as Spell;
    for (const board of BOARDS) {
      for (const aim of [...AIMS, { kind: 'tile', at: board.tile } as Aim]) {
        const run = (sp: Spell): string => {
          try {
            return castLog(battleWith(board.ascii, [sp]), aim).join('\n');
          } catch (e) {
            return `threw ${e instanceof Error ? e.message : String(e)}`;
          }
        };
        const x = run(sa);
        const y = run(sb);
        if (x !== y) return `spell ${sa.key} ${JSON.stringify(aim)}\nFLAT ${x}\nTIDY ${y}`;
      }
    }
  }
  return null;
}

const shapeOf = (m: MemberId): Lattice['shape'] => parseLattice(MEMBERS[m].shape).shape;
const BIG = { width: 7, height: 7, holes: [{ x: 3, y: 3 }] };

describe('fuzz: a tidied Fair Copy keeps the cast (S13 identity)', () => {
  test('over random proven clusters on both pages, every tidied compile casts the same', () => {
    let tidied = 0;
    let refused = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const rng = createRng(seed * 7919);
      for (const m of MEMBER_IDS) {
        const lattice = randomLattice(rng, shapeOf(m));
        let p = setMemberLattice(newProfile(), m, lattice);
        const masks = compileLattice(latticeOf(p, m), []).spells.map((sp) => [...(sp.cells ?? [])]);
        for (let i = 0; i < TUNING.provenCasts; i++) p = recordProof(p, m, masks);
        const l = latticeOf(p, m);
        const allMasks = MEMBER_IDS.flatMap((id) => p.proof[id] ?? []);
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
