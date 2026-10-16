import { DRAFTS, type DraftDef, type DraftGoal, RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  type ActionResult,
  type BattleSpec,
  type CellKey,
  createBattle,
  type DraftCopy,
  type GameEvent,
  type GlyphInside,
  innerFired,
  insideIssues,
  key,
  neighbors4,
  type Profile,
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

/**
 * The editor's palette for a draft (M34): its own page's runes and every owned rune, with no
 * counts, because ownership never blocks a test.
 */
export function draftPalette(inside: GlyphInside, p: Profile): PaletteSlot[] {
  const own = new Set<RuneId>(inside.cells.map((c) => c.rune));
  return RUNE_IDS.filter((r) => own.has(r) || p.collection[r] > 0).map((rune) => ({
    rune,
    count: null,
  }));
}

/** The test stage before the cast: the board and its creation events, for the playback's start. */
export function draftStage(d: DraftDef): ActionResult {
  const spec: BattleSpec = {
    title: d.name,
    board: d.test.board,
    seed: 1,
    lab: true,
    party: { draughtsman: { spells: [] } },
    intents: {},
    ...(d.test.hp ? { hp: d.test.hp } : {}),
  };
  return createBattle(spec);
}
