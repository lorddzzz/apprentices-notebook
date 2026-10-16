<script lang="ts">
  import type { MemberId } from '$data';
  import type { CellKey, Coord, GlyphArg, GlyphDef, Profile } from '$engine';
  import Sheet from '../common/Sheet.svelte';

  /**
   * The argument picker (plan M21, M25): one rune per open cell of a placed Glyph, from the
   * collection, pre-filled with the defaults. W0 stub: task U4 builds it.
   */
  interface Props {
    /** The placed Glyph (effective view) and its current arguments; null = closed. */
    target: { at: Coord; glyph: GlyphDef; args: Readonly<Record<CellKey, GlyphArg>> } | null;
    /** What is owned and free is read from here (canPlaceGlyph with args). */
    profile: Profile;
    member: MemberId;
    /** Applies the arguments; returns why not, or null (then the picker closes). */
    onapply: (args: Readonly<Record<CellKey, GlyphArg>>) => string | null;
    onclose: () => void;
  }

  let { target, onclose }: Props = $props();
</script>

<Sheet open={target !== null} title="Arguments" {onclose}>
  <p class="soon" data-testid="arg-picker">Arguments are not built yet.</p>
</Sheet>

<style>
  .soon {
    margin: 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
</style>
