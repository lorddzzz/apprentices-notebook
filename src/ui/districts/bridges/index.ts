import type { DistrictUi } from '..';
import KeystonePiece from './KeystonePiece.svelte';
import LootNote from './LootNote.svelte';
import { bindEventCard } from './ledger';
import PierPiece from './PierPiece.svelte';
import PushedPageCard from './PushedPageCard.svelte';
import SpanCards from './SpanCards.svelte';
import SpanPiece from './SpanPiece.svelte';

/**
 * The bridges' UI module. BR-14: the pieces' board art (span in three stone states, pier,
 * keystone), plus what the board draws around them (`BridgeLayer`: fog, cracked-section outlines,
 * the chalk circle, the carry arrow, the fall badge), the fall's playback (`FallFx`, drawn by the
 * board's FxLayer) and the foes' tokens (`BridgeToken`). The "Next round" fall preview is the
 * generic rule preview (`previewCollapse`). BR-15 adds the Crossroads cards, BR-16 the Lab palette.
 */
export const BRIDGES_UI: DistrictUi = {
  pieceArt: {
    'bridges:span': SpanPiece,
    'bridges:pier': PierPiece,
    'bridges:keystone': KeystonePiece,
  },
  // BR-15: the Crossroads' span cards, the watchpost and pass notes, the pushed page's card.
  crossroadsNote: SpanCards,
  lootHeader: LootNote,
  offerCards: { bindEvent: PushedPageCard },
  offerLabels: { bindEvent: (item) => bindEventCard(item)?.title ?? 'A Bind page' },
};

export const BRIDGE_ART_DEFS: readonly string[] = ['warden', 'gargoyle', 'mason'];
export const isBridgeDef = (def: string): boolean => BRIDGE_ART_DEFS.includes(def);

export { default as BridgeLayer } from './BridgeLayer.svelte';
export { default as BridgeToken } from './BridgeToken.svelte';
export { default as FallFx } from './FallFx.svelte';
