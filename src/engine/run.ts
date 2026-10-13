import {
  type Aspect,
  CODEX,
  type CodexEntryDef,
  ENCOUNTERS,
  IDIOMS,
  INTERACTION_IDS,
  type InteractionId,
  LOOT_TABLES,
  type LootEntry,
  type LootTableId,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RECIPES,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SOLVENT_IDS,
  type SolventId,
  START_COLLECTION,
  TUNING,
} from '$data';
import { applyAction, createEncounterBattle } from './battle';
import { blockingAuras, type Cluster, toGlyphDef } from './cluster';
import { fairCopy } from './glyph';
import { type Coord, DIRS, label } from './grid';
import { compileLattice, inkCost, inkUsed, isSocket, validateLattice } from './lattice';
import { parseLattice } from './notation';
import { masksFrom, matchIdioms, provenCount } from './proof';
import { memberById } from './queries';
import { type Attempt, trial, trialKey } from './research';
import { createRng, deriveSeed, pickWeighted } from './rng';
import type {
  Action,
  ActionResult,
  Aim,
  BattleState,
  CompiledLattice,
  FiredCell,
  GlyphDef,
  GlyphId,
  GlyphLibrary,
  Lattice,
  LatticeIssue,
  LootItem,
  PartyInit,
  Placed,
  PlacedRune,
  Profile,
  SaveData,
  SpellKey,
  Trip,
  TripStatus,
} from './types';
import { isGlyph } from './types';

/**
 * Run layer: the profile (collection, ink, lattices, codex), the trip lifecycle and save data.
 * Everything here is pure: functions return new objects and never mutate their inputs.
 *
 *   startTrip → beginEncounter → (battle) → finishEncounter → pickLoot × picks → pushOn | returnHome
 */

function perMember<T>(make: (m: MemberId) => T): Record<MemberId, T> {
  return Object.fromEntries(MEMBER_IDS.map((m) => [m, make(m)])) as Record<MemberId, T>;
}

const copyRune = (r: Placed): Placed =>
  isGlyph(r)
    ? { at: { ...r.at }, glyph: r.glyph, dir: r.dir }
    : r.dir === undefined
      ? { at: { ...r.at }, rune: r.rune }
      : { at: { ...r.at }, rune: r.rune, dir: r.dir };

// ── Profile ─────────────────────────────────────────────

export function newProfile(): Profile {
  return {
    collection: { ...START_COLLECTION },
    inkCapacity: perMember(() => TUNING.startInk),
    lattices: perMember((m) => parseLattice(MEMBERS[m].startLattice).runes.map(copyRune)),
    interactions: [],
    ...researchDefaults(),
  };
}

/** The research and compile fields of a fresh profile (save v2). */
export function researchDefaults(): Pick<
  Profile,
  'solvents' | 'vellum' | 'bench' | 'glyphs' | 'proof' | 'idioms'
> {
  return {
    solvents: Object.fromEntries(SOLVENT_IDS.map((id) => [id, 0])) as Record<SolventId, number>,
    vellum: 0,
    bench: { trials: [], known: [] },
    glyphs: [],
    proof: perMember(() => []),
    idioms: [],
  };
}

export function latticeOf(p: Profile, m: MemberId): Lattice {
  return { shape: parseLattice(MEMBERS[m].shape).shape, runes: p.lattices[m].map(copyRune) };
}

/** The profile's Fair Copies by id, for compiling and costing lattices that hold Glyphs. */
export function glyphLibrary(p: Pick<Profile, 'glyphs'>): GlyphLibrary {
  return Object.fromEntries(p.glyphs.map((g) => [g.id, g]));
}

export function compiledFor(p: Profile, m: MemberId): CompiledLattice {
  return compileLattice(latticeOf(p, m), MEMBERS[m].affinity, glyphLibrary(p));
}

export function setMemberLattice(p: Profile, m: MemberId, l: Lattice): Profile {
  return { ...p, lattices: { ...p.lattices, [m]: l.runes.map(copyRune) } };
}

