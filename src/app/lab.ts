import {
  APPRENTICE_IDS,
  APPRENTICES,
  type ApprenticeId,
  type BasicActionId,
  ENEMIES,
  ENEMY_IDS,
  type EnemyId,
  type FootnoteKey,
  type FootnoteSubject,
  footnoteKeyOf,
  type HabitId,
  type InventionDef,
  type InventionId,
  LINES,
  MEMBER_IDS,
  MEMBERS,
  METHOD_IDS,
  METHODS,
  type MemberId,
  type MethodId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SCENARIOS,
  type ScenarioDef,
  SOLVENTS,
  type SolventId,
  VARIANTS,
  type VariantDef,
} from '$data';
import {
  type Action,
  type BattleSpec,
  type BattleState,
  type BoardUnit,
  boardOf,
  byReadingOrder,
  COMPOUND_BRACE_NAMES,
  type Coord,
  cloneData,
  createBattle,
  deriveSeed,
  describeLog,
  emptyTile,
  enemies,
  FOUNDERS,
  type GameEvent,
  type InventionLibrary,
  inHousehold,
  inventionIssue,
  type KnownSet,
  type Lattice,
  label,
  labSetCell,
  latticeOf,
  livingUnits,
  type MemberUnit,
  type Profile,
  parseBoard,
  parseCell,
  parseLattice,
  parsePieceToken,
  pieceBlocksUnits,
  sameCoord,
  scenarioSpec,
  serializeBoard,
  serializeLattice,
  spellsFor,
  type Tile,
  toGrowingLattice,
  tripParty,
} from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { KIT } from '$engine/districts/kit';
import type { Json, Kit } from '$engine/districts/types';
import { isRevealed } from '$engine/recruits';
import { MAX_PARTY, placeParty, START_SALT } from '$engine/rooms';

/** Lab helpers (pure): painting the board, and exporting a session as a scenario. */

export const DEFAULT_SCENARIO = 'sandbox';

/** Lab access is independent of the household's progression. */
export function labKnown(inventions: InventionLibrary): KnownSet {
  return { runes: RUNE_IDS, methods: METHOD_IDS, events: METHODS.bind.events ?? [], inventions };
}

export function addLabInvention(
  library: InventionLibrary,
  draft: InventionDef,
): { inventions: InventionLibrary; issue: string | null } {
  let n = 1;
  while (`inv:lab-${n}` in library) n++;
  const id: InventionId = `inv:lab-${n}`;
  const def = { ...draft, id };
  const issue = inventionIssue(def, labKnown(library));
  return { inventions: issue ? library : { ...library, [id]: def }, issue };
}

/** `#/lab?scenario=<id>[&demo=1]` → what to load. */
export function labLocation(params: URLSearchParams): { scenario: string; demo: boolean } {
  return {
    scenario: params.get('scenario') || DEFAULT_SCENARIO,
    demo: params.get('demo') === '1',
  };
}

/**
 * Rooms at the extremes of the room format (HC P5), with start points: the Lab fields its lineup
 * on them (P16). Not lessons, so they live here and not in `SCENARIOS`.
 */
export const LAB_ROOMS: readonly ScenarioDef[] = [
  {
    id: 'room-7x9',
    title: 'Room 7×9',
    note: 'The largest room: seven by nine, six start points. The lineup of one to three stands on a seeded draw of them.',
    board: [
      '. . . r . . .',
      '. b . . . r .',
      '. . . . . . .',
      '. . o o . . .',
      '. . . . ~ . .',
      '. . . . . . .',
      'P . . . . . P',
      '. . P . P . .',
      'P . . . . . P',
    ].join('\n'),
    demo: [],
    expected: [],
  },
  {
    id: 'room-5x6',
    title: 'Room 5×6',
    note: 'The smallest room: five by six, four start points. One apprentice fits as well as three.',
    board: ['. . r . .', '. . . . .', '. o . . .', '. . . . .', 'P . P . P', '. P . . .'].join(
      '\n',
    ),
    demo: [],
    expected: [],
  },
];

/** Every scenario the Lab's picker offers: the lessons, then the sized rooms. */
export const LAB_SCENARIOS: readonly ScenarioDef[] = [...SCENARIOS, ...LAB_ROOMS];

