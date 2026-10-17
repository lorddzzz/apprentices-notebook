import {
  DRAFTS,
  type DraftAim,
  type DraftDef,
  type DraftGoal,
  type DraftId,
  type DraftTest,
  type LootTableId,
  MEMBERS,
  RUNES,
  type RuneId,
} from '$data';
import { applyAction, createBattle, isLegal } from './battle';
import type { GameEvent } from './events';
import type { Coord } from './grid';
import { compileLattice } from './lattice';
import { parseLabel, parseLattice } from './notation';
import { innerMeta, insideIssues } from './revision';
import type {
  Aim,
  BattleState,
  DraftCopy,
  GlyphDef,
  GlyphInside,
  GlyphRecord,
  LootItem,
  PlacedRune,
  Profile,
  Spell,
  Trip,
} from './types';
import { isGlyph } from './types';

/**
 * The owner's drafts (design research-and-mastery §4.7, plan M29–M36), as folios (BL-14, folios
 * plan F1–F19): loot, the tray, the test suite, turning pages, repair. Never import `run.ts` here: run.ts imports this module (`nextDraft`, `bankDrafts`).
 */

/** One run of a draft's test stage (M31): the log, the final state, and each goal line's tick. */
export interface DraftRun {
  events: GameEvent[];
  state: BattleState;
  passed: boolean;
  goals: { goal: DraftGoal; met: boolean }[];
}

/** The glyph id a draft carries on its test stage (and in a Payload's `host`). */
const TEST_GLYPH = 'draft';

/** The table depths, shallowest first (M30). */
const DEPTHS: readonly LootTableId[] = ['shallow', 'deep', 'heart'];

export function draftById(id: DraftId): DraftDef | undefined {
  return DRAFTS.find((d) => d.id === id);
}

function need(id: DraftId): DraftDef {
  const d = draftById(id);
  if (!d) throw new Error(`No draft ${id}`);
  return d;
}

/** The owner's page as an inside: local frame, entry at (0,0), flow entering rightward (M29). */
export function draftInside(d: DraftDef): GlyphInside {
  const entry = parseLabel(d.entry);
  const cells: PlacedRune[] = [];
  for (const r of parseLattice(d.inside).runes) {
    if (isGlyph(r)) throw new Error(`Draft ${d.id}: a page holds runes, not Glyphs`);
    const at = { x: r.at.x - entry.x, y: r.at.y - entry.y };
    cells.push(r.dir ? { at, rune: r.rune, dir: r.dir } : { at, rune: r.rune });
  }
  return { kind: d.kind, cells, entry: { x: 0, y: 0 } };
}

/** The inside as the Glyph the test stage places (id `draft`, nothing proven, no settings). */
function testGlyph(d: DraftDef, inside: GlyphInside): GlyphDef {
  const { exits, idiom } = innerMeta(inside);
  return {
    id: TEST_GLYPH,
    name: d.name,
    kind: inside.kind,
    cells: inside.cells,
    entry: inside.entry,
    exits,
    idiom,
    version: 1,
    params: [],
    extraExit: null,
  };
}

const NO_HOST = '. . . . .\nG:draft> . . . .\n. . . . .';

/** The Draughtsman's spells for the test: a Spell draft alone, or a Payload in its host (M31). */
function testSpells(d: DraftDef, inside: GlyphInside): Spell[] {
  const def = testGlyph(d, inside);
  const lattice = parseLattice(d.kind === 'payload' && d.host ? d.host : NO_HOST);
  return compileLattice(lattice, MEMBERS.draughtsman.affinity, { [def.id]: def }).spells;
}

function aimOf(aim: DraftAim): Aim {
  if ('dir' in aim) return { kind: 'dir', dir: aim.dir };
  if ('tile' in aim) return { kind: 'tile', at: parseLabel(aim.tile) };
  return { kind: 'ally', unit: aim.ally };
}

/** Each goal line of `goal` (an `all` is flattened), for the desk's list. */
function goalLines(goal: DraftGoal): DraftGoal[] {
  return 'all' in goal ? goal.all.flatMap(goalLines) : [goal];
}

