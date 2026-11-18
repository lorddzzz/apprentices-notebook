<script lang="ts">
  import type { Profile, Trip } from '$engine';
  import Button from '../../components/common/Button.svelte';
  import { doorLine } from './door';

  interface Props {
    trip: Trip;
    profile: Profile;
  }

  let { trip, profile }: Props = $props();
  const line = $derived(doorLine(profile, trip));
</script>

<!--
  The owner's door (SM-10, P11, P20), on the lowest floor's bottom screen above the way home: nothing
  while hidden, a greyed line while sealed, and once the Cartographers' heart is cleared a line that
  points home. The visit itself is a free one from the map, not a way through from here.
-->
{#if line}
  <div class="door">
    {#if line.state === 'sealed'}
      <Button variant="quiet" disabled testid="door-sealed">
        <span class="big">{line.label}</span>
        <span class="sub">{line.sub}</span>
      </Button>
    {:else}
      <p class="open" data-testid="door-open">{line.label}</p>
    {/if}
  </div>
{/if}

<style>
  .door :global(.btn) {
    flex-direction: column;
    gap: 0;
    min-height: 60px;
    width: 100%;
    padding-block: var(--space-2);
    text-align: center;
  }
  .open {
    margin: 0;
    font-size: 16px;
    font-style: italic;
    text-align: center;
    color: var(--ink-soft);
  }
  .big {
    font-size: 19px;
  }
  .sub {
    font-size: 13px;
    opacity: 0.85;
  }
</style>
