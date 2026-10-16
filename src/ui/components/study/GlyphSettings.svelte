<script lang="ts">
  import type { CellKey, Dir, GlyphDef, GlyphId, Profile } from '$engine';

  /**
   * A Glyph's settings on its sheet (plan M20, M22, M26): open-cell toggles within the allowance and
   * the extra exit's side. W0 stub (renders nothing): task U4 builds it.
   */
  interface Props {
    /** The current version as saved (`profile.glyphs`), not the effective view. */
    glyph: GlyphDef;
    profile: Profile;
    /** In a doorway everything is read-only. */
    readonly: boolean;
    /** Returns why not, or null. */
    onopencells: (id: GlyphId, cells: CellKey[]) => string | null;
    onextraexit: (id: GlyphId, dir: Dir | null) => string | null;
  }

  let _props: Props = $props();
</script>