/** Runs one test stage with `inside` compiled as the Draughtsman's (M31). Never throws on a bad page. */
export function draftTest(d: DraftDef, t: DraftTest, inside: GlyphInside): DraftRun {
  let spells: Spell[] = [];
  try {
    spells = testSpells(d, inside);
  } catch {
    // A page the compiler can't walk has no spell: the test simply fails.
  }
  const made = createBattle({
    title: d.name,
    board: t.board,
    seed: 1,
    lab: true,
    party: { draughtsman: { spells } },
    intents: {},
    ...(t.hp ? { hp: t.hp } : {}),
  });
  let state = made.state;
  const events = [...made.events];
  const spell = spells[0];
  if (spell) {
    const cast = {
      type: 'cast',
      unit: 'draughtsman',
      spell: spell.key,
      aim: aimOf(t.aim),
    } as const;
    if (isLegal(state, cast) === null) {
      const r = applyAction(state, cast);
      state = r.state;
      events.push(...r.events);
      if (t.endRound && state.phase === 'player') {
        const e = applyAction(state, { type: 'endTurn' });
        state = e.state;
        events.push(...e.events);
      }
    }
  }
  const goals = goalLines(t.goal).map((goal) => ({ goal, met: checkGoal(goal, events, state) }));
  return { events, state, goals, passed: goals.every((g) => g.met) };
}

/** One goal against a test's log and final state (M32). */
export function checkGoal(
  goal: DraftGoal,
  events: readonly GameEvent[],
  state: BattleState,
): boolean {
  if ('all' in goal) return goal.all.every((g) => checkGoal(g, events, state));
  if ('happens' in goal) {
    return events.filter((e) => e.type === goal.happens).length >= (goal.atLeast ?? 1);
  }
  if ('hurt' in goal) {
    let total = 0;
    for (const e of events) if (e.type === 'damage' && e.target.id === goal.hurt) total += e.amount;
    return total >= goal.atLeast;
  }
  const unit = (id: string) => state.units.find((u) => u.id === id);
  if ('dies' in goal) {
    const u = unit(goal.dies);
    return events.some((e) => e.type === 'died' && e.unit.id === goal.dies) || (!!u && u.hp <= 0);
  }
  if ('spared' in goal) {
    const u = unit(goal.spared);
    return !!u && u.hp > 0 && !events.some((e) => e.type === 'died' && e.unit.id === goal.spared);
  }
  const at: Coord = parseLabel(goal.tile);
  const tile = state.tiles[at.y * state.width + at.x];
  if (!tile) return false;
  switch (goal.has) {
    case 'fire':
      return tile.fire > 0;
    case 'oil':
      return tile.oil;
    case 'ink':
      return tile.ink;
    case 'steam':
      return tile.steam > 0;
    case 'plate':
      return tile.plate;
  }
}

/** The last page's index (0-based). */
export const lastPage = (d: DraftDef): number => d.pages.length - 1;

/** The parts a folio may use on page `page`: the owner's page runes plus the scraps of pages 0..page (F1). */
export function trayCounts(d: DraftDef, page: number): Partial<Record<RuneId, number>> {
  const tray: Partial<Record<RuneId, number>> = {};
  const add = (r: RuneId, n: number) => {
    tray[r] = (tray[r] ?? 0) + n;
  };
  for (const c of draftInside(d).cells) add(c.rune, 1);
  for (const p of d.pages.slice(0, page + 1)) {
    for (const [r, n] of Object.entries(p.scraps) as [RuneId, number][]) add(r, n);
  }
  return tray;
}

/** Why `inside` doesn't fit the tray of `page` (the first rune over its count), or null (F1). */
export function trayIssue(d: DraftDef, page: number, inside: GlyphInside): string | null {
  const tray = trayCounts(d, page);
  const used: Partial<Record<RuneId, number>> = {};
  for (const c of inside.cells) used[c.rune] = (used[c.rune] ?? 0) + 1;
  for (const [r, n] of Object.entries(used) as [RuneId, number][]) {
    const have = tray[r] ?? 0;
    if (n > have) {
      return have === 0
        ? `The drawer has no ${RUNES[r].name}`
        : `The drawer has no more ${RUNES[r].name}`;
    }
  }
  return null;
}

/** Every unlocked test against one inside: tests 0..page, in page order (F4). */
export interface FolioRun {
  tests: DraftRun[];
  passed: boolean;
}

/** Runs tests 0..`page` of the folio on `inside` (F4). Never throws on a bad page. */
export function folioRun(d: DraftDef, page: number, inside: GlyphInside): FolioRun {
  const tests = d.pages.slice(0, page + 1).map((p) => draftTest(d, p.test, inside));
  return { tests, passed: tests.every((t) => t.passed) };
}

