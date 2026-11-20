import { DISTRICT_IDS, DISTRICTS, type DistrictData, type DistrictId, ENEMIES } from '$data';
import {
  DISTRICT_KIT,
  type DistrictKitData,
  type DistrictLean,
  type MapEntry,
} from '$data/districts/index';
import { ENDING_LINES } from '$data/ending';
import { type DistrictState, districtState, type Profile, tripParty } from '$engine';
import { type DoorState, floorsFor, lowerSeamOpen, ownerDoor } from '$engine/districts/lowerSeam';
import { drawingsOf, endingOf, type WeightBand, weightBand } from '$engine/drawing';
import { startCheckpoint } from './crossroads';
import { kitLabel } from './drawing';

/** The page the map is drawn on is this tall (px); `x`/`y` in the data are percents of it (BL-95). */
export const MAP_PAGE_HEIGHT = 1900;
/** A node's caption is this wide (px); the layout check and the CSS share it. */
export const MAP_CAPTION_WIDTH = 150;

/** One district as the sketch map draws it (design §1). Unheard districts have no node. */
export interface MapNode {
  id: DistrictId;
  state: Exclude<DistrictState, 'unheard'>;
  name: string;
  x: number;
  y: number;
  /** Which side of the mark the caption sits (P16, DK-16). */
  label: MapEntry['label'];
  line: string; // the owner's line, once heard
  barred: string; // how the way is barred; empty when open
  lean: DistrictLean['lean'];
  leanText: string; // the lean as the caption says it
  guild: string;
  fresh: boolean; // heard since the map was last seen: new ink
  heart: boolean; // heart cleared: a small mark
  solved: boolean; // threshold solved: the district's solved art
  solvedArt: string; // which art; empty when the district names none
  checkpoint: string | null; // the doorway's name once the city remembers reaching it (P5)
  tryLock: boolean; // heard, with a threshold gate to try
}

type Table = Readonly<Record<DistrictId, DistrictData>>;
type Kit = Readonly<Partial<Record<DistrictId, DistrictKitData>>>;

/** A kit override (a test's), else the district's own lean. */
function leanOf(d: DistrictData, kit: DistrictKitData | undefined): DistrictLean {
  return kit?.lean ?? d.lean;
}

/** A kit override (a test's), else the district's own map entry. */
function entryOf(d: DistrictData, kit: DistrictKitData | undefined): MapEntry {
  return kit?.map ?? d.map;
}

export function mapNode(
  p: Profile,
  id: DistrictId,
  table: Table = DISTRICTS,
  kits: Kit = DISTRICT_KIT,
): MapNode | null {
  const state = districtState(p, id);
  // A district that hears as another (the lower Seam) is no node: SM-11 draws its stair.
  if (state === 'unheard' || table[id].hearsAs) return null;
  const d = table[id];
  const kit = kits[id];
  const at = entryOf(d, kit);
  const lean = leanOf(d, kit);
  const solved = p.city.solved.includes(id);
  return {
    id,
    state,
    name: d.name,
    x: at.x,
    y: at.y,
    label: at.label,
    line: d.line,
    barred: state === 'open' ? '' : d.barred,
    lean: lean.lean,
    leanText: lean.text,
    guild: d.guild,
    fresh: p.city.fresh.includes(id),
    heart: p.city.hearts.includes(id),
    solved,
    solvedArt: solved ? (at.solvedArt ?? kit?.threshold?.solvedArt ?? '') : '',
    checkpoint: state === 'open' ? startCheckpoint(p, id) : null,
    tryLock: state === 'heard' && d.gate.kind === 'threshold',
  };
}

/** The nodes to draw: every heard or open district, in id order. Unheard ones stay blank paper. */
export function mapNodes(
  p: Profile,
  table: Table = DISTRICTS,
  kits: Kit = DISTRICT_KIT,
): MapNode[] {
  return DISTRICT_IDS.flatMap((id) => {
    const n = mapNode(p, id, table, kits);
    return n ? [n] : [];
  });
}

/** One ink line on the page, in percents; `open` lines are inked, the rest dashed. */
export interface MapPath {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  open: boolean;
}

/**
 * Ink lines branch off a trunk that runs from the Seam straight through each tier of districts
 * (nodes sharing a `y`), then level out to the node's mark. Captions face away from the trunk, so
 * no line crosses one. A trunk piece is inked when any node on its tier is open.
 */
