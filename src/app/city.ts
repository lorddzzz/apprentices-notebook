import { DISTRICT_IDS, DISTRICTS, type DistrictData, type DistrictId } from '$data';
import {
  DISTRICT_KIT,
  type DistrictKitData,
  type DistrictLean,
  type MapEntry,
} from '$data/districts/index';
import { type DistrictState, districtState, type Profile } from '$engine';
import { type DoorState, lowerSeamOpen, ownerDoor } from '$engine/districts/lowerSeam';
import { startCheckpoint } from './crossroads';

/** The page the map is drawn on is this tall (px); `x`/`y` in the data are percents of it (BL-95). */
export const MAP_PAGE_HEIGHT = 1160;
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
  if (state === 'unheard') return null;
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

/** What the slot under the Seam shows (DK-E5): SM draws the stair and the door into it. */
export interface UnderSeam {
  stair: boolean; // the lower Seam is open
  door: DoorState; // the owner's door: hidden, sealed or open
}
export function underSeam(p: Profile): UnderSeam {
  return { stair: lowerSeamOpen(p), door: ownerDoor(p) };
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
const UNDER_SEAM = 90;

export function nodeBox(n: MapNode, pageWidth: number, pageHeight = MAP_PAGE_HEIGHT): Box {
  const cx = (n.x / 100) * pageWidth;
  const cy = (n.y / 100) * pageHeight;
  const caption =
    (n.state === 'open' ? OPEN_CAPTION : HEARD_CAPTION) +
    (n.tryLock ? LOCK_BUTTON : 0) +
    (n.id === 'seam' ? UNDER_SEAM : 0);
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
): string[] {
  const out: string[] = [];
  const boxes = nodes.map((n) => ({ n, box: nodeBox(n, pageWidth, pageHeight) }));
  for (const { n, box } of boxes) {
    if (box.left < 0 || box.right > pageWidth || box.top < 0 || box.bottom > pageHeight) {
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