/** The scenario for an id; unknown ids fall back to the sandbox and say so. */
export function resolveScenario(id: string): { def: ScenarioDef; unknown: string | null } {
  const def = LAB_SCENARIOS.find((s) => s.id === id);
  if (def) return { def, unknown: null };
  const fallback = LAB_SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO) ?? LAB_SCENARIOS[0];
  if (!fallback) throw new Error('No Lab scenarios');
  return { def: fallback, unknown: id };
}

const starterLattice = (m: MemberId): Lattice =>
  toGrowingLattice(parseLattice(APPRENTICES[m].starterPage));

/** Lattices from the start notebook (tests and Gallery fixtures; the app uses the profile's). */
export function fallbackLattices(): Record<MemberId, Lattice> {
  return Object.fromEntries(APPRENTICE_IDS.map((m) => [m, starterLattice(m)])) as Record<
    MemberId,
    Lattice
  >;
}

/**
 * Lattices for apprentices a scenario leaves out: the page in the player's notebook, or the
 * starter page for someone who has not joined the household (the Lab fields anyone, P16).
 */
export function profileLattices(p: Profile): Record<MemberId, Lattice> {
  return Object.fromEntries(
    APPRENTICE_IDS.map((m) => [
      m,
      inHousehold(p, m) ? toGrowingLattice(latticeOf(p, m)) : starterLattice(m),
    ]),
  ) as Record<MemberId, Lattice>;
}

// ── Kits (AH-7): any action and habit on any apprentice ────

/** The four basic actions, in the order the picker lists them. */
export const LAB_ACTIONS: readonly BasicActionId[] = ['shove', 'pull', 'hop', 'swap'];

/** What an apprentice carries into a fight: their basic action and their habit (null: none). */
export interface LabKit {
  action: BasicActionId;
  habit: HabitId | null;
}
/** The Lab's kit overrides, by apprentice. Only what differs from the registry is kept. */
export type LabKits = Partial<Record<ApprenticeId, Partial<LabKit>>>;

/** The kit the registry gives an apprentice. */
export const nativeKit = (id: ApprenticeId): LabKit => ({
  action: APPRENTICES[id].action,
  habit: APPRENTICES[id].habit,
});

/** The kit an apprentice has in the Lab: the registry's, with any override on top. */
export const kitOf = (id: ApprenticeId, kits: LabKits): LabKit => ({
  ...nativeKit(id),
  ...kits[id],
});

/** `kits` with `patch` applied to one apprentice; a field equal to the registry's is dropped. */
export function setKit(kits: LabKits, id: ApprenticeId, patch: Partial<LabKit>): LabKits {
  const native = nativeKit(id);
  const next: Partial<LabKit> = { ...kits[id], ...patch };
  if (next.action === native.action) delete next.action;
  if (next.habit === native.habit) delete next.habit;
  const { [id]: _old, ...rest } = kits;
  return Object.keys(next).length > 0 ? { ...rest, [id]: next } : rest;
}

/** Who carries something other than the registry's kit. */
export const changedKits = (kits: LabKits): ApprenticeId[] =>
  APPRENTICE_IDS.filter((id) => Object.keys(kits[id] ?? {}).length > 0);

/** `s` with the apprentice's kit written onto their unit, when they stand on the board. */
export function withKit(s: BattleState, id: ApprenticeId, kits: LabKits): BattleState {
  const unit = s.units.find((u) => u.kind === 'member' && u.def === id);
  if (unit?.kind !== 'member') return s;
  const kit = kitOf(id, kits);
  if (unit.action === kit.action && unit.lean.habit === kit.habit) return s;
  const next = cloneData(s);
  const mine = next.units.find((u) => u.kind === 'member' && u.def === id);
  if (mine?.kind === 'member') {
    mine.action = kit.action;
    mine.lean = { ...mine.lean, habit: kit.habit };
  }
  return next;
}

/** The overrides as the `PartyInit` fields the engine's own spawn honours. */
const kitInit = (
  id: ApprenticeId,
  kits: LabKits,
): { action?: BasicActionId; habit?: HabitId | null } => kits[id] ?? {};

// ── Lineup and start points (HC-8, plan P16) ────────────

/** The lineup a Lab opens with: the slotted trip party, else the founding pair. */
export function defaultLineup(p: Profile): ApprenticeId[] {
  const party = tripParty(p);
  return party.length > 0 ? party : [...FOUNDERS];
}

