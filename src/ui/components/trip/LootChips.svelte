<script lang="ts">
  import type { LootItem } from '$engine';
  import { lootName } from '../../../app/describe';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    items: readonly LootItem[];
    /** Wiped: the finds are listed struck through. */
    lost?: boolean;
  }

  // biome-ignore lint/correctness/noUnusedVariables: used in the template
  let { items, lost = false }: Props = $props();
</script>

<ul class="chips" class:lost data-testid="loot-list">
  {#each items as item, i (i)}
    <li class="chip" data-kind={item.kind}>
      {#if item.kind === 'rune'}
        <RuneGlyph rune={item.rune} dir={item.rune === 'bolt' || item.rune === 'bend' ? 'right' : undefined} size={28} />
      {:else}
        <span class="icon" aria-hidden="true">{item.kind === 'ink' ? '●' : item.kind === 'solvent' ? '◍' : item.kind === 'draft' ? '❦' : '✎'}</span>
      {/if}
      <span class="name">{lootName(item)}</span>
    </li>
  {:else}
    <li class="none">Nothing yet.</li>
  {/each}
</ul>

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chip {
    gap: 4px;
    padding-left: 4px;
    min-height: 36px;
    font-size: 14px;
  }
  .icon {
    display: inline-grid;
    place-items: center;
    width: 24px;
    color: var(--m-ink);
  }
  .lost .name {
    text-decoration: line-through;
    color: var(--ink-soft);
  }
  .lost .chip {
    opacity: 0.7;
  }
  .none {
    font-style: italic;
    color: var(--ink-soft);
  }
</style>
