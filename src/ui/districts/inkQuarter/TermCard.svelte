<script lang="ts">
  import { termLines } from '../../../app/inkTerms';
  import FallbackCard from '../cards/FallbackCard.svelte';

  let { item }: { item: unknown } = $props();

  // The offer (`data.def`) or the signed loot chip carries the same def id.
  const def = $derived.by(() => {
    const data = typeof item === 'object' && item !== null && 'data' in item ? item.data : null;
    const id = typeof data === 'object' && data !== null && 'def' in data ? data.def : null;
    return typeof id === 'string' && id.startsWith('inkQuarter:') ? id : null;
  });
  const lines = $derived(def ? termLines(def as `inkQuarter:${string}`) : null);
</script>

{#if lines}
  <span class="seal">
    <svg width="44" height="44" viewBox="0 0 40 40" role="img" aria-label="A signed term">
      <rect x="7" y="5" width="26" height="30" rx="2" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2" />
      <path d="M12 12h16M12 17h16" stroke="var(--ink-soft)" stroke-width="2" stroke-linecap="round" />
      <circle cx="26" cy="28" r="5" fill="var(--danger)" stroke="var(--ink)" stroke-width="1.5" />
    </svg>
  </span>
  <span class="words" data-testid="term-card">
    <span class="title">A term to sign</span>
    <span class="row"><b>You get</b> {lines.reward}</span>
    <span class="row"><b>You must</b> {lines.condition}</span>
    <span class="row penalty"><b>Or</b> {lines.penalty}</span>
  </span>
{:else}
  <FallbackCard item={{ kind: 'inkQuarter:termed' }} />
{/if}

<style>
  .seal {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
  }
  .words {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-size: 19px;
  }
  .row {
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .row b {
    color: var(--ink);
  }
  .penalty b {
    color: var(--danger);
  }
</style>
