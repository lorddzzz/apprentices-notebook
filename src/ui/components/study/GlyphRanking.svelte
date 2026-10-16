<script lang="ts">
  import type { GlyphId, Profile } from '$engine';
  import Sheet from '../common/Sheet.svelte';

  /** "Your Glyphs, ranked" (plan M14). W0 stub: task U2 fills the list. */
  interface Props {
    open: boolean;
    /** Current versions and their records. */
    profile: Profile;
    /** A row was tapped: open that Glyph's sheet. */
    onpick: (id: GlyphId) => void;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();
</script>

<Sheet {open} title="Your Glyphs, ranked" {onclose}>
  <p class="soon" data-testid="glyph-ranking">No ranking yet.</p>
</Sheet>

<style>
  .soon {
    margin: 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
</style>
