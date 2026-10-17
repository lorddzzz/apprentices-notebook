<script lang="ts">
  import type { GlyphDef } from '$engine';
  import { ownerLore } from '../../../app/owner';

  /** The owner's page (F12): the lore of the draft a Glyph was mended from. Hidden for other Glyphs. */
  interface Props {
    glyph: GlyphDef;
  }

  let { glyph }: Props = $props();

  const lore = $derived(ownerLore(glyph));
  let open = $state(false);
</script>

{#if lore}
  <section class="owner" data-testid="owner-page">
    <button
      type="button"
      class="fold"
      aria-expanded={open}
      data-testid="owner-page-toggle"
      onclick={() => (open = !open)}
    >
      <span aria-hidden="true">{open ? '▾' : '▸'}</span> The owner's page
    </button>
    {#if open}
      <p class="lore" data-testid="owner-lore">{lore}</p>
    {/if}
  </section>
{/if}

<style>
  .owner {
    margin: var(--space-2) 0;
  }
  .fold {
    min-height: var(--tap);
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink-soft);
    font: 14px var(--hand);
    cursor: pointer;
  }
  .lore {
    margin: 0;
    padding: var(--space-2);
    border-left: 3px solid var(--line);
    font: italic 15px/1.4 var(--hand);
    color: var(--ink);
    white-space: pre-line;
  }
</style>
