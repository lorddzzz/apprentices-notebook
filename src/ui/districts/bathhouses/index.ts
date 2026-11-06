import type { DistrictUi } from '..';
import BoilBanner from './BoilBanner.svelte';
import HeatBadge from './heat/HeatBadge.svelte';
import HeatNote from './heat/HeatNote.svelte';
import LootHeat from './heat/LootHeat.svelte';
import PlungeCard from './heat/PlungeCard.svelte';
import { BATH_OFFER_LABELS } from './heat/view';

/**
 * The bathhouses' UI module. BH-12: the gauge's warning banner (the strip itself is the generic
 * `RuleMeter`, the harm ring the generic rule preview) and the boil-over's playback (`BoilFx`, drawn
 * by the board's FxLayer). BH-13: the heat's trip screens and the plunge card. Later: the foes' art.
 */
export const BATHHOUSES_UI: DistrictUi = {
  banners: [BoilBanner],
  offerCards: { plunge: PlungeCard },
  offerLabels: BATH_OFFER_LABELS,
  tripBadge: HeatBadge,
  lootHeader: LootHeat,
  crossroadsNote: HeatNote,
};

export { default as BoilFx } from './BoilFx.svelte';