/** Adds or removes one apprentice from a lineup: 1–3, in the order picked. `why` says a refusal. */
export function toggleLineup(
  lineup: readonly ApprenticeId[],
  id: ApprenticeId,
): { lineup: ApprenticeId[]; why: string | null } {
  if (lineup.includes(id)) {
    if (lineup.length === 1) {
      return { lineup: [...lineup], why: 'A lineup needs at least one apprentice' };
    }
    return { lineup: lineup.filter((x) => x !== id), why: null };
  }
  if (lineup.length >= MAX_PARTY) {
    return { lineup: [...lineup], why: `A lineup holds ${MAX_PARTY} at most` };
  }
  return { lineup: [...lineup, id], why: null };
}

/** The start-point seed for a Lab spots seed (what `createBattle` derives by default). */
export const startSeedOf = (spotSeed: number): number => deriveSeed(spotSeed, START_SALT);

/** The board's start points, and whether it places apprentices itself (D, S… tokens on it). */
export function boardStarts(board: string): { starts: Coord[]; fixed: boolean } {
  const parsed = parseBoard(board);
  return { starts: parsed.starts, fixed: parsed.units.some((u) => u.kind === 'member') };
}

/**
 * The spec for a Lab battle (P16). Every registry apprentice gets a compiled page, so a painted or
 * lineup recruit can cast; a board with `P` and no apprentice tokens fields `lineup` (as many as
 * the board has points) with the Lab seed.
 */
export function labSpec(
  def: ScenarioDef,
  opts: {
    lattices: Record<MemberId, Lattice>;
    inventions: InventionLibrary;
    lineup: readonly ApprenticeId[];
    spotSeed?: number;
    kits?: LabKits;
  },
): { spec: BattleSpec; starts: Coord[]; spotSeed: number } {
  const spec = scenarioSpec(def, {
    lab: true,
    lattices: opts.lattices,
    inventions: opts.inventions,
  });
  const party = { ...spec.party };
  for (const id of APPRENTICE_IDS) {
    if (!party[id]) party[id] = { spells: spellsFor(id, opts.lattices[id], opts.inventions) };
    party[id] = { ...party[id], ...kitInit(id, opts.kits ?? {}) };
  }
  spec.party = party;
  const spotSeed = opts.spotSeed ?? spec.seed;
  const { starts, fixed } = boardStarts(def.board);
  if (starts.length > 0 && !fixed) {
    spec.lineup = opts.lineup.slice(0, Math.min(MAX_PARTY, starts.length));
    spec.startSeed = startSeedOf(spotSeed);
  }
  return { spec, starts, spotSeed };
}

const standable = (t: Tile): boolean =>
  !t.terrain.gate && !t.terrain.grate && !isPlateLike(t) && !pieceBlocksUnits(t);

/** Toggles a start point on a tile. A start point never sits under a unit, plate, gate or grate. */
export function toggleStart(
  s: BattleState,
  starts: readonly Coord[],
  at: Coord,
): { starts: Coord[]; why: string | null } {
  if (starts.some((c) => sameCoord(c, at))) {
    return { starts: starts.filter((c) => !sameCoord(c, at)), why: null };
  }
  const refuse = (why: string) => ({ starts: [...starts], why });
  const tile = s.tiles[at.y * s.width + at.x];
  if (!tile) return refuse('Off the board');
  if (livingUnits(s).some((u) => sameCoord(u.pos, at))) {
    return refuse('A start point cannot sit under a unit');
  }
  if (!standable(tile)) return refuse('A start point cannot sit on a plate, gate or grate');
  return { starts: [...starts, at].sort(byReadingOrder), why: null };
}

/** Start points whose tile became a plate, gate or grate are dropped (the room format forbids them). */
export function pruneStarts(s: BattleState, starts: readonly Coord[]): Coord[] {
  return starts.filter((c) => {
    const tile = s.tiles[c.y * s.width + c.x];
    return tile !== undefined && standable(tile);
  });
}

/**
 * The board as text with its start points (`P`), as the room format writes them (a point under a
 * unit is left out: the notation keeps them apart). Works on the
 * serialised board, so an apprentice the notation cannot read yet still copies out.
 */
