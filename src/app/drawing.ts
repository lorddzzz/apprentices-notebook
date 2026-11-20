import { type Drawing, ENEMIES, type EnemyId } from '$data';
import { COSTS } from '$data/drawing';
import type { Profile, SaveData, Trip } from '$engine';
import {
  checkDrawing,
  costOf,
  drawingsOf,
  endingOf,
  type Issue,
  NAME_MAX,
  type Pen,
  paletteOf,
  parseInkedState,
  penOf,
  storeDrawing,
  type WeightBand,
  weightBand,
} from '$engine/drawing';

/** The drawing table's view model (EN-6): rows from the palette, greyed reasons, pen and depth. */

export type PickElement = 'rule' | 'foe' | 'piece' | 'shape' | 'heart';

export interface ElementRow {
  element: PickElement;
  id: string;
  label: string;
  cost: number;
  picked: boolean;
  /** Why the row cannot be picked (the engine's sentence), or null. */
  greyed: string | null;
}

export interface TableView {
  slots: (Drawing | null)[];
  draft: Drawing;
  pen: Pen;
  cost: number;
  band: WeightBand;
  depth: string;
  rows: Record<PickElement, ElementRow[]>;
  issues: Issue[];
  canSave: boolean;
  locked: boolean;
}

export const FOES_MAX = 3;
export const PIECES_MAX = 2;
export const LENGTHS: readonly Drawing['length'][] = [3, 4, 5, 6];
export const LENGTH_WORD: Record<Drawing['length'], string> = {
  3: 'three rooms',
  4: 'four rooms',
  5: 'five rooms',
  6: 'six rooms',
};
export const DEPTH_WORDS: Record<WeightBand, string> = {
  light: 'a shallow page',
  medium: 'a deep page',
  heavy: 'the deepest page',
};
export const EMPTY_SLOT = 'a district not yet drawn';
export const NONE_ID = 'none';
export const PLAIN_ID = 'plain';

const SLOT_NAMES = ['the first page', 'the second page', 'the third page'] as const;
export const slotName = (slot: 0 | 1 | 2): string => SLOT_NAMES[slot];

/** `canals:current` becomes "current", `bathhouses:boilOver` "boil over". */
export function kitLabel(id: string): string {
  const tail = id.slice(id.indexOf(':') + 1);
  return tail.replace(/([A-Z])/g, ' $1').toLowerCase();
}

/** Plain, length 3, no rule, the first master of the palette and its first foe (a page needs one). */
export function blankDrawing(p: Profile): Drawing {
  const palette = paletteOf(p);
  const foe = palette.foes[0];
  return {
    name: '',
    rule: null,
    foes: foe === undefined ? [] : [foe],
    pieces: [],
    shape: 'plain',
    length: 3,
    heart: palette.masters[0] ?? 'marginalia',
  };
}

export const rename = (d: Drawing, name: string): Drawing => ({
  ...d,
  name: name.slice(0, NAME_MAX),
});
export const setLength = (d: Drawing, length: Drawing['length']): Drawing => ({ ...d, length });

const without = <T>(list: readonly T[], x: T): T[] => list.filter((y) => y !== x);

/**
 * One tap on a row. Rule, shape and heart take one (tapping the rule or shape again clears it);
 * foes hold at most three (and keep one), pieces at most two. Over a limit the draft is returned as it was.
 */
export function toggle(draft: Drawing, element: PickElement, id: string): Drawing {
  switch (element) {
    case 'rule': {
      const rule = id === NONE_ID || draft.rule === id ? null : (id as Drawing['rule']);
      return { ...draft, rule };
    }
    case 'shape': {
      const shape = id === PLAIN_ID || draft.shape === id ? 'plain' : (id as Drawing['shape']);
      return { ...draft, shape };
    }
    case 'heart':
      return { ...draft, heart: id as Drawing['heart'] };
    case 'foe': {
      const foe = id as EnemyId;
      if (draft.foes.includes(foe)) {
        return draft.foes.length <= 1 ? draft : { ...draft, foes: without(draft.foes, foe) };
      }
      return draft.foes.length >= FOES_MAX ? draft : { ...draft, foes: [...draft.foes, foe] };
    }
    case 'piece': {
      const piece = id as Drawing['pieces'][number];
      if (draft.pieces.includes(piece)) return { ...draft, pieces: without(draft.pieces, piece) };
      return draft.pieces.length >= PIECES_MAX
        ? draft
        : { ...draft, pieces: [...draft.pieces, piece] };
    }
  }
}

