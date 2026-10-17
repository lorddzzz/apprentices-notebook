import {
  type Aspect,
  CODEX,
  type CodexEntryDef,
  DISTRICT_IDS,
  DISTRICTS,
  type DistrictId,
  DRAFT_IDS,
  DRAFTS,
  type DraftId,
  encountersOf,
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
import { bankKeys, canReturn, cityDefaults, hearAfterTrip, hearFromBattle, keyOffer } from './city';
import { blockingAuras, type Cluster, sharingSpells, tidyCollapse, toGlyphDef } from './cluster';
import { bankDrafts, nextDraft } from './drafts';
import type { EventLog } from './events';
import { glyphRunes, withOpenCell } from './glyph';
import { type Coord, DIRS, type Dir, label } from './grid';
import { compileLattice, inkCost, inkUsed, isSocket, validateLattice } from './lattice';
import { parseLattice } from './notation';
import { recordGlyphCasts, recordOf, rewardsOf, tierUps } from './profiler';
import { masksFrom, matchIdioms, provenCount } from './proof';
import { memberById } from './queries';
import { type Attempt, trial, trialKey } from './research';
import { createRng, deriveSeed, pickWeighted } from './rng';
import { accumulateStats, emptyStats } from './tripStats';
import type {
  Action,
  ActionResult,
  Aim,
  BattleState,
  CastSample,
  CellKey,
  CompiledLattice,
  DraftCopy,
  FiredCell,
  GlyphArg,
  GlyphDef,
  GlyphId,
  GlyphInside,
  GlyphLibrary,
  GlyphRecord,
  Lattice,
  LatticeIssue,
  LootItem,
  PartyInit,
  Placed,
  PlacedRune,
  Profile,
  SaveData,
  Spell,
  SpellKey,
  SpellTally,
  TierLevel,
  TierUp,
  Trip,
  TripRecap,
  TripStats,
  TripStatus,
} from './types';
import { isGlyph } from './types';

/**
 * Run layer: the profile (collection, ink, lattices, codex), the trip lifecycle and save data.
 * Everything here is pure: functions return new objects and never mutate their inputs.
 *
 *   startTrip → beginEncounter → (battle) → closeBattle → pickLoot × picks → pushOn | returnHome
 *
 * `closeBattle` = `recordTripCasts` (proof and Glyph records, one replay) → `finishEncounter` →
 * the trip's tier-ups (M7, M16).
 */

function perMember<T>(make: (m: MemberId) => T): Record<MemberId, T> {
  return Object.fromEntries(MEMBER_IDS.map((m) => [m, make(m)])) as Record<MemberId, T>;
}

const copyArgs = (args: Readonly<Record<CellKey, GlyphArg>>): Record<CellKey, GlyphArg> =>
  Object.fromEntries(Object.entries(args).map(([k, a]) => [k, { ...a }]));

const copyRune = (r: Placed): Placed =>
  isGlyph(r)
    ? r.args
      ? { at: { ...r.at }, glyph: r.glyph, dir: r.dir, args: copyArgs(r.args) }
      : { at: { ...r.at }, glyph: r.glyph, dir: r.dir }
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
    ...masteryDefaults(),
    city: cityDefaults(),
  };
}