export function boardWithStarts(s: BattleState, starts: readonly Coord[]): string {
  const text = boardOf(s);
  if (starts.length === 0) return text;
  const grid = cellTokens(s).map((row) => [...row]);
  // A start point under a unit is not written: the notation keeps them apart.
  const standing = livingUnits(s).map((u) => u.pos);
  for (const c of starts.filter((c) => !standing.some((p) => sameCoord(p, c)))) {
    const row = grid[c.y];
    const token = row?.[c.x];
    if (row && token !== undefined) row[c.x] = token === '.' ? 'P' : `P${token}`;
  }
  const widths = (grid[0] ?? []).map((_, x) => Math.max(...grid.map((r) => (r[x] ?? '').length)));
  return grid
    .map((r) =>
      r
        .map((c, x) => c.padEnd(widths[x] ?? 0))
        .join(' ')
        .trimEnd(),
    )
    .join('\n');
}

/**
 * A fresh member of the registry with their page compiled and full charges, built by the engine's
 * own spawn on a one-tile room (so any apprentice works, whatever the board notation reads).
 */
function newMember(
  id: ApprenticeId,
  lattices: Record<MemberId, Lattice>,
  inventions: InventionLibrary,
  kits: LabKits = {},
): MemberUnit {
  const { state } = createBattle({
    title: 'Lab',
    board: 'P',
    seed: 1,
    party: { [id]: { spells: spellsFor(id, lattices[id], inventions), ...kitInit(id, kits) } },
    lineup: [id],
    inventions,
    lab: true,
  });
  const unit = state.units.find((u): u is MemberUnit => u.kind === 'member');
  if (!unit) throw new Error(`${APPRENTICES[id].name} did not arrive`);
  return unit;
}

/**
 * Fields `lineup` on the start points: everyone on the board stands down, then the lineup takes a
 * seeded draw of the points (same board, lineup and spots seed: same spots). Each arrives with
 * their page from `lattices` and full charges. Throws when there are too few points.
 */
export function fieldLineup(
  s: BattleState,
  starts: readonly Coord[],
  lineup: readonly ApprenticeId[],
  spotSeed: number,
  lattices: Record<MemberId, Lattice>,
  kits: LabKits = {},
): BattleState {
  const next = cloneData(s);
  next.units = next.units.filter((u) => u.kind !== 'member');
  const placed = placeParty(
    { width: s.width, height: s.height, tiles: next.tiles, units: [], starts: [...starts] },
    lineup,
    startSeedOf(spotSeed),
  );
  for (const p of placed.units) {
    const unit = newMember(p.def as ApprenticeId, lattices, s.inventions, kits);
    unit.pos = { ...p.at };
    next.units.push(unit);
  }
  return next;
}

/**
 * One tap with an apprentice's token. They stand where tapped (a different unit there is
 * replaced; a plate under them goes); the same apprentice tapped again leaves the board. One
 * place per apprentice: painting someone already on the board moves them with their charges.
 * Null when nothing can change (a gate or grate).
 */
export function paintApprentice(
  s: BattleState,
  at: Coord,
  id: ApprenticeId,
  lattices: Record<MemberId, Lattice>,
  kits: LabKits = {},
): BattleState | null {
  const tile = s.tiles[at.y * s.width + at.x];
  if (!tile || tile.terrain.gate || tile.terrain.grate) return null;
  const next = cloneData(s);
  const here = next.units.find((u) => u.hp > 0 && sameCoord(u.pos, at));
  if (here?.kind === 'member' && here.def === id) {
    next.units = next.units.filter((u) => u !== here);
    return next;
  }
  const mine = next.units.find((u) => u.kind === 'member' && u.def === id);
  next.units = next.units.filter((u) => u !== here && u !== mine);
  const unit = mine?.kind === 'member' ? mine : newMember(id, lattices, s.inventions, kits);
  unit.pos = { ...at };
  next.units.push(unit);
  const t = next.tiles[at.y * next.width + at.x];
  if (t && isPlateLike(t)) t.state = null;
  return next;
}

// ── Footnote variants in the Lab (FN-7, plan P6) ────────

/**
 * Switches an authored variant on or off for Lab trials. A slot (or capstone) holds one variant, as
 * the Desk writes one, so switching one on switches its slot-mate off.
 */
