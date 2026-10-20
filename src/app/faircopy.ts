import { MEMBER_IDS, MEMBERS, type MemberId, type RuneRef, TUNING } from '$data';
import {
  blockingAuras,
  type Cluster,
  type Coord,
  canBeOpen,
  clustersOf,
  type Dir,
  disconnected,
  type FiredCell,
  glyphLibrary,
  inkUsed,
  inventionLibrary,
  isGlyph,
  key,
  latticeLabel as label,
  latticeOf,
  maximalProven,
  nameOf,
  type Profile,
  provenCount,
  sameCoord,
  sharingSpells,
  tidyCollapse,
  toGlyphDef,
} from '$engine';

/** The Fair Copy flow as pure functions (design research-and-mastery §4.3, plan P2, P3, P11). */

/** Every member's masks together: a pattern proven in one lattice counts when rebuilt in another. */
export function allMasks(p: Profile): FiredCell[][] {
  return MEMBER_IDS.flatMap((id) => p.proof[id] ?? []);
}

/** Cells that belong to some proven cluster of member `m`'s page (these glow). */
export function glowCells(p: Profile, m: MemberId): Set<string> {
  const lattice = latticeOf(p, m);
  const masks = allMasks(p);
  const glow = new Set<string>();
  if (masks.length < TUNING.provenCasts) return glow;
  const clusters = clustersOf(lattice, glyphLibrary(p)).sort(
    (a, b) => b.cells.length - a.cells.length,
  );
  for (const c of clusters) {
    // A cluster whose cells all glow already adds nothing: skip the (costlier) proof count.
    if (c.cells.every((x) => glow.has(key(x)))) continue;
    if (provenCount(lattice, c, masks) >= TUNING.provenCasts) {
      for (const x of c.cells) glow.add(key(x));
    }
  }
  return glow;
}

/** Fair Copy shows up once anything is proven on either page, or a Glyph already exists (plan P11). */
export function fairCopyUnlocked(p: Profile): boolean {
  return p.glyphs.length > 0 || MEMBER_IDS.some((id) => glowCells(p, id).size > 0);
}

export interface FairState {
  cluster: Cluster | null;
}

export const NO_SELECTION: FairState = { cluster: null };

export interface FairTap {
  state: FairState;
  /** A hint for the player (toast), or null. */
  message: string | null;
}

const sameCells = (a: readonly Coord[], b: readonly Coord[]): boolean =>
  a.length === b.length && a.every((x) => b.some((y) => sameCoord(x, y)));

/**
 * One tap in Fair Copy mode: a glowing cell selects the maximal proven cluster holding it; a tail
 * cell of the selection drops out (the rest stays proven by heredity); anything else is ignored.
 */
export function fairTap(p: Profile, m: MemberId, state: FairState, at: Coord): FairTap {
  const lattice = latticeOf(p, m);
  const lib = glyphLibrary(p);
  const sel = state.cluster;
  if (sel?.cells.some((c) => sameCoord(c, at))) {
    if (sameCoord(sel.root, at)) {
      return { state, message: 'The first rune stays: it is the way in' };
    }
    const rest = sel.cells.filter((c) => !sameCoord(c, at));
    const smaller = clustersOf(lattice, lib).find(
      (c) => sameCoord(c.root, sel.root) && sameCells(c.cells, rest),
    );
    if (smaller) {
      return { state: { cluster: smaller }, message: null };
    }
    if (rest.length < TUNING.glyphMinCells) {
      return { state, message: `A Fair copy needs at least ${TUNING.glyphMinCells} runes` };
    }
    return { state, message: 'Trim from the end: tap a rune nothing follows' };
  }
  const next = maximalProven(lattice, at, allMasks(p), lib);
  if (next) return { state: { cluster: next }, message: null };
  return { state: sel ? state : NO_SELECTION, message: 'Not proven yet: cast it in 5 fights' };
}

export interface ChainStep {
  at: Coord;
  rune: RuneRef;
  dir?: Dir;
  /** The rune's cell in the Glyph's own frame: what `compileGlyph` takes as the open cell (M22). */
  local: Coord;
  /** Kind and Action runes can be left open for an argument; Sources and Auras can't (M21). */
  openable: boolean;
}

export interface FairPreview {
  /** The selection's runes in walk order. */
  chain: ChainStep[];
  inkBefore: number;
  inkAfter: number;
  /** Outside runes the collapse would leave unreached and could not tidy (plan P2). */
  disconnected: { at: Coord; name: string }[];
  /** Runes that slide up to the Glyph's way out (seam-deepening S13). 0: none move. */
  slides: number;
  /** Why the Fair copy cannot go ahead (plan P3, a second spell, vellum). Empty = ready. */
  blocking: string[];
  /** "Fair-copy (1 vellum)". */
  costLine: string;
  canAfford: boolean;
}

const runeNameAt = (p: Profile, m: MemberId, at: Coord): string => {
  const r = latticeOf(p, m).runes.find((x) => sameCoord(x.at, at));
  return r && !isGlyph(r) ? nameOf(r.rune) : 'Glyph';
};

/** What the Fair copy would do to member `m`'s page, without doing it. */
export function previewFairCopy(p: Profile, m: MemberId, cluster: Cluster): FairPreview {
  const lattice = latticeOf(p, m);
  const lib = glyphLibrary(p);
  const def = toGlyphDef(lattice, cluster, 'Fair copy', '__preview', lib);
  const { lattice: collapsed, slid } = tidyCollapse(lattice, cluster, def, lib);

  // `def.cells` lists the cluster's runes in the same order (auras after), so index i is chain step i.
  const chain: ChainStep[] = [];
  for (const at of cluster.cells) {
    const r = lattice.runes.find((x) => sameCoord(x.at, at));
    const cell = def.cells[chain.length];
    if (r && !isGlyph(r) && cell) {
      const step = {
        at,
        rune: r.rune,
        local: cell.at,
        openable: canBeOpen(r.rune, inventionLibrary(p)),
      };
      chain.push(r.dir ? { ...step, dir: r.dir } : step);
    }
  }

  const blocking: string[] = [];
  for (const at of blockingAuras(lattice, cluster, lib)) {
    blocking.push(
      `The ${runeNameAt(p, m, at)} at ${label(at)} also powers runes outside the selection`,
    );
  }
  for (const s of sharingSpells(lattice, cluster, lib)) {
    blocking.push(
      `The ${runeNameAt(p, m, s.source)} at ${label(s.source)} also flows through this selection`,
    );
  }

  const cost = TUNING.compileVellum;
  const canAfford = p.vellum >= cost;

  return {
    chain,
    inkBefore: inkUsed(lattice, lib, inventionLibrary(p), MEMBERS[m].lean),
    inkAfter: inkUsed(collapsed, { ...lib, [def.id]: def }, inventionLibrary(p), MEMBERS[m].lean),
    disconnected:
      slid > 0
        ? []
        : disconnected(lattice, cluster, lib).map((at) => ({ at, name: runeNameAt(p, m, at) })),
    slides: slid,
    blocking,
    costLine: `Fair-copy (${cost} vellum)`,
    canAfford,
  };
}

/**
 * The local cell of the chain step at `open` (the Fair Copy sheet's tap, M22), or null when nothing
 * is open or the step is gone or can't be open. Keeps a stale tap from reaching `compileGlyph`.
 */
export function openCellOf(preview: FairPreview | null, open: Coord | null): Coord | null {
  if (!preview || !open) return null;
  const step = preview.chain.find((s) => sameCoord(s.at, open));
  return step?.openable ? step.local : null;
}
