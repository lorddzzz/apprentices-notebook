import {
  APPRENTICE_IDS,
  type ApprenticeId,
  BIND_EVENT_DISTRICT,
  type BindEvent,
  CODEX,
  type CodexEntryDef,
  type CompoundId,
  DISTRICT_IDS,
  ENEMY_IDS,
  encountersOf,
  type InventionDef,
  isInvention,
  LINES,
  type LineDef,
  type LineId,
  MEMBER_IDS,
  MEMBERS,
  METHOD_IDS,
  type Meets,
  type MemberId,
  RUNE_IDS,
  type RuneId,
  type RuneRef,
  SOLVENT_IDS,
  type SolventId,
  START_KNOWN,
  TUNING,
} from '$data';
import { cityDefaults } from './city';
import { blockingAuras, type Cluster, sharingSpells, tidyCollapse, toGlyphDef } from './cluster';
import { baseGlyphCost, canBeOpen, glyphRunes, withOpenCell } from './glyph';
import {
  type Coord,
  DIRS,
  type Dir,
  isLatticeCoord,
  key,
  latticeLabel as label,
  parseLatticeKey,
} from './grid';
import { emptyHousehold, FOUNDERS, joinHousehold, setSlot } from './household';
import {
  assertImportStructure,
  type ImportBudget,
  importBudget,
  ResourceLimitError,
} from './importPolicy';
import { inventionIssue, type KnownSet } from './inventions';
import {
  addInk,
  assertCompilationWork,
  compileLattice,
  hasArrow,
  InkCostOverflowError,
  inkOf,
  inkPricer,
  inkUsed,
  isSocket,
  libraryOf,
  nameOf,
  roleOf,
  validateLattice,
} from './lattice';
import { parseBoard } from './notation';
import { growingLattice } from './page';
import { recordOf, rewardsOf } from './profiler';
import { provenCount } from './proof';
import { deriveSeed } from './rng';
import { variantFor } from './trip/place';
import { copyRune, perMember, withAll } from './trip/shared';
import type {
  Action,
  Aim,
  CastSample,
  CellKey,
  CompiledLattice,
  FiredCell,
  GlyphArg,
  GlyphDef,
  GlyphId,
  GlyphLibrary,
  GlyphRecord,
  Household,
  InventionLibrary,
  Lattice,
  LatticeIssue,
  LootItem,
  Placed,
  PlacedRune,
  Profile,
  SaveData,
  SlotIndex,
  SpellTally,
  TierLevel,
  TierUp,
  Trip,
  TripRecap,
  TripSlots,
  TripStats,
  TripStatus,
} from './types';
import { isGlyph } from './types';

/**
 * Run layer: the profile (what the household knows, ink, lattices, codex) and save data; the trip
 * lifecycle lives in `./trip/`. Everything here is pure: functions return new objects and never mutate their inputs.
 * R1 rebuilds this on Profile v7 (plan §2.8); W0b only moved it onto the new model.
 *
 *   startTrip → beginEncounter → (battle) → closeBattle → pickLoot × picks → pushOn | returnHome
 *
 * `closeBattle` = `recordTripCasts` (proof and Glyph records, one replay) → `finishEncounter` →
 * the trip's tier-ups (M7, M16).
 */

// ── Profile ─────────────────────────────────────────────

/** A fresh notebook; page placements retain their original coordinate identities. */
export function newProfile(): Profile {
  let p: Profile = {
    known: [...START_KNOWN],
    methods: [],
    inventions: [],
    solvents: Object.fromEntries(SOLVENT_IDS.map((id) => [id, 0])) as Record<SolventId, number>,
    household: emptyHousehold(),
    ink: TUNING.startInk,
    lattices: {},
    witnessed: [],
    named: [],
    met: [],
    foesMet: [],
    footnotes: {},
    vellum: 0,
    glyphs: [],
    ...masteryDefaults(),
    proof: {},
    city: cityDefaults(),
  };
  // The pair joins, then takes slots 1 and 2 (HC P8).
  FOUNDERS.forEach((id, i) => {
    p = setSlot(joinHousehold(p, id), i as SlotIndex, id);
  });
  return p;
}