/** The mastery fields of a fresh profile (save v4, M37). */
export function masteryDefaults(): Pick<Profile, 'glyphArchive' | 'glyphRecords' | 'drafts'> {
  return { glyphArchive: [], glyphRecords: {}, drafts: [] };
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

/**
 * A Glyph as its record's rewards make it (M12): the Economy discount, the extra exit only while
 * Reliability silver holds, open cells cut to the allowance. Equal to `g` while nothing is earned.
 */
export function effectiveGlyph(g: GlyphDef, record: GlyphRecord): GlyphDef {
  const r = rewardsOf(record);
  return {
    ...g,
    extraExit: r.extraExit ? g.extraExit : null,
    params: g.params.slice(0, r.params),
    ...(r.discount > 0 ? { discount: r.discount } : {}),
  };
}

/**
 * The profile's Fair Copies by id, current versions, as their rewards make them (the effective
 * view): for compiling and costing lattices that hold Glyphs. Save `p.glyphs`, never this.
 */
export function glyphLibrary(p: Pick<Profile, 'glyphs' | 'glyphRecords'>): GlyphLibrary {
  return Object.fromEntries(
    p.glyphs.map((g) => [g.id, effectiveGlyph(g, recordOf(p, g.id, g.version))]),
  );
}

export function compiledFor(p: Profile, m: MemberId): CompiledLattice {
  return compileLattice(latticeOf(p, m), MEMBERS[m].affinity, glyphLibrary(p));
}

export function setMemberLattice(p: Profile, m: MemberId, l: Lattice): Profile {
  return { ...p, lattices: { ...p.lattices, [m]: l.runes.map(copyRune) } };
}

/** Runes a placed socket uses from the collection: itself, or a Glyph's inner runes and args (P1, M23). */
function runesIn(p: Profile, r: Placed): RuneId[] {
  if (!isGlyph(r)) return [r.rune];
  const def = glyphLibrary(p)[r.glyph];
  return def ? glyphRunes(def, r.args) : [];
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

/**
 * `canPlace` for a Glyph: every inner rune (an argument in place of its open cell's default) must
 * be free, as if placed one by one (plan P1, M23).
 */
export function canPlaceGlyph(
  p: Profile,
  m: MemberId,
  at: Coord,
  glyph: GlyphId,
  args?: Readonly<Record<CellKey, GlyphArg>>,
): string | null {
  const def = glyphLibrary(p)[glyph];
  if (!def) return 'Unknown Glyph';
  const l = latticeOf(p, m);
  if (!isSocket(l.shape, at)) return 'No socket here';
  const needs = new Map<RuneId, number>();
  for (const rune of glyphRunes(def, args)) needs.set(rune, (needs.get(rune) ?? 0) + 1);
  for (const [rune, n] of needs) {
    if (p.collection[rune] - placedCount(p, rune, { m, at }) < n) return 'None left';
  }
  const runes = l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y);
  const socket: Placed = args ? { at, glyph, dir: 'right', args } : { at, glyph, dir: 'right' };
  const placed: Lattice = { shape: l.shape, runes: [...runes, socket] };
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

/** A new trip into an open district with full HP and full charges. Throws if the loadout has issues. */
export function startTrip(p: Profile, seed: number, district: DistrictId = 'seam'): Trip {
  const issues = validateLoadout(p);
  const first = Object.values(issues)[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  if (!p.city.open.includes(district)) throw new Error(`${DISTRICTS[district].name} is not open`);
  return {
    district,
    seed,
    encounter: 0,
    status: 'fight',
    hp: perMember((m) => MEMBERS[m].hp),
    charges: perMember((m) => chargesOf(p, m)),
    loot: [],
    offers: [],
    picksLeft: 0,
    actions: [],
    stats: emptyStats(),
  };
}

/** Which of the encounter's layouts this trip plays (plan S10): derived from the seed, never stored. */
export function variantFor(t: Trip, encounter: number): number {
  const count = encountersOf(t.district)[encounter]?.variants.length ?? 1;
  // The Seam keeps its original salt so old trips replay the same rooms (K-2).
  const salt =
    t.district === 'seam'
      ? 2000 + encounter
      : 3000 + 100 * DISTRICT_IDS.indexOf(t.district) + encounter;
  return createRng(deriveSeed(t.seed, salt)).int(0, count - 1);
}

/** The name of the room this trip fights in at `encounter` (its layout's place name). */
export function placeOf(t: Trip, encounter = t.encounter): string {
  const enc = encountersOf(t.district)[encounter];
  return enc?.variants[variantFor(t, encounter)]?.name ?? enc?.title ?? DISTRICTS[t.district].name;
}

/**
 * The current encounter's battle: the party enters with the trip's HP and charges, then the
 * trip's recorded actions are replayed (a reload resumes the fight). Throws if one is illegal.
 */
export function beginEncounter(p: Profile, t: Trip): ActionResult {
  need(t, 'fight');
  const enc = encountersOf(t.district)[t.encounter];
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
  const first = createEncounterBattle(
    enc,
    party,
    deriveSeed(t.seed, t.encounter),
    variantFor(t, t.encounter),
  );
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

/**
 * Loot offers for a won encounter: distinct table entries, weighted, same result for the same seed.
 * A table's `draft` entry offers `draft` (from `nextDraft`); with none due it is left out of the pool.
 * A `key` (from `keyOffer`, K-23) joins the end of the pool with its weight.
 */
export function rollOffers(
  tripSeed: number,
  encounter: number,
  table: LootTableId,
  members: readonly MemberId[] = MEMBER_IDS,
  draft: DraftId | null = null,
  key: { district: DistrictId; weight: number } | null = null,
): LootItem[] {
  const rng = createRng(deriveSeed(tripSeed, 1000 + encounter));
  const pool: LootEntry[] = LOOT_TABLES[table].entries.filter(
    (e) => e.spec.kind !== 'draft' || draft !== null,
  );
  if (key) pool.push({ spec: { kind: 'key', district: key.district }, weight: key.weight });
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
    else if (spec.kind === 'doorway') offers.push({ kind: 'doorway' });
    else if (spec.kind === 'solvent') offers.push({ kind: 'solvent', solvent: spec.solvent });
    else if (spec.kind === 'vellum') offers.push({ kind: 'vellum', amount: spec.amount });
    else if (spec.kind === 'draft') {
      if (draft !== null) offers.push({ kind: 'draft', draft });
    } else if (spec.kind === 'key') offers.push({ kind: 'key', district: spec.district });
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
 * Wiped: the trip ends and its pending loot is lost. `log` is the whole fight's event log; it
 * feeds the trip's stats, returned either way so a wipe can still show the trip page.
 */
export function finishEncounter(
  p: Profile,
  t: Trip,
  b: BattleState,
  log: EventLog = [],
  foughtWith: Profile = p,
): { profile: Profile; trip: Trip | null; outcome: 'won' | 'wiped'; stats: TripStats } {
  need(t, 'fight');
  if (b.phase === 'player') throw new Error('The battle is not over');
  // The spells as fought: a tier earned in this very fight (e.g. an extra exit) must not add cells.
  const fought = perMember((m) => compiledFor(foughtWith, m).spells);
  const stats = accumulateStats(t.stats, log, p, fought);
  const interactions = [...p.interactions];
  for (const d of b.discovered) if (!interactions.includes(d)) interactions.push(d);
  const profile: Profile = { ...p, interactions };
  if (b.phase === 'lost') return { profile, trip: null, outcome: 'wiped', stats };

  const enc = encountersOf(t.district)[t.encounter];
  if (!enc) throw new Error(`No encounter ${t.encounter}`);
  const trip: Trip = {
    ...t,
    status: 'looting',
    hp: perMember((m) => Math.max(TUNING.reviveHp, memberById(b, m).hp)),
    charges: perMember((m) => ({ ...memberById(b, m).charges })),
    loot: [...t.loot],
    offers: rollOffers(
      t.seed,
      t.encounter,
      enc.loot,
      MEMBER_IDS,
      nextDraft(p, t, enc.loot),
      keyOffer(p, t, enc.loot),
    ),
    picksLeft: enc.picks,
    actions: [],
    stats,
  };
  return { profile, trip, outcome: 'won', stats };
}

/**
 * Closes a finished trip battle (M7, M16): one replay writes proof and Glyph records
 * (`recordTripCasts`, win or wipe), then `finishEncounter`; the records' tier-ups go into the trip's
 * stats. Lab, Bench and desk battles never come here.
 */
export function closeBattle(
  p: Profile,
  t: Trip,
  b: BattleState,
  log: EventLog = [],
): { profile: Profile; trip: Trip | null; outcome: 'won' | 'wiped'; stats: TripStats } {
  const recorded = recordTripCasts(p, t);
  const r = finishEncounter(recorded, t, b, log, p);
  const ups = tierUps(p, recorded);
  // Hearing is kept on a wipe (K-20): owner conditions on this log, then rumours if the trip ended.
  const owner = hearFromBattle(r.profile, t, log);
  const after =
    r.outcome === 'wiped'
      ? hearAfterTrip(owner.profile, t, 'wiped')
      : { profile: owner.profile, heard: [] };
  const heard = [...owner.heard, ...after.heard];
  if (ups.length === 0 && heard.length === 0 && after.profile === r.profile) return r;
  const stats: TripStats = {
    ...r.stats,
    elegance: [...r.stats.elegance, ...ups],
    heard: [...r.stats.heard, ...heard],
  };
  return { ...r, profile: after.profile, stats, trip: r.trip ? { ...r.trip, stats } : null };
}

/** Takes offer `index` into the pending loot. After the last pick the trip moves on. */
export function pickLoot(t: Trip, index: number): Trip {
  need(t, 'looting');
  const item = t.offers[index];
  if (!item) throw new Error(`No offer ${index}`);
  const offers = t.offers.filter((_, i) => i !== index);
  const picksLeft = t.picksLeft - 1;
  const done = picksLeft <= 0 || offers.length === 0;
  const heart = encountersOf(t.district)[t.encounter]?.heart ?? false;
  // A doorway costs the pick but is never banked: it opens field rewiring (plan S11).
  const doorway = item.kind === 'doorway';
  return {
    ...t,
    loot: doorway ? t.loot : [...t.loot, item],
    offers: done ? [] : offers,
    picksLeft: done ? 0 : picksLeft,
    status: doorway ? 'doorway' : done ? (heart ? 'cleared' : 'crossroads') : 'looting',
  };
}

/** Deeper into the district: the next encounter becomes current. */
export function pushOn(t: Trip): Trip {
  need(t, 'crossroads');
  if (t.encounter + 1 >= encountersOf(t.district).length)
    throw new Error('There is nothing deeper');
  return { ...t, encounter: t.encounter + 1, status: 'fight' };
}

/**
 * Banks the trip's loot into the profile (drafts go to `Profile.drafts`, M30; keys open their
 * district, K-23), then the trip counts and rumours are heard (K-20). Throws away from a landing (K-4).
 */
export function returnHome(p: Profile, t: Trip): Profile {
  need(t, 'crossroads', 'cleared');
  if (!canReturn(t)) throw new Error('There is no landing here');
  const collection = { ...p.collection };
  const inkCapacity = { ...p.inkCapacity };
  const solvents = { ...p.solvents };
  let vellum = p.vellum;
  for (const item of t.loot) {
    if (item.kind === 'rune') collection[item.rune] += 1;
    else if (item.kind === 'ink') inkCapacity[item.member] += item.amount;
    else if (item.kind === 'solvent') solvents[item.solvent] += 1;
    else if (item.kind === 'vellum') vellum += item.amount;
  }
  const banked = bankKeys(
    bankDrafts({ ...p, collection, inkCapacity, solvents, vellum }, t.loot),
    t.loot,
  );
  return hearAfterTrip(banked, t, 'returned').profile;
}

/** What a Source is, for carrying its charges across a rewire: a rune, or a Spell Glyph. */
const sourceType = (sp: Spell): string => (sp.glyph ? `glyph:${sp.glyph}` : `rune:${sp.source}`);

/**
 * Charges after rewiring (plan S12). A Source that stays on its cell keeps its count. The Sources
 * that moved or are new take the remaining counts of Sources (across both members) that no longer
 * have a cell: first of their own type (rune or Glyph), then of any Source with the same inner
 * source rune (a Glyph swapped for its loose Bolt), highest first, never above their own maximum.
 * With none left to take (a second owned copy) they start full. Nothing is ever refilled.
 */
function carryCharges(
  before: Profile,
  after: Profile,
  t: Trip,
): Record<MemberId, Record<SpellKey, number>> {
  const next = perMember((): Record<SpellKey, number> => ({}));
  const olds = MEMBER_IDS.flatMap((m) =>
    compiledFor(before, m).spells.map((sp) => ({
      m,
      sp,
      type: sourceType(sp),
      left: t.charges[m][sp.key] ?? sp.charges,
    })),
  );
  const fresh = MEMBER_IDS.flatMap((m) =>
    compiledFor(after, m).spells.map((sp) => ({ m, sp, type: sourceType(sp) })),
  );
  const stays = (o: { m: MemberId; sp: Spell; type: string }) =>
    fresh.some((f) => f.m === o.m && f.sp.key === o.sp.key && f.type === o.type);
  // Counts of Sources whose cell is gone, highest first.
  const spare = olds.filter((o) => !stays(o)).sort((a, b) => b.left - a.left);
  const kept = new Map(olds.map((o) => [`${o.m}|${o.sp.key}|${o.type}`, o.left]));
  // Biggest maximum first, so a Source with a Thrift gets the larger spare count.
  const moved = fresh
    .filter((f) => !kept.has(`${f.m}|${f.sp.key}|${f.type}`))
    .sort((a, b) => b.sp.charges - a.sp.charges);
  for (const f of fresh) {
    const left = kept.get(`${f.m}|${f.sp.key}|${f.type}`);
    if (left !== undefined) next[f.m][f.sp.key] = Math.min(left, f.sp.charges);
  }
  const take = (match: (o: (typeof spare)[number], f: (typeof moved)[number]) => boolean) => {
    for (const f of moved) {
      if (next[f.m][f.sp.key] !== undefined) continue;
      const i = spare.findIndex((o) => match(o, f));
      const [o] = i < 0 ? [] : spare.splice(i, 1);
      if (o) next[f.m][f.sp.key] = Math.min(o.left, f.sp.charges);
    }
  };
  take((o, f) => o.type === f.type);
  take((o, f) => o.sp.source === f.sp.source);
  for (const f of moved) next[f.m][f.sp.key] ??= f.sp.charges;
  return next;
}

/**
 * Leaves a quiet doorway (plan S11/S12): the profile takes the rewired lattices, and each Source
 * keeps the charges its rune (or Glyph) had before, so rewiring never refills a spell. Throws if
 * the new loadout isn't ready. The trip goes back to looting if picks remain, else the Crossroads.
 */
export function applyDoorway(
  p: Profile,
  t: Trip,
  lattices: Record<MemberId, Placed[]>,
): { profile: Profile; trip: Trip } {
  need(t, 'doorway');
  const profile: Profile = { ...p, lattices: perMember((m) => lattices[m].map(copyRune)) };
  const first = Object.values(validateLoadout(profile))[0]?.[0];
  if (first) throw new Error(`Loadout is not ready: ${first.message}`);
  const more = t.picksLeft > 0 && t.offers.length > 0;
  const trip: Trip = {
    ...t,
    charges: carryCharges(p, profile, t),
    offers: more ? t.offers : [],
    picksLeft: more ? t.picksLeft : 0,
    status: more ? 'looting' : 'crossroads',
  };
  return { profile, trip };
}

// ── Save data ───────────────────────────────────────────

/** The save shape, version 4 (see `src/app/save.ts`). Any later change to Profile/Trip needs a migration. */
export function newSave(seed: number): SaveData {
  return { profile: newProfile(), trip: null, seedCounter: seed, lastTrip: null };
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

const CELL_KEY = /^-?\d+,-?\d+$/;
const VERSION_KEY = /^.+@[1-9]\d*$/;
const TIERS: readonly TierLevel[] = [0, 1, 2, 3];

function cellKey(v: unknown): CellKey {
  return typeof v === 'string' && CELL_KEY.test(v) ? v : bad();
}

function bool(v: unknown): boolean {
  return typeof v === 'boolean' ? v : bad();
}

function tier(v: unknown): TierLevel {
  return TIERS.find((t) => t === v) ?? bad();
}

function parseArgs(v: unknown): Record<CellKey, GlyphArg> {
  const r = record(v);
  return Object.fromEntries(
    Object.entries(r).map(([k, a]) => {
      const x = record(a);
      const rune = oneOf(RUNE_IDS, x.rune);
      return [cellKey(k), x.dir === undefined ? { rune } : { rune, dir: oneOf(DIRS, x.dir) }];
    }),
  );
}

function parsePlaced(v: unknown): Placed {
  const r = record(v);
  if (r.glyph !== undefined) {
    const placed = { at: parseCoord(r.at), glyph: text(r.glyph), dir: oneOf(DIRS, r.dir) };
    return r.args === undefined ? placed : { ...placed, args: parseArgs(r.args) };
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
    case 'doorway':
      return { kind: 'doorway' };
    case 'draft':
      return { kind: 'draft', draft: oneOf(DRAFT_IDS, r.draft) };
    case 'key':
      return { kind: 'key', district: oneOf(DISTRICT_IDS, r.district) };
    default:
      return bad();
  }
}

function parseSample(v: unknown): CastSample {
  const r = record(v);
  return { harm: count(r.harm), cost: count(r.cost), meaningful: bool(r.meaningful) };
}

function parseRecord(v: unknown): GlyphRecord {
  const r = record(v);
  const recent = list(r.recent).map(parseSample);
  if (recent.length > TUNING.tierWindow) bad();
  const best = record(r.best);
  const fired = record(r.fired);
  return {
    casts: count(r.casts),
    harm: count(r.harm),
    meaningful: count(r.meaningful),
    recent,
    best: { economy: tier(best.economy), reliability: tier(best.reliability) },
    fired: Object.fromEntries(Object.entries(fired).map(([k, n]) => [cellKey(k), count(n)])),
  };
}

function parseInside(v: unknown): GlyphInside {
  const r = record(v);
  return {
    kind: oneOf<'spell' | 'payload'>(['spell', 'payload'], r.kind),
    cells: list(r.cells).map(parseRune),
    entry: parseCoord(r.entry),
  };
}

function parseDraftCopy(v: unknown): DraftCopy {
  const r = record(v);
  const id = oneOf(DRAFT_IDS, r.id);
  const page = count(r.page);
  const pages = DRAFTS.find((d) => d.id === id)?.pages.length ?? 1;
  if (page >= pages) bad();
  return { id, inside: parseInside(r.inside), page, repaired: bool(r.repaired) };
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
  // Older versions: each of a current Glyph, never its current version, each version once.
  const glyphArchive = list(r.glyphArchive).map(parseGlyphDef);
  const versions = new Set(glyphs.map((g) => `${g.id}@${g.version}`));
  for (const g of glyphArchive) {
    const k = `${g.id}@${g.version}`;
    if (!glyphs.some((c) => c.id === g.id) || versions.has(k)) bad();
    versions.add(k);
  }
  const recordsRaw = record(r.glyphRecords);
  const glyphRecords = Object.fromEntries(
    Object.entries(recordsRaw).map(([k, rec]) => [
      VERSION_KEY.test(k) ? k : bad(),
      parseRecord(rec),
    ]),
  );
  const library = glyphLibrary({ glyphs, glyphRecords });
  for (const m of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[m].shape).shape;
    // Also rejects a lattice Glyph that is not in the library. A stale argument (after a revision)
    // is the page's issue to fix, not a broken save.
    const structural = validateLattice({ shape, runes: lattices[m] }, null, library).filter(
      (i) => i.kind !== 'arg',
    );
    if (structural.length > 0) bad();
  }
  const drafts = list(r.drafts).map(parseDraftCopy);
  if (new Set(drafts.map((d) => d.id)).size !== drafts.length) bad();
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
    glyphArchive,
    glyphRecords,
    drafts,
    city: parseCity(r.city),
  };
}

/** heard ⊇ open ⊇ hearts, solved ⊆ heard, fresh ⊆ heard, the Seam always open (K-19). */
function parseCity(v: unknown): Profile['city'] {
  const r = record(v);
  const ids = (x: unknown) => unique(list(x).map((id) => oneOf(DISTRICT_IDS, id)));
  const city = {
    heard: ids(r.heard),
    open: ids(r.open),
    hearts: ids(r.hearts),
    solved: ids(r.solved),
    trips: count(r.trips),
    fresh: ids(r.fresh),
  };
  const heard = new Set(city.heard);
  if (!city.open.includes('seam')) bad();
  if (city.open.some((d) => !heard.has(d)) || city.hearts.some((d) => !city.open.includes(d)))
    bad();
  if (city.solved.some((d) => !heard.has(d)) || city.fresh.some((d) => !heard.has(d))) bad();
  return city;
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

/** A saved Glyph (never with a `discount`: that is the effective view's). */
function parseGlyphDef(v: unknown): GlyphDef {
  const r = record(v);
  const cells = list(r.cells).map(parseRune);
  if (cells.length === 0) bad();
  const params = unique(list(r.params).map(cellKey));
  for (const k of params) {
    const cell = cells.find((c) => `${c.at.x},${c.at.y}` === k) ?? bad();
    const family = RUNES[cell.rune].family;
    if (family === 'source' || family === 'aura') bad();
  }
  const def: GlyphDef = {
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
    version: count(r.version) >= 1 ? count(r.version) : bad(),
    params,
    extraExit: r.extraExit === null ? null : oneOf<Dir>(['up', 'right', 'down'], r.extraExit),
  };
  if (r.draft !== undefined) def.draft = oneOf(DRAFT_IDS, r.draft);
  return def;
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
  const district = oneOf(DISTRICT_IDS, r.district);
  const rooms = encountersOf(district);
  const enc = rooms[encounter] ?? bad();
  const hp = record(r.hp);
  const charges = record(r.charges);
  const trip: Trip = {
    district,
    seed: count(r.seed),
    encounter,
    status: oneOf<TripStatus>(['fight', 'looting', 'crossroads', 'cleared', 'doorway'], r.status),
    hp: perMember((m) => count(hp[m])),
    charges: perMember((m) => {
      const c = record(charges[m]);
      return Object.fromEntries(Object.entries(c).map(([k, n]) => [k, count(n)]));
    }),
    loot: list(r.loot).map(parseLoot),
    offers: list(r.offers).map(parseLoot),
    picksLeft: count(r.picksLeft),
    actions: list(r.actions).map(parseAction),
    stats: parseStats(r.stats),
  };
  if (MEMBER_IDS.some((m) => trip.hp[m] < 1)) bad();
  if (trip.status === 'looting' && (trip.offers.length === 0 || trip.picksLeft === 0)) bad();
  if (trip.status === 'crossroads' && (enc.heart || encounter + 1 >= rooms.length)) bad();
  if ([...trip.loot, ...trip.offers].filter((i) => i.kind === 'key').length > 1) bad();
  if (trip.status === 'cleared' && !enc.heart) bad();
  if (trip.status === 'doorway' && enc.heart) bad();
  // A doorway is never banked and never offered at the heart (plan S11).
  if (trip.loot.some((i) => i.kind === 'doorway')) bad();
  // At most one draft a trip (M30).
  if ([...trip.loot, ...trip.offers].filter((i) => i.kind === 'draft').length > 1) bad();
  if (enc.heart && trip.offers.some((i) => i.kind === 'doorway')) bad();
  if (trip.offers.filter((i) => i.kind === 'doorway').length > 1) bad();
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
    lastTrip: r.lastTrip === null || r.lastTrip === undefined ? null : parseRecap(r.lastTrip),
  };
}

function parseTally(v: unknown): SpellTally {
  const x = record(v);
  return {
    member: oneOf(MEMBER_IDS, x.member),
    spell: text(x.spell),
    name: text(x.name),
    casts: count(x.casts),
    damage: count(x.damage),
    kills: count(x.kills),
    cells: unique(list(x.cells).map(cellKey)),
    fired: unique(list(x.fired).map(cellKey)),
  };
}

function parseTierUp(v: unknown): TierUp {
  const x = record(v);
  const version = count(x.version);
  if (version < 1) bad();
  return {
    glyph: text(x.glyph),
    name: text(x.name),
    version,
    metric: oneOf<TierUp['metric']>(['economy', 'reliability'], x.metric),
    tier: tier(x.tier),
  };
}

function parseStats(v: unknown): TripStats {
  const r = record(v);
  return {
    fights: count(r.fights),
    spells: list(r.spells).map(parseTally),
    biggestChain:
      r.biggestChain === null || r.biggestChain === undefined
        ? null
        : (() => {
            const c = record(r.biggestChain);
            return {
              member: oneOf(MEMBER_IDS, c.member),
              spell: text(c.spell),
              name: text(c.name),
              reactions: count(c.reactions),
            };
          })(),
    discoveries: list(r.discoveries).map(text),
    proofCasts: count(r.proofCasts),
    elegance: list(r.elegance).map(parseTierUp),
    heard: unique(list(r.heard).map((id) => oneOf(DISTRICT_IDS, id))),
  };
}

function parseRecap(v: unknown): TripRecap {
  const r = record(v);
  const district = oneOf(DISTRICT_IDS, r.district);
  return {
    district,
    outcome: oneOf<TripRecap['outcome']>(['returned', 'wiped'], r.outcome),
    encounter: count(r.encounter),
    // `place` came after the first v3 saves: fall back to the depth's title.
    place:
      typeof r.place === 'string'
        ? r.place
        : (encountersOf(district)[count(r.encounter)]?.title ?? ''),
    stats: parseStats(r.stats),
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
 * Writes proof and Glyph records for a trip's current fight, win or wipe (plan P7, M7): the trip's
 * actions replay deterministically, so the full log comes from `beginEncounter`, once. Records
 * read the profile as at battle start and are written after. A fight that no longer replays
 * records nothing. Lab, Bench and desk battles never reach this.
 */
export function recordTripCasts(p: Profile, t: Trip): Profile {
  let events: ActionResult['events'];
  try {
    events = beginEncounter(p, t).events;
  } catch {
    return p;
  }
  const proven = MEMBER_IDS.reduce((acc, m) => recordProof(acc, m, masksFrom(events, m)), p);
  return { ...proven, glyphRecords: recordGlyphCasts(p, events).glyphRecords };
}

/** The old name of `recordTripCasts`. */
export const recordTripProof = recordTripCasts;

/** The first compile of an idiom is free; a repaired draft's Glyph doesn't use it up (P11, M33). */
export function freeIdiomCompile(p: Pick<Profile, 'glyphs'>, idiom: string | null): boolean {
  return idiom !== null && !p.glyphs.some((g) => g.idiom === idiom && g.draft === undefined);
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

/**
 * Fair Copy: collapses the cluster in member m's lattice into a new Glyph v1 (plan P2, P3, P11).
 * `open` is the one local cell left open for an argument, if any (M22, via `withOpenCell`).
 */
export function compileGlyph(
  p: Profile,
  m: MemberId,
  cluster: Cluster,
  name: string,
  open: Coord | null = null,
): Profile {
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
  const sharing = sharingSpells(l, cluster, lib)[0];
  if (sharing) {
    const other = l.runes.find((r) => r.at.x === sharing.source.x && r.at.y === sharing.source.y);
    const what = other && !isGlyph(other) ? RUNES[other.rune].name : 'Glyph';
    throw new Error(`The ${what} at ${label(sharing.source)} also flows through this selection`);
  }
  let n = p.glyphs.length + 1;
  while (lib[`g${n}`]) n += 1;
  const def = withOpenCell(toGlyphDef(l, cluster, trimmed, `g${n}`, lib), open);
  const free = freeIdiomCompile(p, def.idiom);
  const cost = free ? 0 : TUNING.compileVellum;
  if (p.vellum < cost) throw new Error('Not enough vellum');
  const glyphs = [...p.glyphs, def];
  const collapsed = tidyCollapse(l, cluster, def, lib).lattice;
  const idioms = def.idiom && !p.idioms.includes(def.idiom) ? [...p.idioms, def.idiom] : p.idioms;
  return setMemberLattice({ ...p, glyphs, vellum: p.vellum - cost, idioms }, m, collapsed);
}

export function renameGlyph(p: Profile, id: GlyphId, name: string): Profile {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A Glyph needs a name');
  if (!p.glyphs.some((g) => g.id === id)) throw new Error(`No Glyph ${id}`);
  return { ...p, glyphs: p.glyphs.map((g) => (g.id === id ? { ...g, name: trimmed } : g)) };
}
