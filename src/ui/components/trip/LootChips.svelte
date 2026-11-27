<script lang="ts">
  import { APPRENTICES } from '$data';
  import type { LootItem } from '$engine';
  import { lootName } from '../../../app/describe';
  import { offerLabelFor } from '../../districts';
  import LootMark from './LootMark.svelte';

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
      <LootMark {item} />
      <span class="name">{item.kind === 'recruit' ? APPRENTICES[item.apprentice].name : (offerLabelFor(item) ?? lootName(item))}</span>
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
