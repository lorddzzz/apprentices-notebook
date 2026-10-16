<script lang="ts">
  import type { GlyphDef, GlyphId, Profile } from '$engine';

  /**
   * The profiler on the Glyph sheet (plan M8–M13, U1): tiers, stats, current form, dead cells, one
   * suggestion, the Versions list. W0 stub (renders nothing): task U1 builds it.
   */
  interface Props {
    /** The current version as saved (`profile.glyphs`), not the effective view. */
    glyph: GlyphDef;
    /** Records, the archive and the effective view are read from here. */
    profile: Profile;
    /** In a doorway: no Revert. */
    readonly: boolean;
    /** Reverts to an archived version; returns why not, or null. */
    onrevert: (id: GlyphId, version: number) => string | null;
  }

  let _props: Props = $props();
</script>