export function mapPaths(nodes: readonly MapNode[]): MapPath[] {
  const seam = nodes.find((n) => n.id === 'seam');
  if (!seam) return [];
  const tiers = new Map<number, MapNode[]>();
  for (const n of nodes) if (n.id !== 'seam') tiers.set(n.y, [...(tiers.get(n.y) ?? []), n]);
  const ys = [...tiers.keys()].sort((a, b) => Math.abs(a - seam.y) - Math.abs(b - seam.y));
  const paths: MapPath[] = [];
  let from = seam.y;
  for (const y of ys) {
    const tier = tiers.get(y) ?? [];
    paths.push({
      id: `trunk-${y}`,
      x1: seam.x,
      y1: from,
      x2: seam.x,
      y2: y,
      open: tier.some((n) => n.state === 'open'),
    });
    for (const n of tier) {
      if (n.x !== seam.x) {
        paths.push({ id: n.id, x1: seam.x, y1: y, x2: n.x, y2: y, open: n.state === 'open' });
      }
    }
    from = y;
  }
  return paths;
}

/** The small caption under a node's name. */
export function nodeTag(n: MapNode): string {
  return [n.leanText, n.guild].filter(Boolean).join(' · ');
}

/** One floor of the lower Seam, as the stair lists it (SM-11). */
export interface StairFloor {
  id: DistrictId;
  label: string;
}

/** What the slot under the Seam shows (DK-E5; SM-11): the stair, its floors, the quiet line and the owner's door. */
export interface UnderSeam {
  stair: boolean; // the lower Seam is open
  door: DoorState; // the owner's door: hidden, sealed or open
  /** One per floor, in opening order. Empty while no opened district ships an intrusion. */
  floors: StairFloor[];
  /** Set out is offered (at least one floor). */
  canSetOut: boolean;
  /** A quiet line under the stair, or null: nothing below yet, or tuned for three with fewer slotted. */
  quiet: string | null;
  /** The drawn pages after the stair, in slot order (EN-7): empty before the handover. */
  pages: DrawnPage[];
  /** The handover is done and nothing is drawn: the blank page with its line. */
  blank: boolean;
}

/** One drawing on the row under the Seam: its slot, its name and its weight band (depth). */
export interface DrawnPage {
  slot: 0 | 1 | 2;
  name: string;
  band: WeightBand;
  /** The drawing's rule-and-heart line under its name. */
  line: string;
}

/** The blank page's line (ending-text §4), read from the ending's data. */
export const BLANK_PAGE_LINE = ENDING_LINES.blankPage;

/** The lower Seam is tuned for three (SM P7); fewer is a pure challenge, said once and quietly. */
export const TUNED_FOR = 3;
export const TUNED_LINE = 'Tuned for three.';
export const NOTHING_BELOW = 'Nothing below yet. The page waits for the city.';

/** `party` and `floors` default to the profile's own; tests and fixtures pass theirs. */
export function underSeam(
  p: Profile,
  party: number = tripParty(p).length,
  floors: readonly DistrictId[] = floorsFor(p),
): UnderSeam {
  const stair = lowerSeamOpen(p);
  const quiet = !stair
    ? null
    : floors.length === 0
      ? NOTHING_BELOW
      : party < TUNED_FOR
        ? TUNED_LINE
        : null;
  const handover = endingOf(p).handover;
  const pages: DrawnPage[] = handover
    ? drawingsOf(p).flatMap((d, i) =>
        d
          ? [
              {
                slot: i as 0 | 1 | 2,
                name: d.name,
                band: weightBand(d),
                line: `${d.rule === null ? 'no rule' : kitLabel(d.rule)} · ${ENEMIES[d.heart].name}`,
              },
            ]
          : [],
      )
    : [];
  return {
    pages,
    blank: handover && pages.length === 0,
    stair,
    door: ownerDoor(p),
    floors: stair
      ? floors.map((id, i) => ({ id, label: `Floor ${i + 1}: ${DISTRICTS[id].name}` }))
      : [],
    canSetOut: stair && floors.length > 0,
    quiet,
  };
}