/** The mastery fields of a fresh profile (M37). */
export function masteryDefaults(): Pick<Profile, 'glyphArchive' | 'glyphRecords'> {
  return { glyphArchive: [], glyphRecords: {} };
}

/** An apprentice's saved page. Throws for someone outside the household (HC P1). */
export function pageOf(p: Pick<Profile, 'lattices'>, m: ApprenticeId): Placed[] {
  const page = p.lattices[m];
  if (!page) throw new Error(`${m} is not in the household`);
  return page;
}

/** An apprentice's proof masks. Throws for someone outside the household (HC P1). */
export function proofOf(p: Pick<Profile, 'proof'>, m: ApprenticeId): FiredCell[][] {
  const proof = p.proof[m];
  if (!proof) throw new Error(`${m} is not in the household`);
  return proof;
}

export function latticeOf(p: Profile, m: MemberId): Lattice {
  return growingLattice(pageOf(p, m).map(copyRune));
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

/** The household's inventions by id. */
export const inventionLibrary = (p: Pick<Profile, 'inventions'>): InventionLibrary =>
  libraryOf(p.inventions);

export function compiledFor(p: Profile, m: MemberId): CompiledLattice {
  return compileLattice(latticeOf(p, m), glyphLibrary(p), inventionLibrary(p), MEMBERS[m].lean);
}

export function setMemberLattice(p: Profile, m: MemberId, l: Lattice): Profile {
  pageOf(p, m);
  return { ...p, lattices: { ...p.lattices, [m]: l.runes.map(copyRune) } };
}

/** Runes a placed socket uses: itself, or a Glyph's inner runes and args (M23). */
function runesIn(p: Profile, r: Placed): RuneRef[] {
  if (!isGlyph(r)) return [r.rune];
  const def = glyphLibrary(p)[r.glyph];
  return def ? glyphRunes(def, r.args) : [];
}

/** Whether the household knows a rune or has invented it (P34: knowledge, not copies). */
export function knows(p: Profile, rune: RuneRef): boolean {
  return isInvention(rune) ? p.inventions.some((d) => d.id === rune) : p.known.includes(rune);
}

/**
 * What the Bench may use (design §6.1): known runes, learned methods, the household's inventions,
 * and the Bind events whose district is open (hit and enters come with Bind itself).
 */
export function knownSetOf(p: Profile): KnownSet {
  const events = (Object.keys(BIND_EVENT_DISTRICT) as BindEvent[]).filter((e) => {
    const d = BIND_EVENT_DISTRICT[e];
    return p.methods.includes('bind') && (d === 'inkQuarter' || p.city.open.includes(d));
  });
  return { runes: p.known, methods: p.methods, events, inventions: inventionLibrary(p) };
}

/**
 * Writes an invention into the household (design §6.1): refused with the reason when the
 * combination doesn't fit or the name or id is taken; a flavoured one spends one of its solvent,
 * a plain one is free. `trialLines` are the lines witnessed on the test scene (D4), banked now.
 */
export function writeInvention(
  p: Profile,
  def: InventionDef,
  trialLines: readonly LineId[] = [],
): Profile {
  const issue = inventionIssue(def, knownSetOf(p));
  if (issue) throw new Error(issue);
  if (!def.name.trim()) throw new Error('Give it a name');
  if (!INVENTION_ID.test(def.id)) throw new Error('That name cannot be written down');
  const name = def.name.trim().toLowerCase();
  if (p.inventions.some((d) => d.id === def.id || d.name.trim().toLowerCase() === name))
    throw new Error(`${def.name} is already written`);
  const solvents = { ...p.solvents };
  if (def.solvent) {
    if (solvents[def.solvent] < 1) throw new Error('You have none of that solvent left');
    solvents[def.solvent] -= 1;
  }
  return {
    ...p,
    inventions: [...p.inventions, { ...def, parts: [...def.parts] }],
    solvents,
    witnessed: withAll(p.witnessed, trialLines),
  };
}

/**
 * Null when `rune` can go on `at` of member `m`, else the reason. A socket that is already
 * occupied counts as free (placing replaces its rune).
 */
export function canPlace(p: Profile, m: MemberId, at: Coord, rune: RuneRef): string | null {
  const l = latticeOf(p, m);
  if (!isSocket(l.shape, at)) return 'No socket here';
  if (!knows(p, rune)) return 'Not known';
  const without: Lattice = {
    shape: l.shape,
    runes: l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y),
  };
  const lib = inventionLibrary(p);
  const lean = MEMBERS[m].lean;
  if (inkUsed(without, glyphLibrary(p), lib, lean) + inkOf(rune, lib, lean) > p.ink) {
    return 'Not enough ink';
  }
  return null;
}

