import { describe, expect, test } from 'vitest';
import {
  ENCOUNTERS,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  START_COLLECTION,
  TUNING,
} from '$data';
import {
  type Action,
  type ActionResult,
  applyAction,
  applyDoorway,
  type BattleSpec,
  type BattleState,
  beginEncounter,
  blockingAuras,
  type Coord,
  canPlace,
  castableSpells,
  closeBattle,
  clustersOf,
  compiledFor,
  compileGlyph,
  createBattle,
  createRng,
  DIRS,
  disconnected,
  economyOf,
  type GameEvent,
  type GlyphCast,
  glyphLibrary,
  glyphSamples,
  isSocket,
  latticeOf,
  legalAims,
  legalMoves,
  masksFrom,
  memberById,
  newProfile,
  type Profile,
  pickLoot,
  provenCount,
  pushOn,
  type Rng,
  recordAction,
  recordOf,
  recordProof,
  returnHome,
  setMemberLattice,
  setSocket,
  startTrip,
  step,
  type Trip,
  validateLoadout,
} from '$engine';

/**
 * Economy calibration (plan task C0, M11): bots play seeded trips with Glyphs compiled from
 * random proven clusters (and the three idioms), the 10-cast windows of harm ÷ base cost are
 * collected per Glyph, and their percentiles print. Skipped unless `CALIBRATE=1`; the numbers
 * are a first guess to tune by playing, not a verdict (bots aren't players).
 *
 * CALIBRATE=1 pnpm vitest run tests/sim/calibrate.test.ts
 * Env: CALIBRATE_CAREERS (default 120), CALIBRATE_TRIPS per career (default 3).
 */

const CAREERS = Number(process.env.CALIBRATE_CAREERS ?? 120);
const TRIPS_PER_CAREER = Number(process.env.CALIBRATE_TRIPS ?? 3);
const MAX_ROUNDS = 40;
const WINDOW = TUNING.tierWindow;

function pick<T>(rng: Rng, xs: readonly T[]): T {
  const x = xs[rng.int(0, xs.length - 1)];
  if (x === undefined) throw new Error('pick from empty');
  return x;
}

// ── Loadouts ────────────────────────────────────────────

/** Flat idiom layouts for the Draughtsman's middle row (Cashing In, Bonfire, Undertaker). */
const IDIOM_ROWS: readonly (readonly RuneId[])[] = [
  ['bolt', 'ink', 'onInked', 'spark'],
  ['splash', 'oil', 'spark'],
  ['bolt', 'onKill', 'ink'],
];

const THEMES: readonly { sources: RuneId[]; chain: RuneId[]; auras: RuneId[] }[] = [
  {
    sources: ['bolt', 'quill', 'bolt', 'splash'],
    chain: [
      'pierce',
      'onIgnite',
      'scald',
      'etch',
      'kiln',
      'ink',
      'oil',
      'spark',
      'torch',
      'brass',
      'steam',
      'bend',
      'fork',
      'onInked',
      'onKill',
      'ink',
      'oil',
      'spark',
    ],
    auras: ['thrift', 'amplify', 'echo'],
  },
  {
    sources: ['bolt', 'quill'],
    chain: ['kiln', 'kiln', 'brass', 'oil', 'torch', 'spark', 'etch', 'scald', 'ink', 'pierce'],
    auras: ['thrift', 'amplify'],
  },
];

const sameTile = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

/**
 * Lays chains of the theme on the given members' empty lattices (as the fuzz's themed loadouts do):
 * a Source with an arrow, 3 to 5 runes along it, sometimes an aura beside the Source. Everything
 * goes through `canPlace`, so ownership and ink hold.
 */