// ── Layout check ────────────────────────────────────────
/** A footprint in px on the page. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
// A node's rough footprint: the mark plus the tallest caption its state draws.
const MARK = 28;
const OPEN_CAPTION = 70;
const HEARD_CAPTION = 165;
const LOCK_BUTTON = 48;
const UNDER_SEAM = 260; // the margin link, stem, stair, five floor labels, a quiet line and the door
const PAGE_ROW = 52; // one drawn page: its name, then depth, rule and heart (EN-7)
const BLANK_ROW = 40; // the blank page and its line
const DOOR_ROW = 64; // the owner's door row (door or desk) under the pages; measured at 375 wide (R9)

/**
 * What hangs under the Seam beyond `UNDER_SEAM`, in px: the drawn pages (or the blank page) and,
 * while the owner's door is open, its row (`doorRow` is set exactly then).
 */
export function pagesExtra(u: Pick<UnderSeam, 'pages' | 'blank'> & { door?: DoorState }): number {
  return u.pages.length * PAGE_ROW + (u.blank ? BLANK_ROW : 0) + (u.door === 'open' ? DOOR_ROW : 0);
}

/**
 * The page's height: the nodes' layer keeps its height (their `y` percents hold), and the page
 * grows by what hangs under the Seam so the column ends on paper.
 */
export function mapPageHeight(underExtra = 0): number {
  return MAP_PAGE_HEIGHT + underExtra;
}

export function nodeBox(
  n: MapNode,
  pageWidth: number,
  pageHeight = MAP_PAGE_HEIGHT,
  underExtra = 0,
): Box {
  const cx = (n.x / 100) * pageWidth;
  const cy = (n.y / 100) * pageHeight;
  const caption =
    (n.state === 'open' ? OPEN_CAPTION : HEARD_CAPTION) +
    (n.tryLock ? LOCK_BUTTON : 0) +
    (n.id === 'seam' ? UNDER_SEAM + underExtra : 0);
  const w = MAP_CAPTION_WIDTH;
  const top = cy - MARK / 2;
  switch (n.label) {
    case 'above':
      return { left: cx - w / 2, right: cx + w / 2, top: top - caption, bottom: top + MARK };
    case 'below':
      return { left: cx - w / 2, right: cx + w / 2, top, bottom: top + MARK + caption };
    case 'left':
      return {
        left: cx + MARK / 2 - MARK - w,
        right: cx + MARK / 2,
        top,
        bottom: top + Math.max(MARK, caption),
      };
    case 'right':
      return {
        left: cx - MARK / 2,
        right: cx - MARK / 2 + MARK + w,
        top,
        bottom: top + Math.max(MARK, caption),
      };
  }
}

const meets = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * What would collide on a page this wide: nodes over nodes, nodes off the page, and lines through
 * a caption (a line meets its own mark and starts at the Seam's, so those two are skipped).
 */
export function mapProblems(
  nodes: readonly MapNode[],
  pageWidth: number,
  pageHeight = MAP_PAGE_HEIGHT,
  underExtra = 0,
): string[] {
  const out: string[] = [];
  const boxes = nodes.map((n) => ({ n, box: nodeBox(n, pageWidth, pageHeight, underExtra) }));
  for (const { n, box } of boxes) {
    if (box.left < 0 || box.right > pageWidth || box.top < 0 || box.bottom > pageHeight + underExtra) {
      out.push(`${n.id} runs off the page`);
    }
  }
  boxes.forEach((a, i) => {
    for (const b of boxes.slice(i + 1)) {
      if (meets(a.box, b.box)) out.push(`${a.n.id} overlaps ${b.n.id}`);
    }
  });
  for (const path of mapPaths(nodes)) {
    // Paths are axis-aligned, so a segment is a thin box.
    const x1 = (path.x1 / 100) * pageWidth;
    const x2 = (path.x2 / 100) * pageWidth;
    const y1 = (path.y1 / 100) * pageHeight;
    const y2 = (path.y2 / 100) * pageHeight;
    const seg: Box = {
      left: Math.min(x1, x2) - 1,
      right: Math.max(x1, x2) + 1,
      top: Math.min(y1, y2) - 1,
      bottom: Math.max(y1, y2) + 1,
    };
    for (const { n, box } of boxes) {
      if (n.id === 'seam' || n.id === path.id) continue;
      if (meets(seg, box)) out.push(`path ${path.id} crosses ${n.id}`);
    }
  }
  return out;
}
