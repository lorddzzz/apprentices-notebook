import { SUGGESTIONS, TIER_MARKS, TIER_NAMES, TUNING } from '$data';
import {
  baseGlyphCost,
  type Coord,
  type Dir,
  deadCells,
  economyOf,
  type GlyphDef,
  type GlyphId,
  type GlyphRecord,
  glyphVersions,
  type InventionLibrary,
  libraryOf,
  nameOf,
  type Profile,
  recordOf,
  reliabilityOf,
  rewardsOf,
  roleOf,
  type TierLevel,
  windowTiers,
} from '$engine';
import { pageBounds } from '$engine/page';

/** The profiler's view-model (plan M8–M13, U1): everything the Glyph sheet shows, as plain data. */

export interface TierView {
  tier: TierLevel;
  mark: string;
  name: string;
}

export interface FormView {
  /** Casts in the window so far, at most `tierWindow`. */
  count: number;
  full: boolean;
  /** "n / 10": shown below a full window. */
  progress: string;
  /** The window's Economy value and Reliability share. */
  economy: number;
  reliability: number;
  /** The tiers the window earns now (none below a full window). */
  tiers: { economy: TierView; reliability: TierView };
}

export interface VersionRow {
  version: number;
  current: boolean;
  casts: number;
  economy: TierView;
  reliability: TierView;
  /** "v1 · 15 casts · Economy ◔ · Reliability ◑" */
  line: string;
}

export interface InsideCell {
  key: string;
  rune: GlyphDef['cells'][number]['rune'];
  dir?: Dir;
  col: number;
  row: number;
  entry: boolean;
  dead: boolean;
  open: boolean;
}

export interface InsideView {
  cols: number;
  rows: number;
  /** Large or sparse bounds use bounded camera rendering, never CSS grid tracks. */
  viewport: boolean;
  cells: InsideCell[];
  entry: { col: number; row: number };
  exits: { col: number; row: number; dir: Dir; extra: boolean }[];
  /** The active extra exit's local side, or null (none or not yet earned). */
  extraExit: Dir | null;
}

export interface ProfilerView {
  header: string;
  economy: TierView;
  reliability: TierView;
  casts: number;
  /** Average harm a cast to one decimal, or null before the first cast. */
  avgHarm: string | null;
  ink: { base: number; now: number };
  /** "4", or "4 → 3" with an Economy discount. */
  inkText: string;
  form: FormView;
  inside: InsideView;
  /** The one suggestion line, or null (M13). */
  suggestion: string | null;
  versions: VersionRow[];
}

export const tierView = (tier: TierLevel): TierView => ({
  tier,
  mark: TIER_MARKS[tier],
  name: TIER_NAMES[tier],
});

const fill = (template: string, slots: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(slots[k] ?? ''));

const round1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
const key = (c: Coord): string => `${c.x},${c.y}`;
const readingOrder = (a: Coord, b: Coord): number => a.y - b.y || a.x - b.x;

export function formOf(record: GlyphRecord): FormView {
  const count = record.recent.length;
  const tiers = windowTiers(record.recent);
  return {
    count,
    full: count >= TUNING.tierWindow,
    progress: `${count} / ${TUNING.tierWindow}`,
    economy: economyOf(record.recent),
    reliability: reliabilityOf(record.recent),
    tiers: { economy: tierView(tiers.economy), reliability: tierView(tiers.reliability) },
  };
}

/** The inside in the Glyph's own frame, shifted to start at column 1, row 1. */
export function insideOfView(
  def: GlyphDef,
  dead: readonly Coord[],
  extraActive: boolean,
): InsideView {
  const bounds = pageBounds([def.entry, ...def.cells.map((c) => c.at)], 0);
  const position = (at: Coord) => ({
    col: at.x - bounds.origin.x + 1,
    row: at.y - bounds.origin.y + 1,
  });
  const exits = def.exits.map((exit) => ({ ...position(exit.from), dir: exit.dir, extra: false }));
  const firstExit = def.exits[0];
  if (extraActive && def.extraExit && firstExit) {
    exits.push({ ...position(firstExit.from), dir: def.extraExit, extra: true });
  }
  const deadKeys = new Set(dead.map(key));
  const open = new Set(def.params);
  return {
    cols: bounds.width,
    rows: bounds.height,
    viewport: bounds.width > 12 || bounds.height > 12,
    entry: position(def.entry),
    exits,
    cells: def.cells.map((c) => ({
      key: key(c.at),
      rune: c.rune,
      dir: c.dir,
      ...position(c.at),
      entry: c.at.x === def.entry.x && c.at.y === def.entry.y,
      dead: deadKeys.has(key(c.at)),
      open: open.has(key(c.at)),
    })),
    extraExit: extraActive ? def.extraExit : null,
  };
}

