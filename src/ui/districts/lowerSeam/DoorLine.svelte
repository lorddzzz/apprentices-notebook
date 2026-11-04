<script lang="ts">
  import type { Profile, Trip } from '$engine';
  import Button from '../../components/common/Button.svelte';
  import { DOOR_PLACEHOLDER, doorLine } from './door';

  interface Props {
    trip: Trip;
    profile: Profile;
  }

  let { trip, profile }: Props = $props();
  const line = $derived(doorLine(profile, trip));
  let tried = $state(false);
</script>

<!--
  The sealed door (SM-10, P11), on the lowest floor's bottom screen above the way home: nothing while hidden, a greyed
  line while sealed, "Go through the door" once the Cartographers' heart is cleared. The way through
  is BL-126's; until it is designed the button only says so, in a line under it.
-->
{#if line}
  <div class="door">
    <Button
      variant={line.state === 'open' ? 'primary' : 'quiet'}
      disabled={line.state === 'sealed'}
      onclick={() => (tried = true)}
      testid="door-{line.state}"
    >
      <span class="big">{line.label}</span>
      <span class="sub">{line.sub}</span>
    </Button>
    {#if tried}<p class="later" data-testid="door-later">{DOOR_PLACEHOLDER}</p>{/if}
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
  .later {
    margin: var(--space-1) 0 0;
    font-size: 14px;
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
