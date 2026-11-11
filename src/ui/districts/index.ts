import type { Component } from 'svelte';
import type { DistrictId } from '$data';
import type { BattleState, Coord, Profile, Trip } from '$engine';
import type { DistrictEvent, Json, PreviewShape, RuleId } from '$engine/districts/types';
import type { GameEvent } from '$engine/events';
import type { Fx } from '../../app/fx';
import type { BoardView, UnitView } from '../../app/view';
import { BATHHOUSES_UI } from './bathhouses';
import { BRIDGES_UI } from './bridges';
import { CANALS_UI } from './canals';
import FallbackCard from './cards/FallbackCard.svelte';
import RecruitCard from './cards/RecruitCard.svelte';
import { FOUNDRY_UI } from './foundry';
import { INK_QUARTER_UI } from './inkQuarter';
import { LOWER_SEAM_UI } from './lowerSeam';
import { SEAM_UI } from './seam';

export type { DistrictHighlight } from './logic';

/**
 * The district kit's UI registries (P1, P8, P10; DK-12/13/16): art keys from the engine and data
 * contracts resolve here. DK-1: types and an empty Seam entry.
 */

/** What a district banner is given (D5): the live battle, the trip (none in the Lab) and the battle's log. */
export interface BannerProps {
  battle: BattleState;
  trip: Trip | null;
  log: readonly GameEvent[];
}

/** What a foe's token is given (KIT-R2): the unit on the board, its glyph and the view it stands in. */
export interface UnitArtProps {
  unit: UnitView;
  glyph: string;
  view: BoardView;
}

/** Where a board layer draws: `under` the tokens, or `badges` above them. */
export type BoardLayerSlot = 'under' | 'badges';

export interface DistrictUi {
  /** By foe def id (KIT-R2): draws one foe's token inside a board tile; absent = the default token. */
  unitArt?: Readonly<Record<string, Component<UnitArtProps>>>;
  /** By foe def id: the dashed "next round" ghost of a foe that has art of its own. */
  ghostArt?: Readonly<Record<string, Component>>;
  /** By `Fx.kind` (KIT-R2): plays one board effect. */
  fx?: Readonly<Record<string, Component<{ fx: Fx }>>>;
  /** Drawn over the board (KIT-R2), once under the tokens and once above them: each draws its `layer` or nothing. */
  boardLayers?: readonly Component<{ view: BoardView; layer: BoardLayerSlot }>[];
  /** A line under the combat header, from the trip's room and the board in view (the canals' bonus pick). */
  roomLine?: Component<{ trip: Trip; view: BoardView }>;
  /** Lines in the trip status (the ink quarter's signed terms). */
  tripLines?: (trip: Trip) => readonly { text: string; status: string }[];
  /** Lines under the battle header (D5): each draws itself or nothing, from the battle and the trip. */
  banners?: readonly Component<BannerProps>[];
  /** By `PieceDef.art`: draws one piece inside a board tile. */
  pieceArt?: Readonly<Record<string, Component<{ data: unknown; size: number }>>>;
  /** By district event type: plays one event; absent = the default animation. */
  eventAnim?: Readonly<Record<string, Component<{ event: DistrictEvent; onDone: () => void }>>>;
  /** Extra "Next round" overlay renderers beyond the generic shapes. */
  overlay?: Readonly<Record<string, Component<{ shapes: readonly PreviewShape[] }>>>;
  /** By `OfferKind.card`: the offer card body on Loot and the Crossroads. */
  offerCards?: Readonly<Record<string, Component<{ item: unknown }>>>;
  /** By a `district` highlight's key (IQ-15): board marks drawn from the battle state, in board space. */
  highlightArt?: Readonly<Record<string, Component<{ at: Coord; to?: Coord; data?: Json }>>>;
  /** By `solvedArt` key: the map illustration of a solved gate. */
  solvedArt?: Readonly<Record<string, Component>>;
  /** Offer chips' names by `OfferKind.id`, for a kind the screens cannot name on their own (BH-13). */
  offerLabels?: Readonly<Record<string, (item: unknown) => string>>;
  /** A badge in the trip status (the bathhouses' heat, BH-13): draws itself or nothing. */
  tripBadge?: Component<{ trip: Trip; profile: Profile }>;
  /** Lines under the loot screen's header (BH-13): draws itself or nothing. */
  lootHeader?: Component<{ trip: Trip }>;
  /** A line above the Crossroads' ways (BH-13): draws itself or nothing. */
  crossroadsNote?: Component<{ trip: Trip }>;
  /**
   * Controls in the Lab's menu sheet (BH-14): the district's board rules at a setting. `onrule`
   * lists a rule on the battle in hand at a config (null takes it off).
   */
  labPanel?: Component<{ state: BattleState; onrule: (id: RuleId, config: Json | null) => void }>;
  /** A line above the way home on the bottom screen of this district's trips (the lower Seam's door, SM-10): draws itself or nothing. */
  crossroadsLine?: Component<{ trip: Trip; profile: Profile }>;
  /** Drawn under another district's node on the map (the lower Seam's stair under the Seam, SM-11): `onsetout` opens Set out for this district. */
  underNode?: Component<{ profile: Profile; onsetout: () => void; floors?: readonly DistrictId[] }>;
  /** A sheet the district's node on the map opens beside "set out" (the Seam's owner's margin, SM-5). */
  mapSheet?: {
    label: string;
    sheet: Component<{ open: boolean; profile: Profile; onclose: () => void }>;
  };
}