/** `canPlace` for a Glyph: every inner rune (an argument in place of its default) must be known (M23). */
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
  if (glyphRunes(def, args).some((r) => !knows(p, r))) return 'Not known';
  const runes = l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y);
  const socket: Placed = args ? { at, glyph, dir: 'right', args } : { at, glyph, dir: 'right' };
  const placed: Lattice = { shape: l.shape, runes: [...runes, socket] };
  if (inkUsed(placed, glyphLibrary(p), inventionLibrary(p), MEMBERS[m].lean) > p.ink) {
    return 'Not enough ink';
  }
  return null;
}

/** Issues per member (ink, structure, and runes the household doesn't know). Empty object = ready. */
export function validateLoadout(p: Profile): Partial<Record<MemberId, LatticeIssue[]>> {
  const out: Partial<Record<MemberId, LatticeIssue[]>> = {};
  const lib = inventionLibrary(p);
  for (const m of p.household.members) {
    const l = latticeOf(p, m);
    const issues = validateLattice(l, p.ink, glyphLibrary(p), lib, MEMBERS[m].lean);
    for (const r of l.runes) {
      for (const rune of new Set(runesIn(p, r))) {
        if (!knows(p, rune) && !issues.some((i) => i.kind === 'owned' && i.rune === rune)) {
          issues.push({
            kind: 'owned',
            at: r.at,
            rune,
            message: `${nameOf(rune, lib)} is not known`,
          });
        }
      }
    }
    if (issues.length > 0) out[m] = issues;
  }
  return out;
}

/** One codex page. A rune page also carries its fine print: the lines witnessed, and how many exist. */
export interface CodexRow {
  entry: CodexEntryDef;
  known: boolean;
  fine?: { seen: LineDef[]; total: number };
}

export function codexView(p: Profile): CodexRow[] {
  return CODEX.map((entry) => ({ entry, known: isKnown(p, entry), ...fineOf(p, entry) }));
}

function isKnown(p: Profile, entry: CodexEntryDef): boolean {
  if (entry.kind === 'rune') return p.known.includes(entry.ref as RuneId);
  if (entry.kind === 'method') return p.methods.some((m) => m === entry.ref);
  if (entry.kind === 'idiom') return p.named.includes(`idiom:${entry.ref}`);
  // "Known" is having some in hand; the profile does not track solvents ever found.
  if (entry.kind === 'solvent') return p.solvents[entry.ref as SolventId] > 0;
  return p.named.includes(entry.id); // compound, burst (D7)
}

/** A rune's fine print. Unwitnessed lines are never listed (D1: no hints), only counted. */
function fineOf(p: Profile, entry: CodexEntryDef): Pick<CodexRow, 'fine'> {
  if (entry.kind !== 'rune') return {};
  const own = LINES.filter((l) => l.subject === entry.ref);
  const seen = isKnown(p, entry) ? own.filter((l) => p.witnessed.includes(l.id)) : [];
  return { fine: { seen, total: own.length } };
}

/** Design §4.2: rows and columns Ink, Oil, Steam, Brass; the upper triangle holds the ten compounds. */
const COMPOUND_GRID: readonly (readonly (CompoundId | null)[])[] = [
  ['deepMark', 'stain', 'brandCloud', 'shackle'],
  [null, 'pool', 'greaseFog', 'skidPlate'],
  [null, null, 'bank', 'kettle'],
  [null, null, null, 'wall'],
];

