import type { DistrictId } from '$data';
import type { BattleState, Coord, EnemyUnit, LootItem } from '$engine';
import type { Json } from '$engine/districts/types';
import type { GameEvent } from '$engine/events';
import type { InputMode } from '../../app/battleInput';
import type { GaugeLine } from '../../app/describe';
import { BATH_DESCRIBE } from './bathhouses/describe';
import { BRIDGES_DESCRIBE } from './bridges/describe';
import { foundryHighlights } from './foundry/highlights';
import { INK_DESCRIBE } from './inkQuarter/describe';
import { inkHighlights } from './inkQuarter/highlights';
import { handHighlights } from './seam/hands';

/**
 * The districts' component-free slots (KIT-R2): board marks and wording. They live apart from
 * `DistrictUi` because `app/` reads them, and `DistrictUi` imports Svelte components that import `app/`.
 */

/** A district's own board mark (`kind: 'district'`), drawn by its `highlightArt` entry (IQ-15). */
export type DistrictHighlight = {
  kind: 'district';
  key: string;
  at: Coord;
  to?: Coord;
  data?: Json;
};

/** What a district's highlight producer reads: the state, the state with this input's preview applied (the telegraphs' basis), the input mode and the events the preview shows. */
export interface HighlightCtx {
  state: BattleState;
  intentState: BattleState;
  mode: InputMode;
  shown: readonly GameEvent[] | null;
}

/** The wording a district adds to `app/describe.ts` (KIT-R2). Each reader answers null / [] when the thing is not its own. */
export interface DistrictDescribe {
  /** A foe's telegraph in words, whole ("will ... (1st)"). */
  intent?: (s: BattleState, e: EnemyUnit) => string | null;
  /** A loot item's card text. */
  loot?: (item: LootItem) => { title: string; text: string } | null;
  /** The gauge line under the battle header, when this district has a gauge on the board. */
  gauge?: (s: BattleState) => GaugeLine | null;
  /** By district event type: the tiles that event touches. */
  eventTiles?: Readonly<Record<string, (data: unknown) => Coord[]>>;
}

export interface DistrictLogic {
  /** The district's board marks for a state and input mode (KIT-R2); drawn by `highlightArt`. */
  highlights?: (ctx: HighlightCtx) => readonly DistrictHighlight[];
  /** The district's wording for `app/describe.ts` (KIT-R2). */
  describe?: DistrictDescribe;
}

/** Every district's logic slots, one line each. */
export const DISTRICT_LOGIC: Readonly<Partial<Record<DistrictId, DistrictLogic>>> = {
  seam: { highlights: ({ intentState }) => handHighlights(intentState) },
  inkQuarter: {
    highlights: ({ state, mode, shown }) => inkHighlights(state, mode, shown),
    describe: INK_DESCRIBE,
  },
  bathhouses: { describe: BATH_DESCRIBE },
  bridges: { describe: BRIDGES_DESCRIBE },
  foundry: { highlights: foundryHighlights },
};

type Logic = Readonly<Partial<Record<DistrictId, DistrictLogic>>>;

/** Every district's board marks for this state, in registry order (KIT-R2). */
export function districtHighlights(
  ctx: HighlightCtx,
  ui: Logic = DISTRICT_LOGIC,
): DistrictHighlight[] {
  return Object.values(ui).flatMap((d) => d?.highlights?.(ctx) ?? []);
}

/** A foe's telegraph in words from whichever district owns it; null = the generic wording. */
export function describeIntentFor(
  s: BattleState,
  e: EnemyUnit,
  ui: Logic = DISTRICT_LOGIC,
): string | null {
  for (const d of Object.values(ui)) {
    const found = d?.describe?.intent?.(s, e);
    if (found) return found;
  }
  return null;
}

/** A loot item's card text from whichever district owns it; null = the generic card. */
export function describeLootFor(
  item: LootItem,
  ui: Logic = DISTRICT_LOGIC,
): { title: string; text: string } | null {
  for (const d of Object.values(ui)) {
    const found = d?.describe?.loot?.(item);
    if (found) return found;
  }
  return null;
}

/** The first district gauge line on this board. */
export function describeGaugeFor(s: BattleState, ui: Logic = DISTRICT_LOGIC): GaugeLine | null {
  for (const d of Object.values(ui)) {
    const found = d?.describe?.gauge?.(s);
    if (found) return found;
  }
  return null;
}

/** The tiles a district event touches; empty for an event no district reads. */
export function eventTilesFor(
  e: { type: string; data?: unknown },
  ui: Logic = DISTRICT_LOGIC,
): Coord[] {
  for (const d of Object.values(ui)) {
    const read =
      d?.describe?.eventTiles && Object.hasOwn(d.describe.eventTiles, e.type)
        ? d.describe.eventTiles[e.type]
        : undefined;
    if (read) return read(e.data);
  }
  return [];
}
