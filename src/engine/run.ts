import {
  CODEX,
  type CodexEntryDef,
  ENCOUNTERS,
  INTERACTION_IDS,
  type InteractionId,
  LOOT_TABLES,
  type LootEntry,
  type LootTableId,
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  type RuneId,
  SOLVENT_IDS,
  type SolventId,
  START_COLLECTION,
  TUNING,
} from '$data';
import { applyAction, createEncounterBattle } from './battle';
import type { Cluster } from './cluster';
import { type Coord, DIRS } from './grid';
import { compileLattice, countRunes, inkCost, inkUsed, isSocket, validateLattice } from './lattice';
import { parseLattice } from './notation';
import { memberById } from './queries';
import type { Attempt } from './research';
import { createRng, deriveSeed, pickWeighted } from './rng';
import type {
  Action,
  ActionResult,
  Aim,
  BattleState,
  CompiledLattice,
  FiredCell,
  GlyphId,
  Lattice,
  LatticeIssue,
  LootItem,
  PartyInit,
  Placed,
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
    research: 0,
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

export function compiledFor(p: Profile, m: MemberId): CompiledLattice {
  return compileLattice(latticeOf(p, m), MEMBERS[m].affinity);
}

export function setMemberLattice(p: Profile, m: MemberId, l: Lattice): Profile {
  return { ...p, lattices: { ...p.lattices, [m]: l.runes.map(copyRune) } };
}

function placedCount(p: Profile, rune: RuneId, except?: { m: MemberId; at: Coord }): number {
  let n = 0;
  for (const m of MEMBER_IDS) {
    for (const r of p.lattices[m]) {
      if (isGlyph(r) || r.rune !== rune) continue; // B2 counts Glyph contents
      if (except && except.m === m && except.at.x === r.at.x && except.at.y === r.at.y) continue;
      n += 1;
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
  if (inkUsed(without) + inkCost(rune) > p.inkCapacity[m]) return 'Not enough ink';
  return null;
}

/** Issues per member (ink, structure, and runes used beyond what is owned). Empty object = ready. */
export function validateLoadout(p: Profile): Partial<Record<MemberId, LatticeIssue[]>> {
  const lattices = perMember((m) => latticeOf(p, m));
  const counts = countRunes(MEMBER_IDS.map((m) => lattices[m]));
  const out: Partial<Record<MemberId, LatticeIssue[]>> = {};
  for (const m of MEMBER_IDS) {
    const issues = validateLattice(lattices[m], p.inkCapacity[m]);
    for (const r of lattices[m].runes) {
      if (isGlyph(r)) continue;
      if (counts[r.rune] > p.collection[r.rune]) {
        issues.push({
          kind: 'owned',
          at: r.at,
          rune: r.rune,
          message: `Uses ${counts[r.rune]} of ${r.rune}, owns ${p.collection[r.rune]}`,
        });
      }
    }
    if (issues.length > 0) out[m] = issues;
  }
  return out;
}

export function codexView(p: Profile): { entry: CodexEntryDef; known: boolean }[] {
  return CODEX.map((entry) => ({
    entry,
    known:
      entry.kind === 'rune'
        ? p.collection[entry.ref as RuneId] > 0
        : p.interactions.includes(entry.ref as InteractionId),
  }));
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
    else if (spec.kind === 'research') offers.push({ kind: 'research', amount: spec.amount });
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
  let research = p.research;
  let vellum = p.vellum;
  for (const item of t.loot) {
    if (item.kind === 'rune') collection[item.rune] += 1;
    else if (item.kind === 'ink') inkCapacity[item.member] += item.amount;
    else if (item.kind === 'solvent') solvents[item.solvent] += 1;
    else if (item.kind === 'vellum') vellum += item.amount;
    else research += item.amount;
  }
  return { ...p, collection, inkCapacity, research, solvents, vellum };
}

// ── Save data ───────────────────────────────────────────

/** The save shape, version 1 (see `src/app/save.ts`). Any later change to Profile/Trip needs a migration. */
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
    case 'research':
      return { kind: 'research', amount: count(r.amount) };
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
  for (const m of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[m].shape).shape;
    const structural = validateLattice({ shape, runes: lattices[m] }, null);
    if (structural.length > 0) bad();
  }
  const interactions: InteractionId[] = [];
  for (const i of list(r.interactions)) {
    const id = oneOf(INTERACTION_IDS, i);
    if (!interactions.includes(id)) interactions.push(id);
  }
  // A4: strict parsing of the v2 fields (and the v1 → v2 migration); defaults until then.
  return {
    collection,
    inkCapacity,
    lattices,
    interactions,
    research: count(r.research),
    ...researchDefaults(),
  };
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
export function distil(_p: Profile, _attempt: Attempt): Profile {
  throw new Error('not implemented (A4)');
}

/** Appends cast masks to a member's proof, keeping the newest `TUNING.proofMasksPerMember`. */
export function recordProof(_p: Profile, _m: MemberId, _masks: readonly FiredCell[][]): Profile {
  throw new Error('not implemented (B2)');
}

/** Fair Copy: collapses the cluster in member m's lattice into a new Glyph (plan P2, P3, P11). */
export function compileGlyph(_p: Profile, _m: MemberId, _cluster: Cluster, _name: string): Profile {
  throw new Error('not implemented (B2)');
}

export function renameGlyph(_p: Profile, _id: GlyphId, _name: string): Profile {
  throw new Error('not implemented (B2)');
}
