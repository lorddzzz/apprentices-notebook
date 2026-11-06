<script lang="ts">
  import type { Trip } from '$engine';
  import { lootHeatLine } from './view';

  let { trip }: { trip: Trip } = $props();
  const lines = $derived(lootHeatLine(trip));
</script>

{#if lines}
  <p class="heat" data-testid="loot-heat">
    {lines.here}
    {#if lines.ahead}<span class="ahead" data-testid="loot-heat-ahead">{lines.ahead}</span>{/if}
  </p>
{/if}

<style>
  .heat {
    margin: 2px 0 0;
    font-size: 13px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .ahead {
    display: block;
    font-style: italic;
  }
</style>
