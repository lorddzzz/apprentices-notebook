import type { DistrictUi } from '..';
import BoilBanner from './BoilBanner.svelte';

/**
 * The bathhouses' UI module. BH-12: the gauge's warning banner (the strip itself is the generic
 * `RuleMeter`, the harm ring the generic rule preview) and the boil-over's playback (`BoilFx`, drawn
 * by the board's FxLayer). BH-13 adds the heat and plunge cards, later tasks the foes' art.
 */
export const BATHHOUSES_UI: DistrictUi = {
  banners: [BoilBanner],
};

export { default as BoilFx } from './BoilFx.svelte';