function fillThemed(p0: Profile, members: readonly MemberId[], rng: Rng): Profile {
  const pool = pick(rng, THEMES);
  let p = p0;
  for (const m of members) p = setMemberLattice(p, m, { shape: latticeOf(p, m).shape, runes: [] });
  for (const m of members) {
    for (let c = 0; c < 2; c++) {
      let lat = latticeOf(p, m);
      const free = (at: Coord): boolean =>
        isSocket(lat.shape, at) && !lat.runes.some((r) => sameTile(r.at, at));
      const starts: Coord[] = [];
      for (let y = 0; y < lat.shape.height; y++) {
        for (let x = 0; x < lat.shape.width; x++) if (free({ x, y })) starts.push({ x, y });
      }
      if (starts.length === 0) break;
      const at0 = pick(rng, starts);
      const source = pick(rng, pool.sources);
      if (canPlace(p, m, at0, source) !== null) continue;
      let dir = pick(rng, DIRS);
      lat = setSocket(lat, at0, source, dir);
      p = setMemberLattice(p, m, lat);
      let cur = at0;
      const len = rng.int(3, 5);
      for (let i = 0; i < len; i++) {
        const next = [dir, ...DIRS].map((d) => ({ d, to: step(cur, d) })).find((o) => free(o.to));
        if (!next) break;
        const rune = pick(rng, pool.chain);
        if (canPlace(p, m, next.to, rune) !== null) continue;
        const rdir = RUNES[rune].arrow ? next.d : undefined;
        lat = setSocket(lat, next.to, rune, rdir);
        p = setMemberLattice(p, m, lat);
        cur = next.to;
        dir = rdir ?? next.d;
      }
      if (rng.next() < 0.5) {
        const spots = DIRS.map((d) => step(at0, d)).filter(free);
        const spot = spots.length > 0 ? pick(rng, spots) : null;
        const aura = pick(rng, pool.auras);
        if (spot && canPlace(p, m, spot, aura) === null) {
          lat = setSocket(lat, spot, aura);
          p = setMemberLattice(p, m, lat);
        }
      }
    }
  }
  return p;
}

/** Themed chains for both members, or an idiom row for the Draughtsman (and chains for the Stoker). */
function loadout(seed: number, idiom: number | null): Profile {
  const rng = createRng(seed ^ 0x51ed);
  const base: Profile = {
    ...newProfile(),
    collection: Object.fromEntries(RUNE_IDS.map((r) => [r, START_COLLECTION[r] + 3])) as Record<
      RuneId,
      number
    >,
    inkCapacity: { draughtsman: 16, stoker: 16 },
  };
  const row = idiom === null ? undefined : IDIOM_ROWS[idiom];
  for (let tries = 0; tries < 20; tries++) {
    let p = fillThemed(base, row ? ['stoker'] : MEMBER_IDS, rng);
    if (row) {
      let lat = {
        shape: latticeOf(p, 'draughtsman').shape,
        runes: [] as ReturnType<typeof latticeOf>['runes'],
      };
      row.forEach((rune, x) => {
        lat = setSocket(lat, { x, y: 1 }, rune, 'right');
      });
      p = setMemberLattice(p, 'draughtsman', lat);
    }
    if (Object.keys(validateLoadout(p)).length === 0) return p;
  }
  return newProfile();
}

function profileBattle(p: Profile, enc: number, seed: number): BattleState {
  const e = ENCOUNTERS[enc % ENCOUNTERS.length];
  if (!e) throw new Error('no encounter');
  const party: BattleSpec['party'] = {};
  for (const m of MEMBER_IDS) party[m] = { hp: MEMBERS[m].hp, spells: compiledFor(p, m).spells };
  return createBattle({ title: e.title, board: e.layout, seed, party }).state;
}

/** Casts every legal aim of every spell of `m` (capped) and records the masks as full proof. */
function proveByCasting(p: Profile, m: MemberId, enc: number, seed: number): Profile {
  const state = profileBattle(p, enc, seed);
  let out = p;
  for (const c of castableSpells(state, m)) {
    if (!c.usable) continue;
    for (const aim of legalAims(state, m, c.spell.key).slice(0, 12)) {
      const r = applyAction(state, { type: 'cast', unit: m, spell: c.spell.key, aim });
      const masks = masksFrom(r.events, m);
      for (let i = 0; i < TUNING.provenCasts && masks.length > 0; i++)
        out = recordProof(out, m, masks);
    }
  }
  return out;
}

