import {
  DRAFTS,
  type DraftDef,
  type DraftGoal,
  type DraftTest,
  RUNE_IDS,
  RUNES,
  type RuneId,
} from '$data';
import {
  type ActionResult,
  type BattleSpec,
  type CellKey,
  createBattle,
  type DraftCopy,
  type FolioRun,
  type GameEvent,
  type GlyphInside,
  innerFired,
  insideIssues,
  key,
  neighbors4,
  trayCounts,
} from '$engine';
import type { PaletteSlot } from './study';

/** The Glyph id a draft carries on its test stage (the engine's `G:draft>` in a host). */
const TEST_GLYPH = 'draft';

const EVENT_LINES: Record<string, string> = {
  ignite: 'Something catches fire',
  detonate: 'Something detonates',
  conduct: 'A current runs through the metal',
  arc: 'A spark arcs across a gap',
  extinguish: 'A fire is put out',
  slide: 'Something slides',
  smear: 'Ink is smeared',
  heated: 'Brass heats up',
  stained: 'Something is stained',
  pierced: 'Something is pierced',
};

const TILE_LINES = {
  fire: 'is burning',
  oil: 'is slick with oil',
  ink: 'is marked with ink',
  steam: 'is full of steam',
  plate: 'holds a pressure plate',
} as const;

const times = (n: number): string => (n === 2 ? 'twice' : `${n} times`);

/** One goal as a plain sentence (`all` is flattened by `goalSentences`). */
function sentence(goal: Exclude<DraftGoal, { all: readonly DraftGoal[] }>): string {
  if ('happens' in goal) {
    const line = EVENT_LINES[goal.happens] ?? goal.happens;
    return goal.atLeast && goal.atLeast > 1 ? `${line}, at least ${times(goal.atLeast)}` : line;
  }
  if ('hurt' in goal) return `${goal.hurt} takes at least ${goal.atLeast}`;
  if ('dies' in goal) return `${goal.dies} dies`;
  if ('spared' in goal) return `${goal.spared} is left standing`;
  return `${goal.tile} ${TILE_LINES[goal.has]}`;
}

/** The goal as the desk's list of lines, in order. */
export function goalSentences(goal: DraftGoal): string[] {
  return 'all' in goal ? goal.all.flatMap(goalSentences) : [sentence(goal)];
}

/** One line of the desk's list: the draft's content with the player's copy. */
export interface DeskRow {
  def: DraftDef;
  copy: DraftCopy;
}

/** The banked drafts in story order; a copy whose draft no longer exists is dropped. */
export function deskRows(drafts: readonly DraftCopy[]): DeskRow[] {
  const rows: DeskRow[] = [];
  for (const copy of drafts) {
    const def = DRAFTS.find((d) => d.id === copy.id);
    if (def) rows.push({ def, copy });
  }
  return rows.sort((a, b) => a.def.order - b.def.order);
}

/** The label of the Study scene's link, or null while no draft is banked. */
export function draftsLabel(drafts: readonly DraftCopy[]): string | null {
  return drafts.length > 0 ? `Drafts · ${drafts.length}` : null;
}

export type CellMark = 'lit' | 'faded';

/**
 * How the page reads: before a run, the cells the static walk never reaches are faded; after one,
 * the cells that fired are lit (an aura touching one counts) and the rest are faded.
 */
export function cellMarks(
  inside: GlyphInside,
  events: readonly GameEvent[] | null,
): Record<CellKey, CellMark> {
  const marks: Record<CellKey, CellMark> = {};
  if (events === null) {
    for (const i of insideIssues(inside)) {
      if (i.at && (i.kind === 'stranded' || i.kind === 'aura')) marks[key(i.at)] = 'faded';
    }
    return marks;
  }
  const lit = new Set<CellKey>(innerFired(events, TEST_GLYPH));
  for (const c of inside.cells) {
    if (RUNES[c.rune].family === 'aura' && neighbors4(c.at).some((n) => lit.has(key(n)))) {
      lit.add(key(c.at));
    }
  }
  for (const c of inside.cells) marks[key(c.at)] = lit.has(key(c.at)) ? 'lit' : 'faded';
  return marks;
}

