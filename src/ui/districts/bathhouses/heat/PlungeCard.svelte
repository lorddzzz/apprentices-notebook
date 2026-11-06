<script lang="ts">
  import { game } from '../../../../app/instance';
  import { plungeStakes } from './view';

  // The card is given the item only; the stakes read the trip it is offered on.
  // biome-ignore lint/correctness/noUnusedVariables: part of the offer card contract
  let { item }: { item: unknown } = $props();

  const stakes = $derived(plungeStakes(game.save.trip));
</script>

<span class="mark">
  <svg width="52" height="52" viewBox="0 0 40 40" role="img" aria-label="A cold plunge">
    <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
    <path d="M20 9c3.500 5 6 8 6 11.500a6 6 0 0 1-12 0C14 17 16.500 14 20 9z" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-linejoin="round" />
    <path d="M11 29c3-2 6 2 9 0s6 2 9 0" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
  </svg>
</span>
<span class="words">
  <span class="title">{stakes.title}</span>
  <span class="text">{stakes.blurb}</span>
  <span class="stakes" data-testid="plunge-stakes">
    {#if stakes.change}<strong data-testid="plunge-change">{stakes.change}.</strong>{/if}
    <span data-testid="plunge-cost">{stakes.cost}</span>
  </span>
</span>

<style>
  .mark {
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
  .text,
  .stakes {
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  strong {
    font-weight: normal;
    color: var(--ink);
  }
</style>
