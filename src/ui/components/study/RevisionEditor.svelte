<script lang="ts">
  import type { GlyphInside, InsideIssue } from '$engine';
  import type { PaletteSlot } from '../../../app/study';
  import Sheet from '../common/Sheet.svelte';

  /**
   * The revision editor (plan M18, M19): a full sheet to edit a Glyph's inside, reused by the desk
   * for drafts (M34). W0 stub: task U3 builds it.
   */
  interface Props {
    /** The inside to start from; null = closed. The editor keeps its own working copy. */
    inside: GlyphInside | null;
    title: string;
    /** Runes the inside may use, with how many (null = no limit). */
    palette: readonly PaletteSlot[];
    /** Live issues for the working copy (insideIssues, or the desk's view of it). */
    issues: (inside: GlyphInside) => readonly InsideIssue[];
    /** A warning to show before saving (M19: a page pushed over its ink), or null. */
    warning?: (inside: GlyphInside) => string | null;
    /** The save button's label (default "Save"). */
    saveLabel?: string;
    /** Saves the working copy; returns why not, or null (then the editor closes). */
    onsave: (inside: GlyphInside) => string | null;
    onclose: () => void;
  }

  let { inside, title, onclose }: Props = $props();
</script>

<Sheet open={inside !== null} {title} {onclose}>
  <p class="soon" data-testid="revision-editor">The revision editor is not built yet.</p>
</Sheet>

<style>
  .soon {
    margin: 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
</style>
