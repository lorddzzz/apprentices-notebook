import type { DistrictUi } from '..';
import PagesSlot from './PagesSlot.svelte';

/** The drawn pages' UI module: their row under the Seam after the stair (EN-7). */
export const INKED_PAGE_UI: DistrictUi = {
  underPages: PagesSlot,
};

export { heartWords, pageFacts, pageLine, ruleWords } from './words';