/** Runes a placed socket uses from the collection: itself, or a Glyph's inner runes (plan P1). */
function runesIn(p: Profile, r: Placed): RuneId[] {
  if (!isGlyph(r)) return [r.rune];
  return (glyphLibrary(p)[r.glyph]?.cells ?? []).map((c) => c.rune);
}

function placedCount(p: Profile, rune: RuneId, except?: { m: MemberId; at: Coord }): number {
  let n = 0;
  for (const m of MEMBER_IDS) {
    for (const r of p.lattices[m]) {
      if (except && except.m === m && except.at.x === r.at.x && except.at.y === r.at.y) continue;
      n += runesIn(p, r).filter((x) => x === rune).length;
    }
  }
  return n;
}

/** Copies of `rune` that are owned and not yet placed in either lattice. */
export function available(p: Profile, rune: RuneId): number {
  return Math.max(0, p.collection[rune] - placedCount(p, rune));
}

/**
 * Null when `rune` can go on `at` of member `m`, else the reason. A socket that is already
 * occupied counts as free (placing replaces its rune).
 */
export function canPlace(p: Profile, m: MemberId, at: Coord, rune: RuneId): string | null {
  const l = latticeOf(p, m);
  if (!isSocket(l.shape, at)) return 'No socket here';
  if (p.collection[rune] - placedCount(p, rune, { m, at }) <= 0) return 'None left';
  const without: Lattice = {
    shape: l.shape,
    runes: l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y),
  };
  if (inkUsed(without, glyphLibrary(p)) + inkCost(rune) > p.inkCapacity[m]) {
    return 'Not enough ink';
  }
  return null;
}

/** `canPlace` for a Glyph: every inner rune must be free, as if placed one by one (plan P1). */
export function canPlaceGlyph(p: Profile, m: MemberId, at: Coord, glyph: GlyphId): string | null {
  const def = glyphLibrary(p)[glyph];
  if (!def) return 'Unknown Glyph';
  const l = latticeOf(p, m);
  if (!isSocket(l.shape, at)) return 'No socket here';
  const needs = new Map<RuneId, number>();
  for (const c of def.cells) needs.set(c.rune, (needs.get(c.rune) ?? 0) + 1);
  for (const [rune, n] of needs) {
    if (p.collection[rune] - placedCount(p, rune, { m, at }) < n) return 'None left';
  }
  const runes = l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y);
  const placed: Lattice = { shape: l.shape, runes: [...runes, { at, glyph, dir: 'right' }] };
  if (inkUsed(placed, glyphLibrary(p)) > p.inkCapacity[m]) return 'Not enough ink';
  return null;
}

/** Issues per member (ink, structure, and runes used beyond what is owned). Empty object = ready. */
export function validateLoadout(p: Profile): Partial<Record<MemberId, LatticeIssue[]>> {
  const lattices = perMember((m) => latticeOf(p, m));
  const counts = Object.fromEntries(RUNE_IDS.map((id) => [id, 0])) as Record<RuneId, number>;
  for (const m of MEMBER_IDS) {
    for (const r of lattices[m].runes) for (const rune of runesIn(p, r)) counts[rune] += 1;
  }
  const out: Partial<Record<MemberId, LatticeIssue[]>> = {};
  for (const m of MEMBER_IDS) {
    const issues = validateLattice(lattices[m], p.inkCapacity[m], glyphLibrary(p));
    for (const r of lattices[m].runes) {
      for (const rune of new Set(runesIn(p, r))) {
        if (counts[rune] > p.collection[rune]) {
          issues.push({
            kind: 'owned',
            at: r.at,
            rune,
            message: `Uses ${counts[rune]} of ${rune}, owns ${p.collection[rune]}`,
          });
        }
      }
    }
    if (issues.length > 0) out[m] = issues;
  }
  return out;
}

export function codexView(p: Profile): { entry: CodexEntryDef; known: boolean }[] {
  const owned = RUNE_IDS.filter((id) => p.collection[id] > 0);
  return CODEX.map((entry) => {
    let known: boolean;
    switch (entry.kind) {
      case 'rune':
        known = p.collection[entry.ref as RuneId] > 0;
        break;
      case 'interaction':
        known = p.interactions.includes(entry.ref as InteractionId);
        break;
      case 'recipe':
        known = p.bench.known.includes(entry.ref);
        break;
      case 'idiom':
        known = p.idioms.includes(entry.ref);
        break;
      case 'aspect':
        known = owned.some((id) => RUNES[id].aspects.includes(entry.ref as Aspect));
        break;
    }
    return { entry, known };
  });
}