export function switchVariant(
  on: readonly string[],
  id: string,
  value: boolean,
  variants: readonly VariantDef[] = VARIANTS,
): string[] {
  const v = variants.find((x) => x.id === id);
  if (!v) return [...on];
  const key = footnoteKeyOf(v);
  const rest = on.filter((x) => {
    if (x === id) return false;
    const other = variants.find((y) => y.id === x);
    return !other || footnoteKeyOf(other) !== key;
  });
  return value ? [...rest, id] : rest;
}

/** The footnote context a Lab battle runs with: each switched-on variant in its slot or capstone. */
export function labFootnotes(
  on: readonly string[],
  variants: readonly VariantDef[] = VARIANTS,
): FootnoteIds {
  const out: Partial<Record<FootnoteKey, string>> = {};
  for (const id of on) {
    const v = variants.find((x) => x.id === id);
    if (v) out[footnoteKeyOf(v)] = v.id;
  }
  return out;
}

export interface VariantRow {
  id: string;
  /** "Level I", "Level II", "Capstone"; a rival note says so too. */
  slot: string;
  /** The line the slot sits on, in its base wording (empty for a capstone). */
  line: string;
  text: string;
}

export interface VariantGroup {
  subject: FootnoteSubject;
  name: string;
  rows: VariantRow[];
}

const subjectName = (subject: FootnoteSubject): string => {
  if ((RUNE_IDS as readonly string[]).includes(subject)) return RUNES[subject as RuneId].name;
  if ((METHOD_IDS as readonly string[]).includes(subject)) return METHODS[subject as MethodId].name;
  return SOLVENTS[subject as SolventId].name;
};

/** Every authored variant, grouped by its subject in registry order (rival notes included). */
export function variantGroups(variants: readonly VariantDef[] = VARIANTS): VariantGroup[] {
  const groups = new Map<FootnoteSubject, VariantGroup>();
  for (const v of variants) {
    let group = groups.get(v.subject);
    if (!group) {
      group = { subject: v.subject, name: subjectName(v.subject), rows: [] };
      groups.set(v.subject, group);
    }
    const { slot } = v;
    const level = 'line' in slot ? (slot.level === 1 ? 'Level I' : 'Level II') : 'Capstone';
    const line = 'line' in slot ? (LINES.find((l) => l.id === slot.line)?.text ?? '') : '';
    group.rows.push({
      id: v.id,
      slot: v.rival ? `${level}, rival note` : level,
      line,
      text: v.text,
    });
  }
  return [...groups.values()];
}

// ── Board painting ──────────────────────────────────────

/**
 * One swatch's cell notation: an apprentice's or foe's token, a tile state, terrain, a compound
 * (`{stain}`) or a registered board piece (`{bell}`). The registries decide which exist, so this
 * is a plain string, checked by the board's own parser when it is painted.
 */
export type PaletteItem = string;