/** Compiles up to `rounds` random proven, unblocked clusters per member; the first is the biggest on idiom seeds. */
function compileSome(p0: Profile, seed: number, rounds: number, biggestFirst: boolean): Profile {
  const rng = createRng(seed ^ 0x6c79);
  let p = p0;
  for (const m of MEMBER_IDS) {
    for (let round = 0; round < rounds; round++) {
      try {
        let proven = p;
        for (let k = 0; k < 3; k++) {
          proven = proveByCasting(proven, m, rng.int(0, ENCOUNTERS.length - 1), seed + k);
        }
        const lib = glyphLibrary(proven);
        const l = latticeOf(proven, m);
        const spells = compiledFor(proven, m).spells;
        const masks = MEMBER_IDS.flatMap((id) => proven.proof[id] ?? []);
        const shared = (c: { cells: readonly Coord[] }): boolean =>
          c.cells.some(
            (cell) =>
              spells.filter((sp) => sp.path.some((q) => q.at.x === cell.x && q.at.y === cell.y))
                .length > 1,
          );
        const candidates = clustersOf(l, lib).filter(
          (c) =>
            !shared(c) &&
            disconnected(l, c, lib).length === 0 &&
            c.cells.length >= TUNING.glyphMinCells &&
            c.cells.length <= TUNING.glyphMaxCells &&
            blockingAuras(l, c, lib).length === 0 &&
            provenCount(l, c, masks) >= TUNING.provenCasts,
        );
        if (candidates.length === 0) break;
        const cluster =
          biggestFirst && round === 0 && m === 'draughtsman'
            ? candidates.reduce((a, b) => (b.cells.length > a.cells.length ? b : a))
            : pick(rng, candidates);
        p = compileGlyph(
          { ...proven, vellum: proven.vellum + 2 },
          m,
          cluster,
          `G${seed}${m}${round}`,
        );
      } catch {
        break;
      }
    }
  }
  return Object.keys(validateLoadout(p)).length === 0 ? p : p0;
}

// ── The bot ─────────────────────────────────────────────

const liveEnemies = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy' && u.hp > 0);
const hpSum = (s: BattleState, kind: 'enemy' | 'member') =>
  s.units.filter((u) => u.kind === kind).reduce((a, u) => a + Math.max(0, u.hp), 0);
const dist = (a: Coord, b: Coord) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

interface Candidate {
  action: Action;
  score: number;
  glyph: boolean;
}

/** Every usable cast scored; `glyph` marks the ones whose trace runs through a Glyph. */
function candidates(s: BattleState, id: string): Candidate[] {
  const out: Candidate[] = [];
  for (const c of castableSpells(s, id)) {
    if (!c.usable) continue;
    for (const aim of legalAims(s, id, c.spell.key)) {
      const action: Action = { type: 'cast', unit: id, spell: c.spell.key, aim };
      const r = applyAction(s, action);
      const score =
        hpSum(s, 'enemy') -
        hpSum(r.state, 'enemy') -
        1.5 * (hpSum(s, 'member') - hpSum(r.state, 'member'));
      const glyph = r.events.some((e) => e.type === 'trace' && e.spans.some((sp) => sp.glyph));
      out.push({ action, score, glyph });
    }
  }
  return out;
}

const best = (cs: Candidate[]): Candidate | null =>
  cs.reduce<Candidate | null>((a, c) => (!a || c.score > a.score ? c : a), null);

interface Played {
  state: BattleState;
  events: GameEvent[];
  actions: Action[];
}

/**
 * Greedy bot that prefers Glyph casts: per member, the best-scoring cast among those that run a
 * Glyph (if any scores above zero), otherwise the best of all; steps toward an enemy first when
 * nothing hurts.
 */
function playBattle(start: ActionResult): Played {
  let state = start.state;
  const events = [...start.events];
  const actions: Action[] = [];
  const apply = (a: Action): void => {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    actions.push(a);
  };
  while (state.phase === 'player' && state.round <= MAX_ROUNDS) {
    for (const id of MEMBER_IDS) {
      if (state.phase !== 'player') break;
      const m = memberById(state, id);
      if (m.hp <= 0) continue;
      const choose = (): Candidate | null => {
        const cs = candidates(state, id);
        const g = best(cs.filter((c) => c.glyph));
        return g && g.score > 0 ? g : best(cs);
      };
      let c = choose();
      if (!c || c.score <= 0) {
        if (!m.moved) {
          let target: Coord | null = null;
          let d = Math.min(...liveEnemies(state).map((e) => dist(m.pos, e.pos)));
          for (const to of legalMoves(state, id)) {
            const dd = Math.min(...liveEnemies(state).map((e) => dist(to, e.pos)));
            if (dd < d) {
              d = dd;
              target = to;
            }
          }
          if (target) apply({ type: 'move', unit: id, to: target });
        }
        c = choose();
      }
      if (c && c.score > 0 && state.phase === 'player') apply(c.action);
    }
    if (state.phase === 'player') apply({ type: 'endTurn' });
  }
  return { state, events, actions };
}

// ── A career: one profile, several trips ────────────────

type Samples = Map<string, { kind: 'spell' | 'payload'; samples: GlyphCast['sample'][] }>;

interface Tally {
  trips: number;
  fights: number;
  glyphs: number;
  casts: number;
  recordMismatch: number;
}

