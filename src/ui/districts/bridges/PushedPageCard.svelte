<script lang="ts">
  import CardFace from '../cards/CardFace.svelte';
  import FallbackCard from '../cards/FallbackCard.svelte';
  import { bindEventCard } from './ledger';

  let { item }: { item: unknown } = $props();
  const card = $derived(bindEventCard(item));
</script>

{#if card}
  <CardFace title={card.title} text={card.text}>
    {#snippet mark()}
      <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A Bind page: {card.event}" data-testid="bind-event-mark">
        <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
        <path d="M11 24h12M19 17l7 7-7 7" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M27 11v6" stroke="var(--ink-soft)" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    {/snippet}
  </CardFace>
{:else}
  <FallbackCard item={{ kind: 'bindEvent' }} />
{/if}
