<script lang="ts">
  import type { OfferView } from '../../../app/desk';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    offer: OfferView;
    onwrite: (variantId: string) => void;
  }

  let { offer, onwrite }: Props = $props();
</script>

<article class="offer" data-testid="offer-{offer.line}">
  <p class="line" data-testid="offer-line">{offer.current}</p>
  <div class="pair">
    {#each offer.variants as v (v.id)}
      <button
        type="button"
        class="variant"
        class:chosen={v.chosen}
        aria-pressed={v.chosen}
        disabled={!offer.written && offer.blocked !== null}
        data-testid="variant-{v.id}"
        onclick={() => onwrite(v.id)}
      >
        <span class="text">{v.text}</span>
        <span class="tag">{v.chosen ? 'Written' : offer.written ? 'Switch, free' : 'Write'}</span>
      </button>
    {/each}
  </div>
  <p class="cost" data-testid="offer-cost">
    {#if offer.written}
      Written. Switching to the other costs nothing.
    {:else if offer.spend}
      <SolventIcon solvent={offer.spend.solvent} size={18} />
      Writing spends 1 {offer.spend.name} (you hold {offer.spend.count}).
    {:else}
      <span class="bad">{offer.blocked}</span>
    {/if}
  </p>
</article>

<style>
  .offer {
    padding: var(--space-2);
    border-left: 3px solid var(--ink);
    background: rgba(43, 33, 24, 0.05);
  }
  .line {
    margin: 0 0 var(--space-2);
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.2;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
  .variant {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
    min-height: 120px;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 13px/1.3 Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .variant:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .chosen {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .tag {
    font-size: 12px;
    font-weight: bold;
    color: var(--ink-soft);
  }
  .chosen .tag {
    color: var(--ink);
  }
  .cost {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: var(--space-2) 0 0;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .bad {
    color: var(--danger);
    font-weight: bold;
  }
</style>