function career(seed: number, into: Samples, tally: Tally): void {
  const idiom = seed % 2 === 0 ? seed % IDIOM_ROWS.length : null;
  let p = compileSome(loadout(seed, idiom), seed, 2, idiom !== null);
  tally.glyphs += p.glyphs.length;
  const rng = createRng(seed * 2654435761);
  const kinds = new Map(p.glyphs.map((g) => [g.id, g.kind]));
  for (let n = 0; n < TRIPS_PER_CAREER; n++) {
    let trip: Trip | null = startTrip(p, seed * 100 + n);
    tally.trips += 1;
    let guard = 0;
    while (trip && guard++ < 40) {
      const t: Trip = trip;
      if (t.status === 'fight') {
        const played = playBattle(beginEncounter(p, t));
        if (played.state.phase === 'player') break; // capped: drop the trip
        tally.fights += 1;
        const samples = glyphSamples(played.events, p);
        for (const s of samples) {
          const k = `${s.glyph}@${s.version}`;
          const e = into.get(`${seed}|${k}`) ?? {
            kind: kinds.get(s.glyph) ?? 'spell',
            samples: [],
          };
          e.samples.push(s.sample);
          into.set(`${seed}|${k}`, e);
        }
        tally.casts += samples.length;
        const withActions = played.actions.reduce<Trip>((acc, a) => recordAction(acc, a), t);
        const closed = closeBattle(p, withActions, played.state, played.events);
        for (const g of closed.profile.glyphs) {
          const rec = recordOf(closed.profile, g.id, g.version);
          const mine = into.get(`${seed}|${g.id}@${g.version}`)?.samples.length ?? 0;
          if (rec.casts !== mine) tally.recordMismatch += 1;
        }
        p = closed.profile;
        trip = closed.trip;
      } else if (t.status === 'looting') {
        const i = Math.max(
          0,
          t.offers.findIndex((o) => o.kind !== 'doorway'),
        );
        trip = pickLoot(t, i);
      } else if (t.status === 'doorway') {
        const r = applyDoorway(p, t, p.lattices);
        p = r.profile;
        trip = r.trip;
      } else if (t.status === 'crossroads') {
        if (rng.next() < 0.15) {
          p = returnHome(p, t);
          trip = null;
        } else trip = pushOn(t);
      } else {
        p = returnHome(p, t);
        trip = null;
      }
    }
  }
}

// ── Percentiles ─────────────────────────────────────────

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (at - lo);
}

function table(label: string, values: number[]): string {
  const s = [...values].sort((a, b) => a - b);
  const f = (q: number) => quantile(s, q).toFixed(2);
  return `${label.padEnd(10)} n=${String(s.length).padStart(4)}  p25 ${f(0.25)}  p50 ${f(0.5)}  p75 ${f(0.75)}  p90 ${f(0.9)}`;
}

describe.skipIf(!process.env.CALIBRATE)('economy calibration (C0)', () => {
  test('10-cast windows of harm ÷ base cost, per Glyph', () => {
    const samples: Samples = new Map();
    const tally: Tally = { trips: 0, fights: 0, glyphs: 0, casts: 0, recordMismatch: 0 };
    for (let seed = 1; seed <= CAREERS; seed++) career(seed, samples, tally);

    // Non-overlapping 10-cast windows per Glyph (sliding ones would repeat the same casts).
    const all: number[] = [];
    const byKind: Record<'spell' | 'payload', number[]> = { spell: [], payload: [] };
    let short = 0;
    for (const { kind, samples: ss } of samples.values()) {
      if (ss.length < WINDOW) short += 1;
      for (let i = 0; i + WINDOW <= ss.length; i += WINDOW) {
        const v = economyOf(ss.slice(i, i + WINDOW));
        all.push(v);
        byKind[kind].push(v);
      }
    }
    const lines = [
      `trips ${tally.trips}, fights ${tally.fights}, Glyphs compiled ${tally.glyphs}, Glyph casts ${tally.casts}`,
      `Glyphs with a full window: ${samples.size - short} of ${samples.size} that cast`,
      table('overall', all),
      table('spell', byKind.spell),
      table('payload', byKind.payload),
    ];
    console.log(`\n${lines.join('\n')}\n`);

    expect(tally.trips).toBeGreaterThanOrEqual(200);
    expect(tally.recordMismatch).toBe(0);
    expect(all.length).toBeGreaterThan(0);
  }, 590_000);
});
