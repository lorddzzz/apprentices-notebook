import {
  type BindEvent,
  DISTRICT_IDS,
  ENEMY_IDS,
  encountersOf,
  type InventionDef,
  isInvention,
  type LineId,
  MEMBER_IDS,
  METHOD_IDS,
  type Meets,
  type MemberId,
  RUNE_IDS,
  type RuneRef,
  SOLVENT_IDS,
  type SolventId,
  TUNING,
} from '$data';
import { canBeOpen } from './glyph';
import { type Coord, DIRS, type Dir, isLatticeCoord, parseLatticeKey } from './grid';
import { assertImportStructure, type ImportBudget, importBudget } from './importPolicy';
import { libraryOf, validateLattice } from './lattice';
import { parseLattice } from './notation';
// Frozen v7 decoding: historical member geometry must not follow future content edits.
import { glyphLibrary, validateSaveReferences } from './run';
import type {
  Action,
  Aim,
  CastSample,
  CellKey,
  FiredCell,
  GlyphArg,
  GlyphDef,
  GlyphRecord,
  LootItem,
  Placed,
  PlacedRune,
  Profile,
  SaveData,
  SpellTally,
  TierLevel,
  TierUp,
  Trip,
  TripRecap,
  TripStats,
  TripStatus,
} from './types';

const V7_SHAPES = {
  draughtsman: '. . . . .\n. . . . .\nx . . . x',
  stoker: 'x . x\n. . .\n. . .\n. . .\n. . .\nx . x',
};
function perMember<T>(make: (m: MemberId) => T): Record<MemberId, T> {
  return Object.fromEntries(MEMBER_IDS.map((m) => [m, make(m)])) as Record<MemberId, T>;
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

function parseCoord(v: unknown): Coord {
  const r = record(v);
  if (!isLatticeCoord(r)) return bad();
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
    const placed = { at: parseCoord(r.at), glyph: text(r.glyph), dir: oneOf(DIRS, r.dir) };
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
      return { kind: 'ink', member: oneOf(MEMBER_IDS, r.member), amount: count(r.amount) };
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

/** Profile v7 (P1): every field is required; older saves are the app's to turn away (save.ts). */
function parseProfile(v: unknown, budget: ImportBudget): Profile {
  const r = record(v);
  const cap = record(r.inkCapacity);
  const lat = record(r.lattices);
  const inkCapacity = perMember((m) => count(cap[m]));
  const lattices = perMember((m) => list(lat[m]).map(parsePlaced));
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
  for (const m of MEMBER_IDS) {
    const shape = parseLattice(V7_SHAPES[m]).shape;
    // Also rejects a lattice Glyph that is not in the library. A stale argument (after a revision)
    // is the page's issue to fix, not a broken save.
    const structural = validateLattice(
      { shape, runes: lattices[m] },
      null,
      library,
      libraryOf(inventions),
      null,
      budget,
    ).filter((i) => i.kind !== 'arg');
    if (structural.length > 0) bad();
  }
  const proofRaw = record(r.proof);
  const proof = perMember((m) => list(proofRaw[m]).map((mask) => list(mask).map(parseFired)));
  return {
    known: unique(list(r.known).map((id) => oneOf(RUNE_IDS, id))),
    methods: unique(list(r.methods).map((id) => oneOf(METHOD_IDS, id))),
    inventions,
    solvents,
    inkCapacity,
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
  const at = parseCoord(r.at);
  return r.dir === undefined ? { at, rune } : { at, rune, dir: oneOf(DIRS, r.dir) };
}

/** A saved Glyph (never with a `discount`: that is the effective view's). */
function parseGlyphDef(v: unknown, budget: ImportBudget): GlyphDef {
  const r = record(v);
  const cells = list(r.cells).map(parseRune);
  if (cells.length === 0) bad();
  const params = unique(list(r.params).map(cellKey));
  budget.spend('work', cells.length + params.length);
  const byKey = new Map(cells.map((c) => [`${c.at.x},${c.at.y}`, c]));
  for (const k of params) {
    const cell = byKey.get(k) ?? bad();
    if (!isInvention(cell.rune) && !canBeOpen(cell.rune)) bad();
  }
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
    idiom: r.idiom === null ? null : text(r.idiom),
    version: count(r.version) >= 1 ? count(r.version) : bad(),
    params,
    extraExit: r.extraExit === null ? null : oneOf<Dir>(['up', 'right', 'down'], r.extraExit),
  };
}

function parseFired(v: unknown): FiredCell {
  const r = record(v);
  const fired: FiredCell = {
    at: parseCoord(r.at),
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
      return { kind: 'tile', at: parseCoord(r.at) };
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
      return { type: 'move', unit: text(r.unit), to: parseCoord(r.to) };
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
export function parseLegacyV7(data: unknown): SaveData {
  const budget = importBudget();
  assertImportStructure(data, budget);
  const r = record(data);
  const save: SaveData = {
    profile: parseProfile(r.profile, budget),
    trip: r.trip === null || r.trip === undefined ? null : parseTrip(r.trip),
    seedCounter: count(r.seedCounter),
    lastTrip: r.lastTrip === null || r.lastTrip === undefined ? null : parseRecap(r.lastTrip),
  };
  validateSaveReferences(save, budget, true);
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