/** Every district's UI module, one line each (P1). */
export const DISTRICT_UI: Readonly<Partial<Record<DistrictId, DistrictUi>>> = {
  seam: SEAM_UI,
  canals: CANALS_UI,
  inkQuarter: INK_QUARTER_UI,
  bathhouses: BATHHOUSES_UI,
  bridges: BRIDGES_UI,
  lowerSeam: LOWER_SEAM_UI,
  foundry: FOUNDRY_UI,
};

/**
 * The banners to draw in the battle HUD: the trip's district's own, or every district's when
 * there is no trip (the Lab; each banner hides itself when it has nothing to say).
 */
export function bannersFor(
  district: string | undefined,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): readonly Component<BannerProps>[] {
  const entries = Object.entries(ui).filter(([id]) => district === undefined || id === district);
  return entries.flatMap(([, d]) => d?.banners ?? []);
}

/** A piece's renderer by art key, across every district; undefined = the board's fallback glyph (DK-13). */
export function pieceArtFor(
  art: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component<{ data: unknown; size: number }> | undefined {
  for (const d of Object.values(ui)) {
    const found = d?.pieceArt && Object.hasOwn(d.pieceArt, art) ? d.pieceArt[art] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** A district highlight's renderer by key, across every district (IQ-15). */
export function highlightArtFor(
  key: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component<{ at: Coord; to?: Coord; data?: Json }> | undefined {
  for (const d of Object.values(ui)) {
    const found =
      d?.highlightArt && Object.hasOwn(d.highlightArt, key) ? d.highlightArt[key] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** A kind's chip name from its district's `offerLabels`; undefined = the screen's own name. */
export function offerLabelFor(
  item: { kind: string },
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): string | undefined {
  for (const d of Object.values(ui)) {
    const f =
      d?.offerLabels && Object.hasOwn(d.offerLabels, item.kind)
        ? d.offerLabels[item.kind]
        : undefined;
    if (f) return f(item);
  }
  return undefined;
}

type OfferCardComponent = Component<{ item: unknown }>;

/** The cards the game itself registers (RC's recruit); a district's own come from its `offerCards`. */
export const OFFER_CARDS: Readonly<Record<string, OfferCardComponent>> = {
  recruit: RecruitCard,
};

/** What draws a kind nothing registered a card for (DK-12). */
export const FALLBACK_CARD: OfferCardComponent = FallbackCard;

/**
 * An offer card's renderer by `OfferKind.card` key: the game's cards, then every district's;
 * undefined = the fallback card.
 */
export function offerCardFor(
  key: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
  base: Readonly<Record<string, OfferCardComponent>> = OFFER_CARDS,
): OfferCardComponent | undefined {
  if (Object.hasOwn(base, key)) return base[key];
  for (const d of Object.values(ui)) {
    const found = d?.offerCards && Object.hasOwn(d.offerCards, key) ? d.offerCards[key] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** A foe's token art by def id, across every district; undefined = the board's default token (KIT-R2). */
export function unitArtFor(
  def: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component<UnitArtProps> | undefined {
  for (const d of Object.values(ui)) {
    const found = d?.unitArt && Object.hasOwn(d.unitArt, def) ? d.unitArt[def] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** A foe's ghost art by def id; undefined = the generic ghost letter. */
export function ghostArtFor(
  def: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component | undefined {
  for (const d of Object.values(ui)) {
    const found = d?.ghostArt && Object.hasOwn(d.ghostArt, def) ? d.ghostArt[def] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** A board effect's renderer by `Fx.kind`, across every district; undefined = the layer's own. */
export function fxFor(
  kind: string,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component<{ fx: Fx }> | undefined {
  for (const d of Object.values(ui)) {
    const found = d?.fx && Object.hasOwn(d.fx, kind) ? d.fx[kind] : undefined;
    if (found) return found;
  }
  return undefined;
}

/** Every district's board layers, in registry order. */
export function boardLayersFor(
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): readonly Component<{ view: BoardView; layer: BoardLayerSlot }>[] {
  return Object.values(ui).flatMap((d) => d?.boardLayers ?? []);
}

/** The trip district's room line, if it has one. */
export function roomLineFor(
  district: string | undefined,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): Component<{ trip: Trip; view: BoardView }> | undefined {
  const entry = Object.entries(ui).find(([id]) => id === district);
  return entry?.[1]?.roomLine;
}

/** A district's trip-status lines. */
export function tripLinesFor(
  trip: Trip,
  ui: Readonly<Partial<Record<DistrictId, DistrictUi>>> = DISTRICT_UI,
): readonly { text: string; status: string }[] {
  const entry = Object.entries(ui).find(([id]) => id === trip.district);
  return entry?.[1]?.tripLines?.(trip) ?? [];
}
