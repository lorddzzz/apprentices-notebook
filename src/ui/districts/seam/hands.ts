import type { KindId } from '$data';
import { MARGINALIA_HANDS } from '$data/districts/seam';
import { type BattleState, type Coord, type EnemyUnit, type Intent, isAlive } from '$engine';
import { tilesText } from '$engine/districts/seam';
import { RUNE_ART } from '../../runeArt';

/**
 * The Marginalia's hands on screen (SM-2; SM P2, P3): which hand is next and where it lands, read
 * from the foe's telegraph, and the board marks that show it. Pure reads of the battle state.
 */

/** A hand's step id starts with this (`seam:write:<kind>`, the engine's `handStep`). */
const STEP_PREFIX = 'seam:write:';
/** The highlight key the board draws through `DistrictUi.highlightArt`. */
export const HAND_HIGHLIGHT = 'seam:hand';

/** The kind each hand writes, in cycle order. */
export const HAND_KINDS: readonly KindId[] = MARGINALIA_HANDS;

export const KIND_NAME: Readonly<Record<KindId, string>> = {
  ink: 'Ink',
  oil: 'Oil',
  steam: 'Steam',
  brass: 'Brass',
  spark: 'Spark',
};

/** A kind's colour on the board, and the stroke that reads on it. */
export const KIND_FILL: Readonly<Record<KindId, string>> = {
  ink: 'var(--m-ink)',
  oil: 'var(--m-oil)',
  steam: '#6f8a98',
  brass: 'var(--m-brass-dark)',
  spark: 'var(--m-spark)',
};
export const KIND_STROKE: Readonly<Record<KindId, string>> = {
  ink: 'var(--parchment)',
  oil: 'var(--parchment)',
  steam: 'var(--parchment)',
  brass: 'var(--parchment)',
  spark: 'var(--ink)',
};

/** The kind's icon path (24-unit box), the rune art of the same name. */
export const kindPath = (kind: KindId): string => RUNE_ART[kind];

export interface NextHand {
  kind: KindId;
  tiles: Coord[];
}

/** Whether a string is one of the five kinds a hand writes. */
export const isKindId = (k: string): k is KindId => (HAND_KINDS as readonly string[]).includes(k);

/** The hand an intent is about to land, or null (not a hand: idle, stunned, another foe's). */
export function handOf(intent: Intent | null | undefined): NextHand | null {
  if (intent?.kind !== 'step' || !intent.step.startsWith(STEP_PREFIX)) return null;
  const kind = intent.step.slice(STEP_PREFIX.length);
  if (!isKindId(kind)) return null;
  return { kind, tiles: intent.telegraph.tiles.map((c) => ({ x: c.x, y: c.y })) };
}

/** The living Marginalia, if the room has one. */
export function marginaliaOf(s: BattleState): EnemyUnit | null {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'marginalia' && isAlive(v));
  return u?.kind === 'enemy' ? u : null;
}

export interface CycleStrip {
  /** The five hands in cycle order; `next` marks the one it will write. */
  items: { kind: KindId; next: boolean }[];
  next: NextHand | null;
  /** "writes Oil on B2–D2"; empty when it has no hand telegraphed. */
  text: string;
}

/** The cycle strip (P3): five kind icons, the next one lit, and the words for its tiles. */
export function cycleStrip(s: BattleState): CycleStrip | null {
  const g = marginaliaOf(s);
  if (!g) return null;
  const next = handOf(g.intent);
  const text = next
    ? `${next.kind === 'spark' ? 'strikes' : 'writes'} ${KIND_NAME[next.kind]} on ${tilesText(next.tiles)}`
    : '';
  return { items: HAND_KINDS.map((kind) => ({ kind, next: next?.kind === kind })), next, text };
}

/** A district highlight, as `Overlay` takes it (see `src/app/inkHighlights.ts`). */
export interface HandHighlight {
  kind: 'district';
  key: typeof HAND_HIGHLIGHT;
  at: Coord;
  data: { kind: KindId };
}

/** One mark per tile the next hand will write on, carrying its kind. */
export function handHighlights(s: BattleState): HandHighlight[] {
  const g = marginaliaOf(s);
  const next = g ? handOf(g.intent) : null;
  if (!next) return [];
  return next.tiles.map((at) => ({
    kind: 'district',
    key: HAND_HIGHLIGHT,
    at,
    data: { kind: next.kind },
  }));
}
