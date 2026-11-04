import { SEAM_HINTS, type SeamHint } from '$data/districts/seam';
import { districtState, type Profile } from '$engine';

/** The owner's margin (SM P6): the `???` lines whose district the notebook has not yet heard. */
export function unheardHints(p: Profile, hints: readonly SeamHint[] = SEAM_HINTS): SeamHint[] {
  return hints.filter((h) => districtState(p, h.district) === 'unheard');
}