// ── Trip ────────────────────────────────────────────────

function chargesOf(p: Profile, m: MemberId): Record<SpellKey, number> {
  return Object.fromEntries(compiledFor(p, m).spells.map((sp) => [sp.key, sp.charges]));
}

function need(t: Trip, ...allowed: TripStatus[]): void {
  if (!allowed.includes(t.status)) {
    throw new Error(`Trip is "${t.status}", expected ${allowed.map((s) => `"${s}"`).join(' or ')}`);
  }
}

/** A new trip with full HP and full charges. Throws if the loadout has issues. */
export function startTrip(p: Profile, seed: number): Trip {
  const issues = validateLoadout(p);
  const first = Object.values(issues)[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  return {
    seed,
    encounter: 0,
    status: 'fight',
    hp: perMember((m) => MEMBERS[m].hp),
    charges: perMember((m) => chargesOf(p, m)),
    loot: [],
    offers: [],
    picksLeft: 0,
    actions: [],
  };
}

/**
 * The current encounter's battle: the party enters with the trip's HP and charges, then the
 * trip's recorded actions are replayed (a reload resumes the fight). Throws if one is illegal.
 */
export function beginEncounter(p: Profile, t: Trip): ActionResult {
  need(t, 'fight');
  const enc = ENCOUNTERS[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  const party: Partial<Record<MemberId, PartyInit>> = {};
  for (const m of MEMBER_IDS) {
    const spells = compiledFor(p, m).spells;
    party[m] = {
      hp: t.hp[m],
      spells,
      charges: { ...chargesOf(p, m), ...t.charges[m] },
    };
  }
  const first = createEncounterBattle(enc, party, deriveSeed(t.seed, t.encounter));
  let state = first.state;
  const events = [...first.events];
  for (const a of t.actions) {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

/** Remembers a battle action so a reload can replay the fight up to here. */
export function recordAction(t: Trip, action: Action): Trip {
  need(t, 'fight');
  return { ...t, actions: [...t.actions, structuredClone(action)] };
}

/** Loot offers for a won encounter: distinct table entries, weighted, same result for the same seed. */
export function rollOffers(
  tripSeed: number,
  encounter: number,
  table: LootTableId,
  members: readonly MemberId[] = MEMBER_IDS,
): LootItem[] {
  const rng = createRng(deriveSeed(tripSeed, 1000 + encounter));
  const pool: LootEntry[] = [...LOOT_TABLES[table].entries];
  const offers: LootItem[] = [];
  for (let n = 0; n < TUNING.offersPerWin && pool.length > 0; n++) {
    const [entry] = pool.splice(
      pickWeighted(
        rng,
        pool.map((e) => e.weight),
      ),
      1,
    );
    if (!entry) break;
    const spec = entry.spec;
    if (spec.kind === 'rune') offers.push({ kind: 'rune', rune: spec.rune });
    else if (spec.kind === 'solvent') offers.push({ kind: 'solvent', solvent: spec.solvent });
    else if (spec.kind === 'vellum') offers.push({ kind: 'vellum', amount: spec.amount });
    else {
      const member = members[rng.int(0, members.length - 1)] ?? MEMBER_IDS[0] ?? 'draughtsman';
      offers.push({ kind: 'ink', member, amount: TUNING.inkReserve });
    }
  }
  return offers;
}

/**
 * Closes a finished battle. Interactions seen are kept either way (knowledge isn't loot).
 * Won: HP and charges carry over (a downed member returns at 1 HP) and loot is offered.
 * Wiped: the trip ends and its pending loot is lost.
 */
export function finishEncounter(
  p: Profile,
  t: Trip,
  b: BattleState,
): { profile: Profile; trip: Trip | null; outcome: 'won' | 'wiped' } {
  need(t, 'fight');
  if (b.phase === 'player') throw new Error('The battle is not over');
  const interactions = [...p.interactions];
  for (const d of b.discovered) if (!interactions.includes(d)) interactions.push(d);
  const profile: Profile = { ...p, interactions };
  if (b.phase === 'lost') return { profile, trip: null, outcome: 'wiped' };

  const enc = ENCOUNTERS[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  const trip: Trip = {
    ...t,
    status: 'looting',
    hp: perMember((m) => Math.max(TUNING.reviveHp, memberById(b, m).hp)),
    charges: perMember((m) => ({ ...memberById(b, m).charges })),
    loot: [...t.loot],
    offers: rollOffers(t.seed, t.encounter, enc.loot, MEMBER_IDS),
    picksLeft: enc.picks,
    actions: [],
  };
  return { profile, trip, outcome: 'won' };
}

/** Takes offer `index` into the pending loot. After the last pick the trip moves on. */
export function pickLoot(t: Trip, index: number): Trip {
  need(t, 'looting');
  const item = t.offers[index];
  if (!item) throw new Error(`No offer ${index}`);
  const offers = t.offers.filter((_, i) => i !== index);
  const picksLeft = t.picksLeft - 1;
  const done = picksLeft <= 0 || offers.length === 0;
  const heart = ENCOUNTERS[t.encounter]?.heart ?? false;
  return {
    ...t,
    loot: [...t.loot, item],
    offers: done ? [] : offers,
    picksLeft: done ? 0 : picksLeft,
    status: done ? (heart ? 'cleared' : 'crossroads') : 'looting',
  };
}

/** Deeper into the Seam: the next encounter becomes current. */
export function pushOn(t: Trip): Trip {
  need(t, 'crossroads');
  if (t.encounter + 1 >= ENCOUNTERS.length) throw new Error('There is nothing deeper');
  return { ...t, encounter: t.encounter + 1, status: 'fight' };
}

/** Banks the trip's loot into the profile. */
export function returnHome(p: Profile, t: Trip): Profile {
  need(t, 'crossroads', 'cleared');
  const collection = { ...p.collection };
  const inkCapacity = { ...p.inkCapacity };
  const solvents = { ...p.solvents };
  let vellum = p.vellum;
  for (const item of t.loot) {
    if (item.kind === 'rune') collection[item.rune] += 1;
    else if (item.kind === 'ink') inkCapacity[item.member] += item.amount;
    else if (item.kind === 'solvent') solvents[item.solvent] += 1;
    else vellum += item.amount;
  }
  return { ...p, collection, inkCapacity, solvents, vellum };
}

// ── Save data ───────────────────────────────────────────

/** The save shape, version 2 (see `src/app/save.ts`). Any later change to Profile/Trip needs a migration. */
export function newSave(seed: number): SaveData {
  return { profile: newProfile(), trip: null, seedCounter: seed };
}

/** The seed for the next trip, and the save with its counter advanced. Never reads the clock. */
export function nextTripSeed(save: SaveData): { seed: number; save: SaveData } {
  return {
    seed: deriveSeed(save.seedCounter, 0),
    save: { ...save, seedCounter: save.seedCounter + 1 },
  };
}

function bad(): never {
  throw new Error('Not a valid save');
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function count(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : bad();
}

function oneOf<T extends string>(list: readonly T[], v: unknown): T {
  return list.find((x) => x === v) ?? bad();
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : bad();
}

function record(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : bad();
}

function parseCoord(v: unknown): Coord {
  const r = record(v);
  if (!Number.isInteger(r.x) || !Number.isInteger(r.y)) return bad();
  return { x: r.x as number, y: r.y as number };
}

function parsePlaced(v: unknown): Placed {
  const r = record(v);
  if (r.glyph !== undefined) {
    return { at: parseCoord(r.at), glyph: text(r.glyph), dir: oneOf(DIRS, r.dir) };
  }
  const rune = oneOf(RUNE_IDS, r.rune);
  const at = parseCoord(r.at);
  return r.dir === undefined ? { at, rune } : { at, rune, dir: oneOf(DIRS, r.dir) };
}

function parseLoot(v: unknown): LootItem {
  const r = record(v);
  switch (r.kind) {
    case 'rune':
      return { kind: 'rune', rune: oneOf(RUNE_IDS, r.rune) };
    case 'ink':
      return { kind: 'ink', member: oneOf(MEMBER_IDS, r.member), amount: count(r.amount) };
    case 'solvent':
      return { kind: 'solvent', solvent: oneOf(SOLVENT_IDS, r.solvent) };
    case 'vellum':
      return { kind: 'vellum', amount: count(r.amount) };
    default:
      return bad();
  }
}

function parseProfile(v: unknown): Profile {
  const r = record(v);
  const col = record(r.collection);
  const collection = Object.fromEntries(
    RUNE_IDS.map((id) => [id, col[id] === undefined ? 0 : count(col[id])]),
  ) as Record<RuneId, number>;
  const cap = record(r.inkCapacity);
  const lat = record(r.lattices);
  const inkCapacity = perMember((m) => count(cap[m]));
  const lattices = perMember((m) => list(lat[m]).map(parsePlaced));
  const interactions: InteractionId[] = [];
  for (const i of list(r.interactions)) {
    const id = oneOf(INTERACTION_IDS, i);
    if (!interactions.includes(id)) interactions.push(id);
  }
  const sol = r.solvents === undefined ? {} : record(r.solvents);
  for (const k of Object.keys(sol)) oneOf(SOLVENT_IDS, k);
  const solvents = Object.fromEntries(
    SOLVENT_IDS.map((id) => [id, sol[id] === undefined ? 0 : count(sol[id])]),
  ) as Record<SolventId, number>;
  const benchRaw = record(r.bench);
  const bench = {
    trials: unique(list(benchRaw.trials).map(text)),
    known: unique(
      list(benchRaw.known).map((id) =>
        oneOf(
          RECIPES.map((x) => x.id),
          id,
        ),
      ),
    ),
  };
  const glyphs = list(r.glyphs).map(parseGlyphDef);
  if (new Set(glyphs.map((g) => g.id)).size !== glyphs.length) bad();
  for (const m of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[m].shape).shape;
    // Also rejects a lattice Glyph that is not in the library.
    const structural = validateLattice(
      { shape, runes: lattices[m] },
      null,
      glyphLibrary({ glyphs }),
    );
    if (structural.length > 0) bad();
  }
  const proofRaw = record(r.proof);
  const proof = perMember((m) => list(proofRaw[m]).map((mask) => list(mask).map(parseFired)));
  const idioms = unique(
    list(r.idioms).map((id) =>
      oneOf(
        IDIOMS.map((x) => x.id),
        id,
      ),
    ),
  );
  return {
    collection,
    inkCapacity,
    lattices,
    interactions,
    solvents,
    vellum: count(r.vellum),
    bench,
    glyphs,
    proof,
    idioms,
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function parseRune(v: unknown): PlacedRune {
  const r = record(v);
  const rune = oneOf(RUNE_IDS, r.rune);
  const at = parseCoord(r.at);
  return r.dir === undefined ? { at, rune } : { at, rune, dir: oneOf(DIRS, r.dir) };
}

function parseGlyphDef(v: unknown): GlyphDef {
  const r = record(v);
  const cells = list(r.cells).map(parseRune);
  if (cells.length === 0) bad();
  return {
    id: text(r.id),
    name: text(r.name),
    kind: oneOf<'spell' | 'payload'>(['spell', 'payload'], r.kind),
    cells,
    entry: parseCoord(r.entry),
    exits: list(r.exits).map((e) => {
      const x = record(e);
      return { from: parseCoord(x.from), dir: oneOf(DIRS, x.dir) };
    }),
    idiom:
      r.idiom === null
        ? null
        : oneOf(
            IDIOMS.map((x) => x.id),
            r.idiom,
          ),
  };
}

function parseFired(v: unknown): FiredCell {
  const r = record(v);
  const fired: FiredCell = {
    at: parseCoord(r.at),
    rune: r.rune === null ? null : oneOf(RUNE_IDS, r.rune),
  };
  if (r.glyph !== undefined) fired.glyph = text(r.glyph);
  if (r.dir !== undefined) fired.dir = oneOf(DIRS, r.dir);
  return fired;
}

function text(v: unknown): string {
  return typeof v === 'string' && v.length > 0 ? v : bad();
}

function parseAim(v: unknown): Aim {
  const r = record(v);
  switch (r.kind) {
    case 'dir':
      return { kind: 'dir', dir: oneOf(DIRS, r.dir) };
    case 'tile':
      return { kind: 'tile', at: parseCoord(r.at) };
    case 'ally':
      return { kind: 'ally', unit: text(r.unit) };
    default:
      return bad();
  }
}

function parseAction(v: unknown): Action {
  const r = record(v);
  switch (r.type) {
    case 'move':
      return { type: 'move', unit: text(r.unit), to: parseCoord(r.to) };
    case 'undoMove':
      return { type: 'undoMove', unit: text(r.unit) };
    case 'cast':
      return { type: 'cast', unit: text(r.unit), spell: text(r.spell), aim: parseAim(r.aim) };
    case 'shove':
      return { type: 'shove', unit: text(r.unit), dir: oneOf(DIRS, r.dir) };
    case 'endTurn':
      return { type: 'endTurn' };
    default:
      return bad();
  }
}

/** Field types, plus what each status needs to move on (a bad import must not soft-lock the trip). */
function parseTrip(v: unknown): Trip {
  const r = record(v);
  const encounter = count(r.encounter);
  const enc = ENCOUNTERS[encounter] ?? bad();
  const hp = record(r.hp);
  const charges = record(r.charges);
  const trip: Trip = {
    seed: count(r.seed),
    encounter,
    status: oneOf<TripStatus>(['fight', 'looting', 'crossroads', 'cleared'], r.status),
    hp: perMember((m) => count(hp[m])),
    charges: perMember((m) => {
      const c = record(charges[m]);
      return Object.fromEntries(Object.entries(c).map(([k, n]) => [k, count(n)]));
    }),
    loot: list(r.loot).map(parseLoot),
    offers: list(r.offers).map(parseLoot),
    picksLeft: count(r.picksLeft),
    actions: list(r.actions).map(parseAction),
  };
  if (MEMBER_IDS.some((m) => trip.hp[m] < 1)) bad();
  if (trip.status === 'looting' && (trip.offers.length === 0 || trip.picksLeft === 0)) bad();
  if (trip.status === 'crossroads' && (enc.heart || encounter + 1 >= ENCOUNTERS.length)) bad();
  if (trip.status === 'cleared' && !enc.heart) bad();
  if (trip.status !== 'fight' && trip.actions.length > 0) bad();
  return trip;
}

/** Validates and normalizes loaded save data (missing rune counts become 0). Throws "Not a valid save". */
export function parseSaveData(data: unknown): SaveData {
  const r = record(data);
  return {
    profile: parseProfile(r.profile),
    trip: r.trip === null || r.trip === undefined ? null : parseTrip(r.trip),
    seedCounter: count(r.seedCounter),
  };
}

// ── Research and compile (stubs: A4 distil, B2 proof and compile) ─────────

/** Writes a recipe in ink: spends one solvent, adds one rune, marks it known (plan P9). Throws unless exact. */
export function distil(p: Profile, attempt: Attempt): Profile {
  const result = trial(attempt, RECIPES, []);
  const recipe = result.score === 6 ? RECIPES.find((r) => r.id === result.recipe) : undefined;
  if (!recipe) throw new Error('That is not a recipe');
  if (p.solvents[attempt.solvent] < 1) throw new Error('No solvent left');
  if (p.collection[attempt.left] < 1 || p.collection[attempt.right] < 1) {
    throw new Error('A parent rune is missing');
  }
  const tried = recordTrial(p, attempt);
  return {
    ...tried,
    solvents: { ...p.solvents, [attempt.solvent]: p.solvents[attempt.solvent] - 1 },
    collection: { ...p.collection, [recipe.result]: p.collection[recipe.result] + 1 },
    bench: {
      ...tried.bench,
      known: p.bench.known.includes(recipe.id) ? p.bench.known : [...p.bench.known, recipe.id],
    },
  };
}

/** Remembers a free trial so the bench can show it again (the key is added once). */
export function recordTrial(p: Profile, attempt: Attempt): Profile {
  const key = trialKey(attempt);
  if (p.bench.trials.includes(key)) return p;
  return { ...p, bench: { ...p.bench, trials: [...p.bench.trials, key] } };
}

/** Appends cast masks to a member's proof, keeping the newest `TUNING.proofMasksPerMember`. */
export function recordProof(p: Profile, m: MemberId, masks: readonly FiredCell[][]): Profile {
  const proof = [...(p.proof[m] ?? []), ...masks.map((c) => c.map((f) => ({ ...f })))];
  return { ...p, proof: { ...p.proof, [m]: proof.slice(-TUNING.proofMasksPerMember) } };
}

/**
 * Writes proof for a trip's current fight, win or wipe (plan P7): the trip's actions replay
 * deterministically, so the full log's meaningful player casts come from `beginEncounter`.
 * A fight that no longer replays records nothing. Lab battles never reach this.
 */
export function recordTripProof(p: Profile, t: Trip): Profile {
  let events: ActionResult['events'];
  try {
    events = beginEncounter(p, t).events;
  } catch {
    return p;
  }
  return MEMBER_IDS.reduce((acc, m) => recordProof(acc, m, masksFrom(events, m)), p);
}

/** Adds the idioms any member's lattice now contains to the codex; `fresh` are the new ones. */
export function recogniseIdioms(p: Profile): { profile: Profile; fresh: string[] } {
  const lib = glyphLibrary(p);
  const found = new Set(MEMBER_IDS.flatMap((m) => matchIdioms(latticeOf(p, m), lib)));
  const fresh = IDIOMS.filter((i) => found.has(i.id) && !p.idioms.includes(i.id)).map((i) => i.id);
  return fresh.length === 0
    ? { profile: p, fresh }
    : { profile: { ...p, idioms: [...p.idioms, ...fresh] }, fresh };
}

/** Fair Copy: collapses the cluster in member m's lattice into a new Glyph (plan P2, P3, P11). */
export function compileGlyph(p: Profile, m: MemberId, cluster: Cluster, name: string): Profile {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A Glyph needs a name');
  if (cluster.cells.length < TUNING.glyphMinCells || cluster.cells.length > TUNING.glyphMaxCells) {
    throw new Error(`A Glyph holds ${TUNING.glyphMinCells} to ${TUNING.glyphMaxCells} cells`);
  }
  const lib = glyphLibrary(p);
  const l = latticeOf(p, m);
  const masks = MEMBER_IDS.flatMap((id) => p.proof[id] ?? []);
  if (provenCount(l, cluster, masks) < TUNING.provenCasts) throw new Error('Not proven yet');
  const blocker = blockingAuras(l, cluster, lib)[0];
  if (blocker) {
    const aura = l.runes.find((r) => r.at.x === blocker.x && r.at.y === blocker.y);
    const what = aura && !isGlyph(aura) ? RUNES[aura.rune].name : 'Aura';
    throw new Error(`The ${what} at ${label(blocker)} also powers runes outside the selection`);
  }
  let n = p.glyphs.length + 1;
  while (lib[`g${n}`]) n += 1;
  const def = toGlyphDef(l, cluster, trimmed, `g${n}`, lib);
  const free = def.idiom !== null && !p.glyphs.some((g) => g.idiom === def.idiom);
  const cost = free ? 0 : TUNING.compileVellum;
  if (p.vellum < cost) throw new Error('Not enough vellum');
  const glyphs = [...p.glyphs, def];
  const collapsed = fairCopy(l, cluster, def, lib);
  const idioms = def.idiom && !p.idioms.includes(def.idiom) ? [...p.idioms, def.idiom] : p.idioms;
  return setMemberLattice({ ...p, glyphs, vellum: p.vellum - cost, idioms }, m, collapsed);
}

export function renameGlyph(p: Profile, id: GlyphId, name: string): Profile {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A Glyph needs a name');
  if (!p.glyphs.some((g) => g.id === id)) throw new Error(`No Glyph ${id}`);
  return { ...p, glyphs: p.glyphs.map((g) => (g.id === id ? { ...g, name: trimmed } : g)) };
}
