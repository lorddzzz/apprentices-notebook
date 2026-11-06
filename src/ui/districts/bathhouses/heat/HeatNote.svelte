<script lang="ts">
  import type { Trip } from '$engine';
  import { crossroadsHeatLine } from './view';

  let { trip }: { trip: Trip } = $props();
  const line = $derived(crossroadsHeatLine(trip));
</script>

{#if line}
  <p class="note" data-testid="heat-note">{line}</p>
{/if}

<style>
  .note {
    margin: 0;
    font-size: 15px;
    font-style: italic;
    text-align: center;
    color: var(--ink);
  }
</style>
