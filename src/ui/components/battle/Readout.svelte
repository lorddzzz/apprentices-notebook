<script lang="ts">
  interface Props {
    readout: { n: number; total: number; text: string } | null;
    onspeedup: () => void;
  }

  let { readout, onspeedup }: Props = $props();

  // A step with nothing to number (a silent one) keeps the last line up instead of flickering.
  let last: Props['readout'] = null;
  const shown = $derived.by(() => {
    if (readout) last = readout;
    return last;
  });
</script>

{#if shown}
  <!-- The board's tap-faster surface too (FT-D4): a tap here speeds the chain up. -->
  <button type="button" class="readout" data-testid="readout" onclick={onspeedup}>
    Step {shown.n} of {shown.total} · {shown.text}
  </button>
{/if}

<style>
  .readout {
    display: block;
    width: 100%;
    min-height: 24px;
    padding: 2px var(--space-2);
    border: 0;
    border-left: 3px solid var(--gold);
    background: color-mix(in srgb, var(--ink) 86%, transparent);
    color: var(--parchment);
    font-family: var(--mono);
    font-size: var(--type-xs);
    line-height: 1.15;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: auto;
    cursor: pointer;
  }
</style>