function isPicked(d: Drawing, element: PickElement, id: string): boolean {
  switch (element) {
    case 'rule':
      return id === NONE_ID ? d.rule === null : d.rule === id;
    case 'shape':
      return id === PLAIN_ID ? d.shape === 'plain' : d.shape === id;
    case 'heart':
      return d.heart === id;
    case 'foe':
      return d.foes.includes(id as EnemyId);
    case 'piece':
      return d.pieces.includes(id as Drawing['pieces'][number]);
  }
}

const LIMIT_SENTENCE: Partial<Record<PickElement, string>> = {
  foe: 'Three kinds at most.',
  piece: 'Two extra pieces at most.',
};

const enemyName = (id: string): string => ENEMIES[id as EnemyId]?.name ?? id;

interface Candidate {
  id: string;
  label: string;
  cost: number;
}

function candidates(p: Profile): Record<PickElement, Candidate[]> {
  const palette = paletteOf(p);
  return {
    rule: [
      { id: NONE_ID, label: 'no rule', cost: 0 },
      ...palette.rules.map((id) => ({ id, label: kitLabel(id), cost: COSTS.rule })),
    ],
    foe: palette.foes.map((id) => ({
      id,
      label: enemyName(id),
      cost: ENEMIES[id].elite ? COSTS.elite : COSTS.minion,
    })),
    piece: palette.pieces.map((id) => ({ id, label: kitLabel(id), cost: COSTS.piece })),
    shape: [
      { id: PLAIN_ID, label: 'plain', cost: 0 },
      ...palette.shapes.map((id) => ({ id, label: kitLabel(id), cost: COSTS.shape })),
    ],
    heart: palette.masters.map((id) => ({ id, label: enemyName(id), cost: COSTS.hearts[id] })),
  };
}

/** True when a drawn trip set out from `slot` is still open: that page is locked. */
export function pageInUse(trip: Trip | null, slot: 0 | 1 | 2): boolean {
  if (trip === null || trip.district !== ('inkedPage' as string)) return false;
  return parseInkedState(trip.kit?.state).slot === slot;
}

export function tableView(
  p: Profile,
  slot: 0 | 1 | 2,
  draft: Drawing | null,
  trip: Trip | null,
): TableView {
  const slots = drawingsOf(p);
  const d = draft ?? slots[slot] ?? blankDrawing(p);
  const issues = checkDrawing(p, d);
  if (d.foes.length === 0) {
    issues.push({ element: 'foe', id: null, reason: 'Draw at least one foe.' });
  }
  const locked = pageInUse(trip, slot);
  const rows = {} as Record<PickElement, ElementRow[]>;
  for (const [element, list] of Object.entries(candidates(p)) as [PickElement, Candidate[]][]) {
    rows[element] = list.map((c) => {
      const picked = isPicked(d, element, c.id);
      const trial = picked ? d : toggle(d, element, c.id);
      const need = checkDrawing(p, trial).find((i) => i.element === element && i.id === c.id);
      const full = !picked && !isPicked(trial, element, c.id);
      const greyed = need?.reason ?? (full ? (LIMIT_SENTENCE[element] ?? null) : null);
      return { element, id: c.id, label: c.label, cost: c.cost, picked, greyed };
    });
  }
  const band = weightBand(d);
  return {
    slots,
    draft: d,
    pen: penOf(p),
    cost: costOf(d),
    band,
    depth: DEPTH_WORDS[band],
    rows,
    issues,
    canSave: issues.length === 0 && !locked,
    locked,
  };
}

/** Writes (or, with `null`, clears) a page through `storeDrawing`; throws as it does. */
export function saveDraft(save: SaveData, slot: 0 | 1 | 2, draft: Drawing | null): SaveData {
  return { ...save, profile: storeDrawing(save.profile, slot, draft, save.trip) };
}

// ── Replays of the ending (R9) ──

/** Where a replayed ending screen returns to: the places that link to the owner's desk and the credits. */
export const ORIGINS = ['codex', 'map', 'study'] as const;
export type Origin = (typeof ORIGINS)[number];

/** The `from` param when it names an origin, else `fallback` (a bad or missing value is no error). */
export function originOf(from: string | null, fallback: Origin): Origin {
  return ORIGINS.find((o) => o === from) ?? fallback;
}

/**
 * What the last page of the handover does: the first visit closes the page (the handover is
 * written and the closing leaf shown); a replay writes nothing and returns to where it came from.
 */
export function lastPageAction(p: Profile): 'close' | 'return' {
  return endingOf(p).handover ? 'return' : 'close';
}

/** The credits' default origin: the Codex when they were already seen (only the Codex replays them), else the study. */
export function creditsFallback(p: Profile): Origin {
  return endingOf(p).creditsSeen ? 'codex' : 'study';
}
