<script lang="ts">
  interface Props {
    value: number;
    max: number;
    tone?: 'hp' | 'charge' | 'ink';
  }

  let { value, max, tone = 'hp' }: Props = $props();

  const pips = $derived(Array.from({ length: max }, (_, i) => i < value));
</script>

{#if max > 8}
  <span class="text {tone}" role="img" aria-label="{value} of {max}">{value}/{max}</span>
{:else}
  <span class="pips {tone}" role="img" aria-label="{value} of {max}">
    {#each pips as on, i (i)}
      <span class="pip" class:on></span>
    {/each}
  </span>
{/if}

<style>
  .pips {
    display: inline-flex;
    gap: 2px;
    vertical-align: middle;
  }
  .pip {
    width: 6px;
    height: 10px;
    border: 1px solid currentColor;
    border-radius: 1px;
  }
  .pip.on {
    background: currentColor;
  }
  .text {
    font: 12px var(--mono);
  }
  .hp {
    color: var(--ink);
  }
  .charge {
    color: var(--f-source);
  }
  .ink {
    color: var(--m-ink);
  }
</style>
