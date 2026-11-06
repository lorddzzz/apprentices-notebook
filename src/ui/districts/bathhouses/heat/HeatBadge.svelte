<script lang="ts">
  import type { Profile, Trip } from '$engine';
  import { heatBadge } from './view';

  interface Props {
    trip: Trip;
    profile: Profile;
  }

  let { trip }: Props = $props();
  const badge = $derived(heatBadge(trip));
</script>

{#if badge}
  <p class="heat" data-testid="heat-badge" data-heat={badge.level}>
    <span class="flames" aria-hidden="true">
      {#each [1, 2, 3, 4] as n (n)}<span class="flame" class:lit={n <= badge.level}></span>{/each}
    </span>
    <span class="label">{badge.label}</span>
    {#if badge.note}<span class="note">({badge.note})</span>{/if}
  </p>
{/if}

<style>
  .heat {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 0;
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .flames {
    display: inline-flex;
    gap: 3px;
  }
  .flame {
    width: 8px;
    height: 12px;
    border: 1.5px solid var(--ink-faint);
    border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
  }
  .flame.lit {
    border-color: var(--danger);
    background: var(--danger);
  }
  .label {
    color: var(--ink);
  }
  .note {
    font-style: italic;
  }
</style>