/** The compound table as a 4×4 grid; a cell is null below the diagonal, else its page (known once named). */
export function compoundTable(p: Profile): (CodexRow | null)[][] {
  const rows = codexView(p);
  return COMPOUND_GRID.map((line) =>
    line.map((c) => (c ? (rows.find((r) => r.entry.id === `compound:${c}`) ?? null) : null)),
  );
}

// ── Trip ────────────────────────────────────────────────
// ── Save data ───────────────────────────────────────────

/** Sparse save data; version dispatch and edition recovery belong to the app save boundary. */
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
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : bad();
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

function pageCoord(v: unknown): Coord {
  const r = record(v);
  if (!isLatticeCoord(r)) return bad();
  return { x: r.x as number, y: r.y as number };
}

function boardCoord(v: unknown): Coord {
  const r = record(v);
  if (
    !Number.isSafeInteger(r.x) ||
    !Number.isSafeInteger(r.y) ||
    (r.x as number) < 0 ||
    (r.y as number) < 0
  )
    return bad();
  return { x: r.x as number, y: r.y as number };
}

const VERSION_KEY = /^.+@[1-9]\d*$/;
const INVENTION_ID = /^inv:[^\s[\]]+$/;
const LINE_ID = /^[A-Za-z]+:[A-Za-z]+$/;
const TIERS: readonly TierLevel[] = [0, 1, 2, 3];
const BIND_EVENTS: readonly BindEvent[] = ['hit', 'enters', 'pushed', 'dies'];

function cellKey(v: unknown): CellKey {
  if (typeof v !== 'string') return bad();
  try {
    parseLatticeKey(v);
  } catch {
    return bad();
  }
  return v;
}

function bool(v: unknown): boolean {
  return typeof v === 'boolean' ? v : bad();
}

function tier(v: unknown): TierLevel {
  return TIERS.find((t) => t === v) ?? bad();
}

/** An authored rune id or an invention id. */
function runeRef(v: unknown): RuneRef {
  if (typeof v === 'string' && INVENTION_ID.test(v)) return v as RuneRef;
  return oneOf(RUNE_IDS, v);
}

function parseArgs(v: unknown): Record<CellKey, GlyphArg> {
  const r = record(v);
  return Object.fromEntries(
    Object.entries(r).map(([k, a]) => {
      const x = record(a);
      const rune = runeRef(x.rune);
      return [cellKey(k), x.dir === undefined ? { rune } : { rune, dir: oneOf(DIRS, x.dir) }];
    }),
  );
}

function parsePlaced(v: unknown): Placed {
  const r = record(v);
  if (r.glyph !== undefined) {
    const placed = { at: pageCoord(r.at), glyph: text(r.glyph), dir: oneOf(DIRS, r.dir) };
    return r.args === undefined ? placed : { ...placed, args: parseArgs(r.args) };
  }
  return parseRune(r);
}