export interface PaletteEntry {
  item: PaletteItem;
  name: string;
  /** A registered piece: its art key and starting data, so the swatch can draw it. */
  piece?: { art: string; data: Json };
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Palette order: apprentices, the start point, foes (the enemy registry, in its order), unit
 * modifiers, tile states, terrain, the district pieces the kit registers (for the Lab; `all` adds
 * those only the Bench offers), the eraser.
 */
export function paletteOf(
  kit: Kit = KIT,
  pieces: 'lab' | 'all' = 'lab',
  roster: readonly ApprenticeId[] = APPRENTICE_IDS,
): readonly PaletteEntry[] {
  return [
    ...APPRENTICE_IDS.filter((id) => roster.includes(id)).map((id) => ({
      item: APPRENTICES[id].token,
      name: APPRENTICES[id].name,
    })),
    { item: 'P', name: 'Start point (P)' },
    ...ENEMY_IDS.map((id) => ({
      item: ENEMIES[id].token,
      name: capital(ENEMIES[id].name),
    })),
    { item: '!', name: 'Mark, then deep mark (a unit)' },
    { item: '&', name: 'Brass collar (a unit)' },
    { item: '$', name: 'Shackle (a unit)' },
    { item: 'o', name: 'Oil slick' },
    { item: 'i', name: 'Ink blot' },
    { item: '~', name: 'Steam cloud' },
    { item: '*', name: 'Fire' },
    { item: '=', name: 'Brass plate' },
    { item: '{stain}', name: 'Stain' },
    { item: '{brand}', name: 'Brand cloud' },
    { item: '{pool}', name: 'Pool' },
    { item: '{fog}', name: 'Grease fog' },
    { item: '{skid}', name: 'Skid plate' },
    { item: '{bank}', name: 'Bank' },
    { item: '{kettle}', name: 'Kettle' },
    { item: '{wall}', name: 'Wall' },
    { item: 'w>', name: 'Water flowing right' },
    { item: 'wv', name: 'Water flowing down' },
    { item: 'w<', name: 'Water flowing left' },
    { item: 'w^', name: 'Water flowing up' },
    { item: 'h', name: 'Grate (on water)' },
    { item: 'g', name: 'Lock gate' },
    { item: 'l', name: 'Lamp' },
    { item: '@', name: 'Steam vent' },
    { item: '_', name: 'A drop' },
    ...Object.values(kit.pieces).flatMap((def): PaletteEntry[] => {
      const label = def.palette?.lab
        ? def.palette.label
        : pieces === 'all'
          ? def.bench?.label
          : undefined;
      if (!label) return [];
      return [
        {
          item: `{${def.token}}`,
          name: label,
          piece: { art: def.art, data: def.data?.init ?? null },
        },
      ];
    }),
    { item: '.', name: 'Clear the tile' },
  ];
}

export const PALETTE: readonly PaletteEntry[] = paletteOf();

const UNIT_CHARS = new Set<string>([
  ...APPRENTICE_IDS.map((id) => APPRENTICES[id].token),
  ...ENEMY_IDS.map((id) => ENEMIES[id].token),
]);
const STATE_ITEMS = new Set(['o', 'i', '~', '*']);
const ORIGIN: Coord = { x: 0, y: 0 };

interface Cell {
  tile: Tile;
  unit: BoardUnit | null;
}

const readCell = (token: string): Cell => parseCell(token, ORIGIN);

/** The canonical token of a cell, through the engine's own writer (so it always parses). */
function writeCell(c: Cell): string {
  return serializeBoard({ width: 1, height: 1, tiles: [c.tile], units: c.unit ? [c.unit] : [] });
}

const isPlateLike = (t: Tile): boolean =>
  t.state !== null && ['plate', 'skidPlate', 'kettle', 'wall'].includes(t.state.id);

/**
 * One palette tap on a cell token. A unit replaces the unit; the same unit again removes it. `!`
 * cycles none → mark → deep mark → none; `&` and `$` toggle on a unit and do nothing without
 * one. A tile holds one state: painting another replaces it, the same again removes it; a plate
 * stands alone, so it is refused under a unit and replaced when a unit is placed. `@` and `_`
 * toggle terrain. `.` clears the cell.
 */
export function toggleToken(token: string, item: PaletteItem): string {
  if (item === '.') return '.';
  if (item === 'P') return token; // start points live outside the tile (see toggleStart)
  if (item === 'g') return token === 'g' ? '.' : 'g';
  const c = readCell(token);
  const { tile } = c;
  if (UNIT_CHARS.has(item)) {
    if (tile.terrain.grate || tile.terrain.gate || pieceBlocksUnits(tile)) return token;
    const placed = readCell(item).unit;
    c.unit = c.unit?.def === placed?.def ? null : placed;
    if (isPlateLike(tile)) tile.state = null;
    return writeCell(c);
  }
  if (item === '!' || item === '&' || item === '$') {
    const unit = c.unit;
    if (!unit) return token;
    if (item === '!')
      unit.mark = unit.mark === null ? 'plain' : unit.mark === 'plain' ? 'deep' : null;
    else if (item === '&') unit.collar = !unit.collar;
    else unit.shackle = !unit.shackle;
    return writeCell(c);
  }
  if (tile.terrain.gate) return token;
  if (item.startsWith('w')) {
    const water = readCell(item).tile.terrain.water;
    tile.terrain.water = tile.terrain.water === water ? null : water;
    if (!tile.terrain.water) tile.terrain.grate = false;
  } else if (item === 'h') {
    if (!tile.terrain.water || c.unit) return token;
    tile.terrain.grate = !tile.terrain.grate;
  } else if (item === 'l') tile.terrain.lamp = !tile.terrain.lamp;
  else if (item.startsWith('{') && !COMPOUND_BRACE_NAMES.includes(item.slice(1, -1))) {
    // A registered piece: one per tile, the same again removes it, a solid one never under a unit.
    const piece = parsePieceToken(item.slice(1, -1));
    if (!piece) return token;
    if (tile.piece?.id === piece.id) tile.piece = null;
    else if (c.unit && pieceBlocksUnits({ ...tile, piece })) return token;
    else tile.piece = piece;
  } else if (item.startsWith('{')) {
    const next = readCell(item).tile.state;
    if (c.unit && isPlateLike({ ...tile, state: next })) return token;
    tile.state = tile.state?.id === next?.id ? null : next;
  } else if (item === '@') tile.terrain.vent = !tile.terrain.vent;
  else if (item === '_') tile.terrain.drop = !tile.terrain.drop;
  else if (item === '=') {
    if (c.unit) return token;
    tile.state = tile.state?.id === 'plate' ? null : readCell('=').tile.state;
  } else if (STATE_ITEMS.has(item)) {
    const next = readCell(item).tile.state;
    tile.state = tile.state?.id === next?.id ? null : next;
  }
  return writeCell(c);
}

/** Why a palette tap changed nothing (for a toast). */
export function whyNoEdit(item: PaletteItem): string {
  switch (item) {
    case '!':
    case '&':
    case '$':
      return 'Put a unit on the tile first';
    case '=':
      return 'A plate cannot sit under a unit';
    default:
      return 'Nothing to change there';
  }
}

/** The board as [y][x] cell tokens, in canonical form. */
export function cellTokens(s: BattleState): string[][] {
  return boardOf(s)
    .split('\n')
    .map((l) => l.trim().split(/\s+/));
}

export interface CellEdit {
  at: Coord;
  token: string;
}

/**
 * What painting `item` on `at` changes. A unit placed on a plate drops the plate; placing a member
 * who stands elsewhere moves them (the engine clears the old cell's unit).
 */
export function paletteEdits(s: BattleState, at: Coord, item: PaletteItem): CellEdit[] {
  const current = cellTokens(s)[at.y]?.[at.x] ?? '.';
  const token = toggleToken(current, item);
  return token === current ? [] : [{ at, token }];
}

/** Applies painted cells. A change to the tile alone keeps the unit standing there (hp, intent). */
export function applyEdits(s: BattleState, edits: readonly CellEdit[]): BattleState {
  let next = s;
  for (const { at, token } of edits) {
    const here = cellTokens(next)[at.y]?.[at.x] ?? '.';
    if (unitPart(here) === unitPart(token)) {
      const clone = cloneData(next);
      clone.tiles[at.y * clone.width + at.x] = parseCell(token, at).tile;
      next = clone;
    } else {
      next = labSetCell(next, at, token);
    }
  }
  return next;
}

const unitPart = (token: string): string => {
  const unit = readCell(token).unit;
  return unit ? serializeBoard({ width: 1, height: 1, tiles: [emptyTile()], units: [unit] }) : '';
};

// ── Export as a scenario ────────────────────────────────

/** What a Lab session started from: the board as it stood, lattices, hurt units, telegraphs. */
export interface LabBase {
  board: string;
  lattices: Record<MemberId, Lattice>;
  /** By cell label: units whose hp is not the default for their kind. */
  hp: Record<string, number>;
  /** Who stands on the board (their pages are exported with the scenario). */
  members: ApprenticeId[];
  /** By cell label: enemies that telegraph an attack, and where. */
  intents: Record<string, Dir>;
  inventions?: InventionLibrary;
}

type Dir = 'up' | 'right' | 'down' | 'left';

const defaultHp = (u: { kind: 'member' | 'enemy'; def: string }): number =>
  u.kind === 'member' ? MEMBERS[u.def as MemberId].hp : ENEMIES[u.def as EnemyId].hp;

export function baseOf(
  s: BattleState,
  lattices: Record<MemberId, Lattice>,
  starts: readonly Coord[] = [],
): LabBase {
  const hp: Record<string, number> = {};
  for (const u of livingUnits(s)) if (u.hp !== defaultHp(u)) hp[label(u.pos)] = u.hp;
  const intents: Record<string, Dir> = {};
  for (const e of enemies(s))
    if (e.hp > 0 && e.intent?.kind === 'attack') intents[label(e.pos)] = e.intent.dir;
  const board = starts.length > 0 ? boardWithStarts(s, starts) : boardOf(s);
  const members = membersOn(s);
  return { board, lattices, hp, members, intents, inventions: structuredClone(s.inventions) };
}

/** Who stands on the board now, in unit order. */
export const membersOn = (s: BattleState): ApprenticeId[] =>
  livingUnits(s)
    .filter((u) => u.kind === 'member')
    .map((u) => u.def as ApprenticeId);

/** Whose pages an export carries: the founding pair, and anyone else standing on the board. */
export function exportedMembers(onBoard: readonly ApprenticeId[]): ApprenticeId[] {
  return APPRENTICE_IDS.filter(
    (id) => (MEMBER_IDS as readonly string[]).includes(id) || onBoard.includes(id),
  );
}

/** A scenario that replays `actions` from `base`; `expected` is the log of `events`. */
export function toScenarioDef(
  id: string,
  base: LabBase,
  actions: readonly Action[],
  events: readonly GameEvent[],
): ScenarioDef {
  const lattices = Object.fromEntries(
    exportedMembers(base.members).map((m) => [m, serializeLattice(base.lattices[m])]),
  );
  return {
    id,
    title: id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    note: 'Exported from the Lab.',
    board: base.board,
    lattices,
    ...(base.inventions && Object.keys(base.inventions).length
      ? { inventions: base.inventions }
      : {}),
    ...(Object.keys(base.hp).length ? { hp: base.hp } : {}),
    intents: base.intents,
    demo: actions,
    expected: describeLog(events),
  };
}

const quote = (text: string): string => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function block(text: string, indent: string): string {
  const lines = text.split('\n').map((l) => `${indent}  ${l}`);
  return `\`\n${lines.join('\n')}\n${indent}\``;
}

/** A value as a single-line TypeScript literal (strings in single quotes). */
function literal(v: unknown): string {
  if (typeof v === 'string') return quote(v);
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`;
  if (v !== null && typeof v === 'object') {
    const body = Object.entries(v).map(
      ([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k)}: ${literal(x)}`,
    );
    return body.length ? `{ ${body.join(', ')} }` : '{}';
  }
  return String(v);
}

