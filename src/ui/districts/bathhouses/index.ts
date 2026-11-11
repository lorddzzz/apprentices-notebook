import type { DistrictUi } from '..';
import BoilArt from './BoilArt.svelte';
import BoilBanner from './BoilBanner.svelte';
import BathArt from './foes/BathArt.svelte';
import LabHeat from './foes/LabHeat.svelte';
import { BATH_ART_DEFS } from './foes/view';
import HeatBadge from './heat/HeatBadge.svelte';
import HeatNote from './heat/HeatNote.svelte';
import LootHeat from './heat/LootHeat.svelte';
import PlungeCard from './heat/PlungeCard.svelte';
import { BATH_OFFER_LABELS } from './heat/view';

/**
 * The bathhouses' UI module. BH-12: the gauge's warning banner (the strip itself is the generic
 * `RuleMeter`, the harm ring the generic rule preview) and the boil-over's playback (`BoilFx`, drawn
 * by the board's FxLayer). BH-13: the heat's trip screens and the plunge card. BH-14: the foes' tokens (`BathToken`, drawn dissolved on a cloud tile) and the Lab's heat selector.
 */
export const BATHHOUSES_UI: DistrictUi = {
  banners: [BoilBanner],
  unitArt: Object.fromEntries(BATH_ART_DEFS.map((def) => [def, BathArt])),
  fx: { boil: BoilArt },
  offerCards: { plunge: PlungeCard },
  offerLabels: BATH_OFFER_LABELS,
  tripBadge: HeatBadge,
  lootHeader: LootHeat,
  crossroadsNote: HeatNote,
  labPanel: LabHeat,
};

export { default as BoilFx } from './BoilFx.svelte';
export { default as BathToken } from './foes/BathToken.svelte';
export { dissolvedOn, isBathDef } from './foes/view';