/** The editor's palette for a folio (BL-14, F1): only the tray of `page`, with counts. */
export function trayPalette(d: DraftDef, page: number): PaletteSlot[] {
  const tray = trayCounts(d, page);
  return RUNE_IDS.filter((r) => (tray[r] ?? 0) > 0).map((rune) => ({
    rune,
    count: tray[rune] ?? 0,
  }));
}

/** A test stage before the cast: the board and its creation events, for the playback's start. */
export function draftStage(d: DraftDef, test: DraftTest): ActionResult {
  const spec: BattleSpec = {
    title: d.name,
    board: test.board,
    seed: 1,
    lab: true,
    party: { draughtsman: { spells: [] } },
    intents: {},
    ...(test.hp ? { hp: test.hp } : {}),
  };
  return createBattle(spec);
}

/** The list row's page label (F18): "page 2 / 3", or "mended". */
export function pageLabel(def: DraftDef, copy: DraftCopy): string {
  return copy.repaired ? 'mended' : `page ${copy.page + 1} / ${def.pages.length}`;
}

/** The note fragments the folio has shown so far (a mended folio shows them all), oldest first. */
export function noteFragments(def: DraftDef, copy: DraftCopy): string[] {
  const shown = copy.repaired ? def.pages.length : copy.page + 1;
  return def.pages.slice(0, shown).map((p) => p.note);
}

/** One chip of the drawer: a tray rune with how many are still free on the page. */
export interface DrawerChip {
  rune: RuneId;
  free: number;
  total: number;
  /** A scrap the latest page just dropped. */
  fresh: boolean;
}

/** The drawer for `page` with the runes `inside` already uses taken off the counts (F1, F7). */
export function drawerView(d: DraftDef, page: number, inside: GlyphInside): DrawerChip[] {
  const used: Partial<Record<RuneId, number>> = {};
  for (const c of inside.cells) used[c.rune] = (used[c.rune] ?? 0) + 1;
  const dropped = page > 0 ? (d.pages[page]?.scraps ?? {}) : {};
  const tray = trayCounts(d, page);
  return trayPalette(d, page).map(({ rune }) => {
    const total = tray[rune] ?? 0;
    return {
      rune,
      total,
      free: Math.max(0, total - (used[rune] ?? 0)),
      fresh: (dropped[rune] ?? 0) > 0,
    };
  });
}

/** The "+ Oil, + Amplify" line for the scraps page `page` dropped, or null (F7). */
export function scrapsLine(d: DraftDef, page: number): string | null {
  const scraps = d.pages[page]?.scraps ?? {};
  const parts = RUNE_IDS.filter((r) => (scraps[r] ?? 0) > 0).map((r) => {
    const n = scraps[r] ?? 0;
    return `+ ${RUNES[r].name}${n > 1 ? ` ×${n}` : ''}`;
  });
  return parts.length > 0 ? parts.join(', ') : null;
}

export type ChipState = 'pass' | 'fail' | 'broke' | 'idle';

/** A test that passed on the previous run and fails now (F6). Never saved. */
export function brokeFlags(prev: readonly boolean[] | null, run: FolioRun): boolean[] {
  return run.tests.map((t, i) => !t.passed && prev?.[i] === true);
}

/** The test chips: one per unlocked test, `idle` (○) until a run covers it. */
export function testChips(
  page: number,
  run: FolioRun | null,
  broke: readonly boolean[],
): { n: number; state: ChipState }[] {
  return Array.from({ length: page + 1 }, (_, i) => {
    const t = run?.tests[i];
    const state: ChipState = !t ? 'idle' : t.passed ? 'pass' : broke[i] ? 'broke' : 'fail';
    return { n: i + 1, state };
  });
}

/** The test whose board plays (F5): the first failing one, else the newest. */
export function playedTest(run: FolioRun): number {
  const failing = run.tests.findIndex((t) => !t.passed);
  return failing >= 0 ? failing : run.tests.length - 1;
}
