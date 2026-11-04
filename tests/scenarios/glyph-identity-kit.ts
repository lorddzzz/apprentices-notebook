import { MEMBER_IDS, MEMBERS, type MemberId, RUNE_IDS, RUNES, type RuneId, TUNING } from '$data';
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
  type GlyphArg,
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
  roleOf,
  type Spell,
  setMemberLattice,
  sharingSpells,
  step,
  stepShape,
  tidyCollapse,
  toGlyphDef,
  turnLeft,
  turnRight,
} from '$engine';
import { cast } from './harness';

/**
 * Design §9.4, the identity property: compiling a cluster into a Glyph never changes what a cast
 * does. Every case builds the flat lattice and the compiled one (Glyph in the entry socket, the
 * outside tail re-laid from the socket's exit neighbour) and compares, on three boards, the cast's
 * aim log and its spell's Step tree with the page coordinates left out (W0b: the steps don't act
 * yet; E1 makes the log carry their effects too).
 */

export const LEAN = MEMBERS.draughtsman.lean;
export const flatCompile = (l: Lattice, glyphs: GlyphLibrary = {}) =>
  compileLattice(l, glyphs, {}, LEAN);

// ── Independent frame maths (the test does not reuse the engine's rotation) ──

export const ORDER: readonly Dir[] = ['right', 'down', 'left', 'up'];
export const worldOf = (o: Coord, dir: Dir): Coord => {
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
export const localOf = (o: Coord, dir: Dir): Coord => {
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
export const localDir = (world: Dir, dir: Dir): Dir =>
  ORDER[(ORDER.indexOf(world) - ORDER.indexOf(dir) + 4) % 4] as Dir;

export const norm = (c: Coord): Coord => ({ x: c.x + 0, y: c.y + 0 });

/** Hand-built GlyphDef: the flat runes at `cells`, re-expressed in the frame rooted at `root`. */
export function glyphFromFlat(
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
  return {
    id,
    name: id,
    kind,
    cells: runes,
    entry: { x: 0, y: 0 },
    exits: [],
    idiom: null,
    version: 1,
    params: [],
    extraExit: null,
  };
}

export const libOf = (...defs: GlyphDef[]): GlyphLibrary =>
  Object.fromEntries(defs.map((d) => [d.id, d]));

// ── Battles ──

export function battleWith(board: string, spells: Spell[], weak = false): BattleState {
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

/** The cast's log, then what its spell does: the Step tree and the source's auras, coordinates left out. */
export function castLog(state: BattleState, aim: Aim): string[] {
  const spell = state.units.find((u) => u.kind === 'member')?.spells[0];
  const what = JSON.stringify([spell?.source, spell?.sourceAuras, stepShape(spell?.first ?? null)]);
  const events = cast(state, 'draughtsman', aim).events;
  return [...describeLog(events), what];
}

export interface Board {
  ascii: string;
  tile: Coord;
}
export const BOARDS: readonly Board[] = [
  { ascii: 'D . . d . .\n. . . . . .\n. . . S . .', tile: parseLabel('D1') },
  { ascii: 'D . ro o d .\n. r . . . .\n. . . . . .', tile: parseLabel('C1') },
  { ascii: 'D . d . d .\n. r d . . .\n. . ~ . . .', tile: parseLabel('C1') },
];

export interface Case {
  name: string;
  flat: string;
  compiled: string;
  glyph: { id: string; kind: GlyphDef['kind']; cells: Coord[]; root: Coord };
  splash?: boolean;
  weak?: boolean;
  mustInclude: string;
}
export const c = (x: number, y: number): Coord => ({ x, y });

export const CASES: readonly Case[] = [
  {
    name: 'a trigger in a Spell Glyph (Bolt> Ink Tally) with a Spark tail',
    flat: '. . . . .\nBolt> Ink Tally Spark .\n. . . . .',
    compiled: '. . . . .\nG:ci> Spark . . .\n. . . . .',
    glyph: { id: 'ci', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    mustInclude: '"tally"',
  },
  {
    name: 'an area Spell Glyph (Splash> Oil Spark)',
    flat: '. . . . .\nSplash> Oil Spark . .\n. . . . .',
    compiled: '. . . . .\nG:bf> . . . .\n. . . . .',
    glyph: { id: 'bf', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    splash: true,
    mustInclude: 'splash aims at',
  },
  {
    name: 'two Actions (Bolt> Strike Shove)',
    flat: '. . . . .\nBolt> Strike Shove . .\n. . . . .',
    compiled: '. . . . .\nG:ut> . . . .\n. . . . .',
    glyph: { id: 'ut', kind: 'spell', cells: [c(0, 1), c(1, 1), c(2, 1)], root: c(0, 1) },
    weak: true,
    mustInclude: '"shove"',
  },
  {
    name: 'a Fork exit leading to an outside tail',
    flat: '. Ink . . .\nBolt> Fork . . .\n. Spark . . .\n. Oil . . .',
    compiled: '. . . . .\nG:fk> . . . .\nSpark . . . .\nOil . . . .',
    glyph: { id: 'fk', kind: 'spell', cells: [c(0, 1), c(1, 1), c(1, 0)], root: c(0, 1) },
    mustInclude: '"fork"',
  },
  {
    name: 'a trigger inside a payload Glyph, with a tail after it',
    flat: '. . . . .\nBolt> Ink Tally Spark Oil\n. . . . .',
    compiled: '. . . . .\nBolt> G:pt> Oil . .\n. . . . .',
    glyph: { id: 'pt', kind: 'payload', cells: [c(1, 1), c(2, 1), c(3, 1)], root: c(1, 1) },
    mustInclude: '"tally"',
  },
  {
    name: 'a seal inside a payload Glyph keeps the rest in its jar',
    flat: '. . . . .\nBolt> Ink Jar Spark Oil\n. . . . .',
    compiled: '. . . . .\nBolt> G:pj> Oil . .\n. . . . .',
    glyph: { id: 'pj', kind: 'payload', cells: [c(1, 1), c(2, 1), c(3, 1)], root: c(1, 1) },
    mustInclude: '"jar"',
  },
  {
    name: 'an inner aura',
    flat: 'Coil Coil . . .\nBolt> Ink Spark . .\n. . . . .',
    compiled: '. . . . .\nG:ia> Spark . . .\n. . . . .',
    glyph: { id: 'ia', kind: 'spell', cells: [c(0, 1), c(1, 1), c(0, 0), c(1, 0)], root: c(0, 1) },
    mustInclude: '"coil"',
  },
  {
    name: 'an outer aura (flat: the aura touches every inner cell)',
    flat: 'Coil Coil . . .\nBolt> Ink Spark . .\n. . . . .',
    compiled: 'Coil . . . .\nG:oa> Spark . . .\n. . . . .',
    glyph: { id: 'oa', kind: 'spell', cells: [c(0, 1), c(1, 1)], root: c(0, 1) },
    mustInclude: '"coil"',
  },
  {
    name: 'an outer aura on a payload Glyph',
    flat: '. Afterglow Afterglow . .\nBolt> Ink Oil Spark .\n. . . . .',
    compiled: '. Afterglow . . .\nBolt> G:pa> Spark . .\n. . . . .',
    glyph: { id: 'pa', kind: 'payload', cells: [c(1, 1), c(2, 1)], root: c(1, 1) },
    mustInclude: '"afterglow"',
  },
];

// ── All four rotations ──

/** Local pattern (flow enters at 0,0 travelling right): Bolt, Fork, Ink up, Oil down, Coil over Bolt. */
export const PATTERN: PlacedRune[] = [
  { at: c(0, 0), rune: 'bolt', dir: 'right' },
  { at: c(1, 0), rune: 'fork' },
  { at: c(1, -1), rune: 'ink' },
  { at: c(1, 1), rune: 'oil' },
  { at: c(0, -1), rune: 'coil' },
];
export const ROOT = c(4, 4);
export const SHAPE = { width: 9, height: 9, holes: [] };
export const at = (o: Coord, dir: Dir): Coord => {
  const w = worldOf(o, dir);
  return { x: ROOT.x + w.x, y: ROOT.y + w.y };
};
export const TAIL_UP: PlacedRune = { at: c(1, -2), rune: 'spark' };
export const TAIL_DOWN: PlacedRune = { at: c(1, 2), rune: 'spark' };

// ── Fair Copy collapses to the same behaviour ──

// ── Fuzz: a tidied Fair Copy (stranded runes slid up) casts what the flat lattice cast ──

export const SOURCES: RuneId[] = ['bolt', 'splash', 'touch', 'vat'];
export const FLOW: RuneId[] = [
  'ink',
  'oil',
  'spark',
  'steam',
  'brass',
  'strike',
  'shove',
  'guard',
  'tally',
  'brink',
  'seep',
  'lay',
  'jar',
  'bend',
  'fork',
];
export const AURAS: RuneId[] = ['afterglow', 'steep', 'coil'];

export const pickOf = <T>(rng: Rng, xs: readonly T[]): T => xs[rng.int(0, xs.length - 1)] as T;

/** A random flow: a Source, then runes laid by walking outward, forking and bending. */
export function randomLattice(rng: Rng, shape: Lattice['shape']): Lattice {
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

export const AIMS: readonly Aim[] = [
  { kind: 'self' },
  { kind: 'dir', dir: 'right' },
  { kind: 'dir', dir: 'down' },
  { kind: 'dir', dir: 'left' },
  { kind: 'dir', dir: 'up' },
];

/** Every spell of the two lattices casts the same log on every board and aim. */
export function sameCasts(
  flat: Lattice,
  tidy: Lattice,
  library: GlyphLibrary,
  flatLibrary: GlyphLibrary = {},
): string | null {
  const a = flatCompile(flat, flatLibrary).spells;
  const b = flatCompile(tidy, library).spells;
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

export const shapeOf = (m: MemberId): Lattice['shape'] => parseLattice(MEMBERS[m].shape).shape;
export const BIG = { width: 7, height: 7, holes: [{ x: 3, y: 3 }] };

// ── M28: parameters and the extra exit over the same proven clusters ──

export const worldDir = (local: Dir, dir: Dir): Dir =>
  ORDER[(ORDER.indexOf(local) + ORDER.indexOf(dir)) % 4] as Dir;
export const runesOfRole = (f: string): RuneId[] => RUNE_IDS.filter((id) => RUNES[id].role === f);
export const isGlyphSocket = (p: Placed): p is Extract<Placed, { glyph: string }> => 'glyph' in p;

export interface Compiled {
  p: ReturnType<typeof newProfile>;
  l: Lattice;
  cluster: Cluster;
  compiled: Lattice;
  socket: Extract<Placed, { glyph: string }>;
  def: GlyphDef;
}

/** The proven clusters of random pages (as the S13 fuzz), each compiled with a Fair Copy. */
export function* provenGlyphs(seeds: number, perPage: number): Generator<Compiled> {
  for (let seed = 1; seed <= seeds; seed++) {
    const rng = createRng(seed * 7919);
    for (const m of MEMBER_IDS) {
      const lattice = randomLattice(rng, shapeOf(m));
      let p = setMemberLattice(newProfile(), m, lattice);
      const masks = compileLattice(latticeOf(p, m)).spells.map((sp) => [...(sp.cells ?? [])]);
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
      for (let k = 0; k < perPage && candidates.length > 0; k++) {
        const cluster = pickOf(rng, candidates);
        const def0 = toGlyphDef(l, cluster, 'Fuzz', 'gz');
        if (tidyCollapse(l, cluster, def0).slid === 0) continue;
        const next = compileGlyph({ ...p, vellum: 9 }, m, cluster, 'Fuzz');
        const compiled = latticeOf(next, m);
        const socket = compiled.runes.find(isGlyphSocket);
        const def = socket ? glyphLibrary(next)[socket.glyph] : undefined;
        if (!socket || !def) throw new Error('no Glyph after the Fair Copy');
        yield { p, l, cluster, compiled, socket, def };
      }
    }
  }
}

/** Random same-role arguments (a Kind for a Kind, an Action for an Action, P7) on up to two cells. */
export function randomArgs(rng: Rng, def: GlyphDef): Record<string, GlyphArg> {
  const roles = ['kind', 'action'];
  const eligible = def.cells.filter((c) => roles.includes(roleOf(c.rune) ?? ''));
  const args: Record<string, GlyphArg> = {};
  for (let n = rng.int(1, 2); n > 0 && eligible.length > 0; n--) {
    const cell = eligible.splice(rng.int(0, eligible.length - 1), 1)[0] as PlacedRune;
    args[`${cell.at.x},${cell.at.y}`] = { rune: pickOf(rng, runesOfRole(roleOf(cell.rune) ?? '')) };
  }
  return args;
}

/** The flat lattice with the arguments stamped into the cluster's cells. */
export function stamped(
  l: Lattice,
  cluster: Cluster,
  dir: Dir,
  args: Record<string, GlyphArg>,
): Lattice {
  const members = new Set([...cluster.cells, ...cluster.auras].map((p) => `${p.x},${p.y}`));
  const runes = l.runes.map((r) => {
    if (!members.has(`${r.at.x},${r.at.y}`) || !('rune' in r)) return r;
    const o = norm(localOf({ x: r.at.x - cluster.root.x, y: r.at.y - cluster.root.y }, dir));
    const arg = args[`${o.x},${o.y}`];
    if (!arg) return r;
    return arg.dir
      ? { at: r.at, rune: arg.rune, dir: worldDir(arg.dir, dir) }
      : { at: r.at, rune: arg.rune };
  });
  return { shape: l.shape, runes };
}

// ── A tail another spell also enters (fuzz: profileFor('random', 2)) ──