/** A TypeScript object literal, ready to paste into the `SCENARIOS` list in `src/data/scenarios.ts`. */
export function formatScenario(def: ScenarioDef): string {
  const i = '    ';
  const out = [
    '  {',
    `${i}id: ${quote(def.id)},`,
    `${i}title: ${quote(def.title)},`,
    `${i}note: ${quote(def.note)},`,
    `${i}board: ${block(def.board, i)},`,
  ];
  if (def.lattices) {
    out.push(`${i}lattices: {`);
    for (const [m, text] of Object.entries(def.lattices)) {
      out.push(`${i}  ${m}: ${block(text ?? '', `${i}  `)},`);
    }
    out.push(`${i}},`);
  }
  if (def.hp) out.push(`${i}hp: ${literal(def.hp)},`);
  if (def.inventions) out.push(`${i}inventions: ${literal(def.inventions)},`);
  if (def.intents) out.push(`${i}intents: ${literal(def.intents)},`);
  const list = (name: string, items: readonly string[]): void => {
    if (items.length === 0) out.push(`${i}${name}: [],`);
    else out.push(`${i}${name}: [`, ...items.map((t) => `${i}  ${t},`), `${i}],`);
  };
  list('demo', def.demo.map(literal));
  list('expected', def.expected.map(quote));
  out.push('  },');

  return out.join('\n');
}

/** "Draughtsman" then its lattice, for each member (the Lab's Copy lattices). */
export function formatLattices(
  lattices: Record<MemberId, Lattice>,
  ids: readonly MemberId[] = MEMBER_IDS,
): string {
  return ids.map((m) => `${MEMBERS[m].name}\n${serializeLattice(lattices[m])}`).join('\n\n');
}

/**
 * Who the Lab's pickers list: the household plus anyone revealed (a note under the door), so a
 * campaign Lab never names an unmet recruit. Dev mode keeps everyone; `keep` (the current
 * lineup and selections) always stays so a picker never loses its own value.
 */
export function labRoster(
  p: Profile,
  devMode: boolean,
  keep: readonly ApprenticeId[] = [],
): readonly ApprenticeId[] {
  if (devMode) return APPRENTICE_IDS;
  return APPRENTICE_IDS.filter((id) => isRevealed(p, id) || keep.includes(id));
}
