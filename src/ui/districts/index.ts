import type { Component } from 'svelte';
import type { DistrictId } from '$data';
import type { Coord } from '$engine';
import type { DistrictEvent, Json, PreviewShape } from '$engine/districts/types';
import { CANALS_UI } from './canals';
import FallbackCard from './cards/FallbackCard.svelte';
import RecruitCard from './cards/RecruitCard.svelte';
import { INK_QUARTER_UI } from './inkQuarter';

/**
 * The district kit's UI registries (P1, P8, P10; DK-12/13/16): art keys from the engine and data
 * contracts resolve here. DK-1: types and an empty Seam entry.
 */

export interface DistrictUi {
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
}

/** Every district's UI module, one line each (P1). */
export const DISTRICT_UI: Readonly<Partial<Record<DistrictId, DistrictUi>>> = {
  seam: {},
  canals: CANALS_UI,
  inkQuarter: INK_QUARTER_UI,
};

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
