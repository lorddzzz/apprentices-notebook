import type { DistrictUi } from '..';
import BellPiece from './BellPiece.svelte';
import FoundryArt from './FoundryArt.svelte';
import GreatBellPiece from './GreatBellPiece.svelte';
import Halo from './Halo.svelte';
import HookPiece from './HookPiece.svelte';
import Hung from './Hung.svelte';
import { HALO, HUNG, MUFFLED, STRUCK } from './highlights';
import Muffled from './Muffled.svelte';
import RingArt from './RingArt.svelte';
import RopePiece from './RopePiece.svelte';
import Struck from './Struck.svelte';
import TuneBanner from './TuneBanner.svelte';

/**
 * The foundry's UI module. BF-1: the bell's tone glyph set (P14). BF-17: the pieces' board art (bell,
 * rope, hook, great bell), the staff's tokens, the ring's playback (`RingArt`, drawn by the board's
 * FxLayer) and the marks drawn from the battle (`foundryHighlights`, in `logic.ts`): halos on the
 * bells about to ring, the muffling cloud, the struck bell on a preview and the hung bells' strike mark.
 * BF-18: the tune banner (`TuneBanner`).
 */
export const FOUNDRY_DEF_IDS: readonly string[] = ['ringer', 'detuner', 'clapper'];

export const FOUNDRY_UI: DistrictUi = {
  banners: [TuneBanner],
  unitArt: Object.fromEntries(FOUNDRY_DEF_IDS.map((def) => [def, FoundryArt])),
  fx: { ring: RingArt },
  pieceArt: {
    'foundry:bell': BellPiece,
    'foundry:rope': RopePiece,
    'foundry:hook': HookPiece,
    'foundry:greatBell': GreatBellPiece,
  },
  highlightArt: {
    [HALO]: Halo,
    [MUFFLED]: Muffled,
    [STRUCK]: Struck,
    [HUNG]: Hung,
  },
};