function parseLoot(v: unknown): LootItem {
  const r = record(v);
  switch (r.kind) {
    case 'rune':
      return { kind: 'rune', rune: oneOf(RUNE_IDS, r.rune) };
    case 'method':
      return { kind: 'method', method: oneOf(METHOD_IDS, r.method) };
    case 'ink':
      return { kind: 'ink', amount: count(r.amount) };
    case 'solvent':
      return { kind: 'solvent', solvent: oneOf(SOLVENT_IDS, r.solvent) };
    case 'vellum':
      return { kind: 'vellum', amount: count(r.amount) };
    case 'doorway':
      return { kind: 'doorway' };
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

function parseInvention(v: unknown): InventionDef {
  const r = record(v);
  const id =
    typeof r.id === 'string' && INVENTION_ID.test(r.id) ? (r.id as `inv:${string}`) : bad();
  const def: InventionDef = {
    id,
    name: text(r.name),
    method: oneOf(METHOD_IDS, r.method),
    parts: list(r.parts).map(runeRef),
    solvent: r.solvent === null ? null : oneOf(SOLVENT_IDS, r.solvent),
  };
  if (r.event !== undefined) def.event = oneOf(BIND_EVENTS, r.event);
  return def;
}

function lineId(v: unknown): LineId {
  return typeof v === 'string' && LINE_ID.test(v) ? (v as LineId) : bad();
}

function parseFootnotes(v: unknown): Profile['footnotes'] {
  const r = record(v);
  const out: Profile['footnotes'] = {};
  for (const [k, n] of Object.entries(r)) {
    const x = record(n);
    const chosen = record(x.chosen);
    out[oneOf(RUNE_IDS, k)] = {
      points: count(x.points),
      chosen: Object.fromEntries(Object.entries(chosen).map(([l, t]) => [lineId(l), text(t)])),
    };
  }
  return out;
}

/** Current sparse profile: every field is required. */
function parseProfile(v: unknown, budget: ImportBudget): Profile {
  const r = record(v);
  const household = parseHousehold(r.household);
  const lattices = byMember(household, r.lattices, (x) => list(x).map(parsePlaced));
  const sol = record(r.solvents);
  for (const k of Object.keys(sol)) oneOf(SOLVENT_IDS, k);
  const solvents = Object.fromEntries(
    SOLVENT_IDS.map((id) => [id, sol[id] === undefined ? 0 : count(sol[id])]),
  ) as Record<SolventId, number>;
  const inventions = list(r.inventions).map(parseInvention);
  if (new Set(inventions.map((d) => d.id)).size !== inventions.length) bad();
  const glyphs = list(r.glyphs).map((g) => parseGlyphDef(g, budget));
  if (new Set(glyphs.map((g) => g.id)).size !== glyphs.length) bad();
  // Older versions: each of a current Glyph, never its current version, each version once.
  const glyphArchive = list(r.glyphArchive).map((g) => parseGlyphDef(g, budget));
  const versions = new Set(glyphs.map((g) => `${g.id}@${g.version}`));
  const currentIds = new Set(glyphs.map((g) => g.id));
  for (const g of glyphArchive) {
    budget.spend('work');
    const k = `${g.id}@${g.version}`;
    if (!currentIds.has(g.id) || versions.has(k)) bad();
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
  for (const m of household.members) {
    const page = pageOf({ lattices }, m);
    const shape = growingLattice(page).shape;
    // Also rejects a lattice Glyph that is not in the library. A stale argument (after a revision)
    // is the page's issue to fix, not a broken save.
    const structural = validateLattice(
      { shape, runes: page },
      null,
      library,
      libraryOf(inventions),
      null,
      budget,
    ).filter((i) => i.kind !== 'arg');
    if (structural.length > 0) bad();
  }
  const proof = byMember(household, r.proof, (x) =>
    list(x).map((mask) => list(mask).map(parseFired)),
  );
  return {
    known: unique(list(r.known).map((id) => oneOf(RUNE_IDS, id))),
    methods: unique(list(r.methods).map((id) => oneOf(METHOD_IDS, id))),
    inventions,
    solvents,
    household,
    ink: count(r.ink),
    lattices,
    witnessed: unique(list(r.witnessed).map(lineId)),
    named: unique(list(r.named).map(text)),
    met: unique(list(r.met).map((m) => text(m) as Meets)),
    foesMet: unique(list(r.foesMet).map((id) => oneOf(ENEMY_IDS, id))),
    footnotes: parseFootnotes(r.footnotes),
    vellum: count(r.vellum),
    glyphs,
    glyphArchive,
    glyphRecords,
    proof,
    city: parseCity(r.city),
  };
}

/** Joined apprentices (unique, registry ids, at least one); slots hold members, never twice. */
function parseHousehold(v: unknown): Household {
  const r = record(v);
  const members = list(r.members).map((id) => oneOf(APPRENTICE_IDS, id));
  if (members.length === 0 || unique(members).length !== members.length) bad();
  const raw = list(r.slots);
  if (raw.length !== 3) bad();
  const slots = raw.map((s) => (s === null ? null : oneOf(members, s))) as TripSlots;
  const filled = slots.filter((s) => s !== null);
  if (unique(filled).length !== filled.length) bad();
  return { members, slots };
}

/** A per-apprentice record keyed by exactly the household's members. */
function byMember<T>(
  household: Household,
  v: unknown,
  parse: (x: unknown) => T,
): Partial<Record<ApprenticeId, T>> {
  const r = record(v);
  if (Object.keys(r).length !== household.members.length) bad();
  return Object.fromEntries(
    household.members.map((m) => [m, Object.hasOwn(r, m) ? parse(r[m]) : bad()]),
  );
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
  const rune = runeRef(r.rune);
  const at = pageCoord(r.at);
  return r.dir === undefined ? { at, rune } : { at, rune, dir: oneOf(DIRS, r.dir) };
}

/** A saved Glyph (never with a `discount`: that is the effective view's). */
function parseGlyphDef(v: unknown, budget: ImportBudget): GlyphDef {
  const r = record(v);
  const cells = list(r.cells).map(parseRune);
  if (cells.length === 0) bad();
  const params = unique(list(r.params).map(cellKey));
  budget.spend('work', cells.length + params.length);
  const byKey = new Map(cells.map((c) => [key(c.at), c]));
  for (const k of params) {
    const cell = byKey.get(k) ?? bad();
    if (!isInvention(cell.rune) && !canBeOpen(cell.rune)) bad();
  }
  return {
    id: text(r.id),
    name: text(r.name),
    kind: oneOf<'spell' | 'payload'>(['spell', 'payload'], r.kind),
    cells,
    entry: pageCoord(r.entry),
    exits: list(r.exits).map((e) => {
      const x = record(e);
      return { from: pageCoord(x.from), dir: oneOf(DIRS, x.dir) };
    }),
    idiom: r.idiom === null ? null : text(r.idiom),
    version: count(r.version) >= 1 ? count(r.version) : bad(),
    params,
    extraExit: r.extraExit === null ? null : oneOf<Dir>(['up', 'right', 'down'], r.extraExit),
  };
}

function parseFired(v: unknown): FiredCell {
  const r = record(v);
  const fired: FiredCell = {
    at: pageCoord(r.at),
    rune: r.rune === null ? null : runeRef(r.rune),
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
      return { kind: 'tile', at: boardCoord(r.at) };
    case 'self':
      return { kind: 'self' };
    default:
      return bad();
  }
}

function parseAction(v: unknown): Action {
  const r = record(v);
  switch (r.type) {
    case 'move':
      return { type: 'move', unit: text(r.unit), to: boardCoord(r.to) };
    case 'undoMove':
      return { type: 'undoMove', unit: text(r.unit) };
    case 'cast':
      return { type: 'cast', unit: text(r.unit), spell: cellKey(r.spell), aim: parseAim(r.aim) };
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
      return Object.fromEntries(Object.entries(c).map(([k, n]) => [cellKey(k), count(n)]));
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
  if (enc.heart && trip.offers.some((i) => i.kind === 'doorway')) bad();
  if (trip.offers.filter((i) => i.kind === 'doorway').length > 1) bad();
  if (trip.status !== 'fight' && trip.actions.length > 0) bad();
  return trip;
}

/** Validates and normalizes loaded save data. Throws "Not a valid save". */
export function parseSaveData(data: unknown, budget: ImportBudget = importBudget()): SaveData {
  assertImportStructure(data, budget);
  const r = record(data);
  const save: SaveData = {
    profile: parseProfile(r.profile, budget),
    trip: r.trip === null || r.trip === undefined ? null : parseTrip(r.trip),
    seedCounter: count(r.seedCounter),
    lastTrip: r.lastTrip === null || r.lastTrip === undefined ? null : parseRecap(r.lastTrip),
  };
  validateSaveReferences(save, budget);
  return save;
}

function parseTally(v: unknown): SpellTally {
  const x = record(v);
  return {
    member: oneOf(MEMBER_IDS, x.member),
    spell: cellKey(x.spell),
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
              spell: cellKey(c.spell),
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
    place: text(r.place),
    stats: parseStats(r.stats),
  };
}

// ── Proof and compile ───────────────────────────────────

/** Appends cast masks to a member's proof, keeping the newest `TUNING.proofMasksPerMember`. */
export function recordProof(p: Profile, m: MemberId, masks: readonly FiredCell[][]): Profile {
  const proof = [...proofOf(p, m), ...masks.map((c) => c.map((f) => ({ ...f })))];
  return { ...p, proof: { ...p.proof, [m]: proof.slice(-TUNING.proofMasksPerMember) } };
}

/**
 * Fair Copy: collapses the cluster in member m's lattice into a new Glyph v1 (plan P2, P3).
 * `open` is the one local cell left open for an argument, if any (M22, via `withOpenCell`).
 * Every compile costs vellum: idioms are log patterns now (P7).
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
  const masks = p.household.members.flatMap((id) => proofOf(p, id));
  if (provenCount(l, cluster, masks) < TUNING.provenCasts) throw new Error('Not proven yet');
  const blocker = blockingAuras(l, cluster, lib)[0];
  if (blocker) {
    const aura = l.runes.find((r) => r.at.x === blocker.x && r.at.y === blocker.y);
    const what = aura && !isGlyph(aura) ? nameOf(aura.rune, inventionLibrary(p)) : 'Aura';
    throw new Error(`The ${what} at ${label(blocker)} also powers runes outside the selection`);
  }
  const sharing = sharingSpells(l, cluster, lib)[0];
  if (sharing) {
    const other = l.runes.find((r) => r.at.x === sharing.source.x && r.at.y === sharing.source.y);
    const what = other && !isGlyph(other) ? nameOf(other.rune, inventionLibrary(p)) : 'Glyph';
    throw new Error(`The ${what} at ${label(sharing.source)} also flows through this selection`);
  }
  let n = p.glyphs.length + 1;
  while (lib[`g${n}`]) n += 1;
  const def = withOpenCell(toGlyphDef(l, cluster, trimmed, `g${n}`, lib), open);
  const cost = TUNING.compileVellum;
  if (p.vellum < cost) throw new Error('Not enough vellum');
  const glyphs = [...p.glyphs, def];
  const collapsed = tidyCollapse(l, cluster, def, lib).lattice;
  return setMemberLattice({ ...p, glyphs, vellum: p.vellum - cost }, m, collapsed);
}

export function renameGlyph(p: Profile, id: GlyphId, name: string): Profile {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A Glyph needs a name');
  if (!p.glyphs.some((g) => g.id === id)) throw new Error(`No Glyph ${id}`);
  return { ...p, glyphs: p.glyphs.map((g) => (g.id === id ? { ...g, name: trimmed } : g)) };
}

/** Referential checks are separate from decoding, and run before any compilation or ink walk. */
export function validateSaveReferences(save: SaveData, budget: ImportBudget): void {
  try {
    validateSaveReferencesUnchecked(save, budget);
  } catch (error) {
    if (error instanceof InkCostOverflowError)
      throw new ResourceLimitError('arithmetic', Number.MAX_SAFE_INTEGER);
    throw error;
  }
}

function validateSaveReferencesUnchecked(save: SaveData, budget: ImportBudget): void {
  const p = save.profile;
  budget.spend('work', p.inventions.length);
  const inventions = libraryOf(p.inventions);
  const price = inkPricer(inventions, null, budget);
  const rune = (ref: RuneRef): void => {
    budget.spend('work');
    if (isInvention(ref) && !inventions[ref]) bad();
  };
  // Iterative topological walk rejects cycles before ink or compiler helpers follow inventions.
  const done = new Set<RuneRef>();
  const active = new Set<RuneRef>();
  for (const def of p.inventions) {
    const pending = [{ ref: def.id as RuneRef, exit: false }];
    while (pending.length) {
      budget.spend('work');
      const item = pending.pop();
      if (!item) continue;
      if (item.exit) {
        active.delete(item.ref);
        done.add(item.ref);
        continue;
      }
      rune(item.ref);
      if (!isInvention(item.ref) || done.has(item.ref)) continue;
      if (active.has(item.ref)) bad();
      active.add(item.ref);
      pending.push({ ref: item.ref, exit: true });
      for (const part of inventions[item.ref]?.parts ?? [])
        pending.push({ ref: part, exit: false });
    }
  }
  for (const def of p.inventions) price(def.id);
  const defs = [...p.glyphs, ...p.glyphArchive];
  const glyphCosts = new Map<string, number>();
  for (const g of defs) {
    budget.spend('work', g.cells.length + g.exits.length + g.params.length + 1);
    const cells = new Set<CellKey>();
    for (const c of g.cells) {
      rune(c.rune);
      if (!isLatticeCoord(c.at)) bad();
      if (cells.has(key(c.at)) || hasArrow(c.rune) !== (c.dir !== undefined)) bad();
      cells.add(key(c.at));
    }
    if (!cells.has(key(g.entry)) || g.exits.some((e) => !cells.has(key(e.from)))) bad();
    const cost = baseGlyphCost(g, inventions, null, price);
    if (!glyphCosts.has(g.id)) glyphCosts.set(g.id, cost);
  }
  for (const [k, rec] of Object.entries(p.glyphRecords)) {
    budget.spend('work', Object.keys(rec.fired).length + 1);
    if (!VERSION_KEY.test(k) || !Number.isSafeInteger(Number(k.slice(k.lastIndexOf('@') + 1))))
      bad();
    for (const local of Object.keys(rec.fired)) cellKey(local);
  }
  for (const m of p.household.members) {
    const page = pageOf(p, m);
    budget.spend('work', page.length);
    const placedAt = new Map(page.map((r) => [key(r.at), r]));
    let totalInk = 0;
    for (const placed of page) {
      if (!isLatticeCoord(placed.at)) bad();
      if (isGlyph(placed)) {
        for (const arg of Object.values(placed.args ?? {})) rune(arg.rune);
        totalInk = addInk(totalInk, glyphCosts.get(placed.glyph) ?? 1);
        for (const n of [
          { x: placed.at.x - 1, y: placed.at.y },
          { x: placed.at.x + 1, y: placed.at.y },
          { x: placed.at.x, y: placed.at.y - 1 },
          { x: placed.at.x, y: placed.at.y + 1 },
        ]) {
          budget.spend('work');
          const neighbor = placedAt.get(key(n));
          if (neighbor && !isGlyph(neighbor) && roleOf(neighbor.rune, inventions) === 'aura')
            totalInk = addInk(totalInk, 1);
        }
      } else {
        rune(placed.rune);
        totalInk = addInk(totalInk, price(placed.rune));
      }
    }
    for (const mask of proofOf(p, m))
      for (const fired of mask) {
        budget.spend('work');
        if (!isLatticeCoord(fired.at)) bad();
        if (fired.rune) rune(fired.rune);
      }
  }
  const glyphs = glyphLibrary(p);
  for (const m of p.household.members)
    assertCompilationWork(latticeOf(p, m), glyphs, inventions, budget);
  const t = save.trip;
  if (!t) return;
  const enc = encountersOf(t.district)[t.encounter] ?? bad();
  const variant = enc.variants[variantFor(t, t.encounter)] ?? bad();
  const board = parseBoard(variant.layout);
  const onBoard = (at: Coord): void => {
    if (
      !Number.isSafeInteger(at.x) ||
      !Number.isSafeInteger(at.y) ||
      at.x < 0 ||
      at.y < 0 ||
      at.x >= board.width ||
      at.y >= board.height
    )
      bad();
  };
  for (const m of MEMBER_IDS)
    for (const k of Object.keys(t.charges[m])) {
      budget.spend('work');
      cellKey(k);
    }
  for (const action of t.actions) {
    budget.spend('work');
    if (action.type === 'endTurn') continue;
    oneOf(MEMBER_IDS, action.unit);
    if (action.type === 'move') onBoard(action.to);
    if (action.type === 'cast') {
      cellKey(action.spell);
      if (action.aim.kind === 'tile') onBoard(action.aim.at);
    }
  }
}