/** The record a mended folio's Glyph v1 starts with: bronze Reliability reached, window empty (F9). */
export function draftRecord(): GlyphRecord {
  throw new Error('TODO E1');
}

/** Turns to the next page once every unlocked test passes; keeps the working inside (F2, F7). */
export function turnPage(_p: Profile, _id: DraftId): Profile {
  throw new Error('TODO E1');
}

/** The draft a won fight's loot table may offer, or null (M30). */
export function nextDraft(p: Profile, t: Trip, table: LootTableId): DraftId | null {
  if (p.glyphs.length === 0) return null;
  if (t.loot.some((i) => i.kind === 'draft')) return null;
  const reach = DEPTHS.indexOf(table);
  const owned = new Set(p.drafts.map((c) => c.id));
  const next = [...DRAFTS]
    .sort((a, b) => a.order - b.order)
    .find((d) => !owned.has(d.id) && DEPTHS.indexOf(d.depth) <= reach);
  return next?.id ?? null;
}

/** Banks the trip's draft loot into `Profile.drafts` on return (M30). */
export function bankDrafts(p: Profile, loot: readonly LootItem[]): Profile {
  const drafts: DraftCopy[] = [...p.drafts];
  for (const item of loot) {
    if (item.kind !== 'draft' || drafts.some((c) => c.id === item.draft)) continue;
    const d = draftById(item.draft);
    if (d) drafts.push({ id: d.id, inside: draftInside(d), page: 0, repaired: false });
  }
  return drafts.length === p.drafts.length ? p : { ...p, drafts };
}

function copyOf(p: Profile, id: DraftId): DraftCopy {
  const c = p.drafts.find((x) => x.id === id);
  if (!c) throw new Error(`You don't have the draft ${id}`);
  return c;
}

function withCopy(p: Profile, next: DraftCopy): Profile {
  return { ...p, drafts: p.drafts.map((c) => (c.id === next.id ? next : c)) };
}

/** Marks a passing, valid draft repaired and adds its Glyph v1 (M33). Throws why not. */
export function repairDraft(p: Profile, id: DraftId): Profile {
  const d = need(id);
  const copy = copyOf(p, id);
  if (copy.repaired) throw new Error(`${d.name} is already mended`);
  if (copy.page < lastPage(d)) throw new Error('There are more pages to mend');
  const issue = insideIssues(copy.inside)[0];
  if (issue) throw new Error(issue.message);
  const tray = trayIssue(d, copy.page, copy.inside);
  if (tray) throw new Error(tray);
  if (!folioRun(d, copy.page, copy.inside).passed) throw new Error('The page still fails a test');
  const { exits, idiom } = innerMeta(copy.inside);
  let n = p.glyphs.length + 1;
  while (p.glyphs.some((g) => g.id === `g${n}`) || p.glyphArchive.some((g) => g.id === `g${n}`)) {
    n += 1;
  }
  const glyph: GlyphDef = {
    id: `g${n}`,
    name: d.name,
    kind: copy.inside.kind,
    cells: structuredClone([...copy.inside.cells]),
    entry: { ...copy.inside.entry },
    exits,
    idiom,
    version: 1,
    params: [],
    extraExit: null,
    draft: d.id,
  };
  const idioms = idiom && !p.idioms.includes(idiom) ? [...p.idioms, idiom] : p.idioms;
  return withCopy({ ...p, glyphs: [...p.glyphs, glyph], idioms }, { ...copy, repaired: true });
}

/** Saves the working copy of a draft's inside (M34). The test and `repairDraft` judge it. */
export function editDraft(p: Profile, id: DraftId, inside: GlyphInside): Profile {
  const d = need(id);
  const copy = copyOf(p, id);
  if (copy.repaired) throw new Error(`${d.name} is already mended`);
  if (inside.kind !== d.kind) throw new Error('A draft keeps its kind');
  return withCopy(p, { ...copy, inside: structuredClone(inside) });
}

/** "Start over": the working copy goes back to the owner's page; unlocked pages stay (F3). */
export function resetDraft(p: Profile, id: DraftId): Profile {
  const d = need(id);
  const copy = copyOf(p, id);
  if (copy.repaired) throw new Error(`${d.name} is already mended`);
  return withCopy(p, { ...copy, inside: draftInside(d) });
}