/** What lifting `cell` would save in base ink (M13). */
const savingWithout = (def: GlyphDef, cell: Coord, library: InventionLibrary): number =>
  baseGlyphCost(def, library) -
  baseGlyphCost({ ...def, cells: def.cells.filter((c) => key(c.at) !== key(cell)) }, library);

/**
 * One line at a time (M13), in order: a dead cell (first in reading order); a trigger that ran but
 * whose neighbour never fired, which only shows before a cell can count as dead; idle casts.
 */
export function suggestionOf(
  def: GlyphDef,
  record: GlyphRecord,
  library: InventionLibrary = {},
): string | null {
  const minY = Math.min(0, ...def.cells.map((c) => c.at.y));
  const dead = deadCells(def, record).sort(readingOrder)[0];
  const deadCell = dead && def.cells.find((c) => key(c.at) === key(dead));
  if (dead && deadCell) {
    const saved = savingWithout(def, dead, library);
    return fill(saved > 0 ? SUGGESTIONS.deadCell : SUGGESTIONS.deadCellNoInk, {
      rune: nameOf(deadCell.rune),
      row: dead.y - minY + 1,
      casts: record.casts,
      ink: saved,
    });
  }
  const fired = (c: Coord) => record.fired[key(c)] ?? 0;
  const closed = [...def.cells]
    .sort((a, b) => readingOrder(a.at, b.at))
    .find(
      (t) =>
        roleOf(t.rune) === 'trigger' &&
        fired(t.at) > 0 &&
        def.cells.some(
          (n) =>
            Math.abs(n.at.x - t.at.x) + Math.abs(n.at.y - t.at.y) === 1 &&
            roleOf(n.rune) !== 'aura' &&
            fired(n.at) === 0,
        ),
    );
  if (closed) return fill(SUGGESTIONS.closedTrigger, { rune: nameOf(closed.rune) });
  const idle = record.recent.filter((s) => !s.meaningful).length;
  return idle > 0 ? fill(SUGGESTIONS.idleCasts, { idle, window: record.recent.length }) : null;
}

/** Every version, newest first, for the Versions list. */
export function versionRows(p: Profile, id: GlyphId): VersionRow[] {
  return glyphVersions(p, id).map(({ def, record, current }) => {
    const economy = tierView(record.best.economy);
    const reliability = tierView(record.best.reliability);
    return {
      version: def.version,
      current,
      casts: record.casts,
      economy,
      reliability,
      line: `v${def.version} · ${record.casts} casts · Economy ${economy.mark} · Reliability ${reliability.mark}`,
    };
  });
}

/** The sheet's profile of `def`, the current version as saved in `p.glyphs`. */
export function profilerView(p: Profile, def: GlyphDef): ProfilerView {
  const record = recordOf(p, def.id, def.version);
  const rewards = rewardsOf(record);
  const economy = tierView(record.best.economy);
  const reliability = tierView(record.best.reliability);
  const library = libraryOf(p.inventions ?? []);
  const base = baseGlyphCost(def, library);
  const now = Math.max(1, base - rewards.discount);
  return {
    header: `${def.name} v${def.version} · Economy ${economy.mark} ${economy.name} · Reliability ${reliability.mark} ${reliability.name}`,
    economy,
    reliability,
    casts: record.casts,
    avgHarm: record.casts > 0 ? round1(record.harm / record.casts) : null,
    ink: { base, now },
    inkText: now < base ? `${base} → ${now}` : `${base}`,
    form: formOf(record),
    inside: insideOfView(def, deadCells(def, record), rewards.extraExit),
    suggestion: suggestionOf(def, record, library),
    versions: versionRows(p, def.id),
  };
}
